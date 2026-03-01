// ===== CORE FUNCTIONS =====
function gatherWood() {
    if (gameState.progression.faith >= gameState.costs.gatherWoodFaithCost) {
        gameState.progression.faith -= gameState.costs.gatherWoodFaithCost;
        gameState.resources.wood += gameState.gathering.gatherWoodAmt;
        updateUI();
        saveGame();
    }
}

function gatherStone() {
    if (gameState.progression.faith >= gameState.costs.gatherStoneFaithCost) {
        gameState.progression.faith -= gameState.costs.gatherStoneFaithCost;
        gameState.resources.stone += gameState.gathering.gatherStoneAmt;
        updateUI();
        saveGame();
    }
}

function gatherFood() {
    if (gameState.progression.faith < gameState.costs.gatherFoodFaithCost) return;
    gameState.progression.faith -= gameState.costs.gatherFoodFaithCost;
    const min = gameState.progression.followers * gameState.gathering.gatherFoodMinMultiplier;
    const max = gameState.progression.followers * gameState.gathering.gatherFoodMaxMultiplier;
    const gained = Math.max(1, Math.floor(Math.random() * (max - min) + min));
    gameState.resources.food += gained;
    addLog(`A hunt yielded ${gained} food.`);
    if (!game.hasGatheredFood && gameState.resources.food > 0) {
        game.hasGatheredFood = true;
        markNew('food');
    }
    updateUI();
    saveGame();
}

function pray() {
    gameState.progression.faith += game.prayAmt;
    updateUI();
    saveGame();
}

function buildShelter() {
    if (gameState.resources.wood >= gameState.costs.shelterWoodCost &&
        gameState.resources.stone >= gameState.costs.shelterStoneCost) {

        gameState.resources.wood -= gameState.costs.shelterWoodCost;
        gameState.resources.stone -= gameState.costs.shelterStoneCost;
        game.shelter += 1;

        gameState.costs.shelterWoodCost = Math.floor(gameState.costs.shelterWoodCost * 1.8);
        gameState.costs.shelterStoneCost = Math.floor(gameState.costs.shelterStoneCost * 1.8);

        if (!game.hungerVisible) game.hungerVisible = true;

        game.shelterBtnUnlocked = true;
        updateUI();
        saveGame();
    }
}

function convertFollower() {
    if (gameState.progression.faith >= game.convertCost) {
        gameState.progression.faith -= game.convertCost;
        gameState.progression.followers += 1;
        game.convertCost = Math.floor(game.convertCost * 1.15);
        updateUI();
        saveGame();
    }
}

function preach() {
    const max = getMaxFollowers();
    if (gameState.progression.faith < gameState.costs.preachFaithCost || game.hungerPercent < 10 ||
        gameState.resources.food < 10 || gameState.progression.followers >= max) return;

    gameState.progression.faith -= gameState.costs.preachFaithCost;
    game.hungerPercent = Math.max(0, game.hungerPercent - 10);
    gameState.resources.food -= 10;

    const success = Math.random() < 0.25;
    if (success) {
        gameState.progression.followers += 1;
        // unlock the unlocks tab when the first preach conversion succeeds
        if (!game.unlocksTabUnlocked) {
            game.unlocksTabUnlocked = true;
            addLog('Unlocks tab is now available.');
        }
    }
    addLog(success ? "Your sermon converted a follower." : "The sermon failed to sway anyone.");

    updateUI();
    saveGame();
}

function training() {
    if (game.trainingUnlocked) return; // already bought
    if (gameState.progression.faith < gameState.costs.trainingTechCost) return;
    gameState.progression.faith -= gameState.costs.trainingTechCost;
    game.trainingUnlocked = true;
    addLog('Training program purchased.');
    updateUI();
    saveGame();
}

function feedFollowers() {
    if (gameState.resources.food <= 0 || game.hungerPercent >= 100) return;
    gameState.resources.food -= 1;
    game.hungerPercent = Math.min(100, game.hungerPercent + game.feedAmount);
    addLog('You feed the followers. Hunger restored.');
    updateUI();
    saveGame();
}

function trainHunters() {
    if (!game.trainingUnlocked) return;

    const untrained = gameState.progression.followers - gameState.progression.hunters;
    if (untrained <= 0) return;

    // get input from player
    const inputEl = document.getElementById("trainCountInput");
    let toTrain = inputEl ? parseInt(inputEl.value) : untrained;
    if (isNaN(toTrain) || toTrain <= 0) toTrain = untrained; // fallback
    toTrain = Math.min(toTrain, untrained); // can't train more than available

    const cost = toTrain * gameState.costs.hunterBaseCost;
    if (gameState.progression.faith < cost) return;

    gameState.progression.faith -= cost;
    gameState.progression.hunters += toTrain;

    addLog(`Trained ${toTrain} follower${toTrain > 1 ? 's' : ''} as hunters.`);
    updateUI();
    saveGame();
}

// ======= GAME TICK ======
function gameTick() {
    // Gain faith per follower
    gameState.progression.faith += gameState.progression.followers * gameState.progression.faithPerFollower;

    // ===== HUNGER =====
    if (game.hungerVisible) {
        // hunters produce food
        gameState.resources.food += gameState.progression.hunters * gameState.rates.hunterFoodPerSecond;

        const drain = gameState.progression.followers * game.followerHungerDrain;

        // auto-feed: always consume 1 food if available, and credit its gain against the drain
        let netDrain = drain;
            if (gameState.resources.food > 0 && game.hungerPercent < 100) {
                gameState.resources.food -= 1;
                const netEffect = game.foodHungerGain - drain; // can be positive or negative
                game.hungerPercent = Math.max(0, Math.min(100, game.hungerPercent + netEffect));
            } else {
            // no food, just drain
            game.hungerPercent = Math.max(0, game.hungerPercent - drain);
            }

        // warnings
        if (game.hungerPercent < 5 && lastHungerWarning !== 'critical') {
            addLog('The faithful are starving.');
            lastHungerWarning = 'critical';
        } else if (game.hungerPercent < 20 && lastHungerWarning !== 'weak') {
            addLog('The faithful grow weak.');
            lastHungerWarning = 'weak';
        } else if (game.hungerPercent >= 20) {
            lastHungerWarning = null;
        }
    }

    updateUI();
    saveGame();
}

// ===== UI UPDATE =====
function updateUI() {
    const followersEl = document.getElementById("followers");
    const faithEl = document.getElementById("faith");
    const hunterContainer = document.getElementById("hunterContainer");
    const hunterValue = document.getElementById("hunterValue");

    if (followersEl) followersEl.innerText = `${gameState.progression.followers}/${getMaxFollowers()}`;
    if (faithEl) faithEl.innerText =
        `${gameState.progression.faith.toFixed(2)} (+${(gameState.progression.followers * gameState.progression.faithPerFollower).toFixed(3)}/s)`;

    if (hunterContainer && hunterValue) {
        hunterValue.innerText = gameState.progression.hunters;
        hunterContainer.style.display = gameState.progression.hunters > 0 ? "block" : "none";
    }

    ["wood", "stone", "food",].forEach(type => {
        const container = document.getElementById(type + "Container");
        const value = document.getElementById(type + "Value");
        if (!container || !value) return;

        value.innerText = gameState.resources[type].toFixed(2);
        if (type === "food") {
            const rateEl = document.getElementById("foodRate");
            if (rateEl) {
                const hunterRate = gameState.progression.hunters * gameState.rates.hunterFoodPerSecond;
                const autoFeedCost = (game.hungerVisible && game.hungerPercent < 100) ? 1 : 0;
                const netFoodRate = hunterRate - autoFeedCost;
                rateEl.innerText = netFoodRate >= 0
                    ? `(+${netFoodRate.toFixed(3)}/s)`
                    : `(${netFoodRate.toFixed(3)}/s)`;
            }
    }
        if (type === "wood" || type === "stone") {
            container.style.display = (game.ritualCircleBuilt >= 1 || gameState.resources[type] > 0) ? "block" : "none";
        } else if (type === "food") {
            container.style.display = (game.shelter >= 1 || gameState.resources.food > 0) ? "block" : "none";
        }
    });

    // ===== HUNGER UI =====
const hungerContainer = document.getElementById("hungerContainer");
const hungerValue = document.getElementById("hungerValue");
const hungerRate = document.getElementById("hungerRate");

if (hungerContainer && hungerValue && hungerRate) {
    // Make sure the container is visible
    hungerContainer.style.display = game.hungerVisible ? "block" : "none";

    // Set the actual hunger percent
    hungerValue.innerText = game.hungerPercent.toFixed(2) + "%";

    // Calculate rate exactly as per gameTick
    const drain = gameState.progression.followers * game.followerHungerDrain;
    const autoFeeding = game.hungerVisible && gameState.resources.food > 0 && game.hungerPercent < 100;
    const netRate = autoFeeding ? (game.foodHungerGain - drain) : -drain;
    hungerRate.innerText = netRate >= 0 ? `(+${netRate.toFixed(2)}/s)` : `(${netRate.toFixed(2)}/s)`;

    
    }

    const trainedSummaryContainer = document.getElementById("trainedSummaryContainer");
    const trainedSummaryValue = document.getElementById("trainedSummaryValue");

    if (trainedSummaryContainer && trainedSummaryValue) {
    trainedSummaryContainer.style.display = game.trainingUnlocked ? "block" : "none";
    trainedSummaryValue.innerText = `${gameState.progression.hunters}/${gameState.progression.followers} trained`;
    }



    updateButtons();
}
// ===== BUTTONS =====
function updateButtons() {
    const bRit = document.getElementById("buildRitualCircleBtn");
    const gW = document.getElementById("gatherWoodBtn");
    const gS = document.getElementById("gatherStoneBtn");
    const gF = document.getElementById("gatherFoodBtn");
    const bS = document.getElementById("buildShelterBtn");
    const pBtn = document.getElementById("preachBtn");
    const tBtn = document.getElementById("trainingTechBtn");
    const feedBtn = document.getElementById("feedFollowersBtn");
    const prayBtn = document.getElementById("prayBtn");
    const convBtn = document.getElementById("convertBtn");
    const expBtn = document.getElementById("exploreBtn");
    const trainHuntersBtn = document.getElementById("trainHuntersBtn");

    // cost tooltips
    if (prayBtn) prayBtn.title = `Gain ${game.prayAmt} faith`;
    if (convBtn) convBtn.title = `Cost ${game.convertCost} faith`;
    if (expBtn) expBtn.title = `No cost`;
    // Ritual Circle
    if (bRit) {
        // Permanently unlock the button once the player has reached 50 faith
        if (gameState.progression.faith >= gameState.costs.ritualBtnCost && bRit.dataset.unlocked !== "true") {
            bRit.dataset.unlocked = "true";
        }

        const unlocked = game.ritualCircleBuilt >= 1 || bRit.dataset.unlocked === "true";
        setVisible(bRit, unlocked);

        // affordability depends solely on faith; built state keeps it disabled
        const canAffordRit = gameState.progression.faith >= 50;
        setAffordability(bRit, canAffordRit);
        if (game.ritualCircleBuilt >= 1) bRit.disabled = true;

        bRit.innerText = `Ritual Circle ${game.ritualCircleBuilt}/1`;
        bRit.title = `Cost 50 faith`;
    }

    // Tabs visibility: show tabs once player has reached 50 faith (ritual unlocked)
    const tabsShouldBeVisible = bRit && (bRit.dataset.unlocked === "true" || game.ritualCircleBuilt >= 1);
    if (tabsShouldBeVisible) showTabs(); else hideTabs();

    // unlocks tab header only after first preach conversion
    const unlocksHeader = document.querySelector('.tab-btn[data-tab="unlocks"]');
    if (unlocksHeader) {
        unlocksHeader.style.display = game.unlocksTabUnlocked ? 'inline-block' : 'none';
    }

    // food tab header only after first food gathered
    const foodHeader = document.querySelector('.tab-btn[data-tab="food"]');
    if (foodHeader) {
        const shouldShow = (gameState.resources.food > 0);
        foodHeader.style.display = shouldShow ? 'inline-block' : 'none';
    }

    const followerManagerHeader = document.querySelector('.tab-btn[data-tab="followerManager"]');
    if (followerManagerHeader) {
        const shouldShow = game.trainingUnlocked;
        followerManagerHeader.style.display = shouldShow ? 'inline-block' : 'none';
    }

    // training button state
    if (tBtn) {
        if (game.unlocksTabUnlocked) {
            setVisible(tBtn, true);
            if (game.trainingUnlocked) {
                tBtn.disabled = true;
                tBtn.title = 'Already purchased';
                tBtn.classList.add('purchased');
            } else {
                const canAffordTrain = gameState.progression.faith >= gameState.costs.trainingTechCost;
                setAffordability(tBtn, canAffordTrain);
                tBtn.title = `Cost ${gameState.costs.trainingTechCost} faith`;
                tBtn.classList.remove('purchased');
            }
        } else {
            setVisible(tBtn, false);
        }
    }

    // Gather buttons unlock permanently after circle
    if (gW && gS) {
        const unlocked = (game.ritualCircleBuilt >= 1);
        setVisible(gW, unlocked);
        setVisible(gS, unlocked);
        const canAffordWood = gameState.progression.faith >= gameState.costs.gatherWoodFaithCost;
        const canAffordStone = gameState.progression.faith >= gameState.costs.gatherStoneFaithCost;
        setAffordability(gW, canAffordWood);
        setAffordability(gS, canAffordStone);
        gW.title = `Cost ${gameState.costs.gatherWoodFaithCost} faith`;
        gS.title = `Cost ${gameState.costs.gatherStoneFaithCost} faith`;
    }

    // Gather Food unlocks permanently after first shelter
    if (gF) {
        if (game.ritualCircleBuilt >= 1 && (game.shelter >= 1 || gF.dataset.unlocked === "true")) {
            setVisible(gF, true);
            const canAffordFood = gameState.progression.faith >= gameState.costs.gatherFoodFaithCost;
            setAffordability(gF, canAffordFood);
            const min = (gameState.progression.followers * gameState.gathering.gatherFoodMinMultiplier).toFixed(1);
            const max = (gameState.progression.followers * gameState.gathering.gatherFoodMaxMultiplier).toFixed(1);
            gF.title = `Cost ${gameState.costs.gatherFoodFaithCost} faith`;
            gF.data.unlocked = "true";
        } else {
            setVisible(gF, false);
        }
    }

    // Build Shelter unlocks permanently after first time resources are enough
    if (bS) {
        if (!game.shelterBtnUnlocked &&
            gameState.resources.wood >= gameState.costs.shelterWoodCost &&
            gameState.resources.stone >= gameState.costs.shelterStoneCost) {
            game.shelterBtnUnlocked = true; // permanent unlock
        }

        if (game.shelterBtnUnlocked) {
            setVisible(bS, true);
            const canAffordShelter = gameState.resources.wood >= gameState.costs.shelterWoodCost &&
                                     gameState.resources.stone >= gameState.costs.shelterStoneCost;
            setAffordability(bS, canAffordShelter);
            bS.innerText = `Build shelter (${gameState.costs.shelterWoodCost}/${gameState.costs.shelterStoneCost})`;
            bS.title = `Cost ${gameState.costs.shelterWoodCost} wood and ${gameState.costs.shelterStoneCost} stone`;
        } else {
            setVisible(bS, false);
        }
    }

    // Preach
    if (pBtn) {
        const max = getMaxFollowers();
        if (max >= 3 && gameState.progression.followers < max) {
            setVisible(pBtn, true);
            const canAffordPreach = gameState.progression.faith >= gameState.costs.preachFaithCost && game.hungerPercent >= 10 && gameState.resources.food >= 10;
            setAffordability(pBtn, canAffordPreach);
            pBtn.title = `Cost ${gameState.costs.preachFaithCost} faith, 10% hunger, 10 food`;
        } else setVisible(pBtn, false);
    }

    // feed followers button state
    if (feedBtn) {
        if (game.ritualCircleBuilt >= 1) {
            setVisible(feedBtn, true);
            const canAffordFeed = gameState.resources.food > 0 && game.hungerPercent < 100;
            setAffordability(feedBtn, canAffordFeed);
            feedBtn.title = `Consume 1 food to gain ${game.feedAmount} hunger`;
        } else {
            setVisible(feedBtn, false);
        }
    }

    if (trainHuntersBtn) {
    if (game.trainingUnlocked) {

        const untrained = gameState.progression.followers - gameState.progression.hunters;

        // permanently visible once training is unlocked
        setVisible(trainHuntersBtn, true);

        if (untrained > 0) {
            const cost = getHunterTrainingCost();
            const canAfford = gameState.progression.faith >= cost;

            setAffordability(trainHuntersBtn, canAfford);
            trainHuntersBtn.innerText = `Train Hunters (${untrained})`;
            trainHuntersBtn.title = `Cost ${cost} faith`;
            trainHuntersBtn.classList.remove('purchased');
        } else {
            // all trained -> permanently greyed out
            trainHuntersBtn.disabled = true;
            trainHuntersBtn.innerText = `All Followers Trained`;
            trainHuntersBtn.title = `All followers are hunters`;
            trainHuntersBtn.classList.add('purchased');
        }

    } else {
        setVisible(trainHuntersBtn, false);
    }
}
}