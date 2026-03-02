import { loadGame, clearSave, saveGame } from './utils/persistence.js';
import { clearNew } from './utils/ui-helpers.js';
import { gameState } from './classes/GameState.js';
import {
    pray, gatherWood, gatherStone, gatherFood, buildShelter, preach, training,
    feedFollowers, trainHunters, buildRitualCircle,
    rollPreachD4, cancelPreachRoll,
    unlockHuntersRole, unlockRitualistsRole, unlockGatherersRole, unlockCooksRole,
    trainRitualists, trainGatherers, trainCooks,
    gameTick, updateUI
} from './game.js';

// ===== DOM LOADED =====
document.addEventListener("DOMContentLoaded", () => {
    // Try to load saved game first
    loadGame();

    // startup sanity (defensive against bad legacy saves)
    if (!Number.isFinite(gameState.progression.followers) || gameState.progression.followers < 1) {
        gameState.progression.followers = 1;
    }
    if (!Number.isFinite(gameState.progression.faith) || gameState.progression.faith < 0) {
        gameState.progression.faith = 0;
    }

    initTabs();

    const buttons = [
        ["prayBtn", pray],
        ["gatherWoodBtn", gatherWood],
        ["gatherStoneBtn", gatherStone],
        ["gatherFoodBtn", gatherFood],
        ["buildShelterBtn", buildShelter],
        ["preachBtn", preach],
        ["trainingTechBtn", training],
        ["feedFollowersBtn", feedFollowers],
        ["trainHuntersBtn", trainHunters],
        ["buildRitualCircleBtn", buildRitualCircle],
        ["unlockHuntersBtn", unlockHuntersRole],
        ["unlockRitualistsBtn", unlockRitualistsRole],
        ["unlockGatherersBtn", unlockGatherersRole],
        ["unlockCooksBtn", unlockCooksRole],
        ["trainRitualistsBtn", trainRitualists],
        ["trainGatherersBtn", trainGatherers],
        ["trainCooksBtn", trainCooks],
        ["preachRollBtn", rollPreachD4],
        ["preachCancelBtn", cancelPreachRoll]
    ];

    buttons.forEach(([id, fn]) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("click", fn);
            // hover listener to clear new indicator
            el.addEventListener('mouseenter', () => {
                if (el.dataset.new === 'true') {
                    clearNew(el);
                    saveGame();
                }
            });
        }
    });

    const resetSaveBtn = document.getElementById('resetSaveBtn');
    if (resetSaveBtn) {
        resetSaveBtn.addEventListener('click', () => {
            const confirmed = window.confirm('Clear saved progress and restart?');
            if (confirmed) clearSave();
        });
    }

    setInterval(gameTick, 1000);
    updateUI();
});

// ===== TABS =====
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    function activate(tabName) {
        tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
        tabContents.forEach(c => c.style.display = (c.id === `tab-${tabName}`) ? 'block' : 'none');
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => activate(btn.dataset.tab));
    });

    // default active tab: actions
    activate('actions');
}
