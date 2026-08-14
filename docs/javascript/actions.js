import { gameState, game } from './classes/GameState.js';
import { addLog } from './utils/logging.js';
import { saveGame } from './utils/persistence.js';
import { updateUI } from './ui.js';
import { getExpeditionFollowerLimit, getMaxFollowers, getNextVillageDistance, getRoleCount, getShelterBuildCosts, getUnassignedFollowers, getUpgradeCost, hasProphetAssigned, setRoleCount, getPreachFaithCost, getConvertFollowerCost, getConquerVillageFaithCost, getConquerYieldMultiplier, getExpeditionRollFaithCost, getExpeditionRollBonus, getAscensionHazardMultiplier, getStorehouseCost, getGranaryCost, getWoodStoneCap, getFoodCap, getSekhmetFavorHazardMultiplier, getNextSettlementTier, canAffordSettlementTier, getWatchtowerCost, getWatchtowerHazardAvoidChance, getBarracksCost, getBarracksConquerRollBonus, getWellCost, getMarketplaceCost, getMarketplaceTradeCost, getMarketplaceTradeFaithYield, getMonumentCost, canUnlockMonument, getManualActionYieldMultiplier, getConquestRollBonus, getSettlementBuyResourceCost, getSettlementSellResourceYield, getSettlementBuyGoodCost, getHirePilgrimsCost, getDeclareWarFaithCost, getSiegeProgressPerSecond, isDoctrineGroupUnlocked, getCatechismHallCost, getWarCampCost, getMaxWarbandSize, getGoodwillTricklePerSecond, getDigWellCost, getHoldFeastForVillageCost } from './utils/helpers.js';
import { rollDice } from './utils/dice.js';
import { buildingRegistry } from './registries/index.js';
import { DOCTRINE_GROUP_BY_ID } from './config/doctrines.js';
import { TEMPLE_OPTION_BY_GOD } from './config/temples.js';
import { SETTLEMENT_SPECIALTIES, SETTLEMENT_SPECIALTY_BY_ID, TRADE_GOODS, getSettlementReputationTier } from './config/trade-settlements.js';

let preachRollReady = false;
let preachRollInProgress = false;
let expeditionRollReady = false;
let expeditionRollInProgress = false;

function canPreachNow() {
    const max = getMaxFollowers();
    const hasCost = gameState.progression.faith >= getPreachFaithCost() &&
        game.hungerPercent >= 10 && gameState.resources.food.amount >= 10;
    const hasCapacity = gameState.progression.followers < max;
    return hasCost && hasCapacity;
}

function setPreachDiceVisible(visible) {
    const panel = document.getElementById('preachDicePanel');
    if (panel) panel.style.display = visible ? 'block' : 'none';
}

function setExpeditionDiceVisible(visible) {
    const panel = document.getElementById('expeditionDicePanel');
    if (panel) panel.style.display = visible ? 'block' : 'none';
}

function applyGlobalCostReduction(multiplier) {
    Object.keys(gameState.costs).forEach((costKey) => {
        const value = gameState.costs[costKey];
        if (!Number.isFinite(value)) return;
        gameState.costs[costKey] = Math.max(1, Math.floor(value * multiplier));
    });

    game.convertCost = Math.max(1, Math.floor(game.convertCost * multiplier));

    ['wood', 'stone', 'food'].forEach((resourceKey) => {
        const resource = gameState.resources[resourceKey];
        if (!resource || !Number.isFinite(resource.gatherCost)) return;
        resource.gatherCost = Math.max(1, Math.floor(resource.gatherCost * multiplier));
    });
}

function getExplorationState() {
    if (!game.exploration || typeof game.exploration !== 'object') {
        game.exploration = {};
    }

    if (!Number.isFinite(game.exploration.followerSendLimit) || game.exploration.followerSendLimit < 1) {
        game.exploration.followerSendLimit = 10;
    }
    if (!Number.isFinite(game.exploration.totalMetersExplored) || game.exploration.totalMetersExplored < 0) {
        game.exploration.totalMetersExplored = 0;
    }
    if (!Array.isArray(game.exploration.discoveredAreas)) {
        game.exploration.discoveredAreas = [];
    }
    if (!Array.isArray(game.exploration.villages)) {
        game.exploration.villages = [];
    }
    if (!Number.isFinite(game.exploration.nextVillageIndex) || game.exploration.nextVillageIndex < 2) {
        game.exploration.nextVillageIndex = 2;
    }
    if (!Number.isFinite(game.exploration.nextAreaIndex) || game.exploration.nextAreaIndex < 1) {
        game.exploration.nextAreaIndex = 1;
    }
    if (!Array.isArray(game.exploration.settlements)) {
        game.exploration.settlements = [];
    }
    if (!Number.isFinite(game.exploration.nextSettlementIndex) || game.exploration.nextSettlementIndex < 1) {
        game.exploration.nextSettlementIndex = 1;
    }

    ensureWildAreaSeeds(game.exploration);
    extendWildAreaFrontier(game.exploration);
    ensureUpcomingVillage(game.exploration);
    extendSettlementFrontier(game.exploration);
    syncDiscoveredAreasByDistance(game.exploration, { logDiscoveries: false });
    syncSettlementsByDistance(game.exploration, { logDiscoveries: false });

    return game.exploration;
}

function getExpeditionConfig() {
    const exploration = getExplorationState();
    const limit = getExpeditionFollowerLimit();
    const rollFaithCost = getExpeditionRollFaithCost();
    return { exploration, limit, rollFaithCost };
}

function clampProbability(value, fallback) {
    const normalized = Number.isFinite(value) ? value : fallback;
    return Math.max(0, Math.min(1, normalized));
}

function clampMinimum(value, fallback, minValue = 0) {
    const normalized = Number.isFinite(value) ? value : fallback;
    return Math.max(minValue, normalized);
}

function randomInRange(minValue, maxValue) {
    const min = Math.min(minValue, maxValue);
    const max = Math.max(minValue, maxValue);
    return Math.random() * (max - min) + min;
}

function randomIntInRange(minValue, maxValue) {
    return Math.floor(randomInRange(minValue, maxValue + 1));
}

function normalizeExplorationTuning(exploration) {
    exploration.villageSpawnChance = clampProbability(exploration.villageSpawnChance, 0.2);
    exploration.hazardWipeoutChance = clampProbability(exploration.hazardWipeoutChance, 0.08);
    exploration.hazardHeavyLossChance = clampProbability(exploration.hazardHeavyLossChance, 0.17);
    exploration.hazardAmbushChance = clampProbability(exploration.hazardAmbushChance, 0.20);
    exploration.hazardHeavyLossFraction = clampProbability(exploration.hazardHeavyLossFraction, 0.5);
    exploration.hazardAmbushMinLossPercent = clampMinimum(exploration.hazardAmbushMinLossPercent, 20, 1);
    exploration.hazardAmbushMaxLossPercent = clampMinimum(exploration.hazardAmbushMaxLossPercent, 60, exploration.hazardAmbushMinLossPercent);

    exploration.wildAreaSeedCount = Math.max(1, Math.floor(clampMinimum(exploration.wildAreaSeedCount, 8, 1)));
    exploration.wildAreaDistanceMinStep = Math.max(1, Math.floor(clampMinimum(exploration.wildAreaDistanceMinStep, 30, 1)));
    exploration.wildAreaDistanceMaxStep = Math.max(
        exploration.wildAreaDistanceMinStep,
        Math.floor(clampMinimum(exploration.wildAreaDistanceMaxStep, 120, exploration.wildAreaDistanceMinStep))
    );

    exploration.wildAreaResourceCacheChance = clampProbability(exploration.wildAreaResourceCacheChance, 0.45);
    exploration.wildAreaResourceCacheWoodMin = Math.max(0, Math.floor(clampMinimum(exploration.wildAreaResourceCacheWoodMin, 80, 0)));
    exploration.wildAreaResourceCacheWoodMax = Math.max(exploration.wildAreaResourceCacheWoodMin, Math.floor(clampMinimum(exploration.wildAreaResourceCacheWoodMax, 220, exploration.wildAreaResourceCacheWoodMin)));
    exploration.wildAreaResourceCacheStoneMin = Math.max(0, Math.floor(clampMinimum(exploration.wildAreaResourceCacheStoneMin, 70, 0)));
    exploration.wildAreaResourceCacheStoneMax = Math.max(exploration.wildAreaResourceCacheStoneMin, Math.floor(clampMinimum(exploration.wildAreaResourceCacheStoneMax, 200, exploration.wildAreaResourceCacheStoneMin)));

    exploration.wildAreaFaithPerFollowerBonusChance = clampProbability(exploration.wildAreaFaithPerFollowerBonusChance, 0.2);
    exploration.wildAreaFaithPerFollowerBonusMin = Math.max(0, clampMinimum(exploration.wildAreaFaithPerFollowerBonusMin, 0.001, 0));
    exploration.wildAreaFaithPerFollowerBonusMax = Math.max(exploration.wildAreaFaithPerFollowerBonusMin, clampMinimum(exploration.wildAreaFaithPerFollowerBonusMax, 0.006, exploration.wildAreaFaithPerFollowerBonusMin));

    exploration.wildAreaHungerDrainPenaltyChance = clampProbability(exploration.wildAreaHungerDrainPenaltyChance, 0.18);
    exploration.wildAreaHungerDrainPenaltyMin = Math.max(0, clampMinimum(exploration.wildAreaHungerDrainPenaltyMin, 0.01, 0));
    exploration.wildAreaHungerDrainPenaltyMax = Math.max(exploration.wildAreaHungerDrainPenaltyMin, clampMinimum(exploration.wildAreaHungerDrainPenaltyMax, 0.05, exploration.wildAreaHungerDrainPenaltyMin));
}

function createWildArea(index, distanceFromCamp, exploration) {
    const area = {
        id: `wild-area-${index}`,
        name: `Wild Area ${index}`,
        distanceFromCamp,
        discovered: false,
        discoveredAtMeters: null,
        resourceCache: null,
        passiveEffect: null,
        landmark: null,
        landmarkResolved: false
    };

    // Rewards scale with how far the area is from camp, so a wild area
    // discovered deep into a long-running settlement still matters instead
    // of handing out the same trickle of wood/stone it did on day one.
    const distanceTier = Math.max(1, Math.floor(distanceFromCamp / 1000) + 1);
    const rewardScale = Math.pow(1.15, distanceTier - 1);

    if (Math.random() < exploration.wildAreaResourceCacheChance) {
        area.resourceCache = {
            wood: Math.floor(randomIntInRange(exploration.wildAreaResourceCacheWoodMin, exploration.wildAreaResourceCacheWoodMax) * rewardScale),
            stone: Math.floor(randomIntInRange(exploration.wildAreaResourceCacheStoneMin, exploration.wildAreaResourceCacheStoneMax) * rewardScale),
            collected: false
        };
    }

    if (Math.random() < exploration.wildAreaFaithPerFollowerBonusChance) {
        const amount = randomInRange(exploration.wildAreaFaithPerFollowerBonusMin, exploration.wildAreaFaithPerFollowerBonusMax);
        area.passiveEffect = {
            type: 'faithPerFollowerBonus',
            amount: Number(amount.toFixed(4)),
            applied: false
        };
    } else if (Math.random() < exploration.wildAreaHungerDrainPenaltyChance) {
        const amount = randomInRange(exploration.wildAreaHungerDrainPenaltyMin, exploration.wildAreaHungerDrainPenaltyMax);
        area.passiveEffect = {
            type: 'hungerDrainPenalty',
            amount: Number(amount.toFixed(4)),
            applied: false
        };
    }

    const shrineChance = Number.isFinite(exploration.wildAreaShrineChance) ? exploration.wildAreaShrineChance : 0.12;
    const ruinsChance = Number.isFinite(exploration.wildAreaRuinsChance) ? exploration.wildAreaRuinsChance : 0.15;
    if (Math.random() < shrineChance) {
        area.landmark = 'shrine';
        area.name = `Shrine ${index}`;
    } else if (Math.random() < ruinsChance) {
        area.landmark = 'ruins';
        area.name = `Ruins ${index}`;
    }

    return area;
}

function seedWildAreas(exploration) {
    const areas = [];
    let currentDistance = 0;

    for (let index = 1; index <= exploration.wildAreaSeedCount; index += 1) {
        const step = index === 1
            ? 10
            : randomIntInRange(exploration.wildAreaDistanceMinStep, exploration.wildAreaDistanceMaxStep);
        currentDistance += Math.max(1, step);
        areas.push(createWildArea(index, currentDistance, exploration));
    }

    exploration.discoveredAreas = areas;
    exploration.nextAreaIndex = exploration.wildAreaSeedCount + 1;
}

function ensureWildAreaSeeds(exploration) {
    normalizeExplorationTuning(exploration);

    if (typeof exploration.wildAreaSeedInitialized !== 'boolean') {
        exploration.wildAreaSeedInitialized = false;
    }

    if (!Array.isArray(exploration.discoveredAreas) || exploration.discoveredAreas.length === 0) {
        seedWildAreas(exploration);
        return;
    }

    let hasAssignedDistance = false;
    exploration.discoveredAreas = exploration.discoveredAreas.map((area, index) => {
        const distanceFromCamp = Number.isFinite(area?.distanceFromCamp)
            ? Math.max(1, Math.floor(area.distanceFromCamp))
            : 0;
        if (distanceFromCamp > 0) hasAssignedDistance = true;

        return {
            id: area?.id || `wild-area-${index + 1}`,
            name: area?.name || `Wild Area ${index + 1}`,
            distanceFromCamp,
            discovered: Boolean(area?.discovered),
            discoveredAtMeters: Number.isFinite(area?.discoveredAtMeters) ? Math.max(0, Math.floor(area.discoveredAtMeters)) : null,
            resourceCache: area?.resourceCache && typeof area.resourceCache === 'object'
                ? {
                    wood: Number.isFinite(area.resourceCache.wood) ? Math.max(0, Math.floor(area.resourceCache.wood)) : 0,
                    stone: Number.isFinite(area.resourceCache.stone) ? Math.max(0, Math.floor(area.resourceCache.stone)) : 0,
                    collected: Boolean(area.resourceCache.collected)
                }
                : null,
            passiveEffect: area?.passiveEffect && typeof area.passiveEffect === 'object'
                ? {
                    type: area.passiveEffect.type,
                    amount: Number.isFinite(area.passiveEffect.amount) ? Math.max(0, area.passiveEffect.amount) : 0,
                    applied: Boolean(area.passiveEffect.applied)
                }
                : null
        };
    });

    if (!hasAssignedDistance) {
        seedWildAreas(exploration);
        exploration.wildAreaSeedInitialized = true;
        return;
    }

    initializeWildAreaSeedIfNeeded(exploration);
}

function initializeWildAreaSeedIfNeeded(exploration) {
    if (exploration?.wildAreaSeedInitialized) return;
    if (!Array.isArray(exploration?.discoveredAreas) || exploration.discoveredAreas.length === 0) return;

    const hasAnyDiscovered = exploration.discoveredAreas.some((area) => area?.discovered);
    if (hasAnyDiscovered) {
        exploration.wildAreaSeedInitialized = true;
        return;
    }

    const distances = exploration.discoveredAreas
        .map((area) => Number.isFinite(area?.distanceFromCamp) ? Math.floor(area.distanceFromCamp) : 0)
        .filter((distance) => distance > 0)
        .sort((left, right) => left - right);

    if (distances.length === 0) {
        exploration.wildAreaSeedInitialized = true;
        return;
    }
    const nearestDistance = distances[0];
    if (nearestDistance > 10) {
        const offset = nearestDistance - 10;
        exploration.discoveredAreas.forEach((area) => {
            if (!Number.isFinite(area.distanceFromCamp)) return;
            area.distanceFromCamp = Math.max(1, Math.floor(area.distanceFromCamp) - offset);
        });
    }

    exploration.wildAreaSeedInitialized = true;
}

// Wild areas were originally a fixed, one-time seed of 8-20 nodes - once
// discovered, exploration had nothing left to offer. This keeps a rolling
// buffer of undiscovered areas ahead of the frontier forever, so there is
// always somewhere further to send an expedition.
function extendWildAreaFrontier(exploration) {
    const minBuffer = Number.isFinite(exploration.wildAreaMinBuffer) ? exploration.wildAreaMinBuffer : 6;
    const undiscoveredCount = exploration.discoveredAreas.filter((area) => !area.discovered).length;
    if (undiscoveredCount >= minBuffer) return;

    const furthest = exploration.discoveredAreas.reduce(
        (max, area) => Math.max(max, Number.isFinite(area.distanceFromCamp) ? area.distanceFromCamp : 0),
        Number.isFinite(exploration.totalMetersExplored) ? exploration.totalMetersExplored : 0
    );

    let distance = furthest;
    const toGenerate = (minBuffer - undiscoveredCount) + 3;
    for (let i = 0; i < toGenerate; i += 1) {
        const step = randomIntInRange(exploration.wildAreaDistanceMinStep, exploration.wildAreaDistanceMaxStep);
        distance += Math.max(1, step);
        const index = exploration.nextAreaIndex;
        exploration.discoveredAreas.push(createWildArea(index, distance, exploration));
        exploration.nextAreaIndex += 1;
    }
}

function createSettlement(index, distanceFromCamp) {
    const specialty = SETTLEMENT_SPECIALTIES[Math.floor(Math.random() * SETTLEMENT_SPECIALTIES.length)];
    return {
        id: `settlement-${index}`,
        name: `${specialty.name} ${index}`,
        specialtyId: specialty.id,
        distanceFromCamp,
        discovered: false,
        discoveredAtMeters: null,
        reputation: 0,
        tradesCompleted: 0
    };
}

// Foreign Settlements are rarer than wild areas (bigger distance steps, a
// smaller undiscovered buffer) but generate forever via the same rolling-
// frontier mechanism, so trade partners keep appearing as you push outward.
function extendSettlementFrontier(exploration) {
    const minBuffer = Number.isFinite(exploration.settlementMinBuffer) ? exploration.settlementMinBuffer : 2;
    const undiscoveredCount = exploration.settlements.filter((settlement) => !settlement.discovered).length;
    if (undiscoveredCount >= minBuffer) return;

    const furthest = exploration.settlements.reduce(
        (max, settlement) => Math.max(max, Number.isFinite(settlement.distanceFromCamp) ? settlement.distanceFromCamp : 0),
        Number.isFinite(exploration.totalMetersExplored) ? exploration.totalMetersExplored : 0
    );

    const minStep = Number.isFinite(exploration.settlementDistanceMinStep) ? exploration.settlementDistanceMinStep : 700;
    const maxStep = Number.isFinite(exploration.settlementDistanceMaxStep) ? exploration.settlementDistanceMaxStep : 1600;
    let distance = furthest;
    const toGenerate = (minBuffer - undiscoveredCount) + 1;
    for (let i = 0; i < toGenerate; i += 1) {
        const step = randomIntInRange(minStep, maxStep);
        distance += Math.max(1, step);
        const index = exploration.nextSettlementIndex;
        exploration.settlements.push(createSettlement(index, distance));
        exploration.nextSettlementIndex += 1;
    }
}

function syncSettlementsByDistance(exploration, { logDiscoveries = false } = {}) {
    const meters = Number.isFinite(exploration?.totalMetersExplored)
        ? Math.floor(exploration.totalMetersExplored)
        : 0;

    const settlements = Array.isArray(exploration?.settlements) ? exploration.settlements : [];

    settlements
        .filter((settlement) => !settlement.discovered && Number.isFinite(settlement.distanceFromCamp) && settlement.distanceFromCamp > 0 && settlement.distanceFromCamp <= meters)
        .sort((left, right) => left.distanceFromCamp - right.distanceFromCamp)
        .forEach((settlement) => {
            settlement.discovered = true;
            settlement.discoveredAtMeters = Math.floor(settlement.distanceFromCamp);
            if (logDiscoveries) {
                addLog(`The expedition made contact with ${settlement.name} at ${Math.floor(settlement.distanceFromCamp)}m from camp.`);
            }
        });
}

function applyWildAreaPassiveEffect(area) {
    const effect = area?.passiveEffect;
    if (!effect || effect.applied) return;

    if (effect.type === 'faithPerFollowerBonus') {
        gameState.progression.faithPerFollower += effect.amount;
        effect.applied = true;
        addLog(`${area.name} grants a sacred inspiration: +${effect.amount.toFixed(4)} faith per follower/s.`);
        return;
    }

    if (effect.type === 'hungerDrainPenalty') {
        game.followerFoodConsumptionPerSecond += effect.amount;
        effect.applied = true;
        addLog(`${area.name} is harsh terrain: +${effect.amount.toFixed(4)} food consumption per follower/s.`);
    }
}

export function removeFollowersFromSettlement(losses, includeProphetLoss = false) {
    if (!Number.isFinite(losses) || losses <= 0) return 0;

    const currentFollowers = Math.max(0, Math.floor(gameState.progression.followers));
    const casualtyCount = Math.min(currentFollowers, Math.floor(losses));
    if (casualtyCount <= 0) return 0;

    gameState.progression.followers = currentFollowers - casualtyCount;

    if (includeProphetLoss && getRoleCount('prophet') > 0) {
        setRoleCount('prophet', 0);
        addLog('Your Prophet was slain during the expedition.');
    }

    const roleReductionOrder = ['hunters', 'ritualists', 'gatherers', 'cooks'];
    let assignedOverflow = 0;
    roleReductionOrder.concat(['prophet']).forEach((roleId) => {
        assignedOverflow += getRoleCount(roleId);
    });
    assignedOverflow = Math.max(0, assignedOverflow - gameState.progression.followers);

    for (const roleId of roleReductionOrder) {
        if (assignedOverflow <= 0) break;
        const currentRoleCount = getRoleCount(roleId);
        if (currentRoleCount <= 0) continue;
        const reduction = Math.min(currentRoleCount, assignedOverflow);
        setRoleCount(roleId, currentRoleCount - reduction);
        assignedOverflow -= reduction;
    }

    if (assignedOverflow > 0 && getRoleCount('prophet') > 0) {
        const prophetReduction = Math.min(getRoleCount('prophet'), assignedOverflow);
        setRoleCount('prophet', getRoleCount('prophet') - prophetReduction);
    }

    return casualtyCount;
}

function spawnNewVillage(exploration, { silent = false } = {}) {
    const villageId = `village-${exploration.nextVillageIndex}`;
    const distanceFromCamp = getNextVillageDistance();
    // Villages further from camp are bigger and tougher, so the raid/sermon
    // loop keeps mattering instead of flattening out once you've outgrown
    // the numbers from the first few settlements.
    const distanceTier = Math.max(1, Math.floor(distanceFromCamp / 1000) + 1);
    const populationBase = Math.floor(Math.random() * 1001) + 800;
    let population = Math.floor(populationBase * Math.pow(1.12, distanceTier - 1));
    let resistance = Math.floor((Math.random() * 41) + 35 + (distanceTier - 1) * 3);

    // Cities are rarer the closer to camp, more common further out - a
    // deliberately bigger, tougher discovery that the quick Sermon/Conquer
    // actions don't fit, so they get the deeper War/Goodwill treatment.
    const cityChanceBase = Number.isFinite(exploration.cityChanceBase) ? exploration.cityChanceBase : 0.03;
    const cityChancePerTier = Number.isFinite(exploration.cityChancePerDistanceTier) ? exploration.cityChancePerDistanceTier : 0.025;
    const cityChanceCap = Number.isFinite(exploration.cityChanceCap) ? exploration.cityChanceCap : 0.5;
    const cityChance = Math.min(cityChanceCap, cityChanceBase + cityChancePerTier * (distanceTier - 1));
    const tier = Math.random() < cityChance ? 'city' : 'village';
    if (tier === 'city') {
        const popMult = Number.isFinite(exploration.cityPopulationMultiplier) ? exploration.cityPopulationMultiplier : 2.2;
        const resMult = Number.isFinite(exploration.cityResistanceMultiplier) ? exploration.cityResistanceMultiplier : 1.4;
        population = Math.floor(population * popMult);
        resistance = Math.floor(resistance * resMult);
    }

    exploration.villages.push({
        id: villageId,
        name: `${tier === 'city' ? 'City' : 'Village'} ${exploration.nextVillageIndex}`,
        distanceFromCamp,
        population,
        resistance,
        convertedPercent: 0,
        discovered: false,
        sermonsHeld: 0,
        prophetPresent: false,
        resolutionType: null,
        tier,
        war: null,
        unrest: 0
    });

    exploration.nextVillageIndex += 1;
    if (!silent) {
        addLog(`Scouts charted rumors of another settlement around ${Math.floor(distanceFromCamp)}m from camp.`);
    }
}

// Guarantees there is always at least one undiscovered village to march
// toward - without this, a single failed spawn roll after discovering the
// last known village would leave startExpedition() with nothing to target,
// permanently dead-ending exploration.
function ensureUpcomingVillage(exploration) {
    const hasUndiscovered = exploration.villages.some((village) => !village.discovered);
    if (hasUndiscovered) return;
    spawnNewVillage(exploration, { silent: true });
}

function maybeCreateNewVillage(exploration) {
    const discoveredVillages = exploration.villages.filter((village) => village.discovered).length;
    if (discoveredVillages < 1) return;

    const shouldSpawn = Math.random() < exploration.villageSpawnChance;
    if (!shouldSpawn) return;

    spawnNewVillage(exploration);
}

function syncDiscoveredAreasByDistance(exploration, { logDiscoveries = false } = {}) {
    const meters = Number.isFinite(exploration?.totalMetersExplored)
        ? Math.floor(exploration.totalMetersExplored)
        : 0;

    const areas = Array.isArray(exploration?.discoveredAreas)
        ? exploration.discoveredAreas
        : [];

    areas
        .filter((area) => !area.discovered && Number.isFinite(area.distanceFromCamp) && area.distanceFromCamp > 0 && area.distanceFromCamp <= meters)
        .sort((left, right) => left.distanceFromCamp - right.distanceFromCamp)
        .forEach((area) => {
            area.discovered = true;
            area.discoveredAtMeters = Math.floor(area.distanceFromCamp);
            applyWildAreaPassiveEffect(area);

            if (logDiscoveries) {
                addLog(`The expedition discovered ${area.name} at ${Math.floor(area.distanceFromCamp)}m from camp.`);
            }
        });
}

function processExpeditionHazard(expedition) {
    const alive = Math.max(0, Math.floor(expedition.followersAlive));
    if (alive <= 0) return { casualties: 0, ended: true, prophetDied: false };

    const watchtowerAvoidChance = getWatchtowerHazardAvoidChance();
    if (watchtowerAvoidChance > 0 && Math.random() < watchtowerAvoidChance) {
        addLog('Watchtower scouts spotted danger ahead. The party slips past unharmed.');
        return { casualties: 0, ended: false, prophetDied: false };
    }

    const hazardRoll = Math.random();
    const exploration = getExplorationState();
    const hazardMultiplier = getAscensionHazardMultiplier() * getSekhmetFavorHazardMultiplier();
    const wipeoutThreshold = exploration.hazardWipeoutChance * hazardMultiplier;
    const heavyLossThreshold = wipeoutThreshold + exploration.hazardHeavyLossChance * hazardMultiplier;
    const ambushThreshold = heavyLossThreshold + exploration.hazardAmbushChance * hazardMultiplier;

    if (hazardRoll < wipeoutThreshold) {
        const prophetDied = Boolean(expedition.includesProphet);
        const casualties = alive;
        expedition.followersAlive = 0;
        addLog(`Followers encountered a bear and were all slaughtered (-${casualties}).`);
        return { casualties, ended: true, prophetDied };
    }

    if (hazardRoll < heavyLossThreshold) {
        const casualties = Math.max(1, Math.floor(alive * exploration.hazardHeavyLossFraction));
        expedition.followersAlive = Math.max(0, alive - casualties);
        // The Prophet always dies last: only a total wipeout (the branch above)
        // can claim them. A partial loss, however severe, never touches them.
        const prophetDied = false;
        addLog(`Followers encountered a bear and half were slaughtered (-${casualties}).`);
        return { casualties, ended: expedition.followersAlive <= 0, prophetDied };
    }

    if (hazardRoll < ambushThreshold) {
        const lossPercent = randomIntInRange(exploration.hazardAmbushMinLossPercent, exploration.hazardAmbushMaxLossPercent);
        const casualties = Math.max(1, Math.floor(alive * (lossPercent / 100)));
        expedition.followersAlive = Math.max(0, alive - casualties);
        const prophetDied = false;
        addLog(`Followers were ambushed and lost ${lossPercent}% of their party (-${casualties}).`);
        return { casualties, ended: expedition.followersAlive <= 0, prophetDied };
    }

    return { casualties: 0, ended: false, prophetDied: false };
}

function getNextUndiscoveredVillage(exploration) {
    const sortedVillages = exploration.villages
        .slice()
        .sort((left, right) => left.distanceFromCamp - right.distanceFromCamp);
    return sortedVillages.find((village) => !village.discovered) || null;
}

function finishExpedition(expedition, reason) {
    addLog(reason);
    if (expedition.includesProphet && expedition.prophetAlive && getRoleCount('prophet') > 0) {
        addLog('Your Prophet returns safely to camp.');
    }
    game.exploration.activeExpedition = null;
    expeditionRollReady = false;
    expeditionRollInProgress = false;
    setExpeditionDiceVisible(false);
}

function canRollExpeditionNow() {
    const { exploration, rollFaithCost } = getExpeditionConfig();
    const expedition = exploration.activeExpedition;
    if (!expedition) return false;
    if (expedition.followersAlive <= 0) return false;
    return gameState.progression.faith >= rollFaithCost;
}

function resolveExpeditionRoll(baseRoll) {
    const { exploration, rollFaithCost } = getExpeditionConfig();
    const expedition = exploration.activeExpedition;
    if (!expedition) return;

    gameState.progression.faith -= rollFaithCost;

    const hazard = processExpeditionHazard(expedition);
    if (hazard.casualties > 0) {
        removeFollowersFromSettlement(hazard.casualties, hazard.prophetDied);
        if (hazard.prophetDied) expedition.prophetAlive = false;
    }

    if (hazard.ended || expedition.followersAlive <= 0) {
        finishExpedition(expedition, 'The expedition was wiped out before reaching its destination.');
        updateUI();
        saveGame();
        return;
    }

    const bonusFollowers = Math.max(0, Math.floor(expedition.followersSent));
    const wanderlustBonus = getExpeditionRollBonus();
    const totalRoll = Math.max(1, Math.floor(baseRoll) + bonusFollowers + wanderlustBonus);
    const moved = totalRoll;
    expedition.distanceCovered += moved;
    exploration.totalMetersExplored = Math.max(
        0,
        Math.floor((Number.isFinite(exploration.totalMetersExplored) ? exploration.totalMetersExplored : 0) + moved)
    );
    syncDiscoveredAreasByDistance(exploration, { logDiscoveries: true });
    syncSettlementsByDistance(exploration, { logDiscoveries: true });

    const wanderlustLogNote = wanderlustBonus > 0 ? ` + ${wanderlustBonus} (Wanderlust)` : '';
    addLog(`Expedition roll 1d6 + followers: ${baseRoll} + ${bonusFollowers}${wanderlustLogNote} = ${totalRoll}. Progress: +${moved}m.`);

    const targetVillage = exploration.villages.find((village) => village.id === expedition.targetVillageId);
    if (targetVillage && expedition.distanceCovered >= targetVillage.distanceFromCamp) {
        targetVillage.discovered = true;
        targetVillage.prophetPresent = Boolean(expedition.includesProphet && expedition.prophetAlive);
        addLog(`The expedition has reached ${targetVillage.name}. It now appears in Discovered Areas.`);
        maybeCreateNewVillage(exploration);
        finishExpedition(expedition, `Expedition complete. ${Math.max(1, expedition.followersAlive)} followers arrived at ${targetVillage.name}.`);
    } else {
        addLog(`Expedition is now ${Math.floor(expedition.distanceCovered)}m from camp.`);
    }

    updateUI();
    saveGame();
}

export function gatherWood() {
    const gained = gameState.resources.wood.gather(getManualActionYieldMultiplier());
    if (gained !== false) {
        if (gained <= 0) addLog('Wood storage is full — nothing more can be gathered.');
        updateUI();
        saveGame();
    }
}

export function gatherStone() {
    const gained = gameState.resources.stone.gather(getManualActionYieldMultiplier());
    if (gained !== false) {
        if (gained <= 0) addLog('Stone storage is full — nothing more can be gathered.');
        updateUI();
        saveGame();
    }
}

export function gatherFood() {
    const gained = gameState.resources.food.gather(getManualActionYieldMultiplier());
    if (gained !== false) {
        if (gained > 0) {
            addLog(`A hunt yielded ${gained} food.`);
        } else {
            addLog('Food storage is full — nothing more can be gathered.');
        }
        if (!game.hasGatheredFood && gameState.resources.food.amount > 0) {
            game.hasGatheredFood = true;
        }
        updateUI();
        saveGame();
    }
}

export function pray() {
    gameState.progression.faith += game.prayAmt * getManualActionYieldMultiplier();
    updateUI();
    saveGame();
}

export function buildShelter() {
    const shelterDefinition = buildingRegistry.get('shelter');
    if (!shelterDefinition) return;

    const shelterCosts = getShelterBuildCosts();

    if (
        gameState.resources.wood.amount >= shelterCosts.wood &&
        gameState.resources.stone.amount >= shelterCosts.stone
    ) {
        gameState.resources.wood.spend(shelterCosts.wood);
        gameState.resources.stone.spend(shelterCosts.stone);
        game[shelterDefinition.levelKey] += 1;

        if (!game.hungerVisible) game.hungerVisible = true;

        game.shelterBtnUnlocked = true;
        updateUI();
        saveGame();
    }
}

export function unlockShelterUpgrade() {
    if (game.shelterUpgradeUnlocked) return;
    if (gameState.progression.followers < game.shelterUpgradeFollowerRequirement) return;

    const upgradeCost = gameState.costs.unlockShelterUpgradeFaithCost;
    if (gameState.progression.faith < upgradeCost) return;

    gameState.progression.faith -= upgradeCost;
    game.shelterUpgradeUnlocked = true;
    game.shelterCapacityMultiplier = 2;

    const costMultiplier = Number.isFinite(game.shelterUpgradeCostMultiplier) && game.shelterUpgradeCostMultiplier > 0 && game.shelterUpgradeCostMultiplier <= 1
        ? game.shelterUpgradeCostMultiplier
        : 0.7;
    applyGlobalCostReduction(costMultiplier);
    const reductionPercent = Math.round((1 - costMultiplier) * 100);
    addLog(`Shelter upgraded to Shack. Capacity doubled and costs reduced by ${reductionPercent}%.`);

    updateUI();
    saveGame();
}

export function unlockExploration() {
    if (game.explorationUnlocked) return;

    const requiredCapacity = Number.isFinite(game.prophetUnlockCapacityRequirement)
        ? Math.floor(game.prophetUnlockCapacityRequirement)
        : 150;

    if (getMaxFollowers() < requiredCapacity) return;

    const unlockCost = Number.isFinite(gameState.costs.unlockExplorationFaithCost)
        ? Math.max(0, Math.floor(gameState.costs.unlockExplorationFaithCost))
        : 650;

    if (gameState.progression.faith < unlockCost) return;

    gameState.progression.faith -= unlockCost;
    game.explorationUnlocked = true;
    addLog('Exploration unlocked. Expeditions are now available from the Explore tab.');

    updateUI();
    saveGame();
}

export function expandExpeditionParty() {
    const exploration = getExplorationState();
    const maxPurchases = Number.isFinite(game.upgradeMaxPurchases) ? game.upgradeMaxPurchases : 10;
    const purchases = Number.isFinite(exploration.partyExpansionPurchases) ? exploration.partyExpansionPurchases : 0;
    if (purchases >= maxPurchases) return;

    const cost = getUpgradeCost(gameState.costs.expandPartyBaseCost, purchases);
    if (gameState.progression.faith < cost) return;

    gameState.progression.faith -= cost;
    exploration.partyExpansionPurchases = purchases + 1;

    const increase = Number.isFinite(game.expandPartyFollowerIncrease) ? game.expandPartyFollowerIncrease : 5;
    exploration.followerSendLimit = (Number.isFinite(exploration.followerSendLimit) ? exploration.followerSendLimit : 10) + increase;

    addLog(`Expedition party capacity increased to ${exploration.followerSendLimit}.`);
    updateUI();
    saveGame();
}

export function trainExpeditionScouts() {
    const exploration = getExplorationState();
    const maxPurchases = Number.isFinite(game.upgradeMaxPurchases) ? game.upgradeMaxPurchases : 10;
    const purchases = Number.isFinite(exploration.expeditionTrainingPurchases) ? exploration.expeditionTrainingPurchases : 0;
    if (purchases >= maxPurchases) return;

    const cost = getUpgradeCost(gameState.costs.expeditionTrainingBaseCost, purchases);
    if (gameState.progression.faith < cost) return;

    gameState.progression.faith -= cost;
    exploration.expeditionTrainingPurchases = purchases + 1;

    const multiplier = Number.isFinite(game.expeditionTrainingHazardMultiplier) ? game.expeditionTrainingHazardMultiplier : 0.9;
    exploration.hazardWipeoutChance = Math.max(0, exploration.hazardWipeoutChance * multiplier);
    exploration.hazardHeavyLossChance = Math.max(0, exploration.hazardHeavyLossChance * multiplier);
    exploration.hazardAmbushChance = Math.max(0, exploration.hazardAmbushChance * multiplier);

    addLog('Your scouts are better trained. Expedition hazards are less likely.');
    updateUI();
    saveGame();
}

export function trainZealousPreaching() {
    const maxPurchases = Number.isFinite(game.upgradeMaxPurchases) ? game.upgradeMaxPurchases : 10;
    const purchases = Number.isFinite(game.zealousPreachingPurchases) ? game.zealousPreachingPurchases : 0;
    if (purchases >= maxPurchases) return;

    const cost = getUpgradeCost(gameState.costs.zealousPreachingBaseCost, purchases);
    if (gameState.progression.faith < cost) return;

    gameState.progression.faith -= cost;
    game.zealousPreachingPurchases = purchases + 1;
    game.diceBonuses.preach = (Number.isFinite(game.diceBonuses.preach) ? game.diceBonuses.preach : 0) + 1;

    addLog(`Your sermons grow more persuasive. Preach rolls now gain +${game.diceBonuses.preach}.`);
    updateUI();
    saveGame();
}

export function convertFollower() {
    const cost = getConvertFollowerCost();
    if (gameState.progression.faith >= cost) {
        gameState.progression.faith -= cost;
        gameState.progression.followers += 1;
        game.convertCost = Math.floor(game.convertCost * 1.15);
        updateUI();
        saveGame();
    }
}

export function preach() {
    if (!canPreachNow() || preachRollInProgress) return;
    preachRollReady = true;

    const preachBonus = Number.isFinite(game.diceBonuses?.preach) ? Math.trunc(game.diceBonuses.preach) : 0;

    const text = document.getElementById('preachDiceText');
    const die = document.getElementById('preachDieFace');
    if (text) {
        text.innerText = preachBonus > 0
            ? `Roll 1d4 + ${preachBonus} for conversion:`
            : 'Roll 1d4 for conversion:';
    }
    if (die) die.innerText = '?';

    setPreachDiceVisible(true);
}

export function cancelPreachRoll() {
    if (preachRollInProgress) return;
    preachRollReady = false;
    setPreachDiceVisible(false);
}

export function rollPreachD4() {
    if (!preachRollReady || preachRollInProgress) return;
    if (!canPreachNow()) {
        preachRollReady = false;
        setPreachDiceVisible(false);
        updateUI();
        return;
    }

    preachRollInProgress = true;
    const die = document.getElementById('preachDieFace');
    const text = document.getElementById('preachDiceText');
    const rollBtn = document.getElementById('preachRollBtn');
    if (rollBtn) rollBtn.disabled = true;

    const animationTicks = 8;
    let tick = 0;
    const timer = setInterval(() => {
        tick += 1;
        const preview = Math.floor(Math.random() * 4) + 1;
        if (die) die.innerText = `${preview}`;

        if (tick >= animationTicks) {
            clearInterval(timer);
            const preachBonus = Number.isFinite(game.diceBonuses?.preach) ? Math.trunc(game.diceBonuses.preach) : 0;
            const result = rollDice('1d4', { bonus: preachBonus });
            const finalRoll = result.total;
            const baseRoll = result.baseTotal;
            if (die) die.innerText = `${finalRoll}`;

            const max = getMaxFollowers();
            gameState.progression.faith -= getPreachFaithCost();
            game.hungerPercent = Math.max(0, game.hungerPercent - 10);
            gameState.resources.food.spend(10);

            game.alignment = Math.max(-100, Math.min(100, game.alignment + game.alignmentPreachGain));
            game.factionFavor.helios += game.heliosFavorPreachGain;
            if (!game.alignmentVisible) game.alignmentVisible = true;

            const capacity = Math.max(0, max - gameState.progression.followers);
            const converted = Math.min(finalRoll, capacity);
            if (converted > 0) {
                gameState.progression.followers += converted;
                if (!game.unlocksTabUnlocked) {
                    game.unlocksTabUnlocked = true;
                    addLog('Unlocks tab is now available.');
                }
                if (result.bonus > 0) {
                    addLog(`Preach roll ${result.notation}: ${baseRoll} + ${result.bonus} = ${finalRoll}. Your sermon converted ${converted} follower${converted > 1 ? 's' : ''}.`);
                } else {
                    addLog(`Preach roll ${result.notation}: ${finalRoll}. Your sermon converted ${converted} follower${converted > 1 ? 's' : ''}.`);
                }
            } else {
                if (result.bonus > 0) {
                    addLog(`Preach roll ${result.notation}: ${baseRoll} + ${result.bonus} = ${finalRoll}, but you have no room for more followers.`);
                } else {
                    addLog(`Preach roll ${result.notation}: ${finalRoll}, but you have no room for more followers.`);
                }
            }

            if (text) {
                text.innerText = result.bonus > 0
                    ? `Rolled ${baseRoll} + ${result.bonus} = ${finalRoll} on ${result.notation}.`
                    : `Rolled ${finalRoll} on ${result.notation}.`;
            }

            preachRollInProgress = false;
            preachRollReady = false;
            if (rollBtn) rollBtn.disabled = false;

            setTimeout(() => {
                if (!preachRollInProgress) setPreachDiceVisible(false);
            }, 1000);

            updateUI();
            saveGame();
        }
    }, 80);
}

export function feedFollowers() {
    if (gameState.resources.food.amount <= 0 || game.hungerPercent >= 100) return;
    gameState.resources.food.spend(1);
    const cookBonusMultiplier = 1 + getRoleCount('cooks') * gameState.rates.cookHungerGainBonusPerCook;
    const hungerGain = game.feedAmount * cookBonusMultiplier;
    game.hungerPercent = Math.min(100, game.hungerPercent + hungerGain);
    addLog('You feed the followers. Hunger restored.');
    updateUI();
    saveGame();
}

export function holdFeast() {
    if (!game.hungerVisible) return;
    const cost = Number.isFinite(game.feastFoodCost) ? game.feastFoodCost : 50;
    if (gameState.resources.food.amount < cost) return;

    gameState.resources.food.spend(cost);
    game.hungerPercent = 100;
    const bonusRate = Number.isFinite(game.feastFaithBonusPerFood) ? game.feastFaithBonusPerFood : 0.5;
    const faithBonus = Math.floor(cost * bonusRate);
    gameState.progression.faith += faithBonus;

    addLog(`A great feast is held! Hunger restored to 100%, and the faithful's spirits swell (+${faithBonus} faith).`);
    updateUI();
    saveGame();
}

export function buildRitualCircle() {
    const ritualDefinition = buildingRegistry.get('ritualCircle');
    if (!ritualDefinition) return;

    const currentLevel = game[ritualDefinition.levelKey];
    const canBuildLevel = currentLevel < ritualDefinition.maxLevel;
    const costKey = ritualDefinition.faithCostKey;

    if (gameState.progression.faith >= gameState.costs[costKey] && canBuildLevel) {
        gameState.progression.faith -= gameState.costs[costKey];
        game[ritualDefinition.levelKey] = currentLevel + 1;
        gameState.progression.faithPerFollower += 0.005;
        updateUI();
        saveGame();
    }
}

export function buildAltar() {
    if (!game.altarUnlocked || game.altarBuilt) return;

    const woodCost = gameState.costs.altarBuildWoodCost;
    const stoneCost = gameState.costs.altarBuildStoneCost;
    const faithCost = gameState.costs.altarBuildFaithCost;

    const canAfford =
        gameState.resources.wood.amount >= woodCost &&
        gameState.resources.stone.amount >= stoneCost &&
        gameState.progression.faith >= faithCost;

    if (!canAfford) return;

    gameState.resources.wood.spend(woodCost);
    gameState.resources.stone.spend(stoneCost);
    gameState.progression.faith -= faithCost;

    game.altarBuilt = true;
    game.diceBonuses.preach = Math.max(1, Number.isFinite(game.diceBonuses.preach) ? Math.trunc(game.diceBonuses.preach) : 0);
    addLog('Altar built. Preach rolls now gain +1 (1d4 + 1).');

    updateUI();
    saveGame();
}

export function advanceSettlementTier() {
    const tier = getNextSettlementTier();
    if (!tier) return;
    if (!canAffordSettlementTier(tier)) return;

    gameState.progression.faith -= (tier.faithCost || 0);
    if (tier.woodCost > 0) gameState.resources.wood.spend(tier.woodCost);
    if (tier.stoneCost > 0) gameState.resources.stone.spend(tier.stoneCost);
    if (tier.starlightCost > 0) gameState.progression.starlight -= tier.starlightCost;

    game.settlementTier = (Number.isFinite(game.settlementTier) ? game.settlementTier : 0) + 1;
    addLog(`Your settlement grows into a ${tier.name}. Capacity multiplied ${tier.capacityMultiplier}x.`);

    updateUI();
    saveGame();
}

export function buildStorehouse() {
    if (game.ritualCircleBuilt < 1) return;
    const cost = getStorehouseCost();
    if (gameState.progression.faith < cost) return;

    gameState.progression.faith -= cost;
    game.storehouse = (Number.isFinite(game.storehouse) ? game.storehouse : 0) + 1;
    addLog(`Storehouse expanded to level ${game.storehouse}. Wood/Stone capacity: ${Math.floor(getWoodStoneCap())}.`);

    updateUI();
    saveGame();
}

export function buildGranary() {
    if (game.ritualCircleBuilt < 1) return;
    const cost = getGranaryCost();
    if (gameState.resources.wood.amount < cost.wood || gameState.resources.stone.amount < cost.stone) return;

    gameState.resources.wood.spend(cost.wood);
    gameState.resources.stone.spend(cost.stone);
    game.granary = (Number.isFinite(game.granary) ? game.granary : 0) + 1;
    addLog(`Granary expanded to level ${game.granary}. Food capacity: ${Math.floor(getFoodCap())}.`);

    updateUI();
    saveGame();
}

export function buildScriptorium() {
    if (game.ritualCircleBuilt < 1) return;
    const rank = Number.isFinite(game.scriptorium) ? game.scriptorium : 0;
    const maxRank = Number.isFinite(game.upgradeMaxPurchases) ? game.upgradeMaxPurchases : 10;
    if (rank >= maxRank) return;

    const cost = getUpgradeCost(gameState.costs.scriptoriumBaseCost, rank);
    if (gameState.progression.faith < cost) return;

    gameState.progression.faith -= cost;
    game.scriptorium = rank + 1;
    const perRank = Number.isFinite(game.scriptoriumOutputPerRank) ? game.scriptoriumOutputPerRank : 0.08;
    addLog(`Scriptorium deepens to rank ${game.scriptorium}/${maxRank}. Ritualist output +${Math.round(game.scriptorium * perRank * 100)}%.`);

    updateUI();
    saveGame();
}

export function buildWatchtower() {
    if (!game.explorationUnlocked) return;
    const cost = getWatchtowerCost();
    if (gameState.resources.wood.amount < cost.wood || gameState.resources.stone.amount < cost.stone) return;

    gameState.resources.wood.spend(cost.wood);
    gameState.resources.stone.spend(cost.stone);
    game.watchtower = (Number.isFinite(game.watchtower) ? game.watchtower : 0) + 1;
    addLog(`Watchtower raised to level ${game.watchtower}. Scouts now spot ${Math.round(getWatchtowerHazardAvoidChance() * 100)}% of expedition dangers before they strike.`);

    updateUI();
    saveGame();
}

export function buildBarracks() {
    if (!game.explorationUnlocked) return;
    const cost = getBarracksCost();
    if (gameState.resources.wood.amount < cost.wood || gameState.resources.stone.amount < cost.stone) return;

    gameState.resources.wood.spend(cost.wood);
    gameState.resources.stone.spend(cost.stone);
    game.barracks = (Number.isFinite(game.barracks) ? game.barracks : 0) + 1;
    addLog(`Barracks raised to level ${game.barracks}. Raiding parties gain +${getBarracksConquerRollBonus()} to their conquest roll.`);

    updateUI();
    saveGame();
}

export function buildWell() {
    if (!game.hungerVisible) return;
    const cost = getWellCost();
    if (gameState.resources.wood.amount < cost.wood || gameState.resources.stone.amount < cost.stone) return;

    gameState.resources.wood.spend(cost.wood);
    gameState.resources.stone.spend(cost.stone);
    game.well = (Number.isFinite(game.well) ? game.well : 0) + 1;
    addLog(`Well dug to level ${game.well}. Follower food consumption reduced further.`);

    updateUI();
    saveGame();
}

export function buildMarketplace() {
    if (game.storehouse < 1) return;
    const cost = getMarketplaceCost();
    if (gameState.resources.wood.amount < cost.wood || gameState.resources.stone.amount < cost.stone) return;

    gameState.resources.wood.spend(cost.wood);
    gameState.resources.stone.spend(cost.stone);
    game.marketplace = (Number.isFinite(game.marketplace) ? game.marketplace : 0) + 1;
    addLog(`Marketplace expanded to level ${game.marketplace}. Trades now yield ${getMarketplaceTradeFaithYield()} faith.`);

    updateUI();
    saveGame();
}

export function tradeAtMarketplace() {
    if (game.marketplace < 1) return;
    const cost = getMarketplaceTradeCost();
    if (gameState.resources.wood.amount < cost.wood || gameState.resources.stone.amount < cost.stone) return;

    gameState.resources.wood.spend(cost.wood);
    gameState.resources.stone.spend(cost.stone);
    const faithGained = getMarketplaceTradeFaithYield();
    gameState.progression.faith += faithGained;
    game.marketplaceTradesCompleted = (Number.isFinite(game.marketplaceTradesCompleted) ? game.marketplaceTradesCompleted : 0) + 1;
    addLog(`Traded surplus wood and stone at the Marketplace for ${faithGained} faith.`);

    updateUI();
    saveGame();
}

export function buildMonument() {
    if (!canUnlockMonument()) return;
    const cost = getMonumentCost();
    if (
        gameState.progression.faith < cost.faith ||
        gameState.resources.wood.amount < cost.wood ||
        gameState.resources.stone.amount < cost.stone
    ) return;

    gameState.progression.faith -= cost.faith;
    gameState.resources.wood.spend(cost.wood);
    gameState.resources.stone.spend(cost.stone);
    game.monument = (Number.isFinite(game.monument) ? game.monument : 0) + 1;
    addLog(`Monument raised to level ${game.monument}. Every follower's faith output rises.`);

    updateUI();
    saveGame();
}

export function buildCatechismHall() {
    if (!game.altarBuilt) return;
    const cost = getCatechismHallCost();
    if (gameState.progression.faith < cost.faith || gameState.resources.wood.amount < cost.wood) return;

    gameState.progression.faith -= cost.faith;
    gameState.resources.wood.spend(cost.wood);
    game.catechismHall = (Number.isFinite(game.catechismHall) ? game.catechismHall : 0) + 1;
    addLog(`Catechism Hall raised to level ${game.catechismHall}. Missionaries now quietly win hearts in every unresolved village and city.`);

    updateUI();
    saveGame();
}

export function buildWarCamp() {
    if (!game.explorationUnlocked) return;
    const cost = getWarCampCost();
    if (
        gameState.progression.faith < cost.faith ||
        gameState.resources.wood.amount < cost.wood ||
        gameState.resources.stone.amount < cost.stone
    ) return;

    gameState.progression.faith -= cost.faith;
    gameState.resources.wood.spend(cost.wood);
    gameState.resources.stone.spend(cost.stone);
    game.warCamp = (Number.isFinite(game.warCamp) ? game.warCamp : 0) + 1;
    addLog(`War Camp raised to level ${game.warCamp}. Warbands can now number up to ${getMaxWarbandSize()}.`);

    updateUI();
    saveGame();
}

function findSettlement(settlementId) {
    const exploration = getExplorationState();
    return exploration.settlements.find((settlement) => settlement.id === settlementId && settlement.discovered) || null;
}

function recordSettlementTrade(settlement) {
    settlement.tradesCompleted = (Number.isFinite(settlement.tradesCompleted) ? settlement.tradesCompleted : 0) + 1;
    const gain = Number.isFinite(game.settlementReputationGainPerTrade) ? game.settlementReputationGainPerTrade : 1;
    settlement.reputation = (Number.isFinite(settlement.reputation) ? settlement.reputation : 0) + gain;
}

export function buyFromSettlement(settlementId) {
    const settlement = findSettlement(settlementId);
    if (!settlement) return;

    const cost = getSettlementBuyResourceCost(settlement);
    if (gameState.progression.faith < cost) return;

    const specialty = SETTLEMENT_SPECIALTY_BY_ID[settlement.specialtyId];
    if (!specialty) return;
    const resource = gameState.resources[specialty.resource];
    if (!resource) return;

    gameState.progression.faith -= cost;
    const batchSize = Number.isFinite(game.settlementResourceBatchSize) ? game.settlementResourceBatchSize : 200;
    const gained = resource.add(batchSize);
    recordSettlementTrade(settlement);
    addLog(`Bought ${Math.floor(gained)} ${specialty.resourceLabel.toLowerCase()} from ${settlement.name} for ${cost} faith.`);

    updateUI();
    saveGame();
}

export function sellToSettlement(settlementId) {
    const settlement = findSettlement(settlementId);
    if (!settlement) return;

    const specialty = SETTLEMENT_SPECIALTY_BY_ID[settlement.specialtyId];
    if (!specialty) return;
    const resource = gameState.resources[specialty.resource];
    if (!resource) return;

    const batchSize = Number.isFinite(game.settlementResourceBatchSize) ? game.settlementResourceBatchSize : 200;
    if (resource.amount < batchSize) return;

    const faithGained = getSettlementSellResourceYield(settlement);
    resource.spend(batchSize);
    gameState.progression.faith += faithGained;
    recordSettlementTrade(settlement);
    addLog(`Sold ${batchSize} ${specialty.resourceLabel.toLowerCase()} to ${settlement.name} for ${faithGained} faith.`);

    updateUI();
    saveGame();
}

export function buySettlementGood(settlementId) {
    const settlement = findSettlement(settlementId);
    if (!settlement) return;

    const cost = getSettlementBuyGoodCost(settlement);
    if (gameState.progression.faith < cost) return;

    const specialty = SETTLEMENT_SPECIALTY_BY_ID[settlement.specialtyId];
    const good = specialty ? TRADE_GOODS[specialty.goodId] : null;
    if (!specialty || !good) return;

    if (!gameState.progression.goods || typeof gameState.progression.goods !== 'object') {
        gameState.progression.goods = {};
    }
    gameState.progression.faith -= cost;
    gameState.progression.goods[good.id] = (Number.isFinite(gameState.progression.goods[good.id]) ? gameState.progression.goods[good.id] : 0) + 1;
    recordSettlementTrade(settlement);
    addLog(`Bought ${good.name} from ${settlement.name} for ${cost} faith.`);

    updateUI();
    saveGame();
}

export function hirePilgrims() {
    if (game.marketplace < 1) return;

    const cost = getHirePilgrimsCost();
    if (gameState.progression.faith < cost) return;

    const max = getMaxFollowers();
    const capacity = Math.max(0, max - gameState.progression.followers);
    if (capacity <= 0) return;

    const perPurchase = Number.isFinite(game.hirePilgrimsFollowersPerPurchase) ? game.hirePilgrimsFollowersPerPurchase : 10;
    const granted = Math.min(perPurchase, capacity);

    gameState.progression.faith -= cost;
    gameState.progression.followers += granted;
    game.hirePilgrimsPurchased = (Number.isFinite(game.hirePilgrimsPurchased) ? game.hirePilgrimsPurchased : 0) + 1;
    addLog(`Hired ${granted} pilgrims for ${cost} faith. They join your ranks as followers.`);

    updateUI();
    saveGame();
}

export function unlockAltar() {
    if (game.altarUnlocked) return;
    if (gameState.progression.followers < game.shelterUpgradeFollowerRequirement) return;

    game.altarUnlocked = true;
    addLog('Altar unlocked. Build it in the Build tab to activate its effects.');

    updateUI();
    saveGame();
}

export function blessTheHarvest() {
    if (game.danuBlessingUnlocked) return;
    if (!game.unlocksTabUnlocked) return;

    const faithCost = gameState.costs.blessHarvestFaithCost;
    const woodCost = gameState.costs.blessHarvestWoodCost;
    const stoneCost = gameState.costs.blessHarvestStoneCost;

    const canAfford =
        gameState.progression.faith >= faithCost &&
        gameState.resources.wood.amount >= woodCost &&
        gameState.resources.stone.amount >= stoneCost;

    if (!canAfford) return;

    gameState.progression.faith -= faithCost;
    gameState.resources.wood.spend(woodCost);
    gameState.resources.stone.spend(stoneCost);

    game.danuBlessingUnlocked = true;
    game.alignment = Math.max(-100, Math.min(100, game.alignment + game.alignmentBlessHarvestGain));
    game.factionFavor.danu += game.danuFavorBlessHarvestGain;
    if (!game.alignmentVisible) game.alignmentVisible = true;

    addLog(`The Earth Mother blesses your harvest. Hunters and Gatherers now produce ${Math.round((game.danuBlessingMultiplier - 1) * 100)}% more.`);

    updateUI();
    saveGame();
}

export function conveneCouncil() {
    if (game.doctrinesUnlocked) return;
    if (!game.unlocksTabUnlocked) return;

    const requirement = Number.isFinite(game.councilFollowerRequirement) ? game.councilFollowerRequirement : 10;
    if (gameState.progression.followers < requirement) return;

    const cost = Number.isFinite(gameState.costs.councilFaithCost) ? gameState.costs.councilFaithCost : 100;
    if (gameState.progression.faith < cost) return;

    gameState.progression.faith -= cost;
    game.doctrinesUnlocked = true;
    addLog('The Council convenes. The Doctrines tab is now open.');

    updateUI();
    saveGame();
}

export function offerToTheVeil() {
    if (!game.unlocksTabUnlocked) return;

    const followerCost = Number.isFinite(game.helOfferingFollowerCost) ? game.helOfferingFollowerCost : 3;
    const faithCost = Number.isFinite(gameState.costs.helOfferingFaithCost) ? gameState.costs.helOfferingFaithCost : 20;

    if (gameState.progression.followers <= followerCost) return;
    if (gameState.progression.faith < faithCost) return;

    const confirmed = window.confirm(`Sacrifice ${followerCost} followers to Hel's veil? This cannot be undone.`);
    if (!confirmed) return;

    gameState.progression.faith -= faithCost;
    const sacrificed = removeFollowersFromSettlement(followerCost);
    if (sacrificed <= 0) return;

    const refund = Number.isFinite(game.helOfferingFaithRefund) ? game.helOfferingFaithRefund : 30;
    gameState.progression.faith += refund;

    game.alignment = Math.max(-100, Math.min(100, game.alignment - game.alignmentHelOfferingLoss));
    game.factionFavor.hel += game.helFavorOfferingGain;
    if (!game.alignmentVisible) game.alignmentVisible = true;

    addLog(`${sacrificed} followers are given to the veil. Hel takes notice.`);

    updateUI();
    saveGame();
}

export function startExpedition() {
    const { exploration, limit } = getExpeditionConfig();
    if (exploration.activeExpedition) return;
    const activeWorld = game.activeWorldId ? (game.worlds || []).find((world) => world.id === game.activeWorldId) : null;
    if (activeWorld?.activeExpedition) return;

    const inputEl = document.getElementById('expeditionFollowersInput');
    const includeProphetEl = document.getElementById('includeProphetCheckbox');
    const hasProphet = hasProphetAssigned();
    const includeProphet = Boolean(hasProphet && includeProphetEl?.checked);

    let followersToSend = inputEl ? parseInt(inputEl.value, 10) : 1;
    if (!Number.isFinite(followersToSend)) followersToSend = 1;

    const unassignedFollowers = getUnassignedFollowers();
    if (unassignedFollowers <= 0) {
        addLog('No unassigned followers available for expedition duty.');
        return;
    }

    const maxSelectable = Math.min(limit, unassignedFollowers);
    followersToSend = Math.max(1, Math.min(maxSelectable, followersToSend));

    const minimumRequired = includeProphet ? 1 : 1;
    if (followersToSend < minimumRequired) return;

    const nextVillage = getNextUndiscoveredVillage(exploration);
    if (!nextVillage) {
        addLog('No undiscovered villages remain at this time.');
        return;
    }

    exploration.activeExpedition = {
        followersSent: followersToSend,
        followersAlive: followersToSend,
        includesProphet: includeProphet,
        prophetAlive: includeProphet,
        distanceCovered: 0,
        targetVillageId: nextVillage.id
    };

    addLog(`Expedition started with ${followersToSend} follower${followersToSend > 1 ? 's' : ''}${includeProphet ? ' and your Prophet' : ''}.`);
    addLog(`Target: ${nextVillage.name} at ${nextVillage.distanceFromCamp}m from camp.`);

    expeditionRollReady = false;
    expeditionRollInProgress = false;
    setExpeditionDiceVisible(false);

    updateUI();
    saveGame();
}

export function rollExpedition() {
    if (expeditionRollInProgress) return;

    const { exploration, rollFaithCost } = getExpeditionConfig();
    const expedition = exploration.activeExpedition;
    if (!expedition) {
        addLog('Start an expedition before rolling.');
        return;
    }
    if (!canRollExpeditionNow()) {
        addLog(`Need ${rollFaithCost} faith to push the expedition forward.`);
        updateUI();
        return;
    }

    expeditionRollReady = true;
    const text = document.getElementById('expeditionDiceText');
    const die = document.getElementById('expeditionDieFace');
    const bonusFollowers = Math.max(0, Math.floor(expedition.followersSent));
    const wanderlustBonus = getExpeditionRollBonus();
    if (text) {
        text.innerText = wanderlustBonus > 0
            ? `Roll 1d6 + ${bonusFollowers} + ${wanderlustBonus} to explore (${rollFaithCost} faith):`
            : `Roll 1d6 + ${bonusFollowers} to explore (${rollFaithCost} faith):`;
    }
    if (die) die.innerText = '?';
    setExpeditionDiceVisible(true);
}

export function cancelExpeditionRoll() {
    if (expeditionRollInProgress) return;
    expeditionRollReady = false;
    setExpeditionDiceVisible(false);
}

export function rollExpeditionD6() {
    if (!expeditionRollReady || expeditionRollInProgress) return;
    if (!canRollExpeditionNow()) {
        expeditionRollReady = false;
        setExpeditionDiceVisible(false);
        updateUI();
        return;
    }

    expeditionRollInProgress = true;

    const die = document.getElementById('expeditionDieFace');
    const text = document.getElementById('expeditionDiceText');
    const rollBtn = document.getElementById('expeditionRollNowBtn');
    if (rollBtn) rollBtn.disabled = true;

    const animationTicks = 10;
    let tick = 0;
    const timer = setInterval(() => {
        tick += 1;
        const preview = Math.floor(Math.random() * 6) + 1;
        if (die) die.innerText = `${preview}`;

        if (tick >= animationTicks) {
            clearInterval(timer);

            const baseRoll = Math.floor(Math.random() * 6) + 1;
            const expedition = game.exploration?.activeExpedition;
            const bonusFollowers = Math.max(0, Math.floor(expedition?.followersSent || 0));
            const wanderlustBonus = getExpeditionRollBonus();
            const totalRoll = baseRoll + bonusFollowers + wanderlustBonus;

            if (die) die.innerText = `${totalRoll}`;
            if (text) text.innerText = wanderlustBonus > 0
                ? `Rolled ${baseRoll} + ${bonusFollowers} + ${wanderlustBonus} = ${totalRoll}.`
                : `Rolled ${baseRoll} + ${bonusFollowers} = ${totalRoll}.`;

            resolveExpeditionRoll(baseRoll);

            expeditionRollInProgress = false;
            expeditionRollReady = false;
            if (rollBtn) rollBtn.disabled = false;

            setTimeout(() => {
                if (!expeditionRollInProgress) setExpeditionDiceVisible(false);
            }, 1000);
        }
    }, 80);
}

export function cancelExpedition() {
    if (expeditionRollInProgress) return;
    const exploration = getExplorationState();
    if (!exploration.activeExpedition) return;
    exploration.activeExpedition = null;
    expeditionRollReady = false;
    setExpeditionDiceVisible(false);
    addLog('Expedition recalled to camp.');
    updateUI();
    saveGame();
}

export function holdVillageSermon(villageId) {
    const exploration = getExplorationState();
    const village = exploration.villages.find((candidate) => candidate.id === villageId && candidate.discovered);
    if (!village) return;

    if (village.resolutionType) {
        addLog(`${village.name} has already been resolved.`);
        return;
    }

    if (!village.prophetPresent) {
        addLog('A Prophet must arrive with the expedition before sermons can be held in this village.');
        return;
    }

    if (village.convertedPercent >= 100) {
        addLog(`${village.name} is already fully converted.`);
        return;
    }

    const sermonFaithCost = Number.isFinite(gameState.costs.holdSermonFaithCost)
        ? Math.max(0, gameState.costs.holdSermonFaithCost)
        : 5;
    if (gameState.progression.faith < sermonFaithCost) {
        addLog(`Need ${sermonFaithCost} faith to hold a sermon.`);
        return;
    }
    gameState.progression.faith -= sermonFaithCost;

    const prophetSway = Number.isFinite(gameState.progression.prophetSway)
        ? gameState.progression.prophetSway
        : 12;
    const resistance = Number.isFinite(village.resistance) ? village.resistance : 50;
    const swayDivisor = Number.isFinite(exploration.sermonSwayDivisor) ? exploration.sermonSwayDivisor : 8;
    const swayBonus = Math.max(0, Math.floor((prophetSway - resistance) / swayDivisor));
    const roll = rollDice('1d20', { bonus: swayBonus });
    const conversionPercent = Math.max(0, Math.min(100, Math.floor((roll.total / 20) * 100)));

    const totalRemaining = 100 - village.convertedPercent;
    const gainPercent = Math.min(totalRemaining, Math.max(1, Math.floor(conversionPercent * 0.35)));
    village.convertedPercent = Math.min(100, village.convertedPercent + gainPercent);
    village.sermonsHeld = (village.sermonsHeld || 0) + 1;

    const convertedPeople = Math.floor(village.population * (gainPercent / 100));
    const max = getMaxFollowers();
    const capacity = Math.max(0, max - gameState.progression.followers);
    const grantedFollowers = Math.min(convertedPeople, capacity);
    if (grantedFollowers > 0) {
        gameState.progression.followers += grantedFollowers;
    }

    game.alignment = Math.max(-100, Math.min(100, game.alignment + game.alignmentConvertGain));
    game.factionFavor.helios += game.heliosFavorConvertGain;
    if (!game.alignmentVisible) game.alignmentVisible = true;

    addLog(
        `Sermon at ${village.name}: roll ${roll.baseTotal}${roll.bonus > 0 ? ` + ${roll.bonus}` : ''} = ${roll.total}. Converted ${gainPercent}% (${grantedFollowers} follower${grantedFollowers === 1 ? '' : 's'} joined).`
    );

    if (village.convertedPercent >= 100) {
        village.resolutionType = 'converted';
        addLog(`${village.name} is now a permanent outpost, tithing faith to your cause.`);
    }

    updateUI();
    saveGame();
}

// Shared by both Goodwill Task actions below - mirrors holdVillageSermon()'s
// own shape exactly (proportional followers per call, alignment/favor per
// call, resolutionType flips once convertedPercent crosses 100) so the two
// peaceful-path mechanisms feel like the same system, not two different ones
// bolted together.
function applyGoodwillGain(village, gainPercent, taskLabel) {
    const totalRemaining = 100 - (Number.isFinite(village.convertedPercent) ? village.convertedPercent : 0);
    const actualGain = Math.max(0, Math.min(totalRemaining, gainPercent));
    village.convertedPercent = Math.min(100, (Number.isFinite(village.convertedPercent) ? village.convertedPercent : 0) + actualGain);
    village.goodwillTasksCompleted = (Number.isFinite(village.goodwillTasksCompleted) ? village.goodwillTasksCompleted : 0) + 1;

    const convertedPeople = Math.floor(village.population * (actualGain / 100));
    const capacity = Math.max(0, getMaxFollowers() - gameState.progression.followers);
    const grantedFollowers = Math.min(convertedPeople, capacity);
    if (grantedFollowers > 0) gameState.progression.followers += grantedFollowers;

    game.alignment = Math.max(-100, Math.min(100, game.alignment + game.alignmentConvertGain));
    game.factionFavor.helios += game.heliosFavorConvertGain;
    if (!game.alignmentVisible) game.alignmentVisible = true;

    addLog(`${taskLabel} for ${village.name}. Goodwill +${actualGain}% (now ${Math.floor(village.convertedPercent)}%), +${grantedFollowers} follower${grantedFollowers === 1 ? '' : 's'}.`);

    if (village.convertedPercent >= 100 && !village.resolutionType) {
        village.resolutionType = 'converted';
        addLog(`${village.name} is now a permanent outpost, tithing faith to your cause.`);
    }
}

// Goodwill Tasks: unlike Sermon, these need no Prophet - your people can dig
// a well or hold a feast whether or not the Prophet is off on expedition.
// City-only, matching the "villages stay quick, cities get real depth" call.
// Each use escalates in cost per-target (same anti-spam pattern as the
// Marketplace/Hire Pilgrims fixes earlier this session), so this is a real
// contribution alongside Sermon, not a way to trivially spam to 100%.
export function digWellForVillage(villageId) {
    const exploration = getExplorationState();
    const village = exploration.villages.find((candidate) => candidate.id === villageId && candidate.discovered && candidate.tier === 'city');
    if (!village || village.resolutionType || village.war) return;

    const cost = getDigWellCost(village);
    if (gameState.resources.wood.amount < cost.wood || gameState.resources.stone.amount < cost.stone) return;

    gameState.resources.wood.spend(cost.wood);
    gameState.resources.stone.spend(cost.stone);
    const gain = Number.isFinite(exploration.digWellGoodwillGain) ? exploration.digWellGoodwillGain : 12;
    applyGoodwillGain(village, gain, 'Dug a well');

    updateUI();
    saveGame();
}

export function holdFeastForVillage(villageId) {
    const exploration = getExplorationState();
    const village = exploration.villages.find((candidate) => candidate.id === villageId && candidate.discovered && candidate.tier === 'city');
    if (!village || village.resolutionType || village.war) return;

    const cost = getHoldFeastForVillageCost(village);
    if (gameState.resources.food.amount < cost) return;

    gameState.resources.food.spend(cost);
    const gain = Number.isFinite(exploration.holdFeastGoodwillGain) ? exploration.holdFeastGoodwillGain : 10;
    applyGoodwillGain(village, gain, 'Held a feast');

    updateUI();
    saveGame();
}

export function conquerVillage(villageId) {
    const exploration = getExplorationState();
    const village = exploration.villages.find((candidate) => candidate.id === villageId && candidate.discovered);
    if (!village) return;

    if (village.tier === 'city') {
        addLog(`${village.name} is a city - it takes a real war to conquer, not a single raid. Declare War instead.`);
        return;
    }

    if (village.resolutionType) {
        addLog(`${village.name} has already been resolved.`);
        return;
    }

    const conquerFaithCost = getConquerVillageFaithCost();
    if (gameState.progression.faith < conquerFaithCost) {
        addLog(`Need ${conquerFaithCost} faith to launch a raid.`);
        return;
    }
    gameState.progression.faith -= conquerFaithCost;

    const hunterForce = getRoleCount('hunters');
    const resistance = Number.isFinite(village.resistance) ? village.resistance : 50;
    const forceDivisor = Number.isFinite(exploration.conquerForceDivisor) ? exploration.conquerForceDivisor : 10;
    const forceBonus = Math.max(0, Math.floor((hunterForce - resistance) / forceDivisor)) + getConquestRollBonus();
    const roll = rollDice('1d20', { bonus: forceBonus });
    const conquerScale = Math.max(0.05, Math.min(1, roll.total / 20));

    const yieldMultiplier = getConquerYieldMultiplier();
    const burstMultiplier = Number.isFinite(exploration.conquerFollowerBurstMultiplier) ? exploration.conquerFollowerBurstMultiplier : 3;
    const baseFollowerYield = Math.max(1, Math.floor(village.population * 0.35 * burstMultiplier * conquerScale * yieldMultiplier / 100));
    const max = getMaxFollowers();
    const capacity = Math.max(0, max - gameState.progression.followers);
    const grantedFollowers = Math.min(baseFollowerYield, capacity);
    if (grantedFollowers > 0) {
        gameState.progression.followers += grantedFollowers;
    }

    const villageRewardScale = getDistanceRewardScale(village.distanceFromCamp);
    const woodLoot = Math.floor(randomIntInRange(exploration.conquerWoodLootMin, exploration.conquerWoodLootMax) * conquerScale * yieldMultiplier * villageRewardScale);
    const stoneLoot = Math.floor(randomIntInRange(exploration.conquerStoneLootMin, exploration.conquerStoneLootMax) * conquerScale * yieldMultiplier * villageRewardScale);
    gameState.resources.wood.add(woodLoot);
    gameState.resources.stone.add(stoneLoot);

    village.resolutionType = 'conquered';
    village.convertedPercent = 0;

    game.alignment = Math.max(-100, Math.min(100, game.alignment - game.alignmentConquerLoss));
    game.factionFavor.sekhmet += game.sekhmetFavorConquerGain;
    if (!game.alignmentVisible) game.alignmentVisible = true;

    addLog(
        `Raid on ${village.name}: roll ${roll.baseTotal}${roll.bonus > 0 ? ` + ${roll.bonus}` : ''} = ${roll.total} vs resistance ${resistance}. ` +
        `${village.name} is ransacked. +${grantedFollowers} follower${grantedFollowers === 1 ? '' : 's'}, +${woodLoot} wood, +${stoneLoot} stone.`
    );

    updateUI();
    saveGame();
}

function findCity(villageId) {
    const exploration = getExplorationState();
    const village = exploration.villages.find((candidate) => candidate.id === villageId && candidate.discovered);
    if (!village || village.tier !== 'city') return null;
    return village;
}

function readWarbandInput(villageId) {
    const inputEl = document.getElementById(`warbandInput-${villageId}`);
    let size = inputEl ? parseInt(inputEl.value, 10) : 1;
    if (!Number.isFinite(size)) size = 1;

    const limit = getMaxWarbandSize();
    const unassigned = getUnassignedFollowers();
    return { size: Math.max(1, Math.min(limit, unassigned, size)), unassigned };
}

export function declareWar(villageId) {
    const village = findCity(villageId);
    if (!village) return;
    if (village.resolutionType) {
        addLog(`${village.name} has already been resolved.`);
        return;
    }
    if (village.war) {
        addLog(`You are already at war with ${village.name}.`);
        return;
    }

    const { size, unassigned } = readWarbandInput(villageId);
    if (unassigned <= 0) {
        addLog('No unassigned followers available to muster a warband.');
        return;
    }

    const cost = getDeclareWarFaithCost(village);
    if (gameState.progression.faith < cost) {
        addLog(`Need ${cost} faith to muster a warband and declare war on ${village.name}.`);
        return;
    }
    gameState.progression.faith -= cost;

    village.war = {
        warbandSent: size,
        warbandAlive: size,
        progress: 0,
        resistanceAtStart: Number.isFinite(village.resistance) ? village.resistance : 50,
        eventTimer: 0
    };

    addLog(`War declared on ${village.name}. ${size} follower${size === 1 ? '' : 's'} march to lay siege.`);
    updateUI();
    saveGame();
}

export function reinforceSiege(villageId) {
    const village = findCity(villageId);
    if (!village || !village.war) return;

    const { size, unassigned } = readWarbandInput(villageId);
    if (unassigned <= 0) {
        addLog('No unassigned followers available to reinforce the siege.');
        return;
    }

    const cost = getDeclareWarFaithCost(village);
    if (gameState.progression.faith < cost) {
        addLog(`Need ${cost} faith to send reinforcements to ${village.name}.`);
        return;
    }
    gameState.progression.faith -= cost;

    village.war.warbandSent += size;
    village.war.warbandAlive += size;

    addLog(`${size} reinforcement${size === 1 ? '' : 's'} sent to the siege of ${village.name}.`);
    updateUI();
    saveGame();
}

export function pacifyOutpost(villageId) {
    const village = findCity(villageId);
    if (!village) return;
    if (village.resolutionType !== 'conquered' || !(Number.isFinite(village.unrest) && village.unrest > 0)) return;

    const cost = Number.isFinite(gameState.costs.pacifyOutpostFaithCost) ? gameState.costs.pacifyOutpostFaithCost : 100;
    if (gameState.progression.faith < cost) {
        addLog(`Need ${cost} faith to send envoys to pacify ${village.name}.`);
        return;
    }
    gameState.progression.faith -= cost;

    const exploration = getExplorationState();
    const reduction = Number.isFinite(exploration.pacifyOutpostUnrestReduction) ? exploration.pacifyOutpostUnrestReduction : 20;
    village.unrest = Math.max(0, village.unrest - reduction);

    addLog(`Envoys sent to pacify ${village.name}. Unrest now ${Math.floor(village.unrest)}.`);
    updateUI();
    saveGame();
}

function resolveSiegeVictory(village, exploration) {
    const war = village.war;
    const casualtyRatio = war.warbandSent > 0 ? Math.max(0, 1 - war.warbandAlive / war.warbandSent) : 0;
    const brutality = Number.isFinite(exploration.siegeBrutalityPopulationFactor) ? exploration.siegeBrutalityPopulationFactor : 0.8;
    const survivalFloor = Number.isFinite(exploration.siegePopulationSurvivalFloor) ? exploration.siegePopulationSurvivalFloor : 0.3;
    const survivalRate = Math.max(survivalFloor, 1 - casualtyRatio * brutality);

    const max = getMaxFollowers();
    const capacity = Math.max(0, max - gameState.progression.followers);
    const populationYield = Math.floor(village.population * survivalRate);
    const grantedFollowers = Math.min(populationYield, capacity);
    if (grantedFollowers > 0) {
        gameState.progression.followers += grantedFollowers;
    }

    village.resolutionType = 'conquered';
    village.convertedPercent = 0;
    village.unrest = Number.isFinite(exploration.warOutpostUnrestInitial) ? exploration.warOutpostUnrestInitial : 50;
    village.war = null;

    game.alignment = Math.max(-100, Math.min(100, game.alignment - game.alignmentConquerLoss));
    game.factionFavor.sekhmet += game.sekhmetFavorConquerGain;
    if (!game.alignmentVisible) game.alignmentVisible = true;

    return { grantedFollowers, survivalRate };
}

function resolveSiegeDefeat(village) {
    village.war = null;
}

function processSiegeEvent(village, exploration) {
    const war = village.war;
    const roll = Math.random();

    if (roll < 0.4) {
        const min = Number.isFinite(exploration.siegeAmbushCasualtyMin) ? exploration.siegeAmbushCasualtyMin : 0.05;
        const max = Number.isFinite(exploration.siegeAmbushCasualtyMax) ? exploration.siegeAmbushCasualtyMax : 0.15;
        const fraction = randomInRange(min, max);
        const casualties = Math.max(1, Math.floor(war.warbandAlive * fraction));
        const actual = removeFollowersFromSettlement(casualties);
        war.warbandAlive = Math.max(0, war.warbandAlive - actual);
        return { type: 'ambush', casualties: actual };
    }

    if (roll < 0.7) {
        const min = Number.isFinite(exploration.siegeAttritionCasualtyMin) ? exploration.siegeAttritionCasualtyMin : 0.01;
        const max = Number.isFinite(exploration.siegeAttritionCasualtyMax) ? exploration.siegeAttritionCasualtyMax : 0.04;
        const fraction = randomInRange(min, max);
        const casualties = Math.max(0, Math.floor(war.warbandAlive * fraction));
        if (casualties <= 0) return null;
        const actual = removeFollowersFromSettlement(casualties);
        war.warbandAlive = Math.max(0, war.warbandAlive - actual);
        return { type: 'attrition', casualties: actual };
    }

    const bonus = Number.isFinite(exploration.siegeReinforcementProgressBonus) ? exploration.siegeReinforcementProgressBonus : 5;
    war.progress = Math.min(100, war.progress + bonus);
    return { type: 'breakthrough', bonus };
}

// Called from tick.js every simulated second: advances every active siege,
// rolls periodic events, resolves win/loss, and decays unrest on war-won
// outposts. Kept here (not in tick.js) alongside the rest of the settlement-
// mutation logic; tick.js stays a thin driver, matching how the rest of this
// module is organized.
export function processSiegeTick(dtSeconds, onEvent) {
    const exploration = game.exploration;
    if (!exploration || !Array.isArray(exploration.villages)) return;

    exploration.villages.forEach((village) => {
        if (village.tier === 'city' && village.resolutionType === 'conquered' && Number.isFinite(village.unrest) && village.unrest > 0) {
            const decay = Number.isFinite(exploration.warOutpostUnrestDecayPerSecond) ? exploration.warOutpostUnrestDecayPerSecond : 0.05;
            village.unrest = Math.max(0, village.unrest - decay * dtSeconds);
        }

        const war = village.war;
        if (!war) return;

        if (war.warbandAlive <= 0) {
            resolveSiegeDefeat(village);
            onEvent('siege-defeat', { villageName: village.name });
            return;
        }

        const progressRate = getSiegeProgressPerSecond(village);
        war.progress = Math.min(100, (Number.isFinite(war.progress) ? war.progress : 0) + progressRate * dtSeconds);

        war.eventTimer = (Number.isFinite(war.eventTimer) ? war.eventTimer : 0) + dtSeconds;
        const checkInterval = Number.isFinite(exploration.siegeEventCheckIntervalSeconds) ? exploration.siegeEventCheckIntervalSeconds : 180;
        while (war.eventTimer >= checkInterval && war.warbandAlive > 0 && war.progress < 100) {
            war.eventTimer -= checkInterval;
            const eventChance = Number.isFinite(exploration.siegeEventChance) ? exploration.siegeEventChance : 0.35;
            if (Math.random() < eventChance) {
                const result = processSiegeEvent(village, exploration);
                if (result) onEvent('siege-event', { villageName: village.name, ...result });
            }
        }

        if (war.warbandAlive <= 0) {
            resolveSiegeDefeat(village);
            onEvent('siege-defeat', { villageName: village.name });
        } else if (war.progress >= 100) {
            const result = resolveSiegeVictory(village, exploration);
            onEvent('siege-victory', { villageName: village.name, ...result });
        }
    });
}

// Catechism Hall's passive effect: every discovered, unresolved village and
// city slowly gains Goodwill on its own, no Sermon required. Villages mid-
// siege are left alone (the two paths don't blend once war has started).
// Reaching 100% this way resolves the settlement outright, same as a Sermon
// would - a purely passive building shouldn't dead-end at "100%, unresolved"
// waiting for a manual click that defeats the point of it being passive.
export function processGoodwillTrickle(dtSeconds, onEvent) {
    const trickle = getGoodwillTricklePerSecond();
    if (trickle <= 0) return;

    const exploration = game.exploration;
    if (!exploration || !Array.isArray(exploration.villages)) return;

    exploration.villages.forEach((village) => {
        if (!village.discovered || village.resolutionType || village.war) return;
        const current = Number.isFinite(village.convertedPercent) ? village.convertedPercent : 0;
        village.convertedPercent = Math.min(100, current + trickle * dtSeconds);

        if (village.convertedPercent >= 100) {
            village.resolutionType = 'converted';
            game.alignment = Math.max(-100, Math.min(100, game.alignment + game.alignmentConvertGain));
            game.factionFavor.helios += game.heliosFavorConvertGain;
            if (!game.alignmentVisible) game.alignmentVisible = true;
            onEvent('goodwill-resolved', { villageName: village.name });
        }
    });
}

export function collectWildAreaResources(areaId) {
    const exploration = getExplorationState();
    const area = (exploration.discoveredAreas || []).find((candidate) => candidate.id === areaId && candidate.discovered);
    if (!area) return;

    const cache = area.resourceCache;
    if (!cache || cache.collected) return;

    const wood = Number.isFinite(cache.wood) ? Math.max(0, Math.floor(cache.wood)) : 0;
    const stone = Number.isFinite(cache.stone) ? Math.max(0, Math.floor(cache.stone)) : 0;

    const woodGained = wood > 0 ? gameState.resources.wood.add(wood) : 0;
    const stoneGained = stone > 0 ? gameState.resources.stone.add(stone) : 0;

    cache.collected = true;
    addLog(`Recovered supplies from ${area.name}: +${woodGained} wood, +${stoneGained} stone.`);
    updateUI();
    saveGame();
}

function getDistanceRewardScale(distanceFromCamp) {
    const distanceTier = Math.max(1, Math.floor((distanceFromCamp || 0) / 1000) + 1);
    return Math.pow(1.15, distanceTier - 1);
}

export function prayAtShrine(areaId) {
    const exploration = getExplorationState();
    const area = (exploration.discoveredAreas || []).find((candidate) => candidate.id === areaId && candidate.discovered);
    if (!area || area.landmark !== 'shrine' || area.landmarkResolved) return;

    area.landmarkResolved = true;
    const minFaith = Number.isFinite(exploration.shrineFaithMin) ? exploration.shrineFaithMin : 40;
    const maxFaith = Number.isFinite(exploration.shrineFaithMax) ? exploration.shrineFaithMax : 120;
    const faithGain = Math.floor(randomIntInRange(minFaith, maxFaith) * getDistanceRewardScale(area.distanceFromCamp));
    gameState.progression.faith += faithGain;

    game.alignment = Math.max(-100, Math.min(100, game.alignment + 1));
    if (!game.alignmentVisible) game.alignmentVisible = true;

    addLog(`You pray at the ${area.name}. +${faithGain} faith.`);
    updateUI();
    saveGame();
}

export function searchRuins(areaId) {
    const exploration = getExplorationState();
    const area = (exploration.discoveredAreas || []).find((candidate) => candidate.id === areaId && candidate.discovered);
    if (!area || area.landmark !== 'ruins' || area.landmarkResolved) return;

    area.landmarkResolved = true;
    const goodOutcomeChance = Number.isFinite(exploration.ruinsGoodOutcomeChance) ? exploration.ruinsGoodOutcomeChance : 0.65;
    const rewardScale = getDistanceRewardScale(area.distanceFromCamp);

    if (Math.random() < goodOutcomeChance) {
        const wood = Math.floor(randomIntInRange(50, 200) * rewardScale);
        const stone = Math.floor(randomIntInRange(50, 200) * rewardScale);
        const woodGained = gameState.resources.wood.add(wood);
        const stoneGained = gameState.resources.stone.add(stone);
        addLog(`The ${area.name} yield treasure: +${woodGained} wood, +${stoneGained} stone.`);
    } else {
        const losses = randomIntInRange(1, 3);
        const actualLosses = removeFollowersFromSettlement(losses, false);
        addLog(`The ${area.name} collapse beneath your followers! ${actualLosses} follower${actualLosses === 1 ? '' : 's'} lost.`);
    }

    updateUI();
    saveGame();
}

function chooseDoctrine(groupId, optionId) {
    if (!isDoctrineGroupUnlocked(groupId)) return;
    if (!game.doctrineChoices || typeof game.doctrineChoices !== 'object') return;
    if (game.doctrineChoices[groupId]) return;

    const group = DOCTRINE_GROUP_BY_ID[groupId];
    const option = group?.options.find((candidate) => candidate.id === optionId);
    if (!group || !option) return;

    game.doctrineChoices[groupId] = optionId;

    if (Number.isFinite(option.alignmentDelta) && option.alignmentDelta !== 0) {
        game.alignment = Math.max(-100, Math.min(100, game.alignment + option.alignmentDelta));
        if (!game.alignmentVisible) game.alignmentVisible = true;
    }
    if (option.favorFaction && Number.isFinite(option.favorAmount) && option.favorAmount !== 0) {
        game.factionFavor[option.favorFaction] += option.favorAmount;
        if (!game.alignmentVisible) game.alignmentVisible = true;
    }

    addLog(`Doctrine chosen: ${option.label} (${group.label}). This choice is permanent.`);
    updateUI();
    saveGame();
}

export function chooseShepherdsCreed() { chooseDoctrine('flock', 'shepherdsCreed'); }
export function chooseIronFist() { chooseDoctrine('flock', 'ironFist'); }
export function chooseHomestead() { chooseDoctrine('hearth', 'homestead'); }
export function chooseWanderlust() { chooseDoctrine('hearth', 'wanderlust'); }
export function chooseAbundantTable() { chooseDoctrine('sacrifice', 'abundantTable'); }
export function chooseLeanYears() { chooseDoctrine('sacrifice', 'leanYears'); }
export function chooseStonemasons() { chooseDoctrine('forge', 'stonemasons'); }
export function chooseQuarryRush() { chooseDoctrine('forge', 'quarryRush'); }
export function chooseZealousHands() { chooseDoctrine('pilgrimage', 'zealousHands'); }
export function chooseQuietFaith() { chooseDoctrine('pilgrimage', 'quietFaith'); }

function buildTemple(godId) {
    if (!game.doctrinesUnlocked) return;
    if (!game.temple || typeof game.temple !== 'object') return;
    if (game.temple.built) return;

    const option = TEMPLE_OPTION_BY_GOD[godId];
    if (!option) return;

    const followerReq = Number.isFinite(game.templeFollowerRequirement) ? game.templeFollowerRequirement : 100;
    if (gameState.progression.followers < followerReq) return;

    const favorReq = Number.isFinite(game.templeFavorRequirement) ? game.templeFavorRequirement : 200;
    const currentFavor = Number.isFinite(game.factionFavor?.[godId]) ? game.factionFavor[godId] : 0;
    if (currentFavor < favorReq) return;

    const faithCost = Number.isFinite(gameState.costs.templeFaithCost) ? gameState.costs.templeFaithCost : 2000;
    const woodCost = Number.isFinite(gameState.costs.templeWoodCost) ? gameState.costs.templeWoodCost : 800;
    const stoneCost = Number.isFinite(gameState.costs.templeStoneCost) ? gameState.costs.templeStoneCost : 800;
    const canAfford =
        gameState.progression.faith >= faithCost &&
        gameState.resources.wood.amount >= woodCost &&
        gameState.resources.stone.amount >= stoneCost;
    if (!canAfford) return;

    gameState.progression.faith -= faithCost;
    gameState.resources.wood.spend(woodCost);
    gameState.resources.stone.spend(stoneCost);

    game.temple.built = true;
    game.temple.godId = godId;

    const alignmentShift = Number.isFinite(game.templeAlignmentShift) ? game.templeAlignmentShift : 15;
    game.alignment = Math.max(-100, Math.min(100, game.alignment + (alignmentShift * option.alignmentDirection)));
    const favorGain = Number.isFinite(game.templeFavorGain) ? game.templeFavorGain : 50;
    game.factionFavor[godId] += favorGain;
    if (!game.alignmentVisible) game.alignmentVisible = true;

    addLog(`${option.label} rises over your settlement. Your covenant is sealed — this cannot be undone.`);
    updateUI();
    saveGame();
}

export function buildTempleHelios() { buildTemple('helios'); }
export function buildTempleSekhmet() { buildTemple('sekhmet'); }
export function buildTempleDanu() { buildTemple('danu'); }
export function buildTempleHel() { buildTemple('hel'); }
