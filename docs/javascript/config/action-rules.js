import { setTooltipContent } from '../utils/tooltip.js';
import { getUpgradeCost } from '../utils/helpers.js';

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

function applyRepeatableUpgradeButton(el, { purchases, maxPurchases, baseCost, label, summary, effectLine, gameState, setVisible, setAffordability, setButtonLabel }) {
    setVisible(el, true);

    if (purchases >= maxPurchases) {
        el.disabled = true;
        setButtonLabel(el, `${label} (Max)`);
        el.classList.add('purchased');
        applyTooltip(el, `${label}\n${summary}`, `Status: maxed out (${purchases}/${maxPurchases})\n${effectLine}`);
        return;
    }

    const cost = getUpgradeCost(baseCost, purchases);
    const canAfford = gameState.progression.faith >= cost;
    setAffordability(el, canAfford);
    setButtonLabel(el, `${label} (${purchases}/${maxPurchases})`);
    el.classList.toggle('purchased', !canAfford);
    applyTooltip(el, `${label}\n${summary}`, `Cost: ${cost} faith\nRank: ${purchases}/${maxPurchases}\n${effectLine}`);
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
            applyTooltip(el, 'Pray\nOffer devotion for divine favor.', `Gain ${game.prayAmt} faith per click`);
        },
        convertFollower(el) {
            applyTooltip(el, 'Convert Follower\nSpend faith to convert one follower instantly.', `Cost: ${game.convertCost} faith\nOutput: +1 follower`);
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
            applyTooltip(
                el,
                'Start Expedition\nSend followers out to map the wild and find villages.',
                `Party limit: ${Math.floor(game.exploration?.followerSendLimit || 10)} followers\nRoll cost: ${Math.floor(gameState.costs.expeditionRollFaithCost || 50)} faith`
            );
        },
        rollExpedition(el) {
            setVisible(el, true);
            const active = Boolean(game.exploration?.activeExpedition);
            const canAfford = gameState.progression.faith >= (gameState.costs.expeditionRollFaithCost || 50);
            setAffordability(el, active && canAfford);
            applyTooltip(
                el,
                'Roll Expedition\nOpen the dice panel for the next expedition roll.',
                `Roll: 1d6 + followers sent\nCost per roll: ${Math.floor(gameState.costs.expeditionRollFaithCost || 50)} faith`
            );
        },
        rollExpeditionD6(el) {
            setVisible(el, true);
            const active = Boolean(game.exploration?.activeExpedition);
            const canAfford = gameState.progression.faith >= (gameState.costs.expeditionRollFaithCost || 50);
            setAffordability(el, active && canAfford);
            applyTooltip(
                el,
                'Roll d6\nExecute the expedition roll with visual dice animation.',
                `Roll: 1d6 + followers sent\nCost: ${Math.floor(gameState.costs.expeditionRollFaithCost || 50)} faith`
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
            const woodGain = typeof gameState.resources.wood.gatherAmount === 'function'
                ? gameState.resources.wood.gatherAmount()
                : gameState.resources.wood.gatherAmount;
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
            const stoneGain = typeof gameState.resources.stone.gatherAmount === 'function'
                ? gameState.resources.stone.gatherAmount()
                : gameState.resources.stone.gatherAmount;
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
                applyTooltip(el, 'Gather Food\nOrganize a hunt to bring back food.', `Cost: ${gameState.resources.food.gatherCost} faith\nOutput: random food gain`);
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
                const canAfford =
                    gameState.progression.faith >= gameState.costs.preachFaithCost &&
                    game.hungerPercent >= 10 &&
                    gameState.resources.food.amount >= 10 &&
                    gameState.progression.followers < max;
                setAffordability(el, canAfford);
                el.classList.toggle('purchased', !canAfford);
                const preachRollText = preachBonus > 0 ? `1d4 + ${preachBonus}` : '1d4';
                const altarStatus = game.altarBuilt ? 'Altar bonus active: +1' : (game.altarUnlocked ? 'Altar unlocked: build required for +1' : 'Altar bonus: none');
                applyTooltip(el, 'Preach\nDeliver a sermon to convert followers.', `Cost: ${gameState.costs.preachFaithCost} faith, 10% hunger, 10 food\nRoll: ${preachRollText} followers (capped by capacity)\n${altarStatus}\nAlso nudges Alignment toward Good and Helios favor.`);
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
                    const canAfford = gameState.progression.faith >= gameState.costs.trainingTechCost;
                    setAffordability(el, canAfford);
                    setButtonLabel(el, 'Unlock Training');
                    el.classList.toggle('purchased', !canAfford);
                    applyTooltip(el, 'Unlock Training\nEnable follower role specialization.', `Cost: ${gameState.costs.trainingTechCost} faith`);
                    applyUnlockExtras(el, { isPurchased: false, description: `Costs ${gameState.costs.trainingTechCost} faith. Enables follower role specialization.` });
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
        shouldShowTabs(ritualButtonElement) {
            return Boolean(ritualButtonElement && (ritualButtonElement.dataset.unlocked === 'true' || ritualBuilt));
        },
        getTabHeaderVisibility(roleDefinitions) {
            return {
                explore: Boolean(ritualBuilt && hasExplorationAccess),
                unlocks: Boolean(game.unlocksTabUnlocked),
                food: Boolean(game.hasGatheredFood),
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
        }
    };
}