import { Resource } from './Resource.js';

// ===== GAME STATE =====
export const gameState = {
    progression: {
        followers: 1,
        hunters: 0,
        ritualists: 0,
        gatherers: 0,
        cooks: 0,
        faith: 0,
        faithPerFollower: 0.02,
        prophet: 0
    },
    resources: {
        wood: new Resource('wood', 0, 8, 5),
        stone: new Resource('stone', 0, 8, 5),
        food: new Resource('food', 0, 5, () => {
            const min = gameState.gathering.gatherFoodMinMultiplier;
            const max = gameState.gathering.gatherFoodMaxMultiplier;
            return Math.max(1, Math.floor(Math.random() * (max - min) + min));
        })
    },
    gathering: {
        gatherFoodMinMultiplier: 1,
        gatherFoodMaxMultiplier: 10
    },
    costs: {
        shelterWoodCost: 15,
        shelterStoneCost: 15,
        trainingTechCost: 50,
        hunterBaseCost: 20,
        ritualistBaseCost: 30,
        gathererBaseCost: 25,
        cookBaseCost: 28,
        ritualBtnCost: 50,
        preachFaithCost: 1,
        unlockHuntersFaithCost: 40,
        unlockRitualistsFaithCost: 75,
        unlockGatherersFaithCost: 60,
        unlockCooksFaithCost: 85
    },
    rates: {
        hunterFoodPerSecond: 1,
        ritualistFaithPerSecond: 0.03,
        gathererWoodPerSecond: 0.25,
        gathererStonePerSecond: 0.20,
        cookFlatHungerGainPerSecond: 0.2,
        cookHungerDrainReductionPerCook: 0.0,
        cookHungerGainBonusPerCook: 5
    },
    unlocks: {}
};

export const game = {
    prayAmt: 1000,
    convertCost: 10,
    ritualCircleBuilt: 0,
    shelter: 0,
    shelterBtnUnlocked: false,
    hungerPercent: 100,
    hungerVisible: false,
    followerHungerDrain: 0.06,
    autoFeedFoodPerSecond: 0.15,
    foodHungerGain: 0.15,
    feedAmount: 10,     // manual feed amount per click
    logMessageLifetime: 3,  // log message lifetime in seconds; messages fade after this
    logFadeDuration: 500,   // fade duration in milliseconds
    trainingUnlocked: false,
    roleUnlocks: {
        hunters: false,
        ritualists: false,
        gatherers: false,
        cooks: false
    },
    roleBulkAssignAmount: 1,
    unlocksTabUnlocked: false,
    hasGatheredFood: false,
    preachOutcomeWeights: [45, 30, 18, 7], // converts 1..4
    seenItems: {},
    newItems: {actions:0,build:0,food:0,unlocks:0,followerManager:0},
    lastHungerWarning: null
};