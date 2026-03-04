import { Resource } from './Resource.js';
import { createRoleCountMap, createRoleUnlockMap, createRoleAccumulatorMap } from '../config/roles.js';

// ===== GAME STATE =====
export const gameState = {
    progression: {
        followers: 0,
        hunters: 0,
        ritualists: 0,
        gatherers: 0,
        cooks: 0,
        roles: createRoleCountMap(0),
        faith: 0,
        faithPerFollower: 0.02,
        prophet: 0
    },
    resources: {
        wood: new Resource('wood', 0, 8, 5,() => {
            return gameState.gathering.manualGatherBaseAmount + (game.shelter * gameState.gathering.manualGatherShelterBonus);
        }),
        stone: new Resource('stone', 0, 8, 5,() => {
            return gameState.gathering.manualGatherBaseAmount + (game.shelter * gameState.gathering.manualGatherShelterBonus);
        }),
        food: new Resource('food', 0, 5, 5,() => {
            const min = gameState.gathering.gatherFoodMinMultiplier;
            const max = gameState.gathering.gatherFoodMaxMultiplier;
            return Math.max(1, Math.floor(Math.random() * (max - min) + min));
        })
    },
    gathering: {
        manualGatherBaseAmount: 1,
        manualGatherShelterBonus: 2,
        gatherFoodMinMultiplier: 1,
        gatherFoodMaxMultiplier: 3
    },
    costs: {
        shelterWoodCost: 15,
        shelterStoneCost: 15,
        trainingTechCost: 50,
        hunterBaseCost: 20,
        ritualistBaseCost: 30,
        gathererBaseCost: 25,
        cookBaseCost: 28,
        manualFeedFoodCost: 100,
        ritualBtnCost: 10,
        preachFaithCost: 1,
        unlockHuntersFaithCost: 40,
        unlockRitualistsFaithCost: 75,
        unlockGatherersFaithCost: 60,
        unlockCooksFaithCost: 85,
        unlockShelterUpgradeFaithCost: 180,
        unlockAltarFaithCost: 0,
        altarBuildWoodCost: 150,
        altarBuildStoneCost: 150,
        altarBuildFaithCost: 200
    },
    rates: {
        hunterFoodPerSecond: 0.8,
        ritualistFaithPerSecond: 0.1,
        gathererWoodPerSecond: 0.25,
        gathererStonePerSecond: 0.20,
        cookFlatHungerGainPerSecond: 0.2,
        cookHungerDrainReductionPerCook: 0.0,
        cookHungerGainBonusPerCook: 5
    },
    runtime: {
        roleAccumulators: createRoleAccumulatorMap(0),
        autoSaveAccumulator: 0
    },
    unlocks: {}
};

export const game = {
    prayAmt: 1,
    convertCost: 10,
    ritualCircleBuilt: 0,
    shelter: 0,
    shelterCostScalePerBuilt: 1.1,
    shelterCapacityPerShelter: 3,
    shelterCapacityMultiplier: 1,
    shelterUpgradeUnlocked: false,
    altarUnlocked: false,
    altarBuilt: false,
    shelterUpgradeFollowerRequirement: 30,
    shelterBtnUnlocked: false,
    hungerPercent: 100,
    hungerVisible: false,
    followerFoodPerSecond: 0.12,
    hungerDrainPerFoodDeficit: 4,
    stability: 100,
    stabilityGainPerSecondWhenFed: 0.04,
    stabilityDrainPerFoodDeficit: 2,
    stabilityWeakHungerThreshold: 20,
    stabilityCriticalHungerThreshold: 5,
    stabilityWeakDrainPerSecond: 0.03,
    stabilityCriticalDrainPerSecond: 0.08,
    followerHungerDrain: 0.25,
    autoFeedFoodPerSecond: 0.15,
    foodHungerGain: 0.15,
    feedAmount: 10,     // manual feed amount per click
    logMessageLifetime: 6,  // log message lifetime in seconds; messages fade after this
    logFadeDuration: 500,   // fade duration in milliseconds
    trainingUnlocked: false,
    roleUnlocks: createRoleUnlockMap(false),
    roleBulkAssignAmount: 1,
    unlocksTabUnlocked: false,
    hasGatheredFood: false,
    preachOutcomeWeights: [45, 30, 18, 7], // converts 1..4
    diceBonuses: {
        preach: 0
    },
    seenItems: {},
    newItems: {actions:0,build:0,food:0,unlocks:0,followerManager:0},
    lastHungerWarning: null
};