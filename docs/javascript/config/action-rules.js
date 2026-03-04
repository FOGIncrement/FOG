import { setTooltipContent } from '../utils/tooltip.js';

function applyTooltip(el, summary, stats = '') {
    setTooltipContent(el, summary, stats);
}

export function getActionUiRules(context) {
    const {
        gameState,
        game,
        ritualDefinition,
        shelterDefinition,
        getMaxFollowers,
        getRoleTrainingCost,
        setVisible,
        setAffordability,
        setButtonLabel
    } = context;

    const ritualLevel = game[ritualDefinition.levelKey];
    const ritualBuilt = ritualLevel >= ritualDefinition.maxLevel;
    const ritualCostKey = ritualDefinition.faithCostKey;

    const shelterLevel = game[shelterDefinition.levelKey];
    const shelterWoodCostKey = shelterDefinition.resourceCostKeys.wood;
    const shelterStoneCostKey = shelterDefinition.resourceCostKeys.stone;
    const preachBonus = Number.isFinite(game.diceBonuses?.preach) ? Math.trunc(game.diceBonuses.preach) : 0;

    return {
        pray(el) {
            applyTooltip(el, 'Pray\nOffer devotion for divine favor.', `Gain ${game.prayAmt} faith per click`);
        },
        convertFollower(el) {
            applyTooltip(el, 'Convert Follower\nSpend faith to convert one follower instantly.', `Cost: ${game.convertCost} faith\nOutput: +1 follower`);
        },
        explore(el) {
            applyTooltip(el, 'Explore\nSearch nearby lands for opportunities.', 'Cost: none');
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
            if (
                !game.shelterBtnUnlocked &&
                gameState.resources.wood.amount >= gameState.costs[shelterWoodCostKey] &&
                gameState.resources.stone.amount >= gameState.costs[shelterStoneCostKey]
            ) {
                game.shelterBtnUnlocked = true;
            }

            if (game.shelterBtnUnlocked) {
                setVisible(el, true);
                const canAfford =
                    gameState.resources.wood.amount >= gameState.costs[shelterWoodCostKey] &&
                    gameState.resources.stone.amount >= gameState.costs[shelterStoneCostKey];
                setAffordability(el, canAfford);
                const shelterLabel = game.shelterUpgradeUnlocked ? 'Build shack' : 'Build shelter';
                setButtonLabel(el, `${shelterLabel} (${gameState.costs[shelterWoodCostKey]}/${gameState.costs[shelterStoneCostKey]})`);
                el.classList.toggle('purchased', !canAfford);
                applyTooltip(el, 'Build Shelter\nIncrease follower capacity.', `Cost: ${gameState.costs[shelterWoodCostKey]} wood, ${gameState.costs[shelterStoneCostKey]} stone\nCapacity: +${(game.shelterCapacityPerShelter || 3) * (game.shelterCapacityMultiplier || 1)} followers`);
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
                return;
            }

            const cost = gameState.costs.unlockShelterUpgradeFaithCost;
            const canAfford = gameState.progression.faith >= cost;
            setAffordability(el, canAfford);
            setButtonLabel(el, 'Upgrade Shelter to Shack');
            el.classList.toggle('purchased', !canAfford);
            applyTooltip(el, 'Upgrade Shelter to Shack\nBoost shelter effectiveness and reduce costs.', `Requirement: ${game.shelterUpgradeFollowerRequirement} followers\nCost: ${cost} faith\nEffect: x2 shelter capacity, 50% global cost reduction`);
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
                applyTooltip(el, 'Preach\nDeliver a sermon to convert followers.', `Cost: ${gameState.costs.preachFaithCost} faith, 10% hunger, 10 food\nRoll: ${preachRollText} followers (capped by capacity)\n${altarStatus}`);
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
                } else {
                    const canAfford = gameState.progression.faith >= gameState.costs.trainingTechCost;
                    setAffordability(el, canAfford);
                    setButtonLabel(el, 'Unlock Training');
                    el.classList.toggle('purchased', !canAfford);
                    applyTooltip(el, 'Unlock Training\nEnable follower role specialization.', `Cost: ${gameState.costs.trainingTechCost} faith`);
                }
            }
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
                unlocks: Boolean(game.unlocksTabUnlocked),
                food: Boolean(game.hasGatheredFood),
                followerManager: roleDefinitions.some((role) => game.roleUnlocks[role.id])
            };
        },
        hasAnyRoleUnlocked(roleDefinitions) {
            return roleDefinitions.some((role) => game.roleUnlocks[role.id]);
        },
        applyUnlockRoleButton(el, roleDefinition) {
            if (!game.unlocksTabUnlocked || !game.trainingUnlocked) {
                setVisible(el, false);
                return;
            }

            setVisible(el, true);

            if (game.roleUnlocks[roleDefinition.id]) {
                el.disabled = true;
                setButtonLabel(el, `Unlock ${roleDefinition.label} (Unlocked)`);
                el.classList.add('purchased');
                applyTooltip(el, `Unlock ${roleDefinition.label}\nRole already available.`, 'Status: unlocked');
                return;
            }

            const cost = gameState.costs[roleDefinition.unlockCostKey];
            const canAfford = gameState.progression.faith >= cost;
            setAffordability(el, canAfford);
            setButtonLabel(el, `Unlock ${roleDefinition.label}`);
            el.classList.toggle('purchased', !canAfford);
            applyTooltip(el, `Unlock ${roleDefinition.label}\nMake this role trainable.`, `Cost: ${cost} faith`);
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

            const baseCost = gameState.costs[roleDefinition.trainCostKey];
            const cost = getRoleTrainingCost(baseCost);
            const canAfford = gameState.progression.faith >= cost;
            setAffordability(el, canAfford);
            setButtonLabel(el, `Train ${roleDefinition.label}`);
            el.classList.toggle('purchased', !canAfford);
            applyTooltip(el, `Train ${roleDefinition.label}\nAssign untrained followers to this role.`, `Cost: ${cost} faith\nBatch uses training input amount`);
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
                return;
            }

            const cost = gameState.costs.unlockAltarFaithCost;
            const canAfford = gameState.progression.faith >= cost;
            setAffordability(el, canAfford);
            setButtonLabel(el, 'Unlock Altar');
            el.classList.toggle('purchased', !canAfford);
            applyTooltip(el, 'Unlock Altar\nUnlock the altar blueprint.', `Requirement: ${game.shelterUpgradeFollowerRequirement} followers\nCost: ${cost} faith\nEffect: Enables Build Altar action`);
        }
    };
}