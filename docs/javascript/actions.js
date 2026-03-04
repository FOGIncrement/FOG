import { gameState, game } from './classes/GameState.js';
import { addLog } from './utils/logging.js';
import { saveGame } from './utils/persistence.js';
import { updateUI } from './ui.js';
import { getMaxFollowers, getRoleCount, getShelterBuildCosts } from './utils/helpers.js';
import { rollDice } from './utils/dice.js';
import { buildingRegistry } from './registries/index.js';

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

function applyGlobalCostReduction(multiplier) {
    Object.keys(gameState.costs).forEach((costKey) => {
        const value = gameState.costs[costKey];
        if (!Number.isFinite(value)) return;
        gameState.costs[costKey] = Math.max(1, Math.floor(value * multiplier));
    });

    game.convertCost = Math.max(1, Math.floor(game.convertCost * multiplier));

    ['wood', 'stone', 'food'].forEach((resourceKey) => {
        const resource = gameState.resources[resourceKey];
        if (!resource || !Number.isFinite(resource.gatherCost)) return;
        resource.gatherCost = Math.max(1, Math.floor(resource.gatherCost * multiplier));
    });
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
    const shelterDefinition = buildingRegistry.get('shelter');
    if (!shelterDefinition) return;

    const shelterCosts = getShelterBuildCosts();

    if (
        gameState.resources.wood.amount >= shelterCosts.wood &&
        gameState.resources.stone.amount >= shelterCosts.stone
    ) {
        gameState.resources.wood.spend(shelterCosts.wood);
        gameState.resources.stone.spend(shelterCosts.stone);
        game[shelterDefinition.levelKey] += 1;

        if (!game.hungerVisible) game.hungerVisible = true;

        game.shelterBtnUnlocked = true;
        updateUI();
        saveGame();
    }
}

export function unlockShelterUpgrade() {
    if (game.shelterUpgradeUnlocked) return;
    if (gameState.progression.followers < game.shelterUpgradeFollowerRequirement) return;

    const upgradeCost = gameState.costs.unlockShelterUpgradeFaithCost;
    if (gameState.progression.faith < upgradeCost) return;

    gameState.progression.faith -= upgradeCost;
    game.shelterUpgradeUnlocked = true;
    game.shelterCapacityMultiplier = 2;

    applyGlobalCostReduction(0.5);
    addLog('Shelter upgraded to Shack. Capacity doubled and costs reduced by 50%.');

    updateUI();
    saveGame();
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

    const preachBonus = Number.isFinite(game.diceBonuses?.preach) ? Math.trunc(game.diceBonuses.preach) : 0;

    const text = document.getElementById('preachDiceText');
    const die = document.getElementById('preachDieFace');
    if (text) {
        text.innerText = preachBonus > 0
            ? `Roll 1d4 + ${preachBonus} for conversion:`
            : 'Roll 1d4 for conversion:';
    }
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
            const preachBonus = Number.isFinite(game.diceBonuses?.preach) ? Math.trunc(game.diceBonuses.preach) : 0;
            const result = rollDice('1d4', { bonus: preachBonus });
            const finalRoll = result.total;
            const baseRoll = result.baseTotal;
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
                if (result.bonus > 0) {
                    addLog(`Preach roll ${result.notation}: ${baseRoll} + ${result.bonus} = ${finalRoll}. Your sermon converted ${converted} follower${converted > 1 ? 's' : ''}.`);
                } else {
                    addLog(`Preach roll ${result.notation}: ${finalRoll}. Your sermon converted ${converted} follower${converted > 1 ? 's' : ''}.`);
                }
            } else {
                if (result.bonus > 0) {
                    addLog(`Preach roll ${result.notation}: ${baseRoll} + ${result.bonus} = ${finalRoll}, but you have no room for more followers.`);
                } else {
                    addLog(`Preach roll ${result.notation}: ${finalRoll}, but you have no room for more followers.`);
                }
            }

            if (text) {
                text.innerText = result.bonus > 0
                    ? `Rolled ${baseRoll} + ${result.bonus} = ${finalRoll} on ${result.notation}.`
                    : `Rolled ${finalRoll} on ${result.notation}.`;
            }

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
    const feedFoodCost = Number.isFinite(gameState.costs.manualFeedFoodCost)
        ? Math.max(1, Math.floor(gameState.costs.manualFeedFoodCost))
        : 1;

    if (gameState.resources.food.amount < feedFoodCost || game.hungerPercent >= 100) return;
    gameState.resources.food.spend(feedFoodCost);
    const cookBonusMultiplier = 1 + getRoleCount('cooks') * gameState.rates.cookHungerGainBonusPerCook;
    const hungerGain = game.feedAmount * cookBonusMultiplier;
    game.hungerPercent = Math.min(100, game.hungerPercent + hungerGain);
    addLog('You feed the followers. Hunger restored.');
    updateUI();
    saveGame();
}

export function buildRitualCircle() {
    const ritualDefinition = buildingRegistry.get('ritualCircle');
    if (!ritualDefinition) return;

    const currentLevel = game[ritualDefinition.levelKey];
    const canBuildLevel = currentLevel < ritualDefinition.maxLevel;
    const costKey = ritualDefinition.faithCostKey;

    if (gameState.progression.faith >= gameState.costs[costKey] && canBuildLevel) {
        gameState.progression.faith -= gameState.costs[costKey];
        game[ritualDefinition.levelKey] = currentLevel + 1;
        gameState.progression.faithPerFollower += 0.005;
        updateUI();
        saveGame();
    }
}

export function buildAltar() {
    if (!game.altarUnlocked || game.altarBuilt) return;

    const woodCost = gameState.costs.altarBuildWoodCost;
    const stoneCost = gameState.costs.altarBuildStoneCost;
    const faithCost = gameState.costs.altarBuildFaithCost;

    const canAfford =
        gameState.resources.wood.amount >= woodCost &&
        gameState.resources.stone.amount >= stoneCost &&
        gameState.progression.faith >= faithCost;

    if (!canAfford) return;

    gameState.resources.wood.spend(woodCost);
    gameState.resources.stone.spend(stoneCost);
    gameState.progression.faith -= faithCost;

    game.altarBuilt = true;
    game.diceBonuses.preach = Math.max(1, Number.isFinite(game.diceBonuses.preach) ? Math.trunc(game.diceBonuses.preach) : 0);
    addLog('Altar built. Preach rolls now gain +1 (1d4 + 1).');

    updateUI();
    saveGame();
}

export function unlockAltar() {
    if (game.altarUnlocked) return;
    if (gameState.progression.followers < game.shelterUpgradeFollowerRequirement) return;

    game.altarUnlocked = true;
    addLog('Altar unlocked. Build it in the Build tab to activate its effects.');

    updateUI();
    saveGame();
}
