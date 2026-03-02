import { gameState, game } from './classes/GameState.js';
import { addLog } from './utils/logging.js';
import { saveGame } from './utils/persistence.js';
import { updateUI } from './ui.js';
import { getUnassignedFollowers } from './utils/helpers.js';
import { ROLE_DEFINITION_BY_ID } from './config/roles.js';

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

function trainRoleById(roleId) {
    const role = ROLE_DEFINITION_BY_ID[roleId];
    if (!role) return;
    trainRole(role.id, gameState.costs[role.trainCostKey], role.label.toLowerCase());
}

export function trainHunters() {
    trainRoleById('hunters');
}

export function trainRitualists() {
    trainRoleById('ritualists');
}

export function trainGatherers() {
    trainRoleById('gatherers');
}

export function trainCooks() {
    trainRoleById('cooks');
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

function unlockRoleById(roleId) {
    const role = ROLE_DEFINITION_BY_ID[roleId];
    if (!role) return;
    unlockRole(role.id, gameState.costs[role.unlockCostKey], role.label);
}

export function unlockHuntersRole() {
    unlockRoleById('hunters');
}

export function unlockRitualistsRole() {
    unlockRoleById('ritualists');
}

export function unlockGatherersRole() {
    unlockRoleById('gatherers');
}

export function unlockCooksRole() {
    unlockRoleById('cooks');
}
