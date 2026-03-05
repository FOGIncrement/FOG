import { gameState, game } from './classes/GameState.js';
import { addLog } from './utils/logging.js';
import { saveGame } from './utils/persistence.js';
import { updateUI } from './ui.js';
import { getExpeditionFollowerLimit, getMaxFollowers, getNextVillageDistance, getRoleCount, getShelterBuildCosts, getUnassignedFollowers, hasProphetAssigned, setRoleCount } from './utils/helpers.js';
import { rollDice } from './utils/dice.js';
import { buildingRegistry } from './registries/index.js';

let preachRollReady = false;
let preachRollInProgress = false;
let expeditionRollReady = false;
let expeditionRollInProgress = false;

function canPreachNow() {
    const max = getMaxFollowers();
    const hasCost = gameState.progression.faith >= gameState.costs.preachFaithCost &&
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

    ensureWildAreaSeeds(game.exploration);
    syncDiscoveredAreasByDistance(game.exploration, { logDiscoveries: false });

    return game.exploration;
}

function getExpeditionConfig() {
    const exploration = getExplorationState();
    const limit = getExpeditionFollowerLimit();
    const rollFaithCost = Number.isFinite(gameState.costs.expeditionRollFaithCost)
        ? Math.max(1, Math.floor(gameState.costs.expeditionRollFaithCost))
        : 50;
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
    exploration.prophetHeavyLossDeathChance = clampProbability(exploration.prophetHeavyLossDeathChance, 0.5);

    exploration.wildAreaDiscoveryChance = clampProbability(exploration.wildAreaDiscoveryChance, 0.12);
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
        passiveEffect: null
    };

    if (Math.random() < exploration.wildAreaResourceCacheChance) {
        area.resourceCache = {
            wood: randomIntInRange(exploration.wildAreaResourceCacheWoodMin, exploration.wildAreaResourceCacheWoodMax),
            stone: randomIntInRange(exploration.wildAreaResourceCacheStoneMin, exploration.wildAreaResourceCacheStoneMax),
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
        return;
    }

    migrateLegacyWildAreaDistances(exploration);
}

function migrateLegacyWildAreaDistances(exploration) {
    if (!Array.isArray(exploration?.discoveredAreas) || exploration.discoveredAreas.length === 0) return;

    const hasAnyDiscovered = exploration.discoveredAreas.some((area) => area?.discovered);
    if (hasAnyDiscovered) return;

    const distances = exploration.discoveredAreas
        .map((area) => Number.isFinite(area?.distanceFromCamp) ? Math.floor(area.distanceFromCamp) : 0)
        .filter((distance) => distance > 0)
        .sort((left, right) => left - right);

    if (distances.length === 0) return;
    const nearestDistance = distances[0];
    if (nearestDistance <= 10) return;

    const offset = nearestDistance - 10;
    exploration.discoveredAreas.forEach((area) => {
        if (!Number.isFinite(area.distanceFromCamp)) return;
        area.distanceFromCamp = Math.max(1, Math.floor(area.distanceFromCamp) - offset);
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
        game.followerHungerDrain += effect.amount;
        effect.applied = true;
        addLog(`${area.name} is harsh terrain: +${effect.amount.toFixed(4)} hunger drain per follower/s.`);
    }
}

function removeFollowersFromSettlement(losses, includeProphetLoss = false) {
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

function maybeCreateNewVillage(exploration) {
    const discoveredVillages = exploration.villages.filter((village) => village.discovered).length;
    if (discoveredVillages < 1) return;

    const shouldSpawn = Math.random() < exploration.villageSpawnChance;
    if (!shouldSpawn) return;

    const villageId = `village-${exploration.nextVillageIndex}`;
    const distanceFromCamp = getNextVillageDistance();
    const population = Math.floor(Math.random() * 1001) + 800;
    const resistance = Math.floor(Math.random() * 41) + 35;

    exploration.villages.push({
        id: villageId,
        name: `Village ${exploration.nextVillageIndex}`,
        distanceFromCamp,
        population,
        resistance,
        convertedPercent: 0,
        discovered: false,
        sermonsHeld: 0,
        prophetPresent: false
    });

    exploration.nextVillageIndex += 1;
    addLog(`Scouts charted rumors of another settlement around ${distanceFromCamp}m from camp.`);
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
    const hazardRoll = Math.random();
    const alive = Math.max(0, Math.floor(expedition.followersAlive));
    if (alive <= 0) return { casualties: 0, ended: true, prophetDied: false };

    const exploration = getExplorationState();
    const wipeoutThreshold = exploration.hazardWipeoutChance;
    const heavyLossThreshold = wipeoutThreshold + exploration.hazardHeavyLossChance;
    const ambushThreshold = heavyLossThreshold + exploration.hazardAmbushChance;

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
        const prophetDied = Boolean(expedition.includesProphet && Math.random() < exploration.prophetHeavyLossDeathChance);
        addLog(`Followers encountered a bear and half were slaughtered (-${casualties}).`);
        return { casualties, ended: expedition.followersAlive <= 0, prophetDied };
    }

    if (hazardRoll < ambushThreshold) {
        const lossPercent = randomIntInRange(exploration.hazardAmbushMinLossPercent, exploration.hazardAmbushMaxLossPercent);
        const casualties = Math.max(1, Math.floor(alive * (lossPercent / 100)));
        expedition.followersAlive = Math.max(0, alive - casualties);
        const prophetDied = Boolean(expedition.includesProphet && Math.random() < (lossPercent / 100));
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
    const totalRoll = Math.max(1, Math.floor(baseRoll) + bonusFollowers);
    const moved = totalRoll;
    expedition.distanceCovered += moved;
    exploration.totalMetersExplored = Math.max(
        0,
        Math.floor((Number.isFinite(exploration.totalMetersExplored) ? exploration.totalMetersExplored : 0) + moved)
    );
    syncDiscoveredAreasByDistance(exploration, { logDiscoveries: true });

    addLog(`Expedition roll 1d6 + followers: ${baseRoll} + ${bonusFollowers} = ${totalRoll}. Progress: +${moved}m.`);

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
    if (gameState.resources.wood.gather()) {
        updateUI();
        saveGame();
    }
}

export function gatherStone() {
    if (gameState.resources.stone.gather()) {
        updateUI();
        saveGame();
    }
}

export function gatherFood() {
    const gained = gameState.resources.food.gather();
    if (gained !== false) {
        addLog(`A hunt yielded ${gained} food.`);
        if (!game.hasGatheredFood && gameState.resources.food.amount > 0) {
            game.hasGatheredFood = true;
        }
        updateUI();
        saveGame();
    }
}

export function pray() {
    gameState.progression.faith += game.prayAmt;
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

    applyGlobalCostReduction(0.5);
    addLog('Shelter upgraded to Shack. Capacity doubled and costs reduced by 50%.');

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

export function convertFollower() {
    if (gameState.progression.faith >= game.convertCost) {
        gameState.progression.faith -= game.convertCost;
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
            gameState.progression.faith -= gameState.costs.preachFaithCost;
            game.hungerPercent = Math.max(0, game.hungerPercent - 10);
            gameState.resources.food.spend(10);

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
            }, 500);

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

export function unlockAltar() {
    if (game.altarUnlocked) return;
    if (gameState.progression.followers < game.shelterUpgradeFollowerRequirement) return;

    game.altarUnlocked = true;
    addLog('Altar unlocked. Build it in the Build tab to activate its effects.');

    updateUI();
    saveGame();
}

export function startExpedition() {
    const { exploration, limit } = getExpeditionConfig();
    if (exploration.activeExpedition) return;

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
    if (text) {
        text.innerText = `Roll 1d6 + ${bonusFollowers} to explore (${rollFaithCost} faith):`;
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
            const totalRoll = baseRoll + bonusFollowers;

            if (die) die.innerText = `${totalRoll}`;
            if (text) text.innerText = `Rolled ${baseRoll} + ${bonusFollowers} = ${totalRoll}.`;

            resolveExpeditionRoll(baseRoll);

            expeditionRollInProgress = false;
            expeditionRollReady = false;
            if (rollBtn) rollBtn.disabled = false;

            setTimeout(() => {
                if (!expeditionRollInProgress) setExpeditionDiceVisible(false);
            }, 500);
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

    if (!village.prophetPresent) {
        addLog('A Prophet must arrive with the expedition before sermons can be held in this village.');
        return;
    }

    if (village.convertedPercent >= 100) {
        addLog(`${village.name} is already fully converted.`);
        return;
    }

    const prophetSway = Number.isFinite(gameState.progression.prophetSway)
        ? gameState.progression.prophetSway
        : 12;
    const resistance = Number.isFinite(village.resistance) ? village.resistance : 50;
    const swayBonus = Math.max(0, Math.floor((prophetSway - resistance) / 8));
    const roll = rollDice('1d20', { bonus: swayBonus });
    const conversionPercent = Math.max(0, Math.min(100, Math.floor((roll.total / 20) * 100)));

    const totalRemaining = 100 - village.convertedPercent;
    const gainPercent = Math.min(totalRemaining, Math.max(1, Math.floor(conversionPercent * 0.35)));
    village.convertedPercent = Math.min(100, village.convertedPercent + gainPercent);
    village.sermonsHeld = (village.sermonsHeld || 0) + 1;

    const convertedPeople = Math.floor(village.population * (gainPercent / 100));
    addLog(
        `Sermon at ${village.name}: roll ${roll.baseTotal}${roll.bonus > 0 ? ` + ${roll.bonus}` : ''} = ${roll.total}. Converted ${gainPercent}% (${convertedPeople} followers).`
    );

    updateUI();
    saveGame();
}

export function collectWildAreaResources(areaId) {
    const exploration = getExplorationState();
    const area = (exploration.discoveredAreas || []).find((candidate) => candidate.id === areaId && candidate.discovered);
    if (!area) return;

    const cache = area.resourceCache;
    if (!cache || cache.collected) return;

    const wood = Number.isFinite(cache.wood) ? Math.max(0, Math.floor(cache.wood)) : 0;
    const stone = Number.isFinite(cache.stone) ? Math.max(0, Math.floor(cache.stone)) : 0;

    if (wood > 0) gameState.resources.wood.amount += wood;
    if (stone > 0) gameState.resources.stone.amount += stone;

    cache.collected = true;
    addLog(`Recovered supplies from ${area.name}: +${wood} wood, +${stone} stone.`);
    updateUI();
    saveGame();
}
