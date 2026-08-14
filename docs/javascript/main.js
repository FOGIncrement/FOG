import { loadGame, clearSave, saveGame } from './utils/persistence.js';
import { clearNew } from './utils/ui-helpers.js';
import { initTooltips, setTooltipContent } from './utils/tooltip.js';
import { addLog } from './utils/logging.js';
import { gameState, game } from './classes/GameState.js';
import * as gameApi from './game.js';
import { actionRegistry } from './registries/index.js';
import { ACTION_TAB_ORDER } from './config/action-definitions.js';
import { FACTION_DEFINITIONS } from './config/factions.js';
import { ACTION_COST_RESOURCES, CARD_ACTION_COST_RESOURCES } from './config/action-cost-resources.js';

const CHEAT_BALANCE_FIELD_SECTIONS = [
    {
        title: 'Core Game',
        entries: [
            { label: 'Pray Faith Per Click', target: game, key: 'prayAmt', step: 0.1, min: 0 },
            { label: 'Convert Follower Cost', target: game, key: 'convertCost', step: 1, min: 0 },
            { label: 'Manual Feed Hunger Gain', target: game, key: 'feedAmount', step: 0.5, min: 0 },
            { label: 'Follower Food Consumption/s', target: game, key: 'followerFoodConsumptionPerSecond', step: 0.01, min: 0 },
            { label: 'Hunger Starvation Drain/s', target: game, key: 'hungerStarvationDrainPerSecond', step: 0.5, min: 0 },
            { label: 'Offline Progress Cap (Hours)', target: game, key: 'offlineProgressMaxHours', step: 1, min: 0.1 },
            { label: 'Auto Feed Food Per Second', target: game, key: 'autoFeedFoodPerSecond', step: 0.01, min: 0 },
            { label: 'Food Hunger Gain Multiplier', target: game, key: 'foodHungerGain', step: 0.01, min: 0 },
            { label: 'Shelter Capacity Per Shelter', target: game, key: 'shelterCapacityPerShelter', step: 1, min: 0 },
            { label: 'Shelter Capacity Multiplier', target: game, key: 'shelterCapacityMultiplier', step: 0.1, min: 0 },
            { label: 'Role Cost Growth Rate', target: game, key: 'roleCostGrowthRate', step: 0.01, min: 1 },
            { label: 'Shelter Upgrade Cost Multiplier', target: game, key: 'shelterUpgradeCostMultiplier', step: 0.05, min: 0 },
            { label: 'Faith Per Follower Per Second', target: gameState.progression, key: 'faithPerFollower', step: 0.001, min: 0 }
        ]
    },
    {
        title: 'Gathering',
        entries: [
            { label: 'Manual Gather Base Amount', target: gameState.gathering, key: 'manualGatherBaseAmount', step: 0.1, min: 0 },
            { label: 'Manual Gather Shelter Bonus', target: gameState.gathering, key: 'manualGatherShelterBonus', step: 0.1, min: 0 },
            { label: 'Gather Food Min Multiplier', target: gameState.gathering, key: 'gatherFoodMinMultiplier', step: 0.1, min: 0 },
            { label: 'Gather Food Max Multiplier', target: gameState.gathering, key: 'gatherFoodMaxMultiplier', step: 0.1, min: 0 }
        ]
    },
    {
        title: 'Automation Rates',
        entries: [
            { label: 'Hunter Food Per Second', target: gameState.rates, key: 'hunterFoodPerSecond', step: 0.01, min: 0 },
            { label: 'Ritualist Faith Per Second', target: gameState.rates, key: 'ritualistFaithPerSecond', step: 0.01, min: 0 },
            { label: 'Gatherer Wood Per Second', target: gameState.rates, key: 'gathererWoodPerSecond', step: 0.01, min: 0 },
            { label: 'Gatherer Stone Per Second', target: gameState.rates, key: 'gathererStonePerSecond', step: 0.01, min: 0 },
            { label: 'Cook Hunger Gain Per Cook Per Second', target: gameState.rates, key: 'cookFlatHungerGainPerSecond', step: 0.01, min: 0 },
            { label: 'Cook Hunger Drain Reduction Per Cook', target: gameState.rates, key: 'cookHungerDrainReductionPerCook', step: 0.01, min: 0 },
            { label: 'Cook Hunger Bonus Per Cook', target: gameState.rates, key: 'cookHungerGainBonusPerCook', step: 0.1, min: 0 }
        ]
    },
    {
        title: 'Costs',
        entries: [
            { label: 'Shelter Wood Base Cost', target: gameState.costs, key: 'shelterWoodCost', step: 1, min: 0 },
            { label: 'Shelter Stone Base Cost', target: gameState.costs, key: 'shelterStoneCost', step: 1, min: 0 },
            { label: 'Ritual Circle Cost (Faith)', target: gameState.costs, key: 'ritualBtnCost', step: 1, min: 0 },
            { label: 'Preach Cost (Faith)', target: gameState.costs, key: 'preachFaithCost', step: 1, min: 0 },
            { label: 'Training Unlock Cost (Faith)', target: gameState.costs, key: 'trainingTechCost', step: 1, min: 0 },
            { label: 'Unlock Hunters Cost (Faith)', target: gameState.costs, key: 'unlockHuntersFaithCost', step: 1, min: 0 },
            { label: 'Train Hunters Base Cost (Faith)', target: gameState.costs, key: 'hunterBaseCost', step: 1, min: 0 },
            { label: 'Unlock Ritualists Cost (Faith)', target: gameState.costs, key: 'unlockRitualistsFaithCost', step: 1, min: 0 },
            { label: 'Train Ritualists Base Cost (Faith)', target: gameState.costs, key: 'ritualistBaseCost', step: 1, min: 0 },
            { label: 'Unlock Gatherers Cost (Faith)', target: gameState.costs, key: 'unlockGatherersFaithCost', step: 1, min: 0 },
            { label: 'Train Gatherers Base Cost (Faith)', target: gameState.costs, key: 'gathererBaseCost', step: 1, min: 0 },
            { label: 'Unlock Cooks Cost (Faith)', target: gameState.costs, key: 'unlockCooksFaithCost', step: 1, min: 0 },
            { label: 'Train Cooks Base Cost (Faith)', target: gameState.costs, key: 'cookBaseCost', step: 1, min: 0 },
            { label: 'Unlock Prophet Cost (Faith)', target: gameState.costs, key: 'unlockProphetFaithCost', step: 1, min: 0 },
            { label: 'Unlock Exploration Cost (Faith)', target: gameState.costs, key: 'unlockExplorationFaithCost', step: 1, min: 0 },
            { label: 'Expedition Roll Cost (Faith)', target: gameState.costs, key: 'expeditionRollFaithCost', step: 1, min: 0 },
            { label: 'Hold Sermon Cost (Faith)', target: gameState.costs, key: 'holdSermonFaithCost', step: 1, min: 0 },
            { label: 'Conquer Village Cost (Faith)', target: gameState.costs, key: 'conquerVillageFaithCost', step: 1, min: 0 },
            { label: 'Unlock Shelter Upgrade Cost (Faith)', target: gameState.costs, key: 'unlockShelterUpgradeFaithCost', step: 1, min: 0 },
            { label: 'Unlock Altar Cost (Faith)', target: gameState.costs, key: 'unlockAltarFaithCost', step: 1, min: 0 },
            { label: 'Build Altar Wood Cost', target: gameState.costs, key: 'altarBuildWoodCost', step: 1, min: 0 },
            { label: 'Build Altar Stone Cost', target: gameState.costs, key: 'altarBuildStoneCost', step: 1, min: 0 },
            { label: 'Build Altar Faith Cost', target: gameState.costs, key: 'altarBuildFaithCost', step: 1, min: 0 }
        ]
    },
    {
        title: 'Live Progression',
        entries: [
            { label: 'Current Followers', target: gameState.progression, key: 'followers', step: 1, min: 0 },
            { label: 'Current Faith', target: gameState.progression, key: 'faith', step: 1, min: 0 },
            { label: 'Shelter Count', target: game, key: 'shelter', step: 1, min: 0 },
            { label: 'Party Expansion Purchases', target: game.exploration, key: 'partyExpansionPurchases', step: 1, min: 0 },
            { label: 'Expedition Training Purchases', target: game.exploration, key: 'expeditionTrainingPurchases', step: 1, min: 0 },
            { label: 'Zealous Preaching Purchases', target: game, key: 'zealousPreachingPurchases', step: 1, min: 0 }
        ]
    },
    {
        title: 'Repeatable Upgrades',
        entries: [
            { label: 'Expand Party Base Cost (Faith)', target: gameState.costs, key: 'expandPartyBaseCost', step: 5, min: 0 },
            { label: 'Expedition Training Base Cost (Faith)', target: gameState.costs, key: 'expeditionTrainingBaseCost', step: 5, min: 0 },
            { label: 'Zealous Preaching Base Cost (Faith)', target: gameState.costs, key: 'zealousPreachingBaseCost', step: 5, min: 0 },
            { label: 'Upgrade Cost Growth Rate', target: game, key: 'upgradeCostGrowthRate', step: 0.05, min: 1 },
            { label: 'Upgrade Max Purchases', target: game, key: 'upgradeMaxPurchases', step: 1, min: 1 },
            { label: 'Expand Party Follower Increase', target: game, key: 'expandPartyFollowerIncrease', step: 1, min: 0 },
            { label: 'Expedition Training Hazard Multiplier', target: game, key: 'expeditionTrainingHazardMultiplier', step: 0.01, min: 0.01 }
        ]
    },
    {
        title: 'Exploration & Prophet',
        entries: [
            { label: 'Expedition Follower Send Limit', target: game.exploration, key: 'followerSendLimit', step: 1, min: 1 },
            { label: 'Village Spawn Chance', target: game.exploration, key: 'villageSpawnChance', step: 0.01, min: 0 },
            { label: 'Hazard Wipeout Chance', target: game.exploration, key: 'hazardWipeoutChance', step: 0.01, min: 0 },
            { label: 'Hazard Heavy Loss Chance', target: game.exploration, key: 'hazardHeavyLossChance', step: 0.01, min: 0 },
            { label: 'Hazard Ambush Chance', target: game.exploration, key: 'hazardAmbushChance', step: 0.01, min: 0 },
            { label: 'Heavy Loss Fraction', target: game.exploration, key: 'hazardHeavyLossFraction', step: 0.01, min: 0 },
            { label: 'Ambush Loss Min Percent', target: game.exploration, key: 'hazardAmbushMinLossPercent', step: 1, min: 1 },
            { label: 'Ambush Loss Max Percent', target: game.exploration, key: 'hazardAmbushMaxLossPercent', step: 1, min: 1 },
            { label: 'Wild Area Seed Count', target: game.exploration, key: 'wildAreaSeedCount', step: 1, min: 1 },
            { label: 'Wild Area Distance Min Step', target: game.exploration, key: 'wildAreaDistanceMinStep', step: 1, min: 1 },
            { label: 'Wild Area Distance Max Step', target: game.exploration, key: 'wildAreaDistanceMaxStep', step: 1, min: 1 },
            { label: 'Wild Area Resource Cache Chance', target: game.exploration, key: 'wildAreaResourceCacheChance', step: 0.01, min: 0 },
            { label: 'Wild Area Cache Wood Min', target: game.exploration, key: 'wildAreaResourceCacheWoodMin', step: 1, min: 0 },
            { label: 'Wild Area Cache Wood Max', target: game.exploration, key: 'wildAreaResourceCacheWoodMax', step: 1, min: 0 },
            { label: 'Wild Area Cache Stone Min', target: game.exploration, key: 'wildAreaResourceCacheStoneMin', step: 1, min: 0 },
            { label: 'Wild Area Cache Stone Max', target: game.exploration, key: 'wildAreaResourceCacheStoneMax', step: 1, min: 0 },
            { label: 'Wild Area Faith Bonus Chance', target: game.exploration, key: 'wildAreaFaithPerFollowerBonusChance', step: 0.01, min: 0 },
            { label: 'Wild Area Faith Bonus Min', target: game.exploration, key: 'wildAreaFaithPerFollowerBonusMin', step: 0.0001, min: 0 },
            { label: 'Wild Area Faith Bonus Max', target: game.exploration, key: 'wildAreaFaithPerFollowerBonusMax', step: 0.0001, min: 0 },
            { label: 'Wild Area Hunger Penalty Chance', target: game.exploration, key: 'wildAreaHungerDrainPenaltyChance', step: 0.01, min: 0 },
            { label: 'Wild Area Hunger Penalty Min', target: game.exploration, key: 'wildAreaHungerDrainPenaltyMin', step: 0.0001, min: 0 },
            { label: 'Wild Area Hunger Penalty Max', target: game.exploration, key: 'wildAreaHungerDrainPenaltyMax', step: 0.0001, min: 0 },
            { label: 'Prophet Sway', target: gameState.progression, key: 'prophetSway', step: 1, min: 1 },
            { label: 'Prophet Unlock Capacity Requirement', target: game, key: 'prophetUnlockCapacityRequirement', step: 1, min: 1 },
            { label: 'Sermon Sway Divisor', target: game.exploration, key: 'sermonSwayDivisor', step: 1, min: 1 },
            { label: 'Conquer Force Divisor', target: game.exploration, key: 'conquerForceDivisor', step: 1, min: 1 },
            { label: 'Village Outpost Faith Per Second', target: game.exploration, key: 'villageOutpostFaithPerSecond', step: 0.01, min: 0 },
            { label: 'Conquer Follower Burst Multiplier', target: game.exploration, key: 'conquerFollowerBurstMultiplier', step: 0.5, min: 0 },
            { label: 'Conquer Wood Loot Min', target: game.exploration, key: 'conquerWoodLootMin', step: 10, min: 0 },
            { label: 'Conquer Wood Loot Max', target: game.exploration, key: 'conquerWoodLootMax', step: 10, min: 0 },
            { label: 'Conquer Stone Loot Min', target: game.exploration, key: 'conquerStoneLootMin', step: 10, min: 0 },
            { label: 'Conquer Stone Loot Max', target: game.exploration, key: 'conquerStoneLootMax', step: 10, min: 0 }
        ]
    },
    {
        title: 'Alignment & Favor',
        entries: [
            { label: 'Preach Alignment Gain', target: game, key: 'alignmentPreachGain', step: 0.5, min: 0 },
            { label: 'Preach Helios Favor Gain', target: game, key: 'heliosFavorPreachGain', step: 0.5, min: 0 },
            { label: 'Convert Alignment Gain', target: game, key: 'alignmentConvertGain', step: 0.5, min: 0 },
            { label: 'Convert Helios Favor Gain', target: game, key: 'heliosFavorConvertGain', step: 0.5, min: 0 },
            { label: 'Conquer Alignment Loss', target: game, key: 'alignmentConquerLoss', step: 0.5, min: 0 },
            { label: 'Conquer Sekhmet Favor Gain', target: game, key: 'sekhmetFavorConquerGain', step: 0.5, min: 0 },
            { label: 'Bless Harvest Alignment Gain', target: game, key: 'alignmentBlessHarvestGain', step: 0.5, min: 0 },
            { label: 'Bless Harvest Danu Favor Gain', target: game, key: 'danuFavorBlessHarvestGain', step: 0.5, min: 0 },
            { label: 'Hel Offering Alignment Loss', target: game, key: 'alignmentHelOfferingLoss', step: 0.5, min: 0 },
            { label: 'Hel Offering Favor Gain', target: game, key: 'helFavorOfferingGain', step: 0.5, min: 0 }
        ]
    },
    {
        title: 'Danu & Hel',
        entries: [
            { label: 'Bless Harvest Faith Cost', target: gameState.costs, key: 'blessHarvestFaithCost', step: 5, min: 0 },
            { label: 'Bless Harvest Wood Cost', target: gameState.costs, key: 'blessHarvestWoodCost', step: 5, min: 0 },
            { label: 'Bless Harvest Stone Cost', target: gameState.costs, key: 'blessHarvestStoneCost', step: 5, min: 0 },
            { label: 'Danu Blessing Multiplier', target: game, key: 'danuBlessingMultiplier', step: 0.05, min: 1 },
            { label: 'Hel Offering Faith Cost', target: gameState.costs, key: 'helOfferingFaithCost', step: 5, min: 0 },
            { label: 'Hel Offering Follower Cost', target: game, key: 'helOfferingFollowerCost', step: 1, min: 0 },
            { label: 'Hel Offering Faith Refund', target: game, key: 'helOfferingFaithRefund', step: 5, min: 0 }
        ]
    },
    {
        title: 'Doctrines',
        entries: [
            { label: 'Council Faith Cost', target: gameState.costs, key: 'councilFaithCost', step: 5, min: 0 },
            { label: 'Council Follower Requirement', target: game, key: 'councilFollowerRequirement', step: 1, min: 1 },
            { label: "Shepherd's Creed Cost Multiplier", target: game, key: 'shepherdsCreedCostMultiplier', step: 0.05, min: 0 },
            { label: 'Iron Fist Yield Multiplier', target: game, key: 'ironFistYieldMultiplier', step: 0.05, min: 1 },
            { label: 'Iron Fist Cost Multiplier', target: game, key: 'ironFistCostMultiplier', step: 0.05, min: 0 },
            { label: 'Homestead Output Multiplier', target: game, key: 'homesteadOutputMultiplier', step: 0.05, min: 1 },
            { label: 'Wanderlust Roll Bonus', target: game, key: 'wanderlustRollBonus', step: 1, min: 0 },
            { label: 'Wanderlust Cost Multiplier', target: game, key: 'wanderlustCostMultiplier', step: 0.05, min: 0 },
            { label: 'Abundant Table Consumption Multiplier', target: game, key: 'abundantTableConsumptionMultiplier', step: 0.05, min: 0 },
            { label: 'Lean Years Consumption Multiplier', target: game, key: 'leanYearsConsumptionMultiplier', step: 0.05, min: 0 },
            { label: 'Lean Years Starvation Multiplier', target: game, key: 'leanYearsStarvationMultiplier', step: 0.1, min: 1 }
        ]
    },
    {
        title: 'Temple',
        entries: [
            { label: 'Temple Faith Cost', target: gameState.costs, key: 'templeFaithCost', step: 100, min: 0 },
            { label: 'Temple Wood Cost', target: gameState.costs, key: 'templeWoodCost', step: 50, min: 0 },
            { label: 'Temple Stone Cost', target: gameState.costs, key: 'templeStoneCost', step: 50, min: 0 },
            { label: 'Temple Follower Requirement', target: game, key: 'templeFollowerRequirement', step: 5, min: 1 },
            { label: 'Temple Favor Requirement', target: game, key: 'templeFavorRequirement', step: 10, min: 0 },
            { label: 'Temple Alignment Shift', target: game, key: 'templeAlignmentShift', step: 1, min: 0 },
            { label: 'Temple Favor Gain', target: game, key: 'templeFavorGain', step: 5, min: 0 },
            { label: 'Temple Helios Capacity Multiplier', target: game, key: 'templeHeliosCapacityMultiplier', step: 0.05, min: 1 },
            { label: 'Temple Sekhmet Conquer Yield Multiplier', target: game, key: 'templeSekhmetConquerYieldMultiplier', step: 0.05, min: 1 },
            { label: 'Temple Danu Output Multiplier', target: game, key: 'templeDanuOutputMultiplier', step: 0.05, min: 1 },
            { label: 'Temple Hel Consumption Multiplier', target: game, key: 'templeHelConsumptionMultiplier', step: 0.05, min: 0 }
        ]
    },
    {
        title: 'Worlds',
        entries: [
            { label: 'Unlock Worlds Faith Cost', target: gameState.costs, key: 'unlockWorldsFaithCost', step: 100, min: 0 },
            { label: 'Worlds Follower Capacity Requirement', target: game, key: 'worldsUnlockFollowerCapacityRequirement', step: 10, min: 1 },
            { label: 'Worlds Villages Resolved Requirement', target: game, key: 'worldsUnlockVillagesResolvedRequirement', step: 1, min: 0 },
            { label: 'Worlds Meters Explored Requirement', target: game, key: 'worldsUnlockMetersExploredRequirement', step: 100, min: 0 },
            { label: 'Chart World Starlight Base Cost', target: gameState.costs, key: 'chartWorldStarlightBaseCost', step: 50, min: 0 },
            { label: 'Chart World Faith Base Cost', target: gameState.costs, key: 'chartWorldFaithBaseCost', step: 100, min: 0 },
            { label: 'World Expedition Roll Base Cost', target: gameState.costs, key: 'worldExpeditionRollFaithBaseCost', step: 5, min: 0 },
            { label: 'World Sermon Base Cost', target: gameState.costs, key: 'worldSermonFaithBaseCost', step: 1, min: 0 },
            { label: 'World Conquer Base Cost', target: gameState.costs, key: 'worldConquerFaithBaseCost', step: 1, min: 0 },
            { label: 'World Tier Cost Multiplier Step', target: game, key: 'worldTierCostMultiplierStep', step: 0.05, min: 0 },
            { label: 'World Villages Resolved To Chart (base)', target: game, key: 'worldVillagesResolvedToChartBase', step: 1, min: 0 }
        ]
    },
    {
        title: 'Ascension',
        entries: [
            { label: 'Echoing Faith Base Cost', target: gameState.costs, key: 'echoingFaithBaseEchoesCost', step: 1, min: 0 },
            { label: 'Swift Foundations Base Cost', target: gameState.costs, key: 'swiftFoundationsBaseEchoesCost', step: 1, min: 0 },
            { label: 'Starlit Memory Base Cost', target: gameState.costs, key: 'starlitMemoryBaseEchoesCost', step: 1, min: 0 },
            { label: 'Undying Flock Base Cost', target: gameState.costs, key: 'undyingFlockBaseEchoesCost', step: 1, min: 0 }
        ]
    },
    {
        title: 'Storage & Scriptorium',
        entries: [
            { label: 'Storehouse Faith Cost', target: gameState.costs, key: 'storehouseFaithCost', step: 10, min: 0 },
            { label: 'Wood/Stone Cap Base', target: game, key: 'woodStoneCapBase', step: 100, min: 0 },
            { label: 'Storehouse Cap Per Level', target: game, key: 'storehouseCapPerLevel', step: 100, min: 0 },
            { label: 'Storehouse Cost Scale', target: game, key: 'storehouseCostScalePerBuilt', step: 0.05, min: 0 },
            { label: 'Granary Wood Cost', target: gameState.costs, key: 'granaryWoodCost', step: 10, min: 0 },
            { label: 'Granary Stone Cost', target: gameState.costs, key: 'granaryStoneCost', step: 10, min: 0 },
            { label: 'Food Cap Base', target: game, key: 'foodCapBase', step: 50, min: 0 },
            { label: 'Granary Cap Per Level', target: game, key: 'granaryCapPerLevel', step: 50, min: 0 },
            { label: 'Granary Cost Scale', target: game, key: 'granaryCostScalePerBuilt', step: 0.05, min: 0 },
            { label: 'Scriptorium Base Cost', target: gameState.costs, key: 'scriptoriumBaseCost', step: 10, min: 0 },
            { label: 'Scriptorium Output Per Rank', target: game, key: 'scriptoriumOutputPerRank', step: 0.01, min: 0 }
        ]
    },
    {
        title: 'Food System',
        entries: [
            { label: 'Farmer Food Per Second', target: gameState.rates, key: 'farmerFoodPerSecond', step: 0.1, min: 0 },
            { label: 'Unlock Farmers Faith Cost', target: gameState.costs, key: 'unlockFarmersFaithCost', step: 5, min: 0 },
            { label: 'Farmer Base Train Cost', target: gameState.costs, key: 'farmerBaseCost', step: 1, min: 0 },
            { label: 'Unlock Scribes Faith Cost', target: gameState.costs, key: 'unlockScribesFaithCost', step: 10, min: 0 },
            { label: 'Scribe Base Train Cost', target: gameState.costs, key: 'scribeBaseCost', step: 1, min: 0 },
            { label: 'Scribe Faith Bonus Per Scribe', target: game, key: 'scribeFaithBonusPerScribe', step: 0.01, min: 0 },
            { label: 'Food Spoilage Per Second (base)', target: game, key: 'foodSpoilagePerSecondBase', step: 0.001, min: 0 },
            { label: 'Farmer Spoilage Reduction', target: game, key: 'farmerSpoilageReductionPerFarmer', step: 0.01, min: 0 },
            { label: 'Granary Passive Food Per Level', target: game, key: 'granaryPassiveFoodPerSecondPerLevel', step: 0.1, min: 0 },
            { label: 'Feast Food Cost', target: game, key: 'feastFoodCost', step: 5, min: 0 },
            { label: 'Feast Faith Bonus Per Food', target: game, key: 'feastFaithBonusPerFood', step: 0.1, min: 0 }
        ]
    },
    {
        title: 'Favor Tiers',
        entries: [
            { label: 'Helios: Cost Reduction / Tier', target: game, key: 'heliosFavorCostReductionPerTier', step: 0.01, min: 0 },
            { label: 'Helios: Capacity Bonus / Tier', target: game, key: 'heliosFavorCapacityBonusPerTier', step: 0.01, min: 0 },
            { label: 'Sekhmet: Yield Bonus / Tier', target: game, key: 'sekhmetFavorYieldBonusPerTier', step: 0.01, min: 0 },
            { label: 'Sekhmet: Hazard Reduction / Tier', target: game, key: 'sekhmetFavorHazardReductionPerTier', step: 0.01, min: 0 },
            { label: 'Danu: Output Bonus / Tier', target: game, key: 'danuFavorOutputBonusPerTier', step: 0.01, min: 0 },
            { label: 'Danu: Cap Bonus / Tier', target: game, key: 'danuFavorCapBonusPerTier', step: 0.01, min: 0 },
            { label: 'Hel: Consumption Reduction / Tier', target: game, key: 'helFavorConsumptionReductionPerTier', step: 0.01, min: 0 },
            { label: 'Hel: Starlight Bonus / Tier', target: game, key: 'helFavorStarlightBonusPerTier', step: 0.01, min: 0 },
            { label: 'Hel: Echoes Bonus / Tier', target: game, key: 'helFavorEchoesBonusPerTier', step: 0.01, min: 0 }
        ]
    }
];

// ===== COST HIGHLIGHT =====
function highlightCostResources(containerIds) {
    containerIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.add('cost-highlight');
    });
}

function clearCostHighlights() {
    document.querySelectorAll('.cost-highlight').forEach((el) => el.classList.remove('cost-highlight'));
}

// ===== DOM LOADED =====
document.addEventListener("DOMContentLoaded", () => {
    // Try to load saved game first
    const loadResult = loadGame();
    initTooltips();

    // startup sanity (defensive against bad legacy saves)
    if (!Number.isFinite(gameState.progression.followers) || gameState.progression.followers < 0) {
        gameState.progression.followers = 0;
    }
    if (!Number.isFinite(gameState.progression.faith) || gameState.progression.faith < 0) {
        gameState.progression.faith = 0;
    }

    const welcomeBackSummary = gameApi.runOfflineCatchup(loadResult.offlineSeconds, loadResult.offlineSecondsRaw);
    if (welcomeBackSummary) {
        gameApi.renderWelcomeBackModal(welcomeBackSummary);
    }

    const welcomeBackDismissBtn = document.getElementById('welcomeBackDismissBtn');
    if (welcomeBackDismissBtn) {
        welcomeBackDismissBtn.addEventListener('click', () => {
            const modal = document.getElementById('welcomeBackModal');
            if (modal) modal.style.display = 'none';
        });
    }

    initTabs();

    ACTION_TAB_ORDER.forEach((tab) => {
        actionRegistry.getByTab(tab).forEach((actionDefinition) => {
            const handler = gameApi[actionDefinition.handlerExport];
            if (typeof handler !== 'function') return;

            const el = document.getElementById(actionDefinition.buttonId);
            if (el) {
                el.addEventListener("click", handler);
                // hover listener to clear new indicator
                el.addEventListener('mouseenter', () => {
                    if (el.dataset.new === 'true') {
                        clearNew(el);
                        saveGame();
                    }
                });

                const costResourceIds = ACTION_COST_RESOURCES[actionDefinition.id];
                if (Array.isArray(costResourceIds) && costResourceIds.length > 0) {
                    el.addEventListener('mouseenter', () => highlightCostResources(costResourceIds));
                    el.addEventListener('mouseleave', clearCostHighlights);
                }
            }
        });
    });

    [
        document.getElementById('discoveredAreasList'),
        document.getElementById('worldDiscoveredAreasList')
    ].forEach((container) => {
        if (!container) return;
        container.addEventListener('mouseover', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const btn = target.closest('button[class]');
            if (!btn) return;
            const matchedClass = Object.keys(CARD_ACTION_COST_RESOURCES).find((cls) => btn.classList.contains(cls));
            if (!matchedClass) return;
            highlightCostResources(CARD_ACTION_COST_RESOURCES[matchedClass]);
        });
        container.addEventListener('mouseout', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const btn = target.closest('button[class]');
            if (!btn) return;
            clearCostHighlights();
        });
    });

    const discoveredAreasList = document.getElementById('discoveredAreasList');
    if (discoveredAreasList) {
        discoveredAreasList.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;

            const collectBtn = target.closest('.wild-area-collect-btn');
            if (collectBtn) {
                const areaId = collectBtn.dataset.areaId;
                if (areaId && typeof gameApi.collectWildAreaResources === 'function') {
                    gameApi.collectWildAreaResources(areaId);
                }
                return;
            }

            const shrineBtn = target.closest('.shrine-pray-btn');
            if (shrineBtn) {
                const areaId = shrineBtn.dataset.areaId;
                if (areaId && typeof gameApi.prayAtShrine === 'function') {
                    gameApi.prayAtShrine(areaId);
                }
                return;
            }

            const ruinsBtn = target.closest('.ruins-search-btn');
            if (ruinsBtn) {
                const areaId = ruinsBtn.dataset.areaId;
                if (areaId && typeof gameApi.searchRuins === 'function') {
                    gameApi.searchRuins(areaId);
                }
                return;
            }

            const sermonBtn = target.closest('.village-sermon-btn');
            if (sermonBtn) {
                const villageId = sermonBtn.dataset.villageId;
                if (villageId && typeof gameApi.holdVillageSermon === 'function') {
                    gameApi.holdVillageSermon(villageId);
                }
                return;
            }

            const conquerBtn = target.closest('.village-conquer-btn');
            if (!conquerBtn) return;
            const villageId = conquerBtn.dataset.villageId;
            if (!villageId) return;
            if (typeof gameApi.conquerVillage === 'function') {
                gameApi.conquerVillage(villageId);
            }
        });
    }

    const worldDiscoveredAreasList = document.getElementById('worldDiscoveredAreasList');
    if (worldDiscoveredAreasList) {
        worldDiscoveredAreasList.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;

            const collectBtn = target.closest('.wild-area-collect-btn');
            if (collectBtn) {
                const areaId = collectBtn.dataset.areaId;
                if (areaId && typeof gameApi.collectWorldWildAreaResources === 'function') {
                    gameApi.collectWorldWildAreaResources(areaId);
                }
                return;
            }

            const sermonBtn = target.closest('.village-sermon-btn');
            if (sermonBtn) {
                const villageId = sermonBtn.dataset.villageId;
                if (villageId && typeof gameApi.holdWorldVillageSermon === 'function') {
                    gameApi.holdWorldVillageSermon(villageId);
                }
                return;
            }

            const conquerBtn = target.closest('.village-conquer-btn');
            if (!conquerBtn) return;
            const villageId = conquerBtn.dataset.villageId;
            if (!villageId) return;
            if (typeof gameApi.conquerWorldVillage === 'function') {
                gameApi.conquerWorldVillage(villageId);
            }
        });
    }

    const resetSaveBtn = document.getElementById('resetSaveBtn');
    if (resetSaveBtn) {
        setTooltipContent(
            resetSaveBtn,
            'Reset Save\nClear saved progress and restart from the beginning.',
            'Deletes local save data for this browser profile.'
        );
        resetSaveBtn.addEventListener('click', () => {
            const confirmed = window.confirm('Clear saved progress and restart?');
            if (confirmed) clearSave();
        });
    }

    initCheatMenu();

    let lastTickMs = performance.now();
    setInterval(() => {
        const now = performance.now();
        const dtSeconds = (now - lastTickMs) / 1000;
        lastTickMs = now;
        gameApi.gameTick(dtSeconds);
    }, 100);
    gameApi.updateUI();

    dismissLoadingScreen();
});

// ===== LOADING SCREEN =====
const LOADING_SCREEN_MIN_MS = 1800;
const LOADING_SCREEN_FADE_MS = 700;

function dismissLoadingScreen() {
    const screen = document.getElementById('loadingScreen');
    if (!screen) return;

    let dismissed = false;
    const hide = () => {
        if (dismissed) return;
        dismissed = true;
        screen.classList.add('loading-hidden');
        setTimeout(() => {
            if (screen.parentNode) screen.parentNode.removeChild(screen);
        }, LOADING_SCREEN_FADE_MS);
    };

    screen.addEventListener('click', hide);
    setTimeout(hide, LOADING_SCREEN_MIN_MS);
}

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

function initCheatMenu() {
    const MILLION = 1_000_000;

    const cheatFaithBtn = document.getElementById('cheatFaithBtn');
    if (cheatFaithBtn) {
        cheatFaithBtn.addEventListener('click', () => {
            gameState.progression.faith += MILLION;
            addLog('Cheat used: +1,000,000 faith.');
            gameApi.updateUI();
            saveGame();
        });
    }

    const cheatFoodBtn = document.getElementById('cheatFoodBtn');
    if (cheatFoodBtn) {
        cheatFoodBtn.addEventListener('click', () => {
            gameState.resources.food.amount += MILLION;
            addLog('Cheat used: +1,000,000 food.');
            gameApi.updateUI();
            saveGame();
        });
    }

    const cheatWoodBtn = document.getElementById('cheatWoodBtn');
    if (cheatWoodBtn) {
        cheatWoodBtn.addEventListener('click', () => {
            gameState.resources.wood.amount += MILLION;
            addLog('Cheat used: +1,000,000 wood.');
            gameApi.updateUI();
            saveGame();
        });
    }

    const cheatStoneBtn = document.getElementById('cheatStoneBtn');
    if (cheatStoneBtn) {
        cheatStoneBtn.addEventListener('click', () => {
            gameState.resources.stone.amount += MILLION;
            addLog('Cheat used: +1,000,000 stone.');
            gameApi.updateUI();
            saveGame();
        });
    }

    const cheatStarlightBtn = document.getElementById('cheatStarlightBtn');
    if (cheatStarlightBtn) {
        cheatStarlightBtn.addEventListener('click', () => {
            gameState.progression.starlight += MILLION;
            addLog('Cheat used: +1,000,000 starlight.');
            gameApi.updateUI();
            saveGame();
        });
    }

    const cheatEchoesBtn = document.getElementById('cheatEchoesBtn');
    if (cheatEchoesBtn) {
        cheatEchoesBtn.addEventListener('click', () => {
            if (!game.ascension) game.ascension = { echoesOfDivinity: 0, upgradeRanks: {}, totalAscensions: 0 };
            game.ascension.echoesOfDivinity += 100;
            addLog('Cheat used: +100 Echoes of Divinity.');
            gameApi.updateUI();
            saveGame();
        });
    }

    const cheatAlignmentGoodBtn = document.getElementById('cheatAlignmentGoodBtn');
    if (cheatAlignmentGoodBtn) {
        cheatAlignmentGoodBtn.addEventListener('click', () => {
            game.alignment = Math.min(100, game.alignment + 10);
            game.alignmentVisible = true;
            addLog('Cheat used: +10 alignment (toward Good).');
            gameApi.updateUI();
            saveGame();
        });
    }

    const cheatAlignmentEvilBtn = document.getElementById('cheatAlignmentEvilBtn');
    if (cheatAlignmentEvilBtn) {
        cheatAlignmentEvilBtn.addEventListener('click', () => {
            game.alignment = Math.max(-100, game.alignment - 10);
            game.alignmentVisible = true;
            addLog('Cheat used: -10 alignment (toward Evil).');
            gameApi.updateUI();
            saveGame();
        });
    }

    const cheatUnlockDoctrinesBtn = document.getElementById('cheatUnlockDoctrinesBtn');
    if (cheatUnlockDoctrinesBtn) {
        cheatUnlockDoctrinesBtn.addEventListener('click', () => {
            game.doctrinesUnlocked = true;
            addLog('Cheat used: Doctrines unlocked.');
            gameApi.updateUI();
            saveGame();
        });
    }

    FACTION_DEFINITIONS.forEach((faction) => {
        const btnId = `cheatFavor${faction.id.charAt(0).toUpperCase()}${faction.id.slice(1)}Btn`;
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => {
                game.factionFavor[faction.id] += 100;
                game.alignmentVisible = true;
                addLog(`Cheat used: +100 ${faction.label} favor.`);
                gameApi.updateUI();
                saveGame();
            });
        }
    });

    initCheatBalanceEditor();
}

function initCheatBalanceEditor() {
    const container = document.getElementById('cheatBalanceTableContainer');
    if (!container) return;
    container.innerHTML = '<p style="margin:6px;color:#999;">Loading balance controls...</p>';

    const applyAllBtn = document.getElementById('cheatApplyAllBtn');
    const resetInputsBtn = document.getElementById('cheatResetInputsBtn');
    const copySettingsBtn = document.getElementById('cheatCopySettingsBtn');

    const bindings = CHEAT_BALANCE_FIELD_SECTIONS
        .flatMap((section) => section.entries)
        .filter((entry) => entry && entry.target && typeof entry.target === 'object' && typeof entry.key === 'string');

    try {
        if (bindings.length === 0) {
            container.innerHTML = '<p style="margin:6px;color:#caa;">No balance fields available.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'cheat-balance-table';

        const head = document.createElement('thead');
        const headRow = document.createElement('tr');
        ['Variable', 'Value', 'Apply'].forEach((label) => {
            const th = document.createElement('th');
            th.innerText = label;
            headRow.appendChild(th);
        });
        head.appendChild(headRow);
        table.appendChild(head);

        const body = document.createElement('tbody');

        CHEAT_BALANCE_FIELD_SECTIONS.forEach((section) => {
            const validEntries = section.entries.filter((entry) => entry && entry.target && typeof entry.target === 'object' && typeof entry.key === 'string');
            if (!validEntries.length) return;

            const sectionRow = document.createElement('tr');
            sectionRow.className = 'section-row';
            const sectionCell = document.createElement('td');
            sectionCell.colSpan = 3;
            sectionCell.innerText = section.title;
            sectionRow.appendChild(sectionCell);
            body.appendChild(sectionRow);

            validEntries.forEach((entry) => {
                const row = document.createElement('tr');

                const labelCell = document.createElement('td');
                labelCell.innerText = entry.label;

                const valueCell = document.createElement('td');
                const input = document.createElement('input');
                input.type = 'number';
                input.step = String(entry.step ?? 0.01);
                if (Number.isFinite(entry.min)) input.min = String(entry.min);
                const currentValue = Number.isFinite(entry.target[entry.key]) ? entry.target[entry.key] : 0;
                input.value = String(currentValue);
                input.dataset.cheatKey = entry.key;
                input.dataset.cheatLabel = entry.label;
                valueCell.appendChild(input);

                const actionCell = document.createElement('td');
                const applyBtn = document.createElement('button');
                applyBtn.type = 'button';
                applyBtn.innerText = 'Set';
                applyBtn.addEventListener('click', () => {
                    if (applyEntryValue(entry, input.value)) {
                        normalizeBalanceSettings();
                        input.value = String(entry.target[entry.key]);
                        gameApi.updateUI();
                        saveGame();
                        addLog(`Cheat tune: ${entry.label} set to ${entry.target[entry.key]}.`);
                    }
                });
                actionCell.appendChild(applyBtn);

                row.appendChild(labelCell);
                row.appendChild(valueCell);
                row.appendChild(actionCell);
                body.appendChild(row);
            });
        });

        table.appendChild(body);
        container.innerHTML = '';
        container.appendChild(table);

        if (applyAllBtn) {
            applyAllBtn.addEventListener('click', () => {
                let changedCount = 0;
                bindings.forEach((entry) => {
                    const selector = `input[data-cheat-key="${entry.key}"][data-cheat-label="${entry.label}"]`;
                    const input = table.querySelector(selector);
                    if (!input) return;
                    if (applyEntryValue(entry, input.value)) {
                        changedCount += 1;
                        input.value = String(entry.target[entry.key]);
                    }
                });

                if (changedCount > 0) {
                    normalizeBalanceSettings();
                    gameApi.updateUI();
                    saveGame();
                    addLog(`Cheat tune: applied ${changedCount} balance value${changedCount === 1 ? '' : 's'}.`);
                }
            });
        }

        if (resetInputsBtn) {
            resetInputsBtn.addEventListener('click', () => {
                bindings.forEach((entry) => {
                    const selector = `input[data-cheat-key="${entry.key}"][data-cheat-label="${entry.label}"]`;
                    const input = table.querySelector(selector);
                    if (!input) return;
                    input.value = String(entry.target[entry.key]);
                });
            });
        }

        if (copySettingsBtn) {
            copySettingsBtn.addEventListener('click', async () => {
                const snapshotText = buildCheatSettingsSnapshot(bindings);
                const copied = await copyTextToClipboard(snapshotText);

                if (copied) {
                    addLog('Cheat settings copied to clipboard.');
                } else {
                    addLog('Could not copy cheat settings automatically.');
                }
            });
        }
    } catch (error) {
        console.error('Failed to build cheat balance editor:', error);
        container.innerHTML = '<p style="margin:6px;color:#c66;">Could not render balance controls. Check console for details.</p>';
    }
}

function buildCheatSettingsSnapshot(bindings) {
    const now = new Date().toISOString();
    const sections = [];

    CHEAT_BALANCE_FIELD_SECTIONS.forEach((section) => {
        const lines = [];
        section.entries.forEach((entry) => {
            if (!entry || !entry.target || typeof entry.key !== 'string') return;
            const value = Number(entry.target[entry.key]);
            const normalizedValue = Number.isFinite(value) ? value : 0;
            lines.push(`${entry.label}: ${normalizedValue}`);
        });
        if (lines.length > 0) {
            sections.push(`[${section.title}]\n${lines.join('\n')}`);
        }
    });

    const resourceLines = [
        `Followers: ${Number.isFinite(gameState.progression.followers) ? gameState.progression.followers : 0}`,
        `Faith: ${Number.isFinite(gameState.progression.faith) ? gameState.progression.faith : 0}`,
        `Wood: ${Number.isFinite(gameState.resources.wood?.amount) ? gameState.resources.wood.amount : 0}`,
        `Stone: ${Number.isFinite(gameState.resources.stone?.amount) ? gameState.resources.stone.amount : 0}`,
        `Food: ${Number.isFinite(gameState.resources.food?.amount) ? gameState.resources.food.amount : 0}`,
        `HungerPercent: ${Number.isFinite(game.hungerPercent) ? game.hungerPercent : 0}`,
        `ShelterCount: ${Number.isFinite(game.shelter) ? game.shelter : 0}`
    ];

    return [
        'FOG Cheat Settings Snapshot',
        `Timestamp: ${now}`,
        '',
        sections.join('\n\n'),
        '',
        '[Current Item Amounts]',
        resourceLines.join('\n'),
        '',
        `Total Tunables Exported: ${bindings.length}`
    ].join('\n');
}

async function copyTextToClipboard(text) {
    if (typeof text !== 'string' || !text) return false;

    try {
        if (window.isSecureContext && navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch (_error) {
        // Fall through to legacy copy path.
    }

    try {
        const fallbackInput = document.createElement('textarea');
        fallbackInput.value = text;
        fallbackInput.setAttribute('readonly', 'true');
        fallbackInput.style.position = 'fixed';
        fallbackInput.style.opacity = '0';
        fallbackInput.style.pointerEvents = 'none';
        document.body.appendChild(fallbackInput);
        fallbackInput.focus();
        fallbackInput.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(fallbackInput);
        if (copied) return true;
    } catch (_error) {
        // Fall through to manual copy prompt.
    }

    try {
        window.prompt('Clipboard unavailable. Copy manually:', text);
    } catch (_error) {
        // Ignore prompt failures.
    }

    return false;
}

function applyEntryValue(entry, rawValue) {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return false;

    let normalized = parsed;
    if (Number.isFinite(entry.min)) normalized = Math.max(entry.min, normalized);
    entry.target[entry.key] = normalized;
    return true;
}

function normalizeBalanceSettings() {
    if (gameState.gathering.gatherFoodMinMultiplier > gameState.gathering.gatherFoodMaxMultiplier) {
        gameState.gathering.gatherFoodMaxMultiplier = gameState.gathering.gatherFoodMinMultiplier;
    }

    if (!game.exploration || typeof game.exploration !== 'object') {
        game.exploration = {};
    }

    if (!Number.isFinite(game.exploration.followerSendLimit) || game.exploration.followerSendLimit < 1) {
        game.exploration.followerSendLimit = 1;
    }
    game.exploration.followerSendLimit = Math.max(1, Math.floor(game.exploration.followerSendLimit));
    if (!Number.isFinite(game.exploration.wildAreaSeedCount) || game.exploration.wildAreaSeedCount < 1) {
        game.exploration.wildAreaSeedCount = 1;
    }
    game.exploration.wildAreaSeedCount = Math.max(1, Math.floor(game.exploration.wildAreaSeedCount));
    if (!Number.isFinite(game.exploration.wildAreaDistanceMinStep) || game.exploration.wildAreaDistanceMinStep < 1) {
        game.exploration.wildAreaDistanceMinStep = 1;
    }
    if (!Number.isFinite(game.exploration.wildAreaDistanceMaxStep) || game.exploration.wildAreaDistanceMaxStep < game.exploration.wildAreaDistanceMinStep) {
        game.exploration.wildAreaDistanceMaxStep = game.exploration.wildAreaDistanceMinStep;
    }
    [
        'villageSpawnChance',
        'hazardWipeoutChance',
        'hazardHeavyLossChance',
        'hazardAmbushChance',
        'hazardHeavyLossFraction',
        'wildAreaResourceCacheChance',
        'wildAreaFaithPerFollowerBonusChance',
        'wildAreaHungerDrainPenaltyChance'
    ].forEach((key) => {
        const value = Number(game.exploration[key]);
        if (!Number.isFinite(value)) {
            game.exploration[key] = 0;
            return;
        }
        game.exploration[key] = Math.max(0, Math.min(1, value));
    });

    if (!Number.isFinite(gameState.progression.followers) || gameState.progression.followers < 0) {
        gameState.progression.followers = 0;
    }
    gameState.progression.followers = Math.floor(gameState.progression.followers);

    if (!Number.isFinite(game.shelter) || game.shelter < 0) {
        game.shelter = 0;
    }
    game.shelter = Math.floor(game.shelter);

    if (!Number.isFinite(gameState.costs.unlockExplorationFaithCost) || gameState.costs.unlockExplorationFaithCost < 0) {
        gameState.costs.unlockExplorationFaithCost = 0;
    }
}
