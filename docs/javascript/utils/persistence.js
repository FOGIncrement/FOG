import { gameState, game } from '../classes/GameState.js';
import { Resource } from '../classes/Resource.js';
import {
    ROLE_DEFINITIONS,
    createRoleCountMap,
    createRoleUnlockMap,
    createRoleAccumulatorMap
} from '../config/roles.js';

const SAVE_KEYS = ['fogGameSave', 'fogSave', 'fog-save', 'FOG_SAVE'];
const RESET_GUARD_KEY = 'fogResetInProgress';
const SAVE_EPOCH_KEY = 'fogSaveEpoch';
const DEFAULT_MANUAL_FEED_FOOD_COST = Number.isFinite(gameState.costs?.manualFeedFoodCost)
    ? Math.max(1, Math.floor(gameState.costs.manualFeedFoodCost))
    : 1;

let sessionSaveEpoch = null;

function normalizeEpoch(value) {
    const parsed = Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getCurrentSaveEpoch() {
    const existing = normalizeEpoch(localStorage.getItem(SAVE_EPOCH_KEY));
    if (existing != null) return existing;

    const initialEpoch = 1;
    localStorage.setItem(SAVE_EPOCH_KEY, String(initialEpoch));
    return initialEpoch;
}

function setCurrentSaveEpoch(epoch) {
    const normalized = normalizeEpoch(epoch) || 1;
    localStorage.setItem(SAVE_EPOCH_KEY, String(normalized));
    return normalized;
}

function ensureSessionEpoch() {
    if (sessionSaveEpoch != null) return sessionSaveEpoch;
    sessionSaveEpoch = getCurrentSaveEpoch();
    return sessionSaveEpoch;
}

function clearFogStorageKeys(storage) {
    if (!storage) return;

    const keysToDelete = [];
    for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (!key) continue;
        if (/fog/i.test(key)) {
            keysToDelete.push(key);
        }
    }

    keysToDelete.forEach((key) => storage.removeItem(key));
}

function ensureResourceInstance(key, fallbackAmount, fallbackCost, fallbackGatherAmount) {
    const current = gameState.resources[key];
    if (current instanceof Resource && typeof current.gather === 'function') return current;
    const rebuilt = new Resource(key, fallbackAmount, fallbackCost, fallbackGatherAmount);
    gameState.resources[key] = rebuilt;
    return rebuilt;
}

export function saveGame() {
    if (sessionStorage.getItem(RESET_GUARD_KEY) === '1') {
        return;
    }

    const activeEpoch = getCurrentSaveEpoch();
    const ownedEpoch = ensureSessionEpoch();
    if (ownedEpoch !== activeEpoch) {
        return;
    }

    const saveData = {
        saveEpoch: ownedEpoch,
        gameState,
        game
    };
    localStorage.setItem('fogGameSave', JSON.stringify(saveData));
    // console.log('Game saved to localStorage');
}

export function loadGame() {
    if (sessionStorage.getItem(RESET_GUARD_KEY) === '1') {
        sessionStorage.removeItem(RESET_GUARD_KEY);
        return false;
    }

    const activeEpoch = getCurrentSaveEpoch();
    sessionSaveEpoch = activeEpoch;

    const saved = localStorage.getItem('fogGameSave');
    if (saved) {
        try {
            const data = JSON.parse(saved);

            const savedEpoch = normalizeEpoch(data?.saveEpoch);
            if (savedEpoch != null && savedEpoch !== activeEpoch) {
                return false;
            }

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

            if (!Number.isFinite(game.followerFoodPerSecond) || game.followerFoodPerSecond < 0) {
                game.followerFoodPerSecond = 0.12;
            }
            if (!Number.isFinite(game.hungerDrainPerFoodDeficit) || game.hungerDrainPerFoodDeficit < 0) {
                game.hungerDrainPerFoodDeficit = 4;
            }
            if (!Number.isFinite(game.stability)) {
                game.stability = 100;
            }
            game.stability = Math.max(0, Math.min(100, game.stability));
            if (!Number.isFinite(game.stabilityGainPerSecondWhenFed) || game.stabilityGainPerSecondWhenFed < 0) {
                game.stabilityGainPerSecondWhenFed = 0.04;
            }
            if (!Number.isFinite(game.stabilityDrainPerFoodDeficit) || game.stabilityDrainPerFoodDeficit < 0) {
                game.stabilityDrainPerFoodDeficit = 2;
            }
            if (!Number.isFinite(game.stabilityWeakHungerThreshold) || game.stabilityWeakHungerThreshold < 0) {
                game.stabilityWeakHungerThreshold = 20;
            }
            if (!Number.isFinite(game.stabilityCriticalHungerThreshold) || game.stabilityCriticalHungerThreshold < 0) {
                game.stabilityCriticalHungerThreshold = 5;
            }
            if (!Number.isFinite(game.stabilityWeakDrainPerSecond) || game.stabilityWeakDrainPerSecond < 0) {
                game.stabilityWeakDrainPerSecond = 0.03;
            }
            if (!Number.isFinite(game.stabilityCriticalDrainPerSecond) || game.stabilityCriticalDrainPerSecond < 0) {
                game.stabilityCriticalDrainPerSecond = 0.08;
            }

            if (!Number.isFinite(game.shelterCapacityPerShelter) || game.shelterCapacityPerShelter < 1) {
                game.shelterCapacityPerShelter = 3;
            }
            if (!Number.isFinite(game.shelterCapacityMultiplier) || game.shelterCapacityMultiplier < 1) {
                game.shelterCapacityMultiplier = 1;
            }

            if (!Number.isFinite(gameState.costs.unlockAltarFaithCost) || gameState.costs.unlockAltarFaithCost < 0) {
                gameState.costs.unlockAltarFaithCost = 0;
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
            if (!Number.isFinite(gameState.costs.manualFeedFoodCost) || gameState.costs.manualFeedFoodCost < 1) {
                gameState.costs.manualFeedFoodCost = DEFAULT_MANUAL_FEED_FOOD_COST;
            }
            gameState.costs.manualFeedFoodCost = Math.max(1, Math.floor(gameState.costs.manualFeedFoodCost));

            if (typeof game.shelterUpgradeUnlocked !== 'boolean') {
                game.shelterUpgradeUnlocked = false;
            }
            if (typeof game.altarUnlocked !== 'boolean') {
                game.altarUnlocked = false;
            }
            if (typeof game.altarBuilt !== 'boolean') {
                game.altarBuilt = false;
            }
            if (!Number.isFinite(game.shelterUpgradeFollowerRequirement) || game.shelterUpgradeFollowerRequirement < 1) {
                game.shelterUpgradeFollowerRequirement = 30;
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
    const nextEpoch = getCurrentSaveEpoch() + 1;

    sessionStorage.setItem(RESET_GUARD_KEY, '1');
    SAVE_KEYS.forEach((key) => localStorage.removeItem(key));
    clearFogStorageKeys(localStorage);
    clearFogStorageKeys(sessionStorage);
    setCurrentSaveEpoch(nextEpoch);
    sessionSaveEpoch = nextEpoch;
    sessionStorage.setItem(RESET_GUARD_KEY, '1');
    console.log('Save cleared. Reloading...');
    location.reload();
}