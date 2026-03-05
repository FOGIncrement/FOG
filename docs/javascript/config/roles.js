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
            scaling: (count) => count,
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
            scaling: (count) => count,
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
            scaling: (count) => count,
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