import { ROLE_DEFINITIONS } from '../config/roles.js';
import { getRoleCount } from './helpers.js';

export function getFollowerFoodConsumptionPerSecond(gameState, game) {
    const followers = Number.isFinite(gameState.progression?.followers)
        ? gameState.progression.followers
        : 0;
    const foodPerFollower = Number.isFinite(game.followerFoodPerSecond)
        ? game.followerFoodPerSecond
        : 0;

    return Math.max(0, followers) * Math.max(0, foodPerFollower);
}

export function getFoodProductionPerSecond(gameState, game) {
    return ROLE_DEFINITIONS.reduce((totalProduction, roleDefinition) => {
        const simulation = roleDefinition?.simulation;
        if (!simulation) return totalProduction;

        const roleCount = getRoleCount(roleDefinition.id);
        if (!Number.isFinite(roleCount) || roleCount <= 0) return totalProduction;

        const scalingFn = typeof simulation.scaling === 'function'
            ? simulation.scaling
            : (count) => count;

        const scale = scalingFn(roleCount, gameState, game);
        if (!Number.isFinite(scale) || scale <= 0) return totalProduction;

        const outputs = Array.isArray(simulation.outputs) ? simulation.outputs : [];
        const roleFoodProduction = outputs.reduce((roleTotal, output) => {
            if (output?.target !== 'resource' || output?.key !== 'food') return roleTotal;

            const rate = gameState.rates?.[output.rateKey];
            if (!Number.isFinite(rate) || rate <= 0) return roleTotal;

            return roleTotal + (rate * scale);
        }, 0);

        return totalProduction + roleFoodProduction;
    }, 0);
}

export function getFoodDeficitPerSecond(gameState, game) {
    const consumption = getFollowerFoodConsumptionPerSecond(gameState, game);
    const production = getFoodProductionPerSecond(gameState, game);
    return Math.max(0, consumption - production);
}

export function getHungerDrainPerSecond(gameState, game) {
    const deficit = getFoodDeficitPerSecond(gameState, game);
    const drainMultiplier = Number.isFinite(game.hungerDrainPerFoodDeficit)
        ? game.hungerDrainPerFoodDeficit
        : 0;

    return Math.max(0, deficit * Math.max(0, drainMultiplier));
}
