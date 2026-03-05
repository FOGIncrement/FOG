import { gameState, game } from './classes/GameState.js';
import { addLog } from './utils/logging.js';
import { saveGame } from './utils/persistence.js';
import { updateUI } from './ui.js';
import { getMaxFollowers, getUnassignedFollowers, getRoleCount, setRoleCount } from './utils/helpers.js';
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

    const roleDefinition = ROLE_DEFINITION_BY_ID[roleKey];
    const maxAssignable = Number.isFinite(roleDefinition?.maxAssignable)
        ? Math.max(0, Math.floor(roleDefinition.maxAssignable))
        : Infinity;

    const currentCount = getRoleCount(roleKey);
    const remainingSlots = maxAssignable === Infinity ? Infinity : Math.max(0, maxAssignable - currentCount);
    toTrain = Math.min(toTrain, remainingSlots);
    if (toTrain <= 0) return;

    const cost = toTrain * baseCost;
    if (gameState.progression.faith < cost) return;

    gameState.progression.faith -= cost;
    setRoleCount(roleKey, currentCount + toTrain);

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

export function unlockProphetRole() {
    if (game.prophetUnlocked) return;
    if (!game.trainingUnlocked) return;

    const requiredCapacity = Number.isFinite(game.prophetUnlockCapacityRequirement)
        ? Math.floor(game.prophetUnlockCapacityRequirement)
        : 150;

    if (getMaxFollowers() < requiredCapacity) return;

    const unlockCost = gameState.costs.unlockProphetFaithCost;
    if (gameState.progression.faith < unlockCost) return;

    gameState.progression.faith -= unlockCost;
    game.prophetUnlocked = true;
    game.roleUnlocks.prophet = true;
    addLog('The Prophet calling is unlocked. You may assign one follower as Prophet.');
    updateUI();
    saveGame();
}

export function trainProphet() {
    if (!game.prophetUnlocked) return;
    trainRoleById('prophet');
}
