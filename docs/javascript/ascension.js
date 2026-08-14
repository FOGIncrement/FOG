import { gameState, game } from './classes/GameState.js';
import { addLog } from './utils/logging.js';
import { saveGame } from './utils/persistence.js';
import { updateUI } from './ui.js';
import { getUpgradeCost, canAscendNow, getEchoesOfDivinityPreview } from './utils/helpers.js';
import { ASCENSION_UPGRADE_BY_ID } from './config/ascension.js';
import { createRoleCountMap, createRoleUnlockMap, createRoleAccumulatorMap } from './config/roles.js';
import { createFactionFavorMap } from './config/factions.js';
import { createFavorTierClaimedMap } from './config/favor-tiers.js';
import { createGoodsCountMap } from './config/trade-settlements.js';

function buyAscensionUpgrade(upgradeId) {
    const upgrade = ASCENSION_UPGRADE_BY_ID[upgradeId];
    if (!upgrade) return;

    const rank = Number.isFinite(game.ascension?.upgradeRanks?.[upgradeId]) ? game.ascension.upgradeRanks[upgradeId] : 0;
    const maxRank = Number.isFinite(game.upgradeMaxPurchases) ? game.upgradeMaxPurchases : 10;
    if (rank >= maxRank) return;

    const baseCost = Number.isFinite(gameState.costs[upgrade.baseCostKey]) ? gameState.costs[upgrade.baseCostKey] : 10;
    const cost = getUpgradeCost(baseCost, rank);
    if (!game.ascension || game.ascension.echoesOfDivinity < cost) return;

    game.ascension.echoesOfDivinity -= cost;
    game.ascension.upgradeRanks[upgradeId] = rank + 1;

    addLog(`${upgrade.label} deepens (rank ${rank + 1}/${maxRank}).`);
    updateUI();
    saveGame();
}

function resetResource(resource, defaultGatherCost) {
    if (!resource) return;
    resource.amount = 0;
    resource.gatherCost = defaultGatherCost;
}

function performAscensionReset(echoesGained) {
    gameState.progression.followers = 0;
    gameState.progression.roles = createRoleCountMap(0);
    ['hunters', 'ritualists', 'gatherers', 'cooks', 'prophet'].forEach((roleId) => {
        gameState.progression[roleId] = 0;
    });
    gameState.progression.faith = 0;
    gameState.progression.faithPerFollower = 0.02;
    gameState.progression.prophetSway = 12;
    gameState.progression.starlight = 0;

    resetResource(gameState.resources.wood, 8);
    resetResource(gameState.resources.stone, 8);
    resetResource(gameState.resources.food, 5);

    gameState.runtime.roleAccumulators = createRoleAccumulatorMap(0);
    gameState.runtime.autoSaveAccumulator = 0;

    game.ritualCircleBuilt = 0;
    game.shelter = 0;
    game.shelterBtnUnlocked = false;
    game.shelterUpgradeUnlocked = false;
    game.altarUnlocked = false;
    game.altarBuilt = false;
    game.hungerPercent = 100;
    game.hungerVisible = false;
    game.lastHungerWarning = null;
    game.trainingUnlocked = false;
    game.roleUnlocks = createRoleUnlockMap(false);
    game.unlocksTabUnlocked = false;
    game.hasGatheredFood = false;
    game.diceBonuses = { preach: 0 };
    game.prophetUnlocked = false;
    game.explorationUnlocked = false;
    game.zealousPreachingPurchases = 0;
    game.danuBlessingUnlocked = false;

    // Alignment/Favor are the lived behavior of this incarnation — they reset.
    // Doctrine choices are the echo of who the cult was — they persist forever.
    game.alignment = 0;
    game.alignmentVisible = false;
    game.factionFavor = createFactionFavorMap(0);
    game.doctrinesUnlocked = false;

    game.temple = { built: false, godId: null };

    // Every physical building resets each incarnation — only Doctrines,
    // Temple's covenant memory, and Ascension upgrades carry forward.
    game.storehouse = 0;
    game.granary = 0;
    game.scriptorium = 0;
    game.settlementTier = 0;
    game.watchtower = 0;
    game.barracks = 0;
    game.well = 0;
    game.marketplace = 0;
    game.marketplaceTradesCompleted = 0;
    game.monument = 0;

    // Favor-tier "seen" high-water marks reset alongside factionFavor itself,
    // so tier-unlock log messages fire again as favor is rebuilt from zero.
    game.factionFavorTiersSeen = createFavorTierClaimedMap(0);

    // Only wipe Home exploration's *progress* fields — tuning/rate constants
    // (hazard chances, loot ranges, seed counts) are simulation config, not
    // progress, and ensureWildAreaSeeds() regenerates discoveredAreas from
    // them automatically the next time exploration state is touched.
    if (game.exploration) {
        game.exploration.activeExpedition = null;
        game.exploration.totalMetersExplored = 0;
        game.exploration.wildAreaSeedInitialized = false;
        game.exploration.discoveredAreas = [];
        game.exploration.nextAreaIndex = 1;
        game.exploration.partyExpansionPurchases = 0;
        game.exploration.expeditionTrainingPurchases = 0;
        game.exploration.followerSendLimit = 10;
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
        game.exploration.nextVillageIndex = 2;
        game.exploration.settlements = [];
        game.exploration.nextSettlementIndex = 1;
    }

    // Foreign Settlements, reputation, and traded Goods are this incarnation's
    // relationships and stockpile - they reset with everything else. Marketplace
    // itself already reset to 0 above, closing the loop back to level 0 caravans.
    gameState.progression.goods = createGoodsCountMap(0);
    game.hirePilgrimsPurchased = 0;

    game.worldsUnlocked = false;
    game.activeWorldId = null;
    game.worlds = [];
    game.nextWorldIndex = 1;

    game.ascension.echoesOfDivinity += echoesGained;
    game.ascension.totalAscensions += 1;

    game.seenItems = {};
    game.newItems = { actions: 0, build: 0, food: 0, unlocks: 0, followerManager: 0 };

    addLog(`Ascension complete. ${echoesGained} Echoes of Divinity flow into your next incarnation.`);
}

export function buyEchoingFaith() { buyAscensionUpgrade('echoingFaith'); }
export function buySwiftFoundations() { buyAscensionUpgrade('swiftFoundations'); }
export function buyStarlitMemory() { buyAscensionUpgrade('starlitMemory'); }
export function buyUndyingFlock() { buyAscensionUpgrade('undyingFlock'); }

export function ascend() {
    if (!canAscendNow()) return;

    const preview = getEchoesOfDivinityPreview();
    const confirmed = window.confirm(
        `Ascend now?\n\nThis permanently resets your followers, buildings, resources, and all worlds.\n\n` +
        `You will keep your Doctrines and gain ${preview} Echoes of Divinity.\n\nThis cannot be undone.`
    );
    if (!confirmed) return;

    performAscensionReset(preview);
    updateUI();
    saveGame();
}
