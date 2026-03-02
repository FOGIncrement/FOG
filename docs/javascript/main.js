import { loadGame, clearSave, saveGame } from './utils/persistence.js';
import { clearNew } from './utils/ui-helpers.js';
import { gameState } from './classes/GameState.js';
import * as gameApi from './game.js';
import { actionRegistry } from './registries/index.js';
import { ACTION_TAB_ORDER } from './config/actions.js';

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

    ACTION_TAB_ORDER.forEach((tab) => {
        actionRegistry.getByTab(tab).forEach((actionDefinition) => {
            const handler = gameApi[actionDefinition.handlerExport];
            if (typeof handler !== 'function') return;

            const el = document.getElementById(actionDefinition.buttonId);
            if (el) {
                el.addEventListener("click", handler);
                // hover listener to clear new indicator
                el.addEventListener('mouseenter', () => {
                    if (el.dataset.new === 'true') {
                        clearNew(el);
                        saveGame();
                    }
                });
            }
        });
    });

    const resetSaveBtn = document.getElementById('resetSaveBtn');
    if (resetSaveBtn) {
        resetSaveBtn.addEventListener('click', () => {
            const confirmed = window.confirm('Clear saved progress and restart?');
            if (confirmed) clearSave();
        });
    }

    setInterval(gameApi.gameTick, 1000);
    gameApi.updateUI();
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
