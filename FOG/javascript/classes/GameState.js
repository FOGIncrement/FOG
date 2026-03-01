// ===== GAME STATE =====
const gameState = {
    progression: {
        followers: 1,
        hunters: 0,
        faith: 0,
        faithPerFollower: 0.02,
        prophet: 0
    },
    resources: {
        wood: 0,
        stone: 0,
        food: 0
    },
    gathering: {
        gatherWoodAmt: 5,
        gatherStoneAmt: 5,
        gatherFoodMinMultiplier: 10,
        gatherFoodMaxMultiplier: 25
    },
    costs: {
        gatherFoodFaithCost: 5,
        gatherWoodFaithCost: 8,
        gatherStoneFaithCost: 8,
        shelterWoodCost: 15,
        shelterStoneCost: 15,
        trainingTechCost: 50,
        hunterBaseCost: 20,
        ritualBtnCost: 50,
        preachFaithCost: 60
    },
    rates: {
        hunterFoodPerSecond: 2
    },
    unlocks: {}
};

const game = {
    prayAmt: 1,
    convertCost: 10,
    ritualCircleBuilt: 0,
    shelter: 0,
    shelterBtnUnlocked: false,
    hungerPercent: 100,
    hungerVisible: false,
    followerHungerDrain: 0.06,
    foodHungerGain: 0.15,
    feedAmount: 10,     // manual feed amount per click
    logMessageLifetime: 3,  // log message lifetime in seconds; messages fade after this
    logFadeDuration: 500,   // fade duration in milliseconds
    trainingUnlocked: false,
    unlocksTabUnlocked: false,
    hasGatheredFood: false,
    newItems: {actions:0,build:0,food:0,unlocks:0,followerManager:0}
};

let lastHungerWarning = null;