// ===== GAME STATE =====
const gameState = {
    progression: {
        followers: 1,
        hunters: 0,
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
        shelterStoneCost: 5,
        trainingTechCost: 80,
        hunterBaseCost: 5
    },
    rates: {
        hunterFoodPerSecond: 0.5
    },
    unlocks: {}
};

const game = {
    prayAmt: 10000,
    convertCost: 10,
    ritualCircleBuilt: 0,
    shelter: 0,
    shelterBtnUnlocked: false,
    hungerPercent: 100,
    hungerVisible: false,
    followerHungerDrain: 1,
    foodHungerGain: 1.8,
    // manual feed amount per click
    feedAmount: 10,
    // log message lifetime in seconds; messages fade after this
    logMessageLifetime: 3,
    // fade duration in milliseconds
    logFadeDuration: 500,
    trainingUnlocked: false,
    unlocksTabUnlocked: false,
    hasGatheredFood: false,
    newItems: {actions:0,build:0,food:0,unlocks:0,followerManager:0}
};

let lastHungerWarning = null;

// ===== LOGGING =====
function addLog(msg) {
    const logEl = document.getElementById("log");
    if (!logEl) return;
    const p = document.createElement("p");
    p.innerText = "• " + msg;
    p.style.opacity = '1';
    p.style.transition = `opacity ${game.logFadeDuration}ms ease`;
    logEl.appendChild(p);
    logEl.scrollTop = logEl.scrollHeight;

    // schedule fade and removal
    const lifetimeMs = (game.logMessageLifetime || 3) * 1000;
    setTimeout(() => {
        p.style.opacity = '0';
        setTimeout(() => { if (p.parentElement) p.remove(); }, game.logFadeDuration || 500);
    }, lifetimeMs);
}

// ===== HELPERS =====
function getMaxFollowers() {
    return 1 + game.shelter * 3;
}

// badge helpers
function markNew(el) {
    if (!el) return;
    if (el.dataset.seen === "true") return;
    el.dataset.new = "true";
    // if button and no badge span, create one
    if (el.tagName === 'BUTTON') {
        let badge = el.querySelector('.btn-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'btn-badge';
            badge.style.display = 'inline-block';
            el.appendChild(badge);
        }
        badge.style.display = 'inline-block';
    }
    updateTabBadges();
}

function clearNew(el) {
    if (!el) return;
    el.dataset.seen = "true";
    el.dataset.new = "false";
    const badge = el.querySelector('.btn-badge');
    if (badge) badge.style.display = 'none';
    updateTabBadges();
}

function updateTabBadges() {
    document.querySelectorAll('.tab-btn').forEach(tab => {
        const name = tab.dataset.tab;
        const content = document.getElementById('tab-' + name);
        if (!content) return;
        // count new items (buttons or other elements flagged)
        const items = content.querySelectorAll('[data-new="true"]');
        const count = items.length;
        const tbadge = tab.querySelector('.tab-badge');
        if (tbadge) {
            if (count > 0) {
                tbadge.dataset.count = count;
                tbadge.style.display = 'inline-block';
            } else {
                delete tbadge.dataset.count;
                tbadge.style.display = 'none';
            }
        }
    });
}

// show/hide element and mark new when becoming visible
function setVisible(el, visible) {
    if (!el) return;
    if (visible) {
        if (el.style.display === 'none' || el.style.display === '') {
            // newly shown
            markNew(el);
        }
        el.style.display = 'inline-block';
    } else {
        el.style.display = 'none';
    }
}

// when a button (or element) is affordable/or usable, mark a new dot
// when it transitions from unaffordable->affordable. Also disables the
// element when not affordable.
function setAffordability(el, canAfford) {
    if (!el) return;
    // Initialize affordable state if not set
    if (el.dataset.affordable === undefined) {
        el.dataset.affordable = "false";
    }
    const prev = el.dataset.affordable === "true";
    // disabled state is inverse of affordability
    el.disabled = !canAfford;
    // if we're newly affordable, highlight it
    if (canAfford && !prev) {
        markNew(el);
    }
    el.dataset.affordable = canAfford ? "true" : "false";
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
    if (!game.hasGatheredFood && gameState.resources.food > 0) {
        game.hasGatheredFood = true;
        markNew('food');
    }
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
}

function training() {
    if (game.trainingUnlocked) return; // already bought
    if (gameState.progression.faith < gameState.costs.trainingTechCost) return;
    gameState.progression.faith -= gameState.costs.trainingTechCost;
    game.trainingUnlocked = true;
    addLog('Training program purchased.');
    updateUI();
}

function feedFollowers() {
    if (gameState.resources.food <= 0 || game.hungerPercent >= 100) return;
    gameState.resources.food -= 1;
    game.hungerPercent = Math.min(100, game.hungerPercent + game.feedAmount);
    addLog('You feed the followers. Hunger restored.');
    updateUI();
}

function getHunterTrainingCost() {
    const untrained = gameState.progression.followers - gameState.progression.hunters;
    return untrained * gameState.costs.hunterBaseCost;
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
}

// ======= GAME TICK ======
function gameTick() {
    // Gain faith per follower
    gameState.progression.faith += gameState.progression.followers * gameState.progression.faithPerFollower;

    // ===== HUNGER =====
if (game.hungerVisible) {
    const drain = gameState.progression.followers * game.followerHungerDrain;
    const hunterGain = gameState.progression.hunters * gameState.rates.hunterFoodPerSecond * game.feedAmount;

    // Net change per tick
    const netHungerChange = hunterGain - drain;

    // Apply net change
    game.hungerPercent += netHungerChange;

    // Clamp
    game.hungerPercent = Math.max(0, Math.min(100, game.hungerPercent));

    // Warnings
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
        const drain = gameState.progression.followers * game.followerHungerDrain;
        const hunterRate = gameState.progression.hunters * gameState.rates.hunterFoodPerSecond * game.feedAmount;
        const netRate = hunterRate - drain; // matches actual tick
        rateEl.innerText = netRate >= 0
            ? `(+${netRate.toFixed(3)}/s)`
            : `(${netRate.toFixed(3)}/s)`;
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
    hungerContainer.style.display = "block";

    // Set the actual hunger percent
    hungerValue.innerText = game.hungerPercent.toFixed(2) + "%";

    // Calculate rate exactly as per gameTick
    const drain = gameState.progression.followers * game.followerHungerDrain;
    const hunterGain = gameState.progression.hunters * gameState.rates.hunterFoodPerSecond * game.feedAmount;
    const netRate = hunterGain - drain;
    hungerRate.innerText = netRate >= 0 ? `(+${netRate.toFixed(2)}/s)` : `(${netRate.toFixed(2)}/s)`;
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
        if (gameState.progression.faith >= 50 && bRit.dataset.unlocked !== "true") {
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
            gF.dataset.unlocked = "true";
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
            const canAffordPreach = gameState.progression.faith >= 100 && game.hungerPercent >= 10 && gameState.resources.food >= 10;
            setAffordability(pBtn, canAffordPreach);
            pBtn.title = `Cost 100 faith, 10% hunger, 10 food`;
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

// ===== DOM LOADED =====
document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    const buttons = [
        ["prayBtn", pray],
        ["gatherWoodBtn", gatherWood],
        ["gatherStoneBtn", gatherStone],
        ["gatherFoodBtn", gatherFood],
        ["buildShelterBtn", buildShelter],
        ["preachBtn", preach],
        ["trainingTechBtn", training],
        ["feedFollowersBtn", feedFollowers],
        ["trainHuntersBtn", trainHunters],
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
        if (el) {
            el.addEventListener("click", fn);
            // hover listener to clear new indicator
            el.addEventListener('mouseenter', () => {
                if (el.dataset.new === 'true') clearNew(el);
            });
        }
    });

    setInterval(gameTick, 1000);
    updateUI();
});

// ===== TABS =====
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    function activate(tabName) {
        tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
        tabContents.forEach(c => c.style.display = (c.id === `tab-${tabName}`) ? 'block' : 'none');
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => activate(btn.dataset.tab));
    });

    // default active tab: actions
    activate('actions');
}

function showTabs() {
    const tabs = document.querySelector('.tabs');
    if (!tabs) return;
    if (tabs.style.display === 'block') return;
    tabs.style.display = 'block';

    // move pray button into actions tab if present
    const pray = document.getElementById('prayBtn');
    const actions = document.getElementById('tab-actions');
    if (pray && actions && pray.parentElement !== actions) {
        actions.insertBefore(pray, actions.firstChild);
    }

    // ensure Actions tab selected
    const actionsBtn = document.querySelector('.tab-btn[data-tab="actions"]');
    if (actionsBtn) actionsBtn.classList.add('active');
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(c => c.style.display = (c.id === 'tab-actions') ? 'block' : 'none');
}

function hideTabs() {
    const tabs = document.querySelector('.tabs');
    if (!tabs) return;
    if (tabs.style.display === 'none') return;
    tabs.style.display = 'none';

    // move pray button back to main actions container
    const pray = document.getElementById('prayBtn');
    const main = document.getElementById('mainActions');
    if (pray && main && pray.parentElement !== main) {
        main.appendChild(pray);
    }
}
