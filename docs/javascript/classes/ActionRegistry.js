export class ActionRegistry {
    constructor() {
        this.actions = new Map();
    }

    register(actionDefinition) {
        this.actions.set(actionDefinition.id, actionDefinition);
    }

    get(id) {
        return this.actions.get(id);
    }

    getAll() {
        return Array.from(this.actions.values());
    }

    getByTab(tab) {
        return this.getAll().filter((action) => action.tab === tab);
    }

    getByCategory(category) {
        return this.getAll().filter((action) => action.category === category);
    }
}