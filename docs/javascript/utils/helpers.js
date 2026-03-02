import { gameState, game } from '../classes/GameState.js';

export function getMaxFollowers() {
    const perShelter = (game.shelterCapacityPerShelter || 3) * (game.shelterCapacityMultiplier || 1);
    return 1 + game.shelter * perShelter;
}

export function getAssignedFollowers() {
    return (
        (gameState.progression.hunters || 0) +
        (gameState.progression.ritualists || 0) +
        (gameState.progression.gatherers || 0) +
        (gameState.progression.cooks || 0)
    );
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