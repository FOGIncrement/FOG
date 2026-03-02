import * as GameState from "./classes/GameState.js";
import * as game from "./game.js";
import * as helpers from "./utils/helpers.js";
import * as persistence from "./utils/persistence.js";
import * as uiHelpers from "./utils/ui-helpers.js";

Object.assign(window, {
    GameState,
    game,
    helpers,
    persistence,
    uiHelpers
});