import * as THREE from 'three';
import {
    snakeTargetPosition1,
    snakeHead1,
    aiPlayers, // AI array
    boundaryXMin, boundaryXMax, boundaryZMin, boundaryZMax,
    trailSegments1,
    scorePickups, expansionPickups, clearPickups, zoomPickups, sparseTrailPickups, multiSpawnPickups, addAiPickups, ammoPickups,
} from './state.js';
import {
    AI_LOOK_AHEAD_STEPS, segmentSize, AI_PICKUP_SCAN_RADIUS_SQ, AI_STRAIGHT_BIAS, yAxis, epsilon
} from './constants.js';
import { snapToGridCenter } from './utils.js';
import { aiShootProjectile } from './projectile.js';

// Placeholder for projectile shooting function (needs proper import)
// let aiShootProjectile = () => console.warn('aiShootProjectile not imported yet');

// --- Position Safety Check ---
// Now needs to check against player and ALL OTHER AIs
export function isPositionSafe(pos, aiToCheck, checkOwnTrail = true, checkHeads = true, isSpawnCheck = false) {
    const checkPos = new THREE.Vector3(snapToGridCenter(pos.x, 'x'), 0, snapToGridCenter(pos.z, 'z'));
    // Use smaller threshold for movement/collision, larger for spawning near trails
    const trailCollisionThreshold = isSpawnCheck ? segmentSize * 0.5 : segmentSize * epsilon;
    const headCollisionThreshold = segmentSize * epsilon; // Keep head check tight

    // Check boundaries
    if (checkPos.x < boundaryXMin + epsilon ||
        checkPos.x > boundaryXMax - epsilon ||
        checkPos.z < boundaryZMin + epsilon ||
        checkPos.z > boundaryZMax - epsilon) {
        return false;
    }

    // Check player trail
    for (let segment of trailSegments1) {
        // Use appropriate threshold
        if (checkPos.distanceTo(segment.position) < trailCollisionThreshold) return false; 
    }

    // Check AI trails (own and others)
    for (const ai of aiPlayers) {
        // Only check own trail if specified and if it's the AI we are checking against
        if (ai.id === aiToCheck?.id && !checkOwnTrail) continue; // Added null check for aiToCheck
        for (let segment of ai.trailSegments) {
             // Use appropriate threshold
            if (checkPos.distanceTo(segment.position) < trailCollisionThreshold) return false;
        }
    }

    // Check head collisions
    if (checkHeads) {
        // Player head (ensure snakeHead1 exists)
        if (snakeHead1) {
            const head1SnappedPos = new THREE.Vector3(snapToGridCenter(snakeHead1.position.x, 'x'), 0, snapToGridCenter(snakeHead1.position.z, 'z'));
            // Use specific head threshold
            if (checkPos.distanceTo(head1SnappedPos) < headCollisionThreshold) return false; 
        }
        // Other AI heads
        for (const ai of aiPlayers) {
            // Don't check against self if aiToCheck is provided
            if (aiToCheck && ai.id === aiToCheck.id) continue;
            if (ai.head) { // Ensure AI head exists
                 const headSnappedPos = new THREE.Vector3(snapToGridCenter(ai.head.position.x, 'x'), 0, snapToGridCenter(ai.head.position.z, 'z'));
                 // Use specific head threshold
                 if (checkPos.distanceTo(headSnappedPos) < headCollisionThreshold) return false;
            }
        }
    }

    // --- ADDED: Check against existing pickups --- 
    const allPickups = [
        ...scorePickups, ...expansionPickups, ...clearPickups,
        ...zoomPickups, ...sparseTrailPickups, ...multiSpawnPickups,
        ...addAiPickups, ...ammoPickups
    ];
    const pickupCollisionThreshold = segmentSize; // Use segmentSize for a larger exclusion zone
    for (const pickup of allPickups) {
        // Check distance on the XZ plane only, ignoring potential Y difference of pickup center
        const checkPosXZ = new THREE.Vector3(checkPos.x, 0, checkPos.z);
        const pickupPosXZ = new THREE.Vector3(pickup.position.x, 0, pickup.position.z);
        if (checkPosXZ.distanceTo(pickupPosXZ) < pickupCollisionThreshold) {
            // console.log(`isPositionSafe: False - Too close to pickup at (${pickup.position.x.toFixed(1)}, ${pickup.position.z.toFixed(1)})`); // DEBUG
            return false;
        }
    }
    // ------------------------------------------- 

    return true;
}

// --- AI Helper: Find Closest Pickup ---
function findTargetPickup(currentPos) {
    let targetPickupPos = null;
    let closestDistSq = AI_PICKUP_SCAN_RADIUS_SQ;
    const allPickups = [
        ...scorePickups, ...expansionPickups, ...clearPickups,
        ...zoomPickups, ...sparseTrailPickups, ...multiSpawnPickups,
        ...addAiPickups, // ...ammoPickups - AI needs ammo? Yes.
        ...ammoPickups // Add ammo to AI target list
    ];
    for (const pickup of allPickups) {
        const distSq = currentPos.distanceToSquared(pickup.position);
        if (distSq < closestDistSq) {
            closestDistSq = distSq;
            targetPickupPos = pickup.position;
        }
    }
    return targetPickupPos;
}

// --- AI Helper: Find Best Safe Move Towards Target ---
function findBestMoveTowards(aiObject, leftDir, rightDir, targetPos) {
    const currentPos = aiObject.targetPosition;
    const currentDir = aiObject.direction;
    let bestMove = null;
    let minTargetDistSq = currentPos.distanceToSquared(targetPos);

    const potentialMoves = [
        { dir: currentDir, name: "forward" },
        { dir: leftDir,    name: "left" },
        { dir: rightDir,   name: "right" }
    ];

    for (const move of potentialMoves) {
        const nextPos = currentPos.clone().addScaledVector(move.dir, segmentSize);
        // Pass the aiObject to isPositionSafe
        if (isPositionSafe(nextPos, aiObject, true, true)) { 
            const distSq = nextPos.distanceToSquared(targetPos);
            if (distSq < minTargetDistSq) {
                minTargetDistSq = distSq;
                bestMove = move;
            }
        }
    }
    return bestMove;
}

// --- AI Helper: Evaluate and Choose Best Turn ---
function findBestTurn(aiObject, leftDir, rightDir) {
    const currentPos = aiObject.targetPosition;
    let leftSafeSteps = 0;
    let rightSafeSteps = 0;
    let isLeftImmediatelySafe = false;
    let isRightImmediatelySafe = false;

    const leftCheckPos = currentPos.clone().addScaledVector(leftDir, segmentSize);
    // Pass aiObject
    if (isPositionSafe(leftCheckPos, aiObject, true, true)) {
        isLeftImmediatelySafe = true;
        leftSafeSteps = 1;
        for (let i = 2; i <= AI_LOOK_AHEAD_STEPS; i++) {
            const nextLeftPos = leftCheckPos.clone().addScaledVector(leftDir, segmentSize * (i - 1));
            if (!isPositionSafe(nextLeftPos, aiObject, true, true)) break;
            leftSafeSteps++;
        }
    }

    const rightCheckPos = currentPos.clone().addScaledVector(rightDir, segmentSize);
     // Pass aiObject
    if (isPositionSafe(rightCheckPos, aiObject, true, true)) {
        isRightImmediatelySafe = true;
        rightSafeSteps = 1;
        for (let i = 2; i <= AI_LOOK_AHEAD_STEPS; i++) {
            const nextRightPos = rightCheckPos.clone().addScaledVector(rightDir, segmentSize * (i - 1));
            if (!isPositionSafe(nextRightPos, aiObject, true, true)) break;
            rightSafeSteps++;
        }
    }

    if (isLeftImmediatelySafe && isRightImmediatelySafe) {
        if (leftSafeSteps > rightSafeSteps) {
            return leftDir;
        } else if (rightSafeSteps > leftSafeSteps) {
            return rightDir;
        } else {
            return (Math.random() < 0.5) ? leftDir : rightDir;
        }
    } else if (isLeftImmediatelySafe) {
        return leftDir;
    } else if (isRightImmediatelySafe) {
        return rightDir;
    } else {
        return null;
    }
}

// --- Main AI Update Logic --- 
// Now iterates through all AIs
export function updateAllAIPlayers() {
    for (let i = 0; i < aiPlayers.length; i++) {
        updateSingleAIPlayer(aiPlayers[i]);
    }
}

// Renamed from updateAIPlayer, accepts the specific AI object
function updateSingleAIPlayer(aiObject) { 
    const currentPos = aiObject.targetPosition;
    const currentDir = aiObject.direction;
    const ammoCount = aiObject.ammoCount; // Use AI's specific ammo count
    const trailSegments = aiObject.trailSegments; // Use AI's own trail

    const leftDir = currentDir.clone().applyAxisAngle(yAxis, Math.PI / 2);
    const rightDir = currentDir.clone().applyAxisAngle(yAxis, -Math.PI / 2);

    // 0. AI Shooting Logic
    if (ammoCount > 0) {
        let playerTrailAhead = false;
        let otherAITrailAhead = false;
        let lookTarget = null;

        for (let i = 1; i <= AI_LOOK_AHEAD_STEPS; i++) {
            const checkPos = currentPos.clone().addScaledVector(currentDir, segmentSize * i);
            // Check player trail
            for (const seg1 of trailSegments1) {
                 if (checkPos.distanceTo(seg1.position) < segmentSize * 0.5) {
                    playerTrailAhead = true;
                    lookTarget = seg1.position;
                    break;
                 }
            }
            if (playerTrailAhead) break;
            // Check other AI trails
            for (const otherAI of aiPlayers) {
                if (otherAI.id === aiObject.id) continue; // Skip self
                for (const segOther of otherAI.trailSegments) {
                    if (checkPos.distanceTo(segOther.position) < segmentSize * 0.5) {
                        otherAITrailAhead = true;
                        lookTarget = segOther.position;
                        break;
                    }
                }
                if (otherAITrailAhead) break;
            }
             if (otherAITrailAhead) break;
        }
        // Shoot if player or other AI trail is ahead
        if (playerTrailAhead || otherAITrailAhead) {
            // Pass the AI object to the shooting function
            aiShootProjectile(aiObject); // Corrected: Pass aiObject
        }
    }

    // 1. Check Forward Safety
    let safeForwardSteps = 0;
    for (let i = 1; i <= AI_LOOK_AHEAD_STEPS; i++) {
        const checkPos = currentPos.clone().addScaledVector(currentDir, segmentSize * i);
        // Pass aiObject
        if (!isPositionSafe(checkPos, aiObject, true, true)) {
            break;
        }
        safeForwardSteps++;
    }
    const isForwardSafe = safeForwardSteps > 0;
    const isForwardClear = safeForwardSteps === AI_LOOK_AHEAD_STEPS;

    // 2. Survival Mode
    if (!isForwardSafe) {
        const blockingPos = currentPos.clone().addScaledVector(currentDir, segmentSize);
        let ownTrailBlocking = false;
        for (const seg of trailSegments) { // Check own trail
            if (blockingPos.distanceTo(seg.position) < segmentSize * 0.5) {
                ownTrailBlocking = true;
                break;
            }
        }
        if (ownTrailBlocking && ammoCount > 0) {
             // Pass aiObject
            aiShootProjectile(aiObject); // Corrected: Pass aiObject
        }

        // Pass aiObject
        const bestTurnDir = findBestTurn(aiObject, leftDir, rightDir); 
        if (bestTurnDir) {
            // Modify the direction within the aiObject
            aiObject.direction.copy(bestTurnDir); 
        } // Else crash forward
        return;
    }

    // 3. Pickup Pursuit
    let targetPickupPos = findTargetPickup(currentPos);
    if (targetPickupPos) {
         // Pass aiObject
        const bestMove = findBestMoveTowards(aiObject, leftDir, rightDir, targetPickupPos);
        if (bestMove) {
            aiObject.direction.copy(bestMove.dir);
            return; // Found a good move towards pickup
        } else {
             // If no move gets closer/is safe, try a survival turn instead of default
             const bestTurnDir = findBestTurn(aiObject, leftDir, rightDir);
             if (bestTurnDir) {
                 aiObject.direction.copy(bestTurnDir);
             } // Else continue straight (original default fallback)
             return; 
        }
    }

    // 4. Default Movement (Only reached if no pickup targeted)
    if (isForwardClear && Math.random() < AI_STRAIGHT_BIAS) {
        return; // Continue straight
    }

     // Pass aiObject
    const bestTurnDir = findBestTurn(aiObject, leftDir, rightDir);
    if (bestTurnDir) {
        aiObject.direction.copy(bestTurnDir);
    } // Else continue straight
}


// --- Need to fix state access --- (Removed Placeholder declarations)
// Temporary placeholders for boundary state needed in isPositionSafe
// REMOVED: let boundaryXMin = -15;
// REMOVED: let boundaryXMax = 15;
// REMOVED: let boundaryZMin = -15;
// REMOVED: let boundaryZMax = 15;
// REMOVED: let ammoPickups = []; // Placeholder for findTargetPickup


// AI logic (updateAIPlayer and helpers) will be moved here 
// AI logic (updateAIPlayer and helpers) will be moved here 