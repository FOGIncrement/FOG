export const UNIVERSE_CONQUEST_TIERS = [
    { id: 'world', label: 'World', threshold: 0 },
    { id: 'system', label: 'System', threshold: 3 },
    { id: 'galaxy', label: 'Galaxy', threshold: 8 },
    { id: 'universe', label: 'Universe', threshold: 20 }
];

export const PANTHEON_RANK_STEP = 15;

export function resolveUniverseConquestTier(domainsClaimed) {
    let resolved = UNIVERSE_CONQUEST_TIERS[0];
    UNIVERSE_CONQUEST_TIERS.forEach((tier) => {
        if (domainsClaimed >= tier.threshold) resolved = tier;
    });

    const pantheonRank = resolved.id === 'universe'
        ? Math.max(0, Math.floor((domainsClaimed - resolved.threshold) / PANTHEON_RANK_STEP))
        : 0;

    return {
        id: resolved.id,
        label: pantheonRank > 0 ? `${resolved.label} (Pantheon Rank ${pantheonRank})` : resolved.label,
        pantheonRank,
        domainsClaimed
    };
}

export function getNextUniverseConquestTier(domainsClaimed) {
    return UNIVERSE_CONQUEST_TIERS.find((tier) => domainsClaimed < tier.threshold) || null;
}
