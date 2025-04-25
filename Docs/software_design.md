# Software Design Documentation - Powerup Tron

## 1. Overview

This document details the software design and architecture of the "Powerup Tron" browser game. The game is implemented using JavaScript and the Three.js library for 3D rendering.

It features a player-controlled snake competing against an AI opponent in a dynamically sized arena. The core gameplay involves collecting powerups, avoiding collisions with walls and opponents, and achieving a high score.

## 2. Core Components

*   **Three.js Setup (`init` function):**
    *   Initializes the `scene`, `camera` (PerspectiveCamera), and `renderer` (WebGLRenderer).
    *   Sets up basic lighting (ambient and directional).
    *   Creates the initial play area visuals (plane and grid).
    *   Initializes player and AI snake heads (`snakeHead1`, `snakeHead2`) and their logical positions (`snakeTargetPosition1`, `snakeTargetPosition2`).
    *   Sets up event listeners (resize, keyboard, touch, click).
    *   Loads assets (font) and retrieves top score from `localStorage`.
    *   Creates UI elements (dialogs, score displays).
    *   Spawns initial pickups.
    *   Starts the main game loop (`animate`).

*   **Game Loop (`animate` function):**
    *   Uses `requestAnimationFrame` for continuous rendering.
    *   Calculates delta time for physics and timing.
    *   **Game Logic Update (if `gameActive` and not `isGameOver`):**
        *   Handles player/AI powerup effect expiry (speed boost, zoom, sparse trail).
        *   Checks timing intervals (`normalUpdateInterval`, `boostedUpdateInterval`) for player and AI movement updates.
        *   If interval passed:
            *   Updates player score (`scoreP1`).
            *   Checks for dynamic unlocks (`checkUnlocks`).
            *   Updates logical target positions (`snakeTargetPosition1`, `snakeTargetPosition2`) based on current direction (`snakeDirection1`, `snakeDirection2`).
            *   Calls AI logic (`updateAIPlayer`).
            *   Calls pickup collision checks for both player and AI.
            *   Checks for game-ending collisions (`checkCollisions`).
            *   Conditionally creates trail segments (`createTrailSegment`), accounting for sparse trail effect.
            *   Handles game over state transition (update score, show message).
    *   **Visual Updates (Every Frame):**
        *   Updates visibility of last trail segments.
        *   Lerps visual snake head positions towards logical target positions.
        *   Updates score/top score displays.
        *   Updates camera position and look-at target based on game state (following player, looking back, game over overview).
        *   Updates projectile positions and particle effects.
        *   Calls `renderer.render(scene, camera)`.

## 3. Player Control

*   **Keyboard (`onKeyDown`, `onKeyUp`):**
    *   Arrow Keys: Left/Right for turning (applies rotation to `snakeDirection1`). Down (hold) to activate look-back camera (`isLookingBack` flag).
    *   Spacebar: Fires a projectile if ammo is available (`shootProjectile`).
    *   Any key press restarts the game if `isGameOver` is true.
*   **Touch (`onTouchStart`, `onTouchEnd`):**
    *   Divides the screen into zones (Top: Shoot, Middle: Turn, Bottom: Look Back).
    *   Top third tap: Calls `shootProjectile`.
    *   Middle section tap: Left/Right side determines turn direction for `snakeDirection1`.
    *   Bottom third tap: Sets `isLookingBack` flag and tracks `lookBackTouchId`. Releasing the touch clears the flag.
    *   Any touch restarts the game if `isGameOver` is true.

## 4. AI Logic (`updateAIPlayer` and Helpers)

*   Operates based on a priority system: Survival > Pickup Pursuit > Default Movement.
*   Uses lookahead (`AI_LOOK_AHEAD_STEPS`) to check path safety (`isPositionSafe`).
*   Evaluates potential turns based on available space (`findBestTurn`).
*   Scans for nearby pickups (`findTargetPickup`) and determines best move towards them (`findBestMoveTowards`).
*   Includes logic to shoot at player trails or its own blocking trail if ammo is available.
*   *(Refer to `docs/ai_logic.md` for a detailed breakdown)*.

## 5. Powerup System

*   **Spawning (`spawnPickup`, `trySpawn`, `spawnInitialPickups`):**
    *   `spawnInitialPickups`: Determines types eligible based on `topScore` and calls `spawnPickup` forcing those types.
    *   `spawnPickup`: Handles main spawning logic.
        *   Checks for extra spawns (Clear, Ammo) based on `pickupsCollectedCounter` modulo conditions.
        *   If `forceType` is null, determines eligible types based on `scoreP1` (for unlock) and `pickupsCollectedCounter` (for counter-based spawns) and current counts vs max counts.
        *   Includes fallback logic to ensure basic types can spawn if no counter types are eligible.
        *   Calls `trySpawn` for the primary (forced or selected) type.
        *   Conditionally calls `trySpawn` for extra types if flags are set.
    *   `trySpawn`: Handles placing a specific pickup type in a valid location (random position, checks `isPositionSafe`, `isCellAdjacentToWall`).
*   **Collection (`check...Collision`, `checkAI...Collision`):**
    *   Separate functions for each pickup type and for Player/AI.
    *   Check distance between snake target position and pickup positions.
    *   On collision: award points (`scoreP1`), apply effects (update state variables like `isSpeedBoostActiveP1`, `ammoCountAI`, etc.), increment `pickupsCollectedCounter`, trigger visual effects (`createExplosionEffect`, `createFloatingText`), remove pickup mesh, update ammo indicator (`updateAmmoIndicatorP1/AI`).
    *   Call appropriate `spawnPickup` logic (either forced self-replacement or no spawn for counter-based pickups).
*   **Effects:** Handled via state variables checked in the `animate` loop (e.g., `isSpeedBoostActiveP1`, `isSparseTrailActiveAI`) or directly applied on collection (e.g., `Clear Walls`, `Expand`). Ammo effect handled via `shootProjectile`.
*   **Unlock Notification (`checkUnlocks`):** Called when `scoreP1` increases. Checks score against `UNLOCK_THRESHOLDS`, tracks unlocks per game via `unlockedScoresThisGame` Set, displays floating text, and triggers an initial spawn of the unlocked type.

## 6. Game State Management

*   **`gameActive` flag:** Controls whether core game logic (movement, collision checks) runs in `animate`. Set true by `startGame` or `resetGame`, false initially.
*   **`isGameOver` flag:** Controls game over behavior (stops movement logic, changes camera, enables restart). Set true when `checkCollisions` returns non-zero.
*   **`winner` variable:** Stores result from `checkCollisions` (0: ongoing, 1: P1 lost, 2: AI lost, 3: Draw).
*   **`startGame`:** Called on first interaction. Sets `gameActive` to true, hides opening dialog.
*   **`resetGame`:** Called on restart. Resets scores, flags, positions, directions, trails, pickups, particles, texts, ammo, unlock tracking, boundaries, max counts. Calls `spawnInitialPickups` and sets `gameActive` true.

## 7. UI Components

*   **Dialogs (`createOpeningDialog`, `createGameOverText`, `showGameOverMessage`):**
    *   Uses absolutely positioned HTML `div` elements.
    *   Dynamically generates content using `getUnlockStatusText` helper.
    *   Handles display based on game state (`gameActive`, `isGameOver`).
*   **Score/Version Displays (`createScoreText`, `createTopScoreText`, `createVersionText`):**
    *   Absolutely positioned HTML `div` elements updated in `animate` or `resetGame`/`showGameOverMessage`.
*   **Floating Text (`createFloatingText`):** Creates temporary 3D text geometry (using loaded font) that floats upwards and fades out. Managed in `animate` loop.
*   **Ammo Indicator (`updateAmmoIndicatorP1`, `updateAmmoIndicatorAI`):** Creates/updates a `THREE.Group` containing small cubes positioned above the snake's head, reflecting current ammo count. Position updated in `animate`.

## 8. Visual Effects

*   **Particle Explosions (`createExplosionEffect`):** Creates multiple small meshes at a position with randomized outward velocity. Managed in `animate` loop (gravity, ground collision, fade out).
*   **Projectile Trails:** Small particles emitted behind projectiles each frame. Managed in `animate` loop (fade out, removal).

*This document should be kept up-to-date as the codebase evolves.* 