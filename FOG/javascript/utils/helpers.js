// ===== HELPERS =====
export function getMaxFollowers() {
    return 1 + game.shelter * 3;
}

export function getHunterTrainingCost() {
    const untrained = gameState.progression.followers - gameState.progression.hunters;
    return untrained * gameState.costs.hunterBaseCost;
}