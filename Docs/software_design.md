# Software Design Documentation - Powerup Tron

## 1. Overview

This document details the software design and architecture of the "Powerup Tron" browser game. The game is implemented using JavaScript and the Three.js library for 3D rendering.

It features a player-controlled snake competing against an AI opponent in a dynamically sized arena. The core gameplay involves collecting powerups, avoiding collisions with walls and opponents, and achieving a high score.

## 2. Core Components

*   **Initialization (`init.js` -> `init` function):**
    *   Initializes the `scene`, `camera` (PerspectiveCamera), and `renderer` (WebGLRenderer).
    *   Sets up basic lighting (ambient and directional).
    *   Creates the initial play area visuals (plane and grid).
    *   Initializes player and AI snake heads (`snakeHead1`, `snakeHead2`) and their logical positions (`snakeTargetPosition1`, `snakeTargetPosition2`).
    *   Sets up event listeners (resize, keyboard, touch, click).
    *   Loads assets (font) and retrieves top score from `localStorage`.
    *   **Initializes State:** Sets initial `topScore`, `topScoreAtGameStart`, resets game over related flags (`isGameOver`, `isGameOverCameraActive`, `playerLostTime`, `aiDefeatedTime`, `deathZoomFactor`).
    *   Creates UI elements (dialogs, score displays).
    *   **Initializes Pickup Templates:** Calls `initializePickupTemplates` *after* font loading.
    *   **Spawns Initial Pickups:** Calls `spawnInitialPickups` *after* templates are initialized.
    *   Starts the main game loop (`animate`).

*   **Game Loop (`gameLoop.js` -> `animate` function):**
    *   Handles the main game update and rendering cycle.
    *   Uses `requestAnimationFrame` for continuous rendering.
    *   Calculates delta time (`deltaTimeSeconds`) for physics and timing.
    *   **Game Logic Update (if `gameActive` and not `isGameOver`):**
        *   Handles player/AI powerup effect expiry (speed boost, zoom, sparse trail).
        *   Checks timing intervals (`normalUpdateInterval`, `boostedUpdateInterval`) for player and AI movement updates.
        *   If interval passed:
            *   Updates player score (`scoreP1`). (Unlock check moved to pickup collection).
            *   Updates logical target positions (`snakeTargetPosition1`, `snakeTargetPosition2`) based on current direction (`snakeDirection1`, `snakeDirection2`).
            *   Calls AI logic (`updateAIPlayer`).
            *   Calls pickup collision checks for both player and AI.
            *   Checks for game-ending collisions (`checkCollisions`).
                *   If collision detected (`winnerCode !== 0`):
                    *   Sets `isGameOver = true` (only once).
                    *   Sets appropriate timestamp (`playerLostTime` or `aiDefeatedTime`).
                    *   Resets `deathZoomFactor` to 1.0.
                    *   Attaches game over pointer listeners (`addGameOverPointerListeners`).
                    *   Resets game over dialog UI state (`resetGameOverDialogState`).
                    *   Updates head colors based on winner/loser.
            *   Conditionally creates trail segments (`createTrailSegment`), accounting for sparse trail effect.
    *   **Game Over Message/Camera Activation (if `isGameOver`):**
        *   Calculates `timeSinceGameOver` based on the relevant timestamp (`playerLostTime` or `aiDefeatedTime`).
        *   If `timeSinceGameOver >= 5000` (and message not already shown):
            *   Activates the game over camera state (`setIsGameOverCameraActive(true)`).
            *   Calculates initial game over camera target/position/offset.
            *   Calls `showGameOverMessage(winner)`. // Now safe to show
        *   If `timeSinceGameOver < 5000`, hides the game over dialog element.
    *   **Visual Updates (Every Frame):**
        *   Updates visibility of last trail segments (if not `isGameOver`).
        *   Lerps visual snake head positions (if not `isGameOver`).
        *   Updates score/top score displays (`updateScoreDisplay`).
        *   Updates camera position and look-at target based on game state:
            *   **Normal Play:** Follow player, apply player zoom.
            *   **Game Over Delay (`isGameOver && !isGameOverCameraActive`):** Follow player's last position, apply slow zoom-out effect (`deathZoomFactor` interpolation).
            *   **Interactive Game Over (`isGameOverCameraActive`):** Use interactive camera controls (drag, pan, zoom) based on `gameOverLookAtTarget` and `gameOverCameraOffset`.
            *   **Pre-Game:** Static initial view.
        *   Updates projectile positions and particle effects.
        *   Updates ammo indicator positions and rotations.
        *   Calls `renderer.render(scene, camera)`.

*   **State Management (`state.js`):**
    *   Exports `let` variables for mutable game state (positions, flags, arrays, UI element references, etc.).
    *   Exports `const` for immutable data (e.g., pickup geometry/materials loaded from `constants.js`).
    *   Provides setter functions (`set...`) for modifying state variables from other modules. This is crucial because ES6 module imports are live bindings but cannot be reassigned directly by the importing module.
    *   **Key State:** `gameActive`, `isGameOver`, `isGameOverCameraActive`, `playerLostTime`, `aiDefeatedTime`, `deathZoomFactor`, `scoreP1`, `topScore`, `topScoreAtGameStart`, `pickupsCollectedCounter`, player/AI states (position, direction, boost, sparse, ammo), pickup arrays, max pickup counts, particle/text arrays, boundary limits, UI element refs.
    *   **Counter Spawn State:** `nextAmmoSpawnCount`, `nextClearSpawnCount`, `nextAddAiSpawnCount`, `nextExpansionSpawnCount`, `nextMultiSpawnCount` track the next `pickupsCollectedCounter` threshold for spawning these types.

## 3. Player Control (`playerControls.js`)

*   Exports event handlers (`onKeyDown`, `onTouchStart`, etc.).
*   **Keyboard (`onKeyDown`):**
    *   Checks `isGameOver` first; if true, calls `resetGame` (works during 5s delay).
    *   Checks pause toggle (`Escape`).
    *   Checks `!gameActive` next; if true, calls `startGame`.
    *   Handles gameplay keys (Arrows, Spacebar).
*   **Touch (`onTouchStart`):**
    *   Checks `isGameOver` first; if true, initiates potential game over camera drag (`handleGameOverPointerDown`) and returns.
    *   Checks `!gameActive` next; if true, calls `startGame` and returns.
    *   Handles gameplay touch zones (Shoot, Turn, Look Back).
*   **Click (`handleFirstClick`):** Calls `startGame`. Listener removed after first call.
*   **`startGame` function:** Sets `gameActive` true, hides `openingDialogElement`, removes initial click listener.

## 4. AI Logic (`ai.js` -> `updateAIPlayer`, etc.)

*   Operates based on a priority system: Survival > Pickup Pursuit > Default Movement.
*   Uses lookahead (`AI_LOOK_AHEAD_STEPS`) to check path safety (`isPositionSafe`).
*   Evaluates potential turns based on available space (`findBestTurn`).
*   Scans for nearby pickups (`findTargetPickup`) and determines best move towards them (`findBestMoveTowards`).
*   Includes logic to shoot at player trails or its own blocking trail if ammo is available (`aiShootProjectile`).
*   *(Refer to `docs/ai_logic.md` for a detailed breakdown)*.

## 5. Powerup System (`pickups.js`)

*   **Spawning Logic:**
    *   **Initialization (`spawnInitialPickups`):** Called *once* during `init` after templates are ready and *once* during `resetGame` after clearing. Determines types eligible based purely on `topScore` (excluding counter-based types). Attempts to spawn up to 3 *randomly selected* eligible types by calling `spawnPickup` with `forceType`.
    *   **Runtime Spawning:**
        *   **Score/Utility Types (`spawnPickup`):** Called when a score/zoom/sparse pickup is collected. Spawns another of the same type.
        *   **Counter Types (`checkAndSpawnCounterPickups`):** Called *whenever* `pickupsCollectedCounter` is incremented (via helpers `handleScoreUpdateAndCounters` or `handleAICounterUpdate` called from collision handlers). Checks `pickupsCollectedCounter` against the `next...SpawnCount` for each counter type (Ammo, Clear, AddAI, Expand, Multi). If threshold met and max count not reached, calls `trySpawn` for that specific type and updates the `next...SpawnCount` threshold.
    *   **Core Spawning (`trySpawn`):** Handles placing a specific pickup type in a valid grid location (random position, checks `isPositionSafe` against trails/pickups, checks `isCellAdjacentToWall`). Clones template visuals (`sparseTrailPickupTemplate`, `ammoPickupTemplate`) if needed.
*   **Collection (`check...Collision`, `checkAI...Collision`):**
    *   Separate functions for each pickup type and for Player/AI.
    *   Check distance between snake target position and pickup positions.
    *   On collision: remove pickup mesh, trigger visual effects (`createExplosionEffect`, `createFloatingText`), call appropriate helper (`handleScoreUpdateAndCounters` or `handleAICounterUpdate`).
    *   `handleScoreUpdateAndCounters`: Updates `scoreP1`, calls `checkUnlocks`, increments `pickupsCollectedCounter`, calls `checkAndSpawnCounterPickups`.
    *   `handleAICounterUpdate`: Increments `pickupsCollectedCounter`, calls `checkAndSpawnCounterPickups`.
    *   Score/Zoom/Sparse types also call `spawnPickup` to replace themselves. Counter types do not replace themselves directly on collection.
*   **Unlock Notification (`checkUnlocks`):** Called only from `handleScoreUpdateAndCounters` when score increases via pickup collection. Checks `currentScore` against `UNLOCK_THRESHOLDS`. If threshold met first time this game *and* `unlock.score > topScoreAtGameStart`, displays floating text and triggers `spawnPickup(unlock.type)` for the newly unlocked item.
*   **Multi-Spawn (`checkMultiSpawnPickupCollision`):** When collected, increases max count for 2 random non-counter eligible types and spawns one of each using `spawnPickup`.

## 6. Game State Management & Initialization Flow

*   **`init()`:**
    *   Sets up Three.js basics.
    *   Loads font (asynchronous).
    *   *Font Load Callback:* Loads `topScore`, sets `topScore` and `topScoreAtGameStart`, creates UI, initializes pickup templates, calls `spawnInitialPickups`, starts `animate` loop.
*   **`startGame()`:** Called by first user interaction. Hides opening dialog, sets `gameActive`.
*   **`resetGame()`:** Called on restart after game over. Resets flags (`isGameOver`, `gameActive`), scores (`scoreP1`), counters (`pickupsCollectedCounter`, `next...SpawnCount`), positions, directions, powerup states, clears visuals (trails, texts, particles, projectiles, *pickups*), resets max pickup counts, calls `spawnInitialPickups`.
*   **State Variables:** Crucial for decoupling modules. Most state resides in `state.js` and is modified via imported setter functions.

## 7. UI Components (`ui.js`)

*   **Creation Functions (`create...`):** Create HTML elements, style them, append to body, and importantly, store references in `state.js` via setters (`setOpeningDialogElement`, etc.).
*   **Dialogs (`openingDialogElement`, `gameOverTextElement`):** 
    *   Opening dialog hidden by `startGame`.
    *   Game Over dialog visibility controlled by `animate` loop based on the 5-second delay logic.
    *   Game Over dialog content populated by `showGameOverMessage` (called after delay).
    *   Game Over dialog has internal state (`isGameOverDialogMinimized`) and logic (`updateGameOverDialogAppearance`) for minimize/maximize toggle via its `_`/`+` button.
*   **Score/Version Displays:** Updated by `updateScoreDisplay` (called in `animate`) and `createVersionText` / `createTopScoreText`.
*   **Floating Text (`createFloatingText`):** Creates temporary 3D text geometry. Managed in `animate` loop.
*   **Ammo Indicator (`updateAmmoIndicatorP1`, `updateAmmoIndicatorAI`):** Creates/updates a `THREE.Group` containing cubes above the snake head. Called during init/reset and on ammo count change. Position/rotation updated in `animate`.
*   **Game Over Pointer Listeners (`addGameOverPointerListeners`, `removeGameOverPointerListeners`):** Functions exported to attach/detach the initial `mousedown`, `touchstart`, `wheel` listeners used for the interactive game over camera. Called from `gameLoop.js` and `init.js` (reset).

## 8. Visual Effects (`visuals.js`)

*   Provides functions to create/manage visual elements:
    *   `createTrailSegment`
    *   `createExplosionEffect`
    *   `createFloatingText`
    *   `initializePickupTemplates` (creates visuals for sparse/ammo pickups, stores in state)
    *   `updateAmmoIndicatorP1/AI`
    *   `createPlayAreaVisuals`
    *   Helper functions to clear effects (`clearAllTrails`, `clearFloatingTexts`, etc.) or manage colors (`revertHeadColors`, `setHeadColorToRed`).

*This document should be kept up-to-date as the codebase evolves.*