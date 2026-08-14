export const TEMPLE_OPTIONS = [
    {
        godId: 'helios',
        label: 'Temple of Helios',
        summary: 'A sunlit spire draws multitudes to your light.',
        effectLabel: 'Max follower capacity +50%',
        alignmentDirection: 1
    },
    {
        godId: 'sekhmet',
        label: 'Temple of Sekhmet',
        summary: 'A blood-red ziggurat sharpens every blade you send to war.',
        effectLabel: 'Conquer yield +75%',
        alignmentDirection: -1
    },
    {
        godId: 'danu',
        label: 'Temple of Danu',
        summary: "The Earth Mother's grove makes every hand's work bear double fruit.",
        effectLabel: 'Hunter/Gatherer/Ritualist output +50%',
        alignmentDirection: 1
    },
    {
        godId: 'hel',
        label: 'Temple of Hel',
        summary: 'A veiled sanctum feeds your people from beyond hunger itself.',
        effectLabel: 'Follower food consumption -90%',
        alignmentDirection: -1
    }
];

export const TEMPLE_OPTION_BY_GOD = TEMPLE_OPTIONS.reduce((map, option) => {
    map[option.godId] = option;
    return map;
}, {});
