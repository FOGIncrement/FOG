import { loadGame, clearSave, saveGame } from './utils/persistence.js';
import { clearNew } from './utils/ui-helpers.js';
import { initTooltips, setTooltipContent } from './utils/tooltip.js';
import { addLog } from './utils/logging.js';
import { gameState, game } from './classes/GameState.js';
import * as gameApi from './game.js';
import { actionRegistry } from './registries/index.js';
import { ACTION_TAB_ORDER } from './config/action-definitions.js';

const CHEAT_BALANCE_FIELD_SECTIONS = [
    {
        title: 'Core Game',
        entries: [
            { label: 'Pray Faith Per Click', target: game, key: 'prayAmt', step: 0.1, min: 0 },
            { label: 'Convert Follower Cost', target: game, key: 'convertCost', step: 1, min: 0 },
            { label: 'Manual Feed Hunger Gain', target: game, key: 'feedAmount', step: 0.5, min: 0 },
            { label: 'Follower Hunger Drain', target: game, key: 'followerHungerDrain', step: 0.01, min: 0 },
            { label: 'Auto Feed Food Per Second', target: game, key: 'autoFeedFoodPerSecond', step: 0.01, min: 0 },
            { label: 'Food Hunger Gain Multiplier', target: game, key: 'foodHungerGain', step: 0.01, min: 0 },
            { label: 'Shelter Capacity Per Shelter', target: game, key: 'shelterCapacityPerShelter', step: 1, min: 0 },
            { label: 'Shelter Capacity Multiplier', target: game, key: 'shelterCapacityMultiplier', step: 0.1, min: 0 },
            { label: 'Faith Per Follower Per Second', target: gameState.progression, key: 'faithPerFollower', step: 0.001, min: 0 }
        ]
    },
    {
        title: 'Gathering',
        entries: [
            { label: 'Manual Gather Base Amount', target: gameState.gathering, key: 'manualGatherBaseAmount', step: 0.1, min: 0 },
            { label: 'Manual Gather Shelter Bonus', target: gameState.gathering, key: 'manualGatherShelterBonus', step: 0.1, min: 0 },
            { label: 'Gather Food Min Multiplier', target: gameState.gathering, key: 'gatherFoodMinMultiplier', step: 0.1, min: 0 },
            { label: 'Gather Food Max Multiplier', target: gameState.gathering, key: 'gatherFoodMaxMultiplier', step: 0.1, min: 0 }
        ]
    },
    {
        title: 'Automation Rates',
        entries: [
            { label: 'Hunter Food Per Second', target: gameState.rates, key: 'hunterFoodPerSecond', step: 0.01, min: 0 },
            { label: 'Ritualist Faith Per Second', target: gameState.rates, key: 'ritualistFaithPerSecond', step: 0.01, min: 0 },
            { label: 'Gatherer Wood Per Second', target: gameState.rates, key: 'gathererWoodPerSecond', step: 0.01, min: 0 },
            { label: 'Gatherer Stone Per Second', target: gameState.rates, key: 'gathererStonePerSecond', step: 0.01, min: 0 },
            { label: 'Cook Hunger Gain Per Cook Per Second', target: gameState.rates, key: 'cookFlatHungerGainPerSecond', step: 0.01, min: 0 },
            { label: 'Cook Hunger Drain Reduction Per Cook', target: gameState.rates, key: 'cookHungerDrainReductionPerCook', step: 0.01, min: 0 },
            { label: 'Cook Hunger Bonus Per Cook', target: gameState.rates, key: 'cookHungerGainBonusPerCook', step: 0.1, min: 0 }
        ]
    },
    {
        title: 'Costs',
        entries: [
            { label: 'Shelter Wood Base Cost', target: gameState.costs, key: 'shelterWoodCost', step: 1, min: 0 },
            { label: 'Shelter Stone Base Cost', target: gameState.costs, key: 'shelterStoneCost', step: 1, min: 0 },
            { label: 'Ritual Circle Cost (Faith)', target: gameState.costs, key: 'ritualBtnCost', step: 1, min: 0 },
            { label: 'Preach Cost (Faith)', target: gameState.costs, key: 'preachFaithCost', step: 1, min: 0 },
            { label: 'Training Unlock Cost (Faith)', target: gameState.costs, key: 'trainingTechCost', step: 1, min: 0 },
            { label: 'Unlock Hunters Cost (Faith)', target: gameState.costs, key: 'unlockHuntersFaithCost', step: 1, min: 0 },
            { label: 'Unlock Ritualists Cost (Faith)', target: gameState.costs, key: 'unlockRitualistsFaithCost', step: 1, min: 0 },
            { label: 'Unlock Gatherers Cost (Faith)', target: gameState.costs, key: 'unlockGatherersFaithCost', step: 1, min: 0 },
            { label: 'Unlock Cooks Cost (Faith)', target: gameState.costs, key: 'unlockCooksFaithCost', step: 1, min: 0 },
            { label: 'Unlock Prophet Cost (Faith)', target: gameState.costs, key: 'unlockProphetFaithCost', step: 1, min: 0 },
            { label: 'Unlock Exploration Cost (Faith)', target: gameState.costs, key: 'unlockExplorationFaithCost', step: 1, min: 0 },
            { label: 'Expedition Roll Cost (Faith)', target: gameState.costs, key: 'expeditionRollFaithCost', step: 1, min: 0 },
            { label: 'Unlock Shelter Upgrade Cost (Faith)', target: gameState.costs, key: 'unlockShelterUpgradeFaithCost', step: 1, min: 0 },
            { label: 'Unlock Altar Cost (Faith)', target: gameState.costs, key: 'unlockAltarFaithCost', step: 1, min: 0 },
            { label: 'Build Altar Wood Cost', target: gameState.costs, key: 'altarBuildWoodCost', step: 1, min: 0 },
            { label: 'Build Altar Stone Cost', target: gameState.costs, key: 'altarBuildStoneCost', step: 1, min: 0 },
            { label: 'Build Altar Faith Cost', target: gameState.costs, key: 'altarBuildFaithCost', step: 1, min: 0 }
        ]
    },
    {
        title: 'Live Progression',
        entries: [
            { label: 'Current Followers', target: gameState.progression, key: 'followers', step: 1, min: 0 },
            { label: 'Current Faith', target: gameState.progression, key: 'faith', step: 1, min: 0 },
            { label: 'Shelter Count', target: game, key: 'shelter', step: 1, min: 0 }
        ]
    },
    {
        title: 'Exploration & Prophet',
        entries: [
            { label: 'Expedition Follower Send Limit', target: game.exploration, key: 'followerSendLimit', step: 1, min: 1 },
            { label: 'Prophet Sway', target: gameState.progression, key: 'prophetSway', step: 1, min: 1 },
            { label: 'Prophet Unlock Capacity Requirement', target: game, key: 'prophetUnlockCapacityRequirement', step: 1, min: 1 }
        ]
    }
];

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

    initCheatBalanceEditor();
}

function initCheatBalanceEditor() {
    const container = document.getElementById('cheatBalanceTableContainer');
    if (!container) return;
    container.innerHTML = '<p style="margin:6px;color:#999;">Loading balance controls...</p>';

    const applyAllBtn = document.getElementById('cheatApplyAllBtn');
    const resetInputsBtn = document.getElementById('cheatResetInputsBtn');

    const bindings = CHEAT_BALANCE_FIELD_SECTIONS
        .flatMap((section) => section.entries)
        .filter((entry) => entry && entry.target && typeof entry.target === 'object' && typeof entry.key === 'string');

    try {
        if (bindings.length === 0) {
            container.innerHTML = '<p style="margin:6px;color:#caa;">No balance fields available.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'cheat-balance-table';

        const head = document.createElement('thead');
        const headRow = document.createElement('tr');
        ['Variable', 'Value', 'Apply'].forEach((label) => {
            const th = document.createElement('th');
            th.innerText = label;
            headRow.appendChild(th);
        });
        head.appendChild(headRow);
        table.appendChild(head);

        const body = document.createElement('tbody');

        CHEAT_BALANCE_FIELD_SECTIONS.forEach((section) => {
            const validEntries = section.entries.filter((entry) => entry && entry.target && typeof entry.target === 'object' && typeof entry.key === 'string');
            if (!validEntries.length) return;

            const sectionRow = document.createElement('tr');
            sectionRow.className = 'section-row';
            const sectionCell = document.createElement('td');
            sectionCell.colSpan = 3;
            sectionCell.innerText = section.title;
            sectionRow.appendChild(sectionCell);
            body.appendChild(sectionRow);

            validEntries.forEach((entry) => {
                const row = document.createElement('tr');

                const labelCell = document.createElement('td');
                labelCell.innerText = entry.label;

                const valueCell = document.createElement('td');
                const input = document.createElement('input');
                input.type = 'number';
                input.step = String(entry.step ?? 0.01);
                if (Number.isFinite(entry.min)) input.min = String(entry.min);
                const currentValue = Number.isFinite(entry.target[entry.key]) ? entry.target[entry.key] : 0;
                input.value = String(currentValue);
                input.dataset.cheatKey = entry.key;
                input.dataset.cheatLabel = entry.label;
                valueCell.appendChild(input);

                const actionCell = document.createElement('td');
                const applyBtn = document.createElement('button');
                applyBtn.type = 'button';
                applyBtn.innerText = 'Set';
                applyBtn.addEventListener('click', () => {
                    if (applyEntryValue(entry, input.value)) {
                        normalizeBalanceSettings();
                        input.value = String(entry.target[entry.key]);
                        gameApi.updateUI();
                        saveGame();
                        addLog(`Cheat tune: ${entry.label} set to ${entry.target[entry.key]}.`);
                    }
                });
                actionCell.appendChild(applyBtn);

                row.appendChild(labelCell);
                row.appendChild(valueCell);
                row.appendChild(actionCell);
                body.appendChild(row);
            });
        });

        table.appendChild(body);
        container.innerHTML = '';
        container.appendChild(table);

        if (applyAllBtn) {
            applyAllBtn.addEventListener('click', () => {
                let changedCount = 0;
                bindings.forEach((entry) => {
                    const selector = `input[data-cheat-key="${entry.key}"][data-cheat-label="${entry.label}"]`;
                    const input = table.querySelector(selector);
                    if (!input) return;
                    if (applyEntryValue(entry, input.value)) {
                        changedCount += 1;
                        input.value = String(entry.target[entry.key]);
                    }
                });

                if (changedCount > 0) {
                    normalizeBalanceSettings();
                    gameApi.updateUI();
                    saveGame();
                    addLog(`Cheat tune: applied ${changedCount} balance value${changedCount === 1 ? '' : 's'}.`);
                }
            });
        }

        if (resetInputsBtn) {
            resetInputsBtn.addEventListener('click', () => {
                bindings.forEach((entry) => {
                    const selector = `input[data-cheat-key="${entry.key}"][data-cheat-label="${entry.label}"]`;
                    const input = table.querySelector(selector);
                    if (!input) return;
                    input.value = String(entry.target[entry.key]);
                });
            });
        }
    } catch (error) {
        console.error('Failed to build cheat balance editor:', error);
        container.innerHTML = '<p style="margin:6px;color:#c66;">Could not render balance controls. Check console for details.</p>';
    }
}

function applyEntryValue(entry, rawValue) {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return false;

    let normalized = parsed;
    if (Number.isFinite(entry.min)) normalized = Math.max(entry.min, normalized);
    entry.target[entry.key] = normalized;
    return true;
}

function normalizeBalanceSettings() {
    if (gameState.gathering.gatherFoodMinMultiplier > gameState.gathering.gatherFoodMaxMultiplier) {
        gameState.gathering.gatherFoodMaxMultiplier = gameState.gathering.gatherFoodMinMultiplier;
    }

    if (!game.exploration || typeof game.exploration !== 'object') {
        game.exploration = {};
    }

    if (!Number.isFinite(game.exploration.followerSendLimit) || game.exploration.followerSendLimit < 1) {
        game.exploration.followerSendLimit = 1;
    }
    game.exploration.followerSendLimit = Math.max(1, Math.floor(game.exploration.followerSendLimit));

    if (!Number.isFinite(gameState.progression.followers) || gameState.progression.followers < 0) {
        gameState.progression.followers = 0;
    }
    gameState.progression.followers = Math.floor(gameState.progression.followers);

    if (!Number.isFinite(game.shelter) || game.shelter < 0) {
        game.shelter = 0;
    }
    game.shelter = Math.floor(game.shelter);

    if (!Number.isFinite(gameState.costs.unlockExplorationFaithCost) || gameState.costs.unlockExplorationFaithCost < 0) {
        gameState.costs.unlockExplorationFaithCost = 0;
    }
}
