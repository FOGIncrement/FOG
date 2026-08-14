import { gameState, game } from '../classes/GameState.js';
import { Resource } from '../classes/Resource.js';
import {
    ROLE_DEFINITIONS,
    createRoleCountMap,
    createRoleUnlockMap,
    createRoleAccumulatorMap
} from '../config/roles.js';
import { FACTION_DEFINITIONS, createFactionFavorMap } from '../config/factions.js';
import { DOCTRINE_GROUPS, createDoctrineChoiceMap } from '../config/doctrines.js';
import { ASCENSION_UPGRADES, createAscensionUpgradeRankMap } from '../config/ascension.js';

let resetInProgress = false;

function syncDiscoveredAreasByDistance(exploration) {
    if (!exploration || !Array.isArray(exploration.discoveredAreas)) return;

    const meters = Number.isFinite(exploration.totalMetersExplored)
        ? Math.floor(exploration.totalMetersExplored)
        : 0;

    exploration.discoveredAreas.forEach((area) => {
        if (area.discovered) return;
        if (!Number.isFinite(area.distanceFromCamp) || area.distanceFromCamp <= 0) return;
        if (area.distanceFromCamp > meters) return;

        area.discovered = true;
        area.discoveredAtMeters = Math.floor(area.distanceFromCamp);
    });
}

function applyDiscoveredAreaPassiveEffects(exploration) {
    if (!exploration || !Array.isArray(exploration.discoveredAreas)) return;

    exploration.discoveredAreas.forEach((area) => {
        if (!area?.discovered) return;

        const effect = area?.passiveEffect;
        if (!effect || effect.applied) return;

        if (effect.type === 'faithPerFollowerBonus' && Number.isFinite(effect.amount) && effect.amount > 0) {
            gameState.progression.faithPerFollower += effect.amount;
            effect.applied = true;
            return;
        }

        if (effect.type === 'hungerDrainPenalty' && Number.isFinite(effect.amount) && effect.amount > 0) {
            game.followerFoodConsumptionPerSecond += effect.amount;
            effect.applied = true;
        }
    });
}

function migrateLegacyWildAreaDistances(exploration) {
    if (!exploration || !Array.isArray(exploration.discoveredAreas) || exploration.discoveredAreas.length === 0) return;

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
        game,
        lastSavedAtMs: Date.now()
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

            // One-time upgrade guard: pre-rebalance saves carried the old, badly undercosted
            // default of 0.8, which required 31.25% of the population to be Hunters just to
            // break even on food. Only bump saves still sitting at (approximately) that old
            // default - don't stomp a value the player has since deliberately tuned higher.
            if (!Number.isFinite(gameState.rates.hunterFoodPerSecond) || gameState.rates.hunterFoodPerSecond < 0.9) {
                gameState.rates.hunterFoodPerSecond = 2.0;
            }

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
            if (!Number.isFinite(game.followerFoodConsumptionPerSecond) || game.followerFoodConsumptionPerSecond <= 0 || game.followerFoodConsumptionPerSecond > 1) {
                game.followerFoodConsumptionPerSecond = 0.25;
            }
            if (!Number.isFinite(game.hungerStarvationDrainPerSecond) || game.hungerStarvationDrainPerSecond <= 0) {
                game.hungerStarvationDrainPerSecond = 3;
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
            if (!Number.isFinite(game.roleCostGrowthRate) || game.roleCostGrowthRate < 1) {
                game.roleCostGrowthRate = 1.05;
            }

            if (!Number.isFinite(game.alignment)) {
                game.alignment = 0;
            }
            game.alignment = Math.max(-100, Math.min(100, game.alignment));

            if (typeof game.alignmentVisible !== 'boolean') {
                game.alignmentVisible = false;
            }

            if (!Number.isFinite(game.alignmentPreachGain) || game.alignmentPreachGain < 0) {
                game.alignmentPreachGain = 1;
            }
            if (!Number.isFinite(game.heliosFavorPreachGain) || game.heliosFavorPreachGain < 0) {
                game.heliosFavorPreachGain = 1;
            }
            if (!Number.isFinite(game.alignmentConvertGain) || game.alignmentConvertGain < 0) {
                game.alignmentConvertGain = 1;
            }
            if (!Number.isFinite(game.heliosFavorConvertGain) || game.heliosFavorConvertGain < 0) {
                game.heliosFavorConvertGain = 1;
            }
            if (!Number.isFinite(game.alignmentConquerLoss) || game.alignmentConquerLoss < 0) {
                game.alignmentConquerLoss = 1;
            }
            if (!Number.isFinite(game.sekhmetFavorConquerGain) || game.sekhmetFavorConquerGain < 0) {
                game.sekhmetFavorConquerGain = 1;
            }
            if (typeof game.danuBlessingUnlocked !== 'boolean') {
                game.danuBlessingUnlocked = false;
            }
            if (!Number.isFinite(game.danuBlessingMultiplier) || game.danuBlessingMultiplier < 1) {
                game.danuBlessingMultiplier = 1.2;
            }
            if (!Number.isFinite(game.alignmentBlessHarvestGain) || game.alignmentBlessHarvestGain < 0) {
                game.alignmentBlessHarvestGain = 5;
            }
            if (!Number.isFinite(game.danuFavorBlessHarvestGain) || game.danuFavorBlessHarvestGain < 0) {
                game.danuFavorBlessHarvestGain = 10;
            }
            if (!Number.isFinite(game.helOfferingFollowerCost) || game.helOfferingFollowerCost < 0) {
                game.helOfferingFollowerCost = 3;
            }
            if (!Number.isFinite(game.helOfferingFaithRefund) || game.helOfferingFaithRefund < 0) {
                game.helOfferingFaithRefund = 30;
            }
            if (!Number.isFinite(game.alignmentHelOfferingLoss) || game.alignmentHelOfferingLoss < 0) {
                game.alignmentHelOfferingLoss = 5;
            }
            if (!Number.isFinite(game.helFavorOfferingGain) || game.helFavorOfferingGain < 0) {
                game.helFavorOfferingGain = 10;
            }
            if (!Number.isFinite(gameState.costs.blessHarvestFaithCost) || gameState.costs.blessHarvestFaithCost < 0) {
                gameState.costs.blessHarvestFaithCost = 150;
            }
            if (!Number.isFinite(gameState.costs.blessHarvestWoodCost) || gameState.costs.blessHarvestWoodCost < 0) {
                gameState.costs.blessHarvestWoodCost = 100;
            }
            if (!Number.isFinite(gameState.costs.blessHarvestStoneCost) || gameState.costs.blessHarvestStoneCost < 0) {
                gameState.costs.blessHarvestStoneCost = 100;
            }
            if (!Number.isFinite(gameState.costs.helOfferingFaithCost) || gameState.costs.helOfferingFaithCost < 0) {
                gameState.costs.helOfferingFaithCost = 20;
            }

            if (!game.factionFavor || typeof game.factionFavor !== 'object') {
                game.factionFavor = {};
            }
            const mergedFactionFavor = createFactionFavorMap(0);
            FACTION_DEFINITIONS.forEach((factionDefinition) => {
                const value = game.factionFavor[factionDefinition.id];
                mergedFactionFavor[factionDefinition.id] = Number.isFinite(value) && value >= 0 ? value : 0;
            });
            game.factionFavor = mergedFactionFavor;

            if (typeof game.doctrinesUnlocked !== 'boolean') {
                game.doctrinesUnlocked = false;
            }
            if (!Number.isFinite(gameState.costs.councilFaithCost) || gameState.costs.councilFaithCost < 0) {
                gameState.costs.councilFaithCost = 100;
            }
            if (!Number.isFinite(game.councilFollowerRequirement) || game.councilFollowerRequirement < 1) {
                game.councilFollowerRequirement = 10;
            }
            if (!Number.isFinite(game.shepherdsCreedCostMultiplier) || game.shepherdsCreedCostMultiplier <= 0 || game.shepherdsCreedCostMultiplier > 1) {
                game.shepherdsCreedCostMultiplier = 0.85;
            }
            if (!Number.isFinite(game.ironFistYieldMultiplier) || game.ironFistYieldMultiplier < 1) {
                game.ironFistYieldMultiplier = 1.25;
            }
            if (!Number.isFinite(game.ironFistCostMultiplier) || game.ironFistCostMultiplier <= 0 || game.ironFistCostMultiplier > 1) {
                game.ironFistCostMultiplier = 0.9;
            }
            if (!Number.isFinite(game.homesteadOutputMultiplier) || game.homesteadOutputMultiplier < 1) {
                game.homesteadOutputMultiplier = 1.2;
            }
            if (!Number.isFinite(game.wanderlustRollBonus) || game.wanderlustRollBonus < 0) {
                game.wanderlustRollBonus = 2;
            }
            if (!Number.isFinite(game.wanderlustCostMultiplier) || game.wanderlustCostMultiplier <= 0 || game.wanderlustCostMultiplier > 1) {
                game.wanderlustCostMultiplier = 0.9;
            }
            if (!Number.isFinite(game.abundantTableConsumptionMultiplier) || game.abundantTableConsumptionMultiplier <= 0 || game.abundantTableConsumptionMultiplier > 1) {
                game.abundantTableConsumptionMultiplier = 0.75;
            }
            if (!Number.isFinite(game.leanYearsConsumptionMultiplier) || game.leanYearsConsumptionMultiplier <= 0 || game.leanYearsConsumptionMultiplier > 1) {
                game.leanYearsConsumptionMultiplier = 0.5;
            }
            if (!Number.isFinite(game.leanYearsStarvationMultiplier) || game.leanYearsStarvationMultiplier < 1) {
                game.leanYearsStarvationMultiplier = 2.5;
            }

            // Exhaustive doctrineChoices validation: rebuild from scratch so a corrupted save
            // can never claim an invalid/foreign option was chosen for a group.
            const validatedDoctrineChoices = createDoctrineChoiceMap(null);
            if (game.doctrineChoices && typeof game.doctrineChoices === 'object') {
                DOCTRINE_GROUPS.forEach((group) => {
                    const savedValue = game.doctrineChoices[group.id];
                    const validOptionIds = group.options.map((option) => option.id);
                    validatedDoctrineChoices[group.id] = validOptionIds.includes(savedValue) ? savedValue : null;
                });
            }
            game.doctrineChoices = validatedDoctrineChoices;

            const validTempleGodIds = ['helios', 'sekhmet', 'danu', 'hel'];
            if (!game.temple || typeof game.temple !== 'object') {
                game.temple = { built: false, godId: null };
            } else {
                game.temple = {
                    built: Boolean(game.temple.built),
                    godId: validTempleGodIds.includes(game.temple.godId) ? game.temple.godId : null
                };
                if (!game.temple.godId) game.temple.built = false;
            }
            if (!Number.isFinite(gameState.costs.templeFaithCost) || gameState.costs.templeFaithCost < 0) {
                gameState.costs.templeFaithCost = 2000;
            }
            if (!Number.isFinite(gameState.costs.templeWoodCost) || gameState.costs.templeWoodCost < 0) {
                gameState.costs.templeWoodCost = 800;
            }
            if (!Number.isFinite(gameState.costs.templeStoneCost) || gameState.costs.templeStoneCost < 0) {
                gameState.costs.templeStoneCost = 800;
            }
            if (!Number.isFinite(game.templeFollowerRequirement) || game.templeFollowerRequirement < 1) {
                game.templeFollowerRequirement = 100;
            }
            if (!Number.isFinite(game.templeFavorRequirement) || game.templeFavorRequirement < 0) {
                game.templeFavorRequirement = 200;
            }
            if (!Number.isFinite(game.templeAlignmentShift) || game.templeAlignmentShift < 0) {
                game.templeAlignmentShift = 15;
            }
            if (!Number.isFinite(game.templeFavorGain) || game.templeFavorGain < 0) {
                game.templeFavorGain = 50;
            }
            if (!Number.isFinite(game.templeHeliosCapacityMultiplier) || game.templeHeliosCapacityMultiplier < 1) {
                game.templeHeliosCapacityMultiplier = 1.5;
            }
            if (!Number.isFinite(game.templeSekhmetConquerYieldMultiplier) || game.templeSekhmetConquerYieldMultiplier < 1) {
                game.templeSekhmetConquerYieldMultiplier = 1.75;
            }
            if (!Number.isFinite(game.templeDanuOutputMultiplier) || game.templeDanuOutputMultiplier < 1) {
                game.templeDanuOutputMultiplier = 1.5;
            }
            if (!Number.isFinite(game.templeHelConsumptionMultiplier) || game.templeHelConsumptionMultiplier <= 0 || game.templeHelConsumptionMultiplier > 1) {
                game.templeHelConsumptionMultiplier = 0.1;
            }

            // --- Worlds ---
            if (!Number.isFinite(gameState.progression.starlight) || gameState.progression.starlight < 0) {
                gameState.progression.starlight = 0;
            }
            if (typeof game.worldsUnlocked !== 'boolean') {
                game.worldsUnlocked = false;
            }
            if (!Number.isFinite(gameState.costs.unlockWorldsFaithCost) || gameState.costs.unlockWorldsFaithCost < 0) {
                gameState.costs.unlockWorldsFaithCost = 5000;
            }
            if (!Number.isFinite(gameState.costs.chartWorldStarlightBaseCost) || gameState.costs.chartWorldStarlightBaseCost < 0) {
                gameState.costs.chartWorldStarlightBaseCost = 500;
            }
            if (!Number.isFinite(gameState.costs.chartWorldFaithBaseCost) || gameState.costs.chartWorldFaithBaseCost < 0) {
                gameState.costs.chartWorldFaithBaseCost = 2000;
            }
            if (!Number.isFinite(gameState.costs.worldExpeditionRollFaithBaseCost) || gameState.costs.worldExpeditionRollFaithBaseCost < 1) {
                gameState.costs.worldExpeditionRollFaithBaseCost = 60;
            }
            if (!Number.isFinite(gameState.costs.worldSermonFaithBaseCost) || gameState.costs.worldSermonFaithBaseCost < 0) {
                gameState.costs.worldSermonFaithBaseCost = 8;
            }
            if (!Number.isFinite(gameState.costs.worldConquerFaithBaseCost) || gameState.costs.worldConquerFaithBaseCost < 0) {
                gameState.costs.worldConquerFaithBaseCost = 15;
            }
            if (!Number.isFinite(game.worldsUnlockFollowerCapacityRequirement) || game.worldsUnlockFollowerCapacityRequirement < 1) {
                game.worldsUnlockFollowerCapacityRequirement = 500;
            }
            if (!Number.isFinite(game.worldsUnlockVillagesResolvedRequirement) || game.worldsUnlockVillagesResolvedRequirement < 0) {
                game.worldsUnlockVillagesResolvedRequirement = 5;
            }
            if (!Number.isFinite(game.worldsUnlockMetersExploredRequirement) || game.worldsUnlockMetersExploredRequirement < 0) {
                game.worldsUnlockMetersExploredRequirement = 3000;
            }
            if (!Number.isFinite(game.worldVillagesResolvedToChartBase) || game.worldVillagesResolvedToChartBase < 0) {
                game.worldVillagesResolvedToChartBase = 1;
            }
            if (!Number.isFinite(game.worldTierCostMultiplierStep) || game.worldTierCostMultiplierStep < 0) {
                game.worldTierCostMultiplierStep = 0.25;
            }
            if (!Number.isFinite(game.nextWorldIndex) || game.nextWorldIndex < 1) {
                game.nextWorldIndex = 1;
            }

            const sanitizeWorldVillage = (village, index) => ({
                id: village?.id || `world-village-${index + 1}`,
                name: village?.name || `Settlement ${index + 1}`,
                distanceFromCamp: Number.isFinite(village?.distanceFromCamp) ? Math.max(1, Math.floor(village.distanceFromCamp)) : 500,
                population: Number.isFinite(village?.population) ? Math.max(1, Math.floor(village.population)) : 1500,
                resistance: Number.isFinite(village?.resistance) ? Math.max(0, Math.floor(village.resistance)) : 42,
                convertedPercent: Number.isFinite(village?.convertedPercent) ? Math.max(0, Math.min(100, Math.floor(village.convertedPercent))) : 0,
                discovered: Boolean(village?.discovered),
                sermonsHeld: Number.isFinite(village?.sermonsHeld) ? Math.max(0, Math.floor(village.sermonsHeld)) : 0,
                prophetPresent: Boolean(village?.prophetPresent),
                resolutionType: village?.resolutionType === 'converted' || village?.resolutionType === 'conquered' ? village.resolutionType : null
            });

            const sanitizeWorldArea = (area, index) => ({
                id: area?.id || `world-area-${index + 1}`,
                name: area?.name || `Reach ${index + 1}`,
                distanceFromCamp: Number.isFinite(area?.distanceFromCamp) ? Math.max(1, Math.floor(area.distanceFromCamp)) : 0,
                discovered: Boolean(area?.discovered),
                resourceCache: area?.resourceCache && typeof area.resourceCache === 'object'
                    ? {
                        starlight: Number.isFinite(area.resourceCache.starlight) ? Math.max(0, Math.floor(area.resourceCache.starlight)) : 0,
                        collected: Boolean(area.resourceCache.collected)
                    }
                    : null
            });

            const validFavorGods = ['helios', 'hel', 'danu', 'sekhmet'];
            const sanitizedWorlds = (Array.isArray(game.worlds) ? game.worlds : [])
                .filter((world) => world && typeof world === 'object')
                .map((world, index) => ({
                    id: world.id || `world-${index + 1}`,
                    name: world.name || `Unnamed World ${index + 1}`,
                    tier: Number.isFinite(world.tier) ? Math.max(1, Math.floor(world.tier)) : 1,
                    favorAlignment: validFavorGods.includes(world.favorAlignment) ? world.favorAlignment : null,
                    outpostStarlightPerSecond: Number.isFinite(world.outpostStarlightPerSecond) ? Math.max(0, world.outpostStarlightPerSecond) : 0.08,
                    frozen: Boolean(world.frozen),
                    finalDominationScore: Number.isFinite(world.finalDominationScore) ? Math.max(0, Math.min(100, world.finalDominationScore)) : null,
                    totalMetersExplored: Number.isFinite(world.totalMetersExplored) ? Math.max(0, Math.floor(world.totalMetersExplored)) : 0,
                    hazardScale: Number.isFinite(world.hazardScale) ? Math.max(0, world.hazardScale) : 1,
                    activeExpedition: world.activeExpedition && typeof world.activeExpedition === 'object' ? world.activeExpedition : null,
                    wildAreas: Array.isArray(world.wildAreas) ? world.wildAreas.map(sanitizeWorldArea) : [],
                    villages: Array.isArray(world.villages) && world.villages.length > 0
                        ? world.villages.map(sanitizeWorldVillage)
                        : [sanitizeWorldVillage(null, 0)],
                    nextVillageIndex: Number.isFinite(world.nextVillageIndex) ? Math.max(2, Math.floor(world.nextVillageIndex)) : 2,
                    nextAreaIndex: Number.isFinite(world.nextAreaIndex) ? Math.max(1, Math.floor(world.nextAreaIndex)) : 1
                }));
            game.worlds = sanitizedWorlds;

            if (typeof game.activeWorldId !== 'string' || !sanitizedWorlds.some((world) => world.id === game.activeWorldId)) {
                game.activeWorldId = sanitizedWorlds.length > 0 ? sanitizedWorlds[sanitizedWorlds.length - 1].id : null;
            }

            // --- Ascension ---
            if (!game.ascension || typeof game.ascension !== 'object') {
                game.ascension = { echoesOfDivinity: 0, upgradeRanks: createAscensionUpgradeRankMap(0), totalAscensions: 0 };
            } else {
                game.ascension.echoesOfDivinity = Number.isFinite(game.ascension.echoesOfDivinity) ? Math.max(0, game.ascension.echoesOfDivinity) : 0;
                game.ascension.totalAscensions = Number.isFinite(game.ascension.totalAscensions) ? Math.max(0, Math.floor(game.ascension.totalAscensions)) : 0;

                const mergedUpgradeRanks = createAscensionUpgradeRankMap(0);
                const savedRanks = game.ascension.upgradeRanks && typeof game.ascension.upgradeRanks === 'object' ? game.ascension.upgradeRanks : {};
                ASCENSION_UPGRADES.forEach((upgrade) => {
                    const savedRank = savedRanks[upgrade.id];
                    mergedUpgradeRanks[upgrade.id] = Number.isFinite(savedRank) && savedRank >= 0 ? Math.floor(savedRank) : 0;
                });
                game.ascension.upgradeRanks = mergedUpgradeRanks;
            }
            if (!Number.isFinite(gameState.costs.echoingFaithBaseEchoesCost) || gameState.costs.echoingFaithBaseEchoesCost < 0) {
                gameState.costs.echoingFaithBaseEchoesCost = 10;
            }
            if (!Number.isFinite(gameState.costs.swiftFoundationsBaseEchoesCost) || gameState.costs.swiftFoundationsBaseEchoesCost < 0) {
                gameState.costs.swiftFoundationsBaseEchoesCost = 15;
            }
            if (!Number.isFinite(gameState.costs.starlitMemoryBaseEchoesCost) || gameState.costs.starlitMemoryBaseEchoesCost < 0) {
                gameState.costs.starlitMemoryBaseEchoesCost = 25;
            }
            if (!Number.isFinite(gameState.costs.undyingFlockBaseEchoesCost) || gameState.costs.undyingFlockBaseEchoesCost < 0) {
                gameState.costs.undyingFlockBaseEchoesCost = 20;
            }

            if (!Number.isFinite(gameState.costs.unlockAltarFaithCost) || gameState.costs.unlockAltarFaithCost < 0) {
                gameState.costs.unlockAltarFaithCost = 0;
            }
            // One-time upgrade guard: pre-rebalance saves carried the old, badly undercosted default of 1.
            if (!Number.isFinite(gameState.costs.preachFaithCost) || gameState.costs.preachFaithCost < 5) {
                gameState.costs.preachFaithCost = 20;
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
            if (!Number.isFinite(gameState.costs.holdSermonFaithCost) || gameState.costs.holdSermonFaithCost < 0) {
                gameState.costs.holdSermonFaithCost = 5;
            }
            if (!Number.isFinite(gameState.costs.conquerVillageFaithCost) || gameState.costs.conquerVillageFaithCost < 0) {
                gameState.costs.conquerVillageFaithCost = 8;
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
            if (!Number.isFinite(game.shelterUpgradeCostMultiplier) || game.shelterUpgradeCostMultiplier <= 0 || game.shelterUpgradeCostMultiplier > 1) {
                game.shelterUpgradeCostMultiplier = 0.7;
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
            if (typeof game.exploration.wildAreaSeedInitialized !== 'boolean') {
                game.exploration.wildAreaSeedInitialized = false;
            }
            if (!Array.isArray(game.exploration.discoveredAreas)) {
                game.exploration.discoveredAreas = [];
            }

            const clampProbability = (value, fallback) => {
                const normalized = Number.isFinite(value) ? value : fallback;
                return Math.max(0, Math.min(1, normalized));
            };

            game.exploration.villageSpawnChance = clampProbability(game.exploration.villageSpawnChance, 0.2);
            game.exploration.hazardWipeoutChance = clampProbability(game.exploration.hazardWipeoutChance, 0.08);
            game.exploration.hazardHeavyLossChance = clampProbability(game.exploration.hazardHeavyLossChance, 0.17);
            game.exploration.hazardAmbushChance = clampProbability(game.exploration.hazardAmbushChance, 0.20);
            game.exploration.hazardHeavyLossFraction = clampProbability(game.exploration.hazardHeavyLossFraction, 0.5);
            game.exploration.hazardAmbushMinLossPercent = Number.isFinite(game.exploration.hazardAmbushMinLossPercent)
                ? Math.max(1, Math.floor(game.exploration.hazardAmbushMinLossPercent))
                : 20;
            game.exploration.hazardAmbushMaxLossPercent = Number.isFinite(game.exploration.hazardAmbushMaxLossPercent)
                ? Math.max(game.exploration.hazardAmbushMinLossPercent, Math.floor(game.exploration.hazardAmbushMaxLossPercent))
                : 60;
            game.exploration.prophetHeavyLossDeathChance = clampProbability(game.exploration.prophetHeavyLossDeathChance, 0.5);

            game.exploration.wildAreaSeedCount = Number.isFinite(game.exploration.wildAreaSeedCount)
                ? Math.max(1, Math.floor(game.exploration.wildAreaSeedCount))
                : 8;
            game.exploration.wildAreaDistanceMinStep = Number.isFinite(game.exploration.wildAreaDistanceMinStep)
                ? Math.max(1, Math.floor(game.exploration.wildAreaDistanceMinStep))
                : 30;
            game.exploration.wildAreaDistanceMaxStep = Number.isFinite(game.exploration.wildAreaDistanceMaxStep)
                ? Math.max(game.exploration.wildAreaDistanceMinStep, Math.floor(game.exploration.wildAreaDistanceMaxStep))
                : 120;
            game.exploration.wildAreaResourceCacheChance = clampProbability(game.exploration.wildAreaResourceCacheChance, 0.45);
            game.exploration.wildAreaResourceCacheWoodMin = Number.isFinite(game.exploration.wildAreaResourceCacheWoodMin)
                ? Math.max(0, Math.floor(game.exploration.wildAreaResourceCacheWoodMin))
                : 80;
            game.exploration.wildAreaResourceCacheWoodMax = Number.isFinite(game.exploration.wildAreaResourceCacheWoodMax)
                ? Math.max(game.exploration.wildAreaResourceCacheWoodMin, Math.floor(game.exploration.wildAreaResourceCacheWoodMax))
                : 220;
            game.exploration.wildAreaResourceCacheStoneMin = Number.isFinite(game.exploration.wildAreaResourceCacheStoneMin)
                ? Math.max(0, Math.floor(game.exploration.wildAreaResourceCacheStoneMin))
                : 70;
            game.exploration.wildAreaResourceCacheStoneMax = Number.isFinite(game.exploration.wildAreaResourceCacheStoneMax)
                ? Math.max(game.exploration.wildAreaResourceCacheStoneMin, Math.floor(game.exploration.wildAreaResourceCacheStoneMax))
                : 200;
            game.exploration.wildAreaFaithPerFollowerBonusChance = clampProbability(game.exploration.wildAreaFaithPerFollowerBonusChance, 0.2);
            game.exploration.wildAreaFaithPerFollowerBonusMin = Number.isFinite(game.exploration.wildAreaFaithPerFollowerBonusMin)
                ? Math.max(0, game.exploration.wildAreaFaithPerFollowerBonusMin)
                : 0.001;
            game.exploration.wildAreaFaithPerFollowerBonusMax = Number.isFinite(game.exploration.wildAreaFaithPerFollowerBonusMax)
                ? Math.max(game.exploration.wildAreaFaithPerFollowerBonusMin, game.exploration.wildAreaFaithPerFollowerBonusMax)
                : 0.006;
            game.exploration.wildAreaHungerDrainPenaltyChance = clampProbability(game.exploration.wildAreaHungerDrainPenaltyChance, 0.18);
            game.exploration.wildAreaHungerDrainPenaltyMin = Number.isFinite(game.exploration.wildAreaHungerDrainPenaltyMin)
                ? Math.max(0, game.exploration.wildAreaHungerDrainPenaltyMin)
                : 0.01;
            game.exploration.wildAreaHungerDrainPenaltyMax = Number.isFinite(game.exploration.wildAreaHungerDrainPenaltyMax)
                ? Math.max(game.exploration.wildAreaHungerDrainPenaltyMin, game.exploration.wildAreaHungerDrainPenaltyMax)
                : 0.05;

            game.exploration.discoveredAreas = game.exploration.discoveredAreas.map((area, index) => ({
                id: area?.id || `wild-area-${index + 1}`,
                name: area?.name || `Wild Area ${index + 1}`,
                distanceFromCamp: Number.isFinite(area?.distanceFromCamp) ? Math.max(1, Math.floor(area.distanceFromCamp)) : 0,
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
            }));

            if (game.exploration.discoveredAreas.length === 0 || game.exploration.discoveredAreas.every((area) => !Number.isFinite(area.distanceFromCamp) || area.distanceFromCamp <= 0)) {
                const seededAreas = [];
                let distance = 0;
                for (let index = 1; index <= game.exploration.wildAreaSeedCount; index += 1) {
                    const step = index === 1
                        ? 10
                        : Math.floor(Math.random() * (game.exploration.wildAreaDistanceMaxStep - game.exploration.wildAreaDistanceMinStep + 1)) + game.exploration.wildAreaDistanceMinStep;
                    distance += Math.max(1, step);

                    let resourceCache = null;
                    if (Math.random() < game.exploration.wildAreaResourceCacheChance) {
                        resourceCache = {
                            wood: Math.floor(Math.random() * (game.exploration.wildAreaResourceCacheWoodMax - game.exploration.wildAreaResourceCacheWoodMin + 1)) + game.exploration.wildAreaResourceCacheWoodMin,
                            stone: Math.floor(Math.random() * (game.exploration.wildAreaResourceCacheStoneMax - game.exploration.wildAreaResourceCacheStoneMin + 1)) + game.exploration.wildAreaResourceCacheStoneMin,
                            collected: false
                        };
                    }

                    let passiveEffect = null;
                    if (Math.random() < game.exploration.wildAreaFaithPerFollowerBonusChance) {
                        passiveEffect = {
                            type: 'faithPerFollowerBonus',
                            amount: Number((Math.random() * (game.exploration.wildAreaFaithPerFollowerBonusMax - game.exploration.wildAreaFaithPerFollowerBonusMin) + game.exploration.wildAreaFaithPerFollowerBonusMin).toFixed(4)),
                            applied: false
                        };
                    } else if (Math.random() < game.exploration.wildAreaHungerDrainPenaltyChance) {
                        passiveEffect = {
                            type: 'hungerDrainPenalty',
                            amount: Number((Math.random() * (game.exploration.wildAreaHungerDrainPenaltyMax - game.exploration.wildAreaHungerDrainPenaltyMin) + game.exploration.wildAreaHungerDrainPenaltyMin).toFixed(4)),
                            applied: false
                        };
                    }

                    seededAreas.push({
                        id: `wild-area-${index}`,
                        name: `Wild Area ${index}`,
                        distanceFromCamp: distance,
                        discovered: false,
                        discoveredAtMeters: null,
                        resourceCache,
                        passiveEffect
                    });
                }
                game.exploration.discoveredAreas = seededAreas;
            }
            if (!Number.isFinite(game.exploration.sermonSwayDivisor) || game.exploration.sermonSwayDivisor < 1) {
                game.exploration.sermonSwayDivisor = 8;
            }
            if (!Number.isFinite(game.exploration.conquerForceDivisor) || game.exploration.conquerForceDivisor < 1) {
                game.exploration.conquerForceDivisor = 10;
            }
            if (!Number.isFinite(game.exploration.villageOutpostFaithPerSecond) || game.exploration.villageOutpostFaithPerSecond < 0) {
                game.exploration.villageOutpostFaithPerSecond = 0.05;
            }
            if (!Number.isFinite(game.exploration.conquerFollowerBurstMultiplier) || game.exploration.conquerFollowerBurstMultiplier < 0) {
                game.exploration.conquerFollowerBurstMultiplier = 3;
            }
            if (!Number.isFinite(game.exploration.conquerWoodLootMin) || game.exploration.conquerWoodLootMin < 0) {
                game.exploration.conquerWoodLootMin = 100;
            }
            if (!Number.isFinite(game.exploration.conquerWoodLootMax) || game.exploration.conquerWoodLootMax <= game.exploration.conquerWoodLootMin) {
                game.exploration.conquerWoodLootMax = game.exploration.conquerWoodLootMin + 200;
            }
            if (!Number.isFinite(game.exploration.conquerStoneLootMin) || game.exploration.conquerStoneLootMin < 0) {
                game.exploration.conquerStoneLootMin = 100;
            }
            if (!Number.isFinite(game.exploration.conquerStoneLootMax) || game.exploration.conquerStoneLootMax <= game.exploration.conquerStoneLootMin) {
                game.exploration.conquerStoneLootMax = game.exploration.conquerStoneLootMin + 200;
            }

            migrateLegacyWildAreaDistances(game.exploration);
            syncDiscoveredAreasByDistance(game.exploration);
            applyDiscoveredAreaPassiveEffects(game.exploration);
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
                    prophetPresent: false,
                    resolutionType: null
                }];
            }
            game.exploration.villages = game.exploration.villages.map((village, index) => {
                const convertedPercent = Number.isFinite(village?.convertedPercent) ? Math.max(0, Math.min(100, Math.floor(village.convertedPercent))) : 0;
                let resolutionType = village?.resolutionType === 'converted' || village?.resolutionType === 'conquered'
                    ? village.resolutionType
                    : null;
                if (!resolutionType && convertedPercent >= 100) {
                    resolutionType = 'converted';
                }
                return {
                    id: village?.id || `village-${index + 1}`,
                    name: village?.name || `Village ${index + 1}`,
                    distanceFromCamp: Number.isFinite(village?.distanceFromCamp) ? Math.floor(village.distanceFromCamp) : 500,
                    population: Number.isFinite(village?.population) ? Math.floor(village.population) : 1500,
                    resistance: Number.isFinite(village?.resistance) ? Math.floor(village.resistance) : 45,
                    convertedPercent,
                    discovered: Boolean(village?.discovered),
                    sermonsHeld: Number.isFinite(village?.sermonsHeld) ? Math.max(0, Math.floor(village.sermonsHeld)) : 0,
                    prophetPresent: Boolean(village?.prophetPresent),
                    resolutionType
                };
            });
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
            // Preserve the saved bonus regardless of Altar status - Zealous Preaching can
            // raise this independently of the Altar, which only guarantees a floor of 1.
            game.diceBonuses.preach = game.altarBuilt ? Math.max(1, savedPreachBonus) : savedPreachBonus;

            if (!Number.isFinite(gameState.costs.expandPartyBaseCost) || gameState.costs.expandPartyBaseCost < 0) {
                gameState.costs.expandPartyBaseCost = 100;
            }
            if (!Number.isFinite(gameState.costs.expeditionTrainingBaseCost) || gameState.costs.expeditionTrainingBaseCost < 0) {
                gameState.costs.expeditionTrainingBaseCost = 80;
            }
            if (!Number.isFinite(gameState.costs.zealousPreachingBaseCost) || gameState.costs.zealousPreachingBaseCost < 0) {
                gameState.costs.zealousPreachingBaseCost = 60;
            }
            if (!Number.isFinite(game.upgradeCostGrowthRate) || game.upgradeCostGrowthRate <= 1) {
                game.upgradeCostGrowthRate = 1.3;
            }
            if (!Number.isFinite(game.upgradeMaxPurchases) || game.upgradeMaxPurchases < 1) {
                game.upgradeMaxPurchases = 10;
            }
            if (!Number.isFinite(game.expandPartyFollowerIncrease) || game.expandPartyFollowerIncrease < 0) {
                game.expandPartyFollowerIncrease = 5;
            }
            if (!Number.isFinite(game.expeditionTrainingHazardMultiplier) || game.expeditionTrainingHazardMultiplier <= 0 || game.expeditionTrainingHazardMultiplier > 1) {
                game.expeditionTrainingHazardMultiplier = 0.9;
            }
            if (!Number.isFinite(game.zealousPreachingPurchases) || game.zealousPreachingPurchases < 0) {
                game.zealousPreachingPurchases = 0;
            }
            game.zealousPreachingPurchases = Math.min(game.upgradeMaxPurchases, Math.floor(game.zealousPreachingPurchases));

            if (!Number.isFinite(game.exploration.partyExpansionPurchases) || game.exploration.partyExpansionPurchases < 0) {
                game.exploration.partyExpansionPurchases = 0;
            }
            game.exploration.partyExpansionPurchases = Math.min(game.upgradeMaxPurchases, Math.floor(game.exploration.partyExpansionPurchases));
            if (!Number.isFinite(game.exploration.expeditionTrainingPurchases) || game.exploration.expeditionTrainingPurchases < 0) {
                game.exploration.expeditionTrainingPurchases = 0;
            }
            game.exploration.expeditionTrainingPurchases = Math.min(game.upgradeMaxPurchases, Math.floor(game.exploration.expeditionTrainingPurchases));

            if (!Number.isFinite(game.offlineProgressMaxHours) || game.offlineProgressMaxHours <= 0) {
                game.offlineProgressMaxHours = 8;
            }

            const now = Date.now();
            const rawLastSavedAtMs = Number.isFinite(data?.lastSavedAtMs) ? data.lastSavedAtMs : now;
            const offlineSecondsRaw = Math.max(0, (now - rawLastSavedAtMs) / 1000);
            const offlineSeconds = Math.min(offlineSecondsRaw, game.offlineProgressMaxHours * 3600);

            console.log('Game loaded from localStorage');
            return { loaded: true, offlineSeconds, offlineSecondsRaw, cappedByLimit: offlineSecondsRaw > offlineSeconds };
        } catch (e) {
            console.error('Failed to load save:', e);
            return { loaded: false, offlineSeconds: 0, offlineSecondsRaw: 0, cappedByLimit: false };
        }
    }
    return { loaded: false, offlineSeconds: 0, offlineSecondsRaw: 0, cappedByLimit: false };
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