// Foreign Settlements: independent trade partners discovered via the same
// infinite exploration frontier as wild areas, never "resolved" or removed
// like Villages - they persist forever as ongoing trade relationships.
export const SETTLEMENT_SPECIALTIES = [
    { id: 'woodland', name: 'Woodland Enclave', resource: 'wood', resourceLabel: 'Wood', goodId: 'incense' },
    { id: 'quarry', name: 'Quarry Hold', resource: 'stone', resourceLabel: 'Stone', goodId: 'silk' },
    { id: 'fisher', name: 'Fisher Cove', resource: 'food', resourceLabel: 'Food', goodId: 'iron' }
];

export const SETTLEMENT_SPECIALTY_BY_ID = SETTLEMENT_SPECIALTIES.reduce((map, specialty) => {
    map[specialty.id] = specialty;
    return map;
}, {});

// Trade Goods: tradeable-only items you can never produce at home, each a
// small permanent stacking bonus - the reason to trade at all beyond simple
// resource conversion.
export const TRADE_GOODS = {
    incense: {
        id: 'incense',
        name: 'Incense',
        description: 'Sweetens every prayer. Permanently boosts faith income.'
    },
    silk: {
        id: 'silk',
        name: 'Silk',
        description: 'Fine cloth that draws pilgrims from afar. Permanently boosts follower capacity.'
    },
    iron: {
        id: 'iron',
        name: 'Iron',
        description: "Tools and blades. Permanently boosts your raiding parties' effectiveness."
    }
};

export function createGoodsCountMap(initialValue = 0) {
    return Object.keys(TRADE_GOODS).reduce((map, goodId) => {
        map[goodId] = initialValue;
        return map;
    }, {});
}

// Per-settlement reputation tiers (mirrors config/favor-tiers.js's shape) -
// each tier crossed with a given settlement cheapens/enriches trades there.
export const SETTLEMENT_REPUTATION_TIER_THRESHOLDS = [10, 25, 50, 100, 200];

export function getSettlementReputationTier(reputation) {
    const value = Number.isFinite(reputation) ? reputation : 0;
    let count = 0;
    SETTLEMENT_REPUTATION_TIER_THRESHOLDS.forEach((threshold) => {
        if (value >= threshold) count += 1;
    });
    return count;
}

export function getNextSettlementReputationThreshold(reputation) {
    const tier = getSettlementReputationTier(reputation);
    return tier < SETTLEMENT_REPUTATION_TIER_THRESHOLDS.length
        ? SETTLEMENT_REPUTATION_TIER_THRESHOLDS[tier]
        : null;
}
