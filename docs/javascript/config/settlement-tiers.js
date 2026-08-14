// Each tier is a one-time, sequential unlock (you cannot skip ahead) that
// multiplies max follower capacity. Multipliers compound: reaching tier N
// means every earlier tier's multiplier is already baked into capacity.
// This is the primary lever for reaching very large (eventually billions
// of) followers — Shelter/Shack alone were never meant to scale that far.
export const SETTLEMENT_TIERS = [
    {
        id: 1,
        name: 'Village',
        description: 'Formalize the camp into a true village.',
        followerRequirement: 50,
        faithCost: 300,
        woodCost: 200,
        stoneCost: 200,
        capacityMultiplier: 5
    },
    {
        id: 2,
        name: 'Town',
        description: 'Roads, wells, and a real town square.',
        followerRequirement: 300,
        faithCost: 1800,
        woodCost: 900,
        stoneCost: 900,
        capacityMultiplier: 8
    },
    {
        id: 3,
        name: 'City',
        description: 'Walls rise. The faithful flood in from every direction.',
        followerRequirement: 3000,
        faithCost: 8000,
        woodCost: 4000,
        stoneCost: 4000,
        capacityMultiplier: 15
    },
    {
        id: 4,
        name: 'Metropolis',
        description: 'A holy capital, worthy of your patron god.',
        followerRequirement: 30000,
        faithCost: 30000,
        woodCost: 15000,
        stoneCost: 15000,
        capacityMultiplier: 40,
        requiresTemple: true
    },
    {
        id: 5,
        name: 'Ecumenopolis',
        description: 'A city that has swallowed the horizon, fed by Worlds beyond your own.',
        followerRequirement: 300000,
        faithCost: 120000,
        starlightCost: 60000,
        capacityMultiplier: 150,
        requiresWorlds: true
    }
];
