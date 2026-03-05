import { gameState, game } from './classes/GameState.js';
import { addLog } from './utils/logging.js';
import { saveGame } from './utils/persistence.js';
import { updateUI } from './ui.js';
import { ROLE_DEFINITIONS } from './config/roles.js';
import { getRoleCount } from './utils/helpers.js';

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

export function gameTick(dtSeconds = 1) {
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) return;

    const clampedDt = Math.min(2, dtSeconds);

    gameState.progression.faith += gameState.progression.followers * gameState.progression.faithPerFollower * clampedDt;
    processRoleSimulation(clampedDt);

    const cookCount = getRoleCount('cooks');

    if (game.hungerVisible) {
        const cookFlatGain = cookCount * gameState.rates.cookFlatHungerGainPerSecond * clampedDt;

        const cookEfficiency = Math.min(0.5, cookCount * gameState.rates.cookHungerDrainReductionPerCook);
        const drain = gameState.progression.followers * game.followerHungerDrain * (1 - cookEfficiency) * clampedDt;
        const foodAmount = Math.max(0, gameState.resources.food.amount);
        const sustainFoodUsed = Math.min(drain, foodAmount);
        const starvationDrain = Math.max(0, drain - sustainFoodUsed);

        if (sustainFoodUsed > 0) {
            gameState.resources.food.spend(sustainFoodUsed);
        }

        let autoFeedAmount = 0;
        if (gameState.resources.food.amount > 0 && game.hungerPercent < 100) {
            autoFeedAmount = Math.min(game.autoFeedFoodPerSecond * clampedDt, gameState.resources.food.amount);
            if (autoFeedAmount > 0) {
                gameState.resources.food.spend(autoFeedAmount);
            }
        }

        const hungerGain = autoFeedAmount * game.foodHungerGain * (1 + cookCount * gameState.rates.cookHungerGainBonusPerCook);
        const netEffect = hungerGain + cookFlatGain - starvationDrain;
        game.hungerPercent = Math.max(0, Math.min(100, game.hungerPercent + netEffect));

        if (game.hungerPercent < 5 && game.lastHungerWarning !== 'critical') {
            addLog('The faithful are starving.');
            game.lastHungerWarning = 'critical';
        } else if (game.hungerPercent < 20 && game.lastHungerWarning !== 'weak') {
            addLog('The faithful grow weak.');
            game.lastHungerWarning = 'weak';
        } else if (game.hungerPercent >= 20) {
            game.lastHungerWarning = null;
        }
    }

    const runtime = getRuntime();
    runtime.autoSaveAccumulator += clampedDt;
    if (runtime.autoSaveAccumulator >= 1) {
        saveGame();
        runtime.autoSaveAccumulator -= 1;
    }

    updateUI();
}
