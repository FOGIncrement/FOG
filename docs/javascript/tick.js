import { gameState, game } from './classes/GameState.js';
import { addLog } from './utils/logging.js';
import { saveGame } from './utils/persistence.js';
import { updateUI } from './ui.js';

function applyRitualistFaithProduction() {
    gameState.progression.faith += (gameState.progression.ritualists || 0) * gameState.rates.ritualistFaithPerSecond;
}

export function gameTick() {
    gameState.progression.faith += gameState.progression.followers * gameState.progression.faithPerFollower;
    applyRitualistFaithProduction();

    gameState.resources.wood.amount += (gameState.progression.gatherers || 0) * gameState.rates.gathererWoodPerSecond;
    gameState.resources.stone.amount += (gameState.progression.gatherers || 0) * gameState.rates.gathererStonePerSecond;

    if (game.hungerVisible) {
        gameState.resources.food.amount += gameState.progression.hunters * gameState.rates.hunterFoodPerSecond;
        const cookFlatGain = (gameState.progression.cooks || 0) * gameState.rates.cookFlatHungerGainPerSecond;

        const cookEfficiency = Math.min(0.5, (gameState.progression.cooks || 0) * gameState.rates.cookHungerDrainReductionPerCook);
        const drain = gameState.progression.followers * game.followerHungerDrain * (1 - cookEfficiency);

        if (gameState.resources.food.amount > 0 && game.hungerPercent < 100) {
            const autoFeedAmount = Math.min(game.autoFeedFoodPerSecond, gameState.resources.food.amount);
            gameState.resources.food.spend(autoFeedAmount);
            const hungerGain = autoFeedAmount * game.foodHungerGain * (1 + (gameState.progression.cooks || 0) * gameState.rates.cookHungerGainBonusPerCook);
            const netEffect = hungerGain + cookFlatGain - drain;
            game.hungerPercent = Math.max(0, Math.min(100, game.hungerPercent + netEffect));
        } else {
            game.hungerPercent = Math.max(0, Math.min(100, game.hungerPercent + cookFlatGain - drain));
        }

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

    updateUI();
    saveGame();
}
