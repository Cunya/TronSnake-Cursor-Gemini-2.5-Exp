# Code Files and Sizes (Lines)

- `playerControls.js`: 324B (9 lines)
- `powerup_tron_itchio.html`: 1.4KB (26 lines)
- `index.html`: 962B (29 lines)
- `src/visuals.js`: 23KB (547 lines)
- `src/state.js`: 11KB (243 lines)
- `src/ui.js`: 36KB (735 lines)
- `src/pickups.js`: 60KB (1124 lines)
- `src/playerControls.js`: 22KB (476 lines)
- `src/gameLoop.js`: 54KB (1048 lines)
- `src/init.js`: 32KB (677 lines)
- `src/ai.js`: 13KB (311 lines)
- `src/constants.js`: 9.7KB (184 lines)
- `src/projectile.js`: 2.3KB (53 lines)
- `src/utils.js`: 1.6KB (40 lines)

// *Plan generated on: 2024-04-30*
// *Based on version: v1.1.40*

## Notes on Current Setup

Before refactoring, consider these points about the existing codebase:

1.  **Flat `src` Directory:** All `.js` files are currently in the root `src/` folder. This lacks clear organization for a project of this size. (Addressed by the folder structure plan below).
2.  **Duplicate `playerControls.js`:** There's a small `playerControls.js` in the workspace root and a larger one in `src/`. The root file might be unused and should be investigated/removed.
3.  **Potential Over-Coupling:** Some files (e.g., `gameLoop.js`, `init.js`) import from many other modules. The refactoring process should help clarify dependencies and potentially reduce unnecessary coupling.
4.  **Large Central `state.js`:** While central state is viable, the current `state.js` (243 lines) aggregates state for many different concerns (player, AI, game, UI, camera, etc.). Further splitting might be beneficial later, although it's not part of the immediate plan.
5.  **HTML/CSS in JS (`ui.js`):** UI elements are built using JavaScript strings with inline styles. This can be hard to read and maintain compared to using separate HTML/CSS or templating solutions. (This refactor focuses on JS structure, not this aspect).

---

## Refactoring Plan

## Proposed Folder Structure

To improve organization, the `src` directory will be structured as follows:

*   **`src/`**
    *   **`ai/`**: AI logic (safety, targeting, avoidance, shooting, update loop).
    *   **`core/`**: Central game logic (main loop, state, constants, collision, player update, camera, particles, projectiles, utils).
    *   **`init/`**: Game initialization and reset logic (scene setup, error handling, AI factory, event listeners, etc.).
    *   **`input/`**: User input handling (gameplay, game over, debug).
    *   **`pickups/`**: Pickup logic (spawning, player collision, AI collision).
    *   **`ui/`**: HTML UI elements (creation, updates, dialogs).
    *   **`visuals/`**: THREE.js visual object management (trails, effects, player/AI visuals, environment, etc.).

**Note:** All `import` statements across the refactored files will need to be updated to reflect these new paths (e.g., using `../core/state.js` instead of `./state.js`).

## Refactoring Plan: `src/pickups.js` (1124 lines) -> `src/pickups/`

The goal is to split this file into smaller modules within the `src/pickups/` directory, based on distinct responsibilities.

### Analysis

`src/pickups.js` currently handles:

1.  **Spawning Logic:** Finding safe locations, creating pickup objects, managing spawn conditions (initial spawn, counter-based spawns, unlocks).
    *   Functions: `trySpawn`, `spawnPickup`, `spawnInitialPickups`, `checkAndSpawnCounterPickups`, `checkUnlocks`
    *   Internal Helpers: `getMaxForType`, `isCellWall`, `isCellAdjacentToWall`
2.  **Player Collision Logic:** Detecting player-pickup collisions and handling the effects (score updates, state changes, visual effects).
    *   Functions: `checkPlayerPickupCollisions`, `checkScorePickupCollision`, `checkExpansionPickupCollision`, `checkClearPickupCollision`, `checkZoomPickupCollision`, `checkSparseTrailPickupCollision`, `checkMultiSpawnPickupCollision`, `checkAddAiPickupCollision`, `checkAmmoPickupCollision`
    *   Helper: `handleScoreUpdateAndCounters`
3.  **AI Collision Logic:** Detecting AI-pickup collisions and handling the effects.
    *   Functions: `checkAIPickupCollisions`, `checkAIScorePickupCollision`, `checkAIExpansionPickupCollision`, `checkAIClearPickupCollision`, `checkAIZoomPickupCollision`, `checkAISparseTrailPickupCollision`, `checkAIMultiSpawnPickupCollision`, `checkAIAddAiPickupCollision`, `checkAIAmmoPickupCollision`
    *   Helper: `handleAICounterUpdate`
4.  **State Interaction:** Imports and uses numerous state variables and setters from `state.js`.
5.  **Dependency Imports:** Imports from `three`, `constants.js`, `utils.js`, `visuals.js`, `ai.js`, `init.js`.

### Proposed Splitting Strategy (within `src/pickups/`)

1.  **`src/pickups/pickupSpawning.js` (New File):**
    *   **Responsibility:** All logic related to creating, positioning, and managing the spawning conditions of pickups.
    *   **Contents:** Move `trySpawn`, `spawnPickup`, `spawnInitialPickups`, `checkAndSpawnCounterPickups`, `checkUnlocks`, and internal helpers (`getMaxForType`, `isCellWall`, `isCellAdjacentToWall`).
    *   **Dependencies:** Imports will need path updates (e.g., `../core/state.js`, `../visuals/visuals.js`, `../ai/ai.js`, `../init/init.js`).

2.  **`src/pickups/pickupCollisionPlayer.js` (New File):**
    *   **Responsibility:** All logic related to player-pickup interactions.
    *   **Contents:** Move `checkPlayerPickupCollisions`, all player-specific `check[Type]PickupCollision` functions, and `handleScoreUpdateAndCounters`.
    *   **Dependencies:** Imports will need path updates (e.g., `../core/state.js`, `../visuals/visuals.js`). May need to import from `./pickupSpawning.js`.

3.  **`src/pickups/pickupCollisionAI.js` (New File):**
    *   **Responsibility:** All logic related to AI-pickup interactions.
    *   **Contents:** Move `checkAIPickupCollisions`, all AI-specific `checkAI[Type]PickupCollision` functions, and `handleAICounterUpdate`.
    *   **Dependencies:** Imports will need path updates (e.g., `../core/state.js`, `../visuals/visuals.js`). May need to import from `./pickupSpawning.js`.

4.  **`src/pickups/pickups.js` (Original File - Refactored/Exporter):**
    *   **Location:** `src/pickups/pickups.js`
    *   **Responsibility:** Primarily re-exporting functions from the new modules (`./pickupSpawning.js`, `./pickupCollisionPlayer.js`, `./pickupCollisionAI.js`) for use by other parts of the application (like `gameLoop.js`). May become empty if imports are updated directly elsewhere.
    *   **Contents:** Import/export statements.
    *   **Dependencies:** Imports from other files within `src/pickups/`.

This split aims to improve modularity and keep file sizes manageable within the `pickups` folder.

## Refactoring Plan: `src/gameLoop.js` (1048 lines) -> `src/core/`

This file is the main driver of the game. It will be moved to `src/core/` and split into related modules within `src/core/`.

### Analysis

`src/gameLoop.js` currently handles:

1.  **Imports:** Extensive imports from nearly all other modules.
2.  **Main Loop (`animate`):** The core `requestAnimationFrame` loop.
3.  **Game State Management:** Checks for pause/game over, manages timers (boosts, etc.).
4.  **Player Updates:** Calculates movement ticks, updates position, adds trail segments, updates score.
5.  **AI Updates:** Calls `updateAllAIPlayers`.
6.  **Pickup Logic:** Calls pickup collision checks (`checkPlayerPickupCollisions`, `checkAIPickupCollisions`) and unlock checks (`checkUnlocks`).
7.  **Collision Detection:** Contains a large internal function (`checkCollisions`) for boundary, head-on, and trail collisions for player and AIs.
8.  **Game Over Logic:** Handles the consequences of collisions (setting state, triggering effects, initiating game over camera).
9.  **Projectile Updates:** Updates projectile positions and checks their collisions.
10. **Particle Updates:** Updates all particle systems (explosions, trails, text, pickup/AI spawns).
11. **Camera Updates:** Manages camera position and look-at target for different game states (gameplay, game over, look-back, drag/pan).
12. **UI Updates:** Calls functions to update displayed information (score).
13. **Rendering:** Calls `renderer.render`.

### Proposed Splitting Strategy (within `src/core/`)

1.  **`src/core/collisionDetection.js` (New File):**
    *   **Responsibility:** Detecting all collision events.
    *   **Contents:** Move the `checkCollisions` function. It should return a detailed status object.
    *   **Dependencies:** `state.js`, `constants.js` (within `src/core/`).

2.  **`src/core/playerUpdate.js` (New File):**
    *   **Responsibility:** Updating the player's state per frame/tick.
    *   **Contents:** Extract player update logic into `updatePlayerState(deltaTime)`.
    *   **Dependencies:** `state.js`, `constants.js` (within `src/core/`), `../visuals/visualsTrail.js` (for `createTrailSegment`).

3.  **`src/core/cameraControls.js` (New File):**
    *   **Responsibility:** Managing all camera logic.
    *   **Contents:** Move camera update logic into `updateCamera(deltaTime)`. Move `gameOverLerpedLookAtTarget`.
    *   **Dependencies:** `state.js`, `constants.js` (within `src/core/`).

4.  **`src/core/particleSystem.js` (New File):**
    *   **Responsibility:** Updating all particle effects.
    *   **Contents:** Move particle update loops into `updateParticles(deltaTime)`.
    *   **Dependencies:** `state.js`, `constants.js` (within `src/core/`), `scene` (from `state.js`).

5.  **`src/core/projectileSystem.js` (New File):**
    *   **Responsibility:** Updating projectiles.
    *   **Contents:** Move projectile update loop into `updateProjectiles(deltaTime)`.
    *   **Dependencies:** `state.js`, `constants.js` (within `src/core/`), maybe `../visuals/visuals.js`.

6.  **`src/core/gameLoop.js` (Refactored Original):**
    *   **Location:** `src/core/gameLoop.js`
    *   **Responsibility:** Orchestrator.
    *   **Contents:** Keep `animate` structure. Import and call functions from new modules (`./playerUpdate.js`, `./cameraControls.js`, `./particleSystem.js`, `./projectileSystem.js`, `./collisionDetection.js`) and modules in other folders (`../ai/ai.js`, `../pickups/pickups.js`, `../ui/ui.js`). Handle results (e.g., trigger effects based on collision status). Manage timers, pause/game over states, `requestAnimationFrame`.
    *   **Dependencies:** Imports from new modules within `src/core/`, and from `../ai/`, `../pickups/`, `../ui/`, `../visuals/`.

This refactor separates major systems into modules within the `core` folder.

## Refactoring Plan: `src/ui.js` (735 lines) -> `src/ui/`

This file manages UI elements. It will be moved to `src/ui/` and split into related modules within that folder.

### Analysis

`src/ui.js` currently handles:

1.  **Element Creation:** Functions (`createOpeningDialog`, `createGameOverText`, `createVersionText`, etc.) to dynamically create DOM elements for various UI components.
2.  **Styling:** Applies inline styles to position and format UI elements.
3.  **Content Generation:** Populates dialogs with game information (winner, score, unlocks via `getUnlockStatusText`).
4.  **Game Over Dialog:** Includes complex logic for:
    *   Displaying final messages (`showGameOverMessage`).
    *   Minimizing/maximizing (`updateGameOverDialogAppearance`).
    *   Adding/removing pointer listeners for camera control (`addGameOverPointerListeners`, `removeGameOverPointerListeners`).
    *   Handling camera drag/pan/zoom interactions within the dialog listeners.
5.  **Dynamic Updates:** Updates score/top score display during gameplay (`updateScoreDisplay`).
6.  **State Interaction:** Reads and writes UI element references and camera control state from/to `state.js`.

### Proposed Splitting Strategy (within `src/ui/`)

1.  **`src/ui/uiElements.js` (New File):**
    *   **Responsibility:** Creating static UI elements.
    *   **Contents:** Move `createVersionText`, `createScoreText`, `createTopScoreText`, `createPauseIndicator`, `createGitHubLink`, `createItchLink`.
    *   **Dependencies:** `../core/state.js`, `../core/constants.js`.

2.  **`src/ui/uiOpeningDialog.js` (New File):**
    *   **Responsibility:** Creating and managing the opening dialog.
    *   **Contents:** Move `createOpeningDialog` and `getUnlockStatusText`. (Consider moving pickup data later).
    *   **Dependencies:** `../core/state.js`, `../core/constants.js`.

3.  **`src/ui/uiGameOverDialog.js` (New File):**
    *   **Responsibility:** Managing the complex game over dialog.
    *   **Contents:** Move `createGameOverText`, `resetGameOverDialogState`, `addGameOverPointerListeners`, `removeGameOverPointerListeners`, `showGameOverMessage`, `updateGameOverDialogAppearance`. Handle internal minimized state.
    *   **Dependencies:** `../core/state.js`, `../core/constants.js`, `../input/inputHandlerGameOver.js` (for wheel handler import), `../init/resetGame.js` (called by listener), `three`, `./uiOpeningDialog.js` (for `getUnlockStatusText`).

4.  **`src/ui/uiUpdate.js` (New File):**
    *   **Responsibility:** Updating UI elements during gameplay.
    *   **Contents:** Move `updateScoreDisplay`.
    *   **Dependencies:** `../core/state.js`.

5.  **`src/ui/ui.js` (Refactored Original):**
    *   **Location:** `src/ui/ui.js`
    *   **Responsibility:** Central UI initialization and exports.
    *   **Contents:** Could have `initUI()` calling creation functions from other modules (`./uiElements.js`, etc.), or just re-export necessary functions (`initUI`, `updateScoreDisplay`, `showGameOverMessage`, etc.) for `init.js` and `gameLoop.js`.
    *   **Dependencies:** Imports from new UI modules within `src/ui/`.

This separates UI components logically within the `ui` folder.

## Refactoring Plan: `src/init.js` (677 lines) -> `src/init/`

This file is the main entry point. It will be moved to `src/init/` and split into helper modules within that folder. Files like `aiFactory.js` also belong here.

### Analysis

`src/init.js` currently handles:

1.  **Imports:** Imports from almost every other module and THREE.js.
2.  **Error Handling:** Overrides `console.error` to log errors and provides a download function.
3.  **Visibility Handling:** Pauses the game when the browser tab loses focus.
4.  **AI Creation:** Includes factory functions (`createNewAIPlayer`, `createAISpawnRingEffect`) for AI data structures and visual spawn effects.
5.  **Reset Logic:** Contains the (likely large) `resetGame` function.
6.  **Window Resizing:** Handles renderer and camera updates on window resize.
7.  **Core Initialization (`init`):**
    *   Sets up THREE.js scene, camera, renderer, lights.
    *   Loads assets (fonts).
    *   Creates initial game objects (player, ground, boundaries).
    *   Initializes systems (pickups, visuals).
    *   Creates UI elements.
    *   Sets initial game state.
    *   Attaches all event listeners.
    *   Starts the game loop.

### Proposed Splitting Strategy (within `src/init/`)

1.  **`src/init/errorHandling.js` (New File):**
    *   **Responsibility:** Custom error logging.
    *   **Contents:** Move error log array, `console.error` override, `downloadErrorLogFile`. Export `setupErrorHandling()`.\
    *   **Dependencies:** Browser globals.

2.  **`src/init/visibilityHandler.js` (New File):**
    *   **Responsibility:** Pause game on tab visibility change.
    *   **Contents:** Move `handleVisibilityChange`. Export `setupVisibilityHandler()` to add listener.\
    *   **Dependencies:** `../core/state.js`.

3.  **`src/init/aiFactory.js` (New File):**
    *   **Responsibility:** Creating AI players and spawn effects.
    *   **Contents:** Move `createNewAIPlayer`, `createAISpawnRingEffect`.\
    *   **Dependencies:** `three`, `../core/state.js`, `../core/constants.js`, `scene` (from state).

4.  **`src/init/resetGame.js` (New File):**
    *   **Responsibility:** Resetting the game state.
    *   **Contents:** Move `resetGame` function.\
    *   **Dependencies:** `../core/state.js`, `../visuals/visuals.js`, `../core/projectile.js`, `../pickups/pickups.js`, `../ui/ui.js`, `../input/inputHandlerGameOver.js` (maybe for listener cleanup?), `./aiFactory.js`, `scene`. (Dependencies need careful checking during implementation).

5.  **`src/init/sceneSetup.js` (New File):**
    *   **Responsibility:** Initial THREE.js setup.
    *   **Contents:** Extract scene, camera, renderer, light, ground, initial player setup into `setupScene()`. Handle resize logic here or in eventListeners.\
    *   **Dependencies:** `three`, `../core/state.js`, `../core/constants.js`.

6.  **`src/init/eventListeners.js` (New File):**
    *   **Responsibility:** Attaching global event listeners.
    *   **Contents:** Extract listener attachments (`window.addEventListener`, etc.) into `setupEventListeners()`. Call handlers from `../input/` modules and resize handler from `./sceneSetup.js`.\
    *   **Dependencies:** `../input/inputHandlerGameplay.js`, `../input/inputHandlerGameOver.js`, `../input/inputHandlerDebug.js`, `./visibilityHandler.js`, `./sceneSetup.js`.

7.  **`src/init/init.js` (Refactored Original):**
    *   **Location:** `src/init/init.js`
    *   **Responsibility:** Main entry point orchestration.
    *   **Contents:** `init()` function calls setup functions from new modules in order (`./errorHandling.js`, `./sceneSetup.js`, load assets, `../visuals/visualsPickups.js` (for templates), `../ui/ui.js`, `./aiFactory.js` calls, `../pickups/pickups.js`, set state, `./eventListeners.js`, `./visibilityHandler.js`, show opening dialog, `../core/gameLoop.js` (`animate`)).
    *   **Dependencies:** Imports from new setup modules within `src/init/`, `three` (FontLoader), `../core/state.js`, `../visuals/visuals.js`, `../ui/ui.js`, `../pickups/pickups.js`, `../core/gameLoop.js`.

This decomposes the initialization process into logical steps within the `init` folder.

## Refactoring Plan: `src/visuals.js` (547 lines) -> `src/visuals/`

This file manages THREE.js objects. It will be moved to `src/visuals/` and split into related modules within that folder.

### Analysis

`src/visuals.js` currently handles:

1.  **Trail Segments:** Creating trail cubes (`createTrailSegment`), managing visibility (`updateLastTrailSegmentsVisibility`), cleanup (`clearAllTrails`).
2.  **Particle Effects:** Creating explosions (`createExplosionEffect`), floating text (`createFloatingText`), pickup spawn particles (`createPickupSpawnEffect`), cleanup (`clearFloatingTexts`, `clearExplosionParticles`).
3.  **Pickup Templates:** Creating reusable visual templates for specific pickups (`createSparseTrailPickupVisual`, `createAmmoPickupVisual`) and initializing them (`initializePickupTemplates`).
4.  **Ammo Indicators:** Updating visual indicators around player/AI heads (`updateAmmoIndicatorP1`, `updateAmmoIndicatorAI`).
5.  **Environment:** Creating the ground plane and grid (`createPlayAreaVisuals`).
6.  **Head Colors:** Changing head colors on game over/reset (`revertHeadColors`, `setHeadColorToRed`).
7.  **Debugging:** Diagnostic functions (`diagnoseOrphanedSegments`, `logSceneMeshes`).

### Proposed Splitting Strategy (within `src/visuals/`)

1.  **`src/visuals/visualsTrail.js` (New File):**
    *   **Responsibility:** Trail segment visuals.
    *   **Contents:** `createTrailSegment`, `updateLastTrailSegmentsVisibility`, `clearAllTrails`.
    *   **Dependencies:** `three`, `../core/state.js`, `../core/constants.js`, `scene`.

2.  **`src/visuals/visualsEffects.js` (New File):**
    *   **Responsibility:** Particle effect creation and cleanup.
    *   **Contents:** `createExplosionEffect`, `createFloatingText`, `createPickupSpawnEffect`, `clearFloatingTexts`, `clearExplosionParticles`.
    *   **Dependencies:** `three`, `three/addons/geometries/TextGeometry.js`, `../core/state.js`, `../core/constants.js`, `scene`.

3.  **`src/visuals/visualsPlayer.js` (New File):**
    *   **Responsibility:** Player-specific visuals.
    *   **Contents:** `updateAmmoIndicatorP1`, player parts of `revertHeadColors`, `setHeadColorToRed`.
    *   **Dependencies:** `three`, `../core/state.js`, `../core/constants.js`, `scene`.

4.  **`src/visuals/visualsAI.js` (New File):**
    *   **Responsibility:** AI-specific visuals.
    *   **Contents:** `updateAmmoIndicatorAI`, AI parts of `revertHeadColors`, `setHeadColorToRed`.
    *   **Dependencies:** `three`, `../core/state.js`, `../core/constants.js`, `scene`.

5.  **`src/visuals/visualsPickups.js` (New File):**
    *   **Responsibility:** Pickup visual templates.
    *   **Contents:** `createSparseTrailPickupVisual`, `createAmmoPickupVisual`, `initializePickupTemplates`.
    *   **Dependencies:** `three`, `../core/state.js`, `../core/constants.js`.

6.  **`src/visuals/visualsEnvironment.js` (New File):**
    *   **Responsibility:** Ground plane and grid visuals.
    *   **Contents:** `createPlayAreaVisuals`.
    *   **Dependencies:** `three`, `../core/state.js`, `../core/constants.js`, `../core/utils.js`, `scene`.

7.  **`src/visuals/visualsDebug.js` (New File):**
    *   **Responsibility:** Debugging functions.
    *   **Contents:** `diagnoseOrphanedSegments`, `logSceneMeshes`. (Ensure duplicate `downloadErrorLogFile` is removed).
    *   **Dependencies:** `../core/state.js`, `scene`.

8.  **`src/visuals/visuals.js` (Refactored Original):**
    *   **Location:** `src/visuals/visuals.js`
    *   **Responsibility:** Re-exporting necessary functions.
    *   **Contents:** Import and export functions from new `visuals*` modules for use by other parts of the application (e.g., `gameLoop`, `init`, `playerUpdate`).
    *   **Dependencies:** Imports from new `visuals*` modules within `src/visuals/`.

This organizes visual logic within the `visuals` folder.

## Refactoring Plan: `src/playerControls.js` (476 lines) -> `src/input/`

This file handles user input. It will be moved to `src/input/` and split into related modules within that folder.

### Analysis

`src/playerControls.js` currently handles:

1.  **Game Start:** Triggering game start on first interaction (`startGame`, `handleFirstClick`) and initializing deferred visuals.
2.  **Gameplay Input:** Keyboard (`onKeyDown`, `onKeyUp`) and touch (`onTouchStart`, `onTouchEnd`) handlers for player turning, shooting, looking back, and pausing.
3.  **Game Over Input:** Specific handlers (`handleGameOverPointerDown`, `handleGameOverPointerMove`, `handleGameOverPointerUp`, `handleGameOverWheel`) for camera orbit/pan/zoom using mouse/touch on the game over screen. Also includes game restart logic triggered by input.
4.  **Input Handling Logic:** Determines actions based on key presses or touch zone locations. Includes logic for `isGameOver` checks to differentiate behavior.
5.  **Camera Control Logic:** Calculates camera movement (panning, zooming, orbiting) based on pointer input during game over (`panCamera`).
6.  **Debugging:** An Alt+Click handler (`handleDebugClick`) for logging state.

### Proposed Splitting Strategy (within `src/input/`)

1.  **`src/input/inputHandlerGameplay.js` (New File):**
    *   **Responsibility:** Handling keyboard/touch input during active gameplay.
    *   **Contents:** Move `startGame`, `handleFirstClick`, `onKeyDown`, `onKeyUp`, `onTouchStart`, `onTouchEnd`. Modify these to *only* process input if `!isGameOver` and `!isPaused` (except pause/start).
    *   **Dependencies:** `../core/state.js`, `../core/constants.js`, `../core/projectile.js`, `../init/init.js` (or specific function like `triggerDeferredVisuals`), `../visuals/visuals.js`.

2.  **`src/input/inputHandlerGameOver.js` (New File):**
    *   **Responsibility:** Handling mouse/touch input during the game over screen (camera control, restart).
    *   **Contents:** Move `getPointerCoords`, `panCamera`, `handleGameOverWheel`, `handleGameOverPointerDown`, `handleGameOverPointerMove`, `handleGameOverPointerUp`. Include logic for restarting the game.
    *   **Dependencies:** `../core/state.js`, `../core/constants.js`, `three`, `../ui/uiGameOverDialog.js` (restart trigger?), `../init/resetGame.js`.

3.  **`src/input/inputHandlerDebug.js` (New File):**
    *   **Responsibility:** Debugging input handlers.
    *   **Contents:** Move `handleDebugClick`.
    *   **Dependencies:** `../core/state.js`, `scene`, etc.

4.  **`src/input/playerControls.js` (Refactored Original):**
    *   **Location:** `src/input/playerControls.js`
    *   **Responsibility:** Exporting handlers or being removed.
    *   **Contents:** Either re-export handlers from the new `inputHandler*` modules, or be removed entirely if `eventListeners.js` imports directly from the new modules.
    *   **Dependencies:** Imports from new `inputHandler*` modules (if re-exporting).

This separates input handling based on game state within the `input` folder.

## Refactoring Plan: `src/ai.js` (311 lines) -> `src/ai/`

This file contains AI logic. It will be moved to `src/ai/` and split into related modules within that folder.

### Analysis

`src/ai.js` currently handles:

1.  **Safety Checks (`isPositionSafe`):** Determines if a grid position is safe from boundaries, player/AI trails, and player/AI heads.
2.  **Targeting (`findTargetPickup`, `findBestMoveTowards`):** Identifies the closest pickup and determines the best safe move towards it.
3.  **Avoidance (`findBestTurn`):** Determines the best turn (left/right) to avoid collisions by looking ahead multiple steps.
4.  **Shooting Logic:** Decides when an AI should shoot based on detecting trails ahead.
5.  **Update Loop (`updateAllAIPlayers`, `updateSingleAIPlayer`):** Orchestrates the decision-making process for each AI per frame, combining survival (avoidance) and targeting behaviors.

### Proposed Splitting Strategy (within `src/ai/`)

1.  **`src/ai/aiSafetyCheck.js` (New File):**
    *   **Responsibility:** Position safety calculation.
    *   **Contents:** Move `isPositionSafe`.
    *   **Dependencies:** `../core/state.js`, `../core/constants.js`.

2.  **`src/ai/aiTargeting.js` (New File):**
    *   **Responsibility:** Pickup targeting and movement towards targets.
    *   **Contents:** Move `findTargetPickup`, `findBestMoveTowards`.
    *   **Dependencies:** `../core/state.js`, `../core/constants.js`, `./aiSafetyCheck.js`.

3.  **`src/ai/aiAvoidance.js` (New File):**
    *   **Responsibility:** Collision avoidance logic.
    *   **Contents:** Move `findBestTurn`.
    *   **Dependencies:** `../core/state.js`, `../core/constants.js`, `./aiSafetyCheck.js`.

4.  **`src/ai/aiShooting.js` (New File):**
    *   **Responsibility:** AI shooting decision logic.
    *   **Contents:** Extract shooting logic into `decideAndShoot(aiObject)`.
    *   **Dependencies:** `../core/state.js`, `../core/constants.js`, `../core/projectile.js`.

5.  **`src/ai/aiUpdateLoop.js` (New File):**
    *   **Responsibility:** Main AI update orchestration.
    *   **Contents:** Move `updateAllAIPlayers`, `updateSingleAIPlayer`. Modify `updateSingleAIPlayer` to call functions from the other new `ai*` modules.
    *   **Dependencies:** `../core/state.js`, `../core/constants.js`, `./aiSafetyCheck.js`, `./aiTargeting.js`, `./aiAvoidance.js`, `./aiShooting.js`.

6.  **`src/ai/ai.js` (Refactored Original):**
    *   **Location:** `src/ai/ai.js`
    *   **Responsibility:** Re-exporting necessary functions.
    *   **Contents:** Import and re-export `updateAllAIPlayers` from `./aiUpdateLoop.js` for `gameLoop.js`. Potentially re-export `isPositionSafe` from `./aiSafetyCheck.js` for `pickupSpawning.js`.
    *   **Dependencies:** Imports from `./aiUpdateLoop.js`, potentially `./aiSafetyCheck.js`.

This separates the different facets of AI decision-making within the `ai` folder.

## Remaining Files (To be moved to `src/core/`)

*   **`src/state.js` (243 lines):** Move to `src/core/state.js`. Consider splitting further later if needed.
*   **`src/constants.js` (184 lines):** Move to `src/core/constants.js`.
*   **`src/projectile.js` (53 lines):** Move to `src/core/projectile.js`.
*   **`src/utils.js` (40 lines):** Move to `src/core/utils.js`.