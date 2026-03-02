export const ROLE_DEFINITIONS = [
    {
        id: 'hunters',
        label: 'Hunters',
        trainCostKey: 'hunterBaseCost',
        unlockCostKey: 'unlockHuntersFaithCost',
        trainButtonId: 'trainHuntersBtn',
        unlockButtonId: 'unlockHuntersBtn',
        roleValueId: 'huntersRoleValue'
    },
    {
        id: 'ritualists',
        label: 'Ritualists',
        trainCostKey: 'ritualistBaseCost',
        unlockCostKey: 'unlockRitualistsFaithCost',
        trainButtonId: 'trainRitualistsBtn',
        unlockButtonId: 'unlockRitualistsBtn',
        roleValueId: 'ritualistsRoleValue'
    },
    {
        id: 'gatherers',
        label: 'Gatherers',
        trainCostKey: 'gathererBaseCost',
        unlockCostKey: 'unlockGatherersFaithCost',
        trainButtonId: 'trainGatherersBtn',
        unlockButtonId: 'unlockGatherersBtn',
        roleValueId: 'gatherersRoleValue'
    },
    {
        id: 'cooks',
        label: 'Cooks',
        trainCostKey: 'cookBaseCost',
        unlockCostKey: 'unlockCooksFaithCost',
        trainButtonId: 'trainCooksBtn',
        unlockButtonId: 'unlockCooksBtn',
        roleValueId: 'cooksRoleValue'
    }
];

export const ROLE_DEFINITION_BY_ID = ROLE_DEFINITIONS.reduce((map, role) => {
    map[role.id] = role;
    return map;
}, {});