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
    setAmmoCountP1, setAmmoCountAI, setScoreP1 // Assuming a setter for scoreP1 exists in state.js
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
    if (!typeToSpawn) {
        console.warn("trySpawn: Called with no type.");
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
        console.error(`trySpawn: Could not create visual for type: ${typeToSpawn}. Template might be missing.`);
        return false;
    }

    if (targetArray.length >= getMaxForType(typeToSpawn)) {
        return false;
    }

    const maxAttempts = 50;
    const { divisionsX, divisionsZ } = getGridDimensions(); // Needs boundary state via utils
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const gridX = Math.floor(Math.random() * divisionsX);
        const gridZ = Math.floor(Math.random() * divisionsZ);
        const worldX = snapToGridCenter(boundaryXMin + gridX * segmentSize, 'x'); // Needs boundary state
        const worldZ = snapToGridCenter(boundaryZMin + gridZ * segmentSize, 'z'); // Needs boundary state
        const worldY = GROUND_Y + (pickupHeight / 2.0); // Needs GROUND_Y from constants
        const potentialPos = new THREE.Vector3(worldX, worldY, worldZ);
        
        // Use isPositionSafe from AI module, checking only against pickups/trails
        if (isPositionSafe(potentialPos, true, false)) { // Don't check heads for spawn safety
            if (!isCellAdjacentToWall(gridX, gridZ)) {
                const pickup = pickupVisual.clone();
                pickup.position.copy(potentialPos);
                scene.add(pickup);
                targetArray.push(pickup);
                logTotalPickupCount(`Spawned ${spawnTypeName}`);
                return true;
            }
        }
    }
    console.warn(`Could not find empty space for pickup type ${spawnTypeName}.`);
    logTotalPickupCount(`Failed spawn ${spawnTypeName}`);
    return false;
}


// Main Pickup Spawning Logic (Called during game and by spawnInitialPickups)
// Returns boolean for initial spawn success check
export function spawnPickup(forceType = null) {
    console.log(`--- spawnPickup called with forceType: ${forceType} ---`);
    let pickupType = forceType;
    let attemptExtraClearSpawn = false;
    let attemptExtraAmmoSpawn = false;

    // Check for Extra Spawns
    if (topScore >= 500 && pickupsCollectedCounter > 0 && pickupsCollectedCounter % CLEAR_WALL_PICKUP_THRESHOLD === 0 && clearPickups.length < maxClearPickups) {
        console.log(`  -> EXTRA SPAWN CHECK: Counter ${pickupsCollectedCounter}, Eligible for extra Clear Walls.`);
        attemptExtraClearSpawn = true;
    }
    if (topScore >= 300 && pickupsCollectedCounter > 0 && pickupsCollectedCounter % AMMO_PICKUP_THRESHOLD === 0 && ammoPickups.length < maxAmmoPickups) {
        console.log(`  -> EXTRA SPAWN CHECK: Counter ${pickupsCollectedCounter}, Eligible for extra Ammo.`);
        attemptExtraAmmoSpawn = true;
    }

    // Determine Primary Spawn Type (if not forced)
    if (!pickupType) {
        console.log("  -> No forceType, determining eligible types...");
        let eligibleTypes = [];
        if (zoomPickups.length < maxZoomPickups) eligibleTypes.push({ type: "zoom" });
        if (scoreP1 >= 50 && scorePickups.length < maxScorePickups) eligibleTypes.push({ type: "score" });
        if (scoreP1 >= 200 && sparseTrailPickups.length < maxSparseTrailPickups) eligibleTypes.push({ type: "sparse" });
        if (scoreP1 >= 300 && ammoPickups.length < maxAmmoPickups) eligibleTypes.push({ type: "ammo" });

        const clearEligible = scoreP1 >= 500 && pickupsCollectedCounter >= CLEAR_WALL_PICKUP_THRESHOLD && clearPickups.length < maxClearPickups;
        const addAiEligible = scoreP1 >= 1000 && pickupsCollectedCounter >= ADD_AI_PICKUP_THRESHOLD && addAiPickups.length < maxAddAiPickups;
        const expandEligible = scoreP1 >= 1500 && pickupsCollectedCounter >= EXPAND_PICKUP_THRESHOLD && expansionPickups.length < maxExpansionPickups;
        const multiEligible = scoreP1 >= 2000 && pickupsCollectedCounter >= MULTI_PICKUP_THRESHOLD && multiSpawnPickups.length < maxMultiSpawnPickups;

        if (clearEligible) eligibleTypes.push({ type: "clear" });
        if (addAiEligible) eligibleTypes.push({ type: "add_ai" });
        if (expandEligible) eligibleTypes.push({ type: "expansion" });
        if (multiEligible) eligibleTypes.push({ type: "multi" });

        if (eligibleTypes.length === 0) {
            console.log("  -> No counter types eligible, falling back to score types.");
            if (zoomPickups.length < maxZoomPickups) eligibleTypes.push({ type: "zoom" });
            if (scoreP1 >= 50 && scorePickups.length < maxScorePickups) eligibleTypes.push({ type: "score" });
            if (scoreP1 >= 200 && sparseTrailPickups.length < maxSparseTrailPickups) eligibleTypes.push({ type: "sparse" });
        }

        if (eligibleTypes.length === 0) {
            console.log("  -> No eligible pickup types to spawn (including fallbacks).");
            return false; // Indicate failure if nothing can be spawned
        }

        const randomIndex = Math.floor(Math.random() * eligibleTypes.length);
        pickupType = eligibleTypes[randomIndex].type;
        console.log(`  -> Randomly selected pickupType: ${pickupType}`);
    }

    console.log(`  -> Final pickupType determined: ${pickupType}`);
    console.log(`  -> Extra clear spawn flag: ${attemptExtraClearSpawn}`);
    console.log(`  -> Extra ammo spawn flag: ${attemptExtraAmmoSpawn}`);

    if (!pickupType) {
        console.warn("  -> No pickup type could be determined. Exiting spawnPickup.");
        return false;
    }

    // Primary Spawn Attempt
    console.log(`  -> Attempting primary spawn: ${pickupType}`);
    const primarySpawnSuccess = trySpawn(pickupType);

    // Attempt Extra Spawns if Flagged
    let extraClearSuccess = false;
    if (attemptExtraClearSpawn) {
        console.log("  -> Checking conditions for extra clear spawn attempt...");
        if (clearPickups.length < maxClearPickups) {
            console.log(`    -> Proceeding with extra Clear Walls spawn.`);
            extraClearSuccess = trySpawn("clear");
        } else {
            console.log(`    -> Skipping extra Clear Walls spawn (max reached).`);
        }
    }
    let extraAmmoSuccess = false;
    if (attemptExtraAmmoSpawn) {
        console.log("  -> Checking conditions for extra ammo spawn attempt...");
        if (ammoPickups.length < maxAmmoPickups) {
            console.log(`    -> Proceeding with extra Ammo spawn.`);
            extraAmmoSuccess = trySpawn("ammo");
        } else {
            console.log(`    -> Skipping extra Ammo spawn (max reached).`);
        }
    }

    console.log(`--- spawnPickup finished for forceType: ${forceType} ---`);
    return primarySpawnSuccess;
}

// Spawn Initial Pickups (Called from init)
export function spawnInitialPickups() {
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

    console.log(`Initial spawn eligibility (all based on topScore ${topScore}):`, initiallyEligibleTypes);
    console.log(`Attempting initial spawn for non-counter types:`, nonCounterEligibleTypes);

    if (nonCounterEligibleTypes.length === 0) {
        console.warn("No non-counter powerups unlocked based on topScore! Cannot perform initial spawn.");
        return;
    }

    let spawnedCount = 0;
    for (const typeToSpawn of nonCounterEligibleTypes) {
        console.log(`  Initial spawn attempt: Forcing type '${typeToSpawn}'`);
        const success = spawnPickup(typeToSpawn);
        if (success) {
            spawnedCount++;
        }
    }
    console.log(`Finished initial spawn attempts for non-counter types. Spawned ${spawnedCount} pickups.`);
    logTotalPickupCount("After Initial Spawn");
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
                console.log(`--- UNLOCKED (Already Available): ${unlock.name} at score ${currentScore} ---`);
            }
        }
    }
}


// --- Pickup Collision Checks --- (Called from animate)

// Player 1 Collision Checks
export function checkPlayerPickupCollisions() {
    if (checkScorePickupCollision()) return;
    if (checkExpansionPickupCollision()) return;
    if (checkClearPickupCollision()) return;
    if (checkZoomPickupCollision()) return;
    if (checkSparseTrailPickupCollision()) return;
    if (checkMultiSpawnPickupCollision()) return;
    if (checkAddAiPickupCollision()) return;
    if (checkAmmoPickupCollision()) return;
}

function checkScorePickupCollision() {
    for (let i = scorePickups.length - 1; i >= 0; i--) {
        const pickup = scorePickups[i];
        const dx = snakeTargetPosition1.x - pickup.position.x;
        const dz = snakeTargetPosition1.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) {
            const pos = pickup.position.clone(); const col = pickup.material.color.clone();
            createExplosionEffect(pos, col);
            createFloatingText("+40 Speed Up!", pos, col);
            handleScoreUpdate(40);
            scene.remove(pickup); scorePickups.splice(i, 1);
            logTotalPickupCount("Collected Player SpeedUp");
            if (!isSpeedBoostActiveP1) {
                if(snakeHead1) snakeHead1.material.color.setHex(P1_HEAD_COLOR_BOOST);
            }
            setSpeedBoostActiveP1(true);
            setSpeedBoostEndTimeP1(performance.now() + boostDuration);
            setPickupsCollectedCounter(pickupsCollectedCounter + 1);
            spawnPickup("score");
            return true;
        }
    }
    return false;
}

function checkExpansionPickupCollision() {
    for (let i = expansionPickups.length - 1; i >= 0; i--) {
        const pickup = expansionPickups[i];
        const dx = snakeTargetPosition1.x - pickup.position.x;
        const dz = snakeTargetPosition1.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) {
            const pos = pickup.position.clone(); const col = pickup.material.color.clone();
            createExplosionEffect(pos, col);
            createFloatingText("+150 Expand!", pos, col);
            handleScoreUpdate(150);
            scene.remove(pickup); expansionPickups.splice(i, 1);
            logTotalPickupCount("Collected Player Expand");

            const dirX = snakeDirection1.x;
            const dirZ = snakeDirection1.z;
            let expanded = false;
            let bx_min = boundaryXMin, bx_max = boundaryXMax, bz_min = boundaryZMin, bz_max = boundaryZMax;
            if (dirX > 0.5) { bx_max += expansionAmount; setBoundaryXMax(bx_max); expanded = true; }
            else if (dirX < -0.5) { bx_min -= expansionAmount; setBoundaryXMin(bx_min); expanded = true; }
            else if (dirZ > 0.5) { bz_max += expansionAmount; setBoundaryZMax(bz_max); expanded = true; }
            else if (dirZ < -0.5) { bz_min -= expansionAmount; setBoundaryZMin(bz_min); expanded = true; }
            
            if(expanded) {
                createPlayAreaVisuals(bx_min, bx_max, bz_min, bz_max);
            }

            setPickupsCollectedCounter(pickupsCollectedCounter + 1);
            return true;
        }
    }
    return false;
}

function checkClearPickupCollision() {
    for (let i = clearPickups.length - 1; i >= 0; i--) {
        const pickup = clearPickups[i];
        const dx = snakeTargetPosition1.x - pickup.position.x;
        const dz = snakeTargetPosition1.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) {
            const pos = pickup.position.clone(); const col = pickup.material.color.clone();
            createExplosionEffect(pos, col);
            createFloatingText("+100 Clear Walls!", pos, col);
            handleScoreUpdate(100);
            scene.remove(pickup); clearPickups.splice(i, 1);
            logTotalPickupCount("Collected Player Clear");
            clearAllTrails(); // Use visual helper
            setPickupsCollectedCounter(pickupsCollectedCounter + 1);
            return true;
        }
    }
    return false;
}

function checkZoomPickupCollision() {
    for (let i = zoomPickups.length - 1; i >= 0; i--) {
        const pickup = zoomPickups[i];
        const dx = snakeTargetPosition1.x - pickup.position.x;
        const dz = snakeTargetPosition1.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) {
            const pos = pickup.position.clone(); const col = pickup.material.color.clone();
            createExplosionEffect(pos, col);
            handleScoreUpdate(20);
            scene.remove(pickup); zoomPickups.splice(i, 1);
            logTotalPickupCount("Collected Player Zoom");

            const currentTime = performance.now();
            let currentZoomLevel = zoomLevelP1; // Read state
            let newLevelP1;
            if (isZoomedOutP1 && zoomOutEndTimeP1 > currentTime) {
                currentZoomLevel++;
                newLevelP1 = currentZoomLevel;
            } else {
                setIsZoomedOutP1(true);
                currentZoomLevel = 1;
                newLevelP1 = 1;
            }
            setZoomLevelP1(currentZoomLevel); // Set state
            setZoomOutEndTimeP1(currentTime + zoomOutDuration);
            createFloatingText(`+20 Zoom Out! (Lv ${newLevelP1})`, pos, col);
            setPickupsCollectedCounter(pickupsCollectedCounter + 1);
            spawnPickup("zoom");
            return true;
        }
    }
    return false;
}

function checkSparseTrailPickupCollision() {
    for (let i = sparseTrailPickups.length - 1; i >= 0; i--) {
        const pickup = sparseTrailPickups[i];
        const dx = snakeTargetPosition1.x - pickup.position.x;
        const dz = snakeTargetPosition1.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) {
            const pos = pickup.position.clone();
            const col = sparseTrailMaterial.color.clone(); // Use constant
            createExplosionEffect(pos, col);

            const currentTime = performance.now();
            let currentSparseLevel = sparseLevelP1; // Read state
            let newLevelP1;
            if (isSparseTrailActiveP1 && sparseTrailEndTimeP1 > currentTime) {
                currentSparseLevel++;
                newLevelP1 = currentSparseLevel;
            } else {
                setIsSparseTrailActiveP1(true);
                currentSparseLevel = 1;
                newLevelP1 = 1;
            }
            setSparseLevelP1(currentSparseLevel); // Set state
            setSparseTrailEndTimeP1(currentTime + sparseTrailDuration);
            setTrailCounterP1(0);
            createFloatingText(`+60 Sparse Trail! (Lv ${newLevelP1})`, pos, col);
            handleScoreUpdate(60);
            scene.remove(pickup); sparseTrailPickups.splice(i, 1);
            logTotalPickupCount("Collected Player Sparse");
            setPickupsCollectedCounter(pickupsCollectedCounter + 1);
            spawnPickup("sparse");
            return true;
        }
    }
    return false;
}

function checkMultiSpawnPickupCollision() {
    for (let i = multiSpawnPickups.length - 1; i >= 0; i--) {
        const pickup = multiSpawnPickups[i];
        const dx = snakeTargetPosition1.x - pickup.position.x;
        const dz = snakeTargetPosition1.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) {
            const pos = pickup.position.clone(); const col = multiSpawnMaterial.color.clone();
            createExplosionEffect(pos, col);
            createFloatingText("+200 Max ++!", pos, col);
            handleScoreUpdate(200);
            scene.remove(pickup); multiSpawnPickups.splice(i, 1);
            logTotalPickupCount("Collected Player Multi");
            setPickupsCollectedCounter(pickupsCollectedCounter + 1);

            let eligibleRandomTypes = [];
            // Check eligibility
            if (zoomPickups.length < maxZoomPickups) eligibleRandomTypes.push("zoom");
            if (scoreP1 >= 50 && scorePickups.length < maxScorePickups) eligibleRandomTypes.push("score");
            if (scoreP1 >= 200 && sparseTrailPickups.length < maxSparseTrailPickups) eligibleRandomTypes.push("sparse");
            if (scoreP1 >= 500 && clearPickups.length < maxClearPickups) eligibleRandomTypes.push("clear");
            if (scoreP1 >= 1000 && addAiPickups.length < maxAddAiPickups) eligibleRandomTypes.push("add_ai");
            if (scoreP1 >= 1500 && expansionPickups.length < maxExpansionPickups) eligibleRandomTypes.push("expansion");
            if (scoreP1 >= 300 && ammoPickups.length < maxAmmoPickups) eligibleRandomTypes.push("ammo");

            const spawnAndIncreaseMax = (type) => {
                console.log(`Multi Spawn: Spawning random type: ${type}`);
                spawnPickup(type);
                // Use setters for max counts
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

            // Spawn random types
            if (eligibleRandomTypes.length > 0) {
                spawnAndIncreaseMax(eligibleRandomTypes[Math.floor(Math.random() * eligibleRandomTypes.length)]);
            }
            if (eligibleRandomTypes.length > 0) {
                 spawnAndIncreaseMax(eligibleRandomTypes[Math.floor(Math.random() * eligibleRandomTypes.length)]);
            }

            console.log("Multi Spawn: Spawning self-replacement.");
            spawnPickup("multi");
            return true;
        }
    }
    return false;
}

function checkAddAiPickupCollision() {
    for (let i = addAiPickups.length - 1; i >= 0; i--) {
        const pickup = addAiPickups[i];
        const dx = snakeTargetPosition1.x - pickup.position.x;
        const dz = snakeTargetPosition1.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) {
            const pos = pickup.position.clone(); const col = addAiPickupMaterial.color.clone();
            createExplosionEffect(pos, col);
            createFloatingText("+125 More Players!", pos, col);
            handleScoreUpdate(125);
            scene.remove(pickup); addAiPickups.splice(i, 1);
            logTotalPickupCount("Collected Player AddAI");
            // TODO: Implement actual AI spawning!
            setPickupsCollectedCounter(pickupsCollectedCounter + 1);
            return true;
        }
    }
    return false;
}

function checkAmmoPickupCollision() {
    for (let i = ammoPickups.length - 1; i >= 0; i--) {
        const pickup = ammoPickups[i];
        const dx = snakeTargetPosition1.x - pickup.position.x;
        const dz = snakeTargetPosition1.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) {
            const pos = pickup.position.clone();
            const col = ammoPickupMaterial.color.clone(); 
            createExplosionEffect(pos, col);
            createFloatingText("+80 Ammo!", pos, col);
            handleScoreUpdate(80);
            scene.remove(pickup); ammoPickups.splice(i, 1);
            logTotalPickupCount("Collected Player Ammo");
            setAmmoCountP1(ammoCountP1 + 1); 
            updateAmmoIndicatorP1();
            setPickupsCollectedCounter(pickupsCollectedCounter + 1);
            return true;
        }
    }
    return false;
}

// AI Collision Checks
export function checkAIPickupCollisions() {
    if (checkAIScorePickupCollision()) return;
    if (checkAIExpansionPickupCollision()) return;
    if (checkAIClearPickupCollision()) return;
    if (checkAIZoomPickupCollision()) return;
    if (checkAISparseTrailPickupCollision()) return;
    if (checkAIMultiSpawnPickupCollision()) return;
    if (checkAIAddAiPickupCollision()) return;
    if (checkAIAmmoPickupCollision()) return;
}

function checkAIScorePickupCollision() {
    for (let i = scorePickups.length - 1; i >= 0; i--) {
        const pickup = scorePickups[i];
        const dx = snakeTargetPosition2.x - pickup.position.x;
        const dz = snakeTargetPosition2.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) {
            const pos = pickup.position.clone(); const col = pickup.material.color.clone();
            createExplosionEffect(pos, col);
            scene.remove(pickup); scorePickups.splice(i, 1);
            logTotalPickupCount("Collected AI SpeedUp");
            if (!isSpeedBoostActiveAI) {
                 if(snakeHead2) snakeHead2.material.color.setHex(AI_HEAD_COLOR_BOOST);
            }
            setSpeedBoostActiveAI(true);
            setSpeedBoostEndTimeAI(performance.now() + boostDuration);
            setPickupsCollectedCounter(pickupsCollectedCounter + 1);
            spawnPickup("score");
            return true;
        }
    }
    return false;
}

function checkAIExpansionPickupCollision() {
     for (let i = expansionPickups.length - 1; i >= 0; i--) {
        const pickup = expansionPickups[i];
        const dx = snakeTargetPosition2.x - pickup.position.x;
        const dz = snakeTargetPosition2.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) {
            const pos = pickup.position.clone(); const col = pickup.material.color.clone();
            createExplosionEffect(pos, col);
            scene.remove(pickup); expansionPickups.splice(i, 1);
            logTotalPickupCount("Collected AI Expand");

            const dirX = snakeDirection2.x;
            const dirZ = snakeDirection2.z;
            let expanded = false;
            let bx_min = boundaryXMin, bx_max = boundaryXMax, bz_min = boundaryZMin, bz_max = boundaryZMax;
            if (dirX > 0.5) { bx_max += expansionAmount; setBoundaryXMax(bx_max); expanded = true; }
            else if (dirX < -0.5) { bx_min -= expansionAmount; setBoundaryXMin(bx_min); expanded = true; }
            else if (dirZ > 0.5) { bz_max += expansionAmount; setBoundaryZMax(bz_max); expanded = true; }
            else if (dirZ < -0.5) { bz_min -= expansionAmount; setBoundaryZMin(bz_min); expanded = true; }
            
             if(expanded) {
                 createPlayAreaVisuals(bx_min, bx_max, bz_min, bz_max);
             }
            setPickupsCollectedCounter(pickupsCollectedCounter + 1);
            return true;
        }
    }
    return false;
}

function checkAIClearPickupCollision() {
    for (let i = clearPickups.length - 1; i >= 0; i--) {
        const pickup = clearPickups[i];
        const dx = snakeTargetPosition2.x - pickup.position.x;
        const dz = snakeTargetPosition2.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) {
            const pos = pickup.position.clone(); const col = pickup.material.color.clone();
            createExplosionEffect(pos, col);
            scene.remove(pickup); clearPickups.splice(i, 1);
            logTotalPickupCount("Collected AI Clear");
            clearAllTrails();
            setPickupsCollectedCounter(pickupsCollectedCounter + 1);
            return true;
        }
    }
    return false;
}

function checkAIZoomPickupCollision() {
    for (let i = zoomPickups.length - 1; i >= 0; i--) {
        const pickup = zoomPickups[i];
        const dx = snakeTargetPosition2.x - pickup.position.x;
        const dz = snakeTargetPosition2.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) {
            const pos = pickup.position.clone(); const col = pickup.material.color.clone();
            createExplosionEffect(pos, col);
            scene.remove(pickup); zoomPickups.splice(i, 1);
            logTotalPickupCount("Collected AI Zoom");
            setPickupsCollectedCounter(pickupsCollectedCounter + 1);
            spawnPickup("zoom");
            return true;
        }
    }
    return false;
}

function checkAISparseTrailPickupCollision() {
    for (let i = sparseTrailPickups.length - 1; i >= 0; i--) {
        const pickup = sparseTrailPickups[i];
        const dx = snakeTargetPosition2.x - pickup.position.x;
        const dz = snakeTargetPosition2.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) {
            const pos = pickup.position.clone();
            const col = sparseTrailMaterial.color.clone();
            createExplosionEffect(pos, col);

            const currentTime = performance.now();
            let currentSparseLevel = sparseLevelAI; // Read state
            let newLevelAI;
            if (isSparseTrailActiveAI && sparseTrailEndTimeAI > currentTime) {
                currentSparseLevel++;
                newLevelAI = currentSparseLevel;
            } else {
                setIsSparseTrailActiveAI(true);
                currentSparseLevel = 1;
                newLevelAI = 1;
            }
            setSparseLevelAI(currentSparseLevel); // Set state
            setSparseTrailEndTimeAI(currentTime + sparseTrailDuration);
            setTrailCounterAI(0);
            // AI doesn't get text?
            // createFloatingText(`Sparse Trail! (Lv ${newLevelAI})`, pos, col);
            scene.remove(pickup); sparseTrailPickups.splice(i, 1);
            logTotalPickupCount("Collected AI Sparse");
            setPickupsCollectedCounter(pickupsCollectedCounter + 1);
            spawnPickup("sparse");
            return true;
        }
    }
    return false;
}

function checkAIMultiSpawnPickupCollision() {
    for (let i = multiSpawnPickups.length - 1; i >= 0; i--) {
        const pickup = multiSpawnPickups[i];
        const dx = snakeTargetPosition2.x - pickup.position.x;
        const dz = snakeTargetPosition2.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) {
            const pos = pickup.position.clone(); const col = multiSpawnMaterial.color.clone();
            createExplosionEffect(pos, col);
            scene.remove(pickup); multiSpawnPickups.splice(i, 1);
            logTotalPickupCount("Collected AI Multi");
            setPickupsCollectedCounter(pickupsCollectedCounter + 1);

            let eligibleRandomTypes = [];
            // Eligibility based on player score?
            if (zoomPickups.length < maxZoomPickups) eligibleRandomTypes.push("zoom");
            if (scoreP1 >= 50 && scorePickups.length < maxScorePickups) eligibleRandomTypes.push("score"); 
            if (scoreP1 >= 200 && sparseTrailPickups.length < maxSparseTrailPickups) eligibleRandomTypes.push("sparse");
            if (scoreP1 >= 500 && clearPickups.length < maxClearPickups) eligibleRandomTypes.push("clear");
            if (scoreP1 >= 1000 && addAiPickups.length < maxAddAiPickups) eligibleRandomTypes.push("add_ai");
            if (scoreP1 >= 1500 && expansionPickups.length < maxExpansionPickups) eligibleRandomTypes.push("expansion");
            if (scoreP1 >= 300 && ammoPickups.length < maxAmmoPickups) eligibleRandomTypes.push("ammo");

             const spawnAndIncreaseMax = (type) => {
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

            if (eligibleRandomTypes.length > 0) {
                spawnAndIncreaseMax(eligibleRandomTypes[Math.floor(Math.random() * eligibleRandomTypes.length)]);
            }
            if (eligibleRandomTypes.length > 0) {
                 spawnAndIncreaseMax(eligibleRandomTypes[Math.floor(Math.random() * eligibleRandomTypes.length)]);
            }

            console.log("AI Multi Spawn: Spawning self-replacement.");
            spawnPickup("multi");
            return true;
        }
    }
    return false;
}

function checkAIAddAiPickupCollision() {
     for (let i = addAiPickups.length - 1; i >= 0; i--) {
        const pickup = addAiPickups[i];
        const dx = snakeTargetPosition2.x - pickup.position.x;
        const dz = snakeTargetPosition2.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) {
            const pos = pickup.position.clone(); const col = addAiPickupMaterial.color.clone();
            createExplosionEffect(pos, col);
            scene.remove(pickup); addAiPickups.splice(i, 1);
            logTotalPickupCount("Collected AI AddAI");
            // TODO: Implement actual AI spawning!
            setPickupsCollectedCounter(pickupsCollectedCounter + 1);
            return true;
        }
    }
    return false;
}

function checkAIAmmoPickupCollision() {
    for (let i = ammoPickups.length - 1; i >= 0; i--) {
        const pickup = ammoPickups[i];
        const dx = snakeTargetPosition2.x - pickup.position.x;
        const dz = snakeTargetPosition2.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) {
            const pos = pickup.position.clone();
            const col = ammoPickupMaterial.color.clone();
            createExplosionEffect(pos, col);
            scene.remove(pickup); ammoPickups.splice(i, 1);
            logTotalPickupCount("Collected AI Ammo");
            setAmmoCountAI(ammoCountAI + 1); // Use setter
            updateAmmoIndicatorAI();
            setPickupsCollectedCounter(pickupsCollectedCounter + 1);
            return true;
        }
    }
    return false;
}

// --- Need to fix state access ---
// Placeholder for createPlayAreaVisuals dependency in expansion pickup
// Placeholders for direct state modifications (will use setters)
// scoreP1 is read/written directly - needs fixing

// Helper to update score and check unlocks
function handleScoreUpdate(amount) {
    // Assuming setScoreP1 exists and updates the scoreP1 in state.js
    const newScore = scoreP1 + amount;
    if (setScoreP1) {
        setScoreP1(newScore);
    } else {
        console.error("setScoreP1 is not defined in state.js?");
        return;
    }
    checkUnlocks(newScore);
} 