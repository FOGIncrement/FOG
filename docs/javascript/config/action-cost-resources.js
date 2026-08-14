// Maps each action id (from config/action-definitions.js) to the resource
// stat containers it should highlight on hover, so the player can see at a
// glance which parts of their economy a button will draw from. IDs here are
// the container element ids in index.html (faithContainer, woodContainer,
// stoneContainer, foodContainer, starlightContainer, echoesContainer).
export const ACTION_COST_RESOURCES = {
    pray: [],
    gatherWood: ['faithContainer'],
    gatherStone: ['faithContainer'],
    gatherFood: ['faithContainer'],
    preach: ['faithContainer'],
    rollPreachD4: ['faithContainer'],
    cancelPreachRoll: [],
    convertFollower: ['faithContainer'],
    offerToTheVeil: ['faithContainer'],

    startExpedition: [],
    rollExpedition: ['faithContainer'],
    rollExpeditionD6: ['faithContainer'],
    cancelExpeditionRoll: [],
    cancelExpedition: [],
    expandExpeditionParty: ['faithContainer'],
    trainExpeditionScouts: ['faithContainer'],

    buildRitualCircle: ['faithContainer'],
    buildShelter: ['woodContainer', 'stoneContainer'],
    buildAltar: ['woodContainer', 'stoneContainer', 'faithContainer'],
    buildStorehouse: ['faithContainer'],
    buildGranary: ['woodContainer', 'stoneContainer'],
    buildScriptorium: ['faithContainer'],

    feedFollowers: ['foodContainer'],
    holdFeast: ['foodContainer'],

    training: ['faithContainer'],
    unlockHuntersRole: ['faithContainer'],
    unlockRitualistsRole: ['faithContainer'],
    unlockGatherersRole: ['faithContainer'],
    unlockCooksRole: ['faithContainer'],
    unlockFarmersRole: ['faithContainer'],
    unlockScribesRole: ['faithContainer'],
    unlockProphetRole: ['faithContainer'],
    unlockExploration: ['faithContainer'],
    unlockShelterUpgrade: ['faithContainer'],
    unlockAltar: ['faithContainer'],
    trainZealousPreaching: ['faithContainer'],
    blessTheHarvest: ['faithContainer', 'woodContainer', 'stoneContainer'],
    conveneCouncil: ['faithContainer'],
    unlockWorlds: ['faithContainer'],

    chooseShepherdsCreed: [],
    chooseIronFist: [],
    chooseHomestead: [],
    chooseWanderlust: [],
    chooseAbundantTable: [],
    chooseLeanYears: [],
    buildTempleHelios: ['faithContainer', 'woodContainer', 'stoneContainer'],
    buildTempleSekhmet: ['faithContainer', 'woodContainer', 'stoneContainer'],
    buildTempleDanu: ['faithContainer', 'woodContainer', 'stoneContainer'],
    buildTempleHel: ['faithContainer', 'woodContainer', 'stoneContainer'],

    startWorldExpedition: [],
    resolveWorldExpedition: ['faithContainer'],
    cancelWorldExpedition: [],
    chartNewWorld: ['starlightContainer', 'faithContainer'],

    ascend: [],
    buyEchoingFaith: ['echoesContainer'],
    buySwiftFoundations: ['echoesContainer'],
    buyStarlitMemory: ['echoesContainer'],
    buyUndyingFlock: ['echoesContainer'],

    trainHunters: ['faithContainer'],
    trainRitualists: ['faithContainer'],
    trainGatherers: ['faithContainer'],
    trainCooks: ['faithContainer'],
    trainFarmers: ['faithContainer'],
    trainScribes: ['faithContainer'],
    trainProphet: ['faithContainer']
};

// Dynamically-rendered card buttons (village sermon/conquer, wild-area
// collect) aren't in ACTION_DEFINITIONS — matched by class name instead.
export const CARD_ACTION_COST_RESOURCES = {
    'village-sermon-btn': ['faithContainer'],
    'village-conquer-btn': ['faithContainer'],
    'wild-area-collect-btn': []
};
