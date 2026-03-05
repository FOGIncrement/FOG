import { loadGame, clearSave, saveGame } from './utils/persistence.js';
import { clearNew } from './utils/ui-helpers.js';
import { initTooltips, setTooltipContent } from './utils/tooltip.js';
import { addLog } from './utils/logging.js';
import { gameState } from './classes/GameState.js';
import * as gameApi from './game.js';
import { actionRegistry } from './registries/index.js';
import { ACTION_TAB_ORDER } from './config/action-definitions.js';

// ===== DOM LOADED =====
document.addEventListener("DOMContentLoaded", () => {
    // Try to load saved game first
    loadGame();
    initTooltips();

    // startup sanity (defensive against bad legacy saves)
    if (!Number.isFinite(gameState.progression.followers) || gameState.progression.followers < 0) {
        gameState.progression.followers = 0;
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

    const discoveredAreasList = document.getElementById('discoveredAreasList');
    if (discoveredAreasList) {
        discoveredAreasList.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const sermonBtn = target.closest('.village-sermon-btn');
            if (!sermonBtn) return;
            const villageId = sermonBtn.dataset.villageId;
            if (!villageId) return;
            if (typeof gameApi.holdVillageSermon === 'function') {
                gameApi.holdVillageSermon(villageId);
            }
        });
    }

    const resetSaveBtn = document.getElementById('resetSaveBtn');
    if (resetSaveBtn) {
        setTooltipContent(
            resetSaveBtn,
            'Reset Save\nClear saved progress and restart from the beginning.',
            'Deletes local save data for this browser profile.'
        );
        resetSaveBtn.addEventListener('click', () => {
            const confirmed = window.confirm('Clear saved progress and restart?');
            if (confirmed) clearSave();
        });
    }

    initCheatMenu();

    let lastTickMs = performance.now();
    setInterval(() => {
        const now = performance.now();
        const dtSeconds = (now - lastTickMs) / 1000;
        lastTickMs = now;
        gameApi.gameTick(dtSeconds);
    }, 100);
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

function initCheatMenu() {
    const MILLION = 1_000_000;

    const cheatFaithBtn = document.getElementById('cheatFaithBtn');
    if (cheatFaithBtn) {
        cheatFaithBtn.addEventListener('click', () => {
            gameState.progression.faith += MILLION;
            addLog('Cheat used: +1,000,000 faith.');
            gameApi.updateUI();
            saveGame();
        });
    }

    const cheatFoodBtn = document.getElementById('cheatFoodBtn');
    if (cheatFoodBtn) {
        cheatFoodBtn.addEventListener('click', () => {
            gameState.resources.food.amount += MILLION;
            addLog('Cheat used: +1,000,000 food.');
            gameApi.updateUI();
            saveGame();
        });
    }

    const cheatWoodBtn = document.getElementById('cheatWoodBtn');
    if (cheatWoodBtn) {
        cheatWoodBtn.addEventListener('click', () => {
            gameState.resources.wood.amount += MILLION;
            addLog('Cheat used: +1,000,000 wood.');
            gameApi.updateUI();
            saveGame();
        });
    }

    const cheatStoneBtn = document.getElementById('cheatStoneBtn');
    if (cheatStoneBtn) {
        cheatStoneBtn.addEventListener('click', () => {
            gameState.resources.stone.amount += MILLION;
            addLog('Cheat used: +1,000,000 stone.');
            gameApi.updateUI();
            saveGame();
        });
    }
}
