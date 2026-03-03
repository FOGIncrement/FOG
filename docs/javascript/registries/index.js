import { BuildingRegistry } from '../classes/BuildingRegistry.js';
import { ActionRegistry } from '../classes/ActionRegistry.js';
import { BUILDING_DEFINITIONS } from '../config/buildings.js';
import { ACTION_DEFINITIONS } from '../config/action-definitions.js';

export const buildingRegistry = new BuildingRegistry();
export const actionRegistry = new ActionRegistry();

BUILDING_DEFINITIONS.forEach((buildingDefinition) => {
    buildingRegistry.register(buildingDefinition);
});

ACTION_DEFINITIONS.forEach((actionDefinition) => {
    actionRegistry.register(actionDefinition);
});