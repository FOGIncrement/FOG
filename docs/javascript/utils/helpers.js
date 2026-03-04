import { gameState, game } from '../classes/GameState.js';
import { ROLE_DEFINITIONS } from '../config/roles.js';

function normalizeRoleCount(value) {
    if (!Number.isFinite(value) || value < 0) return 0;
    return Math.floor(value);
}

export function getRoleCount(roleId) {
    const roleMapValue = gameState.progression.roles?.[roleId];
    if (Number.isFinite(roleMapValue)) return normalizeRoleCount(roleMapValue);

    const legacyValue = gameState.progression[roleId];
    return normalizeRoleCount(legacyValue);
}

export function setRoleCount(roleId, count) {
    const normalized = normalizeRoleCount(count);

    if (!gameState.progression.roles || typeof gameState.progression.roles !== 'object') {
        gameState.progression.roles = {};
    }

    gameState.progression.roles[roleId] = normalized;
    gameState.progression[roleId] = normalized;
}

export function getMaxFollowers() {
    const perShelter = (game.shelterCapacityPerShelter || 3) * (game.shelterCapacityMultiplier || 1);
    return 1 + game.shelter * perShelter;
}

export function getAssignedFollowers() {
    return ROLE_DEFINITIONS.reduce((total, roleDefinition) => {
        return total + getRoleCount(roleDefinition.id);
    }, 0);
}

export function getUnassignedFollowers() {
    return Math.max(0, gameState.progression.followers - getAssignedFollowers());
}

export function getRoleTrainingCost(baseCost) {
    const untrained = getUnassignedFollowers();
    if (untrained <= 0) return Infinity;

    const inputEl = document.getElementById('trainCountInput');
    let toTrain = inputEl && inputEl.value ? parseInt(inputEl.value, 10) : untrained;
    if (isNaN(toTrain) || toTrain <= 0) toTrain = untrained;
    toTrain = Math.min(toTrain, untrained);

    return toTrain * baseCost;
}

export function getShelterBuildCosts() {
    const sheltersBuilt = Number.isFinite(game.shelter) ? Math.max(0, game.shelter) : 0;
    const scalePerBuilt = Number.isFinite(game.shelterCostScalePerBuilt)
        ? game.shelterCostScalePerBuilt
        : 0.1;
    const scale = 1 + (scalePerBuilt * sheltersBuilt);
    const woodBase = Number.isFinite(gameState.costs.shelterWoodCost) ? gameState.costs.shelterWoodCost : 0;
    const stoneBase = Number.isFinite(gameState.costs.shelterStoneCost) ? gameState.costs.shelterStoneCost : 0;

    return {
        wood: woodBase * scale,
        stone: stoneBase * scale
    };
}

export function rollPreachConversions() {
    const weights = Array.isArray(game.preachOutcomeWeights) && game.preachOutcomeWeights.length === 4
        ? game.preachOutcomeWeights
        : [45, 30, 18, 7];

    const totalWeight = weights.reduce((sum, value) => sum + Math.max(0, value), 0);
    if (totalWeight <= 0) return 1;

    let roll = Math.random() * totalWeight;
    for (let i = 0; i < weights.length; i++) {
        roll -= Math.max(0, weights[i]);
        if (roll <= 0) return i + 1;
    }

    return 1;
}