import { gameState, game } from './classes/GameState.js';
import { addLog } from './utils/logging.js';
import { saveGame } from './utils/persistence.js';
import { updateUI } from './ui.js';
import { getUnassignedFollowers } from './utils/helpers.js';

export function training() {
    if (game.trainingUnlocked) return;
    if (gameState.progression.faith < gameState.costs.trainingTechCost) return;

    gameState.progression.faith -= gameState.costs.trainingTechCost;
    game.trainingUnlocked = true;
    addLog('Training program purchased.');
    updateUI();
    saveGame();
}

function trainRole(roleKey, baseCost, label) {
    if (!game.trainingUnlocked || !game.roleUnlocks[roleKey]) return;

    const untrained = getUnassignedFollowers();
    if (untrained <= 0) return;

    const inputEl = document.getElementById('trainCountInput');
    let toTrain = inputEl ? parseInt(inputEl.value, 10) : untrained;
    if (isNaN(toTrain) || toTrain <= 0) toTrain = untrained;
    toTrain = Math.min(toTrain, untrained);

    const cost = toTrain * baseCost;
    if (gameState.progression.faith < cost) return;

    gameState.progression.faith -= cost;
    gameState.progression[roleKey] = (gameState.progression[roleKey] || 0) + toTrain;

    addLog(`Trained ${toTrain} follower${toTrain > 1 ? 's' : ''} as ${label}.`);
    updateUI();
    saveGame();
}

export function trainHunters() {
    trainRole('hunters', gameState.costs.hunterBaseCost, 'hunters');
}

export function trainRitualists() {
    trainRole('ritualists', gameState.costs.ritualistBaseCost, 'ritualists');
}

export function trainGatherers() {
    trainRole('gatherers', gameState.costs.gathererBaseCost, 'gatherers');
}

export function trainCooks() {
    trainRole('cooks', gameState.costs.cookBaseCost, 'cooks');
}

function unlockRole(roleKey, cost, label) {
    if (game.roleUnlocks[roleKey]) return;
    if (!game.trainingUnlocked) return;
    if (gameState.progression.faith < cost) return;

    gameState.progression.faith -= cost;
    game.roleUnlocks[roleKey] = true;
    addLog(`${label} role unlocked.`);
    updateUI();
    saveGame();
}

export function unlockHuntersRole() {
    unlockRole('hunters', gameState.costs.unlockHuntersFaithCost, 'Hunters');
}

export function unlockRitualistsRole() {
    unlockRole('ritualists', gameState.costs.unlockRitualistsFaithCost, 'Ritualists');
}

export function unlockGatherersRole() {
    unlockRole('gatherers', gameState.costs.unlockGatherersFaithCost, 'Gatherers');
}

export function unlockCooksRole() {
    unlockRole('cooks', gameState.costs.unlockCooksFaithCost, 'Cooks');
}
