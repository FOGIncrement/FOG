import { gameState, game } from './classes/GameState.js';
import { setVisible, setAffordability, setButtonLabel, showTabs, hideTabs } from './utils/ui-helpers.js';
import { getMaxFollowers, getAssignedFollowers, getUnassignedFollowers, getRoleTrainingCost } from './utils/helpers.js';
import { ROLE_DEFINITIONS } from './config/roles.js';
import { ACTION_TAB_ORDER } from './config/actions.js';
import { getActionUiRules } from './config/action-rules.js';
import { buildingRegistry, actionRegistry } from './registries/index.js';

export function updateUI() {
    if (!Number.isFinite(gameState.progression.followers) || gameState.progression.followers < 1) {
        gameState.progression.followers = 1;
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

    if (followersEl) followersEl.innerText = `${gameState.progression.followers}/${getMaxFollowers()}`;
    if (faithEl) {
        const followerFaithRate = gameState.progression.followers * gameState.progression.faithPerFollower;
        const ritualistFaithRate = (gameState.progression.ritualists || 0) * gameState.rates.ritualistFaithPerSecond;
        const totalFaithRate = followerFaithRate + ritualistFaithRate;
        faithEl.innerText = `${gameState.progression.faith.toFixed(2)} (+${totalFaithRate.toFixed(3)}/s)`;
    }

    if (woodRateEl) {
        const woodRate = (gameState.progression.gatherers || 0) * gameState.rates.gathererWoodPerSecond;
        woodRateEl.innerText = `(+${woodRate.toFixed(3)}/s)`;
    }

    if (stoneRateEl) {
        const stoneRate = (gameState.progression.gatherers || 0) * gameState.rates.gathererStonePerSecond;
        stoneRateEl.innerText = `(+${stoneRate.toFixed(3)}/s)`;
    }

    if (hunterContainer && hunterValue) {
        const hunterCount = gameState.progression.hunters || 0;
        hunterValue.innerText = hunterCount;
        hunterContainer.style.display = hunterCount > 0 ? 'block' : 'none';
        if (hunterBonus) {
            const totalFoodRate = hunterCount * gameState.rates.hunterFoodPerSecond;
            hunterBonus.innerText = `(+${totalFoodRate.toFixed(2)} food/s)`;
        }
    }
    if (ritualistContainer && ritualistValue) {
        const ritualistCount = gameState.progression.ritualists || 0;
        ritualistValue.innerText = ritualistCount;
        ritualistContainer.style.display = ritualistCount > 0 ? 'block' : 'none';
        if (ritualistBonus) {
            const totalFaithRate = ritualistCount * gameState.rates.ritualistFaithPerSecond;
            ritualistBonus.innerText = `(+${totalFaithRate.toFixed(2)} faith/s)`;
        }
    }
    if (gathererContainer && gathererValue) {
        const gathererCount = gameState.progression.gatherers || 0;
        gathererValue.innerText = gathererCount;
        gathererContainer.style.display = gathererCount > 0 ? 'block' : 'none';
        if (gathererBonus) {
            const woodRate = gathererCount * gameState.rates.gathererWoodPerSecond;
            const stoneRate = gathererCount * gameState.rates.gathererStonePerSecond;
            gathererBonus.innerText = `(+${woodRate.toFixed(2)} wood/s, +${stoneRate.toFixed(2)} stone/s)`;
        }
    }
    if (cookContainer && cookValue) {
        const cookCount = gameState.progression.cooks || 0;
        cookValue.innerText = cookCount;
        cookContainer.style.display = cookCount > 0 ? 'block' : 'none';
        if (cookBonus) {
            const drainReductionPct = Math.min(50, cookCount * gameState.rates.cookHungerDrainReductionPerCook * 100);
            const flatGain = cookCount * gameState.rates.cookFlatHungerGainPerSecond;
            cookBonus.innerText = `(+${flatGain.toFixed(2)} hunger/s, -${drainReductionPct.toFixed(0)}% drain)`;
        }
    }

    ['wood', 'stone', 'food'].forEach((type) => {
        const container = document.getElementById(type + 'Container');
        const value = document.getElementById(type + 'Value');
        if (!container || !value) return;

        value.innerText = gameState.resources[type].amount.toFixed(2);
        if (type === 'food') {
            const rateEl = document.getElementById('foodRate');
            if (rateEl) {
                const hunterRate = gameState.progression.hunters * gameState.rates.hunterFoodPerSecond;
                const autoFeedCost = (game.hungerVisible && game.hungerPercent < 100)
                    ? Math.min(game.autoFeedFoodPerSecond, gameState.resources.food.amount)
                    : 0;
                const netFoodRate = hunterRate - autoFeedCost;
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

        const drain = gameState.progression.followers * game.followerHungerDrain;
        const autoFeeding = game.hungerVisible && gameState.resources.food.amount > 0 && game.hungerPercent < 100;
        const autoFeedAmount = autoFeeding ? Math.min(game.autoFeedFoodPerSecond, gameState.resources.food.amount) : 0;
        const cookFlatGain = (gameState.progression.cooks || 0) * gameState.rates.cookFlatHungerGainPerSecond;
        const cookBonusMultiplier = 1 + (gameState.progression.cooks || 0) * gameState.rates.cookHungerGainBonusPerCook;
        const netRate = autoFeeding
            ? ((autoFeedAmount * game.foodHungerGain * cookBonusMultiplier) + cookFlatGain - drain)
            : (cookFlatGain - drain);
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
        if (roleValueEl) roleValueEl.innerText = `${gameState.progression[role.id] || 0}`;
    });

    updateButtons();
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

    const followerManagerHeader = document.querySelector('.tab-btn[data-tab="followerManager"]');
    if (followerManagerHeader) {
        followerManagerHeader.style.display = tabHeaderVisibility.followerManager ? 'inline-block' : 'none';
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
