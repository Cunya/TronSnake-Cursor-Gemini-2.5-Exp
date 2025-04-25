import * as THREE from 'three';
import {
    scene, camera, renderer,
    gameActive, isGameOver, winner, scoreP1,
    isSpeedBoostActiveP1, speedBoostEndTimeP1, isZoomedOutP1, zoomOutEndTimeP1, zoomLevelP1, isSparseTrailActiveP1, sparseTrailEndTimeP1, trailCounterP1, sparseLevelP1, lastUpdateTimeP1,
    isSpeedBoostActiveAI, speedBoostEndTimeAI, isSparseTrailActiveAI, sparseTrailEndTimeAI, trailCounterAI, sparseLevelAI, lastUpdateTimeAI,
    snakeHead1, snakeHead2, snakeTargetPosition1, snakeTargetPosition2, prevTargetPos1, prevTargetPos2, snakeDirection1, snakeDirection2,
    lastTrailSegment1, lastTrailSegment2, explosionParticles, floatingTexts, projectiles, allTrailParticles,
    headMaterial1, headMaterial2, ammoIndicatorP1, ammoIndicatorAI,
    boundaryXMin, boundaryXMax, boundaryZMin, boundaryZMax, topScore,
    cameraTargetPosition, cameraOffset, targetLookAt, gameOverLookAtTarget, gameOverCameraTargetPosition,
    isLookingBack,
    trailSegments1, trailSegments2, // Need direct access for collision checks
    lastFrameTime, // Get lastFrameTime from state
    gameOverTextElement, // <-- IMPORT gameOverTextElement
    // State Setters
    setSpeedBoostActiveP1, setSpeedBoostActiveAI, setIsGameOver, setWinner, setTopScore, setLastFrameTime, setLastUpdateTimeP1, setLastUpdateTimeAI,
    setScoreP1, // Assuming setter exists
    setIsZoomedOutP1, setZoomLevelP1, setIsSparseTrailActiveP1, setSparseLevelP1,
    setTrailCounterP1, setIsSparseTrailActiveAI, setSparseLevelAI, setTrailCounterAI,
    setLastTrailSegment1, setLastTrailSegment2
} from './state.js';
import {
    normalUpdateInterval, boostedUpdateInterval, scoreIncrementPerTick, LERP_FACTOR,
    cameraHeight, cameraDistanceBehind, cameraDistanceBehind as baseCameraDistance, cameraHeight as baseCameraHeight, // Alias for zoom calc
    cameraLag, gameOverCameraLag, segmentSize, epsilon,
    PARTICLE_GRAVITY, GROUND_Y, TEXT_MOVE_SPEED, PROJECTILE_SIZE,
    P1_HEAD_COLOR_NORMAL, AI_HEAD_COLOR_NORMAL, AI_TRAIL_COLOR_NORMAL, P1_TRAIL_COLOR_NORMAL,
    trailParticleGeometry, trailParticleMaterial, TRAIL_PARTICLE_COUNT_PER_FRAME, TRAIL_PARTICLE_LIFE
} from './constants.js';
import { snapToGridCenter } from './utils.js';
import { updateAIPlayer } from './ai.js';
import { checkPlayerPickupCollisions, checkAIPickupCollisions, checkUnlocks } from './pickups.js';
import { 
    createTrailSegment, updateLastTrailSegmentsVisibility, revertHeadColors, setHeadColorToRed, 
    createExplosionEffect, updateAmmoIndicatorP1, updateAmmoIndicatorAI 
} from './visuals.js';
import { showGameOverMessage, updateScoreDisplay } from './ui.js';

// Game Over Collision Check (Internal to game loop)
function checkCollisions(head1Pos, head2Pos, trail1, trail2) {
    let p1Lost = false, p2Lost = false;
    const collisionThreshold = segmentSize * epsilon;
    const head1SnappedPos = new THREE.Vector3(snapToGridCenter(head1Pos.x, 'x'), 0, snapToGridCenter(head1Pos.z, 'z'));
    const head2SnappedPos = new THREE.Vector3(snapToGridCenter(head2Pos.x, 'x'), 0, snapToGridCenter(head2Pos.z, 'z'));

    if (head1SnappedPos.distanceTo(head2SnappedPos) < collisionThreshold) return 3;
    if (head1SnappedPos.x < boundaryXMin + epsilon || head1SnappedPos.x > boundaryXMax - epsilon || head1SnappedPos.z < boundaryZMin + epsilon || head1SnappedPos.z > boundaryZMax - epsilon) p1Lost = true;
    if (head2SnappedPos.x < boundaryXMin + epsilon || head2SnappedPos.x > boundaryXMax - epsilon || head2SnappedPos.z < boundaryZMin + epsilon || head2SnappedPos.z > boundaryZMax - epsilon) p2Lost = true;

    const allTrailSegments = [...trail1, ...trail2];
    if (!p1Lost) for (let seg of allTrailSegments) if (head1SnappedPos.distanceTo(seg.position) < collisionThreshold) { p1Lost = true; break; }
    if (!p2Lost) for (let seg of allTrailSegments) if (head2SnappedPos.distanceTo(seg.position) < collisionThreshold) { p2Lost = true; break; }
    
    if (p1Lost && p2Lost) return 3;
    if (p1Lost) return 1;
    if (p2Lost) return 2;
    return 0;
}

export function animate(currentTime) {
    // Request the next frame
    requestAnimationFrame(animate);

    // 1. Calculate delta time
    const resolvedLastFrameTime = lastFrameTime || currentTime; // Handle first frame
    const deltaTime = currentTime - resolvedLastFrameTime;
    const deltaTimeSeconds = deltaTime / 1000.0;
    if (setLastFrameTime) setLastFrameTime(currentTime);
    
    let playerMoved = false, aiMoved = false;
    
    // --- Game Logic Update ---
    // 2. Check game over condition (Skip updates if game over)
    if (gameActive && !isGameOver) {
        // 3. Update player/AI movement & Handle pickup timers
        // Player 1 Update
        if (isSpeedBoostActiveP1 && currentTime > speedBoostEndTimeP1) {
            if(setSpeedBoostActiveP1) setSpeedBoostActiveP1(false);
            if (snakeHead1) headMaterial1.color.setHex(P1_HEAD_COLOR_NORMAL);
        }
        if (isZoomedOutP1 && currentTime > zoomOutEndTimeP1) { if(setIsZoomedOutP1) setIsZoomedOutP1(false); if(setZoomLevelP1) setZoomLevelP1(0); }
        if (isSparseTrailActiveP1 && currentTime > sparseTrailEndTimeP1) { if(setIsSparseTrailActiveP1) setIsSparseTrailActiveP1(false); if(setSparseLevelP1) setSparseLevelP1(1); }
        const currentUpdateIntervalP1 = isSpeedBoostActiveP1 ? boostedUpdateInterval : normalUpdateInterval;
        if ((currentTime - lastUpdateTimeP1) > currentUpdateIntervalP1) {
            if(setLastUpdateTimeP1) setLastUpdateTimeP1(currentTime - ((currentTime - lastUpdateTimeP1) % currentUpdateIntervalP1));
            if(setScoreP1) { 
                const newScore = scoreP1 + scoreIncrementPerTick; 
                setScoreP1(newScore); 
            } 
            prevTargetPos1.copy(snakeTargetPosition1);
            let nextPos1 = snakeTargetPosition1.clone().addScaledVector(snakeDirection1, segmentSize);
            snakeTargetPosition1.set(snapToGridCenter(nextPos1.x, 'x'), 0, snapToGridCenter(nextPos1.z, 'z'));
            playerMoved = true;
            checkPlayerPickupCollisions(); // Check pickup collision AFTER position update
        }

        // AI Update
        if (isSpeedBoostActiveAI && currentTime > speedBoostEndTimeAI) {
             if(setSpeedBoostActiveAI) setSpeedBoostActiveAI(false);
             if (snakeHead2) headMaterial2.color.setHex(AI_HEAD_COLOR_NORMAL);
        }
        if (isSparseTrailActiveAI && currentTime > sparseTrailEndTimeAI) { if(setIsSparseTrailActiveAI) setIsSparseTrailActiveAI(false); if(setSparseLevelAI) setSparseLevelAI(1); }
        const currentUpdateIntervalAI = isSpeedBoostActiveAI ? boostedUpdateInterval : normalUpdateInterval;
        if ((currentTime - lastUpdateTimeAI) > currentUpdateIntervalAI) {
            if(setLastUpdateTimeAI) setLastUpdateTimeAI(currentTime - ((currentTime - lastUpdateTimeAI) % currentUpdateIntervalAI));
            updateAIPlayer(); // AI decides its next move
            prevTargetPos2.copy(snakeTargetPosition2);
            let nextPos2 = snakeTargetPosition2.clone().addScaledVector(snakeDirection2, segmentSize);
            snakeTargetPosition2.set(snapToGridCenter(nextPos2.x, 'x'), 0, snapToGridCenter(nextPos2.z, 'z'));
            aiMoved = true;
            checkAIPickupCollisions(); // Check pickup collision AFTER position update
        }

        // 4. Check collisions (walls, self, other player) & Handle Trails
        if (playerMoved || aiMoved) {
            const collisionResult = checkCollisions(snakeTargetPosition1, snakeTargetPosition2, trailSegments1, trailSegments2);
            if(setWinner) setWinner(collisionResult);

            // Player Trail
            if (playerMoved && (collisionResult === 0 || collisionResult === 2)) { // P1 didn't lose
                const intervalP1 = sparseLevelP1 + 1;
                // Make previous hidden segment visible if needed
                if (isSparseTrailActiveP1 && trailCounterP1 % intervalP1 !== 0 && lastTrailSegment1) lastTrailSegment1.visible = true; 
                // Create new segment (always if not sparse, or on interval if sparse)
                if (!isSparseTrailActiveP1 || trailCounterP1 % intervalP1 === 0) {
                     createTrailSegment(prevTargetPos1, trailSegments1, 1);
                 } else if (lastTrailSegment1) {
                     lastTrailSegment1.visible = false; // Hide the latest segment if sparse and not on interval
                 }
                if(setTrailCounterP1) setTrailCounterP1(trailCounterP1 + 1);
            }
            // AI Trail
            if (aiMoved && (collisionResult === 0 || collisionResult === 1)) { // AI didn't lose
                 const intervalAI = sparseLevelAI + 1;
                 if (isSparseTrailActiveAI && trailCounterAI % intervalAI !== 0 && lastTrailSegment2) lastTrailSegment2.visible = true;
                 if (!isSparseTrailActiveAI || trailCounterAI % intervalAI === 0) {
                     createTrailSegment(prevTargetPos2, trailSegments2, 2);
                 } else if (lastTrailSegment2) {
                     lastTrailSegment2.visible = false;
                 }
                 if(setTrailCounterAI) setTrailCounterAI(trailCounterAI + 1);
            }

            // Game Over Handling
            if (collisionResult !== 0) {
                if(setIsGameOver) setIsGameOver(true);
                revertHeadColors();
                if(setSpeedBoostActiveP1) setSpeedBoostActiveP1(false);
                if(setSpeedBoostActiveAI) setSpeedBoostActiveAI(false);
                if (scoreP1 > topScore) {
                    if(setTopScore) setTopScore(scoreP1);
                    localStorage.setItem('tronSnakeTopScore', scoreP1.toString());
                }
                console.log(`[Game Over Check] Value of topScore after check: ${topScore}`);
                showGameOverMessage(collisionResult);
                if (collisionResult === 1 || collisionResult === 3) setHeadColorToRed(1);
                if (collisionResult === 2 || collisionResult === 3) setHeadColorToRed(2);
            }
        }
    } // End of if(gameActive && !isGameOver)

    // --- Visual Updates ---
    // Lerp snake head visual positions towards target logical positions
    if (snakeHead1) snakeHead1.position.lerp(snakeTargetPosition1, LERP_FACTOR);
    if (snakeHead2) snakeHead2.position.lerp(snakeTargetPosition2, LERP_FACTOR);
    updateLastTrailSegmentsVisibility(); // Ensure last segments are visible during movement
    updateScoreDisplay(); // Update score UI text

    // Update Game Over Dialog Visibility
    if (gameOverTextElement) { // Check if the element exists in state
        gameOverTextElement.style.display = isGameOver ? 'block' : 'none';
    }

    // 6. Update projectile positions & check hits
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i]; proj.mesh.position.addScaledVector(proj.velocity, deltaTimeSeconds); proj.life -= deltaTimeSeconds;
        let remove = false;
        // Emit trail particles
        for (let p = 0; p < TRAIL_PARTICLE_COUNT_PER_FRAME; p++) {
            const particleMesh = new THREE.Mesh(trailParticleGeometry, trailParticleMaterial.clone());
            const offset = proj.velocity.clone().normalize().multiplyScalar(-PROJECTILE_SIZE * 1.5);
            particleMesh.position.copy(proj.mesh.position).add(offset).add(new THREE.Vector3((Math.random()-0.5)*0.1, (Math.random()-0.5)*0.1, (Math.random()-0.5)*0.1));
            const pLife = TRAIL_PARTICLE_LIFE * (0.8 + Math.random() * 0.4);
            allTrailParticles.push({ mesh: particleMesh, life: pLife, initialLife: pLife }); scene.add(particleMesh);
        }
        // Check collisions with trails
        const oppTrail = (proj.owner === 'player') ? trailSegments2 : trailSegments1;
        const ownTrail = (proj.owner === 'player') ? trailSegments1 : trailSegments2;
        const oppColor = (proj.owner === 'player') ? AI_TRAIL_COLOR_NORMAL : P1_TRAIL_COLOR_NORMAL;
        const ownColor = (proj.owner === 'player') ? P1_TRAIL_COLOR_NORMAL : AI_TRAIL_COLOR_NORMAL;
        for (let j = oppTrail.length - 1; j >= 0; j--) if (proj.mesh.position.distanceTo(oppTrail[j].position) < segmentSize * 0.6) { createExplosionEffect(oppTrail[j].position, oppColor); scene.remove(oppTrail[j]); oppTrail.splice(j, 1); remove = true; break; }
        if (remove) { scene.remove(proj.mesh); projectiles.splice(i, 1); continue; } // Go to next projectile if hit
        for (let j = ownTrail.length - 1; j >= 0; j--) if (proj.mesh.position.distanceTo(ownTrail[j].position) < segmentSize * 0.6) { createExplosionEffect(ownTrail[j].position, ownColor); scene.remove(ownTrail[j]); ownTrail.splice(j, 1); remove = true; break; }
        // Check life/bounds
        if (!remove && (proj.life <= 0 || proj.mesh.position.x < boundaryXMin || proj.mesh.position.x > boundaryXMax || proj.mesh.position.z < boundaryZMin || proj.mesh.position.z > boundaryZMax)) remove = true;
        if (remove) { scene.remove(proj.mesh); projectiles.splice(i, 1); }
    }
    
    // 7. Update visual effects (particles, text)
    // Explosion Particles
    const pushForce = 1.5, pushRadiusSq = (segmentSize * 0.7)**2;
    for (let i = explosionParticles.length - 1; i >= 0; i--) {
        const p = explosionParticles[i]; p.velocity.y += PARTICLE_GRAVITY * deltaTimeSeconds;
        // Push effect from snake heads
        if (snakeHead1 && p.mesh.position.distanceToSquared(snakeHead1.position) < pushRadiusSq) p.velocity.addScaledVector(p.mesh.position.clone().sub(snakeHead1.position).normalize(), pushForce * (1 - Math.sqrt(p.mesh.position.distanceToSquared(snakeHead1.position)) / (segmentSize*0.7)));
        if (snakeHead2 && p.mesh.position.distanceToSquared(snakeHead2.position) < pushRadiusSq) p.velocity.addScaledVector(p.mesh.position.clone().sub(snakeHead2.position).normalize(), pushForce * (1 - Math.sqrt(p.mesh.position.distanceToSquared(snakeHead2.position)) / (segmentSize*0.7)));
        p.mesh.position.addScaledVector(p.velocity, deltaTimeSeconds);
        // Ground collision
        if (p.mesh.position.y <= GROUND_Y) { p.mesh.position.y = GROUND_Y; p.velocity.y *= -0.4; p.velocity.x *= 0.8; p.velocity.z *= 0.8; }
        p.life -= deltaTimeSeconds;
        if (p.life <= 0) { scene.remove(p.mesh); explosionParticles.splice(i, 1); } 
        else { p.mesh.material.opacity = Math.max(0, p.life / p.initialLife); }
    }
    // Floating Text
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const t = floatingTexts[i]; t.mesh.position.y += TEXT_MOVE_SPEED * deltaTimeSeconds;
        if(camera) t.mesh.lookAt(camera.position); t.life -= deltaTimeSeconds;
        if (t.life <= 0) { scene.remove(t.mesh); floatingTexts.splice(i, 1); } 
        else { t.mesh.material.opacity = Math.max(0, t.life / t.initialLife); }
    }
    // Projectile Trail Particle Update
    for (let i = allTrailParticles.length - 1; i >= 0; i--) {
        const p = allTrailParticles[i]; p.life -= deltaTimeSeconds;
        if (p.life <= 0) { scene.remove(p.mesh); allTrailParticles.splice(i, 1); } 
        else { p.mesh.material.opacity = (p.life / p.initialLife) * 0.8; }
    }

    // 8. Update camera position
    if (!isGameOver && snakeHead1 && gameActive && camera) {
        const zoomMult = 1 + (zoomLevelP1 * 0.8); // Calculate zoom multiplier
        const camHeight = isZoomedOutP1 ? baseCameraHeight * zoomMult : baseCameraHeight;
        const camDist = isZoomedOutP1 ? baseCameraDistance * zoomMult : baseCameraDistance;
        let camTargetPos, lookAtLerpTarget;
        if (isLookingBack) {
            cameraOffset.copy(snakeDirection1).multiplyScalar(+camDist).y = camHeight;
            camTargetPos = snakeHead1.position.clone().add(cameraOffset);
            lookAtLerpTarget = snakeHead1.position; // Look at self when looking back
        } else {
            cameraOffset.copy(snakeDirection1).multiplyScalar(-camDist).y = camHeight;
            camTargetPos = snakeHead1.position.clone().add(cameraOffset);
            lookAtLerpTarget = snakeHead1.position; // Normally look at self
        }
        camera.position.lerp(camTargetPos, cameraLag);
        targetLookAt.lerp(lookAtLerpTarget, cameraLag);
        camera.lookAt(targetLookAt);
        // Update ammo indicator positions and rotations
        const indicatorLookTarget = camera.position.clone(); indicatorLookTarget.y += 1;
        if (ammoIndicatorP1) { ammoIndicatorP1.position.copy(snakeHead1.position).y += segmentSize * 0.7; ammoIndicatorP1.lookAt(indicatorLookTarget); }
        if (ammoIndicatorAI) { ammoIndicatorAI.position.copy(snakeHead2.position).y += segmentSize * 0.7; ammoIndicatorAI.lookAt(indicatorLookTarget); }
    } else if (isGameOver && camera) {
        // Game Over Camera Logic (Zoom out to show whole arena)
        const width = boundaryXMax - boundaryXMin, height = boundaryZMax - boundaryZMin;
        const centerX = (boundaryXMin + boundaryXMax) / 2, centerZ = (boundaryZMin + boundaryZMax) / 2;
        const largestDim = Math.max(width, height);
        const fovRad = camera.fov * (Math.PI / 180);
        let reqHeight = (Math.tan(fovRad / 2) > epsilon) ? (largestDim / 2) / Math.tan(fovRad / 2) : 10;
        const targetHeight = Math.max(baseCameraHeight + 5, reqHeight * 1.2);
        gameOverCameraTargetPosition.set(centerX + 0.01, targetHeight, centerZ);
        gameOverLookAtTarget.set(centerX, 0, centerZ);
        camera.position.lerp(gameOverCameraTargetPosition, gameOverCameraLag);
        camera.up.set(0, 1, 0); camera.lookAt(gameOverLookAtTarget);
    }

    // 9. Render the scene
    if(renderer && scene && camera) renderer.render(scene, camera);
} 