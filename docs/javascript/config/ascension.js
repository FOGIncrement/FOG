export const ASCENSION_UPGRADES = [
    {
        id: 'echoingFaith',
        label: 'Echoing Faith',
        summary: 'Permanently increases faith income from every follower.',
        baseCostKey: 'echoingFaithBaseEchoesCost',
        effectPerRank: 0.05
    },
    {
        id: 'swiftFoundations',
        label: 'Swift Foundations',
        summary: 'Permanently reduces early Ritual Circle, Training, and Shelter costs.',
        baseCostKey: 'swiftFoundationsBaseEchoesCost',
        effectPerRank: 0.03
    },
    {
        id: 'starlitMemory',
        label: 'Starlit Memory',
        summary: 'Every newly charted world begins partially explored.',
        baseCostKey: 'starlitMemoryBaseEchoesCost',
        effectPerRank: 0.05
    },
    {
        id: 'undyingFlock',
        label: 'Undying Flock',
        summary: 'Permanently reduces expedition hazard severity, on Home and every World.',
        baseCostKey: 'undyingFlockBaseEchoesCost',
        effectPerRank: 0.04
    }
];

export const ASCENSION_UPGRADE_BY_ID = ASCENSION_UPGRADES.reduce((map, upgrade) => {
    map[upgrade.id] = upgrade;
    return map;
}, {});

export function createAscensionUpgradeRankMap(initialValue = 0) {
    return ASCENSION_UPGRADES.reduce((map, upgrade) => {
        map[upgrade.id] = initialValue;
        return map;
    }, {});
}

export const ASCENSION_TITLES = [
    { minAscensions: 0, title: 'Prophet' },
    { minAscensions: 1, title: 'Reborn Prophet' },
    { minAscensions: 3, title: 'Voice of the Pantheon' },
    { minAscensions: 7, title: 'Deathless Shepherd' },
    { minAscensions: 15, title: 'Godhead Ascendant' },
    { minAscensions: 30, title: 'Architect of Worlds' }
];

export function getAscensionTitle(totalAscensions) {
    let resolved = ASCENSION_TITLES[0];
    ASCENSION_TITLES.forEach((entry) => {
        if (totalAscensions >= entry.minAscensions) resolved = entry;
    });
    return resolved.title;
}
