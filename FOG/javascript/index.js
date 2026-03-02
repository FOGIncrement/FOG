// Import from classes
import { gameState, game, lastHungerWarning } from './classes/GameState.js';

// Import from utils
import { saveGame, loadGame, clearSave } from './utils/persistence.js';
import { addLog } from './utils/logging.js';
import { getMaxFollowers, getHunterTrainingCost } from './utils/helpers.js';
import { 
    markNew, 
    clearNew, 
    updateTabBadges, 
    setVisible, 
    setAffordability 
} from './utils/ui-helpers.js';

// Import game functions
import {
    gatherWood,
    gatherStone,
    gatherFood,
    pray,
    buildShelter,
    convertFollower,
    preach,
    training,
    feedFollowers,
    trainHunters,
    gameTick,
    updateUI,
    updateButtons
} from './game.js';

// Import main
import { initTabs, showTabs, hideTabs } from './main.js';

// Make everything global so it's accessible everywhere
window.gameState = gameState;
window.game = game;
window.saveGame = saveGame;
window.loadGame = loadGame;
window.clearSave = clearSave;
window.addLog = addLog;
window.getMaxFollowers = getMaxFollowers;
window.getHunterTrainingCost = getHunterTrainingCost;
window.markNew = markNew;
window.clearNew = clearNew;
window.updateTabBadges = updateTabBadges;
window.setVisible = setVisible;
window.setAffordability = setAffordability;
window.gatherWood = gatherWood;
window.gatherStone = gatherStone;
window.gatherFood = gatherFood;
window.pray = pray;
window.buildShelter = buildShelter;
window.convertFollower = convertFollower;
window.preach = preach;
window.training = training;
window.feedFollowers = feedFollowers;
window.trainHunters = trainHunters;
window.gameTick = gameTick;
window.updateUI = updateUI;
window.updateButtons = updateButtons;
window.initTabs = initTabs;
window.showTabs = showTabs;
window.hideTabs = hideTabs;