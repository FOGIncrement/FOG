import { gameState, game } from '../classes/GameState.js';
import { ROLE_DEFINITIONS } from '../config/roles.js';

function normalizeRoleCount(value) {
    if (!Number.isFinite(value) || value < 0) return 0;
    return Math.floor(value);
}

export function getRoleCount(roleId) {
    const roleMapValue = gameState.progression.roles?.[roleId];
    if (Number.isFinite(roleMapValue)) return normalizeRoleCount(roleMapValue);

    const legacyValue = gameState.progression[roleId];
    return normalizeRoleCount(legacyValue);
}

export function setRoleCount(roleId, count) {
    const normalized = normalizeRoleCount(count);

    if (!gameState.progression.roles || typeof gameState.progression.roles !== 'object') {
        gameState.progression.roles = {};
    }

    gameState.progression.roles[roleId] = normalized;
    gameState.progression[roleId] = normalized;
}

export function getMaxFollowers() {
    const perShelter = (game.shelterCapacityPerShelter || 3) * (game.shelterCapacityMultiplier || 1);
    return 1 + game.shelter * perShelter;
}

export function getAssignedFollowers() {
    return ROLE_DEFINITIONS.reduce((total, roleDefinition) => {
        return total + getRoleCount(roleDefinition.id);
    }, 0);
}

export function getUnassignedFollowers() {
    return Math.max(0, gameState.progression.followers - getAssignedFollowers());
}

export function getNextGoal() {
    if (game.ritualCircleBuilt < 1) {
        return { label: 'Build the Ritual Circle', detail: `Costs ${gameState.costs.ritualBtnCost} faith and unlocks the rest of the settlement.` };
    }

    if (game.shelter < 1) {
        return { label: 'Build a Shelter', detail: 'Costs wood/stone (Build tab); raises follower capacity and reveals Hunger.' };
    }

    if (!game.unlocksTabUnlocked) {
        return { label: 'Preach to your followers', detail: 'A successful sermon unlocks Training, roles, and further upgrades.' };
    }

    if (!game.trainingUnlocked) {
        return { label: 'Unlock Training', detail: `Costs ${gameState.costs.trainingTechCost} faith; enables role specialization.` };
    }

    if (!ROLE_DEFINITIONS.some((role) => game.roleUnlocks[role.id])) {
        return { label: 'Unlock a role', detail: 'Hunters, Ritualists, Gatherers, or Cooks — pick one to start specializing followers.' };
    }

    if (getAssignedFollowers() === 0 && getUnassignedFollowers() > 0) {
        return { label: 'Train your followers into a role', detail: "You've unlocked a role but haven't assigned anyone to it yet." };
    }

    if (gameState.progression.followers < game.shelterUpgradeFollowerRequirement) {
        return { label: 'Grow your settlement', detail: `Preach/convert followers toward ${game.shelterUpgradeFollowerRequirement} to unlock the Shack upgrade.` };
    }

    if (!game.shelterUpgradeUnlocked) {
        return { label: 'Unlock the Shelter Upgrade', detail: `Costs ${gameState.costs.unlockShelterUpgradeFaithCost} faith; doubles capacity and reduces costs.` };
    }

    if (!game.altarUnlocked) {
        return { label: 'Unlock the Altar', detail: 'Improves Preach rolls once built.' };
    }

    if (game.altarUnlocked && !game.altarBuilt) {
        return { label: 'Build the Altar', detail: 'Costs wood/stone/faith; grants +1 to Preach rolls.' };
    }

    const explorationCapacityRequirement = Number.isFinite(game.prophetUnlockCapacityRequirement)
        ? Math.floor(game.prophetUnlockCapacityRequirement)
        : 150;
    if (getMaxFollowers() < explorationCapacityRequirement) {
        return { label: 'Keep growing capacity', detail: `Reach ${explorationCapacityRequirement} max followers to unlock Exploration.` };
    }

    if (!game.explorationUnlocked) {
        return { label: 'Unlock Exploration', detail: `Costs ${gameState.costs.unlockExplorationFaithCost} faith.` };
    }

    return null;
}

export function hasProphetAssigned() {
    return getRoleCount('prophet') > 0;
}

export function getExpeditionFollowerLimit() {
    const configured = game?.exploration?.followerSendLimit;
    if (!Number.isFinite(configured) || configured < 1) return 10;
    return Math.floor(configured);
}

export function getNextVillageDistance() {
    const exploration = game?.exploration;
    if (!exploration) return 500;

    const villages = Array.isArray(exploration.villages) ? exploration.villages : [];
    const furthest = villages.reduce((maxDistance, village) => {
        const distance = Number.isFinite(village?.distanceFromCamp) ? village.distanceFromCamp : 0;
        return Math.max(maxDistance, distance);
    }, 0);

    const minRange = Number.isFinite(exploration.villageDistanceRange?.min)
        ? exploration.villageDistanceRange.min
        : 350;
    const maxRange = Number.isFinite(exploration.villageDistanceRange?.max)
        ? exploration.villageDistanceRange.max
        : 900;

    const minStep = Math.max(200, Math.floor(minRange));
    const maxStep = Math.max(minStep + 1, Math.floor(maxRange));
    const step = Math.floor(Math.random() * (maxStep - minStep + 1)) + minStep;
    return furthest + step;
}

export function getRoleBulkCost(baseCost, currentlyOwned, quantity, growthRate = game.roleCostGrowthRate) {
    if (!Number.isFinite(quantity) || quantity <= 0) return 0;

    const owned = Number.isFinite(currentlyOwned) && currentlyOwned > 0 ? currentlyOwned : 0;
    const rate = Number.isFinite(growthRate) && growthRate > 1 ? growthRate : 1;

    if (rate === 1) return Math.ceil(baseCost * quantity);

    const scaleToOwned = Math.pow(rate, owned);
    const seriesSum = (Math.pow(rate, quantity) - 1) / (rate - 1);
    return Math.ceil(baseCost * scaleToOwned * seriesSum);
}

export function getRoleTrainingCost(baseCost, currentlyOwned) {
    const untrained = getUnassignedFollowers();
    if (untrained <= 0) return Infinity;

    const inputEl = document.getElementById('trainCountInput');
    let toTrain = inputEl && inputEl.value ? parseInt(inputEl.value, 10) : untrained;
    if (isNaN(toTrain) || toTrain <= 0) toTrain = untrained;
    toTrain = Math.min(toTrain, untrained);

    return getRoleBulkCost(baseCost, currentlyOwned, toTrain);
}

export function getShelterBuildCosts() {
    const sheltersBuilt = Number.isFinite(game.shelter) ? Math.max(0, game.shelter) : 0;
    const scalePerBuilt = Number.isFinite(game.shelterCostScalePerBuilt)
        ? game.shelterCostScalePerBuilt
        : 0.1;
    const scale = 1 + (scalePerBuilt * sheltersBuilt);
    const woodBase = Number.isFinite(gameState.costs.shelterWoodCost) ? gameState.costs.shelterWoodCost : 0;
    const stoneBase = Number.isFinite(gameState.costs.shelterStoneCost) ? gameState.costs.shelterStoneCost : 0;

    return {
        wood: woodBase * scale,
        stone: stoneBase * scale
    };
}

export function rollPreachConversions() {
    const weights = Array.isArray(game.preachOutcomeWeights) && game.preachOutcomeWeights.length === 4
        ? game.preachOutcomeWeights
        : [45, 30, 18, 7];

    const totalWeight = weights.reduce((sum, value) => sum + Math.max(0, value), 0);
    if (totalWeight <= 0) return 1;

    let roll = Math.random() * totalWeight;
    for (let i = 0; i < weights.length; i++) {
        roll -= Math.max(0, weights[i]);
        if (roll <= 0) return i + 1;
    }

    return 1;
}