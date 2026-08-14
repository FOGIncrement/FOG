import { gameState, game } from '../classes/GameState.js';
import { ROLE_DEFINITIONS } from '../config/roles.js';
import { resolveUniverseConquestTier } from '../config/universe-conquest.js';
import { getFavorTierCount, getNextFavorTierThreshold } from '../config/favor-tiers.js';
import { SETTLEMENT_TIERS } from '../config/settlement-tiers.js';
import { getSettlementReputationTier } from '../config/trade-settlements.js';

function normalizeRoleCount(value) {
    if (!Number.isFinite(value) || value < 0) return 0;
    return Math.floor(value);
}

export function getUpgradeCost(baseCost, purchases, growthRate = game.upgradeCostGrowthRate) {
    const owned = Number.isFinite(purchases) && purchases > 0 ? purchases : 0;
    const rate = Number.isFinite(growthRate) && growthRate > 1 ? growthRate : 1.3;
    return Math.ceil(baseCost * Math.pow(rate, owned));
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

export { getFavorTierCount, getNextFavorTierThreshold };

const FAVOR_GOD_IDS = ['helios', 'sekhmet', 'danu', 'hel'];

// Favor bonuses are always derived live from current favor - this only
// tracks which tier-crossings the player has already been told about, so
// tick.js can log a one-time notification without re-announcing on reload.
export function checkFavorTierUnlocks() {
    if (!game.factionFavorTiersSeen || typeof game.factionFavorTiersSeen !== 'object') {
        game.factionFavorTiersSeen = {};
    }
    const newlyUnlocked = [];
    FAVOR_GOD_IDS.forEach((godId) => {
        const currentTiers = getFavorTierCount(godId, game);
        const seenTiers = Number.isFinite(game.factionFavorTiersSeen[godId]) ? game.factionFavorTiersSeen[godId] : 0;
        if (currentTiers > seenTiers) {
            game.factionFavorTiersSeen[godId] = currentTiers;
            newlyUnlocked.push({ godId, tier: currentTiers });
        }
    });
    return newlyUnlocked;
}

export function getHeliosFavorCostMultiplier() {
    const tiers = getFavorTierCount('helios', game);
    if (tiers <= 0) return 1;
    const perTier = Number.isFinite(game.heliosFavorCostReductionPerTier) ? game.heliosFavorCostReductionPerTier : 0.05;
    return Math.max(0.3, 1 - tiers * perTier);
}

export function getHeliosFavorCapacityMultiplier() {
    const tiers = getFavorTierCount('helios', game);
    if (tiers <= 0) return 1;
    const perTier = Number.isFinite(game.heliosFavorCapacityBonusPerTier) ? game.heliosFavorCapacityBonusPerTier : 0.05;
    return 1 + tiers * perTier;
}

export function getSekhmetFavorYieldMultiplier() {
    const tiers = getFavorTierCount('sekhmet', game);
    if (tiers <= 0) return 1;
    const perTier = Number.isFinite(game.sekhmetFavorYieldBonusPerTier) ? game.sekhmetFavorYieldBonusPerTier : 0.08;
    return 1 + tiers * perTier;
}

export function getSekhmetFavorHazardMultiplier() {
    const tiers = getFavorTierCount('sekhmet', game);
    if (tiers <= 0) return 1;
    const perTier = Number.isFinite(game.sekhmetFavorHazardReductionPerTier) ? game.sekhmetFavorHazardReductionPerTier : 0.03;
    return Math.max(0.3, 1 - tiers * perTier);
}

export function getDanuFavorCapMultiplier() {
    const tiers = getFavorTierCount('danu', game);
    if (tiers <= 0) return 1;
    const perTier = Number.isFinite(game.danuFavorCapBonusPerTier) ? game.danuFavorCapBonusPerTier : 0.08;
    return 1 + tiers * perTier;
}

export function getHelFavorConsumptionMultiplier() {
    const tiers = getFavorTierCount('hel', game);
    if (tiers <= 0) return 1;
    const perTier = Number.isFinite(game.helFavorConsumptionReductionPerTier) ? game.helFavorConsumptionReductionPerTier : 0.04;
    return Math.max(0.2, 1 - tiers * perTier);
}

export function getHelFavorStarlightMultiplier() {
    const tiers = getFavorTierCount('hel', game);
    if (tiers <= 0) return 1;
    const perTier = Number.isFinite(game.helFavorStarlightBonusPerTier) ? game.helFavorStarlightBonusPerTier : 0.10;
    return 1 + tiers * perTier;
}

export function getHelFavorEchoesMultiplier() {
    const tiers = getFavorTierCount('hel', game);
    if (tiers <= 0) return 1;
    const perTier = Number.isFinite(game.helFavorEchoesBonusPerTier) ? game.helFavorEchoesBonusPerTier : 0.08;
    return 1 + tiers * perTier;
}

export function getSettlementTierCapacityMultiplier() {
    let multiplier = 1;
    const currentTier = Number.isFinite(game.settlementTier) ? game.settlementTier : 0;
    for (let i = 0; i < currentTier && i < SETTLEMENT_TIERS.length; i += 1) {
        multiplier *= SETTLEMENT_TIERS[i].capacityMultiplier;
    }
    return multiplier;
}

export function getNextSettlementTier() {
    const currentTier = Number.isFinite(game.settlementTier) ? game.settlementTier : 0;
    return SETTLEMENT_TIERS[currentTier] || null;
}

export function canAffordSettlementTier(tier) {
    if (!tier) return false;
    if (gameState.progression.followers < tier.followerRequirement) return false;
    if (tier.requiresTemple && !game.temple?.built) return false;
    if (tier.requiresWorlds && !game.worldsUnlocked) return false;
    return gameState.progression.faith >= (tier.faithCost || 0)
        && gameState.resources.wood.amount >= (tier.woodCost || 0)
        && gameState.resources.stone.amount >= (tier.stoneCost || 0)
        && gameState.progression.starlight >= (tier.starlightCost || 0);
}

export function getTempleCapacityMultiplier() {
    if (game.temple?.built && game.temple.godId === 'helios' && Number.isFinite(game.templeHeliosCapacityMultiplier)) {
        return game.templeHeliosCapacityMultiplier;
    }
    return 1;
}

export function getTempleConquerYieldMultiplier() {
    if (game.temple?.built && game.temple.godId === 'sekhmet' && Number.isFinite(game.templeSekhmetConquerYieldMultiplier)) {
        return game.templeSekhmetConquerYieldMultiplier;
    }
    return 1;
}

export function getTempleConsumptionMultiplier() {
    if (game.temple?.built && game.temple.godId === 'hel' && Number.isFinite(game.templeHelConsumptionMultiplier)) {
        return game.templeHelConsumptionMultiplier;
    }
    return 1;
}

export function getMaxFollowers() {
    const perShelter = (game.shelterCapacityPerShelter || 3) * (game.shelterCapacityMultiplier || 1);
    const base = 1 + game.shelter * perShelter;
    return base
        * getTempleCapacityMultiplier()
        * getSettlementTierCapacityMultiplier()
        * getHeliosFavorCapacityMultiplier()
        * getSilkCapacityMultiplier();
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
    // The guiding hand only ever accompanies your very first incarnation.
    // Once you've Ascended, you're expected to know the way yourself.
    if (Number.isFinite(game.ascension?.totalAscensions) && game.ascension.totalAscensions > 0) {
        return null;
    }
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

export function getCultStatus() {
    if (game.hungerVisible) {
        const foodEmpty = gameState.resources.food.amount <= 0;
        if (game.hungerPercent < 20) {
            return { id: 'famine', label: 'Famine', description: 'Your people are starving. Food production must recover immediately.' };
        }
        if (game.hungerPercent < 50 || foodEmpty) {
            return { id: 'hungry', label: 'Hungry', description: 'Food stores are thin and hunger is creeping up.' };
        }
    }

    const maxFollowers = getMaxFollowers();
    if (maxFollowers > 0 && gameState.progression.followers / maxFollowers >= 0.95) {
        return { id: 'overcrowded', label: 'Overcrowded', description: 'Your settlement has outgrown its shelter. More capacity is needed.' };
    }

    if (game.temple?.built || game.worldsUnlocked) {
        return { id: 'ascendant', label: 'Ascendant', description: 'Your cult reaches beyond the mortal world.' };
    }

    if (game.hungerVisible && game.hungerPercent >= 80) {
        return { id: 'thriving', label: 'Thriving', description: 'The cult flourishes. Followers are well-fed and faithful.' };
    }

    return { id: 'stable', label: 'Stable', description: 'The cult grows steadily.' };
}

export function getWoodStoneCap() {
    const base = Number.isFinite(game.woodStoneCapBase) ? game.woodStoneCapBase : 2000;
    const perLevel = Number.isFinite(game.storehouseCapPerLevel) ? game.storehouseCapPerLevel : 1000;
    const level = Number.isFinite(game.storehouse) ? game.storehouse : 0;
    return (base + level * perLevel) * getDanuFavorCapMultiplier();
}

export function getFoodCap() {
    const base = Number.isFinite(game.foodCapBase) ? game.foodCapBase : 1000;
    const perLevel = Number.isFinite(game.granaryCapPerLevel) ? game.granaryCapPerLevel : 500;
    const level = Number.isFinite(game.granary) ? game.granary : 0;
    return (base + level * perLevel) * getDanuFavorCapMultiplier();
}

export function getStorehouseCost() {
    const base = Number.isFinite(gameState.costs.storehouseFaithCost) ? gameState.costs.storehouseFaithCost : 120;
    const level = Number.isFinite(game.storehouse) ? game.storehouse : 0;
    const scale = Number.isFinite(game.storehouseCostScalePerBuilt) ? game.storehouseCostScalePerBuilt : 0.15;
    // Compounding, not linear - an uncapped repeatable with a flat per-level
    // add eventually becomes the only thing left to spend faith on forever
    // (confirmed via playthrough simulation: 357 purchases by hour 30).
    return Math.ceil(base * Math.pow(1 + scale, level));
}

export function getGranaryCost() {
    const woodBase = Number.isFinite(gameState.costs.granaryWoodCost) ? gameState.costs.granaryWoodCost : 60;
    const stoneBase = Number.isFinite(gameState.costs.granaryStoneCost) ? gameState.costs.granaryStoneCost : 60;
    const level = Number.isFinite(game.granary) ? game.granary : 0;
    const scale = Number.isFinite(game.granaryCostScalePerBuilt) ? game.granaryCostScalePerBuilt : 0.15;
    const multiplier = Math.pow(1 + scale, level);
    return { wood: Math.ceil(woodBase * multiplier), stone: Math.ceil(stoneBase * multiplier) };
}

export function getScribeFaithMultiplier() {
    const count = getRoleCount('scribes');
    if (count <= 0) return 1;
    const perScribe = Number.isFinite(game.scribeFaithBonusPerScribe) ? game.scribeFaithBonusPerScribe : 0.02;
    return 1 + count * perScribe;
}

export function getFoodSpoilageRate() {
    const base = Number.isFinite(game.foodSpoilagePerSecondBase) ? game.foodSpoilagePerSecondBase : 0.002;
    const farmerCount = getRoleCount('farmers');
    const reductionPerFarmer = Number.isFinite(game.farmerSpoilageReductionPerFarmer) ? game.farmerSpoilageReductionPerFarmer : 0.05;
    const reduction = Math.min(0.9, farmerCount * reductionPerFarmer);
    return base * (1 - reduction);
}

export function getGranaryPassiveFoodPerSecond() {
    const level = Number.isFinite(game.granary) ? game.granary : 0;
    const perLevel = Number.isFinite(game.granaryPassiveFoodPerSecondPerLevel) ? game.granaryPassiveFoodPerSecondPerLevel : 0.3;
    return level * perLevel;
}

export function getShelterBuildCosts() {
    const sheltersBuilt = Number.isFinite(game.shelter) ? Math.max(0, game.shelter) : 0;
    const scalePerBuilt = Number.isFinite(game.shelterCostScalePerBuilt)
        ? game.shelterCostScalePerBuilt
        : 0.1;
    const scale = 1 + (scalePerBuilt * sheltersBuilt);
    const woodBase = Number.isFinite(gameState.costs.shelterWoodCost) ? gameState.costs.shelterWoodCost : 0;
    const stoneBase = Number.isFinite(gameState.costs.shelterStoneCost) ? gameState.costs.shelterStoneCost : 0;
    const ascensionMultiplier = getAscensionEarlyCostMultiplier();

    return {
        wood: woodBase * scale * ascensionMultiplier,
        stone: stoneBase * scale * ascensionMultiplier
    };
}

function isDoctrineChosen(groupId, optionId) {
    return game.doctrineChoices?.[groupId] === optionId;
}

export function getPreachFaithCost() {
    const base = Number.isFinite(gameState.costs.preachFaithCost) ? gameState.costs.preachFaithCost : 20;
    const doctrineMultiplier = isDoctrineChosen('flock', 'shepherdsCreed') && Number.isFinite(game.shepherdsCreedCostMultiplier)
        ? game.shepherdsCreedCostMultiplier
        : 1;
    return Math.max(0, Math.floor(base * doctrineMultiplier * getHeliosFavorCostMultiplier()));
}

export function getConvertFollowerCost() {
    const base = Number.isFinite(game.convertCost) ? game.convertCost : 10;
    const doctrineMultiplier = isDoctrineChosen('flock', 'shepherdsCreed') && Number.isFinite(game.shepherdsCreedCostMultiplier)
        ? game.shepherdsCreedCostMultiplier
        : 1;
    return Math.max(1, Math.floor(base * doctrineMultiplier * getHeliosFavorCostMultiplier()));
}

export function getConquerVillageFaithCost() {
    const base = Number.isFinite(gameState.costs.conquerVillageFaithCost) ? gameState.costs.conquerVillageFaithCost : 8;
    if (!isDoctrineChosen('flock', 'ironFist')) return base;
    const multiplier = Number.isFinite(game.ironFistCostMultiplier) ? game.ironFistCostMultiplier : 1;
    return Math.max(0, Math.floor(base * multiplier));
}

export function getConquerYieldMultiplier() {
    const doctrineMultiplier = isDoctrineChosen('flock', 'ironFist') && Number.isFinite(game.ironFistYieldMultiplier)
        ? game.ironFistYieldMultiplier
        : 1;
    return doctrineMultiplier * getTempleConquerYieldMultiplier() * getSekhmetFavorYieldMultiplier();
}

export function getExpeditionRollFaithCost() {
    const base = Number.isFinite(gameState.costs.expeditionRollFaithCost)
        ? Math.max(1, Math.floor(gameState.costs.expeditionRollFaithCost))
        : 50;
    if (!isDoctrineChosen('hearth', 'wanderlust')) return base;
    const multiplier = Number.isFinite(game.wanderlustCostMultiplier) ? game.wanderlustCostMultiplier : 1;
    return Math.max(1, Math.floor(base * multiplier));
}

export function getExpeditionRollBonus() {
    if (!isDoctrineChosen('hearth', 'wanderlust')) return 0;
    return Number.isFinite(game.wanderlustRollBonus) ? Math.floor(game.wanderlustRollBonus) : 0;
}

export function getFollowerFoodConsumptionMultiplier() {
    const choice = game.doctrineChoices?.sacrifice;
    let multiplier = 1;
    if (choice === 'abundantTable' && Number.isFinite(game.abundantTableConsumptionMultiplier)) multiplier = game.abundantTableConsumptionMultiplier;
    else if (choice === 'leanYears' && Number.isFinite(game.leanYearsConsumptionMultiplier)) multiplier = game.leanYearsConsumptionMultiplier;
    return multiplier * getTempleConsumptionMultiplier() * getHelFavorConsumptionMultiplier() * getWellConsumptionMultiplier();
}

export function getWatchtowerCost() {
    const woodBase = Number.isFinite(gameState.costs.watchtowerWoodCost) ? gameState.costs.watchtowerWoodCost : 150;
    const stoneBase = Number.isFinite(gameState.costs.watchtowerStoneCost) ? gameState.costs.watchtowerStoneCost : 150;
    const level = Number.isFinite(game.watchtower) ? game.watchtower : 0;
    const scale = Number.isFinite(game.watchtowerCostScalePerBuilt) ? game.watchtowerCostScalePerBuilt : 0.18;
    const multiplier = Math.pow(1 + scale, level) * getDoctrineBuildingCostMultiplier();
    return { wood: Math.ceil(woodBase * multiplier), stone: Math.ceil(stoneBase * multiplier) };
}

export function getWatchtowerHazardAvoidChance() {
    const level = Number.isFinite(game.watchtower) ? game.watchtower : 0;
    const perLevel = Number.isFinite(game.watchtowerHazardAvoidPerLevel) ? game.watchtowerHazardAvoidPerLevel : 0.04;
    const cap = Number.isFinite(game.watchtowerHazardAvoidCap) ? game.watchtowerHazardAvoidCap : 0.6;
    return Math.min(cap, level * perLevel);
}

export function getBarracksCost() {
    const woodBase = Number.isFinite(gameState.costs.barracksWoodCost) ? gameState.costs.barracksWoodCost : 200;
    const stoneBase = Number.isFinite(gameState.costs.barracksStoneCost) ? gameState.costs.barracksStoneCost : 150;
    const level = Number.isFinite(game.barracks) ? game.barracks : 0;
    const scale = Number.isFinite(game.barracksCostScalePerBuilt) ? game.barracksCostScalePerBuilt : 0.18;
    const multiplier = Math.pow(1 + scale, level) * getDoctrineBuildingCostMultiplier();
    return { wood: Math.ceil(woodBase * multiplier), stone: Math.ceil(stoneBase * multiplier) };
}

export function getBarracksConquerRollBonus() {
    const level = Number.isFinite(game.barracks) ? game.barracks : 0;
    const perLevel = Number.isFinite(game.barracksConquerRollBonusPerLevel) ? game.barracksConquerRollBonusPerLevel : 1;
    return level * perLevel;
}

export function getWellCost() {
    const woodBase = Number.isFinite(gameState.costs.wellWoodCost) ? gameState.costs.wellWoodCost : 80;
    const stoneBase = Number.isFinite(gameState.costs.wellStoneCost) ? gameState.costs.wellStoneCost : 40;
    const level = Number.isFinite(game.well) ? game.well : 0;
    const scale = Number.isFinite(game.wellCostScalePerBuilt) ? game.wellCostScalePerBuilt : 0.15;
    const multiplier = Math.pow(1 + scale, level) * getDoctrineBuildingCostMultiplier();
    return { wood: Math.ceil(woodBase * multiplier), stone: Math.ceil(stoneBase * multiplier) };
}

export function getWellConsumptionMultiplier() {
    const level = Number.isFinite(game.well) ? game.well : 0;
    const perLevel = Number.isFinite(game.wellConsumptionReductionPerLevel) ? game.wellConsumptionReductionPerLevel : 0.03;
    const cap = Number.isFinite(game.wellConsumptionReductionCap) ? game.wellConsumptionReductionCap : 0.5;
    const reduction = Math.min(cap, level * perLevel);
    return 1 - reduction;
}

export function getMarketplaceCost() {
    const woodBase = Number.isFinite(gameState.costs.marketplaceWoodCost) ? gameState.costs.marketplaceWoodCost : 250;
    const stoneBase = Number.isFinite(gameState.costs.marketplaceStoneCost) ? gameState.costs.marketplaceStoneCost : 250;
    const level = Number.isFinite(game.marketplace) ? game.marketplace : 0;
    const scale = Number.isFinite(game.marketplaceCostScalePerBuilt) ? game.marketplaceCostScalePerBuilt : 0.2;
    const multiplier = Math.pow(1 + scale, level) * getDoctrineBuildingCostMultiplier();
    return { wood: Math.ceil(woodBase * multiplier), stone: Math.ceil(stoneBase * multiplier) };
}

export function getMarketplaceTradeCost() {
    const woodBase = Number.isFinite(gameState.costs.marketplaceTradeWoodCost) ? gameState.costs.marketplaceTradeWoodCost : 150;
    const stoneBase = Number.isFinite(gameState.costs.marketplaceTradeStoneCost) ? gameState.costs.marketplaceTradeStoneCost : 150;
    const trades = Number.isFinite(game.marketplaceTradesCompleted) ? game.marketplaceTradesCompleted : 0;
    const growthRate = Number.isFinite(game.marketplaceTradeCostGrowthRate) && game.marketplaceTradeCostGrowthRate > 1
        ? game.marketplaceTradeCostGrowthRate
        : 1.15;
    const scale = Math.pow(growthRate, trades);
    return { wood: Math.ceil(woodBase * scale), stone: Math.ceil(stoneBase * scale) };
}

export function getMarketplaceTradeFaithYield() {
    const level = Number.isFinite(game.marketplace) ? game.marketplace : 0;
    const base = Number.isFinite(game.marketplaceTradeFaithBase) ? game.marketplaceTradeFaithBase : 40;
    const perLevel = Number.isFinite(game.marketplaceTradeFaithPerLevel) ? game.marketplaceTradeFaithPerLevel : 6;
    return Math.floor(base + level * perLevel);
}

export function getMonumentCost() {
    const faithBase = Number.isFinite(gameState.costs.monumentFaithCost) ? gameState.costs.monumentFaithCost : 4000;
    const woodBase = Number.isFinite(gameState.costs.monumentWoodCost) ? gameState.costs.monumentWoodCost : 1500;
    const stoneBase = Number.isFinite(gameState.costs.monumentStoneCost) ? gameState.costs.monumentStoneCost : 1500;
    const level = Number.isFinite(game.monument) ? game.monument : 0;
    const scale = Number.isFinite(game.monumentCostScalePerBuilt) ? game.monumentCostScalePerBuilt : 0.25;
    const doctrineMultiplier = getDoctrineBuildingCostMultiplier();
    const multiplier = Math.pow(1 + scale, level) * doctrineMultiplier;
    return {
        faith: Math.ceil(faithBase * multiplier),
        wood: Math.ceil(woodBase * multiplier),
        stone: Math.ceil(stoneBase * multiplier)
    };
}

export function getMonumentFaithPerFollowerMultiplier() {
    const level = Number.isFinite(game.monument) ? game.monument : 0;
    const perLevel = Number.isFinite(game.monumentFaithPerFollowerBonusPerLevel) ? game.monumentFaithPerFollowerBonusPerLevel : 0.05;
    return 1 + level * perLevel;
}

export function canUnlockMonument() {
    const requirement = Number.isFinite(game.monumentUnlockSettlementTier) ? game.monumentUnlockSettlementTier : 3;
    const tier = Number.isFinite(game.settlementTier) ? game.settlementTier : 0;
    return tier >= requirement;
}

// --- Foreign Settlement trade economy ---

export function getSettlementTradeCostMultiplier(settlement) {
    const trades = Number.isFinite(settlement?.tradesCompleted) ? settlement.tradesCompleted : 0;
    const baseGrowth = Number.isFinite(game.settlementTradeCostGrowthRate) ? game.settlementTradeCostGrowthRate - 1 : 0.12;
    const marketplaceLevel = Number.isFinite(game.marketplace) ? game.marketplace : 0;
    const efficiencyPerLevel = Number.isFinite(game.marketplaceCaravanEfficiencyPerLevel) ? game.marketplaceCaravanEfficiencyPerLevel : 0.004;
    // Marketplace levels make your caravans more efficient, flattening how
    // quickly repeated trades with the same settlement grow expensive.
    const effectiveGrowth = Math.max(0.01, baseGrowth - marketplaceLevel * efficiencyPerLevel);
    return Math.pow(1 + effectiveGrowth, trades);
}

export function getSettlementReputationDiscount(settlement) {
    const tier = getSettlementReputationTier(settlement?.reputation);
    const perTier = Number.isFinite(game.settlementReputationDiscountPerTier) ? game.settlementReputationDiscountPerTier : 0.06;
    return Math.max(0.4, 1 - tier * perTier);
}

export function getSettlementReputationBonus(settlement) {
    const tier = getSettlementReputationTier(settlement?.reputation);
    const perTier = Number.isFinite(game.settlementReputationDiscountPerTier) ? game.settlementReputationDiscountPerTier : 0.06;
    return 1 + tier * perTier;
}

export function getSettlementBuyResourceCost(settlement) {
    const base = Number.isFinite(gameState.costs.settlementBuyResourceFaithCost) ? gameState.costs.settlementBuyResourceFaithCost : 30;
    return Math.ceil(base * getSettlementTradeCostMultiplier(settlement) * getSettlementReputationDiscount(settlement));
}

export function getSettlementSellResourceYield(settlement) {
    const base = Number.isFinite(gameState.costs.settlementSellResourceFaithYield) ? gameState.costs.settlementSellResourceFaithYield : 25;
    return Math.max(1, Math.floor(base * getSettlementReputationBonus(settlement) / getSettlementTradeCostMultiplier(settlement)));
}

export function getSettlementBuyGoodCost(settlement) {
    const base = Number.isFinite(gameState.costs.settlementBuyGoodFaithCost) ? gameState.costs.settlementBuyGoodFaithCost : 250;
    return Math.ceil(base * getSettlementTradeCostMultiplier(settlement) * getSettlementReputationDiscount(settlement));
}

export function getIncenseFaithMultiplier() {
    const count = Number.isFinite(gameState.progression.goods?.incense) ? gameState.progression.goods.incense : 0;
    const perUnit = Number.isFinite(game.incenseFaithBonusPerUnit) ? game.incenseFaithBonusPerUnit : 0.01;
    return 1 + count * perUnit;
}

export function getSilkCapacityMultiplier() {
    const count = Number.isFinite(gameState.progression.goods?.silk) ? gameState.progression.goods.silk : 0;
    const perUnit = Number.isFinite(game.silkCapacityBonusPerUnit) ? game.silkCapacityBonusPerUnit : 0.005;
    return 1 + count * perUnit;
}

export function getIronConquestRollBonus() {
    const count = Number.isFinite(gameState.progression.goods?.iron) ? gameState.progression.goods.iron : 0;
    const perUnit = Number.isFinite(game.ironConquestRollBonusPerUnit) ? game.ironConquestRollBonusPerUnit : 0.5;
    return count * perUnit;
}

export function getConquestRollBonus() {
    return getBarracksConquerRollBonus() + getIronConquestRollBonus();
}

export function getHirePilgrimsCost() {
    const base = Number.isFinite(gameState.costs.hirePilgrimsBaseFaithCost) ? gameState.costs.hirePilgrimsBaseFaithCost : 500;
    const purchased = Number.isFinite(game.hirePilgrimsPurchased) ? game.hirePilgrimsPurchased : 0;
    const growth = Number.isFinite(game.hirePilgrimsCostGrowthRate) && game.hirePilgrimsCostGrowthRate > 1 ? game.hirePilgrimsCostGrowthRate : 1.2;
    return Math.ceil(base * Math.pow(growth, purchased));
}

export function getHungerStarvationDrainMultiplier() {
    if (game.doctrineChoices?.sacrifice === 'leanYears' && Number.isFinite(game.leanYearsStarvationMultiplier)) {
        return game.leanYearsStarvationMultiplier;
    }
    return 1;
}

export function getDoctrineBuildingCostMultiplier() {
    if (isDoctrineChosen('forge', 'stonemasons') && Number.isFinite(game.stonemasonsCostMultiplier)) {
        return game.stonemasonsCostMultiplier;
    }
    return 1;
}

export function getManualActionYieldMultiplier() {
    if (isDoctrineChosen('pilgrimage', 'zealousHands') && Number.isFinite(game.zealousHandsYieldMultiplier)) {
        return game.zealousHandsYieldMultiplier;
    }
    return 1;
}

export function getQuietFaithFollowerMultiplier() {
    if (isDoctrineChosen('pilgrimage', 'quietFaith') && Number.isFinite(game.quietFaithFollowerMultiplier)) {
        return game.quietFaithFollowerMultiplier;
    }
    return 1;
}

export function getActiveWorld() {
    if (!game.activeWorldId || !Array.isArray(game.worlds)) return null;
    return game.worlds.find((world) => world.id === game.activeWorldId) || null;
}

export function getResolvedHomeVillageCount() {
    const villages = Array.isArray(game.exploration?.villages) ? game.exploration.villages : [];
    return villages.filter((village) => village.resolutionType).length;
}

export function canUnlockWorlds() {
    if (game.worldsUnlocked) return true;

    const capacityReq = Number.isFinite(game.worldsUnlockFollowerCapacityRequirement) ? game.worldsUnlockFollowerCapacityRequirement : 500;
    const villagesReq = Number.isFinite(game.worldsUnlockVillagesResolvedRequirement) ? game.worldsUnlockVillagesResolvedRequirement : 5;
    const metersReq = Number.isFinite(game.worldsUnlockMetersExploredRequirement) ? game.worldsUnlockMetersExploredRequirement : 3000;
    const metersExplored = Number.isFinite(game.exploration?.totalMetersExplored) ? game.exploration.totalMetersExplored : 0;
    const doctrinesComplete = game.doctrineChoices ? Object.values(game.doctrineChoices).every(Boolean) : false;

    return getMaxFollowers() >= capacityReq
        && getResolvedHomeVillageCount() >= villagesReq
        && metersExplored >= metersReq
        && doctrinesComplete
        && hasProphetAssigned();
}

export function getWorldTierCostMultiplier(tier) {
    const step = Number.isFinite(game.worldTierCostMultiplierStep) ? game.worldTierCostMultiplierStep : 0.25;
    return 1 + step * Math.max(0, (tier || 1) - 1);
}

export function getWorldExpeditionRollFaithCost(world) {
    const base = Number.isFinite(gameState.costs.worldExpeditionRollFaithBaseCost) ? gameState.costs.worldExpeditionRollFaithBaseCost : 60;
    return Math.max(1, Math.floor(base * getWorldTierCostMultiplier(world?.tier)));
}

export function getWorldSermonFaithCost(world) {
    const base = Number.isFinite(gameState.costs.worldSermonFaithBaseCost) ? gameState.costs.worldSermonFaithBaseCost : 8;
    return Math.max(0, Math.floor(base * getWorldTierCostMultiplier(world?.tier)));
}

export function getWorldConquerFaithCost(world) {
    const base = Number.isFinite(gameState.costs.worldConquerFaithBaseCost) ? gameState.costs.worldConquerFaithBaseCost : 15;
    return Math.max(0, Math.floor(base * getWorldTierCostMultiplier(world?.tier)));
}

export function getChartNewWorldCost(nextTier) {
    const starlightBase = Number.isFinite(gameState.costs.chartWorldStarlightBaseCost) ? gameState.costs.chartWorldStarlightBaseCost : 500;
    const faithBase = Number.isFinite(gameState.costs.chartWorldFaithBaseCost) ? gameState.costs.chartWorldFaithBaseCost : 2000;
    return {
        starlight: Math.max(0, Math.floor(starlightBase * nextTier)),
        faith: Math.max(0, Math.floor(faithBase * nextTier))
    };
}

export function getWorldChartRequirement(tier) {
    const base = Number.isFinite(game.worldVillagesResolvedToChartBase) ? game.worldVillagesResolvedToChartBase : 1;
    // Capped one below the villageCount cap in config/worlds.js's getWorldTierTuning
    // (min(8, 2+tier)) so the requirement can never exceed how many villages a
    // world actually has, no matter how high the tier climbs.
    return Math.min(7, base + (tier || 1));
}

export function getWorldDominationScore(world) {
    if (!world) return 0;
    const villages = Array.isArray(world.villages) ? world.villages : [];
    const resolvedPercent = villages.length
        ? (villages.filter((village) => village.resolutionType).length / villages.length) * 100
        : 0;
    const discoveredAreas = Array.isArray(world.wildAreas) ? world.wildAreas.filter((area) => area.discovered) : [];
    const collectedPercent = discoveredAreas.length
        ? (discoveredAreas.filter((area) => !area.resourceCache || area.resourceCache.collected).length / discoveredAreas.length) * 100
        : 100;
    return (resolvedPercent + collectedPercent) / 2;
}

export function getDomainsClaimed() {
    let count = game.worldsUnlocked ? 1 : 0;
    if (Array.isArray(game.worlds)) {
        count += game.worlds.filter((world) => world.frozen && Number.isFinite(world.finalDominationScore) && world.finalDominationScore >= 80).length;
    }
    return count;
}

export function getUniverseConquestTier() {
    return resolveUniverseConquestTier(getDomainsClaimed());
}

export function canAscendNow() {
    return getUniverseConquestTier().id === 'universe';
}

export function getEchoesOfDivinityPreview() {
    const tierInfo = getUniverseConquestTier();
    const tierBonus = tierInfo.id === 'universe' ? 50 + 25 * tierInfo.pantheonRank : 0;
    return Math.floor((5 * tierInfo.domainsClaimed + tierBonus) * getHelFavorEchoesMultiplier());
}

export function getAscensionUpgradeRank(upgradeId) {
    const ranks = game.ascension?.upgradeRanks;
    return Number.isFinite(ranks?.[upgradeId]) ? ranks[upgradeId] : 0;
}

export function getAscensionFaithMultiplier() {
    return 1 + 0.05 * getAscensionUpgradeRank('echoingFaith');
}

export function getAscensionEarlyCostMultiplier() {
    return Math.max(0.5, 1 - 0.03 * getAscensionUpgradeRank('swiftFoundations'));
}

export function getAscensionWorldHeadstartMultiplier() {
    return 0.05 * getAscensionUpgradeRank('starlitMemory');
}

export function getAscensionHazardMultiplier() {
    return Math.max(0.2, 1 - 0.04 * getAscensionUpgradeRank('undyingFlock'));
}

export function getTrainingUnlockFaithCost() {
    const base = Number.isFinite(gameState.costs.trainingTechCost) ? gameState.costs.trainingTechCost : 50;
    return Math.max(0, Math.floor(base * getAscensionEarlyCostMultiplier()));
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