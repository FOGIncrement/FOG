import { Resource } from './Resource.js';
import { createRoleCountMap, createRoleUnlockMap, createRoleAccumulatorMap } from '../config/roles.js';
import { createFactionFavorMap } from '../config/factions.js';
import { createDoctrineChoiceMap } from '../config/doctrines.js';
import { createAscensionUpgradeRankMap } from '../config/ascension.js';
import { createFavorTierClaimedMap } from '../config/favor-tiers.js';
import { createGoodsCountMap } from '../config/trade-settlements.js';

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
        prophetSway: 12,
        starlight: 0,
        goods: createGoodsCountMap(0)
    },
    resources: {
        wood: new Resource('wood', 0, 8, 5,() => {
            return gameState.gathering.manualGatherBaseAmount + (game.shelter * gameState.gathering.manualGatherShelterBonus);
        }, 2000),
        stone: new Resource('stone', 0, 8, 5,() => {
            return gameState.gathering.manualGatherBaseAmount + (game.shelter * gameState.gathering.manualGatherShelterBonus);
        }, 2000),
        food: new Resource('food', 0, 5, 5,() => {
            const min = gameState.gathering.gatherFoodMinMultiplier;
            const max = gameState.gathering.gatherFoodMaxMultiplier;
            return Math.max(1, Math.floor(Math.random() * (max - min) + min));
        }, 1000)
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
        preachFaithCost: 20,
        expeditionRollFaithCost: 50,
        holdSermonFaithCost: 5,
        conquerVillageFaithCost: 8,
        unlockHuntersFaithCost: 40,
        unlockRitualistsFaithCost: 75,
        unlockGatherersFaithCost: 60,
        unlockCooksFaithCost: 85,
        unlockFarmersFaithCost: 95,
        unlockScribesFaithCost: 350,
        unlockProphetFaithCost: 500,
        unlockExplorationFaithCost: 650,
        unlockShelterUpgradeFaithCost: 180,
        unlockAltarFaithCost: 0,
        altarBuildWoodCost: 150,
        altarBuildStoneCost: 150,
        altarBuildFaithCost: 200,
        expandPartyBaseCost: 100,
        expeditionTrainingBaseCost: 80,
        zealousPreachingBaseCost: 60,
        blessHarvestFaithCost: 150,
        blessHarvestWoodCost: 100,
        blessHarvestStoneCost: 100,
        helOfferingFaithCost: 20,
        councilFaithCost: 100,
        templeFaithCost: 2000,
        templeWoodCost: 800,
        templeStoneCost: 800,
        unlockWorldsFaithCost: 5000,
        chartWorldStarlightBaseCost: 500,
        chartWorldFaithBaseCost: 2000,
        worldExpeditionRollFaithBaseCost: 60,
        worldSermonFaithBaseCost: 8,
        worldConquerFaithBaseCost: 15,
        echoingFaithBaseEchoesCost: 10,
        swiftFoundationsBaseEchoesCost: 15,
        starlitMemoryBaseEchoesCost: 25,
        undyingFlockBaseEchoesCost: 20,
        storehouseFaithCost: 120,
        granaryWoodCost: 60,
        granaryStoneCost: 60,
        scriptoriumBaseCost: 100,
        farmerBaseCost: 26,
        scribeBaseCost: 45,
        watchtowerWoodCost: 150,
        watchtowerStoneCost: 150,
        barracksWoodCost: 200,
        barracksStoneCost: 150,
        wellWoodCost: 80,
        wellStoneCost: 40,
        marketplaceWoodCost: 250,
        marketplaceStoneCost: 250,
        marketplaceTradeWoodCost: 150,
        marketplaceTradeStoneCost: 150,
        monumentFaithCost: 4000,
        monumentWoodCost: 1500,
        monumentStoneCost: 1500,
        digWellVillageWoodCost: 60,
        digWellVillageStoneCost: 60,
        holdFeastVillageFoodCost: 80,
        settlementBuyResourceFaithCost: 30,
        settlementSellResourceFaithYield: 25,
        settlementBuyGoodFaithCost: 250,
        hirePilgrimsBaseFaithCost: 500,
        pacifyOutpostFaithCost: 100,
        catechismHallFaithCost: 300,
        catechismHallWoodCost: 200,
        warCampFaithCost: 250,
        warCampWoodCost: 300,
        warCampStoneCost: 300
    },
    rates: {
        hunterFoodPerSecond: 2.0,
        ritualistFaithPerSecond: 0.1,
        gathererWoodPerSecond: 0.25,
        gathererStonePerSecond: 0.20,
        cookFlatHungerGainPerSecond: 0.2,
        cookHungerDrainReductionPerCook: 0.0,
        cookHungerGainBonusPerCook: 5,
        farmerFoodPerSecond: 1.2
    },
    runtime: {
        roleAccumulators: createRoleAccumulatorMap(0),
        autoSaveAccumulator: 0
    },
    unlocks: {}
};

export const game = {
    prayAmt: 1,
    ambientFaithPerSecond: 0.05,
    convertCost: 10,
    ritualCircleBuilt: 0,
    shelter: 0,
    shelterCapacityPerShelter: 3,
    shelterCapacityMultiplier: 1,
    shelterCostScalePerBuilt: 0.1,
    roleCostGrowthRate: 1.05,
    upgradeCostGrowthRate: 1.3,
    upgradeMaxPurchases: 10,
    expandPartyFollowerIncrease: 5,
    expeditionTrainingHazardMultiplier: 0.9,
    zealousPreachingPurchases: 0,
    shelterUpgradeUnlocked: false,
    altarUnlocked: false,
    altarBuilt: false,
    shelterUpgradeFollowerRequirement: 30,
    shelterUpgradeCostMultiplier: 0.7,
    shelterBtnUnlocked: false,
    hungerPercent: 100,
    hungerVisible: false,
    followerFoodConsumptionPerSecond: 0.25,
    hungerStarvationDrainPerSecond: 3,
    offlineProgressMaxHours: 8,
    autoFeedFoodPerSecond: 0.15,
    foodHungerGain: 0.15,
    feedAmount: 10,     // manual feed amount per click
    logMessageLifetime: 6,  // log message lifetime in seconds; messages fade after this
    logFadeDuration: 500,   // fade duration in milliseconds
    alignment: 0,
    alignmentVisible: false,
    alignmentPreachGain: 1,
    heliosFavorPreachGain: 1,
    alignmentConvertGain: 1,
    heliosFavorConvertGain: 1,
    alignmentConquerLoss: 1,
    sekhmetFavorConquerGain: 1,
    danuBlessingUnlocked: false,
    danuBlessingMultiplier: 1.2,
    alignmentBlessHarvestGain: 5,
    danuFavorBlessHarvestGain: 10,
    helOfferingFollowerCost: 3,
    helOfferingFaithRefund: 30,
    alignmentHelOfferingLoss: 5,
    helFavorOfferingGain: 10,
    factionFavor: createFactionFavorMap(0),
    factionFavorTiersSeen: createFavorTierClaimedMap(0),
    heliosFavorCostReductionPerTier: 0.05,
    heliosFavorCapacityBonusPerTier: 0.05,
    sekhmetFavorYieldBonusPerTier: 0.08,
    sekhmetFavorHazardReductionPerTier: 0.03,
    danuFavorOutputBonusPerTier: 0.06,
    danuFavorCapBonusPerTier: 0.08,
    helFavorConsumptionReductionPerTier: 0.04,
    helFavorStarlightBonusPerTier: 0.10,
    helFavorEchoesBonusPerTier: 0.08,
    doctrinesUnlocked: false,
    doctrineChoices: createDoctrineChoiceMap(null),
    councilFollowerRequirement: 10,
    shepherdsCreedCostMultiplier: 0.85,
    ironFistYieldMultiplier: 1.25,
    ironFistCostMultiplier: 0.9,
    homesteadOutputMultiplier: 1.2,
    wanderlustRollBonus: 2,
    wanderlustCostMultiplier: 0.9,
    abundantTableConsumptionMultiplier: 0.75,
    leanYearsConsumptionMultiplier: 0.5,
    leanYearsStarvationMultiplier: 2.5,
    stonemasonsCostMultiplier: 0.85,
    quarryRushOutputMultiplier: 1.3,
    zealousHandsYieldMultiplier: 1.5,
    quietFaithFollowerMultiplier: 1.25,
    quietFaithRitualistMultiplier: 1.25,
    temple: { built: false, godId: null },
    templeFollowerRequirement: 100,
    templeFavorRequirement: 200,
    templeAlignmentShift: 15,
    templeFavorGain: 50,
    templeHeliosCapacityMultiplier: 1.5,
    templeSekhmetConquerYieldMultiplier: 1.75,
    templeDanuOutputMultiplier: 1.5,
    templeHelConsumptionMultiplier: 0.1,
    worldsUnlocked: false,
    activeWorldId: null,
    worlds: [],
    nextWorldIndex: 1,
    worldsUnlockFollowerCapacityRequirement: 500,
    worldsUnlockVillagesResolvedRequirement: 5,
    worldsUnlockMetersExploredRequirement: 3000,
    worldVillagesResolvedToChartBase: 1,
    worldTierCostMultiplierStep: 0.25,
    settlementTier: 0,
    storehouse: 0,
    woodStoneCapBase: 2000,
    storehouseCapPerLevel: 1000,
    storehouseCostScalePerBuilt: 0.15,
    granary: 0,
    foodCapBase: 1000,
    granaryCapPerLevel: 500,
    granaryCostScalePerBuilt: 0.15,
    scriptorium: 0,
    scriptoriumOutputPerRank: 0.08,
    scribeFaithBonusPerScribe: 0.02,
    foodSpoilagePerSecondBase: 0.002,
    farmerSpoilageReductionPerFarmer: 0.05,
    granaryPassiveFoodPerSecondPerLevel: 0.3,
    feastFoodCost: 50,
    feastFaithBonusPerFood: 0.5,
    watchtower: 0,
    watchtowerCostScalePerBuilt: 0.18,
    watchtowerHazardAvoidPerLevel: 0.04,
    watchtowerHazardAvoidCap: 0.6,
    barracks: 0,
    barracksCostScalePerBuilt: 0.18,
    barracksConquerRollBonusPerLevel: 1,
    well: 0,
    wellCostScalePerBuilt: 0.15,
    wellConsumptionReductionPerLevel: 0.03,
    wellConsumptionReductionCap: 0.5,
    marketplace: 0,
    marketplaceCostScalePerBuilt: 0.2,
    marketplaceTradeFaithBase: 40,
    marketplaceTradeFaithPerLevel: 6,
    marketplaceTradesCompleted: 0,
    marketplaceTradeCostGrowthRate: 1.15,
    monument: 0,
    monumentCostScalePerBuilt: 0.25,
    monumentFaithPerFollowerBonusPerLevel: 0.05,
    monumentUnlockSettlementTier: 3,
    settlementResourceBatchSize: 200,
    settlementTradeCostGrowthRate: 1.12,
    settlementReputationGainPerTrade: 1,
    settlementReputationDiscountPerTier: 0.06,
    marketplaceCaravanEfficiencyPerLevel: 0.004,
    incenseFaithBonusPerUnit: 0.01,
    silkCapacityBonusPerUnit: 0.005,
    ironConquestRollBonusPerUnit: 0.5,
    hirePilgrimsPurchased: 0,
    hirePilgrimsCostGrowthRate: 1.04,
    hirePilgrimsFollowersPerPurchase: 10,
    catechismHall: 0,
    catechismHallCostScalePerBuilt: 0.32,
    catechismHallGoodwillPerSecondPerLevel: 0.03,
    warCamp: 0,
    warCampCostScalePerBuilt: 0.32,
    warCampCapacityPerLevel: 3,
    ascension: {
        echoesOfDivinity: 0,
        upgradeRanks: createAscensionUpgradeRankMap(0),
        totalAscensions: 0
    },
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
        partyExpansionPurchases: 0,
        expeditionTrainingPurchases: 0,
        activeExpedition: null,
        totalMetersExplored: 0,
        wildAreaSeedInitialized: false,
        villageSpawnChance: 0.2,
        hazardWipeoutChance: 0.08,
        hazardHeavyLossChance: 0.17,
        hazardAmbushChance: 0.20,
        hazardHeavyLossFraction: 0.5,
        hazardAmbushMinLossPercent: 20,
        hazardAmbushMaxLossPercent: 60,
        sermonSwayDivisor: 8,
        conquerForceDivisor: 10,
        villageOutpostFaithPerSecond: 0.05,
        conquerFollowerBurstMultiplier: 3,
        conquerWoodLootMin: 100,
        conquerWoodLootMax: 300,
        conquerStoneLootMin: 100,
        conquerStoneLootMax: 300,
        digWellGoodwillGain: 12,
        holdFeastGoodwillGain: 10,
        goodwillTaskCostGrowthRate: 1.12,
        cityChanceBase: 0.03,
        cityChancePerDistanceTier: 0.025,
        cityChanceCap: 0.5,
        cityPopulationMultiplier: 2.2,
        cityResistanceMultiplier: 1.4,
        declareWarFaithCost: 60,
        warbandPowerPerFollower: 0.4,
        siegeEventCheckIntervalSeconds: 180,
        siegeEventChance: 0.35,
        siegeAmbushCasualtyMin: 0.05,
        siegeAmbushCasualtyMax: 0.15,
        siegeAttritionCasualtyMin: 0.01,
        siegeAttritionCasualtyMax: 0.04,
        siegeReinforcementProgressBonus: 5,
        siegeBrutalityPopulationFactor: 0.8,
        siegePopulationSurvivalFloor: 0.3,
        warOutpostUnrestInitial: 50,
        warOutpostUnrestDecayPerSecond: 0.05,
        warOutpostUnrestProductionPenalty: 0.6,
        pacifyOutpostUnrestReduction: 20,
        wildAreaSeedCount: 8,
        wildAreaMinBuffer: 6,
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
        wildAreaShrineChance: 0.12,
        wildAreaRuinsChance: 0.15,
        shrineFaithMin: 40,
        shrineFaithMax: 120,
        ruinsGoodOutcomeChance: 0.65,
        settlements: [],
        nextSettlementIndex: 1,
        settlementMinBuffer: 2,
        settlementDistanceMinStep: 700,
        settlementDistanceMaxStep: 1600,
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

                let landmark = null;
                let name = `Wild Area ${i}`;
                if (Math.random() < 0.12) {
                    landmark = 'shrine';
                    name = `Shrine ${i}`;
                } else if (Math.random() < 0.15) {
                    landmark = 'ruins';
                    name = `Ruins ${i}`;
                }

                areas.push({
                    id: `wild-area-${i}`,
                    name,
                    distanceFromCamp: distance,
                    discovered: false,
                    discoveredAtMeters: null,
                    resourceCache,
                    passiveEffect,
                    landmark,
                    landmarkResolved: false
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
                prophetPresent: false,
                resolutionType: null,
                tier: 'village',
                war: null,
                unrest: 0,
                goodwillTasksCompleted: 0
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