import { gameState, game } from '../classes/GameState.js';
import { Resource } from '../classes/Resource.js';

function ensureResourceInstance(key, fallbackAmount, fallbackCost, fallbackGatherAmount) {
    const current = gameState.resources[key];
    if (current instanceof Resource && typeof current.gather === 'function') return current;
    const rebuilt = new Resource(key, fallbackAmount, fallbackCost, fallbackGatherAmount);
    gameState.resources[key] = rebuilt;
    return rebuilt;
}

export function saveGame() {
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

            // restore progression/costs/rates/gathering (keep shape from current runtime)
            Object.assign(gameState.progression, savedProg);
            Object.assign(gameState.costs, savedCosts);
            Object.assign(gameState.gathering, savedGathering);
            Object.assign(gameState.rates, savedRates);

            // enforce intended food gather range (legacy saves may carry older higher values)
            gameState.gathering.gatherFoodMinMultiplier = 1;
            gameState.gathering.gatherFoodMaxMultiplier = 10;

            // Ensure resource instances are valid (guards against old/corrupt saves)
            ensureResourceInstance('wood', 0, 8, 5);
            ensureResourceInstance('stone', 0, 8, 5);
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

            if (!game.seenItems || typeof game.seenItems !== 'object') {
                game.seenItems = {};
            }

            // migration/sanity guards
            if (!Number.isFinite(gameState.progression.followers) || gameState.progression.followers < 1) {
                gameState.progression.followers = 1;
            }
            if (!Number.isFinite(gameState.progression.hunters) || gameState.progression.hunters < 0) {
                gameState.progression.hunters = 0;
            }
            if (!Number.isFinite(gameState.progression.ritualists) || gameState.progression.ritualists < 0) {
                gameState.progression.ritualists = 0;
            }
            if (!Number.isFinite(gameState.progression.builders) || gameState.progression.builders < 0) {
                gameState.progression.builders = 0;
            }
            if (!Number.isFinite(gameState.progression.cooks) || gameState.progression.cooks < 0) {
                gameState.progression.cooks = 0;
            }
            if (gameState.progression.hunters > gameState.progression.followers) {
                gameState.progression.hunters = gameState.progression.followers;
            }
            const assignedTotal =
                gameState.progression.hunters +
                gameState.progression.ritualists +
                gameState.progression.builders +
                gameState.progression.cooks;
            if (assignedTotal > gameState.progression.followers) {
                let overflow = assignedTotal - gameState.progression.followers;
                ['cooks', 'builders', 'ritualists', 'hunters'].forEach((role) => {
                    if (overflow <= 0) return;
                    const current = gameState.progression[role] || 0;
                    const reduction = Math.min(current, overflow);
                    gameState.progression[role] = current - reduction;
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

            // food tab should stay unlocked after first successful gather
            if (gameState.resources.food.amount > 0) {
                game.hasGatheredFood = true;
            }

            if (!game.roleUnlocks || typeof game.roleUnlocks !== 'object') {
                game.roleUnlocks = { hunters: false, ritualists: false, builders: false, cooks: false };
            }
            ['hunters', 'ritualists', 'builders', 'cooks'].forEach((role) => {
                game.roleUnlocks[role] = Boolean(game.roleUnlocks[role]);
            });

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
    localStorage.removeItem('fogGameSave');
    // legacy/fallback keys from previous structures
    localStorage.removeItem('fogSave');
    localStorage.removeItem('fog-save');
    localStorage.removeItem('FOG_SAVE');
    console.log('Save cleared. Reloading...');
    location.reload();
}