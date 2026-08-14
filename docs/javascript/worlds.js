import { gameState, game } from './classes/GameState.js';
import { addLog } from './utils/logging.js';
import { saveGame } from './utils/persistence.js';
import { updateUI } from './ui.js';
import {
    getUnassignedFollowers,
    hasProphetAssigned,
    getMaxFollowers,
    getActiveWorld,
    canUnlockWorlds,
    getWorldExpeditionRollFaithCost,
    getWorldSermonFaithCost,
    getWorldConquerFaithCost,
    getChartNewWorldCost,
    getWorldChartRequirement,
    getWorldDominationScore,
    getExpeditionRollBonus,
    getAscensionHazardMultiplier,
    getAscensionWorldHeadstartMultiplier,
    getConquerYieldMultiplier,
    getSekhmetFavorHazardMultiplier,
    getHelFavorStarlightMultiplier
} from './utils/helpers.js';
import { createWorld } from './config/worlds.js';
import { removeFollowersFromSettlement } from './actions.js';

function randomIntInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function syncWorldDiscoveries(world) {
    world.wildAreas.forEach((area) => {
        if (!area.discovered && area.distanceFromCamp <= world.totalMetersExplored) {
            area.discovered = true;
            addLog(`Discovered ${area.name} on ${world.name}.`);
        }
    });
}

function getNextUndiscoveredWorldVillage(world) {
    return world.villages
        .slice()
        .sort((left, right) => left.distanceFromCamp - right.distanceFromCamp)
        .find((village) => !village.discovered) || null;
}

export function unlockWorlds() {
    if (game.worldsUnlocked) return;
    if (!canUnlockWorlds()) return;

    const cost = Number.isFinite(gameState.costs.unlockWorldsFaithCost) ? gameState.costs.unlockWorldsFaithCost : 5000;
    if (gameState.progression.faith < cost) return;

    gameState.progression.faith -= cost;

    if (!Number.isFinite(game.nextWorldIndex) || game.nextWorldIndex < 1) game.nextWorldIndex = 1;
    const worldId = `world-${game.nextWorldIndex}`;
    const world = createWorld(1, worldId, { headstartFraction: 0 });

    if (!Array.isArray(game.worlds)) game.worlds = [];
    game.worlds.push(world);
    game.nextWorldIndex += 1;
    game.activeWorldId = world.id;
    game.worldsUnlocked = true;

    addLog(`The veil between worlds thins. ${world.name} awaits beyond the stars.`);
    updateUI();
    saveGame();
}

export function startWorldExpedition() {
    const world = getActiveWorld();
    if (!world || world.frozen || world.activeExpedition) return;
    if (game.exploration?.activeExpedition) return;

    const inputEl = document.getElementById('worldExpeditionFollowersInput');
    const includeProphetEl = document.getElementById('includeProphetWorldCheckbox');
    const hasProphet = hasProphetAssigned();
    const includeProphet = Boolean(hasProphet && includeProphetEl?.checked);

    const unassignedFollowers = getUnassignedFollowers();
    if (unassignedFollowers <= 0) {
        addLog('No unassigned followers available for a world expedition.');
        return;
    }

    const limit = Number.isFinite(game.exploration?.followerSendLimit) ? game.exploration.followerSendLimit : 10;
    let followersToSend = inputEl ? parseInt(inputEl.value, 10) : 1;
    if (!Number.isFinite(followersToSend)) followersToSend = 1;
    followersToSend = Math.max(1, Math.min(Math.min(limit, unassignedFollowers), followersToSend));

    const targetVillage = getNextUndiscoveredWorldVillage(world);
    if (!targetVillage) {
        addLog(`No undiscovered settlements remain on ${world.name}.`);
        return;
    }

    world.activeExpedition = {
        followersSent: followersToSend,
        followersAlive: followersToSend,
        distanceCovered: 0,
        targetVillageId: targetVillage.id,
        includesProphet: includeProphet,
        prophetAlive: includeProphet
    };

    addLog(`${followersToSend} followers set out across ${world.name} toward ${targetVillage.name}.`);
    updateUI();
    saveGame();
}

function processWorldHazard(world, expedition) {
    const alive = Math.max(0, Math.floor(expedition.followersAlive));
    if (alive <= 0) return { casualties: 0, ended: true, prophetDied: false };

    const scale = (Number.isFinite(world.hazardScale) ? world.hazardScale : 1) * getAscensionHazardMultiplier() * getSekhmetFavorHazardMultiplier();
    const homeExploration = game.exploration || {};
    const wipeoutThreshold = (Number.isFinite(homeExploration.hazardWipeoutChance) ? homeExploration.hazardWipeoutChance : 0.08) * scale;
    const heavyLossThreshold = wipeoutThreshold + (Number.isFinite(homeExploration.hazardHeavyLossChance) ? homeExploration.hazardHeavyLossChance : 0.17) * scale;
    const ambushThreshold = heavyLossThreshold + (Number.isFinite(homeExploration.hazardAmbushChance) ? homeExploration.hazardAmbushChance : 0.20) * scale;

    const roll = Math.random();

    if (roll < wipeoutThreshold) {
        const prophetDied = Boolean(expedition.includesProphet);
        const casualties = alive;
        expedition.followersAlive = 0;
        addLog(`The expedition on ${world.name} was lost entirely to the void (-${casualties}).`);
        return { casualties, ended: true, prophetDied };
    }

    if (roll < heavyLossThreshold) {
        const casualties = Math.max(1, Math.floor(alive * 0.5));
        expedition.followersAlive = Math.max(0, alive - casualties);
        // The Prophet always dies last: only a total wipeout (the branch above)
        // can claim them. A partial loss, however severe, never touches them.
        const prophetDied = false;
        addLog(`A cosmic horror struck the expedition on ${world.name} (-${casualties}).`);
        return { casualties, ended: expedition.followersAlive <= 0, prophetDied };
    }

    if (roll < ambushThreshold) {
        const lossPercent = randomIntInRange(20, 60);
        const casualties = Math.max(1, Math.floor(alive * (lossPercent / 100)));
        expedition.followersAlive = Math.max(0, alive - casualties);
        const prophetDied = false;
        addLog(`The expedition on ${world.name} was ambushed, losing ${lossPercent}% of its party (-${casualties}).`);
        return { casualties, ended: expedition.followersAlive <= 0, prophetDied };
    }

    return { casualties: 0, ended: false, prophetDied: false };
}

export function resolveWorldExpedition() {
    const world = getActiveWorld();
    if (!world || !world.activeExpedition) return;

    const rollCost = getWorldExpeditionRollFaithCost(world);
    if (gameState.progression.faith < rollCost) {
        addLog(`Need ${rollCost} faith to push the world expedition forward.`);
        updateUI();
        return;
    }
    gameState.progression.faith -= rollCost;

    const expedition = world.activeExpedition;
    const hazard = processWorldHazard(world, expedition);
    if (hazard.casualties > 0) {
        removeFollowersFromSettlement(hazard.casualties, hazard.prophetDied);
        if (hazard.prophetDied) expedition.prophetAlive = false;
    }

    if (hazard.ended || expedition.followersAlive <= 0) {
        addLog(`The expedition on ${world.name} was wiped out before reaching its destination.`);
        world.activeExpedition = null;
        updateUI();
        saveGame();
        return;
    }

    const baseRoll = randomIntInRange(1, 6);
    const bonusFollowers = Math.max(0, Math.floor(expedition.followersSent));
    const wanderlustBonus = getExpeditionRollBonus();
    const moved = Math.max(1, baseRoll + bonusFollowers + wanderlustBonus);

    expedition.distanceCovered += moved;
    world.totalMetersExplored = Math.max(0, Math.floor(world.totalMetersExplored + moved));
    syncWorldDiscoveries(world);

    addLog(`World expedition roll: ${baseRoll} + ${bonusFollowers}${wanderlustBonus > 0 ? ` + ${wanderlustBonus} (Wanderlust)` : ''} = ${moved}. Progress: +${moved}m on ${world.name}.`);

    const targetVillage = world.villages.find((village) => village.id === expedition.targetVillageId);
    if (targetVillage && expedition.distanceCovered >= targetVillage.distanceFromCamp) {
        targetVillage.discovered = true;
        targetVillage.prophetPresent = Boolean(expedition.includesProphet && expedition.prophetAlive);
        addLog(`The expedition has reached ${targetVillage.name}.`);
        world.activeExpedition = null;
    }

    updateUI();
    saveGame();
}

export function cancelWorldExpedition() {
    const world = getActiveWorld();
    if (!world || !world.activeExpedition) return;
    world.activeExpedition = null;
    addLog(`The expedition on ${world.name} was recalled.`);
    updateUI();
    saveGame();
}

export function holdWorldVillageSermon(villageId) {
    const world = getActiveWorld();
    if (!world) return;
    const village = world.villages.find((candidate) => candidate.id === villageId && candidate.discovered);
    if (!village || village.resolutionType) return;
    if (!village.prophetPresent) return;

    const cost = getWorldSermonFaithCost(world);
    if (gameState.progression.faith < cost) return;
    gameState.progression.faith -= cost;

    village.sermonsHeld += 1;
    const swayGain = randomIntInRange(8, 18);
    village.convertedPercent = Math.min(100, village.convertedPercent + swayGain);

    game.factionFavor[world.favorAlignment] += 2;
    game.alignment = Math.max(-100, Math.min(100, game.alignment + 1));
    if (!game.alignmentVisible) game.alignmentVisible = true;

    if (village.convertedPercent >= 100) {
        village.resolutionType = 'converted';
        addLog(`${village.name} converts fully to your faith. An outpost is founded among the stars.`);
    } else {
        addLog(`Sermon held at ${village.name}: converted ${village.convertedPercent}%.`);
    }

    updateUI();
    saveGame();
}

export function conquerWorldVillage(villageId) {
    const world = getActiveWorld();
    if (!world) return;
    const village = world.villages.find((candidate) => candidate.id === villageId && candidate.discovered);
    if (!village || village.resolutionType) return;

    const cost = getWorldConquerFaithCost(world);
    if (gameState.progression.faith < cost) {
        addLog(`Need ${cost} faith to launch a raid on ${village.name}.`);
        return;
    }
    gameState.progression.faith -= cost;

    const hunterForce = Number.isFinite(gameState.progression.roles?.hunters) ? gameState.progression.roles.hunters : 0;
    const forceBonus = Math.max(0, Math.floor((hunterForce - village.resistance) / 10));
    const roll = randomIntInRange(1, 20) + forceBonus;
    const conquerScale = Math.max(0.05, Math.min(1, roll / 20));
    const yieldMultiplier = getConquerYieldMultiplier();

    const baseFollowerYield = Math.max(1, Math.floor(village.population * 0.35 * 3 * conquerScale * yieldMultiplier / 100));
    const max = getMaxFollowers();
    const capacity = Math.max(0, max - gameState.progression.followers);
    const grantedFollowers = Math.min(baseFollowerYield, capacity);
    if (grantedFollowers > 0) gameState.progression.followers += grantedFollowers;

    const tuning = { min: 80, max: 220 };
    const starlightLoot = Math.floor(randomIntInRange(tuning.min, tuning.max) * Math.pow(1.4, world.tier - 1) * conquerScale * yieldMultiplier * getHelFavorStarlightMultiplier());
    gameState.progression.starlight += starlightLoot;

    village.resolutionType = 'conquered';
    village.convertedPercent = 0;

    game.factionFavor[world.favorAlignment] += 2;
    game.alignment = Math.max(-100, Math.min(100, game.alignment - 1));
    if (!game.alignmentVisible) game.alignmentVisible = true;

    addLog(`Raid on ${village.name}: roll ${roll} vs resistance ${village.resistance}. +${grantedFollowers} followers, +${starlightLoot} starlight.`);

    updateUI();
    saveGame();
}

export function collectWorldWildAreaResources(areaId) {
    const world = getActiveWorld();
    if (!world) return;
    const area = world.wildAreas.find((candidate) => candidate.id === areaId && candidate.discovered);
    if (!area) return;

    const cache = area.resourceCache;
    if (!cache || cache.collected) return;

    const baseStarlight = Number.isFinite(cache.starlight) ? Math.max(0, Math.floor(cache.starlight)) : 0;
    const starlight = Math.floor(baseStarlight * getHelFavorStarlightMultiplier());
    if (starlight > 0) gameState.progression.starlight += starlight;
    cache.collected = true;

    addLog(`Recovered ${starlight} starlight from ${area.name}.`);
    updateUI();
    saveGame();
}

export function chartNewWorld() {
    const world = getActiveWorld();
    if (!world || world.frozen) return;
    if (world.activeExpedition) return;

    const resolvedCount = world.villages.filter((village) => village.resolutionType).length;
    const requirement = getWorldChartRequirement(world.tier);
    if (resolvedCount < requirement) return;

    const nextTier = world.tier + 1;
    const cost = getChartNewWorldCost(nextTier);
    if (gameState.progression.starlight < cost.starlight || gameState.progression.faith < cost.faith) return;

    gameState.progression.starlight -= cost.starlight;
    gameState.progression.faith -= cost.faith;

    world.frozen = true;
    world.finalDominationScore = getWorldDominationScore(world);

    const headstartFraction = getAscensionWorldHeadstartMultiplier();
    const nextWorldId = `world-${game.nextWorldIndex}`;
    const nextWorld = createWorld(nextTier, nextWorldId, { headstartFraction });
    game.worlds.push(nextWorld);
    game.nextWorldIndex += 1;
    game.activeWorldId = nextWorld.id;

    addLog(`${world.name} is claimed (${Math.round(world.finalDominationScore)}% dominion). The stars open onto ${nextWorld.name}.`);

    updateUI();
    saveGame();
}
