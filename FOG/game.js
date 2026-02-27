// ===== GAME STATE =====
const gameState = {
    progression: {
        followers: 1,
        faith: 0,
        faithPerFollower: 0.01,
        prophet: 0
    },
    resources: {
        wood: 0,
        stone: 0,
        food: 0
    },
    gathering: {
        gatherWoodAmt: 10,
        gatherStoneAmt: 10,
        gatherFoodMinMultiplier: 25,
        gatherFoodMaxMultiplier: 55
    },
    costs: {
        gatherFoodFaithCost: 10,
        gatherWoodFaithCost: 20,
        gatherStoneFaithCost: 20,
        shelterWoodCost: 5,
        shelterStoneCost: 5
    },
    unlocks: {}
};

const game = {
    prayAmt: 100,
    convertCost: 10,
    ritualCircleBuilt: 0,
    shelter: 0,
    shelterBtnUnlocked: false,
    hungerPercent: 100,
    hungerVisible: false,
    followerHungerDrain: 0.1,
    foodHungerGain: 0.5
};

let lastHungerWarning = null;

// ===== LOGGING =====
function addLog(msg) {
    const logEl = document.getElementById("log");
    if (!logEl) return;
    const p = document.createElement("p");
    p.innerText = "• " + msg;
    logEl.appendChild(p);
    logEl.scrollTop = logEl.scrollHeight;
}

// ===== HELPERS =====
function getMaxFollowers() {
    return 1 + game.shelter * 3;
}

// ===== CORE FUNCTIONS =====
function gatherWood() {
    if (gameState.progression.faith >= gameState.costs.gatherWoodFaithCost) {
        gameState.progression.faith -= gameState.costs.gatherWoodFaithCost;
        gameState.resources.wood += gameState.gathering.gatherWoodAmt;
        updateUI();
    }
}

function gatherStone() {
    if (gameState.progression.faith >= gameState.costs.gatherStoneFaithCost) {
        gameState.progression.faith -= gameState.costs.gatherStoneFaithCost;
        gameState.resources.stone += gameState.gathering.gatherStoneAmt;
        updateUI();
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
    updateUI();
}

function pray() {
    gameState.progression.faith += game.prayAmt;
    updateUI();
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
    }
}

function convertFollower() {
    if (gameState.progression.faith >= game.convertCost) {
        gameState.progression.faith -= game.convertCost;
        gameState.progression.followers += 1;
        game.convertCost = Math.floor(game.convertCost * 1.15);
        updateUI();
    }
}

function preach() {
    const max = getMaxFollowers();
    if (gameState.progression.faith < 100 || game.hungerPercent < 10 ||
        gameState.resources.food < 10 || gameState.progression.followers >= max) return;

    gameState.progression.faith -= 100;
    game.hungerPercent = Math.max(0, game.hungerPercent - 10);
    gameState.resources.food -= 10;

    const success = Math.random() < 0.25;
    if (success) gameState.progression.followers += 1;
    addLog(success ? "Your sermon converted a follower." : "The sermon failed to sway anyone.");

    updateUI();
}

// ===== TICK =====
function gameTick() {
    gameState.progression.faith += gameState.progression.followers * gameState.progression.faithPerFollower;

    if (game.hungerPercent > 0 && game.hungerVisible) {
        game.hungerPercent -= gameState.progression.followers * game.followerHungerDrain;
    }

    if (gameState.resources.food > 0 && game.hungerPercent < 100) {
        const gain = game.foodHungerGain;
        game.hungerPercent = Math.min(100, game.hungerPercent + gain);
        gameState.resources.food -= 1;
        if (gameState.resources.food < 0) gameState.resources.food = 0;
    }

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

// ===== UI UPDATE =====
function updateUI() {
    const followersEl = document.getElementById("followers");
    const faithEl = document.getElementById("faith");

    if (followersEl) followersEl.innerText = `${gameState.progression.followers}/${getMaxFollowers()}`;
    if (faithEl) faithEl.innerText =
        `${gameState.progression.faith.toFixed(2)} (+${(gameState.progression.followers * gameState.progression.faithPerFollower).toFixed(3)}/s)`;

    ["wood", "stone", "food"].forEach(type => {
        const container = document.getElementById(type + "Container");
        const value = document.getElementById(type + "Value");
        if (!container || !value) return;

        value.innerText = gameState.resources[type];

        if (type === "wood" || type === "stone") {
            container.style.display = (game.ritualCircleBuilt >= 1 || gameState.resources[type] > 0) ? "block" : "none";
        } else if (type === "food") {
            container.style.display = (game.shelter >= 1 || gameState.resources.food > 0) ? "block" : "none";
        }
    });

    const hungerContainer = document.getElementById("hungerContainer");
    const hungerValue = document.getElementById("hungerValue");
    const hungerRate = document.getElementById("hungerRate");
    if (hungerContainer && hungerValue && hungerRate) {
        hungerValue.innerText = `${game.hungerPercent.toFixed(2)}%`;
        hungerContainer.style.display = game.hungerVisible ? "block" : "none";

        if (game.hungerVisible) {
            const drain = gameState.progression.followers * game.followerHungerDrain;
            hungerRate.innerText = (gameState.resources.food > 0 && game.hungerPercent < 100) ? `(${(drain - game.foodHungerGain).toFixed(2)}/s)` : `(-${drain.toFixed(1)}/s)`;
        }
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

    // Ritual Circle
    if (bRit) {
        bRit.style.display = "inline-block";
        bRit.disabled = game.ritualCircleBuilt >= 1;
        bRit.innerText = `Ritual Circle ${game.ritualCircleBuilt}/1`;
    }

    // Gather buttons unlock permanently after circle
    if (gW && gS) {
        gW.style.display = gS.style.display = (game.ritualCircleBuilt >= 1) ? "inline-block" : "none";
        gW.disabled = gS.disabled = false;
        gW.title = `Cost ${gameState.costs.gatherWoodFaithCost} faith`;
        gS.title = `Cost ${gameState.costs.gatherStoneFaithCost} faith`;
    }

    // Gather Food unlocks permanently after first shelter
    if (gF) {
        if (game.shelter >= 1 || gF.dataset.unlocked === "true") {
            gF.style.display = "inline-block";
            gF.disabled = gameState.progression.faith < gameState.costs.gatherFoodFaithCost;
            const min = (gameState.progression.followers * gameState.gathering.gatherFoodMinMultiplier).toFixed(1);
            const max = (gameState.progression.followers * gameState.gathering.gatherFoodMaxMultiplier).toFixed(1);
            gF.title = `Gather Food (${min}-${max})`;
            gF.dataset.unlocked = "true";
        } else {
            gF.style.display = "none";
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
            bS.style.display = "inline-block";
            bS.disabled = !(gameState.resources.wood >= gameState.costs.shelterWoodCost &&
                            gameState.resources.stone >= gameState.costs.shelterStoneCost);
            bS.innerText = `Build shelter (${gameState.costs.shelterWoodCost}/${gameState.costs.shelterStoneCost})`;
            bS.title = `Cost ${gameState.costs.shelterWoodCost} wood and ${gameState.costs.shelterStoneCost} stone`;
        } else {
            bS.style.display = "none";
        }
    }

    // Preach
    if (pBtn) {
        const max = getMaxFollowers();
        if (max >= 3 && gameState.progression.followers < max) {
            pBtn.style.display = "inline-block";
            pBtn.disabled = gameState.progression.faith < 100 || game.hungerPercent < 10 || gameState.resources.food < 10;
            pBtn.title = `Preach (100 faith, 10% hunger, 10 food) - 25% success`;
        } else pBtn.style.display = "none";
    }
}

// ===== DOM LOADED =====
document.addEventListener("DOMContentLoaded", () => {
    const buttons = [
        ["prayBtn", pray],
        ["gatherWoodBtn", gatherWood],
        ["gatherStoneBtn", gatherStone],
        ["gatherFoodBtn", gatherFood],
        ["buildShelterBtn", buildShelter],
        ["preachBtn", preach],
        ["buildRitualCircleBtn", () => {
            if (gameState.progression.faith >= 50 && game.ritualCircleBuilt < 1) {
                gameState.progression.faith -= 50;
                game.ritualCircleBuilt = 1;
                gameState.progression.faithPerFollower += 0.005;
                updateUI();
            }
        }]
    ];

    buttons.forEach(([id, fn]) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("click", fn);
    });

    setInterval(gameTick, 1000);
    updateUI();
});
