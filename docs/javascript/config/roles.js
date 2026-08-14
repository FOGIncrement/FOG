import { getFavorTierCount } from './favor-tiers.js';

const ABUNDANCE_ROLE_IDS = ['hunters', 'gatherers', 'farmers'];

export function getRoleOutputMultiplier(roleId, game) {
    let multiplier = 1;
    if (ABUNDANCE_ROLE_IDS.includes(roleId) && game.danuBlessingUnlocked && Number.isFinite(game.danuBlessingMultiplier)) {
        multiplier *= game.danuBlessingMultiplier;
    }
    if (ABUNDANCE_ROLE_IDS.includes(roleId)) {
        const danuTiers = getFavorTierCount('danu', game);
        if (danuTiers > 0) {
            const perTier = Number.isFinite(game.danuFavorOutputBonusPerTier) ? game.danuFavorOutputBonusPerTier : 0.06;
            multiplier *= 1 + danuTiers * perTier;
        }
    }
    if (
        (ABUNDANCE_ROLE_IDS.includes(roleId) || roleId === 'ritualists') &&
        game.doctrineChoices?.hearth === 'homestead' &&
        Number.isFinite(game.homesteadOutputMultiplier)
    ) {
        multiplier *= game.homesteadOutputMultiplier;
    }
    if (
        (ABUNDANCE_ROLE_IDS.includes(roleId) || roleId === 'ritualists') &&
        game.temple?.built && game.temple.godId === 'danu' &&
        Number.isFinite(game.templeDanuOutputMultiplier)
    ) {
        multiplier *= game.templeDanuOutputMultiplier;
    }
    if (roleId === 'ritualists' && Number.isFinite(game.scriptorium) && game.scriptorium > 0) {
        const perRank = Number.isFinite(game.scriptoriumOutputPerRank) ? game.scriptoriumOutputPerRank : 0.08;
        multiplier *= 1 + game.scriptorium * perRank;
    }
    if (roleId === 'gatherers' && game.doctrineChoices?.forge === 'quarryRush' && Number.isFinite(game.quarryRushOutputMultiplier)) {
        multiplier *= game.quarryRushOutputMultiplier;
    }
    if (roleId === 'ritualists' && game.doctrineChoices?.pilgrimage === 'quietFaith' && Number.isFinite(game.quietFaithRitualistMultiplier)) {
        multiplier *= game.quietFaithRitualistMultiplier;
    }
    return multiplier;
}

export const ROLE_DEFINITIONS = [
    {
        id: 'hunters',
        label: 'Hunters',
        trainCostKey: 'hunterBaseCost',
        unlockCostKey: 'unlockHuntersFaithCost',
        trainButtonId: 'trainHuntersBtn',
        unlockButtonId: 'unlockHuntersBtn',
        roleValueId: 'huntersRoleValue',
        simulation: {
            tickRate: 1,
            scaling: (count, gameState, game) => count * getRoleOutputMultiplier('hunters', game),
            outputs: [
                { target: 'resource', key: 'food', rateKey: 'hunterFoodPerSecond' }
            ]
        }
    },
    {
        id: 'ritualists',
        label: 'Ritualists',
        trainCostKey: 'ritualistBaseCost',
        unlockCostKey: 'unlockRitualistsFaithCost',
        trainButtonId: 'trainRitualistsBtn',
        unlockButtonId: 'unlockRitualistsBtn',
        roleValueId: 'ritualistsRoleValue',
        simulation: {
            tickRate: 1,
            scaling: (count, gameState, game) => count * getRoleOutputMultiplier('ritualists', game),
            outputs: [
                { target: 'progression', key: 'faith', rateKey: 'ritualistFaithPerSecond' }
            ]
        }
    },
    {
        id: 'gatherers',
        label: 'Gatherers',
        trainCostKey: 'gathererBaseCost',
        unlockCostKey: 'unlockGatherersFaithCost',
        trainButtonId: 'trainGatherersBtn',
        unlockButtonId: 'unlockGatherersBtn',
        roleValueId: 'gatherersRoleValue',
        simulation: {
            tickRate: 1,
            scaling: (count, gameState, game) => count * getRoleOutputMultiplier('gatherers', game),
            outputs: [
                { target: 'resource', key: 'wood', rateKey: 'gathererWoodPerSecond' },
                { target: 'resource', key: 'stone', rateKey: 'gathererStonePerSecond' }
            ]
        }
    },
    {
        id: 'prophet',
        label: 'Prophet',
        trainCostKey: 'prophetBaseCost',
        unlockCostKey: 'unlockProphetFaithCost',
        trainButtonId: 'trainProphetBtn',
        unlockButtonId: 'unlockProphetBtn',
        roleValueId: 'prophetRoleValue',
        maxAssignable: 1,
        swayStatKey: 'prophetSway',
        simulation: {
            tickRate: 1,
            scaling: (count) => count,
            outputs: []
        }
    },
    {
        id: 'cooks',
        label: 'Cooks',
        trainCostKey: 'cookBaseCost',
        unlockCostKey: 'unlockCooksFaithCost',
        trainButtonId: 'trainCooksBtn',
        unlockButtonId: 'unlockCooksBtn',
        roleValueId: 'cooksRoleValue',
        simulation: {
            tickRate: 1,
            scaling: (count) => count,
            outputs: []
        }
    },
    {
        id: 'farmers',
        label: 'Farmers',
        trainCostKey: 'farmerBaseCost',
        unlockCostKey: 'unlockFarmersFaithCost',
        trainButtonId: 'trainFarmersBtn',
        unlockButtonId: 'unlockFarmersBtn',
        roleValueId: 'farmersRoleValue',
        simulation: {
            tickRate: 1,
            scaling: (count, gameState, game) => count * getRoleOutputMultiplier('farmers', game),
            outputs: [
                { target: 'resource', key: 'food', rateKey: 'farmerFoodPerSecond' }
            ]
        }
    },
    {
        id: 'scribes',
        label: 'Scribes',
        trainCostKey: 'scribeBaseCost',
        unlockCostKey: 'unlockScribesFaithCost',
        trainButtonId: 'trainScribesBtn',
        unlockButtonId: 'unlockScribesBtn',
        roleValueId: 'scribesRoleValue',
        simulation: {
            tickRate: 1,
            scaling: (count) => count,
            outputs: []
        }
    }
];

export const ROLE_DEFINITION_BY_ID = ROLE_DEFINITIONS.reduce((map, role) => {
    map[role.id] = role;
    return map;
}, {});

export function createRoleCountMap(initialValue = 0) {
    return ROLE_DEFINITIONS.reduce((map, role) => {
        map[role.id] = initialValue;
        return map;
    }, {});
}

export function createRoleUnlockMap(initialValue = false) {
    return ROLE_DEFINITIONS.reduce((map, role) => {
        map[role.id] = initialValue;
        return map;
    }, {});
}

export function createRoleAccumulatorMap(initialValue = 0) {
    return ROLE_DEFINITIONS.reduce((map, role) => {
        map[role.id] = initialValue;
        return map;
    }, {});
}