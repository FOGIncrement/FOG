import { gameState, game } from './classes/GameState.js';
import { setVisible, setAffordability, setButtonLabel, showTabs, hideTabs } from './utils/ui-helpers.js';
import { getMaxFollowers, getAssignedFollowers, getUnassignedFollowers, getRoleTrainingCost, getRoleCount, getShelterBuildCosts } from './utils/helpers.js';
import { ROLE_DEFINITIONS } from './config/roles.js';
import { ACTION_TAB_ORDER } from './config/action-definitions.js';
import { getActionUiRules } from './config/action-rules.js';
import { buildingRegistry, actionRegistry } from './registries/index.js';

function getExplorationCapacityRequirement() {
    return Number.isFinite(game.prophetUnlockCapacityRequirement)
        ? Math.floor(game.prophetUnlockCapacityRequirement)
        : 150;
}

function hasExplorationSystemAccess() {
    return getMaxFollowers() >= getExplorationCapacityRequirement() && Boolean(game.explorationUnlocked);
}

export function updateUI() {
    if (!Number.isFinite(gameState.progression.followers) || gameState.progression.followers < 0) {
        gameState.progression.followers = 0;
    }

    const followersEl = document.getElementById('followers');
    const faithEl = document.getElementById('faith');
    const woodRateEl = document.getElementById('woodRate');
    const stoneRateEl = document.getElementById('stoneRate');
    const hunterContainer = document.getElementById('hunterContainer');
    const hunterValue = document.getElementById('hunterValue');
    const hunterBonus = document.getElementById('hunterBonus');
    const ritualistContainer = document.getElementById('ritualistContainer');
    const ritualistValue = document.getElementById('ritualistValue');
    const ritualistBonus = document.getElementById('ritualistBonus');
    const gathererContainer = document.getElementById('gathererContainer');
    const gathererValue = document.getElementById('gathererValue');
    const gathererBonus = document.getElementById('gathererBonus');
    const cookContainer = document.getElementById('cookContainer');
    const cookValue = document.getElementById('cookValue');
    const cookBonus = document.getElementById('cookBonus');
    const prophetContainer = document.getElementById('prophetContainer');
    const prophetValue = document.getElementById('prophetValue');

    if (followersEl) followersEl.innerText = `${gameState.progression.followers}/${getMaxFollowers()}`;
    if (faithEl) {
        const followerFaithRate = gameState.progression.followers * gameState.progression.faithPerFollower;
        const ritualistFaithRate = getRoleCount('ritualists') * gameState.rates.ritualistFaithPerSecond;
        const totalFaithRate = followerFaithRate + ritualistFaithRate;
        faithEl.innerText = `${gameState.progression.faith.toFixed(2)} (+${totalFaithRate.toFixed(3)}/s)`;
    }

    if (woodRateEl) {
        const woodRate = getRoleCount('gatherers') * gameState.rates.gathererWoodPerSecond;
        woodRateEl.innerText = `(+${woodRate.toFixed(3)}/s)`;
    }

    if (stoneRateEl) {
        const stoneRate = getRoleCount('gatherers') * gameState.rates.gathererStonePerSecond;
        stoneRateEl.innerText = `(+${stoneRate.toFixed(3)}/s)`;
    }

    if (hunterContainer && hunterValue) {
        const hunterCount = getRoleCount('hunters');
        hunterValue.innerText = hunterCount;
        hunterContainer.style.display = hunterCount > 0 ? 'block' : 'none';
        if (hunterBonus) {
            const totalFoodRate = hunterCount * gameState.rates.hunterFoodPerSecond;
            hunterBonus.innerText = `(+${totalFoodRate.toFixed(2)} food/s)`;
        }
    }
    if (ritualistContainer && ritualistValue) {
        const ritualistCount = getRoleCount('ritualists');
        ritualistValue.innerText = ritualistCount;
        ritualistContainer.style.display = ritualistCount > 0 ? 'block' : 'none';
        if (ritualistBonus) {
            const totalFaithRate = ritualistCount * gameState.rates.ritualistFaithPerSecond;
            ritualistBonus.innerText = `(+${totalFaithRate.toFixed(2)} faith/s)`;
        }
    }
    if (gathererContainer && gathererValue) {
        const gathererCount = getRoleCount('gatherers');
        gathererValue.innerText = gathererCount;
        gathererContainer.style.display = gathererCount > 0 ? 'block' : 'none';
        if (gathererBonus) {
            const woodRate = gathererCount * gameState.rates.gathererWoodPerSecond;
            const stoneRate = gathererCount * gameState.rates.gathererStonePerSecond;
            gathererBonus.innerText = `(+${woodRate.toFixed(2)} wood/s, +${stoneRate.toFixed(2)} stone/s)`;
        }
    }
    if (cookContainer && cookValue) {
        const cookCount = getRoleCount('cooks');
        cookValue.innerText = cookCount;
        cookContainer.style.display = cookCount > 0 ? 'block' : 'none';
        if (cookBonus) {
            const drainReductionPct = Math.min(50, cookCount * gameState.rates.cookHungerDrainReductionPerCook * 100);
            const flatGain = cookCount * gameState.rates.cookFlatHungerGainPerSecond;
            cookBonus.innerText = `(+${flatGain.toFixed(2)} hunger/s, -${drainReductionPct.toFixed(0)}% drain)`;
        }
    }
    if (prophetContainer && prophetValue) {
        const prophetCount = getRoleCount('prophet');
        prophetValue.innerText = prophetCount;
        prophetContainer.style.display = prophetCount > 0 ? 'block' : 'none';
    }

    ['wood', 'stone', 'food'].forEach((type) => {
        const container = document.getElementById(type + 'Container');
        const value = document.getElementById(type + 'Value');
        if (!container || !value) return;

        value.innerText = gameState.resources[type].amount.toFixed(2);
        if (type === 'food') {
            const rateEl = document.getElementById('foodRate');
            if (rateEl) {
                const hunterRate = getRoleCount('hunters') * gameState.rates.hunterFoodPerSecond;
                const cookEfficiency = Math.min(0.5, getRoleCount('cooks') * gameState.rates.cookHungerDrainReductionPerCook);
                const sustainCost = game.hungerVisible
                    ? Math.min(gameState.progression.followers * game.followerHungerDrain * (1 - cookEfficiency), Math.max(0, gameState.resources.food.amount))
                    : 0;
                const remainingFoodForAutoFeed = Math.max(0, gameState.resources.food.amount - sustainCost);
                const autoFeedCost = (game.hungerVisible && game.hungerPercent < 100)
                    ? Math.min(game.autoFeedFoodPerSecond, remainingFoodForAutoFeed)
                    : 0;
                const netFoodRate = hunterRate - sustainCost - autoFeedCost;
                rateEl.innerText = netFoodRate >= 0
                    ? `(+${netFoodRate.toFixed(3)}/s)`
                    : `(${netFoodRate.toFixed(3)}/s)`;
            }
        }

        if (type === 'wood' || type === 'stone') {
            container.style.display = (game.ritualCircleBuilt >= 1 || gameState.resources[type].amount > 0) ? 'block' : 'none';
        } else if (type === 'food') {
            container.style.display = (game.shelter >= 1 || gameState.resources.food.amount > 0) ? 'block' : 'none';
        }
    });

    const hungerContainer = document.getElementById('hungerContainer');
    const hungerValue = document.getElementById('hungerValue');
    const hungerRate = document.getElementById('hungerRate');

    if (hungerContainer && hungerValue && hungerRate) {
        hungerContainer.style.display = game.hungerVisible ? 'block' : 'none';
        hungerValue.innerText = game.hungerPercent.toFixed(2) + '%';

        const cookEfficiency = Math.min(0.5, getRoleCount('cooks') * gameState.rates.cookHungerDrainReductionPerCook);
        const drain = gameState.progression.followers * game.followerHungerDrain * (1 - cookEfficiency);
        const sustainConsumption = Math.min(drain, Math.max(0, gameState.resources.food.amount));
        const starvationDrain = gameState.resources.food.amount > 0 ? 0 : drain;
        const autoFeeding = game.hungerVisible && game.hungerPercent < 100;
        const foodAfterSustain = Math.max(0, gameState.resources.food.amount - sustainConsumption);
        const autoFeedAmount = autoFeeding ? Math.min(game.autoFeedFoodPerSecond, foodAfterSustain) : 0;
        const cookFlatGain = getRoleCount('cooks') * gameState.rates.cookFlatHungerGainPerSecond;
        const cookBonusMultiplier = 1 + getRoleCount('cooks') * gameState.rates.cookHungerGainBonusPerCook;
        const netRate = autoFeeding
            ? ((autoFeedAmount * game.foodHungerGain * cookBonusMultiplier) + cookFlatGain - starvationDrain)
            : (cookFlatGain - starvationDrain);
        hungerRate.innerText = netRate >= 0 ? `(+${netRate.toFixed(2)}/s)` : `(${netRate.toFixed(2)}/s)`;
    }

    const trainedSummaryContainer = document.getElementById('trainedSummaryContainer');
    const trainedSummaryValue = document.getElementById('trainedSummaryValue');
    const unassignedFollowersValue = document.getElementById('unassignedFollowersValue');

    if (trainedSummaryContainer && trainedSummaryValue) {
        const assigned = getAssignedFollowers();
        trainedSummaryContainer.style.display = assigned > 0 ? 'block' : 'none';
        trainedSummaryValue.innerText = `${assigned}/${gameState.progression.followers} assigned`;
    }

    if (unassignedFollowersValue) unassignedFollowersValue.innerText = `${getUnassignedFollowers()}`;
    ROLE_DEFINITIONS.forEach((role) => {
        const roleValueEl = document.getElementById(role.roleValueId);
        if (roleValueEl) roleValueEl.innerText = `${getRoleCount(role.id)}`;
    });

    const explorationAccess = hasExplorationSystemAccess();
    renderExplorationPanel(explorationAccess);
    renderDiscoveredAreas(explorationAccess);

    updateButtons();
}

function renderExplorationPanel(hasExplorationAccess) {
    const panel = document.getElementById('tab-explore');
    if (panel) {
        panel.style.display = hasExplorationAccess ? panel.style.display : 'none';
    }

    if (!hasExplorationAccess) return;

    const exploration = game.exploration || {};
    const expedition = exploration.activeExpedition;

    const limit = Number.isFinite(exploration.followerSendLimit) ? Math.floor(exploration.followerSendLimit) : 10;
    const inputEl = document.getElementById('expeditionFollowersInput');
    const includeProphetEl = document.getElementById('includeProphetCheckbox');
    const expeditionStatusEl = document.getElementById('expeditionStatus');
    const metersEl = document.getElementById('exploredMetersValue');

    if (inputEl) {
        const maxValue = Math.max(1, Math.min(limit, gameState.progression.followers));
        inputEl.max = `${maxValue}`;
        if (!inputEl.value) inputEl.value = '1';
        const current = parseInt(inputEl.value, 10);
        if (!Number.isFinite(current) || current < 1) inputEl.value = '1';
        if (Number.isFinite(current) && current > maxValue) inputEl.value = `${maxValue}`;
    }

    if (includeProphetEl) {
        const hasProphet = getRoleCount('prophet') > 0;
        includeProphetEl.disabled = !hasProphet;
        if (!hasProphet) includeProphetEl.checked = false;
    }

    if (metersEl) {
        const explored = Number.isFinite(exploration.totalMetersExplored) ? Math.floor(exploration.totalMetersExplored) : 0;
        metersEl.innerText = `${explored}`;
    }

    if (expeditionStatusEl) {
        if (!expedition) {
            expeditionStatusEl.innerText = `No active expedition. Roll cost: ${Math.floor(gameState.costs.expeditionRollFaithCost || 50)} faith.`;
        } else {
            const targetVillage = (exploration.villages || []).find((village) => village.id === expedition.targetVillageId);
            const villageText = targetVillage
                ? `${targetVillage.name} at ${targetVillage.distanceFromCamp}m`
                : 'unknown destination';
            expeditionStatusEl.innerText = `Expedition active: ${expedition.followersAlive}/${expedition.followersSent} alive, distance ${Math.floor(expedition.distanceCovered)}m, target ${villageText}.`;
        }
    }
}

function renderDiscoveredAreas(hasExplorationAccess) {
    const container = document.getElementById('discoveredAreasList');
    const sidebar = document.getElementById('discoveredSidebar');
    if (!container || !sidebar) return;

    if (!hasExplorationAccess) {
        sidebar.style.display = 'none';
        return;
    }

    const exploration = game.exploration || {};
    const villages = Array.isArray(exploration.villages)
        ? exploration.villages.filter((village) => village.discovered)
        : [];
    const wildAreas = Array.isArray(exploration.discoveredAreas) ? exploration.discoveredAreas : [];
    const hasDiscoveries = villages.length > 0 || wildAreas.length > 0;

    sidebar.style.display = hasDiscoveries ? 'block' : 'none';

    if (!hasDiscoveries) {
        container.innerHTML = '<p class="area-empty">No discovered areas yet.</p>';
        return;
    }

    const villageCards = villages
        .map((village) => {
            const converted = Number.isFinite(village.convertedPercent) ? Math.floor(village.convertedPercent) : 0;
            const resistance = Number.isFinite(village.resistance) ? village.resistance : 0;
            const sermonsHeld = Number.isFinite(village.sermonsHeld) ? village.sermonsHeld : 0;
            const prophetStatus = village.prophetPresent ? 'Present' : 'Not present';
            return `
                <div class="area-card village-card">
                    <h4>${village.name}</h4>
                    <p>Distance: ${Math.floor(village.distanceFromCamp)}m</p>
                    <p>Population: ${Math.floor(village.population).toLocaleString()}</p>
                    <p>Resistance: ${resistance}</p>
                    <p>Converted: ${converted}%</p>
                    <p>Sermons Held: ${sermonsHeld}</p>
                    <p>Prophet: ${prophetStatus}</p>
                    <button class="village-sermon-btn" data-village-id="${village.id}" ${converted >= 100 || !village.prophetPresent ? 'disabled' : ''}>Hold Sermon</button>
                </div>
            `;
        })
        .join('');

    const areaCards = wildAreas
        .map((area) => {
            const discoveredAt = Number.isFinite(area.discoveredAtMeters) ? Math.floor(area.discoveredAtMeters) : 0;
            return `
                <div class="area-card">
                    <h4>${area.name}</h4>
                    <p>Discovered around ${discoveredAt}m from camp.</p>
                </div>
            `;
        })
        .join('');

    container.innerHTML = `${villageCards}${areaCards}`;
}

function updateButtons() {
    const ritualDefinition = buildingRegistry.get('ritualCircle');
    const shelterDefinition = buildingRegistry.get('shelter');

    if (!ritualDefinition || !shelterDefinition) return;

    const actionUiRules = getActionUiRules({
        gameState,
        game,
        ritualDefinition,
        shelterDefinition,
        getMaxFollowers,
        getShelterBuildCosts,
        getRoleTrainingCost,
        setVisible,
        setAffordability,
        setButtonLabel
    });

    ACTION_TAB_ORDER.forEach((tab) => {
        actionRegistry.getByTab(tab).forEach((actionDefinition) => {
            const applyRule = actionUiRules[actionDefinition.id];
            if (typeof applyRule !== 'function') return;

            const el = document.getElementById(actionDefinition.buttonId);
            if (!el) return;

            applyRule(el);
        });
    });

    const bRit = document.getElementById(ritualDefinition.buttonId);
    const trainCountInput = document.getElementById('trainCountInput');

    const tabsShouldBeVisible = actionUiRules.shouldShowTabs(bRit);
    if (tabsShouldBeVisible) showTabs(); else hideTabs();

    const tabHeaderVisibility = actionUiRules.getTabHeaderVisibility(ROLE_DEFINITIONS);

    const unlocksHeader = document.querySelector('.tab-btn[data-tab="unlocks"]');
    if (unlocksHeader) {
        unlocksHeader.style.display = tabHeaderVisibility.unlocks ? 'inline-block' : 'none';
    }

    const foodHeader = document.querySelector('.tab-btn[data-tab="food"]');
    if (foodHeader) {
        foodHeader.style.display = tabHeaderVisibility.food ? 'inline-block' : 'none';
    }

    const exploreHeader = document.querySelector('.tab-btn[data-tab="explore"]');
    if (exploreHeader) {
        exploreHeader.style.display = tabHeaderVisibility.explore ? 'inline-block' : 'none';
    }

    const discoveredHeader = document.querySelector('.tab-btn[data-tab="discovered"]');
    if (discoveredHeader) {
        discoveredHeader.style.display = tabHeaderVisibility.discovered ? 'inline-block' : 'none';
    }

    const followerManagerHeader = document.querySelector('.tab-btn[data-tab="followerManager"]');
    if (followerManagerHeader) {
        followerManagerHeader.style.display = tabHeaderVisibility.followerManager ? 'inline-block' : 'none';
    }

    const activeTabHeader = document.querySelector('.tab-btn.active');
    if (activeTabHeader instanceof HTMLElement && activeTabHeader.style.display === 'none') {
        const actionsHeader = document.querySelector('.tab-btn[data-tab="actions"]');
        if (actionsHeader instanceof HTMLElement) {
            actionsHeader.click();
        }
    }

    ROLE_DEFINITIONS.forEach((roleDefinition) => {
        const unlockButton = document.getElementById(roleDefinition.unlockButtonId);
        if (!unlockButton) return;
        actionUiRules.applyUnlockRoleButton(unlockButton, roleDefinition);
    });

    const hasAnyRoleUnlocked = actionUiRules.hasAnyRoleUnlocked(ROLE_DEFINITIONS);
    if (trainCountInput) trainCountInput.style.display = hasAnyRoleUnlocked ? 'inline-block' : 'none';

    const untrained = getUnassignedFollowers();
    ROLE_DEFINITIONS.forEach((roleDefinition) => {
        const trainButton = document.getElementById(roleDefinition.trainButtonId);
        if (!trainButton) return;
        actionUiRules.applyTrainRoleButton(trainButton, roleDefinition, untrained);
    });
}
