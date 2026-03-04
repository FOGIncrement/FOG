import { gameState, game } from './classes/GameState.js';
import { addLog } from './utils/logging.js';
import { saveGame } from './utils/persistence.js';
import { updateUI } from './ui.js';
import { ROLE_DEFINITIONS } from './config/roles.js';
import { getRoleCount } from './utils/helpers.js';
import { getFollowerFoodConsumptionPerSecond, getFoodDeficitPerSecond, getHungerDrainPerSecond, getFoodProductionPerSecond } from './utils/hunger.js';

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

function clampPercent(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, value));
}

function applyHiddenStability(starving, deficitPerSecond, dtSeconds) {
    if (!Number.isFinite(game.stability)) {
        game.stability = 100;
    }

    const stabilityGainPerSecondWhenFed = Number.isFinite(game.stabilityGainPerSecondWhenFed)
        ? Math.max(0, game.stabilityGainPerSecondWhenFed)
        : 0;
    const stabilityDrainPerFoodDeficit = Number.isFinite(game.stabilityDrainPerFoodDeficit)
        ? Math.max(0, game.stabilityDrainPerFoodDeficit)
        : 0;
    const weakThreshold = Number.isFinite(game.stabilityWeakHungerThreshold)
        ? game.stabilityWeakHungerThreshold
        : 20;
    const criticalThreshold = Number.isFinite(game.stabilityCriticalHungerThreshold)
        ? game.stabilityCriticalHungerThreshold
        : 5;
    const weakDrainPerSecond = Number.isFinite(game.stabilityWeakDrainPerSecond)
        ? Math.max(0, game.stabilityWeakDrainPerSecond)
        : 0;
    const criticalDrainPerSecond = Number.isFinite(game.stabilityCriticalDrainPerSecond)
        ? Math.max(0, game.stabilityCriticalDrainPerSecond)
        : 0;

    if (starving) {
        game.stability -= deficitPerSecond * stabilityDrainPerFoodDeficit * dtSeconds;
    } else {
        game.stability += stabilityGainPerSecondWhenFed * dtSeconds;
    }

    if (game.hungerPercent < criticalThreshold) {
        game.stability -= criticalDrainPerSecond * dtSeconds;
    } else if (game.hungerPercent < weakThreshold) {
        game.stability -= weakDrainPerSecond * dtSeconds;
    }

    game.stability = clampPercent(game.stability);
}

export function gameTick(dtSeconds = 1) {
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) return;

    const clampedDt = Math.min(2, dtSeconds);

    gameState.progression.faith += gameState.progression.followers * gameState.progression.faithPerFollower * clampedDt;
    processRoleSimulation(clampedDt);

    if (game.hungerVisible) {
        const foodAmountBeforeConsumption = Math.max(0, gameState.resources.food.amount);
        const consumptionPerSecond = getFollowerFoodConsumptionPerSecond(gameState, game);
        gameState.resources.food.amount -= consumptionPerSecond * clampedDt;

        const productionPerSecond = getFoodProductionPerSecond(gameState, game);
        const deficitPerSecond = getFoodDeficitPerSecond(gameState, game);
        const hungerDrainPerSecond = getHungerDrainPerSecond(gameState, game);

        let starvationSeconds = 0;
        if (deficitPerSecond > 0) {
            if (foodAmountBeforeConsumption <= 0) {
                starvationSeconds = clampedDt;
            } else if (consumptionPerSecond > productionPerSecond) {
                const netFoodLossPerSecond = consumptionPerSecond - productionPerSecond;
                const secondsUntilFoodRunsOut = foodAmountBeforeConsumption / netFoodLossPerSecond;
                starvationSeconds = Math.max(0, clampedDt - Math.min(clampedDt, secondsUntilFoodRunsOut));
            }
        }

        const starving = starvationSeconds > 0;

        if (gameState.resources.food.amount < 0) {
            gameState.resources.food.amount = 0;
        }

        if (starving) {
            game.hungerPercent = clampPercent(game.hungerPercent - (hungerDrainPerSecond * starvationSeconds));
        }

        applyHiddenStability(starving, deficitPerSecond, clampedDt);

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
