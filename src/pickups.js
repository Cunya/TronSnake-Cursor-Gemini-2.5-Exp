import * as THREE from 'three';
import { 
    scene, scoreP1, topScore, pickupsCollectedCounter, snakeTargetPosition1, snakeTargetPosition2, 
    snakeDirection1, snakeDirection2, isSpeedBoostActiveP1, isZoomedOutP1, isSparseTrailActiveP1, 
    isSpeedBoostActiveAI, isSparseTrailActiveAI, ammoCountP1, ammoCountAI, 
    scorePickups, expansionPickups, clearPickups, zoomPickups, sparseTrailPickups, multiSpawnPickups, addAiPickups, ammoPickups, 
    maxScorePickups, maxExpansionPickups, maxClearPickups, maxZoomPickups, maxSparseTrailPickups, maxAmmoPickups, maxMultiSpawnPickups, maxAddAiPickups, 
    topScoreAtGameStart, unlockedScoresThisGame, snakeHead1, snakeHead2, boundaryXMin, boundaryXMax, boundaryZMin, boundaryZMax, zoomLevelP1, zoomOutEndTimeP1, sparseLevelP1, sparseTrailEndTimeP1, sparseLevelAI, sparseTrailEndTimeAI,
    trailSegments1, trailSegments2, // Needed for wall checks
    // Pickup Templates
    sparseTrailPickupTemplate, ammoPickupTemplate,
    // State Setters
    setSpeedBoostActiveP1, setSpeedBoostEndTimeP1, setIsZoomedOutP1, setZoomOutEndTimeP1, setZoomLevelP1, 
    setIsSparseTrailActiveP1, setSparseTrailEndTimeP1, setTrailCounterP1, setSparseLevelP1, 
    setSpeedBoostActiveAI, setSpeedBoostEndTimeAI, setIsSparseTrailActiveAI, setSparseTrailEndTimeAI, setTrailCounterAI, setSparseLevelAI,
    setPickupsCollectedCounter, setBoundaryXMax, setBoundaryXMin, setBoundaryZMax, setBoundaryZMin,
    setMaxScorePickups, setMaxExpansionPickups, setMaxClearPickups, setMaxZoomPickups, setMaxSparseTrailPickups, setMaxMultiSpawnPickups, setMaxAddAiPickups, setMaxAmmoPickups,
    setAmmoCountP1, setAmmoCountAI, setScoreP1,
    // Import new state vars and setters for counter tracking
    nextAmmoSpawnCount, nextClearSpawnCount, nextAddAiSpawnCount, nextExpansionSpawnCount, nextMultiSpawnCount, 
    setNextAmmoSpawnCount, setNextClearSpawnCount, setNextAddAiSpawnCount, setNextExpansionSpawnCount, setNextMultiSpawnCount
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
    AMMO_PICKUP_RADIUS, P1_HEAD_COLOR_BOOST, AI_HEAD_COLOR_BOOST
} from './constants.js';
import { snapToGridCenter, logTotalPickupCount, getGridDimensions } from './utils.js';
import { createExplosionEffect, createFloatingText, updateAmmoIndicatorP1, updateAmmoIndicatorAI, clearAllTrails, createPlayAreaVisuals } from './visuals.js';
import { isPositionSafe } from './ai.js'; // Need isPositionSafe for spawning

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
    // Need boundaryXMin, boundaryZMin, trailSegments1, trailSegments2 from state
    const worldX = snapToGridCenter(boundaryXMin + gridX * segmentSize, 'x');
    const worldZ = snapToGridCenter(boundaryZMin + gridZ * segmentSize, 'z');
    const checkPos = new THREE.Vector3(worldX, 0, worldZ); 
    const wallCheckThreshold = segmentSize * 0.45; 

    for (const seg of [...trailSegments1, ...trailSegments2]) {
        if (checkPos.distanceTo(seg.position) < wallCheckThreshold) {
            return true; 
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
// Returns boolean indicating success/failure
function trySpawn(typeToSpawn) {
    // console.log(`  [trySpawn] Attempting to spawn type: ${typeToSpawn}`); // Log entry
    if (!typeToSpawn) {
        // console.warn("  [trySpawn] Called with no type.");
        return false; 
    }

    let geometry, material, targetArray, pickupHeight;
    let pickupVisual;
    let spawnTypeName = typeToSpawn;

    switch (typeToSpawn) {
        case "multi":
            pickupVisual = new THREE.Mesh(multiSpawnGeometry, multiSpawnMaterial);
            targetArray = multiSpawnPickups;
            pickupHeight = segmentSize * 0.45 * 2;
            break;
        case "sparse":
            pickupVisual = sparseTrailPickupTemplate; // Needs state.sparseTrailPickupTemplate
            targetArray = sparseTrailPickups;
            pickupHeight = (segmentSize * 0.27 * 2) + 0.3;
            break;
        case "zoom":
            pickupVisual = new THREE.Mesh(zoomPickupGeometry, zoomPickupMaterial);
            targetArray = zoomPickups;
            pickupHeight = segmentSize * 0.5;
            break;
        case "clear":
            pickupVisual = new THREE.Mesh(clearPickupGeometry, clearPickupMaterial);
            targetArray = clearPickups;
            pickupHeight = segmentSize * 0.5;
            break;
        case "expansion":
            pickupVisual = new THREE.Mesh(expansionPickupGeometry, expansionPickupMaterial);
            targetArray = expansionPickups;
            pickupHeight = segmentSize * 0.7;
            break;
        case "score":
            pickupVisual = new THREE.Mesh(scorePickupGeometry, scorePickupMaterial);
            targetArray = scorePickups;
            pickupHeight = segmentSize * 0.6;
            spawnTypeName = "score";
            break;
        case "add_ai":
            pickupVisual = new THREE.Mesh(addAiPickupGeometry, addAiPickupMaterial);
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
            return false;
    }

    if (!pickupVisual) {
        // console.error(`  [trySpawn] Could not create visual for type: ${typeToSpawn}. Template might be missing.`);
        return false;
    }

    const currentMax = getMaxForType(typeToSpawn);
    // console.log(`  [trySpawn] Current count: ${targetArray.length}, Max allowed: ${currentMax}`); // Log count check
    if (targetArray.length >= currentMax) {
        // console.log(`  [trySpawn] Max reached for type ${typeToSpawn}.`);
        return false;
    }

    const maxAttempts = 50;
    const { divisionsX, divisionsZ } = getGridDimensions(); 
    // console.log(`  [trySpawn] Starting position search (max ${maxAttempts} attempts)...`); // Log search start
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const gridX = Math.floor(Math.random() * divisionsX);
        const gridZ = Math.floor(Math.random() * divisionsZ);
        const worldX = snapToGridCenter(boundaryXMin + gridX * segmentSize, 'x');
        const worldZ = snapToGridCenter(boundaryZMin + gridZ * segmentSize, 'z');
        const worldY = GROUND_Y + (pickupHeight / 2.0); 
        const potentialPos = new THREE.Vector3(worldX, worldY, worldZ);
        
        const safe = isPositionSafe(potentialPos, true, false); 
        const adjacent = isCellAdjacentToWall(gridX, gridZ);

        if (safe) { 
            if (!adjacent) {
                const pickup = pickupVisual.clone();
                pickup.position.copy(potentialPos);
                scene.add(pickup);
                targetArray.push(pickup);
                // console.log(`  [trySpawn] SUCCESS on attempt ${attempt+1} for ${spawnTypeName}!`); // Log success
                logTotalPickupCount(`Spawned ${spawnTypeName}`); // Keep this useful one
                return true;
            } else {
                 // console.log(`  [trySpawn attempt ${attempt+1}] Rejected: Adjacent to wall.`); // Log rejection reason
            }
        } else {
             // console.log(`  [trySpawn attempt ${attempt+1}] Rejected: Position not safe.`); // Log rejection reason
        }
    }
    // console.warn(`  [trySpawn] Could not find empty space for pickup type ${spawnTypeName} after ${maxAttempts} attempts.`); // Log failure
    logTotalPickupCount(`Failed spawn ${spawnTypeName}`); // Keep this useful one
    return false;
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
        if (isUnlocked('ammo')) {
            if (trySpawn("ammo")) {
                const nextCount = nextAmmoSpawnCount + AMMO_PICKUP_THRESHOLD;
                if (setNextAmmoSpawnCount) setNextAmmoSpawnCount(nextCount);
                console.log(`    -> Spawned Ammo, next check at ${nextCount}`);
            } else {
                console.log(`    -> Failed to spawn Ammo (max reached or no space?)`);
            }
        } else {
            console.log(`    -> Ammo not unlocked yet (Top Score: ${topScore})`);
        }
    }

    // Clear Walls Check
    if (currentPickupCount >= nextClearSpawnCount && clearPickups.length < maxClearPickups) {
         console.log(` -> Counter threshold met for CLEAR (${currentPickupCount} >= ${nextClearSpawnCount})`);
         if (isUnlocked('clear')) {
            if (trySpawn("clear")) {
                const nextCount = nextClearSpawnCount + CLEAR_WALL_PICKUP_THRESHOLD;
                if (setNextClearSpawnCount) setNextClearSpawnCount(nextCount);
                 console.log(`    -> Spawned Clear, next check at ${nextCount}`);
            } else {
                console.log(`    -> Failed to spawn Clear`);
            }
        } else {
             console.log(`    -> Clear Walls not unlocked yet (Top Score: ${topScore})`);
        }
    }

    // Add AI Check
    if (currentPickupCount >= nextAddAiSpawnCount && addAiPickups.length < maxAddAiPickups) {
        console.log(` -> Counter threshold met for ADD_AI (${currentPickupCount} >= ${nextAddAiSpawnCount})`);
        if (isUnlocked('add_ai')) {
            if (trySpawn("add_ai")) {
                const nextCount = nextAddAiSpawnCount + ADD_AI_PICKUP_THRESHOLD;
                if (setNextAddAiSpawnCount) setNextAddAiSpawnCount(nextCount);
                 console.log(`    -> Spawned AddAI, next check at ${nextCount}`);
            } else {
                console.log(`    -> Failed to spawn AddAI`);
            }
        } else {
             console.log(`    -> Add AI not unlocked yet (Top Score: ${topScore})`);
        }
    }

    // Expansion Check
    if (currentPickupCount >= nextExpansionSpawnCount && expansionPickups.length < maxExpansionPickups) {
        console.log(` -> Counter threshold met for EXPANSION (${currentPickupCount} >= ${nextExpansionSpawnCount})`);
        if (isUnlocked('expansion')) {
            if (trySpawn("expansion")) {
                const nextCount = nextExpansionSpawnCount + EXPAND_PICKUP_THRESHOLD;
                if (setNextExpansionSpawnCount) setNextExpansionSpawnCount(nextCount);
                 console.log(`    -> Spawned Expansion, next check at ${nextCount}`);
            } else {
                 console.log(`    -> Failed to spawn Expansion`);
            }
        } else {
            console.log(`    -> Expansion not unlocked yet (Top Score: ${topScore})`);
        }
    }

    // Multi-Spawn Check (Note: Threshold might need adjustment)
    if (currentPickupCount >= nextMultiSpawnCount && multiSpawnPickups.length < maxMultiSpawnPickups) {
        console.log(` -> Counter threshold met for MULTI (${currentPickupCount} >= ${nextMultiSpawnCount})`);
        if (isUnlocked('multi')) {
            if (trySpawn("multi")) {
                const nextCount = nextMultiSpawnCount + MULTI_PICKUP_THRESHOLD;
                if (setNextMultiSpawnCount) setNextMultiSpawnCount(nextCount);
                 console.log(`    -> Spawned Multi, next check at ${nextCount}`);
            } else {
                console.log(`    -> Failed to spawn Multi`);
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
    const primarySpawnSuccess = trySpawn(pickupType);

    console.log(`--- spawnPickup finished for type: ${pickupType} ---`);
    return primarySpawnSuccess;
}

// Spawn Initial Pickups (Called from init)
export function spawnInitialPickups() {
    // console.log("[spawnInitialPickups] Starting initial spawn sequence."); // Log entry
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

    // console.log(`[spawnInitialPickups] Initial spawn eligibility (all based on topScore ${topScore}):`, initiallyEligibleTypes);
    // console.log(`[spawnInitialPickups] Attempting initial spawn for non-counter types:`, nonCounterEligibleTypes); // Log eligible types

    if (nonCounterEligibleTypes.length === 0) {
        console.warn("No non-counter powerups unlocked based on topScore! Cannot perform initial spawn.");
        return;
    }

    let spawnedCount = 0;
    const maxInitialSpawns = 3; 
    
    // Explicitly try to spawn the first few unique eligible types
    for (let i = 0; i < Math.min(maxInitialSpawns, nonCounterEligibleTypes.length); i++) {
        const typeToSpawn = nonCounterEligibleTypes[i];
        
        // console.log(`[spawnInitialPickups] Initial spawn attempt ${i + 1}: Trying type '${typeToSpawn}'`); // Log specific attempt
        const success = spawnPickup(typeToSpawn);
        if (success) {
            spawnedCount++;
        }
    }

    // console.log(`[spawnInitialPickups] Finished initial spawn attempts. Spawned ${spawnedCount} pickups.`); // Log final count
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
function handleScoreUpdateAndCounters(scoreAmount) {
    const newScore = scoreP1 + scoreAmount;
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
            createExplosionEffect(pos, col); createFloatingText("+40 Speed Up!", pos, col);
            scene.remove(pickup); scorePickups.splice(i, 1); logTotalPickupCount("Collected Player SpeedUp");
            if (!isSpeedBoostActiveP1 && snakeHead1) snakeHead1.material.color.setHex(P1_HEAD_COLOR_BOOST);
            setSpeedBoostActiveP1(true); setSpeedBoostEndTimeP1(performance.now() + boostDuration);
            handleScoreUpdateAndCounters(40); // Use new helper
            spawnPickup("score"); return true;
        }
    } return false;
}

function checkExpansionPickupCollision() {
    for (let i = expansionPickups.length - 1; i >= 0; i--) {
        const pickup = expansionPickups[i];
        if (snakeTargetPosition1.distanceToSquared(pickup.position) < PICKUP_COLLISION_THRESHOLD_SQ * 1.1) {
             const pos = pickup.position.clone(); const col = pickup.material.color.clone();
            createExplosionEffect(pos, col); createFloatingText("+150 Expand!", pos, col);
            scene.remove(pickup); expansionPickups.splice(i, 1); logTotalPickupCount("Collected Player Expand");
            const dirX = snakeDirection1.x, dirZ = snakeDirection1.z;
            let expanded = false, bx_min = boundaryXMin, bx_max = boundaryXMax, bz_min = boundaryZMin, bz_max = boundaryZMax;
            if (dirX > 0.5) { bx_max += expansionAmount; setBoundaryXMax(bx_max); expanded = true; }
            else if (dirX < -0.5) { bx_min -= expansionAmount; setBoundaryXMin(bx_min); expanded = true; }
            else if (dirZ > 0.5) { bz_max += expansionAmount; setBoundaryZMax(bz_max); expanded = true; }
            else if (dirZ < -0.5) { bz_min -= expansionAmount; setBoundaryZMin(bz_min); expanded = true; }
            if(expanded) createPlayAreaVisuals(bx_min, bx_max, bz_min, bz_max);
            handleScoreUpdateAndCounters(150); // Use new helper
            // Expansion pickup does not respawn itself
            return true;
        }
    } return false;
}

function checkClearPickupCollision() {
     for (let i = clearPickups.length - 1; i >= 0; i--) {
        const pickup = clearPickups[i];
        if (snakeTargetPosition1.distanceToSquared(pickup.position) < PICKUP_COLLISION_THRESHOLD_SQ * 1.1) {
            const pos = pickup.position.clone(); const col = pickup.material.color.clone();
            createExplosionEffect(pos, col); createFloatingText("+100 Clear Walls!", pos, col);
            scene.remove(pickup); clearPickups.splice(i, 1); logTotalPickupCount("Collected Player Clear");
            clearAllTrails(); 
            handleScoreUpdateAndCounters(100); // Use new helper
            // Clear pickup does not respawn itself
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
            scene.remove(pickup); zoomPickups.splice(i, 1); logTotalPickupCount("Collected Player Zoom");
            const currentTime = performance.now(); let currentZoomLevel = zoomLevelP1, newLevelP1;
            if (isZoomedOutP1 && zoomOutEndTimeP1 > currentTime) { currentZoomLevel++; newLevelP1 = currentZoomLevel; }
            else { setIsZoomedOutP1(true); currentZoomLevel = 1; newLevelP1 = 1; }
            setZoomLevelP1(currentZoomLevel); setZoomOutEndTimeP1(currentTime + zoomOutDuration);
            createFloatingText(`+20 Zoom Out! (Lv ${newLevelP1})`, pos, col);
            handleScoreUpdateAndCounters(20); // Use new helper
            spawnPickup("zoom"); 
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
            setTrailCounterP1(0); createFloatingText(`+60 Sparse Trail! (Lv ${newLevelP1})`, pos, col);
            handleScoreUpdateAndCounters(60); // Use new helper
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
            createExplosionEffect(pos, col); createFloatingText("+200 Max ++!", pos, col);
            scene.remove(pickup); multiSpawnPickups.splice(i, 1); logTotalPickupCount("Collected Player Multi");
            handleScoreUpdateAndCounters(200); // Use new helper
            
            let eligible = [];
            // Eligibility uses topScore now?
            if (topScore >= 0 && zoomPickups.length < maxZoomPickups) eligible.push("zoom");
            if (topScore >= 50 && scorePickups.length < maxScorePickups) eligible.push("score");
            if (topScore >= 200 && sparseTrailPickups.length < maxSparseTrailPickups) eligible.push("sparse");
            
            const spawnAndInc = (type) => { 
                console.log(`Multi Spawn: Spawning random type: ${type}`);
                spawnPickup(type); // Use the main spawner (handles non-counter types)
                // Increment max counts (Keep this part)
                switch (type) { 
                    case "score": setMaxScorePickups(maxScorePickups + 1); break; 
                    case "expansion": setMaxExpansionPickups(maxExpansionPickups + 1); break; 
                    case "clear": setMaxClearPickups(maxClearPickups + 1); break; 
                    case "zoom": setMaxZoomPickups(maxZoomPickups + 1); break; 
                    case "sparse": setMaxSparseTrailPickups(maxSparseTrailPickups + 1); break; 
                    case "add_ai": setMaxAddAiPickups(maxAddAiPickups + 1); break; 
                    case "ammo": setMaxAmmoPickups(maxAmmoPickups + 1); break; 
                } 
            }; 
            if (eligible.length > 0) spawnAndInc(eligible[Math.floor(Math.random() * eligible.length)]);
            if (eligible.length > 0) spawnAndInc(eligible[Math.floor(Math.random() * eligible.length)]);
            
            // Multi pickup does not respawn itself directly
            return true;
        }
    } return false;
}

function checkAddAiPickupCollision() {
    for (let i = addAiPickups.length - 1; i >= 0; i--) {
        const pickup = addAiPickups[i];
        if (snakeTargetPosition1.distanceToSquared(pickup.position) < PICKUP_COLLISION_THRESHOLD_SQ * 1.1) {
            const pos = pickup.position.clone(); const col = addAiPickupMaterial.color.clone();
            createExplosionEffect(pos, col); createFloatingText("+125 More Players!", pos, col);
            scene.remove(pickup); addAiPickups.splice(i, 1); logTotalPickupCount("Collected Player AddAI");
            // TODO: Implement actual AI spawning!
            handleScoreUpdateAndCounters(125); // Use new helper
            // Add AI pickup does not respawn itself
            return true;
        }
    } return false;
}

function checkAmmoPickupCollision() {
    for (let i = ammoPickups.length - 1; i >= 0; i--) {
        const pickup = ammoPickups[i];
        if (snakeTargetPosition1.distanceToSquared(pickup.position) < PICKUP_COLLISION_THRESHOLD_SQ * 1.1) {
            const pos = pickup.position.clone(); const col = ammoPickupMaterial.color.clone();
            createExplosionEffect(pos, col); createFloatingText("+80 Ammo!", pos, col);
            scene.remove(pickup); ammoPickups.splice(i, 1); logTotalPickupCount("Collected Player Ammo");
            setAmmoCountP1(ammoCountP1 + 1); updateAmmoIndicatorP1();
            handleScoreUpdateAndCounters(80); // Use new helper
            // Ammo pickup does not respawn itself
            return true;
        }
    } return false;
}

// AI Collision Checks (Need similar updates for counter checks)
export function checkAIPickupCollisions() {
    if (checkAIScorePickupCollision()) return true;
    if (checkAIExpansionPickupCollision()) return true;
    if (checkAIClearPickupCollision()) return true;
    if (checkAIZoomPickupCollision()) return true;
    if (checkAISparseTrailPickupCollision()) return true;
    if (checkAIMultiSpawnPickupCollision()) return true;
    if (checkAIAddAiPickupCollision()) return true;
    if (checkAIAmmoPickupCollision()) return true;
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

function checkAIScorePickupCollision() {
    for (let i = scorePickups.length - 1; i >= 0; i--) {
        const pickup = scorePickups[i];
        if (snakeTargetPosition2.distanceToSquared(pickup.position) < PICKUP_COLLISION_THRESHOLD_SQ * 1.1) {
            createExplosionEffect(pickup.position.clone(), pickup.material.color.clone());
            scene.remove(pickup); scorePickups.splice(i, 1); logTotalPickupCount("Collected AI SpeedUp");
            if (!isSpeedBoostActiveAI && snakeHead2) snakeHead2.material.color.setHex(AI_HEAD_COLOR_BOOST);
            setSpeedBoostActiveAI(true); setSpeedBoostEndTimeAI(performance.now() + boostDuration);
            handleAICounterUpdate(); // Use new helper
            spawnPickup("score"); 
            return true;
        }
    } return false;
}

function checkAIExpansionPickupCollision() {
     for (let i = expansionPickups.length - 1; i >= 0; i--) {
        const pickup = expansionPickups[i];
        if (snakeTargetPosition2.distanceToSquared(pickup.position) < PICKUP_COLLISION_THRESHOLD_SQ * 1.1) {
            createExplosionEffect(pickup.position.clone(), pickup.material.color.clone());
            scene.remove(pickup); expansionPickups.splice(i, 1); logTotalPickupCount("Collected AI Expand");
            const dirX = snakeDirection2.x, dirZ = snakeDirection2.z;
            let expanded = false, bx_min = boundaryXMin, bx_max = boundaryXMax, bz_min = boundaryZMin, bz_max = boundaryZMax;
            if (dirX > 0.5) { bx_max += expansionAmount; setBoundaryXMax(bx_max); expanded = true; } else if (dirX < -0.5) { bx_min -= expansionAmount; setBoundaryXMin(bx_min); expanded = true; } else if (dirZ > 0.5) { bz_max += expansionAmount; setBoundaryZMax(bz_max); expanded = true; } else if (dirZ < -0.5) { bz_min -= expansionAmount; setBoundaryZMin(bz_min); expanded = true; }
            if(expanded) createPlayAreaVisuals(bx_min, bx_max, bz_min, bz_max);
            handleAICounterUpdate(); // Use new helper
            return true;
        }
    } return false;
}

function checkAIClearPickupCollision() {
    for (let i = clearPickups.length - 1; i >= 0; i--) {
        const pickup = clearPickups[i];
        if (snakeTargetPosition2.distanceToSquared(pickup.position) < PICKUP_COLLISION_THRESHOLD_SQ * 1.1) {
            createExplosionEffect(pickup.position.clone(), pickup.material.color.clone());
            scene.remove(pickup); clearPickups.splice(i, 1); logTotalPickupCount("Collected AI Clear");
            clearAllTrails(); 
            handleAICounterUpdate(); // Use new helper
            return true;
        }
    } return false;
}

function checkAIZoomPickupCollision() {
    for (let i = zoomPickups.length - 1; i >= 0; i--) {
        const pickup = zoomPickups[i];
        if (snakeTargetPosition2.distanceToSquared(pickup.position) < PICKUP_COLLISION_THRESHOLD_SQ * 1.1) {
            createExplosionEffect(pickup.position.clone(), pickup.material.color.clone());
            scene.remove(pickup); zoomPickups.splice(i, 1); logTotalPickupCount("Collected AI Zoom");
            handleAICounterUpdate(); // Use new helper
            spawnPickup("zoom"); 
            return true;
        }
    } return false;
}

function checkAISparseTrailPickupCollision() {
    for (let i = sparseTrailPickups.length - 1; i >= 0; i--) {
        const pickup = sparseTrailPickups[i];
        if (snakeTargetPosition2.distanceToSquared(pickup.position) < PICKUP_COLLISION_THRESHOLD_SQ * 1.1) {
            const pos = pickup.position.clone(); const col = sparseTrailMaterial.color.clone();
            createExplosionEffect(pos, col);
            const currentTime = performance.now(); let currentSparseLevel = sparseLevelAI, newLevelAI;
            if (isSparseTrailActiveAI && sparseTrailEndTimeAI > currentTime) { currentSparseLevel++; newLevelAI = currentSparseLevel; }
            else { setIsSparseTrailActiveAI(true); currentSparseLevel = 1; newLevelAI = 1; }
            setSparseLevelAI(currentSparseLevel); setSparseTrailEndTimeAI(currentTime + sparseTrailDuration);
            setTrailCounterAI(0);
            scene.remove(pickup); sparseTrailPickups.splice(i, 1);
            logTotalPickupCount("Collected AI Sparse");
            handleAICounterUpdate(); // Use new helper
            spawnPickup("sparse");
            return true;
        }
    } return false;
}

function checkAIMultiSpawnPickupCollision() {
    for (let i = multiSpawnPickups.length - 1; i >= 0; i--) {
        const pickup = multiSpawnPickups[i];
        if (snakeTargetPosition2.distanceToSquared(pickup.position) < PICKUP_COLLISION_THRESHOLD_SQ * 1.1) {
            createExplosionEffect(pickup.position.clone(), multiSpawnMaterial.color.clone());
            scene.remove(pickup); multiSpawnPickups.splice(i, 1); logTotalPickupCount("Collected AI Multi");
            handleAICounterUpdate(); // Use new helper
            
            let eligible = [];
             // Eligibility based on player score?
            if (topScore >= 0 && zoomPickups.length < maxZoomPickups) eligible.push("zoom");
            if (topScore >= 50 && scorePickups.length < maxScorePickups) eligible.push("score");
            if (topScore >= 200 && sparseTrailPickups.length < maxSparseTrailPickups) eligible.push("sparse");
            
            const spawnAndInc = (type) => { 
                console.log(`AI Multi Spawn: Spawning random type: ${type}`);
                spawnPickup(type); 
                // Use setters
                switch (type) { 
                    case "score": setMaxScorePickups(maxScorePickups + 1); break; 
                    case "expansion": setMaxExpansionPickups(maxExpansionPickups + 1); break; 
                    case "clear": setMaxClearPickups(maxClearPickups + 1); break; 
                    case "zoom": setMaxZoomPickups(maxZoomPickups + 1); break; 
                    case "sparse": setMaxSparseTrailPickups(maxSparseTrailPickups + 1); break; 
                    case "add_ai": setMaxAddAiPickups(maxAddAiPickups + 1); break; 
                    case "ammo": setMaxAmmoPickups(maxAmmoPickups + 1); break; 
                } 
            }; 
            if (eligible.length > 0) spawnAndInc(eligible[Math.floor(Math.random() * eligible.length)]);
            if (eligible.length > 0) spawnAndInc(eligible[Math.floor(Math.random() * eligible.length)]);
            // Multi pickup does not respawn itself
            return true;
        }
    } return false;
}

function checkAIAddAiPickupCollision() {
     for (let i = addAiPickups.length - 1; i >= 0; i--) {
        const pickup = addAiPickups[i];
        if (snakeTargetPosition2.distanceToSquared(pickup.position) < PICKUP_COLLISION_THRESHOLD_SQ * 1.1) {
            createExplosionEffect(pickup.position.clone(), addAiPickupMaterial.color.clone());
            scene.remove(pickup); addAiPickups.splice(i, 1); logTotalPickupCount("Collected AI AddAI");
            // TODO: Implement actual AI spawning!
            handleAICounterUpdate(); // Use new helper
            return true;
        }
    } return false;
}

function checkAIAmmoPickupCollision() {
    for (let i = ammoPickups.length - 1; i >= 0; i--) {
        const pickup = ammoPickups[i];
        if (snakeTargetPosition2.distanceToSquared(pickup.position) < PICKUP_COLLISION_THRESHOLD_SQ * 1.1) {
            createExplosionEffect(pickup.position.clone(), ammoPickupMaterial.color.clone());
            scene.remove(pickup); ammoPickups.splice(i, 1); logTotalPickupCount("Collected AI Ammo");
            setAmmoCountAI(ammoCountAI + 1); updateAmmoIndicatorAI();
            handleAICounterUpdate(); // Use new helper
            return true;
        }
    } return false;
} 