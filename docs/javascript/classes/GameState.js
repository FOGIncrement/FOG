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
        prophet: 0,
        prophetSway: 12
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
        manualGatherBaseAmount: 5,
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
        prophetBaseCost: 0,
        ritualBtnCost: 10,
        preachFaithCost: 1,
        expeditionRollFaithCost: 50,
        unlockHuntersFaithCost: 40,
        unlockRitualistsFaithCost: 75,
        unlockGatherersFaithCost: 60,
        unlockCooksFaithCost: 85,
        unlockProphetFaithCost: 500,
        unlockExplorationFaithCost: 650,
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
    shelterCapacityPerShelter: 3,
    shelterCapacityMultiplier: 1,
    shelterCostScalePerBuilt: 0.1,
    shelterUpgradeUnlocked: false,
    altarUnlocked: false,
    altarBuilt: false,
    shelterUpgradeFollowerRequirement: 30,
    shelterBtnUnlocked: false,
    hungerPercent: 100,
    hungerVisible: false,
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
    prophetUnlocked: false,
    prophetUnlockCapacityRequirement: 150,
    explorationUnlocked: false,
    exploration: {
        followerSendLimit: 10,
        activeExpedition: null,
        totalMetersExplored: 0,
        villageSpawnChance: 0.2,
        hazardWipeoutChance: 0.08,
        hazardHeavyLossChance: 0.17,
        hazardAmbushChance: 0.20,
        hazardHeavyLossFraction: 0.5,
        hazardAmbushMinLossPercent: 20,
        hazardAmbushMaxLossPercent: 60,
        prophetHeavyLossDeathChance: 0.5,
        wildAreaDiscoveryChance: 0.12,
        wildAreaSeedCount: 8,
        wildAreaDistanceMinStep: 30,
        wildAreaDistanceMaxStep: 120,
        wildAreaResourceCacheChance: 0.45,
        wildAreaResourceCacheWoodMin: 80,
        wildAreaResourceCacheWoodMax: 220,
        wildAreaResourceCacheStoneMin: 70,
        wildAreaResourceCacheStoneMax: 200,
        wildAreaFaithPerFollowerBonusChance: 0.2,
        wildAreaFaithPerFollowerBonusMin: 0.001,
        wildAreaFaithPerFollowerBonusMax: 0.006,
        wildAreaHungerDrainPenaltyChance: 0.18,
        wildAreaHungerDrainPenaltyMin: 0.01,
        wildAreaHungerDrainPenaltyMax: 0.05,
        discoveredAreas: (() => {
            const areas = [];
            let distance = 0;
            const seedCount = 8;
            const minStep = 30;
            const maxStep = 120;
            const resourceCacheChance = 0.45;
            const faithBonusChance = 0.2;
            const hungerPenaltyChance = 0.18;
            for (let i = 1; i <= seedCount; i += 1) {
                const step = i === 1 ? 10 : Math.floor(Math.random() * (maxStep - minStep + 1)) + minStep;
                distance += Math.max(1, step);

                let resourceCache = null;
                if (Math.random() < resourceCacheChance) {
                    resourceCache = {
                        wood: Math.floor(Math.random() * (220 - 80 + 1)) + 80,
                        stone: Math.floor(Math.random() * (200 - 70 + 1)) + 70,
                        collected: false
                    };
                }

                let passiveEffect = null;
                if (Math.random() < faithBonusChance) {
                    passiveEffect = {
                        type: 'faithPerFollowerBonus',
                        amount: Number((Math.random() * (0.006 - 0.001) + 0.001).toFixed(4)),
                        applied: false
                    };
                } else if (Math.random() < hungerPenaltyChance) {
                    passiveEffect = {
                        type: 'hungerDrainPenalty',
                        amount: Number((Math.random() * (0.05 - 0.01) + 0.01).toFixed(4)),
                        applied: false
                    };
                }

                areas.push({
                    id: `wild-area-${i}`,
                    name: `Wild Area ${i}`,
                    distanceFromCamp: distance,
                    discovered: false,
                    discoveredAtMeters: null,
                    resourceCache,
                    passiveEffect
                });
            }
            return areas;
        })(),
        villages: [
            {
                id: 'village-1',
                name: 'First Village',
                distanceFromCamp: 500,
                population: 1500,
                resistance: 42,
                convertedPercent: 0,
                discovered: false,
                sermonsHeld: 0,
                prophetPresent: false
            }
        ],
        villageDistanceRange: {
            min: Math.floor(Math.random() * 201) + 350,
            max: Math.floor(Math.random() * 251) + 700
        },
        nextVillageIndex: 2,
        nextAreaIndex: 1
    },
    seenItems: {},
    newItems: {actions:0,build:0,food:0,unlocks:0,followerManager:0},
    lastHungerWarning: null
};