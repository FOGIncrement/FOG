import { gameState, game } from './classes/GameState.js';
import { addLog } from './utils/logging.js';
import { saveGame } from './utils/persistence.js';
import { updateUI } from './ui.js';
import { getMaxFollowers } from './utils/helpers.js';

let preachRollReady = false;
let preachRollInProgress = false;

function canPreachNow() {
    const max = getMaxFollowers();
    const hasCost = gameState.progression.faith >= gameState.costs.preachFaithCost &&
        game.hungerPercent >= 10 && gameState.resources.food.amount >= 10;
    const hasCapacity = gameState.progression.followers < max;
    return hasCost && hasCapacity;
}

function setPreachDiceVisible(visible) {
    const panel = document.getElementById('preachDicePanel');
    if (panel) panel.style.display = visible ? 'block' : 'none';
}

export function gatherWood() {
    if (gameState.resources.wood.gather()) {
        updateUI();
        saveGame();
    }
}

export function gatherStone() {
    if (gameState.resources.stone.gather()) {
        updateUI();
        saveGame();
    }
}

export function gatherFood() {
    const gained = gameState.resources.food.gather();
    if (gained !== false) {
        addLog(`A hunt yielded ${gained} food.`);
        if (!game.hasGatheredFood && gameState.resources.food.amount > 0) {
            game.hasGatheredFood = true;
        }
        updateUI();
        saveGame();
    }
}

export function pray() {
    gameState.progression.faith += game.prayAmt;
    updateUI();
    saveGame();
}

export function buildShelter() {
    if (
        gameState.resources.wood.amount >= gameState.costs.shelterWoodCost &&
        gameState.resources.stone.amount >= gameState.costs.shelterStoneCost
    ) {
        gameState.resources.wood.spend(gameState.costs.shelterWoodCost);
        gameState.resources.stone.spend(gameState.costs.shelterStoneCost);
        game.shelter += 1;

        gameState.costs.shelterWoodCost = Math.floor(gameState.costs.shelterWoodCost * 1.8);
        gameState.costs.shelterStoneCost = Math.floor(gameState.costs.shelterStoneCost * 1.8);

        if (!game.hungerVisible) game.hungerVisible = true;

        game.shelterBtnUnlocked = true;
        updateUI();
        saveGame();
    }
}

export function convertFollower() {
    if (gameState.progression.faith >= game.convertCost) {
        gameState.progression.faith -= game.convertCost;
        gameState.progression.followers += 1;
        game.convertCost = Math.floor(game.convertCost * 1.15);
        updateUI();
        saveGame();
    }
}

export function preach() {
    if (!canPreachNow() || preachRollInProgress) return;
    preachRollReady = true;

    const text = document.getElementById('preachDiceText');
    const die = document.getElementById('preachDieFace');
    if (text) text.innerText = 'Roll 1d4 for conversion:';
    if (die) die.innerText = '?';

    setPreachDiceVisible(true);
}

export function cancelPreachRoll() {
    if (preachRollInProgress) return;
    preachRollReady = false;
    setPreachDiceVisible(false);
}

export function rollPreachD4() {
    if (!preachRollReady || preachRollInProgress) return;
    if (!canPreachNow()) {
        preachRollReady = false;
        setPreachDiceVisible(false);
        updateUI();
        return;
    }

    preachRollInProgress = true;
    const die = document.getElementById('preachDieFace');
    const text = document.getElementById('preachDiceText');
    const rollBtn = document.getElementById('preachRollBtn');
    if (rollBtn) rollBtn.disabled = true;

    const animationTicks = 8;
    let tick = 0;
    const timer = setInterval(() => {
        tick += 1;
        const preview = Math.floor(Math.random() * 4) + 1;
        if (die) die.innerText = `${preview}`;

        if (tick >= animationTicks) {
            clearInterval(timer);
            const finalRoll = Math.floor(Math.random() * 4) + 1;
            if (die) die.innerText = `${finalRoll}`;

            const max = getMaxFollowers();
            gameState.progression.faith -= gameState.costs.preachFaithCost;
            game.hungerPercent = Math.max(0, game.hungerPercent - 10);
            gameState.resources.food.spend(10);

            const capacity = Math.max(0, max - gameState.progression.followers);
            const converted = Math.min(finalRoll, capacity);
            if (converted > 0) {
                gameState.progression.followers += converted;
                if (!game.unlocksTabUnlocked) {
                    game.unlocksTabUnlocked = true;
                    addLog('Unlocks tab is now available.');
                }
                addLog(`D4 rolled ${finalRoll}. Your sermon converted ${converted} follower${converted > 1 ? 's' : ''}.`);
            } else {
                addLog(`D4 rolled ${finalRoll}, but you have no room for more followers.`);
            }

            if (text) text.innerText = `Rolled ${finalRoll} on 1d4.`;

            preachRollInProgress = false;
            preachRollReady = false;
            if (rollBtn) rollBtn.disabled = false;

            setTimeout(() => {
                if (!preachRollInProgress) setPreachDiceVisible(false);
            }, 500);

            updateUI();
            saveGame();
        }
    }, 80);
}

export function feedFollowers() {
    if (gameState.resources.food.amount <= 0 || game.hungerPercent >= 100) return;
    gameState.resources.food.spend(1);
    const cookBonusMultiplier = 1 + (gameState.progression.cooks || 0) * gameState.rates.cookHungerGainBonusPerCook;
    const hungerGain = game.feedAmount * cookBonusMultiplier;
    game.hungerPercent = Math.min(100, game.hungerPercent + hungerGain);
    addLog('You feed the followers. Hunger restored.');
    updateUI();
    saveGame();
}

export function buildRitualCircle() {
    if (gameState.progression.faith >= gameState.costs.ritualBtnCost && game.ritualCircleBuilt < 1) {
        gameState.progression.faith -= gameState.costs.ritualBtnCost;
        game.ritualCircleBuilt = 1;
        gameState.progression.faithPerFollower += 0.005;
        updateUI();
        saveGame();
    }
}
