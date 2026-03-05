# FOG Developer Guide (Beginner-Proof)

This is the single source of truth for how this game codebase works.
If you are new to the project, read this file in order once, then keep it open while coding.

## 1. What This Project Is

FOG is a browser incremental game built with plain JavaScript modules.

Core gameplay loops:
- Click actions (pray, gather, preach)
- Resource economy (faith, wood, stone, food)
- Role assignment and automation
- Unlock-driven progression tabs
- Exploration/expedition system (hazards, villages, wild areas)

Technical stack:
- No framework
- ES modules
- State in JS objects
- Save data in browser `localStorage`

## 2. Start Here (How Runtime Actually Works)

When the page opens:
1. `index.html` loads `docs/javascript/main.js`.
2. `main.js` calls `loadGame()` to restore save.
3. Tooltips are initialized.
4. Buttons are wired automatically from action registry metadata.
5. A loop runs every 100ms and calls `gameTick(dtSeconds)`.
6. `gameTick()` updates simulation and calls `updateUI()`.

Files to open first:
- `docs/javascript/main.js`
- `docs/javascript/tick.js`
- `docs/javascript/ui.js`
- `docs/javascript/actions.js`

## 3. Mental Model (Very Important)

There are three major layers:

1. **State Layer**
- Holds all game data (`gameState`, `game`).
- File: `docs/javascript/classes/GameState.js`

2. **Simulation Layer**
- Changes state over time and by player actions.
- Files: `docs/javascript/tick.js`, `docs/javascript/actions.js`, `docs/javascript/roles.js`

3. **UI Layer**
- Reads state and updates what player sees.
- Files: `docs/javascript/ui.js`, `docs/javascript/config/action-rules.js`

Rule of thumb:
- Actions/tick mutate state.
- UI reads state and renders.
- Config files define metadata/rules, not core simulation math.

## 4. File Map (What Each File Is For)

- `index.html`
UI skeleton: tabs, buttons, stat containers, discovered area panel, tooltip root.

- `docs/css/style.css`
All visual layout/styling.

- `docs/javascript/main.js`
Bootstrap, event wiring, tab initialization, cheat menu, discovered panel click delegation.

- `docs/javascript/game.js`
Public API barrel file. If a function is not exported here, button binding in `main.js` will fail.

- `docs/javascript/actions.js`
Core action handlers and exploration logic.

- `docs/javascript/roles.js`
Role unlock/training logic.

- `docs/javascript/tick.js`
Time-based simulation, autosave cadence, hunger/resource runtime effects.

- `docs/javascript/ui.js`
All rendering updates, rate displays, cards, tab state, and many tooltip payloads.

- `docs/javascript/classes/GameState.js`
Default state shape and default balancing values.

- `docs/javascript/utils/persistence.js`
Save/load/reset and migration guards for old saves.

- `docs/javascript/utils/helpers.js`
Shared calculations (`getMaxFollowers`, `getUnassignedFollowers`, cost helpers).

- `docs/javascript/config/action-definitions.js`
Declarative action list (`id`, `buttonId`, `handlerExport`, `tab`).

- `docs/javascript/config/action-rules.js`
Visibility/affordability/label/tooltip rules for action buttons.

- `docs/javascript/registries/index.js`
Builds and populates `buildingRegistry` and `actionRegistry`.

## 5. State Reference

State is split into two exports in `docs/javascript/classes/GameState.js`:

### `gameState`
- `progression`: followers, faith, role counts, faith rates
- `resources`: `Resource` instances for wood/stone/food
- `gathering`: manual gather formulas
- `costs`: all unlock/build/action costs
- `rates`: automation rates
- `runtime`: simulation accumulators

### `game`
- Gameplay flags (`trainingUnlocked`, `unlocksTabUnlocked`, etc.)
- Hunger controls
- Shelter/capacity scaling
- Dice bonuses
- Exploration unlock + exploration tuning

### `game.exploration` highlights
- Expedition state: `activeExpedition`, `totalMetersExplored`, `followerSendLimit`
- Encounter/hazard tuning
- Wild area generation/discovery tuning
- Seeded `discoveredAreas` list (distance/effect/cache)
- Discoverable `villages`

## 6. Public API Reference (`game.js`)

`main.js` binds button handlers by name from this file.
If you add a new action and forget to export it here, the button will do nothing.

### Action exports
- `gatherWood()`
- `gatherStone()`
- `gatherFood()`
- `pray()`
- `buildShelter()`
- `convertFollower()`
- `preach()`
- `rollPreachD4()`
- `cancelPreachRoll()`
- `feedFollowers()`
- `buildRitualCircle()`
- `buildAltar()`
- `unlockShelterUpgrade()`
- `unlockExploration()`
- `unlockAltar()`
- `startExpedition()`
- `rollExpedition()`
- `rollExpeditionD6()`
- `cancelExpeditionRoll()`
- `cancelExpedition()`
- `holdVillageSermon(villageId)`
- `collectWildAreaResources(areaId)`

### Role exports
- `training()`
- `trainHunters()`
- `trainRitualists()`
- `trainGatherers()`
- `trainCooks()`
- `trainProphet()`
- `unlockHuntersRole()`
- `unlockRitualistsRole()`
- `unlockGatherersRole()`
- `unlockCooksRole()`
- `unlockProphetRole()`

### Loop/UI exports
- `gameTick(dtSeconds)`
- `updateUI()`

## 7. Action Wiring Pattern (How Buttons Work)

Flow:
1. Add metadata in `config/action-definitions.js`.
2. Registry loads metadata in `registries/index.js`.
3. `main.js` loops `ACTION_TAB_ORDER` and binds clicks using `handlerExport` from `gameApi`.

For a new button/action, you must do all of these:
1. Add function implementation (`actions.js` or `roles.js`).
2. Export from `game.js`.
3. Add metadata entry in `action-definitions.js`.
4. Ensure button exists in `index.html` with matching `buttonId`.
5. Add/adjust UI rule in `action-rules.js`.

## 8. UI and Rule Responsibilities

`ui.js` should:
- Render values and rate text
- Render discovered cards
- Update tab header visibility
- Build tooltip content for dynamic readouts

`action-rules.js` should:
- Decide whether action buttons are visible
- Decide whether they are affordable/disabled
- Set button labels and static-ish tooltips

Keep simulation math out of `action-rules.js` where possible.

## 9. Exploration System (Plain-English)

Main file: `docs/javascript/actions.js`

How it works:
- Player starts expedition to nearest undiscovered village.
- Roll phase uses `1d6 + followersSent`.
- Hazard outcomes can reduce or wipe expedition.
- Wild areas are pre-seeded with random non-zero distances.
- The first wild area seeds at about `10m` from camp for early discovery feedback.
- Areas are guaranteed to be discovered once explored meters reach or exceed that area's distance.
- Some areas apply one-time effects (positive or negative).
- Some areas have resource caches claimable from sidebar cards.
- Only unassigned followers can be sent on expeditions.

UI hooks:
- Explore input max clamps to unassigned followers.
- Discovered sidebar renders village + wild area cards.
- Wild area cache button calls `collectWildAreaResources(areaId)`.

## 10. Hunger/Food Rules (Current)

Main logic: `docs/javascript/tick.js`

Current game rule:
- Followers consume food first.
- If food is above zero, hunger-bar starvation drain is zero.
- Hunger drops only when food is zero.
- Auto-feed may recover hunger if food remains and hunger is below 100.

Display formulas in `ui.js` should mirror simulation formulas in `tick.js`.

## 11. Save/Load/Reset Safety

Main file: `docs/javascript/utils/persistence.js`

Important behavior:
- Save key is `fogGameSave`.
- Load includes migration guards for old/invalid saves.
- Reset uses `resetInProgress` to block save races while clearing storage.

If you add new state fields:
1. Add default in `GameState.js`.
2. Add load guard/migration in `persistence.js`.
3. Optionally add cheat tuning entry in `main.js`.

## 12. Tooltip Engine

Main file: `docs/javascript/utils/tooltip.js`

How it works:
- Tooltip content is attached to element dataset via `setTooltipContent()`.
- Global pointer listeners show/hide/reposition one shared tooltip element.
- Tooltips hide on pointer transitions, blur, visibility change, and click transitions.

Use this API for tooltip text:
- `setTooltipContent(el, summary, stats)`

## 13. Cheat Menu System

Main file: `docs/javascript/main.js`

Features:
- Instant resource buttons
- Tunable table from `CHEAT_BALANCE_FIELD_SECTIONS`
- `Apply All`, `Reset Inputs`, `Copy Settings`
- Clipboard fallback chain: secure clipboard -> textarea copy -> manual prompt

Exploration tuning is fully exposed in cheat sections.

## 14. Step-by-Step: Add a New Feature

Use this exact checklist:
1. Define/extend state in `GameState.js`.
2. Add migration guards in `persistence.js`.
3. Implement behavior in `actions.js`, `roles.js`, or `tick.js`.
4. Export function in `game.js` if UI-clicked.
5. Add action metadata in `action-definitions.js`.
6. Add UI rule/tooltip in `action-rules.js`.
7. Render any dynamic display in `ui.js`.
8. Add button markup in `index.html` if needed.
9. Add cheat tuning entry in `main.js` if balancing matters.
10. Run diagnostics and manual smoke test.

## 15. Common Breakages and Fast Fixes

### Button does nothing on click
- Usually missing export in `docs/javascript/game.js`.

### Numbers on screen do not match gameplay behavior
- `ui.js` formula diverged from `tick.js` or action logic.

### New save field works on fresh save but breaks old save
- Missing migration guard in `persistence.js`.

### Tooltip sticks or shows wrong info
- Element tooltip payload not updated via `setTooltipContent()`.
- Pointer lifecycle logic in `tooltip.js` may need review.

### Reset save feels inconsistent
- Save race. Check `resetInProgress` and clear/reload timing in `persistence.js`.

## 16. Glossary (for New Joiners)

- **Affordability**: Whether a button can be used now; drives disabled state.
- **Role**: A trained follower specialization (hunter, ritualist, etc.).
- **Unassigned followers**: Followers not currently in a role; expedition uses these only.
- **Wild area**: Discoverable exploration point with optional effect/cache.
- **Cache**: One-time wood/stone reward claimable from discovered area card.
- **Migration guard**: Load-time fallback that repairs bad or missing saved values.

## 17. First-Day Developer Task (Recommended)

Do this mini-task to learn the code fast:
1. Add a tiny new cheat variable in `main.js`.
2. Add a tooltip line update in `ui.js`.
3. Add one `addLog()` call in an action.
4. Run game, verify behavior, then remove or keep as needed.

You will touch state, UI, and event paths in one pass.

## 18. Manual Smoke Test List (Before PR)

1. Start fresh save.
2. Pray/gather/build shelter.
3. Unlock training and one role.
4. Verify unassigned follower count updates correctly.
5. Start/roll/cancel expedition.
6. Discover village/area, test area resource collection.
7. Verify hunger behavior with and without food.
8. Use cheat menu apply/reset/copy.
9. Reset save and confirm full restart.
10. Reload browser and verify persistence.

## 19. Roadmap Suggestions

- Add automated tests for deterministic math paths (`tick`, hazards, role assignment).
- Extract exploration balancing constants into dedicated config module.
- Add save schema versioning and migration changelog.
- Add optional debug overlay for expedition internals.
