# AI Logic Documentation (Powerup Tron)

This document outlines the decision-making process for the AI player (Player 2 / Orange Snake) in the game.

## Core Principles

The AI operates on a priority system within each update cycle (`updateAIPlayer` function):

1.  **Survival First:** Checking for immediate obstacles and choosing the safest path takes precedence over all other actions.
2.  **Pickup Pursuit:** If the immediate path is safe, the AI looks for nearby pickups and attempts to move towards the closest one if a safe move brings it nearer.
3.  **Default Movement:** If the path is safe and no beneficial pickup pursuit move is available, the AI defaults to a high probability of moving straight, otherwise evaluating turns based on available space.

## Key Constants

Several constants influence the AI's behavior:

*   `AI_LOOK_AHEAD_STEPS` (Value: 3): How many grid steps ahead the AI checks for obstacles when evaluating forward movement or potential turns.
*   `AI_PICKUP_SCAN_RADIUS_SQ` (Value: 49): The squared distance within which the AI scans for pickups.
*   `AI_STRAIGHT_BIAS` (Value: 0.9): The probability (90%) that the AI will continue moving straight if its forward path is clear and it's not actively pursuing a pickup.

## Decision Flow (`updateAIPlayer`)

1.  **Check Forward Safety:**
    *   The function first checks `AI_LOOK_AHEAD_STEPS` straight ahead using `isPositionSafe`.
    *   It determines if even the *next* step is safe (`isForwardSafe`) and if the *entire* lookahead path is clear (`isForwardClear`).

2.  **Survival Mode (If Forward Unsafe):**
    *   If `isForwardSafe` is false (the immediate next step is blocked), the AI calls `findBestTurn` to evaluate immediate left and right turns.
    *   If `findBestTurn` returns a safe direction, the AI turns that way.
    *   If neither immediate turn is safe, the AI continues straight (knowingly crashing).

3.  **Pickup Pursuit (If Forward Safe):**
    *   If `isForwardSafe` is true, the AI calls `findTargetPickup` to locate the nearest pickup within `AI_PICKUP_SCAN_RADIUS_SQ`.
    *   If a target is found, it calls `findBestMoveTowards` to check if moving forward, left, or right is safe *and* gets it closer to the target.
    *   If such a move exists, the AI takes it.

4.  **Default Movement (If Forward Safe, No Pursuit):**
    *   If the forward path is safe but no pickup is being pursued (either none are close or no safe move improves distance), the AI proceeds:
        *   If the *entire* forward path is clear (`isForwardClear`) and a random check passes the `AI_STRAIGHT_BIAS`, the AI continues straight.
        *   Otherwise (forward path not fully clear, or random chance dictates a turn), it calls `findBestTurn` to evaluate left/right turns based on lookahead space.
        *   If `findBestTurn` finds a preferred direction, the AI turns.
        *   If `findBestTurn` returns null (e.g., both turns are blocked shortly after the first step), the AI continues straight.

## Helper Functions

*   **`isPositionSafe(pos, checkOwnTrail, checkHeads)`:**
    *   Checks if a given grid-snapped position (`pos`) is within game boundaries and not colliding with any existing trail segments (from both players) or snake heads (optional). Essential for all movement decisions.

*   **`findTargetPickup(currentPos)`:**
    *   Iterates through all active pickup arrays.
    *   Calculates the squared distance from the AI's `currentPos` to each pickup.
    *   Returns the `position` of the closest pickup found within `AI_PICKUP_SCAN_RADIUS_SQ`, or `null` if none are in range.

*   **`findBestMoveTowards(currentPos, currentDir, leftDir, rightDir, targetPos)`:**
    *   Evaluates the immediate safety (`isPositionSafe`) of moving one step forward, left, or right.
    *   For each safe move, calculates the squared distance from the resulting position to the `targetPos`.
    *   Returns the direction (`dir`) of the safe move that results in the *smallest* distance to the target, provided that distance is less than the AI's current distance to the target. Returns `null` if no safe move gets closer.

*   **`findBestTurn(currentPos, leftDir, rightDir)`:**
    *   Checks the immediate safety of turning left and right.
    *   For each *immediately* safe turn, it performs a lookahead (`AI_LOOK_AHEAD_STEPS`) in that new direction using `isPositionSafe` to count how many consecutive steps are clear (`leftSafeSteps`, `rightSafeSteps`).
    *   **Decision Logic:**
        *   If only one turn is immediately safe, returns that direction.
        *   If both are immediately safe, returns the direction with the higher `safeSteps` count.
        *   If both are immediately safe and have equal `safeSteps`, returns a random choice between left and right.
        *   If neither turn is immediately safe, returns `null`. 