// Favor is no longer a number that just sits there once a Temple is built:
// crossing each threshold permanently grants a slice of a god-flavored
// bonus, forever, automatically. No spending, no menu — just growing favor.
// Deliberately import-free (like config/doctrines.js, config/ascension.js)
// so both utils/helpers.js AND config/roles.js can use it without creating
// a circular import between them.
export const FAVOR_TIER_THRESHOLDS = [50, 150, 350, 750, 1500, 3000, 6000, 12000];

export function getFavorTierCount(godId, game) {
    const favor = Number.isFinite(game.factionFavor?.[godId]) ? game.factionFavor[godId] : 0;
    let count = 0;
    FAVOR_TIER_THRESHOLDS.forEach((threshold) => {
        if (favor >= threshold) count += 1;
    });
    return count;
}

export function getNextFavorTierThreshold(godId, game) {
    const count = getFavorTierCount(godId, game);
    return count < FAVOR_TIER_THRESHOLDS.length ? FAVOR_TIER_THRESHOLDS[count] : null;
}

const FAVOR_GOD_IDS = ['helios', 'hel', 'danu', 'sekhmet'];

// Tracks how many tiers per god the player has already been notified about,
// purely so reload doesn't re-announce tiers crossed in a previous session.
// The bonuses themselves are always derived fresh from current favor - this
// map never gates them, it only gates the one-time log message.
export function createFavorTierClaimedMap(initialValue = 0) {
    return FAVOR_GOD_IDS.reduce((map, godId) => {
        map[godId] = initialValue;
        return map;
    }, {});
}

export const FAVOR_GOD_DESCRIPTIONS = {
    helios: 'Every tier of Helios favor cheapens Preach and Convert, and widens your capacity.',
    sekhmet: 'Every tier of Sekhmet favor sharpens your raids and steels your expeditions.',
    danu: "Every tier of Danu favor deepens the land's abundance and your stores.",
    hel: 'Every tier of Hel favor loosens hunger and thins the veil between worlds.'
};
