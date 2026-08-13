import { gameState, game } from './classes/GameState.js';
import { setVisible, setAffordability, setButtonLabel, showTabs, hideTabs } from './utils/ui-helpers.js';
import { getMaxFollowers, getAssignedFollowers, getUnassignedFollowers, getRoleTrainingCost, getRoleCount, getShelterBuildCosts, getNextGoal, getFollowerFoodConsumptionMultiplier, getHungerStarvationDrainMultiplier, getConquerVillageFaithCost, getExpeditionRollFaithCost } from './utils/helpers.js';
import { ROLE_DEFINITIONS, getRoleOutputMultiplier } from './config/roles.js';
import { FACTION_DEFINITIONS } from './config/factions.js';
import { ACTION_TAB_ORDER } from './config/action-definitions.js';
import { getActionUiRules } from './config/action-rules.js';
import { buildingRegistry, actionRegistry } from './registries/index.js';
import { setTooltipContent } from './utils/tooltip.js';

function getExplorationCapacityRequirement() {
    return Number.isFinite(game.prophetUnlockCapacityRequirement)
        ? Math.floor(game.prophetUnlockCapacityRequirement)
        : 150;
}

function hasExplorationSystemAccess() {
    return getMaxFollowers() >= getExplorationCapacityRequirement() && Boolean(game.explorationUnlocked);
}

function describeAlignment(value) {
    if (!Number.isFinite(value)) return 'Neutral';
    if (value > 10) return 'Good';
    if (value < -10) return 'Evil';
    return 'Neutral';
}

function applyRateClass(el, value) {
    if (!el) return;
    el.classList.toggle('rate-positive', value > 0);
    el.classList.toggle('rate-negative', value < 0);
}

function getOutpostFaithRate() {
    const outpostFaithPerSecond = Number.isFinite(game.exploration?.villageOutpostFaithPerSecond)
        ? game.exploration.villageOutpostFaithPerSecond
        : 0.05;
    const outpostCount = Array.isArray(game.exploration?.villages)
        ? game.exploration.villages.reduce((count, village) => count + (village.resolutionType === 'converted' ? 1 : 0), 0)
        : 0;
    return outpostCount * outpostFaithPerSecond;
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

    if (followersEl) {
        const maxFollowers = getMaxFollowers();
        followersEl.innerText = `${gameState.progression.followers}/${maxFollowers}`;
        const perShelter = (game.shelterCapacityPerShelter || 3) * (game.shelterCapacityMultiplier || 1);
        setTooltipContent(
            followersEl,
            'Followers\nThe faithful you have converted or trained.',
            `Capacity: 1 base + ${game.shelter} shelter${game.shelter === 1 ? '' : 's'} × ${perShelter} = ${maxFollowers}\nUnassigned: ${getUnassignedFollowers()}`
        );
    }
    if (faithEl) {
        const followerFaithRate = gameState.progression.followers * gameState.progression.faithPerFollower;
        const ritualistFaithRate = getRoleCount('ritualists') * gameState.rates.ritualistFaithPerSecond;
        const outpostFaithRate = getOutpostFaithRate();
        const totalFaithRate = followerFaithRate + ritualistFaithRate + outpostFaithRate;
        faithEl.innerText = `${gameState.progression.faith.toFixed(2)} (+${totalFaithRate.toFixed(3)}/s)`;
        setTooltipContent(
            faithEl,
            'Faith\nSpent on nearly everything.',
            `Followers: +${followerFaithRate.toFixed(3)}/s\nRitualists: +${ritualistFaithRate.toFixed(3)}/s\nOutposts: +${outpostFaithRate.toFixed(3)}/s\nTotal: +${totalFaithRate.toFixed(3)}/s`
        );
    }

    if (woodRateEl) {
        const gathererCount = getRoleCount('gatherers');
        const perGatherer = gameState.rates.gathererWoodPerSecond;
        const woodRate = gathererCount * perGatherer;
        woodRateEl.innerText = `(+${woodRate.toFixed(3)}/s)`;
        applyRateClass(woodRateEl, woodRate);
        setTooltipContent(
            woodRateEl,
            'Wood Rate\nWood income per second.',
            `Gatherers: ${gathererCount}\nRate per gatherer: ${perGatherer.toFixed(3)}/s\nTotal: +${woodRate.toFixed(3)}/s`
        );
    }

    if (stoneRateEl) {
        const gathererCount = getRoleCount('gatherers');
        const perGatherer = gameState.rates.gathererStonePerSecond;
        const stoneRate = gathererCount * perGatherer;
        stoneRateEl.innerText = `(+${stoneRate.toFixed(3)}/s)`;
        applyRateClass(stoneRateEl, stoneRate);
        setTooltipContent(
            stoneRateEl,
            'Stone Rate\nStone income per second.',
            `Gatherers: ${gathererCount}\nRate per gatherer: ${perGatherer.toFixed(3)}/s\nTotal: +${stoneRate.toFixed(3)}/s`
        );
    }

    if (hunterContainer && hunterValue) {
        const hunterCount = getRoleCount('hunters');
        hunterValue.innerText = hunterCount;
        hunterContainer.style.display = hunterCount > 0 ? 'block' : 'none';
        if (hunterBonus) {
            const perHunter = gameState.rates.hunterFoodPerSecond;
            const totalFoodRate = hunterCount * perHunter * getRoleOutputMultiplier('hunters', game);
            hunterBonus.innerText = `(+${totalFoodRate.toFixed(2)} food/s)`;
            setTooltipContent(
                hunterBonus,
                'Hunter Output\nFood produced by hunters.',
                `Hunters: ${hunterCount}\nRate per hunter: ${perHunter.toFixed(3)} food/s\nTotal: +${totalFoodRate.toFixed(3)} food/s`
            );
        }
    }
    if (ritualistContainer && ritualistValue) {
        const ritualistCount = getRoleCount('ritualists');
        ritualistValue.innerText = ritualistCount;
        ritualistContainer.style.display = ritualistCount > 0 ? 'block' : 'none';
        if (ritualistBonus) {
            const perRitualist = gameState.rates.ritualistFaithPerSecond;
            const totalFaithRate = ritualistCount * perRitualist * getRoleOutputMultiplier('ritualists', game);
            ritualistBonus.innerText = `(+${totalFaithRate.toFixed(2)} faith/s)`;
            setTooltipContent(
                ritualistBonus,
                'Ritualist Output\nFaith generated by ritualists.',
                `Ritualists: ${ritualistCount}\nRate per ritualist: ${perRitualist.toFixed(3)} faith/s\nTotal: +${totalFaithRate.toFixed(3)} faith/s`
            );
        }
    }
    if (gathererContainer && gathererValue) {
        const gathererCount = getRoleCount('gatherers');
        gathererValue.innerText = gathererCount;
        gathererContainer.style.display = gathererCount > 0 ? 'block' : 'none';
        if (gathererBonus) {
            const woodPerGatherer = gameState.rates.gathererWoodPerSecond;
            const stonePerGatherer = gameState.rates.gathererStonePerSecond;
            const gathererOutputMultiplier = getRoleOutputMultiplier('gatherers', game);
            const woodRate = gathererCount * woodPerGatherer * gathererOutputMultiplier;
            const stoneRate = gathererCount * stonePerGatherer * gathererOutputMultiplier;
            gathererBonus.innerText = `(+${woodRate.toFixed(2)} wood/s, +${stoneRate.toFixed(2)} stone/s)`;
            setTooltipContent(
                gathererBonus,
                'Gatherer Output\nResource production by gatherers.',
                `Gatherers: ${gathererCount}\nWood per gatherer: ${woodPerGatherer.toFixed(3)}/s\nStone per gatherer: ${stonePerGatherer.toFixed(3)}/s\nTotal: +${woodRate.toFixed(3)} wood/s, +${stoneRate.toFixed(3)} stone/s`
            );
        }
    }
    if (cookContainer && cookValue) {
        const cookCount = getRoleCount('cooks');
        cookValue.innerText = cookCount;
        cookContainer.style.display = cookCount > 0 ? 'block' : 'none';
        if (cookBonus) {
            const drainReductionPct = Math.min(50, cookCount * gameState.rates.cookHungerDrainReductionPerCook * 100);
            const flatGain = cookCount * gameState.rates.cookFlatHungerGainPerSecond;
            const manualFeedMultiplier = 1 + (cookCount * gameState.rates.cookHungerGainBonusPerCook);
            const manualFeedGain = game.feedAmount * manualFeedMultiplier;
            cookBonus.innerText = `(+${flatGain.toFixed(2)} hunger/s, -${drainReductionPct.toFixed(0)}% drain)`;
            setTooltipContent(
                cookBonus,
                'Cook Effects\nCooks improve hunger recovery.',
                `Cooks: ${cookCount}\nPassive per cook: ${Number(gameState.rates.cookFlatHungerGainPerSecond).toFixed(3)} hunger/s\nPassive total: +${flatGain.toFixed(3)} hunger/s\nDrain reduction: ${drainReductionPct.toFixed(1)}%\nManual feed total: +${manualFeedGain.toFixed(3)} hunger/feed`
            );
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
                const hunterRate = getRoleCount('hunters') * gameState.rates.hunterFoodPerSecond * getRoleOutputMultiplier('hunters', game);
                const cookEfficiency = Math.min(0.5, getRoleCount('cooks') * gameState.rates.cookHungerDrainReductionPerCook);
                const sustainCost = game.hungerVisible
                    ? Math.min(gameState.progression.followers * game.followerFoodConsumptionPerSecond * getFollowerFoodConsumptionMultiplier() * (1 - cookEfficiency), Math.max(0, gameState.resources.food.amount))
                    : 0;
                const remainingFoodForAutoFeed = Math.max(0, gameState.resources.food.amount - sustainCost);
                const autoFeedCost = (game.hungerVisible && game.hungerPercent < 100)
                    ? Math.min(game.autoFeedFoodPerSecond, remainingFoodForAutoFeed)
                    : 0;
                const netFoodRate = hunterRate - sustainCost - autoFeedCost;
                rateEl.innerText = netFoodRate >= 0
                    ? `(+${netFoodRate.toFixed(3)}/s)`
                    : `(${netFoodRate.toFixed(3)}/s)`;
                applyRateClass(rateEl, netFoodRate);
                setTooltipContent(
                    rateEl,
                    'Food Rate\nNet food change per second.',
                    `Production: +${hunterRate.toFixed(3)}/s\nSustain consumption: -${sustainCost.toFixed(3)}/s\nAuto feed: -${autoFeedCost.toFixed(3)}/s\nNet: ${netFoodRate >= 0 ? '+' : ''}${netFoodRate.toFixed(3)}/s`
                );
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
        hungerValue.classList.toggle('hunger-critical', game.hungerPercent < 20);
        hungerValue.classList.toggle('hunger-weak', game.hungerPercent >= 20 && game.hungerPercent < 50);

        const cookEfficiency = Math.min(0.5, getRoleCount('cooks') * gameState.rates.cookHungerDrainReductionPerCook);
        const consumption = gameState.progression.followers * game.followerFoodConsumptionPerSecond * getFollowerFoodConsumptionMultiplier() * (1 - cookEfficiency);
        const sustainConsumption = Math.min(consumption, Math.max(0, gameState.resources.food.amount));
        const starvationDrain = gameState.resources.food.amount > 0 ? 0 : game.hungerStarvationDrainPerSecond * getHungerStarvationDrainMultiplier() * (1 - cookEfficiency);
        const autoFeeding = game.hungerVisible && game.hungerPercent < 100;
        const foodAfterSustain = Math.max(0, gameState.resources.food.amount - sustainConsumption);
        const autoFeedAmount = autoFeeding ? Math.min(game.autoFeedFoodPerSecond, foodAfterSustain) : 0;
        const cookFlatGain = getRoleCount('cooks') * gameState.rates.cookFlatHungerGainPerSecond;
        const cookBonusMultiplier = 1 + getRoleCount('cooks') * gameState.rates.cookHungerGainBonusPerCook;
        const netRate = autoFeeding
            ? ((autoFeedAmount * game.foodHungerGain * cookBonusMultiplier) + cookFlatGain - starvationDrain)
            : (cookFlatGain - starvationDrain);
        hungerRate.innerText = netRate >= 0 ? `(+${netRate.toFixed(2)}/s)` : `(${netRate.toFixed(2)}/s)`;
        applyRateClass(hungerRate, netRate);
        const timeToCrisisSeconds = starvationDrain > 0 ? Math.max(0, game.hungerPercent / starvationDrain) : null;
        const timeToCrisisLine = timeToCrisisSeconds != null ? `\nTime to crisis: ${timeToCrisisSeconds.toFixed(0)}s` : '';
        setTooltipContent(
            hungerRate,
            'Hunger Rate\nCurrent hunger percent change per second.',
            `Passive (cooks): +${cookFlatGain.toFixed(3)}/s\nAuto feed recovery: +${(autoFeedAmount * game.foodHungerGain * cookBonusMultiplier).toFixed(3)}/s\nStarvation drain: -${starvationDrain.toFixed(3)}/s\nNet: ${netRate >= 0 ? '+' : ''}${netRate.toFixed(3)}/s${timeToCrisisLine}`
        );
    }

    const nextGoalEl = document.getElementById('nextGoalHint');
    if (nextGoalEl) {
        const nextGoal = getNextGoal();
        nextGoalEl.style.display = nextGoal ? 'block' : 'none';
        nextGoalEl.innerText = nextGoal ? `Next: ${nextGoal.label} — ${nextGoal.detail}` : '';
    }

    const alignmentContainer = document.getElementById('alignmentContainer');
    const alignmentValue = document.getElementById('alignmentValue');
    if (alignmentContainer && alignmentValue) {
        alignmentContainer.style.display = game.alignmentVisible ? 'block' : 'none';
        alignmentValue.innerText = `${game.alignment.toFixed(0)} (${describeAlignment(game.alignment)})`;
    }

    const factionFavorContainer = document.getElementById('factionFavorContainer');
    if (factionFavorContainer) {
        factionFavorContainer.style.display = game.alignmentVisible ? 'block' : 'none';
    }
    FACTION_DEFINITIONS.forEach((faction) => {
        const el = document.getElementById(`${faction.id}FavorValue`);
        if (el) el.innerText = `${game.factionFavor[faction.id].toFixed(0)}`;
    });

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

function formatOfflineDuration(totalSeconds) {
    const totalMinutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function renderWelcomeBackModal(summary) {
    if (!summary) return;

    const modal = document.getElementById('welcomeBackModal');
    const durationEl = document.getElementById('welcomeBackDuration');
    const gainsEl = document.getElementById('welcomeBackGains');
    const hungerNoteEl = document.getElementById('welcomeBackHungerNote');
    if (!modal || !durationEl || !gainsEl || !hungerNoteEl) return;

    durationEl.innerText = `You were away for ${formatOfflineDuration(summary.offlineSeconds)}${summary.cappedByLimit ? ' (capped)' : ''}.`;

    const deltaLabels = { faith: 'Faith', followers: 'Followers', wood: 'Wood', stone: 'Stone', food: 'Food' };
    const gainLines = Object.keys(deltaLabels)
        .map((key) => {
            const delta = summary.deltas[key];
            if (!Number.isFinite(delta) || Math.abs(delta) < 0.01) return null;
            const sign = delta >= 0 ? '+' : '';
            const formatted = Number.isInteger(delta) ? delta : delta.toFixed(2);
            return `<p>${sign}${formatted} ${deltaLabels[key]}</p>`;
        })
        .filter(Boolean);
    gainsEl.innerHTML = gainLines.length ? gainLines.join('') : '<p>Nothing much happened.</p>';

    if (summary.hunger.wentCritical) {
        hungerNoteEl.style.display = 'block';
        hungerNoteEl.innerText = 'Your followers went hungry and grew weak while you were away.';
    } else if (summary.hunger.wentWeak) {
        hungerNoteEl.style.display = 'block';
        hungerNoteEl.innerText = 'Your followers went hungry while you were away.';
    } else {
        hungerNoteEl.style.display = 'none';
    }

    modal.style.display = 'flex';
}

function renderExplorationPanel(hasExplorationAccess) {
    // Tab visibility/switching is owned entirely by the tab system (initTabs()'s
    // activate() in main.js + getTabHeaderVisibility()'s header gating below) -
    // this function must only update the panel's contents, never its display
    // style, or it fights the tab switcher and the panel sticks visible on
    // every tab regardless of which one is active.
    if (!hasExplorationAccess) return;

    const exploration = game.exploration || {};
    const expedition = exploration.activeExpedition;

    const limit = Number.isFinite(exploration.followerSendLimit) ? Math.floor(exploration.followerSendLimit) : 10;
    const inputEl = document.getElementById('expeditionFollowersInput');
    const includeProphetEl = document.getElementById('includeProphetCheckbox');
    const expeditionStatusEl = document.getElementById('expeditionStatus');
    const metersEl = document.getElementById('exploredMetersValue');
    const partySizeLimitEl = document.getElementById('partySizeLimitValue');

    if (partySizeLimitEl) partySizeLimitEl.innerText = `${limit}`;

    if (inputEl) {
        const maxValue = Math.max(1, Math.min(limit, getUnassignedFollowers()));
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
            expeditionStatusEl.innerText = `No active expedition. Roll cost: ${getExpeditionRollFaithCost()} faith.`;
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
    if (!container) return;

    if (!hasExplorationAccess) return;

    const exploration = game.exploration || {};
    const villages = Array.isArray(exploration.villages)
        ? exploration.villages.filter((village) => village.discovered)
        : [];
    const wildAreas = Array.isArray(exploration.discoveredAreas)
        ? exploration.discoveredAreas.filter((area) => area.discovered)
        : [];
    const hasDiscoveries = villages.length > 0 || wildAreas.length > 0;

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
            const resolutionType = village.resolutionType || null;

            let statusLine;
            let actionsLine = '';
            if (resolutionType === 'converted') {
                const rate = Number.isFinite(game.exploration?.villageOutpostFaithPerSecond) ? game.exploration.villageOutpostFaithPerSecond : 0.05;
                statusLine = `<p class="village-resolved">Outpost — tithing +${rate.toFixed(3)} faith/s</p>`;
            } else if (resolutionType === 'conquered') {
                statusLine = `<p class="village-resolved">Ransacked — conquered</p>`;
            } else {
                statusLine = `<p>Converted: ${converted}%</p>`;
                const conquerCost = getConquerVillageFaithCost();
                actionsLine = `
                    <button class="village-sermon-btn" data-village-id="${village.id}" ${converted >= 100 || !village.prophetPresent ? 'disabled' : ''}>Hold Sermon</button>
                    <button class="village-conquer-btn" data-village-id="${village.id}">Conquer (${conquerCost} faith)</button>
                `;
            }

            return `
                <div class="area-card village-card">
                    <h4>${village.name}</h4>
                    <p>Distance: ${Math.floor(village.distanceFromCamp)}m</p>
                    <p>Population: ${Math.floor(village.population).toLocaleString()}</p>
                    <p>Resistance: ${resistance}</p>
                    ${statusLine}
                    <p>Sermons Held: ${sermonsHeld}</p>
                    <p>Prophet: ${prophetStatus}</p>
                    ${actionsLine}
                </div>
            `;
        })
        .join('');

    const areaCards = wildAreas
        .map((area) => {
            const discoveredAt = Number.isFinite(area.discoveredAtMeters) ? Math.floor(area.discoveredAtMeters) : Math.floor(area.distanceFromCamp || 0);
            const cache = area.resourceCache;
            const hasCache = Boolean(cache);
            const cacheCollected = Boolean(cache?.collected);
            const wood = Number.isFinite(cache?.wood) ? Math.floor(cache.wood) : 0;
            const stone = Number.isFinite(cache?.stone) ? Math.floor(cache.stone) : 0;

            let effectLine = '<p>Effect: none.</p>';
            if (area.passiveEffect?.type === 'faithPerFollowerBonus') {
                effectLine = `<p>Effect: +${Number(area.passiveEffect.amount || 0).toFixed(4)} faith/follower/s ${area.passiveEffect.applied ? '(active)' : ''}</p>`;
            } else if (area.passiveEffect?.type === 'hungerDrainPenalty') {
                effectLine = `<p>Effect: +${Number(area.passiveEffect.amount || 0).toFixed(4)} food consumption/follower/s ${area.passiveEffect.applied ? '(active)' : ''}</p>`;
            }

            return `
                <div class="area-card">
                    <h4>${area.name}</h4>
                    <p>Discovered around ${discoveredAt}m from camp.</p>
                    ${effectLine}
                    ${hasCache ? `<p>Cache: ${wood} wood, ${stone} stone ${cacheCollected ? '(collected)' : ''}</p>` : '<p>Cache: none</p>'}
                    ${hasCache && !cacheCollected ? `<button class="wild-area-collect-btn" data-area-id="${area.id}">Collect Resources</button>` : ''}
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
        getUnassignedFollowers,
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

    const followerManagerHeader = document.querySelector('.tab-btn[data-tab="followerManager"]');
    if (followerManagerHeader) {
        followerManagerHeader.style.display = tabHeaderVisibility.followerManager ? 'inline-block' : 'none';
    }

    const doctrinesHeader = document.querySelector('.tab-btn[data-tab="doctrines"]');
    if (doctrinesHeader) {
        doctrinesHeader.style.display = tabHeaderVisibility.doctrines ? 'inline-block' : 'none';
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

    applyUnlockItemVisibility();
}

function applyUnlockItemVisibility() {
    const showPurchased = Boolean(document.getElementById('showPurchasedUpgradesCheckbox')?.checked);
    document.querySelectorAll('#tab-unlocks .unlock-item').forEach((item) => {
        const btn = item.querySelector('button');
        const buttonVisible = Boolean(btn) && btn.style.display !== 'none';
        const isPurchased = item.dataset.purchased === 'true';
        item.style.display = (!buttonVisible || (isPurchased && !showPurchased)) ? 'none' : '';
    });
}
