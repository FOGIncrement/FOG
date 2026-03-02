import { gameState, game } from './classes/GameState.js';
import { setVisible, setAffordability, setButtonLabel, showTabs, hideTabs } from './utils/ui-helpers.js';
import { getMaxFollowers, getAssignedFollowers, getUnassignedFollowers, getRoleTrainingCost } from './utils/helpers.js';

export function updateUI() {
    if (!Number.isFinite(gameState.progression.followers) || gameState.progression.followers < 1) {
        gameState.progression.followers = 1;
    }

    const followersEl = document.getElementById('followers');
    const faithEl = document.getElementById('faith');
    const hunterContainer = document.getElementById('hunterContainer');
    const hunterValue = document.getElementById('hunterValue');
    const hunterBonus = document.getElementById('hunterBonus');
    const ritualistContainer = document.getElementById('ritualistContainer');
    const ritualistValue = document.getElementById('ritualistValue');
    const builderContainer = document.getElementById('builderContainer');
    const builderValue = document.getElementById('builderValue');
    const cookContainer = document.getElementById('cookContainer');
    const cookValue = document.getElementById('cookValue');
    const cookBonus = document.getElementById('cookBonus');

    if (followersEl) followersEl.innerText = `${gameState.progression.followers}/${getMaxFollowers()}`;
    if (faithEl) {
        faithEl.innerText = `${gameState.progression.faith.toFixed(2)} (+${(gameState.progression.followers * gameState.progression.faithPerFollower).toFixed(3)}/s)`;
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
        ritualistValue.innerText = gameState.progression.ritualists || 0;
        ritualistContainer.style.display = (gameState.progression.ritualists || 0) > 0 ? 'block' : 'none';
    }
    if (builderContainer && builderValue) {
        builderValue.innerText = gameState.progression.builders || 0;
        builderContainer.style.display = (gameState.progression.builders || 0) > 0 ? 'block' : 'none';
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
    const huntersRoleValue = document.getElementById('huntersRoleValue');
    const ritualistsRoleValue = document.getElementById('ritualistsRoleValue');
    const buildersRoleValue = document.getElementById('buildersRoleValue');
    const cooksRoleValue = document.getElementById('cooksRoleValue');

    if (trainedSummaryContainer && trainedSummaryValue) {
        const assigned = getAssignedFollowers();
        trainedSummaryContainer.style.display = assigned > 0 ? 'block' : 'none';
        trainedSummaryValue.innerText = `${assigned}/${gameState.progression.followers} assigned`;
    }

    if (unassignedFollowersValue) unassignedFollowersValue.innerText = `${getUnassignedFollowers()}`;
    if (huntersRoleValue) huntersRoleValue.innerText = `${gameState.progression.hunters || 0}`;
    if (ritualistsRoleValue) ritualistsRoleValue.innerText = `${gameState.progression.ritualists || 0}`;
    if (buildersRoleValue) buildersRoleValue.innerText = `${gameState.progression.builders || 0}`;
    if (cooksRoleValue) cooksRoleValue.innerText = `${gameState.progression.cooks || 0}`;

    updateButtons();
}

function updateButtons() {
    const bRit = document.getElementById('buildRitualCircleBtn');
    const gW = document.getElementById('gatherWoodBtn');
    const gS = document.getElementById('gatherStoneBtn');
    const gF = document.getElementById('gatherFoodBtn');
    const bS = document.getElementById('buildShelterBtn');
    const pBtn = document.getElementById('preachBtn');
    const trainingTechBtn = document.getElementById('trainingTechBtn');
    const trainHuntersBtn = document.getElementById('trainHuntersBtn');
    const trainRitualistsBtn = document.getElementById('trainRitualistsBtn');
    const trainBuildersBtn = document.getElementById('trainBuildersBtn');
    const trainCooksBtn = document.getElementById('trainCooksBtn');
    const unlockHuntersBtn = document.getElementById('unlockHuntersBtn');
    const unlockRitualistsBtn = document.getElementById('unlockRitualistsBtn');
    const unlockBuildersBtn = document.getElementById('unlockBuildersBtn');
    const unlockCooksBtn = document.getElementById('unlockCooksBtn');
    const feedBtn = document.getElementById('feedFollowersBtn');
    const prayBtn = document.getElementById('prayBtn');
    const convBtn = document.getElementById('convertBtn');
    const expBtn = document.getElementById('exploreBtn');
    const trainCountInput = document.getElementById('trainCountInput');

    if (prayBtn) prayBtn.title = `Gain ${game.prayAmt} faith`;
    if (convBtn) convBtn.title = `Cost ${game.convertCost} faith`;
    if (expBtn) expBtn.title = 'No cost';

    if (bRit) {
        if (gameState.progression.faith >= gameState.costs.ritualBtnCost && bRit.dataset.unlocked !== 'true') {
            bRit.dataset.unlocked = 'true';
        }

        const unlocked = game.ritualCircleBuilt >= 1 || bRit.dataset.unlocked === 'true';
        setVisible(bRit, unlocked);

        const canAffordRit = gameState.progression.faith >= gameState.costs.ritualBtnCost;
        setAffordability(bRit, canAffordRit);
        if (game.ritualCircleBuilt >= 1) bRit.disabled = true;

        setButtonLabel(bRit, `Ritual Circle ${game.ritualCircleBuilt}/1`);
        bRit.title = `Cost ${gameState.costs.ritualBtnCost} faith`;
    }

    const tabsShouldBeVisible = bRit && (bRit.dataset.unlocked === 'true' || game.ritualCircleBuilt >= 1);
    if (tabsShouldBeVisible) showTabs(); else hideTabs();

    const unlocksHeader = document.querySelector('.tab-btn[data-tab="unlocks"]');
    if (unlocksHeader) {
        unlocksHeader.style.display = game.unlocksTabUnlocked ? 'inline-block' : 'none';
    }

    const foodHeader = document.querySelector('.tab-btn[data-tab="food"]');
    if (foodHeader) {
        foodHeader.style.display = game.hasGatheredFood ? 'inline-block' : 'none';
    }

    const followerManagerHeader = document.querySelector('.tab-btn[data-tab="followerManager"]');
    if (followerManagerHeader) {
        const shouldShow = game.roleUnlocks.hunters || game.roleUnlocks.ritualists || game.roleUnlocks.builders || game.roleUnlocks.cooks;
        followerManagerHeader.style.display = shouldShow ? 'inline-block' : 'none';
    }

    const unlockConfig = [
        { el: unlockHuntersBtn, key: 'hunters', cost: gameState.costs.unlockHuntersFaithCost, label: 'Unlock Hunters' },
        { el: unlockRitualistsBtn, key: 'ritualists', cost: gameState.costs.unlockRitualistsFaithCost, label: 'Unlock Ritualists' },
        { el: unlockBuildersBtn, key: 'builders', cost: gameState.costs.unlockBuildersFaithCost, label: 'Unlock Builders' },
        { el: unlockCooksBtn, key: 'cooks', cost: gameState.costs.unlockCooksFaithCost, label: 'Unlock Cooks' }
    ];

    if (trainingTechBtn) {
        if (!game.unlocksTabUnlocked) {
            setVisible(trainingTechBtn, false);
        } else {
            setVisible(trainingTechBtn, true);
            if (game.trainingUnlocked) {
                trainingTechBtn.disabled = true;
                setButtonLabel(trainingTechBtn, 'Training Unlocked');
                trainingTechBtn.classList.add('purchased');
                trainingTechBtn.title = 'Already purchased';
            } else {
                const canAffordTraining = gameState.progression.faith >= gameState.costs.trainingTechCost;
                setAffordability(trainingTechBtn, canAffordTraining);
                setButtonLabel(trainingTechBtn, 'Unlock Training');
                trainingTechBtn.classList.toggle('purchased', !canAffordTraining);
                trainingTechBtn.title = `Cost ${gameState.costs.trainingTechCost} faith`;
            }
        }
    }

    unlockConfig.forEach(({ el, key, cost, label }) => {
        if (!el) return;
        if (!game.unlocksTabUnlocked || !game.trainingUnlocked) {
            setVisible(el, false);
            return;
        }

        setVisible(el, true);
        if (game.roleUnlocks[key]) {
            el.disabled = true;
            setButtonLabel(el, `${label} (Unlocked)`);
            el.classList.add('purchased');
            el.title = 'Already unlocked';
        } else {
            const canAfford = gameState.progression.faith >= cost;
            setAffordability(el, canAfford);
            setButtonLabel(el, label);
            el.classList.toggle('purchased', !canAfford);
            el.title = `Cost ${cost} faith`;
        }
    });

    if (gW && gS) {
        const unlocked = game.ritualCircleBuilt >= 1;
        if (unlocked) {
            setVisible(gW, true);
            setVisible(gS, true);
            const canAffordWood = gameState.progression.faith >= gameState.resources.wood.gatherCost;
            const canAffordStone = gameState.progression.faith >= gameState.resources.stone.gatherCost;
            setAffordability(gW, canAffordWood);
            setAffordability(gS, canAffordStone);
            gW.classList.toggle('purchased', !canAffordWood);
            gS.classList.toggle('purchased', !canAffordStone);
        } else {
            setVisible(gW, false);
            setVisible(gS, false);
            gW.dataset.affordable = 'false';
            gS.dataset.affordable = 'false';
            gW.classList.remove('purchased');
            gS.classList.remove('purchased');
        }
        gW.title = `Cost ${gameState.resources.wood.gatherCost} faith`;
        gS.title = `Cost ${gameState.resources.stone.gatherCost} faith`;
    }

    if (gF) {
        if (game.ritualCircleBuilt >= 1 && (game.shelter >= 1 || gF.dataset.unlocked === 'true')) {
            setVisible(gF, true);
            const canAffordFood = gameState.progression.faith >= gameState.resources.food.gatherCost;
            setAffordability(gF, canAffordFood);
            gF.title = `Cost ${gameState.resources.food.gatherCost} faith`;
            gF.dataset.unlocked = 'true';
        } else {
            setVisible(gF, false);
        }
    }

    if (bS) {
        if (
            !game.shelterBtnUnlocked &&
            gameState.resources.wood.amount >= gameState.costs.shelterWoodCost &&
            gameState.resources.stone.amount >= gameState.costs.shelterStoneCost
        ) {
            game.shelterBtnUnlocked = true;
        }

        if (game.shelterBtnUnlocked) {
            setVisible(bS, true);
            const canAffordShelter =
                gameState.resources.wood.amount >= gameState.costs.shelterWoodCost &&
                gameState.resources.stone.amount >= gameState.costs.shelterStoneCost;
            setAffordability(bS, canAffordShelter);
            setButtonLabel(bS, `Build shelter (${gameState.costs.shelterWoodCost}/${gameState.costs.shelterStoneCost})`);
            bS.classList.toggle('purchased', !canAffordShelter);
            bS.title = `Cost ${gameState.costs.shelterWoodCost} wood and ${gameState.costs.shelterStoneCost} stone`;
        } else {
            setVisible(bS, false);
        }
    }

    if (pBtn) {
        const max = getMaxFollowers();
        if (max >= 3) {
            setVisible(pBtn, true);
            const canAffordPreach =
                gameState.progression.faith >= gameState.costs.preachFaithCost &&
                game.hungerPercent >= 10 &&
                gameState.resources.food.amount >= 10 &&
                gameState.progression.followers < max;
            setAffordability(pBtn, canAffordPreach);
            pBtn.classList.toggle('purchased', !canAffordPreach);
            pBtn.title = `Cost ${gameState.costs.preachFaithCost} faith, 10% hunger, 10 food. Rolls 1d4 followers (requires space).`;
        } else {
            setVisible(pBtn, false);
        }
    }

    if (feedBtn) {
        if (game.ritualCircleBuilt >= 1) {
            setVisible(feedBtn, true);
            const canAffordFeed = gameState.resources.food.amount > 0;
            setAffordability(feedBtn, canAffordFeed);
            feedBtn.classList.toggle('purchased', !canAffordFeed);
            feedBtn.title = `Consume 1 food to gain ${game.feedAmount} hunger`;
        } else {
            setVisible(feedBtn, false);
        }
    }

    const hasAnyRoleUnlocked = game.roleUnlocks.hunters || game.roleUnlocks.ritualists || game.roleUnlocks.builders || game.roleUnlocks.cooks;
    if (trainCountInput) trainCountInput.style.display = hasAnyRoleUnlocked ? 'inline-block' : 'none';

    const trainingButtons = [
        { btn: trainHuntersBtn, key: 'hunters', label: 'Hunters', baseCost: gameState.costs.hunterBaseCost },
        { btn: trainRitualistsBtn, key: 'ritualists', label: 'Ritualists', baseCost: gameState.costs.ritualistBaseCost },
        { btn: trainBuildersBtn, key: 'builders', label: 'Builders', baseCost: gameState.costs.builderBaseCost },
        { btn: trainCooksBtn, key: 'cooks', label: 'Cooks', baseCost: gameState.costs.cookBaseCost }
    ];

    const untrained = getUnassignedFollowers();
    trainingButtons.forEach(({ btn, key, label, baseCost }) => {
        if (!btn) return;
        if (!game.roleUnlocks[key]) {
            setVisible(btn, false);
            return;
        }

        setVisible(btn, true);

        if (untrained <= 0) {
            btn.disabled = true;
            setButtonLabel(btn, `Train ${label}`);
            btn.classList.add('purchased');
            btn.title = 'No untrained followers available';
            return;
        }

        const cost = getRoleTrainingCost(baseCost);
        const canAfford = gameState.progression.faith >= cost;
        setAffordability(btn, canAfford);
        setButtonLabel(btn, `Train ${label}`);
        btn.classList.toggle('purchased', !canAfford);
        btn.title = `Cost ${cost} faith`;
    });
}
