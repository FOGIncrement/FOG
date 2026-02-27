/*
    TODO:
    - [] Take all your damn variables for the game out of one object
    - [] Put those damn variables in their own objects grouped by function (followers, resources, buildings, etc)

    Let the game object control the state of the game, and have functions that manipulate that state. This will make it easier to manage as the game grows in complexity, and will also make it easier to save/load the game state in the future if you want to add that feature.
*/

let game = {
    followers: 1,
    faith: 0.00,
    prayAmt: 100,
    faithPerFollower: 0.01,
    convertCost: 10,
    prophet: 0,
    exploreCost: 5,
    ritualCircleBuilt: 0,
    ritualCircleLimit: 1,
    shrineBuilt: 0,
    gatherWoodFaithCost: 20,
    wood: 0,
    gatherWoodAmt: 10,
	gatherStoneAmt: 10,
    stone: 0,
	gatherStoneFaithCost: 20,
    Shelter: 0,
    shelterWoodCost: 5,
    shelterStoneCost: 5,
    shelterBtnUnlocked: 0,
    hungerPercent: 100,
    hungerVisible: 0,
    followerHungerDrain: 0.1,
    // food mechanics
    food: 0,
    gatherFoodFaithCost: 10,
    // food gathering ranges per follower
    gatherFoodMinMultiplier: 25,
    gatherFoodMaxMultiplier: 65,
    // hunger restored per unit food
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
        followersEl.innerText = `${game.followers}/${getMaxFollowers()}`;
    }
    if (faithEl) {
        faithEl.innerText =
            `${game.faith.toFixed(2)} (+${(game.followers * game.faithPerFollower).toFixed(3)}/s)`;
    }

    // Wood
    if (woodContainer && woodValue) {
        woodValue.innerText = game.wood;
        if (game.ritualCircleBuilt >= 1) {
            woodContainer.style.display = "block";
        } else if (game.wood > 0) {
            woodContainer.style.display = "block";
        } else {
            woodContainer.style.display = "none";
        }
    }

    // Stone
    if (stoneContainer && stoneValue) {
        stoneValue.innerText = game.stone;
        if (game.ritualCircleBuilt >= 1) {
            stoneContainer.style.display = "block";
        } else if (game.stone > 0) {
            stoneContainer.style.display = "block";
        } else {
            stoneContainer.style.display = "none";
        }
    }

    // Food
    if (foodContainer && foodValue && foodRate) {
        foodValue.innerText = game.food;
        if (game.Shelter >= 1 || game.food > 0) {
            foodContainer.style.display = "block";
        } else {
            foodContainer.style.display = "none";
        }
        const foodDrainRate = (game.followers * game.followerHungerDrain) / game.foodHungerGain;
        if (game.hungerPercent < 100 && game.food > 0) {
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
            const hungerDrainRate = game.followers * game.followerHungerDrain;
            if (game.food > 0 && game.hungerPercent < 100) {
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
    if (game.faith < game.gatherFoodFaithCost) return;
    game.faith -= game.gatherFoodFaithCost;
    const min = game.followers * game.gatherFoodMinMultiplier;
    const max = game.followers * game.gatherFoodMaxMultiplier;
    const amount = Math.random() * (max - min) + min;
    // always give at least one unit of food
    const gained = Math.max(1, Math.floor(amount));
    game.food += gained;
    addLog(`A hunt yielded ${gained} food.`);
    updateUI();
}


// Pray button
function pray() {
    game.faith += game.prayAmt;
    updateUI();
}

// Passive faith gain per tick
function gameTick() {
    game.faith += game.followers * game.faithPerFollower;
    // hunger drains with each follower
    if (game.hungerPercent > 0 && game.hungerVisible) {
        game.hungerPercent -= game.followers * game.followerHungerDrain;
    }
    // refill hunger using food stock
    if (game.food > 0 && game.hungerPercent < 100) {
        const gain = game.foodHungerGain;
        game.hungerPercent = Math.min(100, game.hungerPercent + gain);
        // consume one food unit per gain
        game.food -= 1;
        if (game.food < 0) game.food = 0;
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
    if (game.faith >= game.convertCost) {
        game.faith -= game.convertCost;
        game.followers += 1;
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
        if (game.faith >= 50 && game.ritualCircleBuilt < 1) {
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
            if (game.Shelter >= 1) {
                gatherFoodBtn.style.display = "inline-block";
                // disable if not enough faith to pay cost
                gatherFoodBtn.disabled = game.faith < game.gatherFoodFaithCost;
                // update title with dynamic range
                const min = (game.followers * game.gatherFoodMinMultiplier).toFixed(1);
                const max = (game.followers * game.gatherFoodMaxMultiplier).toFixed(1);
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
        if (max >= 3 && game.followers < max) {
            preachBtn.style.display = "inline-block";
            // disable if not enough resources
            preachBtn.disabled = game.faith < 100 || game.hungerPercent < 10 || game.food < 10;
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
             (game.wood >= game.shelterWoodCost && game.stone >= game.shelterStoneCost))) {
            buildShelterBtn.style.display = "inline-block";
            // mark unlocked once we see it for the first time
            if (!game.shelterBtnUnlocked) {
                game.shelterBtnUnlocked = 1;
            }
            buildShelterBtn.disabled = !(game.wood >= game.shelterWoodCost && game.stone >= game.shelterStoneCost);

            // Update title and label dynamically
            buildShelterBtn.title = `Cost ${game.shelterWoodCost} wood, ${game.shelterStoneCost} stone`;
            buildShelterBtn.innerText = `Build Shelter (${game.shelterWoodCost}/${game.shelterStoneCost})`;
        } else {
            buildShelterBtn.style.display = "none";
        }
    }
}

function getMaxFollowers() {
    const baseCapacity = 1; //starting capacity before shelters
    const shelterCapacity = game.Shelter * 3; //each shelter adds 3 followers capacity
    return baseCapacity + shelterCapacity;
}

// Gather wood
function gatherWood() {
    if (game.faith >= game.gatherWoodFaithCost) {
        game.faith -= game.gatherWoodFaithCost;
        game.wood += game.gatherWoodAmt;
        updateUI();
    }
}

function gatherStone(){
	if(game.faith >= game.gatherStoneFaithCost) {
		game.faith -= game.gatherStoneFaithCost;
		game.stone += game.gatherStoneAmt;
		updateUI();
	}
}

function buildShelter() {
    if (game.wood >= game.shelterWoodCost && game.stone >= game.shelterStoneCost) {
        game.wood -= game.shelterWoodCost;
        game.stone -= game.shelterStoneCost;
        game.Shelter += 1;
        // scale each cost by its own previous value so you can build multiple
        game.shelterWoodCost = Math.floor(game.shelterWoodCost * 1.8);
        game.shelterStoneCost = Math.floor(game.shelterStoneCost * 1.8);
        // reveal hunger meter when first shelter erected
        if (game.Shelter === 1) {
            game.hungerVisible = 1;
        }
        updateUI();
    }
}

// Ritual Circle
const ritualBtn = document.getElementById("buildRitualCircleBtn");
if (ritualBtn) {
    ritualBtn.addEventListener("click", () => {
        if (game.faith >= 50 && game.ritualCircleBuilt < 1) {
            game.faith -= 50;
            game.ritualCircleBuilt = 1;
            game.faithPerFollower += 0.005;
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
	gatherWoodBtn.title = `Cost ${game.gatherWoodFaithCost} faith`;
	gatherWoodBtn.addEventListener("click", gatherWood);
}

const gatherStoneBtn = document.getElementById("gatherStoneBtn");
if (gatherStoneBtn) {
    gatherStoneBtn.title = `Cost ${game.gatherStoneFaithCost} faith`;
    gatherStoneBtn.addEventListener("click", gatherStone);
}

const gatherFoodBtn = document.getElementById("gatherFoodBtn");
if (gatherFoodBtn) {
    gatherFoodBtn.title = `Gather food`;
    gatherFoodBtn.addEventListener("click", gatherFood);
}

const buildShelterBtn = document.getElementById("buildShelterBtn");
if (buildShelterBtn) {
    buildShelterBtn.title = `Cost ${game.shelterWoodCost} wood and ${game.shelterStoneCost} stone`;
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
    if (game.faith < 100 || game.hungerPercent < 10 || game.food < 10 || game.followers >= max) {
        return;
    }
    game.faith -= 100;
    game.hungerPercent = Math.max(0, game.hungerPercent - 10);
    game.food -= 10;
    const success = Math.random() < 0.25;
    if (success) {
        game.followers += 1;
        addLog("Your sermon converted a follower.");
    } else {
        addLog("The sermon failed to sway anyone.");
    }
    updateUI();
}

// Tick
setInterval(gameTick, 1000);
updateUI();
