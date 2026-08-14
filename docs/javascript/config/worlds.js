export const WORLD_FAVOR_GODS = ['helios', 'hel', 'danu', 'sekhmet'];

export const WORLD_NAME_TEMPLATES = {
    helios: "Helios's Forge",
    hel: "Hel's Hollow",
    danu: "Danu's Verdant Reach",
    sekhmet: "Sekhmet's Anvil"
};

export function getWorldFavorGod(tier) {
    return WORLD_FAVOR_GODS[(tier - 1) % WORLD_FAVOR_GODS.length];
}

export function getWorldName(tier) {
    if (tier <= WORLD_FAVOR_GODS.length) {
        return WORLD_NAME_TEMPLATES[getWorldFavorGod(tier)];
    }
    return `Unnamed World ${tier}`;
}

export function getWorldTierTuning(tier) {
    const t = Math.max(1, Math.floor(tier));
    return {
        wildAreaSeedCount: Math.min(20, 8 + t),
        villageCount: Math.min(8, 2 + t),
        distanceMinStep: Math.round(30 * (1 + 0.3 * (t - 1))),
        distanceMaxStep: Math.round(120 * (1 + 0.3 * (t - 1))),
        villageDistanceMinStep: Math.round(400 * (1 + 0.3 * (t - 1))),
        villageDistanceMaxStep: Math.round(900 * (1 + 0.3 * (t - 1))),
        villagePopulation: Math.round(1500 * Math.pow(1.6, t - 1)),
        villageResistance: Math.round(42 + 12 * (t - 1)),
        hazardScale: Math.min(1.8, 1 + 0.08 * (t - 1)),
        starlightCacheMin: Math.round(80 * Math.pow(1.4, t - 1)),
        starlightCacheMax: Math.round(220 * Math.pow(1.4, t - 1)),
        outpostStarlightPerSecond: Number((0.08 * t).toFixed(3))
    };
}

export function createWorld(tier, worldIndex, options = {}) {
    const tuning = getWorldTierTuning(tier);
    const favorAlignment = getWorldFavorGod(tier);
    const headstartFraction = Number.isFinite(options.headstartFraction) ? Math.max(0, Math.min(0.9, options.headstartFraction)) : 0;

    const wildAreas = [];
    let distance = 0;
    for (let i = 1; i <= tuning.wildAreaSeedCount; i += 1) {
        const step = i === 1
            ? Math.max(10, Math.round(tuning.distanceMinStep / 3))
            : Math.floor(Math.random() * (tuning.distanceMaxStep - tuning.distanceMinStep + 1)) + tuning.distanceMinStep;
        distance += Math.max(1, step);

        const hasCache = Math.random() < 0.45;
        wildAreas.push({
            id: `${worldIndex}-area-${i}`,
            name: `Reach ${i}`,
            distanceFromCamp: distance,
            discovered: false,
            resourceCache: hasCache
                ? {
                    starlight: Math.floor(Math.random() * (tuning.starlightCacheMax - tuning.starlightCacheMin + 1)) + tuning.starlightCacheMin,
                    collected: false
                }
                : null
        });
    }

    const villages = [];
    let villageDistance = Math.max(distance + 200, Math.round(500 * Math.pow(1.4, tier - 1)));
    for (let i = 1; i <= tuning.villageCount; i += 1) {
        if (i > 1) {
            const step = Math.floor(Math.random() * (tuning.villageDistanceMaxStep - tuning.villageDistanceMinStep + 1)) + tuning.villageDistanceMinStep;
            villageDistance += step;
        }
        villages.push({
            id: `${worldIndex}-village-${i}`,
            name: `${getWorldName(tier)} — Settlement ${i}`,
            distanceFromCamp: villageDistance,
            population: Math.round(tuning.villagePopulation * (1 + 0.25 * (i - 1))),
            resistance: tuning.villageResistance + Math.round(5 * (i - 1)),
            convertedPercent: 0,
            discovered: false,
            sermonsHeld: 0,
            prophetPresent: false,
            resolutionType: null
        });
    }

    const headstartMeters = Math.floor(distance * headstartFraction);
    if (headstartMeters > 0) {
        wildAreas.forEach((area) => {
            if (area.distanceFromCamp <= headstartMeters) area.discovered = true;
        });
        villages.forEach((village) => {
            if (village.distanceFromCamp <= headstartMeters) village.discovered = true;
        });
    }

    return {
        id: worldIndex,
        name: getWorldName(tier),
        tier,
        favorAlignment,
        outpostStarlightPerSecond: tuning.outpostStarlightPerSecond,
        frozen: false,
        finalDominationScore: null,
        totalMetersExplored: headstartMeters,
        hazardScale: tuning.hazardScale,
        activeExpedition: null,
        wildAreas,
        villages,
        nextVillageIndex: tuning.villageCount + 1,
        nextAreaIndex: tuning.wildAreaSeedCount + 1
    };
}
