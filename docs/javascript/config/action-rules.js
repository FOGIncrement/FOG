import { setTooltipContent } from '../utils/tooltip.js';
import { getUpgradeCost, getPreachFaithCost, getConvertFollowerCost, getExpeditionRollFaithCost, getExpeditionRollBonus, getTrainingUnlockFaithCost, getActiveWorld, canUnlockWorlds, getWorldExpeditionRollFaithCost, getWorldChartRequirement, getChartNewWorldCost, canAscendNow, getEchoesOfDivinityPreview, getUniverseConquestTier, getDomainsClaimed, getAscensionUpgradeRank, getStorehouseCost, getGranaryCost, getWoodStoneCap, getFoodCap, getNextSettlementTier, canAffordSettlementTier, getFavorTierCount, getNextFavorTierThreshold, getWatchtowerCost, getWatchtowerHazardAvoidChance, getBarracksCost, getBarracksConquerRollBonus, getWellCost, getWellConsumptionMultiplier, getMarketplaceCost, getMarketplaceTradeCost, getMarketplaceTradeFaithYield, getMonumentCost, getMonumentFaithPerFollowerMultiplier, canUnlockMonument, getManualActionYieldMultiplier, getHirePilgrimsCost, getCatechismHallCost, getGoodwillTricklePerSecond, getWarCampCost, getMaxWarbandSize } from '../utils/helpers.js';
import { DOCTRINE_GROUP_BY_ID } from './doctrines.js';
import { TEMPLE_OPTION_BY_GOD } from './temples.js';
import { ASCENSION_UPGRADE_BY_ID } from './ascension.js';
import { getNextUniverseConquestTier } from './universe-conquest.js';

function applyTooltip(el, summary, stats = '') {
    setTooltipContent(el, summary, stats);
}

function applyUnlockExtras(el, { isPurchased, description }) {
    const container = el.closest('.unlock-item');
    if (!container) return;
    container.dataset.purchased = isPurchased ? 'true' : 'false';
    const descEl = container.querySelector('.unlock-desc');
    if (descEl) descEl.textContent = description || '';
}

function applyRepeatableUpgradeButton(el, { purchases, maxPurchases, baseCost, label, summary, effectLine, gameState, setVisible, setAffordability, setButtonLabel, currencyAmount, currencyLabel }) {
    setVisible(el, true);

    const resolvedCurrencyAmount = Number.isFinite(currencyAmount) ? currencyAmount : gameState.progression.faith;
    const resolvedCurrencyLabel = currencyLabel || 'faith';

    if (purchases >= maxPurchases) {
        el.disabled = true;
        setButtonLabel(el, `${label} (Max)`);
        el.classList.add('purchased');
        applyTooltip(el, `${label}\n${summary}`, `Status: maxed out (${purchases}/${maxPurchases})\n${effectLine}`);
        return;
    }

    const cost = getUpgradeCost(baseCost, purchases);
    const canAfford = resolvedCurrencyAmount >= cost;
    setAffordability(el, canAfford);
    setButtonLabel(el, `${label} (${purchases}/${maxPurchases})`);
    el.classList.toggle('purchased', !canAfford);
    applyTooltip(el, `${label}\n${summary}`, `Cost: ${cost} ${resolvedCurrencyLabel}\nRank: ${purchases}/${maxPurchases}\n${effectLine}`);
}

function applyDoctrineOptionButton(el, { groupId, optionId, label, summary, effectLine, game, setVisible, setButtonLabel }) {
    if (!game.doctrinesUnlocked) {
        setVisible(el, false);
        return;
    }
    setVisible(el, true);
    el.classList.remove('doctrine-selected', 'doctrine-foreclosed');

    const chosen = game.doctrineChoices?.[groupId] || null;

    if (chosen === optionId) {
        el.disabled = true;
        setButtonLabel(el, `${label} (Chosen)`);
        el.classList.add('doctrine-selected');
        applyTooltip(el, `${label}\n${summary}`, `Status: chosen, permanent.\n${effectLine}`);
        applyUnlockExtras(el, { isPurchased: true, description: `${summary} Chosen — permanent.` });
        return;
    }

    if (chosen) {
        el.disabled = true;
        setButtonLabel(el, `${label} (Foreclosed)`);
        el.classList.add('doctrine-foreclosed');
        applyTooltip(el, `${label}\n${summary}`, 'Status: foreclosed. A different doctrine was chosen in this group.');
        applyUnlockExtras(el, { isPurchased: true, description: 'Foreclosed — a different doctrine was chosen in this group.' });
        return;
    }

    el.disabled = false;
    setButtonLabel(el, label);
    applyTooltip(el, `${label}\n${summary}`, `${effectLine}\nPermanent — forecloses the other option in this group.`);
    applyUnlockExtras(el, { isPurchased: false, description: `${summary} Permanent — the other option in this group will be foreclosed forever.` });
}

function applyTempleButton(el, { godId, label, summary, effectLine, game, gameState, setVisible, setButtonLabel, setAffordability }) {
    if (!game.doctrinesUnlocked) {
        setVisible(el, false);
        return;
    }

    const followerReq = Number.isFinite(game.templeFollowerRequirement) ? game.templeFollowerRequirement : 100;
    const alreadyBuilt = Boolean(game.temple?.built);
    if (!alreadyBuilt && gameState.progression.followers < followerReq) {
        setVisible(el, false);
        return;
    }

    setVisible(el, true);
    el.classList.remove('doctrine-selected', 'doctrine-foreclosed');

    if (alreadyBuilt && game.temple.godId === godId) {
        el.disabled = true;
        setButtonLabel(el, `${label} (Sealed)`);
        el.classList.add('doctrine-selected');
        applyTooltip(el, `${label}\n${summary}`, `Status: sealed, permanent.\n${effectLine}`);
        applyUnlockExtras(el, { isPurchased: true, description: `${summary} Your covenant is sealed.` });
        return;
    }

    if (alreadyBuilt) {
        el.disabled = true;
        setButtonLabel(el, `${label} (Foreclosed)`);
        el.classList.add('doctrine-foreclosed');
        applyTooltip(el, `${label}\n${summary}`, 'Status: foreclosed. Your covenant lies elsewhere.');
        applyUnlockExtras(el, { isPurchased: true, description: 'Foreclosed — a different Temple was built.' });
        return;
    }

    const favorReq = Number.isFinite(game.templeFavorRequirement) ? game.templeFavorRequirement : 200;
    const currentFavor = Number.isFinite(game.factionFavor?.[godId]) ? game.factionFavor[godId] : 0;
    const faithCost = Number.isFinite(gameState.costs.templeFaithCost) ? gameState.costs.templeFaithCost : 2000;
    const woodCost = Number.isFinite(gameState.costs.templeWoodCost) ? gameState.costs.templeWoodCost : 800;
    const stoneCost = Number.isFinite(gameState.costs.templeStoneCost) ? gameState.costs.templeStoneCost : 800;
    const hasFavor = currentFavor >= favorReq;
    const canAfford =
        hasFavor &&
        gameState.progression.faith >= faithCost &&
        gameState.resources.wood.amount >= woodCost &&
        gameState.resources.stone.amount >= stoneCost;

    setAffordability(el, canAfford);
    setButtonLabel(el, label);
    el.classList.toggle('purchased', !canAfford);
    const favorLine = hasFavor
        ? `Favor: ${Math.floor(currentFavor)}/${favorReq} (met)`
        : `Favor: ${Math.floor(currentFavor)}/${favorReq} (need more)`;
    applyTooltip(
        el,
        `${label}\n${summary}`,
        `${favorLine}\nCost: ${faithCost} faith, ${woodCost} wood, ${stoneCost} stone\n${effectLine}\nPermanent — only one Temple can ever be built.`
    );
    applyUnlockExtras(el, {
        isPurchased: false,
        description: `Requires ${favorReq} Favor with this god (have ${Math.floor(currentFavor)}) and ${followerReq} followers. Costs ${faithCost} faith, ${woodCost} wood, ${stoneCost} stone. ${effectLine}. Permanent — only one Temple can ever be built.`
    });
}

export function getActionUiRules(context) {
    const {
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
    } = context;

    const ritualLevel = game[ritualDefinition.levelKey];
    const ritualBuilt = ritualLevel >= ritualDefinition.maxLevel;
    const ritualCostKey = ritualDefinition.faithCostKey;

    const shelterLevel = game[shelterDefinition.levelKey];
    const preachBonus = Number.isFinite(game.diceBonuses?.preach) ? Math.trunc(game.diceBonuses.preach) : 0;
    const explorationCapacityRequirement = Number.isFinite(game.prophetUnlockCapacityRequirement)
        ? Math.floor(game.prophetUnlockCapacityRequirement)
        : 150;
    const hasExplorationCapacity = getMaxFollowers() >= explorationCapacityRequirement;
    const hasExplorationAccess = hasExplorationCapacity && Boolean(game.explorationUnlocked);

    return {
        pray(el) {
            const prayGain = (Number.isFinite(game.prayAmt) ? game.prayAmt : 1) * getManualActionYieldMultiplier();
            applyTooltip(el, 'Pray\nOffer devotion for divine favor.', `Gain ${prayGain} faith per click`);
        },
        convertFollower(el) {
            const cost = getConvertFollowerCost();
            const shepherdsCreedNote = game.doctrineChoices?.flock === 'shepherdsCreed' ? " (Shepherd's Creed discount applied)" : '';
            applyTooltip(el, 'Convert Follower\nSpend faith to convert one follower instantly.', `Cost: ${cost} faith${shepherdsCreedNote}\nOutput: +1 follower`);
        },
        offerToTheVeil(el) {
            if (!game.unlocksTabUnlocked) {
                setVisible(el, false);
                return;
            }
            setVisible(el, true);

            const followerCost = Number.isFinite(game.helOfferingFollowerCost) ? game.helOfferingFollowerCost : 3;
            const faithCost = Number.isFinite(gameState.costs.helOfferingFaithCost) ? gameState.costs.helOfferingFaithCost : 20;
            const refund = Number.isFinite(game.helOfferingFaithRefund) ? game.helOfferingFaithRefund : 30;
            const canAfford = gameState.progression.followers > followerCost && gameState.progression.faith >= faithCost;
            setAffordability(el, canAfford);
            el.classList.toggle('purchased', !canAfford);
            applyTooltip(
                el,
                'Offering to the Veil\nSacrifice followers to Hel in exchange for her favor.',
                `Cost: ${followerCost} followers, ${faithCost} faith\nRefund: +${refund} faith\nEffect: Alignment toward Evil, Hel favor +${game.helFavorOfferingGain}`
            );
        },
        explore(el) {
            applyTooltip(el, 'Explore\nSearch nearby lands for opportunities.', 'Cost: none');
        },
        startExpedition(el) {
            setVisible(el, true);
            const hasParty = getUnassignedFollowers() > 0;
            const idle = !game.exploration?.activeExpedition;
            setAffordability(el, hasParty && idle);
            const rollCost = getExpeditionRollFaithCost();
            const rollBonus = getExpeditionRollBonus();
            applyTooltip(
                el,
                'Start Expedition\nSend followers out to map the wild and find villages.',
                `Party limit: ${Math.floor(game.exploration?.followerSendLimit || 10)} followers\nRoll cost: ${rollCost} faith${rollBonus > 0 ? ` (Wanderlust: +${rollBonus} roll, discounted cost)` : ''}`
            );
        },
        rollExpedition(el) {
            setVisible(el, true);
            const active = Boolean(game.exploration?.activeExpedition);
            const rollCost = getExpeditionRollFaithCost();
            const rollBonus = getExpeditionRollBonus();
            const canAfford = gameState.progression.faith >= rollCost;
            setAffordability(el, active && canAfford);
            applyTooltip(
                el,
                'Roll Expedition\nOpen the dice panel for the next expedition roll.',
                `Roll: 1d6 + followers sent${rollBonus > 0 ? ` + ${rollBonus} (Wanderlust)` : ''}\nCost per roll: ${rollCost} faith`
            );
        },
        rollExpeditionD6(el) {
            setVisible(el, true);
            const active = Boolean(game.exploration?.activeExpedition);
            const rollCost = getExpeditionRollFaithCost();
            const rollBonus = getExpeditionRollBonus();
            const canAfford = gameState.progression.faith >= rollCost;
            setAffordability(el, active && canAfford);
            applyTooltip(
                el,
                'Roll d6\nExecute the expedition roll with visual dice animation.',
                `Roll: 1d6 + followers sent${rollBonus > 0 ? ` + ${rollBonus} (Wanderlust)` : ''}\nCost: ${rollCost} faith`
            );
        },
        cancelExpeditionRoll(el) {
            setVisible(el, true);
            setAffordability(el, true);
            applyTooltip(el, 'Cancel Roll\nClose the expedition dice panel without spending faith.', 'Cost: none');
        },
        cancelExpedition(el) {
            setVisible(el, true);
            setAffordability(el, Boolean(game.exploration?.activeExpedition));
            applyTooltip(el, 'Recall Expedition\nCall your expedition back to camp immediately.', 'Cost: none');
        },
        expandExpeditionParty(el) {
            if (!hasExplorationAccess) {
                setVisible(el, false);
                return;
            }
            const exploration = game.exploration || {};
            const purchases = Number.isFinite(exploration.partyExpansionPurchases) ? exploration.partyExpansionPurchases : 0;
            const maxPurchases = Number.isFinite(game.upgradeMaxPurchases) ? game.upgradeMaxPurchases : 10;
            const limit = Number.isFinite(exploration.followerSendLimit) ? exploration.followerSendLimit : 10;
            const increase = Number.isFinite(game.expandPartyFollowerIncrease) ? game.expandPartyFollowerIncrease : 5;
            applyRepeatableUpgradeButton(el, {
                purchases,
                maxPurchases,
                baseCost: gameState.costs.expandPartyBaseCost,
                label: 'Expand Expedition Party',
                summary: 'Send more followers on each expedition.',
                effectLine: `Current limit: ${limit}\nNext purchase: +${increase}`,
                gameState,
                setVisible,
                setAffordability,
                setButtonLabel
            });
        },
        trainExpeditionScouts(el) {
            if (!hasExplorationAccess) {
                setVisible(el, false);
                return;
            }
            const exploration = game.exploration || {};
            const purchases = Number.isFinite(exploration.expeditionTrainingPurchases) ? exploration.expeditionTrainingPurchases : 0;
            const maxPurchases = Number.isFinite(game.upgradeMaxPurchases) ? game.upgradeMaxPurchases : 10;
            const wipeout = Number.isFinite(exploration.hazardWipeoutChance) ? exploration.hazardWipeoutChance : 0;
            const heavyLoss = Number.isFinite(exploration.hazardHeavyLossChance) ? exploration.hazardHeavyLossChance : 0;
            const ambush = Number.isFinite(exploration.hazardAmbushChance) ? exploration.hazardAmbushChance : 0;
            applyRepeatableUpgradeButton(el, {
                purchases,
                maxPurchases,
                baseCost: gameState.costs.expeditionTrainingBaseCost,
                label: 'Train Expedition Scouts',
                summary: 'Reduce the chance of expedition hazards.',
                effectLine: `Current hazard chances: ${(wipeout * 100).toFixed(1)}% wipeout, ${(heavyLoss * 100).toFixed(1)}% heavy loss, ${(ambush * 100).toFixed(1)}% ambush`,
                gameState,
                setVisible,
                setAffordability,
                setButtonLabel
            });
        },
        buildRitualCircle(el) {
            if (gameState.progression.faith >= gameState.costs[ritualCostKey] && el.dataset.unlocked !== 'true') {
                el.dataset.unlocked = 'true';
            }

            const unlocked = ritualBuilt || el.dataset.unlocked === 'true';
            setVisible(el, unlocked);

            const canAfford = gameState.progression.faith >= gameState.costs[ritualCostKey];
            setAffordability(el, canAfford);
            if (ritualBuilt) el.disabled = true;

            setButtonLabel(el, `${ritualDefinition.label} ${ritualLevel}/${ritualDefinition.maxLevel}`);
            applyTooltip(el, 'Ritual Circle\nExpand your settlement with core infrastructure.', `Cost: ${gameState.costs[ritualCostKey]} faith\nProgress: ${ritualLevel}/${ritualDefinition.maxLevel}`);
        },
        gatherWood(el) {
            const baseWoodGain = typeof gameState.resources.wood.gatherAmount === 'function'
                ? gameState.resources.wood.gatherAmount()
                : gameState.resources.wood.gatherAmount;
            const woodGain = Math.floor(baseWoodGain * getManualActionYieldMultiplier());
            if (ritualBuilt) {
                setVisible(el, true);
                const canAfford = gameState.progression.faith >= gameState.resources.wood.gatherCost;
                setAffordability(el, canAfford);
                el.classList.toggle('purchased', !canAfford);
            } else {
                setVisible(el, false);
                el.dataset.affordable = 'false';
                el.classList.remove('purchased');
            }

            applyTooltip(el, 'Gather Wood\nSend followers to collect wood manually.', `Cost: ${gameState.resources.wood.gatherCost} faith\nOutput: +${woodGain} wood`);
        },
        gatherStone(el) {
            const baseStoneGain = typeof gameState.resources.stone.gatherAmount === 'function'
                ? gameState.resources.stone.gatherAmount()
                : gameState.resources.stone.gatherAmount;
            const stoneGain = Math.floor(baseStoneGain * getManualActionYieldMultiplier());
            if (ritualBuilt) {
                setVisible(el, true);
                const canAfford = gameState.progression.faith >= gameState.resources.stone.gatherCost;
                setAffordability(el, canAfford);
                el.classList.toggle('purchased', !canAfford);
            } else {
                setVisible(el, false);
                el.dataset.affordable = 'false';
                el.classList.remove('purchased');
            }

            applyTooltip(el, 'Gather Stone\nSend followers to collect stone manually.', `Cost: ${gameState.resources.stone.gatherCost} faith\nOutput: +${stoneGain} stone`);
        },
        gatherFood(el) {
            const foodUnlocked = ritualBuilt && (shelterLevel >= 1 || el.dataset.unlocked === 'true');
            if (foodUnlocked) {
                setVisible(el, true);
                const canAfford = gameState.progression.faith >= gameState.resources.food.gatherCost;
                setAffordability(el, canAfford);
                const zealousNote = getManualActionYieldMultiplier() > 1 ? ' (Zealous Hands bonus applied)' : '';
                applyTooltip(el, 'Gather Food\nOrganize a hunt to bring back food.', `Cost: ${gameState.resources.food.gatherCost} faith\nOutput: random food gain${zealousNote}`);
                el.dataset.unlocked = 'true';
            } else {
                setVisible(el, false);
            }
        },
        buildShelter(el) {
            const shelterCosts = getShelterBuildCosts();
            if (
                !game.shelterBtnUnlocked &&
                gameState.resources.wood.amount >= shelterCosts.wood &&
                gameState.resources.stone.amount >= shelterCosts.stone
            ) {
                game.shelterBtnUnlocked = true;
            }

            if (game.shelterBtnUnlocked) {
                setVisible(el, true);
                const canAfford =
                    gameState.resources.wood.amount >= shelterCosts.wood &&
                    gameState.resources.stone.amount >= shelterCosts.stone;
                setAffordability(el, canAfford);
                const shelterLabel = game.shelterUpgradeUnlocked ? 'Build shack' : 'Build shelter';
                setButtonLabel(el, `${shelterLabel} (${Math.floor(shelterCosts.wood)}/${Math.floor(shelterCosts.stone)})`);
                el.classList.toggle('purchased', !canAfford);
                applyTooltip(el, 'Build Shelter\nIncrease follower capacity.', `Cost: ${Math.floor(shelterCosts.wood)} wood, ${Math.floor(shelterCosts.stone)} stone\nCapacity: +${(game.shelterCapacityPerShelter || 3) * (game.shelterCapacityMultiplier || 1)} followers`);
            } else {
                setVisible(el, false);
            }
        },
        buildAltar(el) {
            if (!game.altarUnlocked && !game.altarBuilt) {
                setVisible(el, false);
                return;
            }

            setVisible(el, true);

            if (game.altarBuilt) {
                el.disabled = true;
                setButtonLabel(el, 'Build Altar (Built)');
                el.classList.add('purchased');
                applyTooltip(el, 'Build Altar\nThe altar is already constructed.', 'Status: built\nEffect active: Preach rolls +1');
                return;
            }

            const woodCost = gameState.costs.altarBuildWoodCost;
            const stoneCost = gameState.costs.altarBuildStoneCost;
            const faithCost = gameState.costs.altarBuildFaithCost;

            const canAfford =
                gameState.resources.wood.amount >= woodCost &&
                gameState.resources.stone.amount >= stoneCost &&
                gameState.progression.faith >= faithCost;

            setAffordability(el, canAfford);
            setButtonLabel(el, 'Build Altar');
            el.classList.toggle('purchased', !canAfford);
            applyTooltip(el, 'Build Altar\nConstruct a sacred altar to empower preaching.', `Cost: ${woodCost} wood, ${stoneCost} stone, ${faithCost} faith\nEffect: Preach rolls gain +1`);
        },
        advanceSettlementTier(el) {
            if (!ritualBuilt) {
                setVisible(el, false);
                return;
            }
            const tier = getNextSettlementTier();
            if (!tier) {
                setVisible(el, true);
                el.disabled = true;
                setButtonLabel(el, 'Settlement Fully Grown');
                el.classList.add('purchased');
                applyTooltip(el, 'Advance Settlement\nYour settlement has reached its final known form.', 'Status: maxed');
                return;
            }

            setVisible(el, true);
            const canAfford = canAffordSettlementTier(tier);
            setAffordability(el, canAfford);
            setButtonLabel(el, `Advance to ${tier.name}`);
            el.classList.toggle('purchased', !canAfford);

            const costParts = [];
            if (tier.faithCost) costParts.push(`${tier.faithCost} faith`);
            if (tier.woodCost) costParts.push(`${tier.woodCost} wood`);
            if (tier.stoneCost) costParts.push(`${tier.stoneCost} stone`);
            if (tier.starlightCost) costParts.push(`${tier.starlightCost} starlight`);
            const reqParts = [`${tier.followerRequirement.toLocaleString()} followers`];
            if (tier.requiresTemple) reqParts.push('Temple built');
            if (tier.requiresWorlds) reqParts.push('Worlds unlocked');

            applyTooltip(
                el,
                `Advance to ${tier.name}\n${tier.description}`,
                `Requires: ${reqParts.join(', ')}\nCost: ${costParts.join(', ')}\nEffect: Max follower capacity x${tier.capacityMultiplier}`
            );
        },
        buildStorehouse(el) {
            if (!ritualBuilt) {
                setVisible(el, false);
                return;
            }
            setVisible(el, true);
            const level = Number.isFinite(game.storehouse) ? game.storehouse : 0;
            const cost = getStorehouseCost();
            const canAfford = gameState.progression.faith >= cost;
            setAffordability(el, canAfford);
            setButtonLabel(el, `Build Storehouse (${level})`);
            el.classList.toggle('purchased', !canAfford);
            applyTooltip(
                el,
                'Build Storehouse\nExpand wood and stone storage capacity.',
                `Cost: ${cost} faith\nCurrent capacity: ${Math.floor(getWoodStoneCap())}\nNext level: +${Math.floor(game.storehouseCapPerLevel)} capacity`
            );
        },
        buildGranary(el) {
            if (!ritualBuilt) {
                setVisible(el, false);
                return;
            }
            setVisible(el, true);
            const level = Number.isFinite(game.granary) ? game.granary : 0;
            const cost = getGranaryCost();
            const canAfford = gameState.resources.wood.amount >= cost.wood && gameState.resources.stone.amount >= cost.stone;
            setAffordability(el, canAfford);
            setButtonLabel(el, `Build Granary (${level})`);
            el.classList.toggle('purchased', !canAfford);
            applyTooltip(
                el,
                'Build Granary\nExpand food storage capacity.',
                `Cost: ${cost.wood} wood, ${cost.stone} stone\nCurrent capacity: ${Math.floor(getFoodCap())}\nNext level: +${Math.floor(game.granaryCapPerLevel)} capacity`
            );
        },
        buildScriptorium(el) {
            if (!ritualBuilt) {
                setVisible(el, false);
                return;
            }
            const rank = Number.isFinite(game.scriptorium) ? game.scriptorium : 0;
            const maxRank = Number.isFinite(game.upgradeMaxPurchases) ? game.upgradeMaxPurchases : 10;
            const perRank = Number.isFinite(game.scriptoriumOutputPerRank) ? game.scriptoriumOutputPerRank : 0.08;
            applyRepeatableUpgradeButton(el, {
                purchases: rank,
                maxPurchases: maxRank,
                baseCost: gameState.costs.scriptoriumBaseCost,
                label: 'Build Scriptorium',
                summary: 'Ritualists copy scripture faster, boosting their faith output.',
                effectLine: `Current Ritualist output bonus: +${Math.round(rank * perRank * 100)}%`,
                gameState,
                setVisible,
                setAffordability,
                setButtonLabel
            });
        },
        buildWatchtower(el) {
            if (!game.explorationUnlocked) {
                setVisible(el, false);
                return;
            }
            setVisible(el, true);
            const level = Number.isFinite(game.watchtower) ? game.watchtower : 0;
            const cost = getWatchtowerCost();
            const canAfford = gameState.resources.wood.amount >= cost.wood && gameState.resources.stone.amount >= cost.stone;
            setAffordability(el, canAfford);
            setButtonLabel(el, `Build Watchtower (${level})`);
            el.classList.toggle('purchased', !canAfford);
            applyTooltip(
                el,
                'Build Watchtower\nScouts spot danger before it strikes your expeditions.',
                `Cost: ${cost.wood} wood, ${cost.stone} stone\nCurrent hazard avoid chance: ${Math.round(getWatchtowerHazardAvoidChance() * 100)}%`
            );
        },
        buildBarracks(el) {
            if (!game.explorationUnlocked) {
                setVisible(el, false);
                return;
            }
            setVisible(el, true);
            const level = Number.isFinite(game.barracks) ? game.barracks : 0;
            const cost = getBarracksCost();
            const canAfford = gameState.resources.wood.amount >= cost.wood && gameState.resources.stone.amount >= cost.stone;
            setAffordability(el, canAfford);
            setButtonLabel(el, `Build Barracks (${level})`);
            el.classList.toggle('purchased', !canAfford);
            applyTooltip(
                el,
                'Build Barracks\nTrain your raiders, boosting the conquest roll against villages.',
                `Cost: ${cost.wood} wood, ${cost.stone} stone\nCurrent conquest roll bonus: +${getBarracksConquerRollBonus()}`
            );
        },
        buildWell(el) {
            if (!game.hungerVisible) {
                setVisible(el, false);
                return;
            }
            setVisible(el, true);
            const level = Number.isFinite(game.well) ? game.well : 0;
            const cost = getWellCost();
            const canAfford = gameState.resources.wood.amount >= cost.wood && gameState.resources.stone.amount >= cost.stone;
            setAffordability(el, canAfford);
            setButtonLabel(el, `Dig Well (${level})`);
            el.classList.toggle('purchased', !canAfford);
            const reduction = Math.round((1 - getWellConsumptionMultiplier()) * 100);
            applyTooltip(
                el,
                'Dig Well\nA reliable water source reduces follower food consumption.',
                `Cost: ${cost.wood} wood, ${cost.stone} stone\nCurrent consumption reduction: -${reduction}%`
            );
        },
        buildMarketplace(el) {
            if (game.storehouse < 1) {
                setVisible(el, false);
                return;
            }
            setVisible(el, true);
            const level = Number.isFinite(game.marketplace) ? game.marketplace : 0;
            const cost = getMarketplaceCost();
            const canAfford = gameState.resources.wood.amount >= cost.wood && gameState.resources.stone.amount >= cost.stone;
            setAffordability(el, canAfford);
            setButtonLabel(el, `Build Marketplace (${level})`);
            el.classList.toggle('purchased', !canAfford);
            applyTooltip(
                el,
                'Build Marketplace\nEstablish trade routes to convert surplus wood and stone into faith.',
                `Cost: ${cost.wood} wood, ${cost.stone} stone\nNext level trade yield: ${getMarketplaceTradeFaithYield()} faith`
            );
        },
        tradeAtMarketplace(el) {
            if (game.marketplace < 1) {
                setVisible(el, false);
                return;
            }
            setVisible(el, true);
            const tradeCost = getMarketplaceTradeCost();
            const canAfford = gameState.resources.wood.amount >= tradeCost.wood && gameState.resources.stone.amount >= tradeCost.stone;
            setAffordability(el, canAfford);
            const tradesCompleted = Number.isFinite(game.marketplaceTradesCompleted) ? game.marketplaceTradesCompleted : 0;
            applyTooltip(
                el,
                'Trade at Marketplace\nSell surplus wood and stone for faith.',
                `Cost: ${tradeCost.wood} wood, ${tradeCost.stone} stone (rises with each trade)\nYield: ${getMarketplaceTradeFaithYield()} faith\nTrades completed: ${tradesCompleted}`
            );
        },
        hirePilgrims(el) {
            if (game.marketplace < 1) {
                setVisible(el, false);
                return;
            }
            setVisible(el, true);
            const cost = getHirePilgrimsCost();
            const canAfford = gameState.progression.faith >= cost && gameState.progression.followers < getMaxFollowers();
            setAffordability(el, canAfford);
            const perPurchase = Number.isFinite(game.hirePilgrimsFollowersPerPurchase) ? game.hirePilgrimsFollowersPerPurchase : 10;
            const purchased = Number.isFinite(game.hirePilgrimsPurchased) ? game.hirePilgrimsPurchased : 0;
            applyTooltip(
                el,
                'Hire Pilgrims\nBulk-convert surplus faith directly into followers, no dice roll required.',
                `Cost: ${cost} faith\nYield: +${perPurchase} followers\nHired so far: ${purchased} (cost rises each time)`
            );
        },
        buildMonument(el) {
            if (!canUnlockMonument()) {
                setVisible(el, false);
                return;
            }
            setVisible(el, true);
            const level = Number.isFinite(game.monument) ? game.monument : 0;
            const cost = getMonumentCost();
            const canAfford = gameState.progression.faith >= cost.faith && gameState.resources.wood.amount >= cost.wood && gameState.resources.stone.amount >= cost.stone;
            setAffordability(el, canAfford);
            setButtonLabel(el, `Build Monument (${level})`);
            el.classList.toggle('purchased', !canAfford);
            const bonus = Math.round((getMonumentFaithPerFollowerMultiplier() - 1) * 100);
            applyTooltip(
                el,
                'Build Monument\nA towering testament to your faith, multiplying what every follower earns you.',
                `Cost: ${cost.faith} faith, ${cost.wood} wood, ${cost.stone} stone\nCurrent follower faith bonus: +${bonus}%`
            );
        },
        buildCatechismHall(el) {
            if (!game.altarBuilt) {
                setVisible(el, false);
                return;
            }
            setVisible(el, true);
            const level = Number.isFinite(game.catechismHall) ? game.catechismHall : 0;
            const cost = getCatechismHallCost();
            const canAfford = gameState.progression.faith >= cost.faith && gameState.resources.wood.amount >= cost.wood;
            setAffordability(el, canAfford);
            setButtonLabel(el, `Build Catechism Hall (${level})`);
            el.classList.toggle('purchased', !canAfford);
            const trickle = getGoodwillTricklePerSecond();
            applyTooltip(
                el,
                'Build Catechism Hall\nMissionaries quietly win hearts in every unresolved village and city, no Sermon required.',
                `Cost: ${cost.faith} faith, ${cost.wood} wood\nCurrent Goodwill trickle: +${trickle.toFixed(2)}%/s per settlement`
            );
        },
        buildWarCamp(el) {
            if (!game.explorationUnlocked) {
                setVisible(el, false);
                return;
            }
            setVisible(el, true);
            const level = Number.isFinite(game.warCamp) ? game.warCamp : 0;
            const cost = getWarCampCost();
            const canAfford = gameState.progression.faith >= cost.faith && gameState.resources.wood.amount >= cost.wood && gameState.resources.stone.amount >= cost.stone;
            setAffordability(el, canAfford);
            setButtonLabel(el, `Build War Camp (${level})`);
            el.classList.toggle('purchased', !canAfford);
            applyTooltip(
                el,
                'Build War Camp\nTrain and quarter a standing force, raising how many followers a single warband can hold.',
                `Cost: ${cost.faith} faith, ${cost.wood} wood, ${cost.stone} stone\nCurrent max warband size: ${getMaxWarbandSize()}`
            );
        },
        unlockShelterUpgrade(el) {
            if (!game.unlocksTabUnlocked) {
                setVisible(el, false);
                return;
            }

            const reachedRequirement = gameState.progression.followers >= game.shelterUpgradeFollowerRequirement;
            if (!reachedRequirement && !game.shelterUpgradeUnlocked) {
                setVisible(el, false);
                return;
            }

            setVisible(el, true);

            if (game.shelterUpgradeUnlocked) {
                el.disabled = true;
                setButtonLabel(el, 'Upgrade Shelter to Shack (Unlocked)');
                el.classList.add('purchased');
                applyTooltip(el, 'Upgrade Shelter to Shack\nHousing upgrade complete.', 'Status: unlocked');
                applyUnlockExtras(el, { isPurchased: true, description: 'Shelter capacity doubled and costs reduced, permanently.' });
                return;
            }

            const cost = gameState.costs.unlockShelterUpgradeFaithCost;
            const canAfford = gameState.progression.faith >= cost;
            setAffordability(el, canAfford);
            setButtonLabel(el, 'Upgrade Shelter to Shack');
            el.classList.toggle('purchased', !canAfford);
            const shackReductionPercent = Number.isFinite(game.shelterUpgradeCostMultiplier)
                ? Math.round((1 - game.shelterUpgradeCostMultiplier) * 100)
                : 30;
            applyTooltip(el, 'Upgrade Shelter to Shack\nBoost shelter effectiveness and reduce costs.', `Requirement: ${game.shelterUpgradeFollowerRequirement} followers\nCost: ${cost} faith\nEffect: x2 shelter capacity, ${shackReductionPercent}% global cost reduction`);
            applyUnlockExtras(el, { isPurchased: false, description: `Requires ${game.shelterUpgradeFollowerRequirement} followers. Costs ${cost} faith. Doubles shelter capacity and cuts costs ${shackReductionPercent}%.` });
        },
        unlockExploration(el) {
            if (!game.unlocksTabUnlocked) {
                setVisible(el, false);
                return;
            }

            if (!hasExplorationCapacity && !game.explorationUnlocked) {
                setVisible(el, false);
                return;
            }

            setVisible(el, true);

            if (game.explorationUnlocked) {
                el.disabled = true;
                setButtonLabel(el, 'Unlock Exploration (Unlocked)');
                el.classList.add('purchased');
                applyTooltip(el, 'Unlock Exploration\nExploration systems are fully unlocked.', 'Status: unlocked');
                applyUnlockExtras(el, { isPurchased: true, description: 'Exploration systems are fully unlocked.' });
                return;
            }

            const cost = Number.isFinite(gameState.costs.unlockExplorationFaithCost)
                ? Math.max(0, Math.floor(gameState.costs.unlockExplorationFaithCost))
                : 650;
            const canAfford = gameState.progression.faith >= cost;

            setAffordability(el, canAfford);
            setButtonLabel(el, 'Unlock Exploration');
            el.classList.toggle('purchased', !canAfford);
            applyTooltip(
                el,
                'Unlock Exploration\nOpen expeditions and discovered-area tracking.',
                `Requirement: ${explorationCapacityRequirement} follower capacity\nCost: ${cost} faith`
            );
            applyUnlockExtras(el, { isPurchased: false, description: `Requires ${explorationCapacityRequirement} follower capacity. Costs ${cost} faith. Opens expeditions and discovered-area tracking.` });
        },
        preach(el) {
            const max = getMaxFollowers();
            if (max >= 3) {
                setVisible(el, true);
                const preachCost = getPreachFaithCost();
                const canAfford =
                    gameState.progression.faith >= preachCost &&
                    game.hungerPercent >= 10 &&
                    gameState.resources.food.amount >= 10 &&
                    gameState.progression.followers < max;
                setAffordability(el, canAfford);
                el.classList.toggle('purchased', !canAfford);
                const preachRollText = preachBonus > 0 ? `1d4 + ${preachBonus}` : '1d4';
                const altarStatus = game.altarBuilt ? 'Altar bonus active: +1' : (game.altarUnlocked ? 'Altar unlocked: build required for +1' : 'Altar bonus: none');
                const shepherdsCreedNote = game.doctrineChoices?.flock === 'shepherdsCreed' ? " (Shepherd's Creed discount applied)" : '';
                applyTooltip(el, 'Preach\nDeliver a sermon to convert followers.', `Cost: ${preachCost} faith${shepherdsCreedNote}, 10% hunger, 10 food\nRoll: ${preachRollText} followers (capped by capacity)\n${altarStatus}\nAlso nudges Alignment toward Good and Helios favor.`);
            } else {
                setVisible(el, false);
            }
        },
        training(el) {
            if (!game.unlocksTabUnlocked) {
                setVisible(el, false);
            } else {
                setVisible(el, true);
                if (game.trainingUnlocked) {
                    el.disabled = true;
                    setButtonLabel(el, 'Training Unlocked');
                    el.classList.add('purchased');
                    applyTooltip(el, 'Unlock Training\nTraining program already unlocked.', 'Status: unlocked');
                    applyUnlockExtras(el, { isPurchased: true, description: 'Training program active. Role specialization enabled.' });
                } else {
                    const trainingCost = getTrainingUnlockFaithCost();
                    const canAfford = gameState.progression.faith >= trainingCost;
                    setAffordability(el, canAfford);
                    setButtonLabel(el, 'Unlock Training');
                    el.classList.toggle('purchased', !canAfford);
                    applyTooltip(el, 'Unlock Training\nEnable follower role specialization.', `Cost: ${trainingCost} faith`);
                    applyUnlockExtras(el, { isPurchased: false, description: `Costs ${trainingCost} faith. Enables follower role specialization.` });
                }
            }
        },
        trainZealousPreaching(el) {
            if (!game.unlocksTabUnlocked) {
                setVisible(el, false);
                return;
            }
            const purchases = Number.isFinite(game.zealousPreachingPurchases) ? game.zealousPreachingPurchases : 0;
            const maxPurchases = Number.isFinite(game.upgradeMaxPurchases) ? game.upgradeMaxPurchases : 10;
            const currentBonus = Number.isFinite(game.diceBonuses?.preach) ? Math.trunc(game.diceBonuses.preach) : 0;
            applyRepeatableUpgradeButton(el, {
                purchases,
                maxPurchases,
                baseCost: gameState.costs.zealousPreachingBaseCost,
                label: 'Zealous Preaching',
                summary: 'Sway more followers with every sermon.',
                effectLine: `Current Preach bonus: +${currentBonus}\nNext purchase: +1`,
                gameState,
                setVisible,
                setAffordability,
                setButtonLabel
            });
            const maxed = purchases >= maxPurchases;
            applyUnlockExtras(el, {
                isPurchased: maxed,
                description: maxed
                    ? `Preach bonus maxed at +${currentBonus}.`
                    : `Costs ${getUpgradeCost(gameState.costs.zealousPreachingBaseCost, purchases)} faith (rises each purchase). Rank ${purchases}/${maxPurchases}. +1 to Preach rolls per purchase. Current bonus: +${currentBonus}.`
            });
        },
        feedFollowers(el) {
            if (ritualBuilt) {
                setVisible(el, true);
                const canAfford = gameState.resources.food.amount > 0;
                setAffordability(el, canAfford);
                el.classList.toggle('purchased', !canAfford);
                applyTooltip(el, 'Feed Followers\nSpend food to restore hunger immediately.', `Cost: 1 food\nEffect: +${game.feedAmount} hunger`);
            } else {
                setVisible(el, false);
            }
        },
        holdFeast(el) {
            if (!game.hungerVisible) {
                setVisible(el, false);
                return;
            }
            setVisible(el, true);
            const cost = Number.isFinite(game.feastFoodCost) ? game.feastFoodCost : 50;
            const bonusRate = Number.isFinite(game.feastFaithBonusPerFood) ? game.feastFaithBonusPerFood : 0.5;
            const canAfford = gameState.resources.food.amount >= cost;
            setAffordability(el, canAfford);
            el.classList.toggle('purchased', !canAfford);
            applyTooltip(
                el,
                'Hold a Feast\nSpend a great deal of food to instantly restore hunger and lift spirits.',
                `Cost: ${cost} food\nEffect: Hunger to 100%, +${Math.floor(cost * bonusRate)} faith`
            );
        },
        shouldShowTabs(ritualButtonElement) {
            return Boolean(ritualButtonElement && (ritualButtonElement.dataset.unlocked === 'true' || ritualBuilt));
        },
        getTabHeaderVisibility(roleDefinitions) {
            return {
                explore: Boolean(ritualBuilt && hasExplorationAccess),
                unlocks: Boolean(game.unlocksTabUnlocked),
                food: Boolean(game.hasGatheredFood),
                doctrines: Boolean(game.doctrinesUnlocked),
                worlds: Boolean(game.worldsUnlocked),
                ascension: Boolean(game.worldsUnlocked || game.ascension?.totalAscensions > 0),
                followerManager: roleDefinitions.some((role) => game.roleUnlocks[role.id])
            };
        },
        hasAnyRoleUnlocked(roleDefinitions) {
            return roleDefinitions.some((role) => game.roleUnlocks[role.id]);
        },
        applyUnlockRoleButton(el, roleDefinition) {
            if (!game.unlocksTabUnlocked) {
                setVisible(el, false);
                return;
            }

            setVisible(el, true);

            if (!game.trainingUnlocked) {
                setAffordability(el, false);
                setButtonLabel(el, `Unlock ${roleDefinition.label}`);
                el.classList.add('purchased');
                applyTooltip(
                    el,
                    `Unlock ${roleDefinition.label}\nTraining must be unlocked first.`,
                    'Requirement: Unlock Training'
                );
                applyUnlockExtras(el, { isPurchased: false, description: 'Requires Training to be unlocked first.' });
                return;
            }

            if (game.roleUnlocks[roleDefinition.id]) {
                el.disabled = true;
                setButtonLabel(el, `Unlock ${roleDefinition.label} (Unlocked)`);
                el.classList.add('purchased');
                applyTooltip(el, `Unlock ${roleDefinition.label}\nRole already available.`, 'Status: unlocked');
                applyUnlockExtras(el, { isPurchased: true, description: `${roleDefinition.label} role is available for training.` });
                return;
            }

            if (roleDefinition.id === 'prophet') {
                const neededCapacity = Number.isFinite(game.prophetUnlockCapacityRequirement)
                    ? game.prophetUnlockCapacityRequirement
                    : 150;
                const currentCapacity = getMaxFollowers();
                if (currentCapacity < neededCapacity) {
                    setAffordability(el, false);
                    setButtonLabel(el, `Unlock ${roleDefinition.label}`);
                    el.classList.add('purchased');
                    applyTooltip(
                        el,
                        `Unlock ${roleDefinition.label}\nOnly one Prophet can be assigned.`,
                        `Requirement: ${neededCapacity} follower capacity\nCurrent: ${currentCapacity}`
                    );
                    applyUnlockExtras(el, { isPurchased: false, description: `Requires ${neededCapacity} follower capacity (current: ${currentCapacity}).` });
                    return;
                }
            }

            const cost = gameState.costs[roleDefinition.unlockCostKey];
            const canAfford = gameState.progression.faith >= cost;
            setAffordability(el, canAfford);
            setButtonLabel(el, `Unlock ${roleDefinition.label}`);
            el.classList.toggle('purchased', !canAfford);
            if (roleDefinition.id === 'prophet') {
                applyTooltip(
                    el,
                    `Unlock ${roleDefinition.label}\nAwaken a single high-sway converter.`,
                    `Cost: ${cost} faith\nLimit: 1 Prophet`
                );
                applyUnlockExtras(el, { isPurchased: false, description: `Costs ${cost} faith. Awakens a single high-sway converter (limit 1).` });
                return;
            }

            applyTooltip(el, `Unlock ${roleDefinition.label}\nMake this role trainable.`, `Cost: ${cost} faith`);
            applyUnlockExtras(el, { isPurchased: false, description: `Costs ${cost} faith. Makes ${roleDefinition.label} trainable.` });
        },
        applyTrainRoleButton(el, roleDefinition, untrainedFollowers) {
            if (!game.roleUnlocks[roleDefinition.id]) {
                setVisible(el, false);
                return;
            }

            setVisible(el, true);

            if (untrainedFollowers <= 0) {
                el.disabled = true;
                setButtonLabel(el, `Train ${roleDefinition.label}`);
                el.classList.add('purchased');
                applyTooltip(el, `Train ${roleDefinition.label}\nAssign followers to this role.`, 'No unassigned followers available');
                return;
            }

            const currentCount = Number.isFinite(gameState.progression.roles?.[roleDefinition.id])
                ? gameState.progression.roles[roleDefinition.id]
                : 0;
            const maxAssignable = Number.isFinite(roleDefinition.maxAssignable)
                ? Math.floor(roleDefinition.maxAssignable)
                : Infinity;
            const atRoleLimit = maxAssignable !== Infinity && currentCount >= maxAssignable;
            if (atRoleLimit) {
                el.disabled = true;
                setButtonLabel(el, `Train ${roleDefinition.label}`);
                el.classList.add('purchased');
                applyTooltip(
                    el,
                    `Train ${roleDefinition.label}\nAssign untrained followers to this role.`,
                    `Role cap reached (${currentCount}/${maxAssignable})`
                );
                return;
            }

            const baseCost = gameState.costs[roleDefinition.trainCostKey];
            const cost = getRoleTrainingCost(baseCost, currentCount);
            const canAfford = gameState.progression.faith >= cost;
            setAffordability(el, canAfford);
            setButtonLabel(el, `Train ${roleDefinition.label}`);
            el.classList.toggle('purchased', !canAfford);
            const capText = maxAssignable === Infinity ? 'no role cap' : `${currentCount}/${maxAssignable} assigned`;
            applyTooltip(el, `Train ${roleDefinition.label}\nAssign untrained followers to this role. Cost rises with how many you already own.`, `Cost: ${cost} faith\nBatch uses training input amount\nCap: ${capText}`);
        },

        unlockAltar(el) {
            if (!game.unlocksTabUnlocked) {
                setVisible(el, false);
                return;
            }

            const reachedRequirement = gameState.progression.followers >= game.shelterUpgradeFollowerRequirement;
            if (!reachedRequirement && !game.altarUnlocked) {
                setVisible(el, false);
                return;
            }

            setVisible(el, true);

            if (game.altarUnlocked) {
                el.disabled = true;
                setButtonLabel(el, 'Unlock Altar (Unlocked)');
                el.classList.add('purchased');
                applyTooltip(el, 'Unlock Altar\nAltar blueprint already unlocked.', 'Status: unlocked\nNext: Build Altar in Build tab');
                applyUnlockExtras(el, { isPurchased: true, description: 'Altar blueprint unlocked — build it in the Build tab.' });
                return;
            }

            const cost = gameState.costs.unlockAltarFaithCost;
            const canAfford = gameState.progression.faith >= cost;
            setAffordability(el, canAfford);
            setButtonLabel(el, 'Unlock Altar');
            el.classList.toggle('purchased', !canAfford);
            applyTooltip(el, 'Unlock Altar\nUnlock the altar blueprint.', `Requirement: ${game.shelterUpgradeFollowerRequirement} followers\nCost: ${cost} faith\nEffect: Enables Build Altar action`);
            applyUnlockExtras(el, { isPurchased: false, description: `Requires ${game.shelterUpgradeFollowerRequirement} followers. Costs ${cost} faith. Enables building the Altar.` });
        },
        blessTheHarvest(el) {
            if (!game.unlocksTabUnlocked) {
                setVisible(el, false);
                return;
            }

            setVisible(el, true);

            if (game.danuBlessingUnlocked) {
                el.disabled = true;
                setButtonLabel(el, 'Bless the Harvest (Unlocked)');
                el.classList.add('purchased');
                applyTooltip(el, 'Bless the Harvest\nThe Earth Mother\'s abundance already flows.', 'Status: unlocked');
                applyUnlockExtras(el, { isPurchased: true, description: `Hunters and Gatherers produce +${Math.round((game.danuBlessingMultiplier - 1) * 100)}% forever.` });
                return;
            }

            const faithCost = gameState.costs.blessHarvestFaithCost;
            const woodCost = gameState.costs.blessHarvestWoodCost;
            const stoneCost = gameState.costs.blessHarvestStoneCost;
            const canAfford =
                gameState.progression.faith >= faithCost &&
                gameState.resources.wood.amount >= woodCost &&
                gameState.resources.stone.amount >= stoneCost;
            setAffordability(el, canAfford);
            setButtonLabel(el, 'Bless the Harvest');
            el.classList.toggle('purchased', !canAfford);
            const blessPercent = Math.round((game.danuBlessingMultiplier - 1) * 100);
            applyTooltip(
                el,
                'Bless the Harvest\nCall on Danu to make the land generous.',
                `Cost: ${faithCost} faith, ${woodCost} wood, ${stoneCost} stone\nEffect: Hunters and Gatherers produce +${blessPercent}% permanently`
            );
            applyUnlockExtras(el, { isPurchased: false, description: `Costs ${faithCost} faith, ${woodCost} wood, ${stoneCost} stone. Permanently boosts Hunter and Gatherer output +${blessPercent}%.` });
        },
        conveneCouncil(el) {
            if (!game.unlocksTabUnlocked) {
                setVisible(el, false);
                return;
            }

            const requirement = Number.isFinite(game.councilFollowerRequirement) ? game.councilFollowerRequirement : 10;
            if (gameState.progression.followers < requirement && !game.doctrinesUnlocked) {
                setVisible(el, false);
                return;
            }

            setVisible(el, true);

            if (game.doctrinesUnlocked) {
                el.disabled = true;
                setButtonLabel(el, 'Convene the Council (Unlocked)');
                el.classList.add('purchased');
                applyTooltip(el, 'Convene the Council\nThe Council has convened.', 'Status: unlocked');
                applyUnlockExtras(el, { isPurchased: true, description: 'The Doctrines tab is unlocked. Choose one permanent path in each doctrine group.' });
                return;
            }

            const cost = Number.isFinite(gameState.costs.councilFaithCost) ? gameState.costs.councilFaithCost : 100;
            const canAfford = gameState.progression.followers >= requirement && gameState.progression.faith >= cost;
            setAffordability(el, canAfford);
            setButtonLabel(el, 'Convene the Council');
            el.classList.toggle('purchased', !canAfford);
            applyTooltip(el, 'Convene the Council\nGather your followers to decide the fundamental doctrines of your faith.', `Requirement: ${requirement} followers\nCost: ${cost} faith`);
            applyUnlockExtras(el, { isPurchased: false, description: `Requires ${requirement} followers. Costs ${cost} faith. Unlocks the Doctrines tab.` });
        },
        unlockWorlds(el) {
            if (!game.unlocksTabUnlocked) {
                setVisible(el, false);
                return;
            }
            if (!game.worldsUnlocked && !canUnlockWorlds()) {
                setVisible(el, false);
                return;
            }

            setVisible(el, true);

            if (game.worldsUnlocked) {
                el.disabled = true;
                setButtonLabel(el, 'Reach Beyond the Sky (Unlocked)');
                el.classList.add('purchased');
                applyTooltip(el, 'Reach Beyond the Sky\nThe first World has been charted.', 'Status: unlocked');
                applyUnlockExtras(el, { isPurchased: true, description: 'The Worlds tab is unlocked — your cult now reaches beyond one planet.' });
                return;
            }

            const cost = Number.isFinite(gameState.costs.unlockWorldsFaithCost) ? gameState.costs.unlockWorldsFaithCost : 5000;
            const canAfford = gameState.progression.faith >= cost;
            setAffordability(el, canAfford);
            setButtonLabel(el, 'Reach Beyond the Sky');
            el.classList.toggle('purchased', !canAfford);
            applyTooltip(
                el,
                'Reach Beyond the Sky\nOpen a rift to the first World beyond your own.',
                `Cost: ${cost} faith\nRequires: ${Math.floor(game.worldsUnlockFollowerCapacityRequirement)} follower capacity, ${game.worldsUnlockVillagesResolvedRequirement} Home villages resolved, ${Math.floor(game.worldsUnlockMetersExploredRequirement)}m explored, all Doctrines chosen, a Prophet assigned`
            );
            applyUnlockExtras(el, { isPurchased: false, description: `Costs ${cost} faith once all requirements are met. Opens the Worlds tab — the path to conquering the universe.` });
        },
        chooseShepherdsCreed(el) {
            const option = DOCTRINE_GROUP_BY_ID.flock.options.find((o) => o.id === 'shepherdsCreed');
            const discountPercent = Math.round((1 - game.shepherdsCreedCostMultiplier) * 100);
            applyDoctrineOptionButton(el, {
                groupId: 'flock', optionId: 'shepherdsCreed', label: option.label, summary: option.summary,
                effectLine: `Preach/Convert cost: -${discountPercent}%\nAlignment +${option.alignmentDelta} Good, Helios favor +${option.favorAmount}`,
                game, setVisible, setButtonLabel
            });
        },
        chooseIronFist(el) {
            const option = DOCTRINE_GROUP_BY_ID.flock.options.find((o) => o.id === 'ironFist');
            const yieldPercent = Math.round((game.ironFistYieldMultiplier - 1) * 100);
            const discountPercent = Math.round((1 - game.ironFistCostMultiplier) * 100);
            applyDoctrineOptionButton(el, {
                groupId: 'flock', optionId: 'ironFist', label: option.label, summary: option.summary,
                effectLine: `Conquer yield: +${yieldPercent}%, cost: -${discountPercent}%\nAlignment ${option.alignmentDelta} Evil, Sekhmet favor +${option.favorAmount}`,
                game, setVisible, setButtonLabel
            });
        },
        chooseHomestead(el) {
            const option = DOCTRINE_GROUP_BY_ID.hearth.options.find((o) => o.id === 'homestead');
            const outputPercent = Math.round((game.homesteadOutputMultiplier - 1) * 100);
            applyDoctrineOptionButton(el, {
                groupId: 'hearth', optionId: 'homestead', label: option.label, summary: option.summary,
                effectLine: `Hunter/Gatherer/Ritualist output: +${outputPercent}%\nNo alignment or favor effect`,
                game, setVisible, setButtonLabel
            });
        },
        chooseWanderlust(el) {
            const option = DOCTRINE_GROUP_BY_ID.hearth.options.find((o) => o.id === 'wanderlust');
            const discountPercent = Math.round((1 - game.wanderlustCostMultiplier) * 100);
            applyDoctrineOptionButton(el, {
                groupId: 'hearth', optionId: 'wanderlust', label: option.label, summary: option.summary,
                effectLine: `Expedition roll: +${game.wanderlustRollBonus}, cost: -${discountPercent}%\nNo alignment or favor effect`,
                game, setVisible, setButtonLabel
            });
        },
        chooseAbundantTable(el) {
            const option = DOCTRINE_GROUP_BY_ID.sacrifice.options.find((o) => o.id === 'abundantTable');
            const reductionPercent = Math.round((1 - game.abundantTableConsumptionMultiplier) * 100);
            applyDoctrineOptionButton(el, {
                groupId: 'sacrifice', optionId: 'abundantTable', label: option.label, summary: option.summary,
                effectLine: `Food consumption: -${reductionPercent}%\nAlignment +${option.alignmentDelta} Good, Danu favor +${option.favorAmount}`,
                game, setVisible, setButtonLabel
            });
        },
        chooseLeanYears(el) {
            const option = DOCTRINE_GROUP_BY_ID.sacrifice.options.find((o) => o.id === 'leanYears');
            const reductionPercent = Math.round((1 - game.leanYearsConsumptionMultiplier) * 100);
            applyDoctrineOptionButton(el, {
                groupId: 'sacrifice', optionId: 'leanYears', label: option.label, summary: option.summary,
                effectLine: `Food consumption: -${reductionPercent}%, but starvation drain: ${game.leanYearsStarvationMultiplier}x worse\nAlignment ${option.alignmentDelta} Evil, Hel favor +${option.favorAmount}`,
                game, setVisible, setButtonLabel
            });
        },
        chooseStonemasons(el) {
            const option = DOCTRINE_GROUP_BY_ID.forge.options.find((o) => o.id === 'stonemasons');
            const discountPercent = Math.round((1 - game.stonemasonsCostMultiplier) * 100);
            applyDoctrineOptionButton(el, {
                groupId: 'forge', optionId: 'stonemasons', label: option.label, summary: option.summary,
                effectLine: `New building costs (Watchtower/Barracks/Well/Marketplace/Monument): -${discountPercent}%\nNo alignment or favor effect`,
                game, setVisible, setButtonLabel
            });
        },
        chooseQuarryRush(el) {
            const option = DOCTRINE_GROUP_BY_ID.forge.options.find((o) => o.id === 'quarryRush');
            const outputPercent = Math.round((game.quarryRushOutputMultiplier - 1) * 100);
            applyDoctrineOptionButton(el, {
                groupId: 'forge', optionId: 'quarryRush', label: option.label, summary: option.summary,
                effectLine: `Gatherer wood/stone output: +${outputPercent}%\nNo alignment or favor effect`,
                game, setVisible, setButtonLabel
            });
        },
        chooseZealousHands(el) {
            const option = DOCTRINE_GROUP_BY_ID.pilgrimage.options.find((o) => o.id === 'zealousHands');
            const yieldPercent = Math.round((game.zealousHandsYieldMultiplier - 1) * 100);
            applyDoctrineOptionButton(el, {
                groupId: 'pilgrimage', optionId: 'zealousHands', label: option.label, summary: option.summary,
                effectLine: `Pray/Gather Wood/Gather Stone/Gather Food yield: +${yieldPercent}%\nNo alignment or favor effect`,
                game, setVisible, setButtonLabel
            });
        },
        chooseQuietFaith(el) {
            const option = DOCTRINE_GROUP_BY_ID.pilgrimage.options.find((o) => o.id === 'quietFaith');
            const followerPercent = Math.round((game.quietFaithFollowerMultiplier - 1) * 100);
            const ritualistPercent = Math.round((game.quietFaithRitualistMultiplier - 1) * 100);
            applyDoctrineOptionButton(el, {
                groupId: 'pilgrimage', optionId: 'quietFaith', label: option.label, summary: option.summary,
                effectLine: `Follower faith income: +${followerPercent}%, Ritualist faith income: +${ritualistPercent}%\nNo alignment or favor effect`,
                game, setVisible, setButtonLabel
            });
        },
        buildTempleHelios(el) {
            const option = TEMPLE_OPTION_BY_GOD.helios;
            applyTempleButton(el, { godId: 'helios', label: option.label, summary: option.summary, effectLine: option.effectLabel, game, gameState, setVisible, setButtonLabel, setAffordability });
        },
        buildTempleSekhmet(el) {
            const option = TEMPLE_OPTION_BY_GOD.sekhmet;
            applyTempleButton(el, { godId: 'sekhmet', label: option.label, summary: option.summary, effectLine: option.effectLabel, game, gameState, setVisible, setButtonLabel, setAffordability });
        },
        buildTempleDanu(el) {
            const option = TEMPLE_OPTION_BY_GOD.danu;
            applyTempleButton(el, { godId: 'danu', label: option.label, summary: option.summary, effectLine: option.effectLabel, game, gameState, setVisible, setButtonLabel, setAffordability });
        },
        buildTempleHel(el) {
            const option = TEMPLE_OPTION_BY_GOD.hel;
            applyTempleButton(el, { godId: 'hel', label: option.label, summary: option.summary, effectLine: option.effectLabel, game, gameState, setVisible, setButtonLabel, setAffordability });
        },
        startWorldExpedition(el) {
            if (!game.worldsUnlocked) { setVisible(el, false); return; }
            const world = getActiveWorld();
            setVisible(el, true);
            const hasParty = getUnassignedFollowers() > 0;
            const idle = world && !world.activeExpedition && !world.frozen;
            setAffordability(el, Boolean(hasParty && idle));
            const rollCost = world ? getWorldExpeditionRollFaithCost(world) : 0;
            applyTooltip(
                el,
                'Send Expedition\nSend followers into the unknown reaches of this World.',
                `Party limit: ${Math.floor(game.exploration?.followerSendLimit || 10)} followers\nRoll cost: ${rollCost} faith per advance`
            );
        },
        resolveWorldExpedition(el) {
            if (!game.worldsUnlocked) { setVisible(el, false); return; }
            const world = getActiveWorld();
            setVisible(el, true);
            const active = Boolean(world?.activeExpedition);
            const rollCost = world ? getWorldExpeditionRollFaithCost(world) : 0;
            const canAfford = gameState.progression.faith >= rollCost;
            setAffordability(el, active && canAfford);
            applyTooltip(
                el,
                'Advance Expedition\nPush the active expedition forward by one roll.',
                `Roll: 1d6 + followers sent\nCost: ${rollCost} faith\nHazard risk applies each advance.`
            );
        },
        cancelWorldExpedition(el) {
            if (!game.worldsUnlocked) { setVisible(el, false); return; }
            const world = getActiveWorld();
            setVisible(el, true);
            setAffordability(el, Boolean(world?.activeExpedition));
            applyTooltip(el, 'Recall Expedition\nCall the active World expedition back immediately.', 'Cost: none');
        },
        chartNewWorld(el) {
            if (!game.worldsUnlocked) { setVisible(el, false); return; }
            const world = getActiveWorld();
            if (!world) { setVisible(el, false); return; }

            setVisible(el, true);
            const resolvedCount = world.villages.filter((village) => village.resolutionType).length;
            const requirement = getWorldChartRequirement(world.tier);
            const cost = getChartNewWorldCost(world.tier + 1);
            const meetsRequirement = resolvedCount >= requirement && !world.activeExpedition;
            const canAfford = meetsRequirement && gameState.progression.starlight >= cost.starlight && gameState.progression.faith >= cost.faith;
            setAffordability(el, canAfford);
            el.classList.toggle('purchased', !canAfford);
            applyTooltip(
                el,
                'Chart a New World\nLeave this World behind, claimed, and open a path to the next.',
                `Requirement: ${requirement} settlements resolved (have ${resolvedCount}), no active expedition\nCost: ${cost.starlight} starlight, ${cost.faith} faith\nPrevious World keeps tithing Starlight forever.`
            );
        },
        ascend(el) {
            const domainsClaimed = getDomainsClaimed();
            const tierInfo = getUniverseConquestTier();
            setVisible(el, true);
            const eligible = canAscendNow();
            setAffordability(el, eligible);
            el.classList.toggle('purchased', !eligible);
            if (eligible) {
                const preview = getEchoesOfDivinityPreview();
                applyTooltip(
                    el,
                    'Ascend\nEnd this incarnation and begin anew, stronger.',
                    `Domains claimed: ${domainsClaimed} (${tierInfo.label})\nEchoes of Divinity gained: ${preview}\nDoctrines persist. Everything else resets.`
                );
            } else {
                const nextTier = getNextUniverseConquestTier(domainsClaimed);
                const remaining = nextTier ? Math.max(0, nextTier.threshold - domainsClaimed) : 0;
                applyTooltip(
                    el,
                    'Ascend\nRequires claiming dominion across the universe.',
                    `Domains claimed: ${domainsClaimed} (${tierInfo.label})\nAscension unlocks at Universe tier (20 domains) — ${remaining} more needed.`
                );
            }
        },
        buyEchoingFaith(el) {
            const upgrade = ASCENSION_UPGRADE_BY_ID.echoingFaith;
            const rank = getAscensionUpgradeRank('echoingFaith');
            const maxRank = Number.isFinite(game.upgradeMaxPurchases) ? game.upgradeMaxPurchases : 10;
            applyRepeatableUpgradeButton(el, {
                purchases: rank, maxPurchases: maxRank, baseCost: gameState.costs[upgrade.baseCostKey],
                label: upgrade.label, summary: upgrade.summary, effectLine: `Current: +${Math.round(rank * upgrade.effectPerRank * 100)}% faith income`,
                gameState, setVisible, setAffordability, setButtonLabel,
                currencyAmount: game.ascension?.echoesOfDivinity, currencyLabel: 'Echoes'
            });
        },
        buySwiftFoundations(el) {
            const upgrade = ASCENSION_UPGRADE_BY_ID.swiftFoundations;
            const rank = getAscensionUpgradeRank('swiftFoundations');
            const maxRank = Number.isFinite(game.upgradeMaxPurchases) ? game.upgradeMaxPurchases : 10;
            applyRepeatableUpgradeButton(el, {
                purchases: rank, maxPurchases: maxRank, baseCost: gameState.costs[upgrade.baseCostKey],
                label: upgrade.label, summary: upgrade.summary, effectLine: `Current: -${Math.round(rank * upgrade.effectPerRank * 100)}% early costs`,
                gameState, setVisible, setAffordability, setButtonLabel,
                currencyAmount: game.ascension?.echoesOfDivinity, currencyLabel: 'Echoes'
            });
        },
        buyStarlitMemory(el) {
            const upgrade = ASCENSION_UPGRADE_BY_ID.starlitMemory;
            const rank = getAscensionUpgradeRank('starlitMemory');
            const maxRank = Number.isFinite(game.upgradeMaxPurchases) ? game.upgradeMaxPurchases : 10;
            applyRepeatableUpgradeButton(el, {
                purchases: rank, maxPurchases: maxRank, baseCost: gameState.costs[upgrade.baseCostKey],
                label: upgrade.label, summary: upgrade.summary, effectLine: `Current: +${Math.round(rank * upgrade.effectPerRank * 100)}% headstart on new Worlds`,
                gameState, setVisible, setAffordability, setButtonLabel,
                currencyAmount: game.ascension?.echoesOfDivinity, currencyLabel: 'Echoes'
            });
        },
        buyUndyingFlock(el) {
            const upgrade = ASCENSION_UPGRADE_BY_ID.undyingFlock;
            const rank = getAscensionUpgradeRank('undyingFlock');
            const maxRank = Number.isFinite(game.upgradeMaxPurchases) ? game.upgradeMaxPurchases : 10;
            applyRepeatableUpgradeButton(el, {
                purchases: rank, maxPurchases: maxRank, baseCost: gameState.costs[upgrade.baseCostKey],
                label: upgrade.label, summary: upgrade.summary, effectLine: `Current: -${Math.round(rank * upgrade.effectPerRank * 100)}% hazard severity`,
                gameState, setVisible, setAffordability, setButtonLabel,
                currencyAmount: game.ascension?.echoesOfDivinity, currencyLabel: 'Echoes'
            });
        }
    };
}