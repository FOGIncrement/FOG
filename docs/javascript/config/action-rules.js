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

    return {
        pray(el) {
            el.title = `Gain ${game.prayAmt} faith`;
        },
        convertFollower(el) {
            el.title = `Cost ${game.convertCost} faith`;
        },
        explore(el) {
            el.title = 'No cost';
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
            el.title = `Cost ${gameState.costs[ritualCostKey]} faith`;
        },
        gatherWood(el) {
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

            el.title = `Cost ${gameState.resources.wood.gatherCost} faith`;
        },
        gatherStone(el) {
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

            el.title = `Cost ${gameState.resources.stone.gatherCost} faith`;
        },
        gatherFood(el) {
            const foodUnlocked = ritualBuilt && (shelterLevel >= 1 || el.dataset.unlocked === 'true');
            if (foodUnlocked) {
                setVisible(el, true);
                const canAfford = gameState.progression.faith >= gameState.resources.food.gatherCost;
                setAffordability(el, canAfford);
                el.title = `Cost ${gameState.resources.food.gatherCost} faith`;
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
                el.title = `Cost ${gameState.costs[shelterWoodCostKey]} wood and ${gameState.costs[shelterStoneCostKey]} stone`;
            } else {
                setVisible(el, false);
            }
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
                el.title = 'Already unlocked';
                return;
            }

            const cost = gameState.costs.unlockShelterUpgradeFaithCost;
            const canAfford = gameState.progression.faith >= cost;
            setAffordability(el, canAfford);
            setButtonLabel(el, 'Upgrade Shelter to Shack');
            el.classList.toggle('purchased', !canAfford);
            el.title = `Requires ${game.shelterUpgradeFollowerRequirement} followers. Cost ${cost} faith`;
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
                el.title = `Cost ${gameState.costs.preachFaithCost} faith, 10% hunger, 10 food. Rolls 1d4 followers (requires space).`;
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
                    el.title = 'Already purchased';
                } else {
                    const canAfford = gameState.progression.faith >= gameState.costs.trainingTechCost;
                    setAffordability(el, canAfford);
                    setButtonLabel(el, 'Unlock Training');
                    el.classList.toggle('purchased', !canAfford);
                    el.title = `Cost ${gameState.costs.trainingTechCost} faith`;
                }
            }
        },
        feedFollowers(el) {
            if (ritualBuilt) {
                setVisible(el, true);
                const canAfford = gameState.resources.food.amount > 0;
                setAffordability(el, canAfford);
                el.classList.toggle('purchased', !canAfford);
                el.title = `Consume 1 food to gain ${game.feedAmount} hunger`;
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
                el.title = 'Already unlocked';
                return;
            }

            const cost = gameState.costs[roleDefinition.unlockCostKey];
            const canAfford = gameState.progression.faith >= cost;
            setAffordability(el, canAfford);
            setButtonLabel(el, `Unlock ${roleDefinition.label}`);
            el.classList.toggle('purchased', !canAfford);
            el.title = `Cost ${cost} faith`;
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
                el.title = 'No untrained followers available';
                return;
            }

            const baseCost = gameState.costs[roleDefinition.trainCostKey];
            const cost = getRoleTrainingCost(baseCost);
            const canAfford = gameState.progression.faith >= cost;
            setAffordability(el, canAfford);
            setButtonLabel(el, `Train ${roleDefinition.label}`);
            el.classList.toggle('purchased', !canAfford);
            el.title = `Cost ${cost} faith`;
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
                el.title = 'Already unlocked';
                return;
            }

            const cost = gameState.costs.unlockAltarFaithCost;
            const canAfford = gameState.progression.faith >= cost;
            setAffordability(el, canAfford);
            setButtonLabel(el, 'Unlock Altar');
            el.classList.toggle('purchased', !canAfford);
            el.title = `Requires ${game.shelterUpgradeFollowerRequirement} followers. Cost ${cost} faith`;
        }
    };
}