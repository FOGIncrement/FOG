export class BuildingRegistry {
    constructor() {
        this.buildings = new Map();
    }

    register(buildingDefinition) {
        this.buildings.set(buildingDefinition.id, buildingDefinition);
    }

    get(id) {
        return this.buildings.get(id);
    }

    getAll() {
        return Array.from(this.buildings.values());
    }
}