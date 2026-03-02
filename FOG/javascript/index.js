// Classes
import * as GameState from "./classes/GameState.js";

// game logic? bruh idk what game even is tbh
import * as game from "./game.js";

// utils
import * as helpers from "./utils/helpers.js";
import * as logging from "./utils/logging.js";
import * as persistence from "./utils/persistence.js";
import * as uiHelpers from "./utils/ui-helpers.js";

Object.assign(window, {
    GameState,
    game,
    helpers,
    logging,
    persistence,
    uiHelpers
});