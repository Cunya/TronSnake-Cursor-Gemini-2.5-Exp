import * as THREE from 'three';
import { 
    scene, scoreP1, topScore, pickupsCollectedCounter, snakeTargetPosition1, 
    snakeDirection1, isSpeedBoostActiveP1, isZoomedOutP1, isSparseTrailActiveP1, 
    speedLevelP1, // <-- IMPORT speed levels
    scorePickups, expansionPickups, clearPickups, zoomPickups, sparseTrailPickups, multiSpawnPickups, addAiPickups, ammoPickups, 
    maxScorePickups, maxExpansionPickups, maxClearPickups, maxZoomPickups, maxSparseTrailPickups, maxAmmoPickups, maxMultiSpawnPickups, maxAddAiPickups, 
    topScoreAtGameStart, unlockedScoresThisGame, snakeHead1, boundaryXMin, boundaryXMax, boundaryZMin, boundaryZMax, zoomLevelP1, zoomOutEndTimeP1, sparseLevelP1, sparseTrailEndTimeP1, 
    trailSegments1, // Needed for wall checks
    // Pickup Templates
    sparseTrailPickupTemplate, ammoPickupTemplate,
    gameActive, // <<< ADD gameActive import
    // State Setters
    setSpeedBoostActiveP1, setSpeedBoostEndTimeP1, setIsZoomedOutP1, setZoomOutEndTimeP1, setZoomLevelP1, 
    setIsSparseTrailActiveP1, setSparseTrailEndTimeP1, setTrailCounterP1, setSparseLevelP1, 
    setPickupsCollectedCounter, setBoundaryXMax, setBoundaryXMin, setBoundaryZMax, setBoundaryZMin,
    setMaxScorePickups, setMaxExpansionPickups, setMaxClearPickups, setMaxZoomPickups, setMaxSparseTrailPickups, setMaxMultiSpawnPickups, setMaxAddAiPickups, setMaxAmmoPickups,
    setAmmoCountP1, setScoreP1, setSpeedLevelP1, // <-- IMPORT setter
    ammoCountP1, // <-- IMPORT state variable
    // Import new state vars and setters for counter tracking
    nextAmmoSpawnCount, nextClearSpawnCount, nextAddAiSpawnCount, nextExpansionSpawnCount, nextMultiSpawnCount, 
    setNextAmmoSpawnCount, setNextClearSpawnCount, setNextAddAiSpawnCount, setNextExpansionSpawnCount, setNextMultiSpawnCount,
    aiPlayers // <-- IMPORT aiPlayers array
} from './state.js';
import { 
    segmentSize, GROUND_Y, boostDuration, zoomOutDuration, sparseTrailDuration, expansionAmount, 
    PICKUP_COLLISION_THRESHOLD_SQ, CLEAR_WALL_PICKUP_THRESHOLD, ADD_AI_PICKUP_THRESHOLD, EXPAND_PICKUP_THRESHOLD, AMMO_PICKUP_THRESHOLD, MULTI_PICKUP_THRESHOLD,
    UNLOCK_THRESHOLDS,
    // Geometries & Materials
    scorePickupGeometry, scorePickupMaterial, expansionPickupGeometry, expansionPickupMaterial, 
    clearPickupGeometry, clearPickupMaterial, zoomPickupGeometry, zoomPickupMaterial, 
    sparseTrailMaterial, ammoPickupMaterial,
    multiSpawnGeometry, multiSpawnMaterial, addAiPickupGeometry, addAiPickupMaterial,
    AMMO_PICKUP_RADIUS, P1_HEAD_COLOR_BOOST,
    SPEED_BOOST_SCORE_MULTIPLIER,
    // Import spawn effect durations for fade-in timing
    SPAWN_EFFECT_DURATION_EXPAND, 
    SPAWN_EFFECT_DURATION_LINGER,
} from './constants.js';
import { snapToGridCenter, logTotalPickupCount, getGridDimensions } from './utils.js';
import { 
    createExplosionEffect, createFloatingText, updateAmmoIndicatorP1, updateAmmoIndicatorAI, 
    clearAllTrails, createPlayAreaVisuals, createPickupSpawnEffect
} from './visuals.js';
import { isPositionSafe } from './ai.js'; // Need isPositionSafe for spawning
import { createNewAIPlayer } from './init.js'; // Need the helper from init

// Helper to get max count for a type (Internal to pickups module)
function getMaxForType(pickupType) {
    switch (pickupType) {
        case "multi": return maxMultiSpawnPickups;
        case "sparse": return maxSparseTrailPickups;
        case "zoom": return maxZoomPickups;
        case "clear": return maxClearPickups;
        case "expansion": return maxExpansionPickups;
        case "score": return maxScorePickups;
        case "add_ai": return maxAddAiPickups;
        case "ammo": return maxAmmoPickups;
        default: return Infinity;
    }
}

// Helper to check if a grid cell contains a wall (Internal)
function isCellWall(gridX, gridZ) {
    // Need boundaryXMin, boundaryZMin, trailSegments1, aiPlayers from state
    const worldX = snapToGridCenter(boundaryXMin + gridX * segmentSize, 'x');
    const worldZ = snapToGridCenter(boundaryZMin + gridZ * segmentSize, 'z');
    const checkPos = new THREE.Vector3(worldX, 0, worldZ); 
    const wallCheckThreshold = segmentSize * 0.45; 

    // Check player 1 trail
    for (const seg of trailSegments1) {
        if (checkPos.distanceTo(seg.position) < wallCheckThreshold) {
            return true; 
        }
    }
    // Check AI trails
    for (const ai of aiPlayers) { 
        for (const seg of ai.trailSegments) {
            if (checkPos.distanceTo(seg.position) < wallCheckThreshold) {
                return true;
            }
        }
    }
    return false; 
}

// Helper to check if any adjacent cell has a wall (Internal)
function isCellAdjacentToWall(gridX, gridZ) {
    const { divisionsX, divisionsZ } = getGridDimensions();
    const neighbors = [
        { dx: 1, dz: 0 }, { dx: -1, dz: 0 }, { dx: 0, dz: 1 }, { dx: 0, dz: -1 }
    ];
    for (const neighbor of neighbors) {
        const checkX = gridX + neighbor.dx;
        const checkZ = gridZ + neighbor.dz;
        if (checkX < 0 || checkX >= divisionsX || checkZ < 0 || checkZ >= divisionsZ) {
            continue; 
        }
        if (isCellWall(checkX, checkZ)) {
            return true; 
        }
    }
    return false; 
}

// Helper function to contain the actual spawning logic (Internal)
// MODIFIED: Returns object { success: boolean, pickup: object | null }
function trySpawn(typeToSpawn) {
    console.log(`  [trySpawn] Attempting to spawn type: ${typeToSpawn}`); // <<< UNCOMMENTED Log entry
    if (!typeToSpawn) {
        console.warn("  [trySpawn] Called with no type.");
        return { success: false, pickup: null };
    }

    let geometry, material, targetArray, pickupHeight;
    let pickupVisual;
    let spawnTypeName = typeToSpawn;

    switch (typeToSpawn) {
        case "multi":
            pickupVisual = new THREE.Mesh(multiSpawnGeometry, multiSpawnMaterial.clone());
            targetArray = multiSpawnPickups;
            pickupHeight = segmentSize * 0.45 * 2;
            break;
        case "sparse":
            pickupVisual = sparseTrailPickupTemplate; // Needs state.sparseTrailPickupTemplate
            targetArray = sparseTrailPickups;
            pickupHeight = (segmentSize * 0.27 * 2) + 0.3;
            break;
        case "zoom":
            pickupVisual = new THREE.Mesh(zoomPickupGeometry, zoomPickupMaterial.clone());
            targetArray = zoomPickups;
            pickupHeight = segmentSize * 0.5;
            break;
        case "clear":
            pickupVisual = new THREE.Mesh(clearPickupGeometry, clearPickupMaterial.clone());
            targetArray = clearPickups;
            pickupHeight = segmentSize * 0.5;
            break;
        case "expansion":
            pickupVisual = new THREE.Mesh(expansionPickupGeometry, expansionPickupMaterial.clone());
            targetArray = expansionPickups;
            pickupHeight = segmentSize * 0.7;
            break;
        case "score":
            pickupVisual = new THREE.Mesh(scorePickupGeometry, scorePickupMaterial.clone());
            targetArray = scorePickups;
            pickupHeight = segmentSize * 0.6;
            spawnTypeName = "score";
            break;
        case "add_ai":
            pickupVisual = new THREE.Mesh(addAiPickupGeometry, addAiPickupMaterial.clone());
            targetArray = addAiPickups;
            pickupHeight = segmentSize * 0.6 * 2;
            break;
        case "ammo":
            pickupVisual = ammoPickupTemplate?.clone(); // Needs state.ammoPickupTemplate
            targetArray = ammoPickups;
            pickupHeight = AMMO_PICKUP_RADIUS * 2;
            break;
        default:
            console.error(`trySpawn: Unknown pickup type requested: ${typeToSpawn}`);
            return { success: false, pickup: null };
    }

    if (!pickupVisual) {
        console.error(`  [trySpawn] Could not create visual for type: ${typeToSpawn}. Template might be missing.`);
        return { success: false, pickup: null };
    }

    const currentMax = getMaxForType(typeToSpawn);
    // console.log(`  [trySpawn] Check: Current count ${targetArray.length}, Max allowed ${currentMax} for type ${typeToSpawn}`); // Keep commented
    if (targetArray.length >= currentMax) {
        console.log(`  [trySpawn] Max reached for type ${typeToSpawn}.`);
        return { success: false, pickup: null };
    }

    const maxAttempts = 50;
    const { divisionsX, divisionsZ } = getGridDimensions(); 
    console.log(`  [trySpawn] Starting position search (max ${maxAttempts} attempts)...`); // <<< UNCOMMENTED Log search start
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const gridX = Math.floor(Math.random() * divisionsX);
        const gridZ = Math.floor(Math.random() * divisionsZ);
        const worldX = snapToGridCenter(boundaryXMin + gridX * segmentSize, 'x');
        const worldZ = snapToGridCenter(boundaryZMin + gridZ * segmentSize, 'z');
        const worldY = GROUND_Y + (pickupHeight / 2.0); 
        const potentialPos = new THREE.Vector3(worldX, worldY, worldZ);
        
        // Use isPositionSafe with isSpawnCheck=true (checks boundaries, pickups, and trails with larger threshold)
        const baseSafe = isPositionSafe(potentialPos, null, true, false); 

        const adjacent = isCellAdjacentToWall(gridX, gridZ);
        
        console.log(`  [trySpawn attempt ${attempt+1}] Pos:(${potentialPos.x.toFixed(1)},${potentialPos.z.toFixed(1)}), Safe:${baseSafe}, Adjacent:${adjacent}`); // <<< ADDED DETAILED LOG

        // Use only baseSafe result now
        if (baseSafe) { 
            if (!adjacent) {
                const pickup = pickupVisual.clone();
                pickup.position.copy(potentialPos);

                // Make pickup initially invisible, flag for later fade-in
                if (typeToSpawn === "sparse") {
                     // Special handling for Sparse Trail Group
                    pickup.traverse((child) => {
                        if (child.isMesh && child.material) {
                            child.material = child.material.clone(); // Ensure unique material for opacity
                            child.material.transparent = true;
                            child.material.opacity = 0;
                        }
                    });
                    pickup.needsFadeIn = true;
                    // MODIFIED: Use a fixed fade-in duration (e.g., 1000ms)
                    pickup.spawnFadeInDuration = 1000; 
                } else if (pickup.material) {
                    // Standard handling for single meshes
                    pickup.material.transparent = true;
                    pickup.material.opacity = 0;
                    pickup.needsFadeIn = true;
                    // MODIFIED: Use a fixed fade-in duration (e.g., 1000ms)
                    pickup.spawnFadeInDuration = 1000; 
                } else {
                    // Handle objects without material (if any others exist) - appear instantly
                    pickup.isSpawning = false; 
                    pickup.needsFadeIn = false;
                }

                scene.add(pickup);
                targetArray.push(pickup);
                // Determine color: Use pickup's material color if available, otherwise use sparseTrailMaterial color (yellow)
                const effectColor = pickup.material ? pickup.material.color : sparseTrailMaterial.color; 
                pickup.needsSpawnParticles = true;
                console.log(`  [trySpawn] SUCCESS on attempt ${attempt+1} for ${spawnTypeName}! Spawning at (${potentialPos.x.toFixed(1)}, ${potentialPos.z.toFixed(1)})`); // <<< UNCOMMENTED Log success AND position
                logTotalPickupCount(`Spawned ${spawnTypeName}`); // Keep this useful one
                return { success: true, pickup: pickup };
            } else {
                 console.log(`  [trySpawn attempt ${attempt+1}] Rejected: Adjacent to wall.`); // <<< UNCOMMENTED Log rejection reason
            }
        } else {
             // Add reason for rejection to log
             let rejectionReason = "isPositionSafe check failed (boundary/pickup/trail)"; 
             console.log(`  [trySpawn attempt ${attempt+1}] Rejected: ${rejectionReason}.`); // <<< UNCOMMENTED Log rejection reason
        }
    }
    console.warn(`  [trySpawn] Could not find empty space for pickup type ${spawnTypeName} after ${maxAttempts} attempts.`); // <<< UNCOMMENTED Log failure
    logTotalPickupCount(`Failed spawn ${spawnTypeName}`); // Keep this useful one
    return { success: false, pickup: null };
}

// --- New function to handle counter-based spawns ---
function checkAndSpawnCounterPickups(currentPickupCount) {
    console.log(`Checking counter spawns. Current count: ${currentPickupCount}`);
    
    // Helper to check unlock status
    const isUnlocked = (type) => {
        const unlockInfo = UNLOCK_THRESHOLDS.find(u => u.type === type);
        return unlockInfo ? topScore >= unlockInfo.score : false; // Check against global topScore
    };

    // Ammo Check
    if (currentPickupCount >= nextAmmoSpawnCount && ammoPickups.length < maxAmmoPickups) {
        console.log(` -> Counter threshold met for AMMO (${currentPickupCount} >= ${nextAmmoSpawnCount})`);
        // MODIFIED: Update threshold immediately
        const nextCount = nextAmmoSpawnCount + AMMO_PICKUP_THRESHOLD;
        if (setNextAmmoSpawnCount) setNextAmmoSpawnCount(nextCount);
        console.log(`    -> Next check for Ammo at ${nextCount}`);
        
        if (isUnlocked('ammo')) {
            const spawnResult = trySpawn("ammo"); // Store result
            if (spawnResult.success) {
                console.log(`    -> Spawned Ammo`);
                // <<< ADDED: Trigger effects for counter-based spawn >>>
                const pickup = spawnResult.pickup;
                const now = performance.now();
                if (pickup.needsFadeIn) {
                    pickup.isSpawning = true;
                    pickup.spawnStartTime = now;
                    pickup.needsFadeIn = false;
                    console.log(`       -> Triggered fade-in state`);
                }
                if (pickup.needsSpawnParticles) {
                    let effectColor = pickup.material ? pickup.material.color : 0xffffff;
                    createPickupSpawnEffect(pickup.position, effectColor);
                    pickup.needsSpawnParticles = false;
                    console.log(`       -> Triggered spawn particles`);
                }
                // <<< END ADDED >>>
            } else {
                console.log(`    -> Failed to spawn Ammo (unlock check passed)`);
            }
        } else {
            console.log(`    -> Ammo not unlocked yet (Top Score: ${topScore})`);
        }
    }

    // Clear Walls Check
    if (currentPickupCount >= nextClearSpawnCount && clearPickups.length < maxClearPickups) {
         console.log(` -> Counter threshold met for CLEAR (${currentPickupCount} >= ${nextClearSpawnCount})`);
         // MODIFIED: Update threshold immediately
         const nextCount = nextClearSpawnCount + CLEAR_WALL_PICKUP_THRESHOLD;
         if (setNextClearSpawnCount) setNextClearSpawnCount(nextCount);
         console.log(`    -> Next check for Clear eligibility at ${nextCount}`);

         if (isUnlocked('clear')) {
            const spawnResult = trySpawn("clear"); // Store result
            if (spawnResult.success) {
                console.log(`    -> Spawned Clear`);
                 // <<< ADDED: Trigger effects for counter-based spawn >>>
                const pickup = spawnResult.pickup;
                const now = performance.now();
                if (pickup.needsFadeIn) {
                    pickup.isSpawning = true;
                    pickup.spawnStartTime = now;
                    pickup.needsFadeIn = false;
                    console.log(`       -> Triggered fade-in state`);
                }
                if (pickup.needsSpawnParticles) {
                    let effectColor = pickup.material ? pickup.material.color : 0xffffff;
                    createPickupSpawnEffect(pickup.position, effectColor);
                    pickup.needsSpawnParticles = false;
                    console.log(`       -> Triggered spawn particles`);
                }
                // <<< END ADDED >>>
            } else {
                console.log(`    -> Failed to spawn Clear (unlock check passed)`);
            }
        } else {
             console.log(`    -> Clear Walls not unlocked yet (Top Score: ${topScore})`);
        }
    }

    // Add AI Check
    if (currentPickupCount >= nextAddAiSpawnCount && addAiPickups.length < maxAddAiPickups) {
        console.log(` -> Counter threshold met for ADD_AI (${currentPickupCount} >= ${nextAddAiSpawnCount})`);
        // MODIFIED: Update threshold immediately
        const nextCount = nextAddAiSpawnCount + ADD_AI_PICKUP_THRESHOLD;
        if (setNextAddAiSpawnCount) setNextAddAiSpawnCount(nextCount);
        console.log(`    -> Next check for Add AI eligibility at ${nextCount}`);

        if (isUnlocked('add_ai')) {
            const spawnResult = trySpawn("add_ai"); // Store result
            if (spawnResult.success) {
                console.log(`    -> Spawned Add AI`);
                // <<< ADDED: Trigger effects for counter-based spawn >>>
                const pickup = spawnResult.pickup;
                const now = performance.now();
                if (pickup.needsFadeIn) {
                    pickup.isSpawning = true;
                    pickup.spawnStartTime = now;
                    pickup.needsFadeIn = false;
                    console.log(`       -> Triggered fade-in state`);
                }
                if (pickup.needsSpawnParticles) {
                    let effectColor = pickup.material ? pickup.material.color : 0xffffff;
                    createPickupSpawnEffect(pickup.position, effectColor);
                    pickup.needsSpawnParticles = false;
                    console.log(`       -> Triggered spawn particles`);
                }
                // <<< END ADDED >>>
            } else {
                console.log(`    -> Failed to spawn Add AI (unlock check passed)`);
            }
        } else {
            console.log(`    -> Add AI not unlocked yet (Top Score: ${topScore})`);
        }
    }

    // Expansion Check
    if (currentPickupCount >= nextExpansionSpawnCount && expansionPickups.length < maxExpansionPickups) {
        console.log(` -> Counter threshold met for EXPANSION (${currentPickupCount} >= ${nextExpansionSpawnCount})`);
        // MODIFIED: Update threshold immediately
        const nextCount = nextExpansionSpawnCount + EXPAND_PICKUP_THRESHOLD;
        if (setNextExpansionSpawnCount) setNextExpansionSpawnCount(nextCount);
        console.log(`    -> Next check for Expansion eligibility at ${nextCount}`);

        if (isUnlocked('expansion')) {
            const spawnResult = trySpawn("expansion"); // Store result
            if (spawnResult.success) {
                 console.log(`    -> Spawned Expansion`);
                // <<< ADDED: Trigger effects for counter-based spawn >>>
                const pickup = spawnResult.pickup;
                const now = performance.now();
                if (pickup.needsFadeIn) {
                    pickup.isSpawning = true;
                    pickup.spawnStartTime = now;
                    pickup.needsFadeIn = false;
                    console.log(`       -> Triggered fade-in state`);
                }
                if (pickup.needsSpawnParticles) {
                    let effectColor = pickup.material ? pickup.material.color : 0xffffff;
                    createPickupSpawnEffect(pickup.position, effectColor);
                    pickup.needsSpawnParticles = false;
                    console.log(`       -> Triggered spawn particles`);
                }
                // <<< END ADDED >>>
            } else {
                 console.log(`    -> Failed to spawn Expansion (unlock check passed)`);
            }
        } else {
            console.log(`    -> Expansion not unlocked yet (Top Score: ${topScore})`);
        }
    }

    // Multi-Spawn Check (Note: Threshold might need adjustment)
    if (currentPickupCount >= nextMultiSpawnCount && multiSpawnPickups.length < maxMultiSpawnPickups) {
        console.log(` -> Counter threshold met for MULTI (${currentPickupCount} >= ${nextMultiSpawnCount})`);
        // MODIFIED: Update threshold immediately
        const nextCount = nextMultiSpawnCount + MULTI_PICKUP_THRESHOLD;
        if (setNextMultiSpawnCount) setNextMultiSpawnCount(nextCount);
        console.log(`    -> Next check for Multi-Spawn eligibility at ${nextCount}`);

        if (isUnlocked('multi')) {
            const spawnResult = trySpawn("multi"); // Store result
            if (spawnResult.success) {
                 console.log(`    -> Spawned Multi`);
                // <<< ADDED: Trigger effects for counter-based spawn >>>
                const pickup = spawnResult.pickup;
                const now = performance.now();
                if (pickup.needsFadeIn) {
                    pickup.isSpawning = true;
                    pickup.spawnStartTime = now;
                    pickup.needsFadeIn = false;
                    console.log(`       -> Triggered fade-in state`);
                }
                if (pickup.needsSpawnParticles) {
                    let effectColor = pickup.material ? pickup.material.color : 0xffffff;
                    createPickupSpawnEffect(pickup.position, effectColor);
                    pickup.needsSpawnParticles = false;
                    console.log(`       -> Triggered spawn particles`);
                }
                // <<< END ADDED >>>
            } else {
                console.log(`    -> Failed to spawn Multi (unlock check passed)`);
            }
        } else {
             console.log(`    -> Multi-Spawn not unlocked yet (Top Score: ${topScore})`);
        }
    }
}

// Main Pickup Spawning Logic (Called during game and by spawnInitialPickups)
// Returns boolean for initial spawn success check
export function spawnPickup(forceType = null) {
    console.log(`--- spawnPickup called with forceType: ${forceType} ---`);
    let pickupType = forceType;

    // Determine Primary Spawn Type (if not forced)
    if (!pickupType) {
        console.log("  -> No forceType, determining eligible types...");
        let eligibleTypes = [];
        // Eligibility based on score ONLY now
        if (topScore >= 0 && zoomPickups.length < maxZoomPickups) eligibleTypes.push({ type: "zoom" });
        if (topScore >= 50 && scorePickups.length < maxScorePickups) eligibleTypes.push({ type: "score" });
        if (topScore >= 200 && sparseTrailPickups.length < maxSparseTrailPickups) eligibleTypes.push({ type: "sparse" });

        if (eligibleTypes.length === 0) {
            console.log("  -> No score-based types eligible, forcing zoom as fallback.");
            pickupType = "zoom"; // Always allow zoom?
        }

        // If still no type, something is wrong, but let's try zoom as default
        if (!pickupType && eligibleTypes.length > 0) {
            const randomIndex = Math.floor(Math.random() * eligibleTypes.length);
            pickupType = eligibleTypes[randomIndex].type;
            console.log(`  -> Randomly selected SCORE-BASED pickupType: ${pickupType}`);
        } else if (!pickupType) {
             console.warn("  -> No eligible types found, defaulting to zoom spawn attempt.");
             pickupType = "zoom";
        }
    }

    console.log(`  -> Final pickupType determined for non-counter spawn: ${pickupType}`);

    if (!pickupType) {
        console.warn("  -> No pickup type could be determined. Exiting spawnPickup.");
        return false;
    }

    // Primary Spawn Attempt (Only non-counter types)
    console.log(`  -> Attempting primary spawn: ${pickupType}`);
    const spawnResult = trySpawn(pickupType);

    // <<< MODIFIED: Trigger effects based on flags set by trySpawn, regardless of gameActive state >>>
    if (spawnResult.success) { 
        const pickup = spawnResult.pickup;
        const now = performance.now();

        // Start Fade-in if needed
        if (pickup.needsFadeIn) {
            pickup.isSpawning = true;
            pickup.spawnStartTime = now;
            pickup.needsFadeIn = false; // Reset flag after setting state
            console.log(`[spawnPickup] Triggered fade-in state for ${pickupType}`);
        }
        // Create Spawn Particle Effect if needed
        if (pickup.needsSpawnParticles) {
            // Determine color (handle potential group material access)
            let effectColor = 0xffffff; // Default fallback
            if (pickup.material) { // Standard mesh
                effectColor = pickup.material.color;
            } else if (pickup.isGroup && pickup.children.length > 0 && pickup.children[0].material) { // Group like sparse
                effectColor = pickup.children[0].material.color; // Use first child's material color
            } else if (pickupType === 'sparse') { // Specific fallback for sparse if needed
                 effectColor = sparseTrailMaterial.color;
            }
            createPickupSpawnEffect(pickup.position, effectColor);
            pickup.needsSpawnParticles = false; // Reset flag after creating effect
             console.log(`[spawnPickup] Triggered spawn particles for ${pickupType}`);
        }
    }
    // <<< END MODIFICATION >>>

    console.log(`--- spawnPickup finished for type: ${pickupType} ---`);
    return spawnResult.success; // Return only the success boolean
}

// Spawn Initial Pickups (Called from init)
export function spawnInitialPickups() {
    console.log("[spawnInitialPickups] Starting initial spawn sequence."); // <<< UNCOMMENTED Log entry
    // Clear existing pickups from scene and arrays
    [scorePickups, expansionPickups, clearPickups, zoomPickups, sparseTrailPickups, multiSpawnPickups, addAiPickups, ammoPickups].forEach(arr => {
        arr.forEach(p => scene.remove(p));
        arr.length = 0;
    });

    const allPossibleTypes = [
        { score: 0, type: "zoom" }, { score: 50, type: "score" }, { score: 200, type: "sparse" },
        { score: 300, type: "ammo" }, { score: 500, type: "clear" }, { score: 1000, type: "add_ai" },
        { score: 1500, type: "expansion" }, { score: 2000, type: "multi" }
    ];
    const counterBasedTypes = ["ammo", "clear", "add_ai", "expansion", "multi"];

    const initiallyEligibleTypes = allPossibleTypes
        .filter(p => topScore >= p.score)
        .map(p => p.type);

    const nonCounterEligibleTypes = initiallyEligibleTypes.filter(type => !counterBasedTypes.includes(type));

    console.log(`[spawnInitialPickups] Initial spawn eligibility (all based on topScore ${topScore}):`, initiallyEligibleTypes); // <<< UNCOMMENTED Log eligible types
    console.log(`[spawnInitialPickups] Attempting initial spawn for non-counter types:`, nonCounterEligibleTypes); // <<< UNCOMMENTED Log eligible types

    if (nonCounterEligibleTypes.length === 0) {
        console.warn("No non-counter powerups unlocked based on topScore! Cannot perform initial spawn.");
        return;
    }

    let spawnedCount = 0;
    const maxInitialSpawns = 3; 
    
    // Explicitly try to spawn the first few unique eligible types
    for (let i = 0; i < Math.min(maxInitialSpawns, nonCounterEligibleTypes.length); i++) {
        const typeToSpawn = nonCounterEligibleTypes[i];
        
        console.log(`[spawnInitialPickups] Initial spawn attempt ${i + 1}: Trying type '${typeToSpawn}'`); // <<< UNCOMMENTED Log specific attempt
        const success = spawnPickup(typeToSpawn);
        if (success) {
            spawnedCount++;
        }
    }

    console.log(`[spawnInitialPickups] Finished initial spawn attempts. Spawned ${spawnedCount} pickups.`); // <<< UNCOMMENTED Log final count
    logTotalPickupCount("After Initial Spawn"); // Keep this useful one
}

// --- Check Unlocks --- (Called from animate)
export function checkUnlocks(currentScore) {
    if (!snakeHead1) return;
    console.log(`Checking unlocks for score: ${currentScore}, TopScoreAtStart: ${topScoreAtGameStart}`);

    for (const unlock of UNLOCK_THRESHOLDS) {
        const alreadyUnlockedThisGame = unlockedScoresThisGame.has(unlock.score);
        if (currentScore >= unlock.score && !alreadyUnlockedThisGame) {
            console.log(`>>> Threshold Met for ${unlock.name} <<<`);
            console.log(`    Current Score: ${currentScore}, Unlock Score: ${unlock.score}, Top Score at Start: ${topScoreAtGameStart}`);
            unlockedScoresThisGame.add(unlock.score);

            const isNewUnlock = unlock.score > topScoreAtGameStart;
            console.log(`    Is this a new unlock this session? ${isNewUnlock} (${unlock.score} > ${topScoreAtGameStart})`);

            if (isNewUnlock) {
                console.log(`    [Action] Announcing and Spawning: ${unlock.name}`);
                console.log(`--- UNLOCKED (New this Session): ${unlock.name} at score ${currentScore} ---`);
                const textPos = snakeHead1.position.clone();
                textPos.y += 1.0;
                createFloatingText(`Unlocked: ${unlock.name}`, textPos, new THREE.Color(unlock.color));

                console.log(`  -> Attempting initial spawn for newly unlocked: ${unlock.type}`);
                spawnPickup(unlock.type);
            } else {
                console.log(`    [Action] Skipping Announce/Spawn (Already Available): ${unlock.name}`);
            }
        }
    }
}

// Helper to update score, pickups collected, and check counter spawns
function handleScoreUpdateAndCounters(baseScoreAmount) {
    let finalScoreAmount = baseScoreAmount;
    // Apply speed boost multiplier if active
    if (isSpeedBoostActiveP1 && speedLevelP1 > 0) {
        const multiplier = 1 + (speedLevelP1 * SPEED_BOOST_SCORE_MULTIPLIER);
        finalScoreAmount = Math.round(baseScoreAmount * multiplier);
        console.log(`Score Multiplier Applied: Level ${speedLevelP1}, Multiplier ${multiplier.toFixed(2)}, Base ${baseScoreAmount}, Final ${finalScoreAmount}`);
    }

    const newScore = scoreP1 + finalScoreAmount; // Use final amount
    if (setScoreP1) {
        setScoreP1(newScore);
    } else {
        console.error("setScoreP1 is not defined in state.js?");
    }
    checkUnlocks(newScore);

    const newPickupCount = pickupsCollectedCounter + 1;
    if (setPickupsCollectedCounter) {
        setPickupsCollectedCounter(newPickupCount);
    }
    // Check counter spawns AFTER incrementing the counter
    checkAndSpawnCounterPickups(newPickupCount); 
}

// --- Pickup Collision Checks --- (Called from animate)

// Player 1 Collision Checks
export function checkPlayerPickupCollisions() {
    if (checkScorePickupCollision()) return true;
    if (checkExpansionPickupCollision()) return true;
    if (checkClearPickupCollision()) return true;
    if (checkZoomPickupCollision()) return true;
    if (checkSparseTrailPickupCollision()) return true;
    if (checkMultiSpawnPickupCollision()) return true;
    if (checkAddAiPickupCollision()) return true;
    if (checkAmmoPickupCollision()) return true;
    return false;
}

function checkScorePickupCollision() {
    for (let i = scorePickups.length - 1; i >= 0; i--) {
        const pickup = scorePickups[i];
        if (snakeTargetPosition1.distanceToSquared(pickup.position) < PICKUP_COLLISION_THRESHOLD_SQ * 1.1) {
            const pos = pickup.position.clone(); const col = pickup.material.color.clone();
            createExplosionEffect(pos, col);
            scene.remove(pickup); scorePickups.splice(i, 1); logTotalPickupCount("Collected Player SpeedUp");
            
            const newLevelP1 = speedLevelP1 + 1;
            setSpeedLevelP1(newLevelP1);
            if (!isSpeedBoostActiveP1 && snakeHead1) snakeHead1.material.color.setHex(P1_HEAD_COLOR_BOOST);
            setSpeedBoostActiveP1(true);
            setSpeedBoostEndTimeP1(performance.now() + boostDuration);
            
            // Calculate boosted score for text
            const baseScore = 40;
            const scoreMultiplier = isSpeedBoostActiveP1 ? (1 + speedLevelP1 * SPEED_BOOST_SCORE_MULTIPLIER) : 1;
            const actualScoreAwarded = Math.round(baseScore * scoreMultiplier);
            createFloatingText(`+${actualScoreAwarded} Speed Up! (Lv ${newLevelP1})`, pos, col); // Show level & boosted score
            
            handleScoreUpdateAndCounters(baseScore); // Pass BASE score
            spawnPickup("score"); 
            return true;
        }
    } return false;
}

function checkExpansionPickupCollision() {
    for (let i = expansionPickups.length - 1; i >= 0; i--) {
        const pickup = expansionPickups[i];
        if (snakeTargetPosition1.distanceToSquared(pickup.position) < PICKUP_COLLISION_THRESHOLD_SQ * 1.1) {
             const pos = pickup.position.clone(); const col = pickup.material.color.clone();
            createExplosionEffect(pos, col); 
             // Calculate boosted score for text
            const baseScore = 150;
            const scoreMultiplier = isSpeedBoostActiveP1 ? (1 + speedLevelP1 * SPEED_BOOST_SCORE_MULTIPLIER) : 1;
            const actualScoreAwarded = Math.round(baseScore * scoreMultiplier);
            createFloatingText(`+${actualScoreAwarded} Expand!`, pos, col);
            
            scene.remove(pickup); expansionPickups.splice(i, 1); logTotalPickupCount("Collected Player Expand");
            const dirX = snakeDirection1.x, dirZ = snakeDirection1.z;
            let expanded = false, bx_min = boundaryXMin, bx_max = boundaryXMax, bz_min = boundaryZMin, bz_max = boundaryZMax;
            if (dirX > 0.5) { bx_max += expansionAmount; setBoundaryXMax(bx_max); expanded = true; }
            else if (dirX < -0.5) { bx_min -= expansionAmount; setBoundaryXMin(bx_min); expanded = true; }
            else if (dirZ > 0.5) { bz_max += expansionAmount; setBoundaryZMax(bz_max); expanded = true; }
            else if (dirZ < -0.5) { bz_min -= expansionAmount; setBoundaryZMin(bz_min); expanded = true; }
            if(expanded) createPlayAreaVisuals(bx_min, bx_max, bz_min, bz_max);
            handleScoreUpdateAndCounters(baseScore); // Pass BASE score
            return true;
        }
    } return false;
}

function checkClearPickupCollision() {
     for (let i = clearPickups.length - 1; i >= 0; i--) {
        const pickup = clearPickups[i];
        if (snakeTargetPosition1.distanceToSquared(pickup.position) < PICKUP_COLLISION_THRESHOLD_SQ * 1.1) {
            const pos = pickup.position.clone(); const col = pickup.material.color.clone();
            createExplosionEffect(pos, col); 
             // Calculate boosted score for text
            const baseScore = 100;
            const scoreMultiplier = isSpeedBoostActiveP1 ? (1 + speedLevelP1 * SPEED_BOOST_SCORE_MULTIPLIER) : 1;
            const actualScoreAwarded = Math.round(baseScore * scoreMultiplier);
            createFloatingText(`+${actualScoreAwarded} Clear Walls!`, pos, col);
            
            scene.remove(pickup); clearPickups.splice(i, 1); logTotalPickupCount("Collected Player Clear");
            clearAllTrails(); 
            handleScoreUpdateAndCounters(baseScore); // Pass BASE score
            return true;
        }
    } return false;
}

function checkZoomPickupCollision() {
    for (let i = zoomPickups.length - 1; i >= 0; i--) {
        const pickup = zoomPickups[i];
        if (snakeTargetPosition1.distanceToSquared(pickup.position) < PICKUP_COLLISION_THRESHOLD_SQ * 1.1) {
            const pos = pickup.position.clone(); const col = pickup.material.color.clone();
            createExplosionEffect(pos, col); 
            scene.remove(pickup); zoomPickups.splice(i, 1); 
            console.log(`[checkZoomPickupCollision] Before respawn attempt: zoomPickups.length = ${zoomPickups.length}`); // Log count before spawn
            logTotalPickupCount("Collected Player Zoom");
            const currentTime = performance.now(); let currentZoomLevel = zoomLevelP1, newLevelP1;
            if (isZoomedOutP1 && zoomOutEndTimeP1 > currentTime) { currentZoomLevel++; newLevelP1 = currentZoomLevel; }
            else { setIsZoomedOutP1(true); currentZoomLevel = 1; newLevelP1 = 1; }
            setZoomLevelP1(currentZoomLevel); setZoomOutEndTimeP1(currentTime + zoomOutDuration);
            
            // Calculate boosted score for text
            const baseScore = 20;
            const scoreMultiplier = isSpeedBoostActiveP1 ? (1 + speedLevelP1 * SPEED_BOOST_SCORE_MULTIPLIER) : 1;
            const actualScoreAwarded = Math.round(baseScore * scoreMultiplier);
            createFloatingText(`+${actualScoreAwarded} Zoom Out! (Lv ${newLevelP1})`, pos, col);
            
            handleScoreUpdateAndCounters(baseScore); // Pass BASE score
            spawnPickup("zoom"); 
            console.log(`[checkZoomPickupCollision] After respawn attempt: zoomPickups.length = ${zoomPickups.length}`); // Log count after spawn
            return true;
        }
    } return false;
}

function checkSparseTrailPickupCollision() {
    for (let i = sparseTrailPickups.length - 1; i >= 0; i--) {
        const pickup = sparseTrailPickups[i];
        if (snakeTargetPosition1.distanceToSquared(pickup.position) < PICKUP_COLLISION_THRESHOLD_SQ * 1.1) {
            const pos = pickup.position.clone(); const col = sparseTrailMaterial.color.clone();
            createExplosionEffect(pos, col); 
            scene.remove(pickup); sparseTrailPickups.splice(i, 1); logTotalPickupCount("Collected Player Sparse");
            const currentTime = performance.now(); let currentSparseLevel = sparseLevelP1, newLevelP1;
            if (isSparseTrailActiveP1 && sparseTrailEndTimeP1 > currentTime) { currentSparseLevel++; newLevelP1 = currentSparseLevel; }
            else { setIsSparseTrailActiveP1(true); currentSparseLevel = 1; newLevelP1 = 1; }
            setSparseLevelP1(currentSparseLevel); setSparseTrailEndTimeP1(currentTime + sparseTrailDuration);
            setTrailCounterP1(0);
            
            // Calculate boosted score for text
            const baseScore = 60;
            const scoreMultiplier = isSpeedBoostActiveP1 ? (1 + speedLevelP1 * SPEED_BOOST_SCORE_MULTIPLIER) : 1;
            const actualScoreAwarded = Math.round(baseScore * scoreMultiplier);
            createFloatingText(`+${actualScoreAwarded} Sparse Trail! (Lv ${newLevelP1})`, pos, col);
            
            handleScoreUpdateAndCounters(baseScore); // Pass BASE score
            spawnPickup("sparse"); 
            return true;
        }
    } return false;
}

function checkMultiSpawnPickupCollision() {
    for (let i = multiSpawnPickups.length - 1; i >= 0; i--) {
        const pickup = multiSpawnPickups[i];
         if (snakeTargetPosition1.distanceToSquared(pickup.position) < PICKUP_COLLISION_THRESHOLD_SQ * 1.1) {
            const pos = pickup.position.clone(); const col = multiSpawnMaterial.color.clone();
            createExplosionEffect(pos, col);
            const baseScore = 200;
            const scoreMultiplier = isSpeedBoostActiveP1 ? (1 + speedLevelP1 * SPEED_BOOST_SCORE_MULTIPLIER) : 1;
            const actualScoreAwarded = Math.round(baseScore * scoreMultiplier);
            createFloatingText(`+${actualScoreAwarded} More Powerups!`, pos, col);
            
            scene.remove(pickup); multiSpawnPickups.splice(i, 1); logTotalPickupCount("Collected Player Multi");
            handleScoreUpdateAndCounters(baseScore);
            
            let eligible = [];
            if (topScore >= 0) eligible.push("zoom");
            if (topScore >= 50) eligible.push("score");
            if (topScore >= 200) eligible.push("sparse");
            console.log("Multi Spawn Eligible Types:", eligible);
            
            const incMaxAndSpawn = (type) => {
                if (!type) return;
                console.log(`Multi Spawn: Incrementing max and attempting spawn for: ${type}`);
                let oldMax;
                // Increment Max FIRST
                switch (type) { 
                    case "score": oldMax = maxScorePickups; setMaxScorePickups(maxScorePickups + 1); console.log(`  MaxScore: ${oldMax} -> ${maxScorePickups}`); break; 
                    case "zoom": oldMax = maxZoomPickups; setMaxZoomPickups(maxZoomPickups + 1); console.log(`  MaxZoom: ${oldMax} -> ${maxZoomPickups}`); break; 
                    case "sparse": oldMax = maxSparseTrailPickups; setMaxSparseTrailPickups(maxSparseTrailPickups + 1); console.log(`  MaxSparse: ${oldMax} -> ${maxSparseTrailPickups}`); break; 
                    default: console.warn(`Multi Spawn: Tried to increment max for unsupported type: ${type}`); return;
                } 
                spawnPickup(type);
            };

            if (eligible.length > 0) {
                const type1 = eligible[Math.floor(Math.random() * eligible.length)];
                console.log("Multi Spawn Choice 1:", type1);
                incMaxAndSpawn(type1);

                const type2 = eligible[Math.floor(Math.random() * eligible.length)];
                console.log("Multi Spawn Choice 2:", type2);
                incMaxAndSpawn(type2); 
            } else {
                 console.log("Multi Spawn: No eligible non-counter types unlocked to spawn/increment.");
            }
            
            return true;
        }
    } return false;
}

function checkAddAiPickupCollision() {
    for (let i = addAiPickups.length - 1; i >= 0; i--) {
        const pickup = addAiPickups[i];
        if (snakeTargetPosition1.distanceToSquared(pickup.position) < PICKUP_COLLISION_THRESHOLD_SQ * 1.1) {
            const pos = pickup.position.clone(); const col = addAiPickupMaterial.color.clone();
            createExplosionEffect(pos, col); 
            const baseScore = 125;
            const scoreMultiplier = isSpeedBoostActiveP1 ? (1 + speedLevelP1 * SPEED_BOOST_SCORE_MULTIPLIER) : 1;
            const actualScoreAwarded = Math.round(baseScore * scoreMultiplier);
            createFloatingText(`+${actualScoreAwarded} More Players!`, pos, col);
            
            scene.remove(pickup); addAiPickups.splice(i, 1); logTotalPickupCount("Collected Player AddAI");
            
            // --- Spawn New AI Logic ---
            let spawned = false;
            const maxSpawnAttempts = 20;
            const { divisionsX, divisionsZ } = getGridDimensions();
            console.log("[AddAI Pickup] Attempting to spawn new AI...");
            for(let attempt = 0; attempt < maxSpawnAttempts; attempt++) {
                const spawnGridX = Math.floor(Math.random() * divisionsX);
                const spawnGridZ = Math.floor(Math.random() * divisionsZ);
                const spawnWorldX = snapToGridCenter(boundaryXMin + spawnGridX * segmentSize, 'x');
                const spawnWorldZ = snapToGridCenter(boundaryZMin + spawnGridZ * segmentSize, 'z');
                const potentialPos = new THREE.Vector3(spawnWorldX, 0, spawnWorldZ);
                let safeToSpawn = isPositionSafe(potentialPos, null, true, true); 
                if (safeToSpawn) {
                     console.log(`[AddAI Pickup] Found safe spawn at (${spawnWorldX.toFixed(1)}, ${spawnWorldZ.toFixed(1)}) on attempt ${attempt + 1}`);
                     // Generate axis-aligned direction
                     let startDirX = 0, startDirZ = 0;
                     if (Math.random() < 0.5) { // Choose X or Z axis
                         startDirX = Math.random() < 0.5 ? 1 : -1; // Choose + or - X
                     } else {
                         startDirZ = Math.random() < 0.5 ? 1 : -1; // Choose + or - Z
                     }
                     // Optional: Adjust direction if near boundary (keep this logic)
                     if (potentialPos.x < boundaryXMin + segmentSize * 2 && startDirX === -1) startDirX = 1;
                     if (potentialPos.x > boundaryXMax - segmentSize * 2 && startDirX === 1) startDirX = -1;
                     if (potentialPos.z < boundaryZMin + segmentSize * 2 && startDirZ === -1) startDirZ = 1;
                     if (potentialPos.z > boundaryZMax - segmentSize * 2 && startDirZ === 1) startDirZ = -1;
                      // Ensure we don't end up with zero direction if boundary push cancelled out the initial random choice
                     if (startDirX === 0 && startDirZ === 0) {
                         if (Math.random() < 0.5) startDirX = Math.random() < 0.5 ? 1 : -1;
                         else startDirZ = Math.random() < 0.5 ? 1 : -1;
                     }

                     const newAI = createNewAIPlayer(spawnWorldX, spawnWorldZ, startDirX, startDirZ);
                     console.log(`[AddAI Pickup] Spawned new AI with ID: ${newAI.id}`);
                     spawned = true;
                     break; 
                }
            }
            if (!spawned) {
                console.warn("[AddAI Pickup] Failed to find safe spawn location...");
            }
            // --------------------------
            
            handleScoreUpdateAndCounters(baseScore); // Pass BASE score
            return true;
        }
    } return false;
}

function checkAmmoPickupCollision() {
    for (let i = ammoPickups.length - 1; i >= 0; i--) {
        const pickup = ammoPickups[i];
        if (snakeTargetPosition1.distanceToSquared(pickup.position) < PICKUP_COLLISION_THRESHOLD_SQ * 1.1) {
            const pos = pickup.position.clone(); const col = ammoPickupMaterial.color.clone();
            createExplosionEffect(pos, col); 
            // Calculate boosted score for text
            const baseScore = 80;
            const scoreMultiplier = isSpeedBoostActiveP1 ? (1 + speedLevelP1 * SPEED_BOOST_SCORE_MULTIPLIER) : 1;
            const actualScoreAwarded = Math.round(baseScore * scoreMultiplier);
            createFloatingText(`+${actualScoreAwarded} Ammo!`, pos, col);
            
            scene.remove(pickup); ammoPickups.splice(i, 1); logTotalPickupCount("Collected Player Ammo");
            setAmmoCountP1(ammoCountP1 + 1); updateAmmoIndicatorP1();
            handleScoreUpdateAndCounters(baseScore); // Pass BASE score
            return true;
        }
    } return false;
}

// AI Collision Checks (Need similar updates for counter checks)
export function checkAIPickupCollisions(aiObject) {
    if (!aiObject || !aiObject.targetPosition) return false; // Basic check
    if (checkAIScorePickupCollision(aiObject)) return true;
    if (checkAIExpansionPickupCollision(aiObject)) return true;
    if (checkAIClearPickupCollision(aiObject)) return true;
    if (checkAIZoomPickupCollision(aiObject)) return true;
    if (checkAISparseTrailPickupCollision(aiObject)) return true;
    if (checkAIMultiSpawnPickupCollision(aiObject)) return true;
    if (checkAIAddAiPickupCollision(aiObject)) return true;
    if (checkAIAmmoPickupCollision(aiObject)) return true;
    return false;
}

// Helper for AI counter updates (since AI doesn't have score)
function handleAICounterUpdate() {
    const newPickupCount = pickupsCollectedCounter + 1;
    if (setPickupsCollectedCounter) {
        setPickupsCollectedCounter(newPickupCount);
    }
    checkAndSpawnCounterPickups(newPickupCount);
}

function checkAIScorePickupCollision(aiObject) {
    for (let i = scorePickups.length - 1; i >= 0; i--) {
        const pickup = scorePickups[i];
        if (aiObject.targetPosition.distanceToSquared(pickup.position) < PICKUP_COLLISION_THRESHOLD_SQ * 1.1) {
            createExplosionEffect(pickup.position.clone(), pickup.material.color.clone());
            scene.remove(pickup); scorePickups.splice(i, 1); logTotalPickupCount("Collected AI SpeedUp");
            
            const newLevelAI = aiObject.speedLevel + 1;
            aiObject.speedLevel = newLevelAI;
            // Set head color to the AI's specific boost color 
            // if (aiObject.head && aiObject.colors) aiObject.material.color.setHex(aiObject.colors.boost); // <-- Commented out
            aiObject.isSpeedBoostActive = true; 
            aiObject.speedBoostEndTime = performance.now() + boostDuration;
            // AI doesn't need floating text
            
            handleAICounterUpdate(); 
            spawnPickup("score"); 
            return true;
        }
    } return false;
}

function checkAIExpansionPickupCollision(aiObject) {
     for (let i = expansionPickups.length - 1; i >= 0; i--) {
        const pickup = expansionPickups[i];
        if (aiObject.targetPosition.distanceToSquared(pickup.position) < PICKUP_COLLISION_THRESHOLD_SQ * 1.1) {
            createExplosionEffect(pickup.position.clone(), pickup.material.color.clone());
            scene.remove(pickup); expansionPickups.splice(i, 1); logTotalPickupCount("Collected AI Expand");
            const dirX = aiObject.direction.x, dirZ = aiObject.direction.z;
            let expanded = false, bx_min = boundaryXMin, bx_max = boundaryXMax, bz_min = boundaryZMin, bz_max = boundaryZMax;
            if (dirX > 0.5) { bx_max += expansionAmount; setBoundaryXMax(bx_max); expanded = true; } else if (dirX < -0.5) { bx_min -= expansionAmount; setBoundaryXMin(bx_min); expanded = true; } else if (dirZ > 0.5) { bz_max += expansionAmount; setBoundaryZMax(bz_max); expanded = true; } else if (dirZ < -0.5) { bz_min -= expansionAmount; setBoundaryZMin(bz_min); expanded = true; }
            if(expanded) createPlayAreaVisuals(bx_min, bx_max, bz_min, bz_max);
            handleAICounterUpdate(); // Use new helper
            return true;
        }
    } return false;
}

function checkAIClearPickupCollision(aiObject) {
    for (let i = clearPickups.length - 1; i >= 0; i--) {
        const pickup = clearPickups[i];
        if (aiObject.targetPosition.distanceToSquared(pickup.position) < PICKUP_COLLISION_THRESHOLD_SQ * 1.1) {
            createExplosionEffect(pickup.position.clone(), pickup.material.color.clone());
            scene.remove(pickup); clearPickups.splice(i, 1); logTotalPickupCount("Collected AI Clear");
            clearAllTrails(); 
            handleAICounterUpdate(); // Use new helper
            return true;
        }
    } return false;
}

function checkAIZoomPickupCollision(aiObject) {
    // AI doesn't visually zoom, but should collect & respawn the pickup
    for (let i = zoomPickups.length - 1; i >= 0; i--) {
        const pickup = zoomPickups[i];
        if (aiObject.targetPosition.distanceToSquared(pickup.position) < PICKUP_COLLISION_THRESHOLD_SQ * 1.1) {
            createExplosionEffect(pickup.position.clone(), pickup.material.color.clone());
            scene.remove(pickup);
            zoomPickups.splice(i, 1);
            logTotalPickupCount("Collected AI Zoom");
            
            handleAICounterUpdate(); // Update global counter & check counter spawns
            spawnPickup("zoom");    // Respawn the zoom pickup
            return true;
        }
    }
    return false; 
}

function checkAISparseTrailPickupCollision(aiObject) {
    for (let i = sparseTrailPickups.length - 1; i >= 0; i--) {
        const pickup = sparseTrailPickups[i];
        if (aiObject.targetPosition.distanceToSquared(pickup.position) < PICKUP_COLLISION_THRESHOLD_SQ * 1.1) {
            const pos = pickup.position.clone(); const col = sparseTrailMaterial.color.clone();
            createExplosionEffect(pos, col);
            const currentTime = performance.now(); 
            let currentSparseLevel = aiObject.sparseLevel;
            if (aiObject.isSparseTrailActive && aiObject.sparseTrailEndTime > currentTime) { 
                currentSparseLevel++; 
            } else { 
                aiObject.isSparseTrailActive = true; 
                currentSparseLevel = 1; 
            }
            aiObject.sparseLevel = currentSparseLevel;
            aiObject.sparseTrailEndTime = currentTime + sparseTrailDuration;
            aiObject.trailCounter = 0;
            scene.remove(pickup); sparseTrailPickups.splice(i, 1);
            logTotalPickupCount("Collected AI Sparse");
            handleAICounterUpdate(); // Use new helper
            spawnPickup("sparse");
            return true;
        }
    } return false;
}

function checkAIMultiSpawnPickupCollision(aiObject) { 
    for (let i = multiSpawnPickups.length - 1; i >= 0; i--) {
        const pickup = multiSpawnPickups[i];
        if (aiObject.targetPosition.distanceToSquared(pickup.position) < PICKUP_COLLISION_THRESHOLD_SQ * 1.1) {
            const unlockInfo = UNLOCK_THRESHOLDS.find(u => u.type === 'multi');
            const scoreThreshold = unlockInfo ? unlockInfo.score : Infinity;

            if (topScore >= scoreThreshold) {
                createExplosionEffect(pickup.position.clone(), pickup.material.color.clone());
                scene.remove(pickup); multiSpawnPickups.splice(i, 1); logTotalPickupCount("Collected AI MultiSpawn");
                
                // Spawn multiple new pickups
                const typesToSpawn = ["score", "expansion", "clear", "zoom", "sparse", "ammo"]; // Add 'ammo'
                let spawnedCount = 0;
                for (let j = 0; j < 3 && spawnedCount < 3; j++) { // Try spawning up to 3
                    const randomType = typesToSpawn[Math.floor(Math.random() * typesToSpawn.length)];
                     // Check if this type is unlocked before trying to spawn it
                    const typeUnlockInfo = UNLOCK_THRESHOLDS.find(u => u.type === randomType);
                    const typeScoreThreshold = typeUnlockInfo ? typeUnlockInfo.score : 0; 
                    
                    if (topScore >= typeScoreThreshold) {
                        if (trySpawn(randomType).success) {
                           spawnedCount++;
                        }
                    } else {
                        console.log(`[MultiSpawn by AI ${aiObject.id}] Skipping locked type: ${randomType}`);
                    }
                }
                console.log(`[MultiSpawn by AI ${aiObject.id}] Spawned ${spawnedCount} new pickups.`);
                
                handleAICounterUpdate(); // Use new helper
                spawnPickup("multi"); // Attempt to respawn the multi pickup itself
                return true;
            } else {
                // AI hit it but it's not active yet (score too low) - maybe bounce effect? Ignore for now.
                console.log(`AI ${aiObject.id} hit inactive MultiSpawn pickup.`);
            }
        }
    } return false;
}

function checkAIAddAiPickupCollision(aiObject) {
     for (let i = addAiPickups.length - 1; i >= 0; i--) {
        const pickup = addAiPickups[i];
        if (aiObject.targetPosition.distanceToSquared(pickup.position) < PICKUP_COLLISION_THRESHOLD_SQ * 1.1) {
            createExplosionEffect(pickup.position.clone(), addAiPickupMaterial.color.clone());
            scene.remove(pickup); addAiPickups.splice(i, 1); logTotalPickupCount("Collected AI AddAI");
            // --- Spawn New AI Logic ---
            let spawned = false;
            const maxSpawnAttempts = 20;
            const { divisionsX, divisionsZ } = getGridDimensions();
            console.log("[AddAI Pickup by AI ${aiObject.id}] Attempting to spawn new AI...");
            for(let attempt = 0; attempt < maxSpawnAttempts; attempt++) {
                const spawnGridX = Math.floor(Math.random() * divisionsX);
                const spawnGridZ = Math.floor(Math.random() * divisionsZ);
                const spawnWorldX = snapToGridCenter(boundaryXMin + spawnGridX * segmentSize, 'x');
                const spawnWorldZ = snapToGridCenter(boundaryZMin + spawnGridZ * segmentSize, 'z');
                const potentialPos = new THREE.Vector3(spawnWorldX, 0, spawnWorldZ);
                let safeToSpawn = isPositionSafe(potentialPos, null, true, true); 
                if (safeToSpawn) {
                     console.log(`[AddAI Pickup by AI ${aiObject.id}] Found safe spawn at (${spawnWorldX.toFixed(1)}, ${spawnWorldZ.toFixed(1)}) on attempt ${attempt + 1}`);
                     // Generate axis-aligned direction
                     let startDirX = 0, startDirZ = 0;
                     if (Math.random() < 0.5) { // Choose X or Z axis
                         startDirX = Math.random() < 0.5 ? 1 : -1; // Choose + or - X
                     } else {
                         startDirZ = Math.random() < 0.5 ? 1 : -1; // Choose + or - Z
                     }
                     // Optional: Adjust direction if near boundary (keep this logic)
                     if (potentialPos.x < boundaryXMin + segmentSize * 2 && startDirX === -1) startDirX = 1;
                     if (potentialPos.x > boundaryXMax - segmentSize * 2 && startDirX === 1) startDirX = -1;
                     if (potentialPos.z < boundaryZMin + segmentSize * 2 && startDirZ === -1) startDirZ = 1;
                     if (potentialPos.z > boundaryZMax - segmentSize * 2 && startDirZ === 1) startDirZ = -1;
                      // Ensure we don't end up with zero direction if boundary push cancelled out the initial random choice
                     if (startDirX === 0 && startDirZ === 0) {
                         if (Math.random() < 0.5) startDirX = Math.random() < 0.5 ? 1 : -1;
                         else startDirZ = Math.random() < 0.5 ? 1 : -1;
                     }
                     
                     const newAI = createNewAIPlayer(spawnWorldX, spawnWorldZ, startDirX, startDirZ);
                     console.log(`[AddAI Pickup by AI ${aiObject.id}] Spawned new AI with ID: ${newAI.id}`);
                     spawned = true;
                     break; 
                }
            }
            if (!spawned) {
                console.warn("[AddAI Pickup by AI ${aiObject.id}] Failed to find safe spawn location...");
            }
            // --------------------------
            handleAICounterUpdate(); // Use new helper
            return true;
        }
    } return false;
}

function checkAIAmmoPickupCollision(aiObject) {
    for (let i = ammoPickups.length - 1; i >= 0; i--) {
        const pickup = ammoPickups[i];
        if (aiObject.targetPosition.distanceToSquared(pickup.position) < PICKUP_COLLISION_THRESHOLD_SQ * 1.1) {
            createExplosionEffect(pickup.position.clone(), ammoPickupMaterial.color.clone());
            scene.remove(pickup); ammoPickups.splice(i, 1); logTotalPickupCount("Collected AI Ammo");
            aiObject.ammoCount += 1; // Increment specific AI's ammo
            updateAmmoIndicatorAI(aiObject); // Pass AI object to update indicator
            handleAICounterUpdate(); 
            return true;
        }
    } return false;
} 