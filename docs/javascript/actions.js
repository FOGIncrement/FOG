import { gameState, game } from './classes/GameState.js';
import { addLog } from './utils/logging.js';
import { saveGame } from './utils/persistence.js';
import { updateUI } from './ui.js';
import { getExpeditionFollowerLimit, getMaxFollowers, getNextVillageDistance, getRoleCount, hasProphetAssigned, setRoleCount } from './utils/helpers.js';
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

    const shouldSpawn = Math.random() < 0.2;
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

function maybeDiscoverArea(exploration, rollTotal) {
    const chance = Math.min(0.55, Math.max(0.05, (rollTotal - 3) * 0.05));
    if (Math.random() > chance) return;

    const areaId = `wild-area-${exploration.nextAreaIndex}`;
    const meters = Number.isFinite(exploration.totalMetersExplored) ? Math.floor(exploration.totalMetersExplored) : 0;
    exploration.discoveredAreas.push({
        id: areaId,
        name: `Wild Area ${exploration.nextAreaIndex}`,
        discoveredAtMeters: meters
    });
    exploration.nextAreaIndex += 1;
    addLog(`The expedition discovered ${areaId.replace('-', ' ')} while scouting.`);
}

function processExpeditionHazard(expedition) {
    const hazardRoll = Math.random();
    const alive = Math.max(0, Math.floor(expedition.followersAlive));
    if (alive <= 0) return { casualties: 0, ended: true, prophetDied: false };

    if (hazardRoll < 0.08) {
        const prophetDied = Boolean(expedition.includesProphet);
        const casualties = alive;
        expedition.followersAlive = 0;
        addLog(`Followers encountered a bear and were all slaughtered (-${casualties}).`);
        return { casualties, ended: true, prophetDied };
    }

    if (hazardRoll < 0.25) {
        const casualties = Math.max(1, Math.floor(alive * 0.5));
        expedition.followersAlive = Math.max(0, alive - casualties);
        const prophetDied = Boolean(expedition.includesProphet && Math.random() < 0.5);
        addLog(`Followers encountered a bear and half were slaughtered (-${casualties}).`);
        return { casualties, ended: expedition.followersAlive <= 0, prophetDied };
    }

    if (hazardRoll < 0.45) {
        const lossPercent = Math.floor(Math.random() * 41) + 20;
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

    addLog(`Expedition roll 1d6 + followers: ${baseRoll} + ${bonusFollowers} = ${totalRoll}. Progress: +${moved}m.`);

    maybeDiscoverArea(exploration, totalRoll);

    const targetVillage = exploration.villages.find((village) => village.id === expedition.targetVillageId);
    if (targetVillage && expedition.distanceCovered >= targetVillage.distanceFromCamp) {
        targetVillage.discovered = true;
        targetVillage.prophetPresent = Boolean(expedition.includesProphet && expedition.prophetAlive);
        const metersGained = targetVillage.distanceFromCamp;
        exploration.totalMetersExplored = Math.max(exploration.totalMetersExplored, metersGained);
        addLog(`The expedition has reached ${targetVillage.name}. It now appears in Discovered Areas.`);
        maybeCreateNewVillage(exploration);
        finishExpedition(expedition, `Expedition complete. ${Math.max(1, expedition.followersAlive)} followers arrived at ${targetVillage.name}.`);
    } else {
        exploration.totalMetersExplored = Math.max(
            exploration.totalMetersExplored,
            Math.floor(expedition.distanceCovered)
        );
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

    const woodCostKey = shelterDefinition.resourceCostKeys.wood;
    const stoneCostKey = shelterDefinition.resourceCostKeys.stone;

    if (
        gameState.resources.wood.amount >= gameState.costs[woodCostKey] &&
        gameState.resources.stone.amount >= gameState.costs[stoneCostKey]
    ) {
        gameState.resources.wood.spend(gameState.costs[woodCostKey]);
        gameState.resources.stone.spend(gameState.costs[stoneCostKey]);
        game[shelterDefinition.levelKey] += 1;

        gameState.costs[woodCostKey] = Math.floor(gameState.costs[woodCostKey] * 1.8);
        gameState.costs[stoneCostKey] = Math.floor(gameState.costs[stoneCostKey] * 1.8);

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

    const maxSelectable = Math.min(limit, gameState.progression.followers);
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
