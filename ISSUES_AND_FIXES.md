# Issues and Fixes Log

This document tracks known issues encountered during development and their resolutions.

## v1.1.13 Fixes (2024-07-26)

### Issue: Instant Game Over after Reset

*   **Problem:** After an AI lost and the game reset, the game would immediately end again with a "Player Won" message as soon as the player made their first move in the new game.
*   **Root Cause:** The `animate` function in `src/gameLoop.js` maintained its own internal state variable (`lastKnownAILostStatus`) to track which AIs were lost. This variable was not being reset correctly by the `resetGame` function. When a new game started, `checkCollisions` was called with the stale "lost" status from the *previous* game, leading it to immediately conclude the new AI was already lost.
*   **Fix:** Removed the internal `lastKnownAILostStatus` variable from `src/gameLoop.js`. The logic was refactored to rely solely on the central state variable `previousFrameAICollisionStatus` (managed in `src/state.js` and correctly reset by `resetGame`). The `animate` function now reads this state before calling `checkCollisions` and updates it afterwards, ensuring the correct status is used across game resets.

*   **Follow-up Issue:** `Uncaught ReferenceError: collisionInfo is not defined`
    *   **Problem:** The refactored logic for removing the AI head mesh upon loss was placed outside the `if (playerMoved || aiMoved)` block. If a frame occurred where neither entity moved, this block was skipped, `collisionInfo` (which holds the results from `checkCollisions`) was not defined, causing an error when the head removal logic tried to access it.
    *   **Fix:** Moved the AI head and ammo indicator removal logic *inside* the `if (playerMoved || aiMoved)` block, ensuring `collisionInfo` is always defined when that code executes.

## v1.1.14 Fixes (2024-07-26)

*(No specific fixes for this version yet, only cleanup and version bump)*

## v1.1.15 Fixes & Changes (2024-07-26)

*   **Opening Dialog:** Updated the introductory text in the opening dialog (`src/ui.js` -> `createOpeningDialog`) to be more general ("Collect points to unlock exciting powerups...") instead of mentioning specific mechanics like trapping the AI or using Ammo. 