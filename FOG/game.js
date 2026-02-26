let game = {
    followers: 1,
    faith: 48.00,
    prayAmt: 1,
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
	gatherStoneFaithCost: 20
};

// Update UI and button visibility
function updateUI() {

    const followersEl = document.getElementById("followers");
    const faithEl = document.getElementById("faith");
    const convertBtn = document.getElementById("convertBtn");
    const exploreBtn = document.getElementById("exploreBtn");

    const woodContainer = document.getElementById("woodContainer");
    const woodValue = document.getElementById("woodValue");

    const stoneContainer = document.getElementById("stoneContainer");
    const stoneValue = document.getElementById("stoneValue");

    if (followersEl) {
        followersEl.innerText = game.followers;
    }

    if (faithEl) {
        faithEl.innerText =
            `${game.faith.toFixed(2)} (+${(game.followers * game.faithPerFollower).toFixed(3)}/s)`;
    }

    if (convertBtn) {
        convertBtn.innerText = `Convert Follower (${game.convertCost})`;
    }

    if (exploreBtn) {
        exploreBtn.innerText = `Explore (${game.exploreCost})`;
    }

    // Wood
    if (woodContainer && woodValue) {
        if (game.wood > 0) {
            woodContainer.style.display = "block";
            woodValue.innerText = game.wood;
        } else {
            woodContainer.style.display = "none";
        }
    }

    // Stone
    if (stoneContainer && stoneValue) {
        if (game.stone > 0) {
            stoneContainer.style.display = "block";
            stoneValue.innerText = game.stone;
        } else {
            stoneContainer.style.display = "none";
        }
    }

    updateButtons();
}

// Pray button
function pray() {
    game.faith += game.prayAmt;
    updateUI();
}

// Passive faith gain per tick
function gameTick() {
    game.faith += game.followers * game.faithPerFollower;
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
    if (gatherWoodBtn && gatherStoneBtn) {
        if (game.ritualCircleBuilt >= 1) {
            gatherWoodBtn.style.display = "inline-block";
            gatherWoodBtn.disabled = false;

            gatherStoneBtn.style.display = "inline-block";
            gatherStoneBtn.disabled = false;
        } else {
            gatherWoodBtn.style.display = "none";
            gatherStoneBtn.style.display = "none";
        }
    }
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
if (prayBtn) prayBtn.addEventListener("click", pray);

const convertBtn = document.getElementById("convertBtn");
if (convertBtn) convertBtn.addEventListener("click", convertFollower);

const gatherWoodBtn = document.getElementById("gatherWoodBtn");
if (gatherWoodBtn) gatherWoodBtn.addEventListener("click", gatherWood);

const gatherStoneBtn = document.getElementById("gatherStoneBtn");
if (gatherStoneBtn) gatherStoneBtn.addEventListener("click", gatherStone);

// Tick
setInterval(gameTick, 1000);
updateUI();