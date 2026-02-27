/*
    TODO:
    - [] Take all your damn variables for the game out of one object -- Semi finished - still need to variable groups and a better unlocks manager
    - [] Put those damn variables in their own objects grouped by function (followers, resources, buildings, etc)

    Let the game object control the state of the game, and have functions that manipulate that state. This will make it easier to manage as the game grows in complexity, and will also make it easier to save/load the game state in the future if you want to add that feature.
*/

export const gameState = {
    progression:{
        followers: 1,
        faith: 0,
        faithPerFollower: 0.01,
        prophet: 0
    },
    resources:{
        wood: 0,
        stone: 0,
        food: 0
    },
    gathering:{
        gatherWoodAmt: 10,
        gatherStoneAmt: 10,
        gatherFoodMinMultiplier: 25,
        gatherFoodMaxMultiplier: 55
    },
    costs:{
        gatherFoodFaithCost: 10,
        gatherWoodFaithCost: 20,
        gatherStoneFaithCost: 20,
        shelterWoodCost: 5,
        shelterStoneCost: 5
    },
    unlocks:{

    }
};

let game = {

    prayAmt: 100,
    convertCost: 10,
    exploreCost: 5,
    ritualCircleBuilt: 0,
    ritualCircleLimit: 1,
    shrineBuilt: 0,
    shelter: 0,
    shelterBtnUnlocked: 0,
    hungerPercent: 100,
    hungerVisible: 0,
    followerHungerDrain: 0.1,
    foodHungerGain: 0.5,
    // follower roles
    // (currently unused)
};

// Update UI and button visibility
function updateUI() {

    const followersEl = document.getElementById("followers");
    const faithEl = document.getElementById("faith");

    const woodContainer = document.getElementById("woodContainer");
    const woodValue = document.getElementById("woodValue");

    const stoneContainer = document.getElementById("stoneContainer");
    const stoneValue = document.getElementById("stoneValue");

    const foodContainer = document.getElementById("foodContainer");
    const foodValue = document.getElementById("foodValue");
    const foodRate = document.getElementById("foodRate");

    const hungerContainer = document.getElementById("hungerContainer");
    const hungerValue = document.getElementById("hungerValue");
    const hungerRate = document.getElementById("hungerRate");

    if (followersEl) {
        followersEl.innerText = `${gameState.progression.followers}/${getMaxFollowers()}`;
    }
    if (faithEl) {
        faithEl.innerText =
            `${gameState.progression.faith.toFixed(2)} (+${(gameState.progression.followers * gameState.progression.faithPerFollower).toFixed(3)}/s)`;
    }

    // Wood
    if (woodContainer && woodValue) {
        woodValue.innerText = gameState.resources.wood;
        if (game.ritualCircleBuilt >= 1) {
            woodContainer.style.display = "block";
        } else if (gameState.resources.wood > 0) {
            woodContainer.style.display = "block";
        } else {
            woodContainer.style.display = "none";
        }
    }

    // Stone
    if (stoneContainer && stoneValue) {
        stoneValue.innerText = gameState.resources.stone;
        if (game.ritualCircleBuilt >= 1) {
            stoneContainer.style.display = "block";
        } else if (gameState.resources.stone > 0) {
            stoneContainer.style.display = "block";
        } else {
            stoneContainer.style.display = "none";
        }
    }

    // Food
    if (foodContainer && foodValue && foodRate) {
        foodValue.innerText = gameState.resources.food;
        if (game.shelter >= 1 || gameState.resources.food > 0) {
            foodContainer.style.display = "block";
        } else {
            foodContainer.style.display = "none";
        }
        const foodDrainRate = (gameState.progression.followers * game.followerHungerDrain) / game.foodHungerGain;
        if (game.hungerPercent < 100 && gameState.resources.food > 0) {
            foodRate.innerText = `(-${foodDrainRate.toFixed(1)}/s)`;
        } else {
            foodRate.innerText = ``;
        }
    }

    // Hunger
    if (hungerContainer && hungerValue && hungerRate) {
        hungerValue.innerText = `${game.hungerPercent.toFixed(2)}%`;
        if (game.hungerVisible) {
            hungerContainer.style.display = "block";
            const hungerDrainRate = gameState.progression.followers * game.followerHungerDrain;
            if (gameState.resources.food > 0 && game.hungerPercent < 100) {
                const netDrain = (hungerDrainRate - game.foodHungerGain).toFixed(2);
                hungerRate.innerText = `(${netDrain > 0 ? '-' : '+'}${Math.abs(netDrain)}/s)`;
            } else {
                hungerRate.innerText = `(-${hungerDrainRate.toFixed(1)}/s)`;
            }
        } else {
            hungerContainer.style.display = "none";
        }
    }

    updateButtons();
}


// Gather food
function gatherFood() {
    if (gameState.progression.faith < gameState.costs.gatherFoodFaithCost) return;
    gameState.progression.faith -= gameState.costs.gatherFoodFaithCost;
    const min = gameState.progression.followers * gameState.gathering.gatherFoodMinMultiplier;
    const max = gameState.progression.followers * gameState.gathering.gatherFoodMaxMultiplier;
    const amount = Math.random() * (max - min) + min;
    // always give at least one unit of food
    const gained = Math.max(1, Math.floor(amount));
    gameState.resources.food += gained;
    addLog(`A hunt yielded ${gained} food.`);
    updateUI();
}


// Pray button
function pray() {
    gameState.progression.faith += game.prayAmt;
    updateUI();
}

// Passive faith gain per tick
function gameTick() {
    gameState.progression.faith += gameState.progression.followers * gameState.progression.faithPerFollower;
    // hunger drains with each follower
    if (game.hungerPercent > 0 && game.hungerVisible) {
        game.hungerPercent -= gameState.progression.followers * game.followerHungerDrain;
    }
    // refill hunger using food stock
    if (gameState.resources.food > 0 && game.hungerPercent < 100) {
        const gain = game.foodHungerGain;
        game.hungerPercent = Math.min(100, game.hungerPercent + gain);
        // consume one food unit per gain
        gameState.resources.food -= 1;
        if (gameState.resources.food < 0) gameState.resources.food = 0;
    }

    // log hunger warnings once per threshold crossing
    if (game.hungerPercent < 5 && lastHungerWarning !== 'critical') {
        addLog('The faithful are starving.');
        lastHungerWarning = 'critical';
    } else if (game.hungerPercent < 20 && lastHungerWarning !== 'weak') {
        addLog('The faithful grow weak.');
        lastHungerWarning = 'weak';
    } else if (game.hungerPercent >= 20) {
        lastHungerWarning = null;
    }

    updateUI();
}

// Convert follower
function convertFollower() {
    if (gameState.progression.faith >= game.convertCost) {
        gameState.progression.faith -= game.convertCost;
        gameState.progression.followers += 1;
        game.convertCost = Math.floor(game.convertCost * 1.15);
        updateUI();
    }
}

// Show/hide buttons
function updateButtons() {

    const buildRitualCircleBtn = document.getElementById("buildRitualCircleBtn");
    const gatherWoodBtn = document.getElementById("gatherWoodBtn");
    const gatherStoneBtn = document.getElementById("gatherStoneBtn");
    const gatherFoodBtn = document.getElementById("gatherFoodBtn");
    const buildShelterBtn = document.getElementById("buildShelterBtn");

    if (buildRitualCircleBtn) {
        if (gameState.progression.faith >= 50 && game.ritualCircleBuilt < 1) {
            buildRitualCircleBtn.style.display = "inline-block";
            buildRitualCircleBtn.innerText =
                `Ritual Circle ${game.ritualCircleBuilt}/1`;
            buildRitualCircleBtn.disabled = false;
        } else if (game.ritualCircleBuilt >= 1) {
            buildRitualCircleBtn.style.display = "inline-block";
            buildRitualCircleBtn.innerText =
                `Ritual Circle ${game.ritualCircleBuilt}/1`;
            buildRitualCircleBtn.disabled = true;
        } else {
            buildRitualCircleBtn.style.display = "none";
        }
    }


    // Unlock gather buttons
    if (gatherWoodBtn && gatherStoneBtn && gatherFoodBtn) {
        if (game.ritualCircleBuilt >= 1) {
            gatherWoodBtn.style.display = "inline-block";
            gatherWoodBtn.disabled = false;

            gatherStoneBtn.style.display = "inline-block";
            gatherStoneBtn.disabled = false;

            // food only after first shelter
            if (game.shelter >= 1) {
                gatherFoodBtn.style.display = "inline-block";
                // disable if not enough faith to pay cost
                gatherFoodBtn.disabled = gameState.progression.faith < gameState.costs.gatherFoodFaithCost;
                // update title with dynamic range
                const min = (gameState.progression.followers * gameState.gathering.gatherFoodMinMultiplier).toFixed(1);
                const max = (gameState.progression.followers * gameState.gathering.gatherFoodMaxMultiplier).toFixed(1);
                gatherFoodBtn.title = `Gather Food (${min}-${max})`;
            } else {
                gatherFoodBtn.style.display = "none";
            }
        } else {
            gatherWoodBtn.style.display = "none";
            gatherStoneBtn.style.display = "none";
            gatherFoodBtn.style.display = "none";
        }
    }

    // feed button
    const preachBtn = document.getElementById("preachBtn");
    if (preachBtn) {
        // only show when there is at least one free follower slot and >=3 max
        const max = getMaxFollowers();
        if (max >= 3 && gameState.progression.followers < max) {
            preachBtn.style.display = "inline-block";
            // disable if not enough resources
            preachBtn.disabled = gameState.progression.faith < 100 || game.hungerPercent < 10 || gameState.resources.food < 10;
            preachBtn.title = `Preach (100 faith, 10% hunger, 10 food) - 25% success`;
        } else {
            preachBtn.style.display = "none";
        }
    }

    // unlock shelter button
    if (buildShelterBtn) {
        // only show once circle built and resources reached; but once visible keep showing
        if (game.ritualCircleBuilt >= 1 &&
            (game.shelterBtnUnlocked ||
             (gameState.resources.wood >= gameState.costs.shelterWoodCost && gameState.resources.stone >= gameState.costs.shelterStoneCost))) {
            buildShelterBtn.style.display = "inline-block";
            // mark unlocked once we see it for the first time
            if (!game.shelterBtnUnlocked) {
                game.shelterBtnUnlocked = 1;
            }
            buildShelterBtn.disabled = !(gameState.resources.wood >= gameState.costs.shelterWoodCost && gameState.resources.stone >= gameState.costs.shelterStoneCost);

            // Update title and label dynamically
            buildShelterBtn.title = `Cost ${gameState.costs.shelterWoodCost} wood, ${gameState.costs.shelterStoneCost} stone`;
            buildShelterBtn.innerText = `Build shelter (${gameState.costs.shelterWoodCost}/${gameState.costs.shelterStoneCost})`;
        } else {
            buildShelterBtn.style.display = "none";
        }
    }
}

function getMaxFollowers() {
    const baseCapacity = 1; //starting capacity before shelters
    const shelterCapacity = game.shelter * 3; //each shelter adds 3 followers capacity
    return baseCapacity + shelterCapacity;
}

// Gather wood
function gatherWood() {
    if (gameState.progression.faith >= gameState.costs.gatherWoodFaithCost) {
        gameState.progression.faith -= gameState.costs.gatherWoodFaithCost;
        gameState.resources.wood += gameState.gathering.gatherWoodAmt;
        updateUI();
    }
}

function gatherStone(){
	if(gameState.progression.faith >= gameState.costs.gatherStoneFaithCost) {
		gameState.progression.faith -= gameState.costs.gatherStoneFaithCost;
		gameState.resources.stone += gameState.gathering.gatherStoneAmt;
		updateUI();
	}
}

function buildShelter() {
    if (gameState.resources.wood >= gameState.costs.shelterWoodCost && gameState.resources.stone >= gameState.costs.shelterStoneCost) {
        gameState.resources.wood -= gameState.costs.shelterWoodCost;
        gameState.resources.stone -= gameState.costs.shelterStoneCost;
        game.shelter += 1;
        // scale each cost by its own previous value so you can build multiple
        gameState.costs.shelterWoodCost = Math.floor(gameState.costs.shelterWoodCost * 1.8);
        gameState.costs.shelterStoneCost = Math.floor(gameState.costs.shelterStoneCost * 1.8);
        // reveal hunger meter when first shelter erected
        if (game.shelter === 1) {
            game.hungerVisible = 1;
        }
        updateUI();
    }
}

// Ritual Circle
const ritualBtn = document.getElementById("buildRitualCircleBtn");
if (ritualBtn) {
    ritualBtn.addEventListener("click", () => {
        if (gameState.progression.faith >= 50 && game.ritualCircleBuilt < 1) {
            gameState.progression.faith -= 50;
            game.ritualCircleBuilt = 1;
            gameState.progression.faithPerFollower += 0.005;
            updateUI();
        }
    });
}

// Buttons
const prayBtn = document.getElementById("prayBtn");
if (prayBtn) {
	prayBtn.title = `Generate ${game.prayAmt} faith per click`;
	prayBtn.addEventListener("click", pray);
}

const gatherWoodBtn = document.getElementById("gatherWoodBtn");
if (gatherWoodBtn) {
	gatherWoodBtn.title = `Cost ${gameState.costs.gatherWoodFaithCost} faith`;
	gatherWoodBtn.addEventListener("click", gatherWood);
}

const gatherStoneBtn = document.getElementById("gatherStoneBtn");
if (gatherStoneBtn) {
    gatherStoneBtn.title = `Cost ${gameState.costs.gatherStoneFaithCost} faith`;
    gatherStoneBtn.addEventListener("click", gatherStone);
}

const gatherFoodBtn = document.getElementById("gatherFoodBtn");
if (gatherFoodBtn) {
    gatherFoodBtn.title = `Gather food`;
    gatherFoodBtn.addEventListener("click", gatherFood);
}

const buildShelterBtn = document.getElementById("buildShelterBtn");
if (buildShelterBtn) {
    buildShelterBtn.title = `Cost ${gameState.costs.shelterWoodCost} wood and ${gameState.costs.shelterStoneCost} stone`;
    buildShelterBtn.addEventListener("click", buildShelter);
}

const preachBtnEl = document.getElementById("preachBtn");
if (preachBtnEl) {
    preachBtnEl.addEventListener("click", preach);
}

// Logging helper
let lastHungerWarning = null;
function addLog(msg) {
    const logEl = document.getElementById("log");
    if (!logEl) return;
    const p = document.createElement("p");
    p.innerText = "• " + msg;
    logEl.appendChild(p);
    logEl.scrollTop = logEl.scrollHeight;
}

// Preach to gain a follower at cost with chance
function preach() {
    const max = getMaxFollowers();
    if (gameState.progression.faith < 100 || game.hungerPercent < 10 || gameState.resources.food < 10 || gameState.progression.followers >= max) {
        return;
    }
    gameState.progression.faith -= 100;
    game.hungerPercent = Math.max(0, game.hungerPercent - 10);
    gameState.resources.food -= 10;
    const success = Math.random() < 0.25;
    if (success) {
        gameState.progression.followers += 1;
        addLog("Your sermon converted a follower.");
    } else {
        addLog("The sermon failed to sway anyone.");
    }
    updateUI();
}

// Tick
setInterval(gameTick, 1000);
updateUI();




