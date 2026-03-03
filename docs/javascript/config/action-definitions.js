export const ACTION_GROUPS = {
    actions: [
        { id: 'pray', buttonId: 'prayBtn', handlerExport: 'pray', tab: 'actions', category: 'core' },
        { id: 'gatherWood', buttonId: 'gatherWoodBtn', handlerExport: 'gatherWood', tab: 'actions', category: 'gather' },
        { id: 'gatherStone', buttonId: 'gatherStoneBtn', handlerExport: 'gatherStone', tab: 'actions', category: 'gather' },
        { id: 'gatherFood', buttonId: 'gatherFoodBtn', handlerExport: 'gatherFood', tab: 'actions', category: 'gather' },
        { id: 'preach', buttonId: 'preachBtn', handlerExport: 'preach', tab: 'actions', category: 'conversion' },
        { id: 'rollPreachD4', buttonId: 'preachRollBtn', handlerExport: 'rollPreachD4', tab: 'actions', category: 'conversion' },
        { id: 'cancelPreachRoll', buttonId: 'preachCancelBtn', handlerExport: 'cancelPreachRoll', tab: 'actions', category: 'conversion' },
        { id: 'convertFollower', buttonId: 'convertBtn', handlerExport: 'convertFollower', tab: 'actions', category: 'conversion' }
    ],
    build: [
        { id: 'buildRitualCircle', buttonId: 'buildRitualCircleBtn', handlerExport: 'buildRitualCircle', tab: 'build', category: 'building' },
        { id: 'buildShelter', buttonId: 'buildShelterBtn', handlerExport: 'buildShelter', tab: 'build', category: 'building' },
        { id: 'buildAltar', buttonId: 'buildAltarBtn', handlerExport: 'buildAltar', tab: 'build', category: 'building' }
    ],
    food: [
        { id: 'feedFollowers', buttonId: 'feedFollowersBtn', handlerExport: 'feedFollowers', tab: 'food', category: 'food' }
    ],
    unlocks: [
        { id: 'training', buttonId: 'trainingTechBtn', handlerExport: 'training', tab: 'unlocks', category: 'progression' },
        { id: 'unlockHuntersRole', buttonId: 'unlockHuntersBtn', handlerExport: 'unlockHuntersRole', tab: 'unlocks', category: 'roles' },
        { id: 'unlockRitualistsRole', buttonId: 'unlockRitualistsBtn', handlerExport: 'unlockRitualistsRole', tab: 'unlocks', category: 'roles' },
        { id: 'unlockGatherersRole', buttonId: 'unlockGatherersBtn', handlerExport: 'unlockGatherersRole', tab: 'unlocks', category: 'roles' },
        { id: 'unlockCooksRole', buttonId: 'unlockCooksBtn', handlerExport: 'unlockCooksRole', tab: 'unlocks', category: 'roles' },
        { id: 'unlockShelterUpgrade', buttonId: 'unlockShelterUpgradeBtn', handlerExport: 'unlockShelterUpgrade', tab: 'unlocks', category: 'buildingUpgrade' },
        { id: 'unlockAltar', buttonId: 'unlockAltarBtn', handlerExport: 'unlockAltar', tab: 'unlocks', category: 'buildingUpgrade' }
    ],
    followerManager: [
        { id: 'trainHunters', buttonId: 'trainHuntersBtn', handlerExport: 'trainHunters', tab: 'followerManager', category: 'roles' },
        { id: 'trainRitualists', buttonId: 'trainRitualistsBtn', handlerExport: 'trainRitualists', tab: 'followerManager', category: 'roles' },
        { id: 'trainGatherers', buttonId: 'trainGatherersBtn', handlerExport: 'trainGatherers', tab: 'followerManager', category: 'roles' },
        { id: 'trainCooks', buttonId: 'trainCooksBtn', handlerExport: 'trainCooks', tab: 'followerManager', category: 'roles' }
    ]
};

export const ACTION_TAB_ORDER = ['actions', 'build', 'food', 'unlocks', 'followerManager'];

export const ACTION_DEFINITIONS = Object.values(ACTION_GROUPS).flat();