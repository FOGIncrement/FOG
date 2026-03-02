export const BUILDING_DEFINITIONS = [
    {
        id: 'ritualCircle',
        label: 'Ritual Circle',
        buttonId: 'buildRitualCircleBtn',
        levelKey: 'ritualCircleBuilt',
        maxLevel: 1,
        faithCostKey: 'ritualBtnCost'
    },
    {
        id: 'shelter',
        label: 'Shelter',
        buttonId: 'buildShelterBtn',
        levelKey: 'shelter',
        maxLevel: Infinity,
        resourceCostKeys: {
            wood: 'shelterWoodCost',
            stone: 'shelterStoneCost'
        }
    }
];