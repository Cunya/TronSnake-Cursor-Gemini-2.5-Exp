import * as THREE from 'three';
import {
    snakeTargetPosition1, snakeTargetPosition2, snakeDirection2,
    boundaryXMin, boundaryXMax, boundaryZMin, boundaryZMax,
    trailSegments1, trailSegments2,
    scorePickups, expansionPickups, clearPickups, zoomPickups, sparseTrailPickups, multiSpawnPickups, addAiPickups, ammoPickups,
    ammoCountAI, // AI needs its ammo count
    setSnakeDirection2, setAmmoCountAI // AI needs setters for its direction and ammo
} from './state.js';
import {
    AI_LOOK_AHEAD_STEPS, segmentSize, AI_PICKUP_SCAN_RADIUS_SQ, AI_STRAIGHT_BIAS, yAxis, epsilon
} from './constants.js';
import { snapToGridCenter } from './utils.js';
import { aiShootProjectile } from './projectile.js';

// Placeholder for projectile shooting function (needs proper import)
// let aiShootProjectile = () => console.warn('aiShootProjectile not imported yet');

// Function to check if a position is safe (moved from script.js)
export function isPositionSafe(pos, checkOwnTrail = true, checkHeads = true) {
    // Need boundary state (boundaryXMin, etc.) from state.js
    const checkPos = new THREE.Vector3(snapToGridCenter(pos.x, 'x'), 0, snapToGridCenter(pos.z, 'z'));
    const collisionThreshold = segmentSize * epsilon;

    // Import boundary state here
    // Assume accessible for now
    if (checkPos.x < boundaryXMin + epsilon ||
        checkPos.x > boundaryXMax - epsilon ||
        checkPos.z < boundaryZMin + epsilon ||
        checkPos.z > boundaryZMax - epsilon) {
        return false;
    }

    for (let segment of trailSegments1) {
        if (checkPos.distanceTo(segment.position) < collisionThreshold) return false;
    }
    // Conditionally check own trail based on argument (not standard in original, but useful)
    if (checkOwnTrail) {
        for (let segment of trailSegments2) {
            if (checkPos.distanceTo(segment.position) < collisionThreshold) return false;
        }
    }

    if (checkHeads) {
        const head1SnappedPos = new THREE.Vector3(snapToGridCenter(snakeHead1.position.x, 'x'), 0, snapToGridCenter(snakeHead1.position.z, 'z'));
        const head2SnappedPos = new THREE.Vector3(snapToGridCenter(snakeHead2.position.x, 'x'), 0, snapToGridCenter(snakeHead2.position.z, 'z'));
        if (checkPos.distanceTo(head1SnappedPos) < collisionThreshold) return false;
        if (checkPos.distanceTo(head2SnappedPos) < collisionThreshold) return false;
    }
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
function findBestMoveTowards(currentPos, currentDir, leftDir, rightDir, targetPos) {
    let bestMove = null;
    let minTargetDistSq = currentPos.distanceToSquared(targetPos);

    const potentialMoves = [
        { dir: currentDir, name: "forward" },
        { dir: leftDir,    name: "left" },
        { dir: rightDir,   name: "right" }
    ];

    for (const move of potentialMoves) {
        const nextPos = currentPos.clone().addScaledVector(move.dir, segmentSize);
        if (isPositionSafe(nextPos, true, true)) { // AI checks its own trail too
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
function findBestTurn(currentPos, leftDir, rightDir) {
    let leftSafeSteps = 0;
    let rightSafeSteps = 0;
    let isLeftImmediatelySafe = false;
    let isRightImmediatelySafe = false;

    const leftCheckPos = currentPos.clone().addScaledVector(leftDir, segmentSize);
    if (isPositionSafe(leftCheckPos, true, true)) {
        isLeftImmediatelySafe = true;
        leftSafeSteps = 1;
        for (let i = 2; i <= AI_LOOK_AHEAD_STEPS; i++) {
            const nextLeftPos = leftCheckPos.clone().addScaledVector(leftDir, segmentSize * (i - 1));
            if (!isPositionSafe(nextLeftPos, true, true)) break;
            leftSafeSteps++;
        }
    }

    const rightCheckPos = currentPos.clone().addScaledVector(rightDir, segmentSize);
    if (isPositionSafe(rightCheckPos, true, true)) {
        isRightImmediatelySafe = true;
        rightSafeSteps = 1;
        for (let i = 2; i <= AI_LOOK_AHEAD_STEPS; i++) {
            const nextRightPos = rightCheckPos.clone().addScaledVector(rightDir, segmentSize * (i - 1));
            if (!isPositionSafe(nextRightPos, true, true)) break;
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
export function updateAIPlayer() {
    const currentPos = snakeTargetPosition2;
    const currentDir = snakeDirection2;

    const leftDir = currentDir.clone().applyAxisAngle(yAxis, Math.PI / 2);
    const rightDir = currentDir.clone().applyAxisAngle(yAxis, -Math.PI / 2);

    // 0. AI Shooting Logic
    if (ammoCountAI > 0) {
        let playerTrailAhead = false;
        for (let i = 1; i <= AI_LOOK_AHEAD_STEPS; i++) {
            const checkPos = currentPos.clone().addScaledVector(currentDir, segmentSize * i);
            for (const seg1 of trailSegments1) {
                 if (checkPos.distanceTo(seg1.position) < segmentSize * 0.5) {
                    playerTrailAhead = true;
                    break;
                 }
            }
            if (playerTrailAhead) break;
        }
        if (playerTrailAhead) {
            aiShootProjectile();
        }
    }

    // 1. Check Forward Safety
    let safeForwardSteps = 0;
    for (let i = 1; i <= AI_LOOK_AHEAD_STEPS; i++) {
        const checkPos = currentPos.clone().addScaledVector(currentDir, segmentSize * i);
        if (!isPositionSafe(checkPos, true, true)) {
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
        for (const seg2 of trailSegments2) {
            if (blockingPos.distanceTo(seg2.position) < segmentSize * 0.5) {
                ownTrailBlocking = true;
                break;
            }
        }
        if (ownTrailBlocking && ammoCountAI > 0) {
            aiShootProjectile();
        }

        const bestTurnDir = findBestTurn(currentPos, leftDir, rightDir);
        if (bestTurnDir) {
            snakeDirection2.copy(bestTurnDir);
        } // Else crash forward
        return;
    }

    // 3. Pickup Pursuit
    let targetPickupPos = findTargetPickup(currentPos);
    if (targetPickupPos) {
        const bestMove = findBestMoveTowards(currentPos, currentDir, leftDir, rightDir, targetPickupPos);
        if (bestMove) {
            snakeDirection2.copy(bestMove.dir);
            return;
        }
    }

    // 4. Default Movement
    if (isForwardClear && Math.random() < AI_STRAIGHT_BIAS) {
        return; // Continue straight
    }

    const bestTurnDir = findBestTurn(currentPos, leftDir, rightDir);
    if (bestTurnDir) {
        snakeDirection2.copy(bestTurnDir);
    } // Else continue straight
}


// --- Need to fix state access ---
// Temporary placeholders for boundary state needed in isPositionSafe
let boundaryXMin = -15;
let boundaryXMax = 15;
let boundaryZMin = -15;
let boundaryZMax = 15;
let ammoPickups = []; // Placeholder for findTargetPickup


// AI logic (updateAIPlayer and helpers) will be moved here 