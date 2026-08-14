import { gameState, game } from './classes/GameState.js';
import { addLog } from './utils/logging.js';
import { saveGame } from './utils/persistence.js';
import { updateUI } from './ui.js';
import { ROLE_DEFINITIONS } from './config/roles.js';
import { getRoleCount, getFollowerFoodConsumptionMultiplier, getHungerStarvationDrainMultiplier, getAscensionFaithMultiplier, getWoodStoneCap, getFoodCap, getScribeFaithMultiplier, getFoodSpoilageRate, getGranaryPassiveFoodPerSecond, getHelFavorStarlightMultiplier, getMonumentFaithPerFollowerMultiplier, getQuietFaithFollowerMultiplier, checkFavorTierUnlocks } from './utils/helpers.js';

const LIVE_TICK_CLAMP_SECONDS = 2;
const CATCHUP_CHUNK_SECONDS = LIVE_TICK_CLAMP_SECONDS;
const MIN_OFFLINE_SECONDS_TO_CATCHUP = 60;

function getRuntime() {
    if (!gameState.runtime || typeof gameState.runtime !== 'object') {
        gameState.runtime = { roleAccumulators: {}, autoSaveAccumulator: 0 };
    }

    if (!gameState.runtime.roleAccumulators || typeof gameState.runtime.roleAccumulators !== 'object') {
        gameState.runtime.roleAccumulators = {};
    }

    if (!Number.isFinite(gameState.runtime.autoSaveAccumulator) || gameState.runtime.autoSaveAccumulator < 0) {
        gameState.runtime.autoSaveAccumulator = 0;
    }

    return gameState.runtime;
}

function applyRoleProduction(roleDefinition, roleCount, dtSeconds) {
    const simulation = roleDefinition?.simulation;
    if (!simulation || roleCount <= 0) return;

    const scalingFn = typeof simulation.scaling === 'function'
        ? simulation.scaling
        : (count) => count;

    const scale = scalingFn(roleCount, gameState, game);
    if (!Number.isFinite(scale) || scale <= 0) return;

    const outputs = Array.isArray(simulation.outputs) ? simulation.outputs : [];
    outputs.forEach((output) => {
        const rate = gameState.rates?.[output.rateKey];
        if (!Number.isFinite(rate) || rate === 0) return;

        const delta = rate * scale * dtSeconds;
        if (!Number.isFinite(delta) || delta === 0) return;

        if (output.target === 'resource') {
            const resource = gameState.resources?.[output.key];
            if (resource && Number.isFinite(resource.amount)) {
                resource.amount += delta;
            }
            return;
        }

        if (output.target === 'progression') {
            const current = gameState.progression?.[output.key];
            if (Number.isFinite(current)) {
                gameState.progression[output.key] = current + delta;
            } else {
                gameState.progression[output.key] = delta;
            }
        }
    });
}

function processRoleSimulation(dtSeconds) {
    const runtime = getRuntime();

    ROLE_DEFINITIONS.forEach((roleDefinition) => {
        const roleId = roleDefinition.id;
        const roleCount = getRoleCount(roleId);

        const configuredTickRate = roleDefinition?.simulation?.tickRate;
        const tickRate = Number.isFinite(configuredTickRate) && configuredTickRate > 0
            ? configuredTickRate
            : 1;

        const currentAccumulator = runtime.roleAccumulators[roleId];
        const normalizedAccumulator = Number.isFinite(currentAccumulator) && currentAccumulator >= 0
            ? currentAccumulator
            : 0;

        let accumulator = normalizedAccumulator + dtSeconds;

        while (accumulator >= tickRate) {
            if (roleCount > 0) {
                applyRoleProduction(roleDefinition, roleCount, tickRate);
            }
            accumulator -= tickRate;
        }

        runtime.roleAccumulators[roleId] = accumulator;
    });
}

const FAVOR_GOD_LABELS = { helios: 'Helios', sekhmet: 'Sekhmet', danu: 'Danu', hel: 'Hel' };

function defaultLiveEventHandler(eventType, payload) {
    if (eventType === 'hunger-critical') addLog('The faithful are starving.');
    else if (eventType === 'hunger-weak') addLog('The faithful grow weak.');
    else if (eventType === 'favor-tier' && payload) {
        const godLabel = FAVOR_GOD_LABELS[payload.godId] || payload.godId;
        addLog(`${godLabel}'s favor deepens (tier ${payload.tier}). A new blessing takes hold.`);
    }
}

// Pure simulation step: mutates game state only, no DOM/localStorage I/O.
// Safe to call repeatedly in a chunked loop for offline catch-up.
function simulateStep(dtSeconds, onEvent = defaultLiveEventHandler) {
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) return;

    const woodStoneCap = getWoodStoneCap();
    gameState.resources.wood.cap = woodStoneCap;
    gameState.resources.stone.cap = woodStoneCap;
    gameState.resources.food.cap = getFoodCap();

    checkFavorTierUnlocks().forEach((event) => onEvent('favor-tier', event));

    gameState.progression.faith += gameState.progression.followers * gameState.progression.faithPerFollower * getAscensionFaithMultiplier() * getScribeFaithMultiplier() * getMonumentFaithPerFollowerMultiplier() * getQuietFaithFollowerMultiplier() * dtSeconds;

    const outpostFaithPerSecond = Number.isFinite(game.exploration?.villageOutpostFaithPerSecond)
        ? game.exploration.villageOutpostFaithPerSecond
        : 0.05;
    if (outpostFaithPerSecond > 0 && Array.isArray(game.exploration?.villages)) {
        const outpostCount = game.exploration.villages.reduce((count, village) => count + (village.resolutionType === 'converted' ? 1 : 0), 0);
        if (outpostCount > 0) {
            gameState.progression.faith += outpostCount * outpostFaithPerSecond * dtSeconds;
        }
    }

    if (Array.isArray(game.worlds) && game.worlds.length > 0) {
        const worldStarlightPerSecond = game.worlds.reduce((sum, world) => {
            const convertedCount = world.villages.reduce((count, village) => count + (village.resolutionType === 'converted' ? 1 : 0), 0);
            return sum + convertedCount * (Number.isFinite(world.outpostStarlightPerSecond) ? world.outpostStarlightPerSecond : 0);
        }, 0);
        if (worldStarlightPerSecond > 0) {
            gameState.progression.starlight += worldStarlightPerSecond * getHelFavorStarlightMultiplier() * dtSeconds;
        }
    }

    processRoleSimulation(dtSeconds);

    if (game.hungerVisible) {
        const granaryTrickle = getGranaryPassiveFoodPerSecond();
        if (granaryTrickle > 0) {
            gameState.resources.food.add(granaryTrickle * dtSeconds);
        }

        const spoilageRate = getFoodSpoilageRate();
        if (spoilageRate > 0 && gameState.resources.food.amount > 0) {
            gameState.resources.food.amount = Math.max(0, gameState.resources.food.amount * (1 - spoilageRate * dtSeconds));
        }
    }

    const cookCount = getRoleCount('cooks');

    if (game.hungerVisible) {
        const cookFlatGain = cookCount * gameState.rates.cookFlatHungerGainPerSecond * dtSeconds;

        const cookEfficiency = Math.min(0.5, cookCount * gameState.rates.cookHungerDrainReductionPerCook);
        const consumption = gameState.progression.followers * game.followerFoodConsumptionPerSecond * getFollowerFoodConsumptionMultiplier() * (1 - cookEfficiency) * dtSeconds;
        const foodAmount = Math.max(0, gameState.resources.food.amount);
        const sustainFoodUsed = Math.min(consumption, foodAmount);
        const starvationDrain = foodAmount > 0 ? 0 : game.hungerStarvationDrainPerSecond * getHungerStarvationDrainMultiplier() * (1 - cookEfficiency) * dtSeconds;

        if (sustainFoodUsed > 0) {
            gameState.resources.food.spend(sustainFoodUsed);
        }

        let autoFeedAmount = 0;
        if (gameState.resources.food.amount > 0 && game.hungerPercent < 100) {
            autoFeedAmount = Math.min(game.autoFeedFoodPerSecond * dtSeconds, gameState.resources.food.amount);
            if (autoFeedAmount > 0) {
                gameState.resources.food.spend(autoFeedAmount);
            }
        }

        const hungerGain = autoFeedAmount * game.foodHungerGain * (1 + cookCount * gameState.rates.cookHungerGainBonusPerCook);
        const netEffect = hungerGain + cookFlatGain - starvationDrain;
        game.hungerPercent = Math.max(0, Math.min(100, game.hungerPercent + netEffect));

        if (game.hungerPercent < 5 && game.lastHungerWarning !== 'critical') {
            onEvent('hunger-critical');
            game.lastHungerWarning = 'critical';
        } else if (game.hungerPercent < 20 && game.lastHungerWarning !== 'weak') {
            onEvent('hunger-weak');
            game.lastHungerWarning = 'weak';
        } else if (game.hungerPercent >= 20) {
            game.lastHungerWarning = null;
        }
    }
}

// Live-loop wrapper: same public signature/behavior as before the refactor.
export function gameTick(dtSeconds = 1) {
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) return;

    const clampedDt = Math.min(LIVE_TICK_CLAMP_SECONDS, dtSeconds);
    simulateStep(clampedDt);

    const runtime = getRuntime();
    runtime.autoSaveAccumulator += clampedDt;
    if (runtime.autoSaveAccumulator >= 1) {
        saveGame();
        runtime.autoSaveAccumulator -= 1;
    }

    updateUI();
}

function captureResourceSnapshot() {
    return {
        faith: gameState.progression.faith,
        followers: gameState.progression.followers,
        wood: gameState.resources.wood.amount,
        stone: gameState.resources.stone.amount,
        food: gameState.resources.food.amount,
        hungerPercent: game.hungerPercent
    };
}

function buildWelcomeBackSummary(before, after, offlineSeconds, offlineSecondsRaw, eventCounts) {
    return {
        offlineSeconds,
        offlineSecondsRaw,
        cappedByLimit: offlineSecondsRaw > offlineSeconds,
        before,
        after,
        deltas: {
            faith: after.faith - before.faith,
            followers: after.followers - before.followers,
            wood: after.wood - before.wood,
            stone: after.stone - before.stone,
            food: after.food - before.food
        },
        hunger: {
            wentWeak: Boolean(eventCounts['hunger-weak']),
            wentCritical: Boolean(eventCounts['hunger-critical']),
            weakEventCount: eventCounts['hunger-weak'] || 0,
            criticalEventCount: eventCounts['hunger-critical'] || 0
        }
    };
}

// Catch-up driver: simulates a real elapsed gap in small chunks (re-checking
// food/hunger state every chunk, unlike a single giant dt would), with no
// DOM/localStorage I/O until it's done. Returns a "welcome back" summary, or
// null if the gap is too short to be worth reporting.
export function runOfflineCatchup(offlineSeconds, offlineSecondsRaw = offlineSeconds) {
    if (!Number.isFinite(offlineSeconds) || offlineSeconds < MIN_OFFLINE_SECONDS_TO_CATCHUP) return null;

    const before = captureResourceSnapshot();
    const eventCounts = {};
    const collector = (eventType) => {
        eventCounts[eventType] = (eventCounts[eventType] || 0) + 1;
    };

    let remaining = offlineSeconds;
    while (remaining > 0) {
        const step = Math.min(CATCHUP_CHUNK_SECONDS, remaining);
        simulateStep(step, collector);
        remaining -= step;
    }

    const after = captureResourceSnapshot();
    saveGame();
    updateUI();

    return buildWelcomeBackSummary(before, after, offlineSeconds, offlineSecondsRaw, eventCounts);
}
