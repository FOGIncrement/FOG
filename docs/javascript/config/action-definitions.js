export const ACTION_GROUPS = {
    actions: [
        { id: 'pray', buttonId: 'prayBtn', handlerExport: 'pray', tab: 'actions', category: 'core' },
        { id: 'gatherWood', buttonId: 'gatherWoodBtn', handlerExport: 'gatherWood', tab: 'actions', category: 'gather' },
        { id: 'gatherStone', buttonId: 'gatherStoneBtn', handlerExport: 'gatherStone', tab: 'actions', category: 'gather' },
        { id: 'gatherFood', buttonId: 'gatherFoodBtn', handlerExport: 'gatherFood', tab: 'actions', category: 'gather' },
        { id: 'preach', buttonId: 'preachBtn', handlerExport: 'preach', tab: 'actions', category: 'conversion' },
        { id: 'rollPreachD4', buttonId: 'preachRollBtn', handlerExport: 'rollPreachD4', tab: 'actions', category: 'conversion' },
        { id: 'cancelPreachRoll', buttonId: 'preachCancelBtn', handlerExport: 'cancelPreachRoll', tab: 'actions', category: 'conversion' },
        { id: 'convertFollower', buttonId: 'convertBtn', handlerExport: 'convertFollower', tab: 'actions', category: 'conversion' },
        { id: 'offerToTheVeil', buttonId: 'helOfferingBtn', handlerExport: 'offerToTheVeil', tab: 'actions', category: 'sacrifice' }
    ],
    explore: [
        { id: 'startExpedition', buttonId: 'startExpeditionBtn', handlerExport: 'startExpedition', tab: 'explore', category: 'expedition' },
        { id: 'rollExpedition', buttonId: 'rollExpeditionBtn', handlerExport: 'rollExpedition', tab: 'explore', category: 'expedition' },
        { id: 'rollExpeditionD6', buttonId: 'expeditionRollNowBtn', handlerExport: 'rollExpeditionD6', tab: 'explore', category: 'expedition' },
        { id: 'cancelExpeditionRoll', buttonId: 'expeditionCancelRollBtn', handlerExport: 'cancelExpeditionRoll', tab: 'explore', category: 'expedition' },
        { id: 'cancelExpedition', buttonId: 'cancelExpeditionBtn', handlerExport: 'cancelExpedition', tab: 'explore', category: 'expedition' },
        { id: 'expandExpeditionParty', buttonId: 'expandPartyBtn', handlerExport: 'expandExpeditionParty', tab: 'explore', category: 'upgrade' },
        { id: 'trainExpeditionScouts', buttonId: 'expeditionTrainingBtn', handlerExport: 'trainExpeditionScouts', tab: 'explore', category: 'upgrade' }
    ],
    build: [
        { id: 'buildRitualCircle', buttonId: 'buildRitualCircleBtn', handlerExport: 'buildRitualCircle', tab: 'build', category: 'building' },
        { id: 'buildShelter', buttonId: 'buildShelterBtn', handlerExport: 'buildShelter', tab: 'build', category: 'building' },
        { id: 'buildAltar', buttonId: 'buildAltarBtn', handlerExport: 'buildAltar', tab: 'build', category: 'building' },
        { id: 'advanceSettlementTier', buttonId: 'advanceSettlementTierBtn', handlerExport: 'advanceSettlementTier', tab: 'build', category: 'building' },
        { id: 'buildStorehouse', buttonId: 'buildStorehouseBtn', handlerExport: 'buildStorehouse', tab: 'build', category: 'building' },
        { id: 'buildGranary', buttonId: 'buildGranaryBtn', handlerExport: 'buildGranary', tab: 'build', category: 'building' },
        { id: 'buildScriptorium', buttonId: 'buildScriptoriumBtn', handlerExport: 'buildScriptorium', tab: 'build', category: 'building' },
        { id: 'buildWatchtower', buttonId: 'buildWatchtowerBtn', handlerExport: 'buildWatchtower', tab: 'build', category: 'building' },
        { id: 'buildBarracks', buttonId: 'buildBarracksBtn', handlerExport: 'buildBarracks', tab: 'build', category: 'building' },
        { id: 'buildWell', buttonId: 'buildWellBtn', handlerExport: 'buildWell', tab: 'build', category: 'building' },
        { id: 'buildMarketplace', buttonId: 'buildMarketplaceBtn', handlerExport: 'buildMarketplace', tab: 'build', category: 'building' },
        { id: 'tradeAtMarketplace', buttonId: 'tradeAtMarketplaceBtn', handlerExport: 'tradeAtMarketplace', tab: 'build', category: 'building' },
        { id: 'buildMonument', buttonId: 'buildMonumentBtn', handlerExport: 'buildMonument', tab: 'build', category: 'building' }
    ],
    food: [
        { id: 'feedFollowers', buttonId: 'feedFollowersBtn', handlerExport: 'feedFollowers', tab: 'food', category: 'food' },
        { id: 'holdFeast', buttonId: 'holdFeastBtn', handlerExport: 'holdFeast', tab: 'food', category: 'food' }
    ],
    unlocks: [
        { id: 'training', buttonId: 'trainingTechBtn', handlerExport: 'training', tab: 'unlocks', category: 'progression' },
        { id: 'unlockHuntersRole', buttonId: 'unlockHuntersBtn', handlerExport: 'unlockHuntersRole', tab: 'unlocks', category: 'roles' },
        { id: 'unlockRitualistsRole', buttonId: 'unlockRitualistsBtn', handlerExport: 'unlockRitualistsRole', tab: 'unlocks', category: 'roles' },
        { id: 'unlockGatherersRole', buttonId: 'unlockGatherersBtn', handlerExport: 'unlockGatherersRole', tab: 'unlocks', category: 'roles' },
        { id: 'unlockCooksRole', buttonId: 'unlockCooksBtn', handlerExport: 'unlockCooksRole', tab: 'unlocks', category: 'roles' },
        { id: 'unlockFarmersRole', buttonId: 'unlockFarmersBtn', handlerExport: 'unlockFarmersRole', tab: 'unlocks', category: 'roles' },
        { id: 'unlockScribesRole', buttonId: 'unlockScribesBtn', handlerExport: 'unlockScribesRole', tab: 'unlocks', category: 'roles' },
        { id: 'unlockProphetRole', buttonId: 'unlockProphetBtn', handlerExport: 'unlockProphetRole', tab: 'unlocks', category: 'roles' },
        { id: 'unlockExploration', buttonId: 'unlockExplorationBtn', handlerExport: 'unlockExploration', tab: 'unlocks', category: 'progression' },
        { id: 'unlockShelterUpgrade', buttonId: 'unlockShelterUpgradeBtn', handlerExport: 'unlockShelterUpgrade', tab: 'unlocks', category: 'buildingUpgrade' },
        { id: 'unlockAltar', buttonId: 'unlockAltarBtn', handlerExport: 'unlockAltar', tab: 'unlocks', category: 'buildingUpgrade' },
        { id: 'trainZealousPreaching', buttonId: 'zealousPreachingBtn', handlerExport: 'trainZealousPreaching', tab: 'unlocks', category: 'upgrade' },
        { id: 'blessTheHarvest', buttonId: 'blessHarvestBtn', handlerExport: 'blessTheHarvest', tab: 'unlocks', category: 'buildingUpgrade' },
        { id: 'conveneCouncil', buttonId: 'conveneCouncilBtn', handlerExport: 'conveneCouncil', tab: 'unlocks', category: 'buildingUpgrade' },
        { id: 'unlockWorlds', buttonId: 'unlockWorldsBtn', handlerExport: 'unlockWorlds', tab: 'unlocks', category: 'progression' }
    ],
    doctrines: [
        { id: 'chooseShepherdsCreed', buttonId: 'chooseShepherdsCreedBtn', handlerExport: 'chooseShepherdsCreed', tab: 'doctrines', category: 'flock' },
        { id: 'chooseIronFist', buttonId: 'chooseIronFistBtn', handlerExport: 'chooseIronFist', tab: 'doctrines', category: 'flock' },
        { id: 'chooseHomestead', buttonId: 'chooseHomesteadBtn', handlerExport: 'chooseHomestead', tab: 'doctrines', category: 'hearth' },
        { id: 'chooseWanderlust', buttonId: 'chooseWanderlustBtn', handlerExport: 'chooseWanderlust', tab: 'doctrines', category: 'hearth' },
        { id: 'chooseAbundantTable', buttonId: 'chooseAbundantTableBtn', handlerExport: 'chooseAbundantTable', tab: 'doctrines', category: 'sacrifice' },
        { id: 'chooseLeanYears', buttonId: 'chooseLeanYearsBtn', handlerExport: 'chooseLeanYears', tab: 'doctrines', category: 'sacrifice' },
        { id: 'chooseStonemasons', buttonId: 'chooseStonemasonsBtn', handlerExport: 'chooseStonemasons', tab: 'doctrines', category: 'forge' },
        { id: 'chooseQuarryRush', buttonId: 'chooseQuarryRushBtn', handlerExport: 'chooseQuarryRush', tab: 'doctrines', category: 'forge' },
        { id: 'chooseZealousHands', buttonId: 'chooseZealousHandsBtn', handlerExport: 'chooseZealousHands', tab: 'doctrines', category: 'pilgrimage' },
        { id: 'chooseQuietFaith', buttonId: 'chooseQuietFaithBtn', handlerExport: 'chooseQuietFaith', tab: 'doctrines', category: 'pilgrimage' },
        { id: 'buildTempleHelios', buttonId: 'buildTempleHeliosBtn', handlerExport: 'buildTempleHelios', tab: 'doctrines', category: 'temple' },
        { id: 'buildTempleSekhmet', buttonId: 'buildTempleSekhmetBtn', handlerExport: 'buildTempleSekhmet', tab: 'doctrines', category: 'temple' },
        { id: 'buildTempleDanu', buttonId: 'buildTempleDanuBtn', handlerExport: 'buildTempleDanu', tab: 'doctrines', category: 'temple' },
        { id: 'buildTempleHel', buttonId: 'buildTempleHelBtn', handlerExport: 'buildTempleHel', tab: 'doctrines', category: 'temple' }
    ],
    worlds: [
        { id: 'startWorldExpedition', buttonId: 'startWorldExpeditionBtn', handlerExport: 'startWorldExpedition', tab: 'worlds', category: 'expedition' },
        { id: 'resolveWorldExpedition', buttonId: 'resolveWorldExpeditionBtn', handlerExport: 'resolveWorldExpedition', tab: 'worlds', category: 'expedition' },
        { id: 'cancelWorldExpedition', buttonId: 'cancelWorldExpeditionBtn', handlerExport: 'cancelWorldExpedition', tab: 'worlds', category: 'expedition' },
        { id: 'chartNewWorld', buttonId: 'chartNewWorldBtn', handlerExport: 'chartNewWorld', tab: 'worlds', category: 'progression' }
    ],
    ascension: [
        { id: 'ascend', buttonId: 'ascendBtn', handlerExport: 'ascend', tab: 'ascension', category: 'reset' },
        { id: 'buyEchoingFaith', buttonId: 'buyEchoingFaithBtn', handlerExport: 'buyEchoingFaith', tab: 'ascension', category: 'upgrade' },
        { id: 'buySwiftFoundations', buttonId: 'buySwiftFoundationsBtn', handlerExport: 'buySwiftFoundations', tab: 'ascension', category: 'upgrade' },
        { id: 'buyStarlitMemory', buttonId: 'buyStarlitMemoryBtn', handlerExport: 'buyStarlitMemory', tab: 'ascension', category: 'upgrade' },
        { id: 'buyUndyingFlock', buttonId: 'buyUndyingFlockBtn', handlerExport: 'buyUndyingFlock', tab: 'ascension', category: 'upgrade' }
    ],
    followerManager: [
        { id: 'trainHunters', buttonId: 'trainHuntersBtn', handlerExport: 'trainHunters', tab: 'followerManager', category: 'roles' },
        { id: 'trainRitualists', buttonId: 'trainRitualistsBtn', handlerExport: 'trainRitualists', tab: 'followerManager', category: 'roles' },
        { id: 'trainGatherers', buttonId: 'trainGatherersBtn', handlerExport: 'trainGatherers', tab: 'followerManager', category: 'roles' },
        { id: 'trainCooks', buttonId: 'trainCooksBtn', handlerExport: 'trainCooks', tab: 'followerManager', category: 'roles' },
        { id: 'trainFarmers', buttonId: 'trainFarmersBtn', handlerExport: 'trainFarmers', tab: 'followerManager', category: 'roles' },
        { id: 'trainScribes', buttonId: 'trainScribesBtn', handlerExport: 'trainScribes', tab: 'followerManager', category: 'roles' },
        { id: 'trainProphet', buttonId: 'trainProphetBtn', handlerExport: 'trainProphet', tab: 'followerManager', category: 'roles' }
    ]
};

export const ACTION_TAB_ORDER = ['actions', 'explore', 'build', 'food', 'unlocks', 'doctrines', 'worlds', 'ascension', 'followerManager'];

export const ACTION_DEFINITIONS = Object.values(ACTION_GROUPS).flat();