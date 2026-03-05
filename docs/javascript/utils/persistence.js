import { gameState, game } from '../classes/GameState.js';
import { Resource } from '../classes/Resource.js';
import {
    ROLE_DEFINITIONS,
    createRoleCountMap,
    createRoleUnlockMap,
    createRoleAccumulatorMap
} from '../config/roles.js';

let resetInProgress = false;

function ensureResourceInstance(key, fallbackAmount, fallbackCost, fallbackGatherAmount) {
    const current = gameState.resources[key];
    if (current instanceof Resource && typeof current.gather === 'function') return current;
    const rebuilt = new Resource(key, fallbackAmount, fallbackCost, fallbackGatherAmount);
    gameState.resources[key] = rebuilt;
    return rebuilt;
}

export function saveGame() {
    if (resetInProgress) return;

    const saveData = {
        gameState,
        game
    };
    localStorage.setItem('fogGameSave', JSON.stringify(saveData));
    // console.log('Game saved to localStorage');
}

export function loadGame() {
    const saved = localStorage.getItem('fogGameSave');
    if (saved) {
        try {
            const data = JSON.parse(saved);

            const savedState = data?.gameState || {};
            const savedProg = savedState.progression || {};
            const savedCosts = savedState.costs || {};
            const savedGathering = savedState.gathering || {};
            const savedRates = savedState.rates || {};
            const savedResources = savedState.resources || {};
            const savedGame = data?.game || {};

            if (!Number.isFinite(savedProg.gatherers) && Number.isFinite(savedProg.builders)) {
                savedProg.gatherers = savedProg.builders;
            }
            if (savedGame.roleUnlocks && typeof savedGame.roleUnlocks === 'object') {
                if (savedGame.roleUnlocks.gatherers == null && savedGame.roleUnlocks.builders != null) {
                    savedGame.roleUnlocks.gatherers = savedGame.roleUnlocks.builders;
                }
            }

            // restore progression/costs/rates/gathering (keep shape from current runtime)
            Object.assign(gameState.progression, savedProg);
            Object.assign(gameState.costs, savedCosts);
            Object.assign(gameState.gathering, savedGathering);
            Object.assign(gameState.rates, savedRates);

            const savedRoleMap = savedProg.roles && typeof savedProg.roles === 'object'
                ? savedProg.roles
                : {};
            const mergedRoleMap = createRoleCountMap(0);

            ROLE_DEFINITIONS.forEach((roleDefinition) => {
                const roleId = roleDefinition.id;
                const mapValue = savedRoleMap[roleId];
                const legacyValue = savedProg[roleId];
                const resolvedValue = Number.isFinite(mapValue)
                    ? mapValue
                    : (Number.isFinite(legacyValue) ? legacyValue : 0);
                const normalized = Math.max(0, Math.floor(resolvedValue));

                mergedRoleMap[roleId] = normalized;
                gameState.progression[roleId] = normalized;
            });

            gameState.progression.roles = mergedRoleMap;

            // enforce intended food gather range (legacy saves may carry older higher values)
            gameState.gathering.gatherFoodMinMultiplier = 1;
            gameState.gathering.gatherFoodMaxMultiplier = 10;

            // Ensure resource instances are valid (guards against old/corrupt saves)
            ensureResourceInstance('wood', 0, 8, () => {
                return gameState.gathering.manualGatherBaseAmount + (game.shelter * gameState.gathering.manualGatherShelterBonus);
            });
            ensureResourceInstance('stone', 0, 8, () => {
                return gameState.gathering.manualGatherBaseAmount + (game.shelter * gameState.gathering.manualGatherShelterBonus);
            });
            ensureResourceInstance('food', 0, 5, () => {
                const min = gameState.gathering.gatherFoodMinMultiplier;
                const max = gameState.gathering.gatherFoodMaxMultiplier;
                return Math.max(1, Math.floor(Math.random() * (max - min) + min));
            });

            // restore resource values WITHOUT replacing Resource class instances
            ['wood', 'stone', 'food'].forEach((key) => {
                const current = gameState.resources[key];
                const savedRes = savedResources[key];
                if (!current || savedRes == null) return;

                if (typeof savedRes === 'number') {
                    current.amount = savedRes;
                } else if (typeof savedRes === 'object') {
                    if (typeof savedRes.amount === 'number') current.amount = savedRes.amount;
                    if (typeof savedRes.gatherCost === 'number') current.gatherCost = savedRes.gatherCost;
                }
            });

            // restore top-level game flags
            Object.assign(game, savedGame);

            if (!gameState.runtime || typeof gameState.runtime !== 'object') {
                gameState.runtime = {};
            }

            const mergedAccumulators = createRoleAccumulatorMap(0);
            const savedAccumulators = savedState.runtime?.roleAccumulators;
            ROLE_DEFINITIONS.forEach((roleDefinition) => {
                const roleId = roleDefinition.id;
                const savedAccumulator = savedAccumulators?.[roleId];
                mergedAccumulators[roleId] = Number.isFinite(savedAccumulator) && savedAccumulator >= 0
                    ? savedAccumulator
                    : 0;
            });

            gameState.runtime.roleAccumulators = mergedAccumulators;
            gameState.runtime.autoSaveAccumulator = Number.isFinite(savedState.runtime?.autoSaveAccumulator)
                ? Math.max(0, savedState.runtime.autoSaveAccumulator)
                : 0;

            if (!game.seenItems || typeof game.seenItems !== 'object') {
                game.seenItems = {};
            }

            // migration/sanity guards
            if (!Number.isFinite(gameState.progression.followers) || gameState.progression.followers < 0) {
                gameState.progression.followers = 0;
            }
            ROLE_DEFINITIONS.forEach((roleDefinition) => {
                const roleId = roleDefinition.id;
                const count = gameState.progression.roles[roleId];
                const normalized = Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
                gameState.progression.roles[roleId] = normalized;
                gameState.progression[roleId] = normalized;
            });

            const assignedTotal = ROLE_DEFINITIONS.reduce((total, roleDefinition) => {
                return total + gameState.progression.roles[roleDefinition.id];
            }, 0);

            if (assignedTotal > gameState.progression.followers) {
                let overflow = assignedTotal - gameState.progression.followers;
                ROLE_DEFINITIONS.slice().reverse().forEach((roleDefinition) => {
                    if (overflow <= 0) return;
                    const roleId = roleDefinition.id;
                    const current = gameState.progression.roles[roleId] || 0;
                    const reduction = Math.min(current, overflow);
                    gameState.progression.roles[roleId] = current - reduction;
                    gameState.progression[roleId] = gameState.progression.roles[roleId];
                    overflow -= reduction;
                });
            }
            if (!Number.isFinite(gameState.progression.faith) || gameState.progression.faith < 0) {
                gameState.progression.faith = 0;
            }
            if (!Number.isFinite(game.hungerPercent)) {
                game.hungerPercent = 100;
            }
            game.hungerPercent = Math.max(0, Math.min(100, game.hungerPercent));

            // Guard against legacy/corrupted saves that can make hunger impossible to manage.
            if (!Number.isFinite(game.followerHungerDrain) || game.followerHungerDrain <= 0 || game.followerHungerDrain > 1) {
                game.followerHungerDrain = 0.25;
            }
            if (!Number.isFinite(game.autoFeedFoodPerSecond) || game.autoFeedFoodPerSecond <= 0 || game.autoFeedFoodPerSecond > 2) {
                game.autoFeedFoodPerSecond = 0.15;
            }
            if (!Number.isFinite(game.foodHungerGain) || game.foodHungerGain <= 0 || game.foodHungerGain > 2) {
                game.foodHungerGain = 0.15;
            }

            if (!Number.isFinite(game.shelterCapacityPerShelter) || game.shelterCapacityPerShelter < 1) {
                game.shelterCapacityPerShelter = 3;
            }
            if (!Number.isFinite(game.shelterCapacityMultiplier) || game.shelterCapacityMultiplier < 1) {
                game.shelterCapacityMultiplier = 1;
            }
            if (!Number.isFinite(game.shelterCostScalePerBuilt) || game.shelterCostScalePerBuilt < 0) {
                game.shelterCostScalePerBuilt = 0.1;
            }

            if (!Number.isFinite(gameState.costs.unlockAltarFaithCost) || gameState.costs.unlockAltarFaithCost < 0) {
                gameState.costs.unlockAltarFaithCost = 0;
            }
            if (!Number.isFinite(gameState.costs.unlockProphetFaithCost) || gameState.costs.unlockProphetFaithCost < 1) {
                gameState.costs.unlockProphetFaithCost = 500;
            }
            if (!Number.isFinite(gameState.costs.unlockExplorationFaithCost) || gameState.costs.unlockExplorationFaithCost < 0) {
                gameState.costs.unlockExplorationFaithCost = 650;
            }
            if (!Number.isFinite(gameState.costs.expeditionRollFaithCost) || gameState.costs.expeditionRollFaithCost < 1) {
                gameState.costs.expeditionRollFaithCost = 50;
            }
            if (!Number.isFinite(gameState.costs.altarBuildWoodCost) || gameState.costs.altarBuildWoodCost < 1) {
                gameState.costs.altarBuildWoodCost = 150;
            }
            if (!Number.isFinite(gameState.costs.altarBuildStoneCost) || gameState.costs.altarBuildStoneCost < 1) {
                gameState.costs.altarBuildStoneCost = 150;
            }
            if (!Number.isFinite(gameState.costs.altarBuildFaithCost) || gameState.costs.altarBuildFaithCost < 1) {
                gameState.costs.altarBuildFaithCost = 200;
            }

            if (typeof game.shelterUpgradeUnlocked !== 'boolean') {
                game.shelterUpgradeUnlocked = false;
            }
            if (typeof game.altarUnlocked !== 'boolean') {
                game.altarUnlocked = false;
            }
            if (typeof game.altarBuilt !== 'boolean') {
                game.altarBuilt = false;
            }
            if (typeof game.prophetUnlocked !== 'boolean') {
                game.prophetUnlocked = Boolean(game.roleUnlocks?.prophet);
            }
            if (typeof game.explorationUnlocked !== 'boolean') {
                game.explorationUnlocked = false;
            }
            if (!Number.isFinite(game.prophetUnlockCapacityRequirement) || game.prophetUnlockCapacityRequirement < 1) {
                game.prophetUnlockCapacityRequirement = 150;
            }
            if (!Number.isFinite(game.shelterUpgradeFollowerRequirement) || game.shelterUpgradeFollowerRequirement < 1) {
                game.shelterUpgradeFollowerRequirement = 30;
            }

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
            if (!Array.isArray(game.exploration.villages) || game.exploration.villages.length === 0) {
                game.exploration.villages = [{
                    id: 'village-1',
                    name: 'First Village',
                    distanceFromCamp: 500,
                    population: 1500,
                    resistance: 42,
                    convertedPercent: 0,
                    discovered: false,
                    sermonsHeld: 0,
                    prophetPresent: false
                }];
            }
            game.exploration.villages = game.exploration.villages.map((village, index) => ({
                id: village?.id || `village-${index + 1}`,
                name: village?.name || `Village ${index + 1}`,
                distanceFromCamp: Number.isFinite(village?.distanceFromCamp) ? Math.floor(village.distanceFromCamp) : 500,
                population: Number.isFinite(village?.population) ? Math.floor(village.population) : 1500,
                resistance: Number.isFinite(village?.resistance) ? Math.floor(village.resistance) : 45,
                convertedPercent: Number.isFinite(village?.convertedPercent) ? Math.max(0, Math.min(100, Math.floor(village.convertedPercent))) : 0,
                discovered: Boolean(village?.discovered),
                sermonsHeld: Number.isFinite(village?.sermonsHeld) ? Math.max(0, Math.floor(village.sermonsHeld)) : 0,
                prophetPresent: Boolean(village?.prophetPresent)
            }));
            if (!Number.isFinite(game.exploration.nextVillageIndex) || game.exploration.nextVillageIndex < 2) {
                game.exploration.nextVillageIndex = game.exploration.villages.length + 1;
            }
            if (!Number.isFinite(game.exploration.nextAreaIndex) || game.exploration.nextAreaIndex < 1) {
                game.exploration.nextAreaIndex = 1;
            }
            if (!game.exploration.villageDistanceRange || typeof game.exploration.villageDistanceRange !== 'object') {
                game.exploration.villageDistanceRange = {};
            }
            if (!Number.isFinite(game.exploration.villageDistanceRange.min) || game.exploration.villageDistanceRange.min < 200) {
                game.exploration.villageDistanceRange.min = Math.floor(Math.random() * 201) + 350;
            }
            if (!Number.isFinite(game.exploration.villageDistanceRange.max) || game.exploration.villageDistanceRange.max <= game.exploration.villageDistanceRange.min) {
                game.exploration.villageDistanceRange.max = game.exploration.villageDistanceRange.min + (Math.floor(Math.random() * 251) + 300);
            }
            if (!game.exploration.activeExpedition || typeof game.exploration.activeExpedition !== 'object') {
                game.exploration.activeExpedition = null;
            }

            // food tab should stay unlocked after first successful gather
            if (gameState.resources.food.amount > 0) {
                game.hasGatheredFood = true;
            }

            if (!game.roleUnlocks || typeof game.roleUnlocks !== 'object') {
                game.roleUnlocks = createRoleUnlockMap(false);
            }

            const normalizedUnlocks = createRoleUnlockMap(false);
            ROLE_DEFINITIONS.forEach((roleDefinition) => {
                const roleId = roleDefinition.id;
                normalizedUnlocks[roleId] = Boolean(game.roleUnlocks[roleId]);
            });
            normalizedUnlocks.prophet = Boolean(normalizedUnlocks.prophet || game.prophetUnlocked);
            game.roleUnlocks = normalizedUnlocks;

            if (!game.trainingUnlocked && Object.values(game.roleUnlocks).some(Boolean)) {
                game.trainingUnlocked = true;
            }

            if (!Number.isFinite(game.roleBulkAssignAmount) || game.roleBulkAssignAmount < 1) {
                game.roleBulkAssignAmount = 1;
            }
            game.roleBulkAssignAmount = Math.floor(game.roleBulkAssignAmount);

            if (!Array.isArray(game.preachOutcomeWeights) || game.preachOutcomeWeights.length !== 4) {
                game.preachOutcomeWeights = [45, 30, 18, 7];
            }

            if (!Number.isFinite(gameState.progression.prophetSway) || gameState.progression.prophetSway < 1) {
                gameState.progression.prophetSway = 12;
            }

            if (!game.diceBonuses || typeof game.diceBonuses !== 'object') {
                game.diceBonuses = {};
            }
            const savedPreachBonus = Number.isFinite(game.diceBonuses.preach)
                ? Math.trunc(game.diceBonuses.preach)
                : 0;
            game.diceBonuses.preach = game.altarBuilt ? Math.max(1, savedPreachBonus) : 0;

            console.log('Game loaded from localStorage');
            return true;
        } catch (e) {
            console.error('Failed to load save:', e);
            return false;
        }
    }
    return false;
}

export function clearSave() {
    resetInProgress = true;

    localStorage.removeItem('fogGameSave');
    // legacy/fallback keys from previous structures
    localStorage.removeItem('fogSave');
    localStorage.removeItem('fog-save');
    localStorage.removeItem('FOG_SAVE');

    // A second pass catches any write attempts that may race this call.
    setTimeout(() => {
        localStorage.removeItem('fogGameSave');
        localStorage.removeItem('fogSave');
        localStorage.removeItem('fog-save');
        localStorage.removeItem('FOG_SAVE');
        console.log('Save cleared. Reloading...');
        location.reload();
    }, 0);

    console.log('Save cleared. Reloading...');
}