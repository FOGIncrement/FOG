export const DOCTRINE_GROUPS = [
    {
        id: 'flock',
        label: 'Doctrine of the Flock',
        framing: 'How do you grow your following — through compassion, or conquest?',
        options: [
            {
                id: 'shepherdsCreed',
                label: "Shepherd's Creed",
                summary: 'Preach and Convert Follower cost less faith.',
                alignmentDelta: 5,
                favorFaction: 'helios',
                favorAmount: 10
            },
            {
                id: 'ironFist',
                label: 'Iron Fist',
                summary: 'Conquer yields more followers and loot, and costs less faith.',
                alignmentDelta: -5,
                favorFaction: 'sekhmet',
                favorAmount: 10
            }
        ]
    },
    {
        id: 'hearth',
        label: 'Doctrine of the Hearth',
        framing: 'Do your people thrive by tending the land, or by venturing beyond it?',
        options: [
            {
                id: 'homestead',
                label: 'Homestead',
                summary: 'Hunters, Gatherers, and Ritualists produce more.',
                alignmentDelta: 0,
                favorFaction: null,
                favorAmount: 0
            },
            {
                id: 'wanderlust',
                label: 'Wanderlust',
                summary: 'Expedition rolls gain a flat bonus and cost less faith.',
                alignmentDelta: 0,
                favorFaction: null,
                favorAmount: 0
            }
        ]
    },
    {
        id: 'sacrifice',
        label: 'Doctrine of Sacrifice',
        framing: 'When food runs short, how much can your people bear?',
        options: [
            {
                id: 'abundantTable',
                label: 'Abundant Table',
                summary: 'Reduces follower food consumption.',
                alignmentDelta: 5,
                favorFaction: 'danu',
                favorAmount: 10
            },
            {
                id: 'leanYears',
                label: 'Lean Years',
                summary: 'Reduces food consumption even more — but starvation hits far harder if food ever runs out.',
                alignmentDelta: -5,
                favorFaction: 'hel',
                favorAmount: 10
            }
        ]
    },
    {
        id: 'forge',
        label: 'Doctrine of the Forge',
        framing: 'Do your artisans build to last, or does your quarry work double-time?',
        options: [
            {
                id: 'stonemasons',
                label: 'Stonemasons',
                summary: 'Watchtower, Barracks, Well, Marketplace, and Monument cost less wood and stone to build.',
                alignmentDelta: 0,
                favorFaction: null,
                favorAmount: 0
            },
            {
                id: 'quarryRush',
                label: 'Quarry Rush',
                summary: 'Gatherers produce significantly more wood and stone.',
                alignmentDelta: 0,
                favorFaction: null,
                favorAmount: 0
            }
        ]
    },
    {
        id: 'pilgrimage',
        label: 'Doctrine of the Pilgrimage',
        framing: 'Is your faith proven by tireless devotion, or by patient trust in providence?',
        options: [
            {
                id: 'zealousHands',
                label: 'Zealous Hands',
                summary: 'Manual Pray and Gather actions yield significantly more.',
                alignmentDelta: 0,
                favorFaction: null,
                favorAmount: 0
            },
            {
                id: 'quietFaith',
                label: 'Quiet Faith',
                summary: 'Followers and Ritualists generate faith passively at a higher rate.',
                alignmentDelta: 0,
                favorFaction: null,
                favorAmount: 0
            }
        ]
    }
];

export const DOCTRINE_GROUP_BY_ID = DOCTRINE_GROUPS.reduce((map, group) => {
    map[group.id] = group;
    return map;
}, {});

export function createDoctrineChoiceMap(initialValue = null) {
    return DOCTRINE_GROUPS.reduce((map, group) => {
        map[group.id] = initialValue;
        return map;
    }, {});
}
