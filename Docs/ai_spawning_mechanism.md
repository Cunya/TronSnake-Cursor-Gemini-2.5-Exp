# Delayed AI Spawning Mechanism

This document provides a detailed explanation of the implementation for delaying AI player spawning and adding a visual effect.

## Goal

The primary goal was to prevent AI players from appearing instantly on the game board when created. Instead, a visual cue was intended to show large rings **contracting** towards the spawn location. After a set duration, the AI head mesh appears.

## Implementation Details

The implementation touches several parts of the codebase: constants, state management, AI creation logic, the main game loop, and the position safety check.

### 1. Constants (`src/constants.js`)

Several constants were added to control the spawn duration and the visual effect:

```diff
 // Game Settings & Tunables
 export const ARENA_SIZE = 30;
 
+export const AI_MAX_AMMO = 3;
+export const AI_SHOOT_INTERVAL = 500; // ms between AI shots
+export const AI_SPAWN_DURATION = 2000; // ms for AI spawn delay
+export const AI_SPAWN_RING_MAX_RADIUS = segmentSize * 2.0; // Defines the initial large radius for the rings
+export const AI_SPAWN_RING_DURATION = AI_SPAWN_DURATION; // Match spawn delay
+export const AI_SPAWN_RING_COUNT = 3; // Number of concentric rings
+export const AI_SPAWN_RING_RADIUS_STEP = 0.6; // Multiplier for radius increase per ring (used for staggering appearance)
+export const AI_SPAWN_EFFECT_COLOR = 0x8A2BE2; // BlueViolet (Example)
 // Note: Some other constants like AI_SPAWN_EFFECT_DURATION/MAX_RADIUS/THICKNESS were added but seem unused in the current implementation favouring the specific RING constants.
```

*   `AI_SPAWN_DURATION`: Defines how long (in milliseconds) the AI remains in the 'spawning' state before its head mesh appears and how long the animation should last.
*   `AI_SPAWN_RING_*`: Control the appearance and behavior of the visual effect (color, maximum/initial radius, duration, number of rings, staggering).

### 2. State Management (`src/state.js`)

A new state variable and its setter were added to manage the visual spawn effect objects:

```diff
 // AI Specific State
 export let aiPlayers = [];
+export let aiSpawnRingEffects = []; // <<< ADDED: Array for spawn ring effects
 export let aiTargetUpdateInterval = 1000; // milliseconds
 export let aiDirectionUpdateInterval = 500; // milliseconds
 
 // ... Setters ...
 export const setAiPlayers = (value) => { aiPlayers = value; };
+export const setAiSpawnRingEffects = (value) => { aiSpawnRingEffects = value; }; // <<< ADDED Setter
```

*   `aiSpawnRingEffects`: An array to hold data objects for each active ring effect mesh.

### 3. AI Creation (`src/init.js` - `createNewAIPlayer`)

The core logic change happens when a new AI is created:

```diff
 export function createNewAIPlayer(id, startPos, startDir, colorIndex) {
     // ... (head mesh creation) ...
     aiHeadMesh.position.copy(startPos);
+
+    // scene.add(aiHeadMesh); // DEFERRED: Head is added after spawn delay in gameLoop
 
     // ... (target position finding) ...
 
     const newAI = {
         // ... (id, direction, velocity, etc.) ...
         trailSegments: [],
         colors: aiColors, // Store the assigned colors
+        head: aiHeadMesh,             // <<< ADDED: Store reference to the head mesh
+        isSpawning: true,             // <<< ADDED: Flag to indicate spawning state
+        spawnStartTime: performance.now(), // <<< ADDED: Timestamp when spawning started
+        spawnDuration: AI_SPAWN_DURATION, // <<< ADDED: Duration of the spawn effect/delay
     };
 
-    scene.add(aiHeadMesh);
     aiPlayers.push(newAI);
+    setAiPlayers(aiPlayers);
+
+    // Trigger the visual spawn effect at the AI's starting position
+    const effectPosition = startPos.clone();
+    effectPosition.y = 0; // Place effect on the ground plane
+    createAISpawnRingEffect(effectPosition);
+
     return newAI; // Return the created AI object
 }
```

*   **Deferred Scene Addition:** The `scene.add(aiHeadMesh)` call is removed from this function.
*   **New Properties:** The returned `newAI` object now includes state to manage the spawning delay (`isSpawning`, `spawnStartTime`, `spawnDuration`) and a reference to the `head` mesh.
*   **Visual Effect Trigger:** The `createAISpawnRingEffect` function is called to initiate the visual.

### 4. Visual Effect Creation (`src/init.js` - `createAISpawnRingEffect`)

This new function sets up the ring meshes:

```javascript
export function createAISpawnRingEffect(position) {
    const baseDuration = AI_SPAWN_RING_DURATION / 1000; // Convert ms to seconds
    const baseRadius = AI_SPAWN_RING_MAX_RADIUS; // Base radius for the rings
    const startTime = performance.now();

    for (let i = 0; i < AI_SPAWN_RING_COUNT; i++) {
        // Calculate radii for staggered appearance
        const outerRadius = baseRadius * (1 + i * AI_SPAWN_RING_RADIUS_STEP);
        const innerRadius = outerRadius - segmentSize * 0.1; // Make the ring thin
        const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: AI_SPAWN_EFFECT_COLOR,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });

        const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
        ringMesh.position.copy(position);
        ringMesh.rotation.x = -Math.PI / 2; // Rotate to lay flat on XZ plane
        ringMesh.scale.setScalar(0.1); // Initialize scale - NOTE: starts small for the *current* expanding animation

        const effectData = {
            mesh: ringMesh,
            material: ringMaterial,
            startTime: startTime + i * 100, // Stagger start times slightly
            duration: baseDuration * (1 + i * 0.1), // Slightly longer duration for outer rings
            maxRadius: outerRadius, // Store for potential reference
        };

        aiSpawnRingEffects.push(effectData);
        scene.add(ringMesh);
    }
}
```

*   It creates `AI_SPAWN_RING_COUNT` ring meshes with slightly different radii and start times/durations for a staggered effect.
*   **Initial State:** The rings are created with a small scale (`scale.setScalar(0.1)`) and added to the scene immediately.

### 5. Game Loop Integration (`src/gameLoop.js` - `animate`)

Two new loops were added to the `animate` function:

**a) Update Ring Effect Animation:**

*   **Intended Behavior:** The rings should start large (e.g., scale based on `AI_SPAWN_RING_MAX_RADIUS`) and contract inwards (scale decreasing towards 0 or a small value) over their `duration`, while also fading out.
*   **Current Implementation:** The code currently implements the *opposite* behavior.

```diff
+    // <<< ADDED: Update AI Spawn Ring Effects >>>
+    for (let i = aiSpawnRingEffects.length - 1; i >= 0; i--) {
+        const effect = aiSpawnRingEffects[i];
+        const elapsed = currentTime - effect.startTime;
+        if (elapsed >= effect.duration) {
+            // Remove effect when done
+            scene.remove(effect.mesh);
+            aiSpawnRingEffects.splice(i, 1);
+        } else {
+            // Update scale and opacity based on progress
+            const progress = elapsed / effect.duration;
+            // CURRENT SCALING LOGIC (EXPANDING):
+            effect.mesh.scale.setScalar(1.0 + progress * 2.0);
+            // OPACITY FADE:
+            effect.material.opacity = 1.0 - progress;
+        }
+    }
```
*   **Current Behavior Analysis:**
    *   The loop iterates through active `aiSpawnRingEffects`.
    *   It removes effects that have exceeded their duration.
    *   For active effects, it calculates `progress` (0 to 1).
    *   The line `effect.mesh.scale.setScalar(1.0 + progress * 2.0)` causes the scale to animate from `1.0` (at `progress = 0`) up to `3.0` (at `progress = 1`). This makes the rings **expand outwards**.
    *   The opacity correctly fades from `1.0` down to `0.0`.
*   **To achieve the intended contracting effect:** The scaling logic needs modification. For example, it might look something like `effect.mesh.scale.setScalar(INITIAL_LARGE_SCALE * (1.0 - progress))`, where `INITIAL_LARGE_SCALE` is determined based on the desired starting size.

**b) Check for Spawning Completion:**

```diff
+    // <<< ADDED: Check for AI Spawning Completion >>>
+    for (const ai of aiPlayers) {
+        // Check if the AI is in the spawning state and its head mesh exists but hasn't been added yet
+        if (ai.isSpawning && ai.head) {
+            const elapsedSpawnTime = currentTime - ai.spawnStartTime;
+            // If the spawn duration has passed
+            if (elapsedSpawnTime >= ai.spawnDuration) {
+                // Add the AI's head mesh to the scene
+                scene.add(ai.head);
+                // Mark the AI as no longer spawning
+                ai.isSpawning = false;
+            }
+        }
+    }
```
*   This loop checks each AI player.
*   If an AI `isSpawning` and the `elapsedSpawnTime` has reached the `spawnDuration`, its head mesh is added to the scene, and the `isSpawning` flag is set to `false`.

### 6. Position Safety Check (`src/ai.js` - `isPositionSafe`)

To ensure AI could spawn reliably, the `isPositionSafe` function was modified to optionally skip checking against pickups during spawn checks:

```diff
-export function isPositionSafe(pos, aiToCheck, checkOwnTrail = true, checkHeads = true) {
+export function isPositionSafe(pos, aiToCheck, checkOwnTrail = true, checkHeads = true, isSpawnCheck = false) {
 // ... (other checks) ...
+    // --- Check against existing pickups ONLY if not a spawn check ---
+    if (!isSpawnCheck) {
+        // ... (logic to check against pickup positions)
+    }
     return true;
 }
```
*   The `isSpawnCheck = true` argument is used when finding the initial AI spawn position in `src/init.js`, preventing collisions with potentially nearby pickups from blocking the spawn.

## Summary

By deferring the addition of the AI head mesh to the scene, adding state properties to track the spawning process, creating a visual ring effect, and updating the game loop, the delayed AI spawning feature was implemented. However, the current animation logic for the visual effect causes the rings to **expand outwards**, contrary to the intended design of **contracting inwards**. The code requires modification to achieve the intended visual behavior. 