export const FACTION_DEFINITIONS = [
    { id: 'helios', label: 'Helios' },
    { id: 'hel', label: 'Hel' },
    { id: 'danu', label: 'Danu' },
    { id: 'sekhmet', label: 'Sekhmet' }
];

export const FACTION_DEFINITION_BY_ID = FACTION_DEFINITIONS.reduce((map, faction) => {
    map[faction.id] = faction;
    return map;
}, {});

export function createFactionFavorMap(initialValue = 0) {
    return FACTION_DEFINITIONS.reduce((map, faction) => {
        map[faction.id] = initialValue;
        return map;
    }, {});
}
