import * as THREE from 'three';
import {
    scene, camera, renderer,
    gameActive, isGameOver, winner, scoreP1, isPaused,
    isSpeedBoostActiveP1, speedBoostEndTimeP1, speedLevelP1,
    isZoomedOutP1, zoomOutEndTimeP1, zoomLevelP1, isSparseTrailActiveP1, sparseTrailEndTimeP1, trailCounterP1, sparseLevelP1, lastUpdateTimeP1,
    aiPlayers,
    snakeHead1, snakeTargetPosition1, prevTargetPos1,
    lastTrailSegment1, explosionParticles, floatingTexts, projectiles, allTrailParticles,
    pickupSpawnParticles,
    headMaterial1, ammoIndicatorP1,
    boundaryXMin, boundaryXMax, boundaryZMin, boundaryZMax, topScore,
    cameraTargetPosition, cameraOffset, targetLookAt, gameOverLookAtTarget, gameOverCameraTargetPosition,
    isLookingBack, snakeDirection1,
    trailSegments1, // Removed trailSegments2
    lastFrameTime, // Get lastFrameTime from state
    gameOverTextElement, pauseIndicatorElement,
    // NEW: Track previous frame's collision status
    previousFrameAICollisionStatus, // Assume this is initialized in state (e.g., to aiPlayers.map(() => false))
    // Import new camera drag state
    isDraggingCamera, gameOverCameraOffset, 
    // State Setters
    setSpeedBoostActiveP1, setIsGameOver, setWinner, setTopScore, setLastFrameTime, setLastUpdateTimeP1,
    setScoreP1, setSpeedLevelP1,
    setIsZoomedOutP1, setZoomLevelP1, setIsSparseTrailActiveP1, setSparseLevelP1,
    setTrailCounterP1,
    setLastTrailSegment1,
    setPreviousFrameAICollisionStatus, // Add setter for the status
    setGameOverCameraTargetPosition, // Setter for target position
    setGameOverCameraOffset, // Setter for offset (used in ui.js, but ensure it's imported)
    isPanningCamera, // Import isPanningCamera
    lastPointerX, lastPointerY, isInitialDragMove,
    // ...Setters...
    setGameActive, setIsPaused, setPickupsCollectedCounter,
    playerLostTime, // Import playerLostTime state
    setPlayerLostTime, // Import playerLostTime setter
    setSnakeHead1, // ADDED Import
    setAmmoIndicatorP1, // ADDED Import
    isGameOverCameraActive, // ADDED Import
    setIsGameOverCameraActive, // ADDED Import
    setGameOverLookAtTarget, // ADDED Import
    deathZoomFactor, // ADDED import
    setDeathZoomFactor, // ADDED import
    aiDefeatedTime, // ADDED import
    setAiDefeatedTime, // ADDED import
    // Import all pickup arrays for fade-in update
    scorePickups, expansionPickups, clearPickups, zoomPickups, sparseTrailPickups, multiSpawnPickups, addAiPickups, ammoPickups,
    aiSpawnRingEffects, // <<< ADDED: AI Spawn Ring Effects state
    setAiSpawnRingEffects, // <<< ADDED: Setter for spawn effects
} from './state.js';
import {
    normalUpdateInterval,
    scoreIncrementPerTick, LERP_FACTOR,
    SPEED_BOOST_DIMINISHING_FACTOR,
    cameraHeight, cameraDistanceBehind, cameraDistanceBehind as baseCameraDistance, cameraHeight as baseCameraHeight, // Alias for zoom calc
    cameraLag, gameOverCameraLag, segmentSize, epsilon,
    PARTICLE_GRAVITY, GROUND_Y, TEXT_MOVE_SPEED, PROJECTILE_SIZE,
    P1_HEAD_COLOR_NORMAL, P1_TRAIL_COLOR_NORMAL,
    trailParticleGeometry, trailParticleMaterial, TRAIL_PARTICLE_COUNT_PER_FRAME, TRAIL_PARTICLE_LIFE,
    AMMO_COLOR, // <-- Import AMMO_COLOR for explosion
    GAME_VERSION,
    SPAWN_EFFECT_DURATION_EXPAND, // ADDED
    SPAWN_EFFECT_DURATION_LINGER, // ADDED
    SPAWN_EFFECT_DURATION_CONTRACT, // ADDED
    SPAWN_EFFECT_MAX_SCALE, // ADDED
    SPAWN_EFFECT_START_SCALE, // ADDED
    SPAWN_EFFECT_ROTATION_SPEED, // ADDED
    AI_SPAWN_RING_MAX_RADIUS, // <<< ADDED: For spawn effect logic
    AI_SPAWN_DURATION, // <<< ADDED: For spawn completion check
    yAxis // <<< RE-ADD yAxis import >>>
} from './constants.js';
import { snapToGridCenter } from './utils.js';
import { updateAllAIPlayers } from './ai.js';
import { checkPlayerPickupCollisions, checkAIPickupCollisions, checkUnlocks } from './pickups.js';
import { 
    createTrailSegment, updateLastTrailSegmentsVisibility, revertHeadColors, setHeadColorToRed, 
    createExplosionEffect, updateAmmoIndicatorP1, updateAmmoIndicatorAI 
} from './visuals.js';
import { 
    showGameOverMessage, updateScoreDisplay, 
    addGameOverPointerListeners, // Keep listener import
    resetGameOverDialogState // ADDED Import
} from './ui.js';
import { createAISpawnRingEffect } from './init.js'; // <<< ADDED import

const gameOverLerpedLookAtTarget = new THREE.Vector3(); // Temporary vector for smooth lookAt

// Game Over Collision Check (Internal to game loop)
// MODIFIED: Accepts previous frame's AI loss status
// Returns object: { winnerCode: 0|1|2|3, p1Lost: bool, aiLostStatus: bool[] }
function checkCollisions(prevAILostStatus) { 
    let p1Lost = false;
    let p1LostThisCheck = false; // ADDED: Track if player lost *this specific check*
    // Initialize current status based on previous frame's status
    let currentAILostStatus = [...prevAILostStatus]; 
    const collisionThreshold = segmentSize * 0.45;
    
    const logicalHeadPos = snakeTargetPosition1; 
    const aiLogicalPositions = aiPlayers.map(ai => ai.targetPosition); 

    // --- Logging --- (Keep as is for now)
    if (logicalHeadPos) {
        // console.log(`[Pre-Check] Player logicalHeadPos: (${logicalHeadPos.x.toFixed(1)}, ${logicalHeadPos.z.toFixed(1)})`); // Commented out
    } else {
        // console.log(`[Pre-Check] Player logicalHeadPos is null/undefined!`); // Keep commented
    }
    // console.log(`[Pre-Check] Player trailSegments1.length: ${trailSegments1?.length ?? 'undefined'}`); // Commented out
    // console.log(`[Pre-Check] Boundaries: X(${boundaryXMin?.toFixed(1)}->${boundaryXMax?.toFixed(1)}) Z(${boundaryZMin?.toFixed(1)}->${boundaryZMax?.toFixed(1)})`); // Commented out
    // --------------------------------------

    // 1. Check Player Boundaries (p1Lost only depends on current frame)
    if (logicalHeadPos && !p1Lost && (logicalHeadPos.x <= boundaryXMin || logicalHeadPos.x >= boundaryXMax || logicalHeadPos.z <= boundaryZMin || logicalHeadPos.z >= boundaryZMax)) {
        // console.log(`[Collision] Player boundary check...`);
        p1Lost = true;
        p1LostThisCheck = true; // Mark lost this check
    }

    // 2. Check AI Boundaries
    for (let i = 0; i < aiPlayers.length; i++) {
        if (currentAILostStatus[i]) continue; // Skip if already marked lost THIS check cycle
        const ai = aiPlayers[i];
        const aiPos = aiLogicalPositions[i]; 
        let lostThisCheck = false;
        if (!ai.head) {
            // console.log(`[Collision] AI ${ai.id} lost: Missing head object.`); // Keep commented, might be normal if head removed
            lostThisCheck = true;
        } else if (!aiPos) {
             // console.log(`[Collision] AI ${ai.id} lost: Missing targetPosition.`); // Keep commented, might be normal if head removed
             lostThisCheck = true;
        } else if (aiPos.x < boundaryXMin + epsilon || aiPos.x > boundaryXMax - epsilon || aiPos.z < boundaryZMin + epsilon || aiPos.z > boundaryZMax - epsilon) {
            // console.log(`[Collision] AI ${ai.id} lost: Hit boundary at (${aiPos.x.toFixed(1)}, ${aiPos.z.toFixed(1)}).`); // Comment out noisy log
            lostThisCheck = true;
        }
        if (lostThisCheck) {
             currentAILostStatus[i] = true;
             if (!prevAILostStatus[i]) { // Only explode if not lost last frame
                 const explosionColor = ai.material ? ai.material.color.getHex() : 0xffa500;
                 createExplosionEffect(aiPos ?? ai.head?.position ?? new THREE.Vector3(0,0,0), explosionColor, 3); 
             }
        }
    }

    // 3. Check Head-on Collisions
    // Player vs AIs
    if (logicalHeadPos && !p1Lost) {
        for (let i = 0; i < aiPlayers.length; i++) {
            if (currentAILostStatus[i]) continue; // Skip if AI already lost this cycle
            const ai = aiPlayers[i]; 
            const aiPos = aiLogicalPositions[i];
            if (aiPos && logicalHeadPos.distanceTo(aiPos) < collisionThreshold) {
                 // console.log(`[Collision] Player lost: Head-on with AI ${ai.id}.`); // Comment out noisy log
                 // console.log(`[Collision] AI ${ai.id} lost: Head-on with Player.`); // Comment out noisy log
                p1Lost = true;
                p1LostThisCheck = true; 
                currentAILostStatus[i] = true; 
                if (!prevAILostStatus[i]) {
                    const explosionColor = ai.material ? ai.material.color.getHex() : 0xffa500;
                    createExplosionEffect(aiPos, explosionColor, 3);
                }
            }
        }
    }
    // AI vs AI
    for (let i = 0; i < aiPlayers.length; i++) {
        if (currentAILostStatus[i]) continue; 
        const ai_i = aiPlayers[i];
        const aiPos1 = aiLogicalPositions[i];
        if (!aiPos1) continue;
        for (let j = i + 1; j < aiPlayers.length; j++) {
            if (currentAILostStatus[j]) continue; 
            const ai_j = aiPlayers[j]; 
            const aiPos2 = aiLogicalPositions[j];
            if (!aiPos2) continue; 
            if (aiPos1.distanceTo(aiPos2) < collisionThreshold) {
                 // console.log(`[Collision] AI ${ai_i.id} lost: Head-on with AI ${ai_j.id}.`); // Comment out noisy log
                 // console.log(`[Collision] AI ${ai_j.id} lost: Head-on with AI ${ai_i.id}.`); // Comment out noisy log
                 currentAILostStatus[i] = true;
                 currentAILostStatus[j] = true;
                 if (!prevAILostStatus[i]) {
                     const explosionColor_i = ai_i.material ? ai_i.material.color.getHex() : 0xffa500;
                     createExplosionEffect(aiPos1, explosionColor_i, 3); 
                 }
                 if (!prevAILostStatus[j]) {
                     const explosionColor_j = ai_j.material ? ai_j.material.color.getHex() : 0xffa500;
                     createExplosionEffect(aiPos2, explosionColor_j, 3);
                 }
            }
        }
    }

    // 4. Check Trail Collisions (Refactor similarly)
    // Player vs All AI Trails
    if (logicalHeadPos && !p1Lost) {
        for (const ai of aiPlayers) {
            for (let seg of ai.trailSegments) {
                if (logicalHeadPos.distanceTo(seg.position) < segmentSize * 0.5) { 
                    // console.log(`[Collision] Player vs AI Trail...`);
                    p1Lost = true;
                    p1LostThisCheck = true; // Mark lost this check
                    break;
                }
            }
            if (p1Lost) break;
        }
    }
    // Player vs Own Trail
    if (logicalHeadPos && !p1Lost) {
         const checkLength = Math.max(0, trailSegments1.length - 1); 
         for (let k = 0; k < checkLength; k++) { 
            if (logicalHeadPos.distanceTo(trailSegments1[k].position) < segmentSize * 0.5) { 
                // console.log(`[Collision] Player vs Own Trail...`);
                p1Lost = true;
                p1LostThisCheck = true; // Mark lost this check
                break;
            }
        }
    }
    // Each AI vs All Trails (Player + AI)
    for (let i = 0; i < aiPlayers.length; i++) {
        if (currentAILostStatus[i]) continue; 
        const currentAI = aiPlayers[i];
        const currentAIPos = aiLogicalPositions[i]; 
        if (!currentAIPos) continue; 
        let lostToTrail = false;
        // Check against player trail
        for (let seg of trailSegments1) {
             if (currentAIPos.distanceTo(seg.position) < segmentSize * 0.5) {
                 lostToTrail = true;
                 break;
            }
        }
        // Check against other AI trails
        if (!lostToTrail) {
            for (let otherAI of aiPlayers) {
                if (otherAI.id === currentAI.id) continue; 
                for (let seg of otherAI.trailSegments) {
                     if (currentAIPos.distanceTo(seg.position) < segmentSize * 0.5) {
                         lostToTrail = true;
                         break;
                    }
                }
                 if (lostToTrail) break; 
            }
        }
        // Check against own trail
        if (!lostToTrail) {
             const aiCheckLength = Math.max(0, currentAI.trailSegments.length - 1);
             for (let k = 0; k < aiCheckLength; k++) {
                 const seg = currentAI.trailSegments[k];
                 const dist = currentAIPos.distanceTo(seg.position);
                 if (dist < segmentSize * 0.5) {
                     lostToTrail = true;
                     break;
                }
            }
        }
        // If lost to any trail, update status and explode if new
        if (lostToTrail) {
            currentAILostStatus[i] = true;
            if (!prevAILostStatus[i]) { 
                 const explosionColor = currentAI.material ? currentAI.material.color.getHex() : 0xffa500;
                 createExplosionEffect(currentAIPos, explosionColor, 3);
            }
        }
    }

    // --- ADD PLAYER EXPLOSION --- 
    if (p1LostThisCheck && logicalHeadPos) { // Explode only if lost *this check*
        // console.log(`[Collision] Triggering Player Explosion`);
        createExplosionEffect(logicalHeadPos, P1_HEAD_COLOR_NORMAL, 3); 
    }
    // --- END PLAYER EXPLOSION --- 

    // 5. Determine Winner Code (Uses updated currentAILostStatus)
    let winnerCode = 0; // Default: Ongoing
    // <<< ADDED DEBUG LOGGING >>>
    // console.log(`[Collision Check Win] p1Lost=${p1Lost}, aiPlayers.length=${aiPlayers.length}, currentAILostStatus=[${currentAILostStatus.join(', ')}]`);
    // <<< END DEBUG LOGGING >>>
    const currentActiveAICount = aiPlayers.filter((ai, index) => !currentAILostStatus[index]).length;
    // <<< ADDED DEBUG LOGGING >>>
    // console.log(`[Collision Check Win] currentActiveAICount=${currentActiveAICount}`);
    // <<< END DEBUG LOGGING >>>
    if (p1Lost) {
        winnerCode = (currentActiveAICount > 0) ? 1 : 3; 
        // console.log(`[Collision] Game Over (Player Lost)...`); // Keep game over logs?
    } else if (currentActiveAICount === 0 && gameActive) { // Check if player didn't lose and no AIs are active
        winnerCode = 2; 
        // console.log(`[Collision] Game Over (All AIs Lost / Player Survived)...`); // Keep game over logs?
    } 
    
    // Return the calculated winner code, player status, and the CUMULATIVE AI status for this frame
    return { winnerCode, p1Lost, aiLostStatus: currentAILostStatus };
}

export function animate(currentTime) {
    requestAnimationFrame(animate);

    // 1. Calculate delta time
    const resolvedLastFrameTime = lastFrameTime || currentTime; // Handle first frame
    const deltaTime = currentTime - resolvedLastFrameTime;
    const deltaTimeSeconds = deltaTime / 1000.0;
    if (setLastFrameTime) setLastFrameTime(currentTime);
    
    let playerMoved = false, aiMoved = false;
    
    // --- Game Logic Update ---
    if (gameActive && !isPaused && !isGameOver) {

        // <<< ADDED: Check for and trigger deferred AI spawn effects >>>
        aiPlayers.forEach(ai => {
            if (ai.needsSpawnEffect) {
                const effectPosition = ai.targetPosition.clone(); // Use current target position
                const markerCenterY = -segmentSize / 2 + 0.01; 
                effectPosition.y = markerCenterY;
                createAISpawnRingEffect(effectPosition, ai.colors ? ai.colors.normal : 0xffffff); // Use AI color or fallback
                ai.needsSpawnEffect = false; // Mark as done
                console.log(`[animate] Triggered spawn effect for AI ${ai.id}`); // Keep log for verification
            }
        });
        // <<< END ADDED Check >>>

        // 3. Update player/AI movement & Handle pickup timers
        // Player 1 Update
        if (isSpeedBoostActiveP1 && currentTime > speedBoostEndTimeP1) {
            setSpeedLevelP1(0); // Reset level first
            setSpeedBoostActiveP1(false);
            if (snakeHead1) headMaterial1.color.setHex(P1_HEAD_COLOR_NORMAL);
        }
        if (isZoomedOutP1 && currentTime > zoomOutEndTimeP1) { if(setIsZoomedOutP1) setIsZoomedOutP1(false); if(setZoomLevelP1) setZoomLevelP1(0); }
        if (isSparseTrailActiveP1 && currentTime > sparseTrailEndTimeP1) { if(setIsSparseTrailActiveP1) setIsSparseTrailActiveP1(false); if(setSparseLevelP1) setSparseLevelP1(1); }
        const currentUpdateIntervalP1 = isSpeedBoostActiveP1 
            ? normalUpdateInterval / (1 + speedLevelP1 * SPEED_BOOST_DIMINISHING_FACTOR)
            : normalUpdateInterval;
        if ((currentTime - lastUpdateTimeP1) > currentUpdateIntervalP1) {
            // console.log(`[Debug] Player interval passed. CT=${currentTime.toFixed(0)}, LUP=${lastUpdateTimeP1.toFixed(0)}, Interval=${currentUpdateIntervalP1.toFixed(0)}`);
            if(setLastUpdateTimeP1) setLastUpdateTimeP1(currentTime - ((currentTime - lastUpdateTimeP1) % currentUpdateIntervalP1));
            if(setScoreP1) { 
                const newScore = scoreP1 + scoreIncrementPerTick; 
                setScoreP1(newScore); 
            } 
            prevTargetPos1.copy(snakeTargetPosition1); // Update previous position BEFORE calculating next
            let nextPos1 = snakeTargetPosition1.clone().addScaledVector(snakeDirection1, segmentSize);
            snakeTargetPosition1.set(snapToGridCenter(nextPos1.x, 'x'), 0, snapToGridCenter(nextPos1.z, 'z'));
            playerMoved = true;
            checkPlayerPickupCollisions(); // Check pickup collision AFTER position update
        }

        // AI Update (Loop through AIs)
        aiPlayers.forEach(ai => {
            if (ai.isSpeedBoostActive && currentTime > ai.speedBoostEndTime) {
                ai.speedLevel = 0;
                ai.isSpeedBoostActive = false;
                // Use the AI's specific normal head color
                if (ai.material && ai.colors) ai.material.color.setHex(ai.colors.normal); 
            }
            if (ai.isSparseTrailActive && currentTime > ai.sparseTrailEndTime) {
                ai.isSparseTrailActive = false;
                ai.sparseLevel = 1;
            }
        });

        // AI Movement Update (Loop through AIs)
        let aiMovedStatus = aiPlayers.map(() => false);
        aiPlayers.forEach((ai, index) => {
            if (previousFrameAICollisionStatus[index] || ai.isSpawning) return;
            
            const intervalAI = ai.isSpeedBoostActive 
                ? normalUpdateInterval / (1 + ai.speedLevel * SPEED_BOOST_DIMINISHING_FACTOR)
                : normalUpdateInterval;
            if ((currentTime - ai.lastUpdateTime) > intervalAI) {
                ai.lastUpdateTime = currentTime - ((currentTime - ai.lastUpdateTime) % intervalAI);
                ai.prevTargetPos.copy(ai.targetPosition);
                let nextPos = ai.targetPosition.clone().addScaledVector(ai.direction, segmentSize);
                ai.targetPosition.set(snapToGridCenter(nextPos.x, 'x'), 0, snapToGridCenter(nextPos.z, 'z'));
                aiMoved = true; 
                aiMovedStatus[index] = true;
                checkAIPickupCollisions(ai);
            }
        });
        // Update AI logic *after* determining potential moves
        if (aiMoved) {
             updateAllAIPlayers(); // Call the function that updates all AI decisions
        }

        // Check collisions & Handle Trails
        if (playerMoved || aiMoved) {
            // console.log(`[Debug] Entering collision check. playerMoved=${playerMoved}, aiMoved=${aiMoved}`);
            const statusFromPrevFrame = [...previousFrameAICollisionStatus]; // Copy state to pass
            const collisionInfo = checkCollisions(statusFromPrevFrame);
            const currentFrameStatus = collisionInfo.aiLostStatus;
            const winnerCode = collisionInfo.winnerCode;
            if(setWinner) setWinner(winnerCode);

            // Player Trail
            if (playerMoved && !collisionInfo.p1Lost && !isGameOver) { 
                const intervalP1 = sparseLevelP1 + 1;
                // Make previous hidden segment visible if needed
                if (isSparseTrailActiveP1 && trailCounterP1 % intervalP1 !== 0 && lastTrailSegment1) lastTrailSegment1.visible = true; 
                // Create new segment (always if not sparse, or on interval if sparse)
                if (!isSparseTrailActiveP1 || trailCounterP1 % intervalP1 === 0) {
                     createTrailSegment(prevTargetPos1, trailSegments1, 1); // Use prevTargetPos1
                 } else if (lastTrailSegment1) {
                     lastTrailSegment1.visible = false; // Hide the latest segment if sparse and not on interval
                 }
                if(setTrailCounterP1) setTrailCounterP1(trailCounterP1 + 1);
            }
            // AI Trail Creation (Loop through AIs)
            aiPlayers.forEach((ai, index) => {
                const aiMovedThisTick = aiMovedStatus[index]; 
                if (aiMovedThisTick && !currentFrameStatus[index] && !ai.isSpawning && !isGameOver) { 
                     // Handle sparse trail for AI
                     const intervalAI = ai.sparseLevel + 1;
                     // Make previous hidden segment visible if needed
                     if (ai.isSparseTrailActive && ai.trailCounter % intervalAI !== 0 && ai.lastTrailSegment) ai.lastTrailSegment.visible = true;
                     // Create new segment (always if not sparse, or on interval if sparse)
                     if (!ai.isSparseTrailActive || ai.trailCounter % intervalAI === 0) {
                         createTrailSegment(ai.prevTargetPos, ai.trailSegments, ai);
                     } else if (ai.lastTrailSegment) {
                         ai.lastTrailSegment.visible = false; // Hide if sparse
                     }
                     ai.trailCounter++; // Increment AI's specific counter
                }
            });

            // Game Over Handling
            if (winnerCode !== 0 && !isGameOver) { 
                // console.log("[Animate] Game Over detected! Setting state.");
                setIsGameOver(true);
                addGameOverPointerListeners(); // Attach listeners immediately ONCE
                resetGameOverDialogState(); // ADDED: Reset UI state
                
                // --- Explicitly ensure player head & segment behind it are visible --- 
                if (snakeHead1) {
                    snakeHead1.visible = true;
                    // console.log(`[${GAME_VERSION}] Ensured snakeHead1 visibility on game over.`); // Commented out
                }
                // Ensure the segment immediately behind the head is visible
                if (trailSegments1.length > 0) {
                    const segmentBehindHead = trailSegments1[trailSegments1.length - 1];
                    if (segmentBehindHead) { // Extra safety check
                        segmentBehindHead.visible = true;
                        // console.log(`[${GAME_VERSION}] Ensured segment behind head visibility on game over.`);
                    }
                }
                // Removed check for lastTrailSegment1 - updateLastTrailSegmentsVisibility handles the most recent one during gameplay
                // --- End Visibility Check --- 
                
                // Reset Boosts (already done correctly)
                // ...
                if (scoreP1 > topScore) {
                    setTopScore(scoreP1);
                    localStorage.setItem('tronSnakeTopScore', scoreP1.toString());
                }

                // --- Set Game End Timestamps & Reset Death Zoom --- 
                if (collisionInfo.p1Lost && playerLostTime === null) { // Player Lost (or Draw)
                    setPlayerLostTime(currentTime);
                    setDeathZoomFactor(1.0); // Initialize zoom factor for player loss
                    // console.log(`[Animate] Player lost/draw. Setting playerLostTime: ${currentTime}, Resetting deathZoomFactor.`); // Keep commented
                } else if (winnerCode === 2 && aiDefeatedTime === null) { // Player Won (Last AI defeated)
                    setAiDefeatedTime(currentTime);
                    setDeathZoomFactor(1.0); // Initialize zoom factor for AI loss
                    // console.log(`[Animate] All AIs defeated. Setting aiDefeatedTime: ${currentTime}, Resetting deathZoomFactor.`); // Keep commented
                }
                // --- END Timestamps & Zoom Reset --- 
                
                // Set Head Colors based on detailed status
                revertHeadColors(); // Start fresh
                if (collisionInfo.p1Lost) {
                    setHeadColorToRed(1); // Player is owner 1
                }
                currentFrameStatus.forEach((lost, index) => { // Use current frame status
                    if (lost && aiPlayers[index].head) {
                        setHeadColorToRed(aiPlayers[index]);
                    }
                });
            }
            // ---> Update central state at the end of collision handling <--- 
            if (setPreviousFrameAICollisionStatus) setPreviousFrameAICollisionStatus(currentFrameStatus);

            // --- MOVE AI Head Removal Logic INSIDE this block --- 
            aiPlayers.forEach((ai, index) => {
                if (currentFrameStatus[index] && !statusFromPrevFrame[index]) { 
                    if (ai.head && scene) {
                        // console.log(`[animate] Removing head for newly lost AI: ${ai.id}`);
                        // <<< COMMENTED OUT: Keep head visible on game over screen >>>
                        // scene.remove(ai.head);
                        // MODIFIED: Do not null the head reference here. Let resetGame handle it.
                        // ai.head = null; 
                    }
                    if (ai.ammoIndicator && scene) {
                        // console.log(`[animate] Removing ammo indicator for newly lost AI: ${ai.id}`);
                        scene.remove(ai.ammoIndicator);
                        ai.ammoIndicator = null;
                    }
                }
            });
            // --- END Moved AI Head Removal Logic ---
        }

        // <<< SOLUTION: Move AI Spawn Ring Update HERE >>>
        // This ensures it runs every frame the game is active, not just on movement ticks.
        let currentRingEffects = [...aiSpawnRingEffects]; 
        let effectsChanged = false;
        for (let i = currentRingEffects.length - 1; i >= 0; i--) {
            const effect = currentRingEffects[i];
            if (!effect || !effect.mesh || !effect.material) { 
                currentRingEffects.splice(i, 1);
                effectsChanged = true;
                continue;
            }
            // Decrement remaining duration using deltaTime (ms)
            effect.remainingDuration -= deltaTime; 

            // <<< REMOVING ACTIVE LOGGING >>>
            // if (i === 0) { 
            //     console.log(`[SpawnAnim] deltaTime: ${deltaTime.toFixed(1)}, RemDur: ${effect.remainingDuration.toFixed(1)}, InitDur: ${effect.initialDuration.toFixed(1)}`);
            // }
            // <<< END REMOVING ACTIVE LOGGING >>>

            if (effect.remainingDuration <= 0) {
                // Remove effect when done
                if (scene && effect.mesh.parent === scene) scene.remove(effect.mesh);
                currentRingEffects.splice(i, 1);
                effectsChanged = true;
            } else {
                // Calculate progress based on remaining vs initial duration
                // Progress goes from 0 (start) towards 1 (end)
                const progress = 1.0 - (effect.remainingDuration / effect.initialDuration);

                // --- REVISED Animation Logic: Start Large, Contract Inwards ---
                // Scale goes from 1 (start) down to 0 (end)
                const currentScale = Math.max(epsilon, 1.0 - progress); 
                effect.mesh.scale.setScalar(currentScale);

                // Opacity also fades from start to end
                const initialOpacity = 0.8;
                effect.material.opacity = Math.max(0, initialOpacity * (1.0 - progress));
                // --- END REVISED Animation Logic ---

                // <<< REMOVING ACTIVE LOGGING >>>
                // if (i === 0) {
                //    console.log(`[SpawnAnim] Progress: ${progress.toFixed(3)}, Scale: ${currentScale.toFixed(3)}, Opacity: ${effect.material.opacity.toFixed(3)}`);
                // }
                // <<< END REMOVING ACTIVE LOGGING >>>
            }
        }
        if (effectsChanged) {
            setAiSpawnRingEffects(currentRingEffects); 
        }
        // <<< END MOVED AI Spawn Ring Update >>>

        // <<< RESTORED PROJECTILE UPDATE >>>
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const proj = projectiles[i];
            proj.mesh.position.addScaledVector(proj.velocity, deltaTimeSeconds);
            proj.life -= deltaTimeSeconds;

            let remove = false;
            if (proj.life <= 0) {
                remove = true;
            } else {
                 // <<< RE-ADDED Projectile Collision Logic >>>
                let hit = false;
                const collisionDist = segmentSize * 0.6; 

                if (proj.owner === 'player') {
                    // Check against AI trails
                    for (const ai of aiPlayers) {
                        if (!ai.trailSegments || ai.lost) continue; // Skip if no trail or AI is lost
                        for (let j = ai.trailSegments.length - 1; j >= 0; j--) {
                            const segment = ai.trailSegments[j];
                            if (segment && proj.mesh.position.distanceTo(segment.position) < collisionDist) { 
                                createExplosionEffect(segment.position, ai.color); // Explosion uses AI color
                                if (scene) scene.remove(segment);
                                ai.trailSegments.splice(j, 1);
                                hit = true;
                                break; // Only hit one segment per frame per projectile
                            }
                        }
                        if (hit) break; // Projectile hit an AI trail
                    }
                } else { // Projectile owned by AI
                    // --- RESTRUCTURED AI Projectile Collision Checks ---
                    // Check against player trail first
                    if(trailSegments1) {
                        for (let j = trailSegments1.length - 1; j >= 0; j--) {
                            const segment = trailSegments1[j];
                            if (segment && proj.mesh.position.distanceTo(segment.position) < collisionDist) {
                                createExplosionEffect(segment.position, P1_TRAIL_COLOR_NORMAL);
                                if (scene) scene.remove(segment);
                                trailSegments1.splice(j, 1);
                                hit = true;
                                break;
                            }
                        }
                    }
                    
                    // Now check against ALL AI trails (including own)
                    // This runs regardless of whether the player trail was hit, but respects the 'hit' flag for the projectile
                    if (!hit) { // Only check AI trails if player trail wasn't hit
                        for (const targetAI of aiPlayers) { 
                            // Skip check only if the target AI has no trail or is lost
                            if (!targetAI.trailSegments || targetAI.lost) continue;

                            for (let j = targetAI.trailSegments.length - 1; j >= 0; j--) {
                                const segment = targetAI.trailSegments[j];
                                if (segment && proj.mesh.position.distanceTo(segment.position) < collisionDist) {
                                    // Use the color of the AI whose trail was hit
                                    createExplosionEffect(segment.position, targetAI.color); 
                                    if (scene) scene.remove(segment);
                                    // Remove segment from the correct AI's trail array
                                    targetAI.trailSegments.splice(j, 1); 
                                    hit = true;
                                    break; // Only hit one segment per frame per projectile
                                }
                            }
                            if (hit) break; // Projectile hit an AI trail, stop checking other AIs
                        }
                    }
                     // --- END RESTRUCTURED AI Projectile Collision Checks ---
                }

                if (hit) {
                    remove = true; // Mark projectile for removal if it hit something
                }
                 // <<< END RE-ADDED Projectile Collision Logic >>>
            }

            // Emit trail particles
            const PARTICLE_LIMIT = 10000; // Define limit (consider moving to constants)
            for (let p = 0; p < TRAIL_PARTICLE_COUNT_PER_FRAME; p++) {
                if (explosionParticles.length + allTrailParticles.length >= PARTICLE_LIMIT) {
                    break; 
                }
                const particleMesh = new THREE.Mesh(trailParticleGeometry, trailParticleMaterial.clone());
                const offset = proj.velocity.clone().normalize().multiplyScalar(-PROJECTILE_SIZE * 1.5);
                particleMesh.position.copy(proj.mesh.position).add(offset).add(new THREE.Vector3((Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1));
                const pLife = TRAIL_PARTICLE_LIFE * (0.8 + Math.random() * 0.4);
                allTrailParticles.push({ mesh: particleMesh, life: pLife, initialLife: pLife });
                if (scene) scene.add(particleMesh);
            }

            if (remove) {
                if (scene) scene.remove(proj.mesh);
                projectiles.splice(i, 1);
            }
        }
        // <<< END RESTORED PROJECTILE UPDATE >>>

    } else if (isGameOver && !isGameOverCameraActive && (playerLostTime !== null || aiDefeatedTime !== null) && snakeTargetPosition1 && camera) {
        // Restore Game Over Delay Zoom Logic
        // Calculate target zoom (Level 3 equivalent)
        const TARGET_DEATH_ZOOM = 1 + (3 * 0.8); // 3.4
        // Smoothly interpolate the deathZoomFactor
        const currentDeathZoom = THREE.MathUtils.lerp(deathZoomFactor, TARGET_DEATH_ZOOM, 0.015); // Slow lerp factor
        if(setDeathZoomFactor) setDeathZoomFactor(currentDeathZoom); // Use setter

        // Calculate camera height/distance using the interpolated death zoom
        const camHeight = baseCameraHeight * currentDeathZoom;
        const camDist = baseCameraDistance * currentDeathZoom;
        
        // Use the rest of the normal camera follow logic, focusing on the player's last position
        let camTargetPos, lookAtLerpTarget;
        // Determine focus point: Use snakeHead1 position if available, otherwise fallback to snakeTargetPosition1
        let focusPoint = snakeHead1 ? snakeHead1.position.clone() : snakeTargetPosition1.clone(); 

        // Calculate camera offset based on snake's final direction (or default if needed)
        // Use snakeDirection1 state directly
        let finalDirection = snakeDirection1.lengthSq() > 0.1 ? snakeDirection1.clone() : new THREE.Vector3(1, 0, 0); // Default if zero
        
        cameraOffset.copy(finalDirection).multiplyScalar(-camDist).y = camHeight; // Standard behind view
        camTargetPos = focusPoint.add(cameraOffset);
        lookAtLerpTarget = focusPoint; // Look at the player's last point

        // Use normal cameraLag during the delay
        camera.position.lerp(camTargetPos, cameraLag); 
        targetLookAt.lerp(lookAtLerpTarget, cameraLag);
        camera.lookAt(targetLookAt);
        // --- End Delay Zoom Logic ---
    } else if (isGameOverCameraActive && camera) {
        // Restore Game Over Manual Control Logic
        const desiredPosition = gameOverLookAtTarget.clone().add(gameOverCameraOffset);
        // Immediately jump if dragging/panning, otherwise lerp smoothly
        if (isDraggingCamera || isPanningCamera) { 
            camera.position.copy(desiredPosition);
        } else {
            camera.position.lerp(desiredPosition, gameOverCameraLag);
        }
        // Immediately update lookAt target if dragging/panning
        if (isDraggingCamera || isPanningCamera) { 
            gameOverLerpedLookAtTarget.copy(gameOverLookAtTarget); 
        } else {
            // Smoothly lerp the lookAt target when not actively dragging/panning
            gameOverLerpedLookAtTarget.lerp(gameOverLookAtTarget, gameOverCameraLag); 
        }
        camera.up.set(0, 1, 0); // Ensure UP is correct
        camera.lookAt(gameOverLerpedLookAtTarget); 
        // --- End Manual Control Logic ---
    } else if (!gameActive && camera) {
        // ... (pre-game camera logic) ...
    }

    // <<< MOVED Visual Updates INSIDE gameActive check >>>
    // --- Visual Updates --- (Should generally run even if paused/game over, but movement lerping stops)

    // <<< ADDED: Check for AI Spawning Completion >>>
    if (gameActive && !isPaused) { // Only check/add heads if game is running normally
        for (const ai of aiPlayers) {
            // Check if the AI is in the spawning state, head exists, and hasn't been added to scene
            if (ai.isSpawning && ai.head && !ai.head.parent) { 
                const elapsedSpawnTime = currentTime - ai.spawnStartTime;
                // If the spawn duration has passed
                // --- REVERTED: Remove multiplier, use exact spawnDuration --- 
                const requiredSpawnTime = ai.spawnDuration;
                if (elapsedSpawnTime >= requiredSpawnTime) { 
                    // <<< ADD LOGGING >>>
                    console.log(`[SpawnComplete] AI ${ai.id} Time Check Passed (${elapsedSpawnTime.toFixed(0)} >= ${requiredSpawnTime}). Adding head.`);
                    // <<< END LOGGING >>>
                    // Add the AI's head mesh to the scene
                    ai.head.position.copy(ai.targetPosition); 
                    if (scene) {
                         scene.add(ai.head);
                         // <<< ADD LOGGING >>>
                         console.log(`[SpawnComplete] AI ${ai.id} head added to scene. Parent: ${ai.head.parent?.type}`);
                         // <<< END LOGGING >>>
                    } else {
                        console.error(`[Animate] Scene not found when trying to add AI head ${ai.id}`);
                    }
                    // Mark the AI as no longer spawning
                    ai.isSpawning = false; // State change triggers movement/lerping next frame
                }
            }
        }
    }

    // <<< MOVED: Lerp snake head visual positions INSIDE gameActive check >>>
    if (!isGameOver) { // Lerping only happens when not game over
        if (snakeHead1) {
            snakeHead1.position.lerp(snakeTargetPosition1, LERP_FACTOR);
        }
        // <<< MODIFIED: Lerp AIs only if they are NOT spawning and NOT lost >>>
        aiPlayers.forEach((ai, index) => {
            if (ai.head && !ai.isSpawning && !previousFrameAICollisionStatus[index]) {
                 ai.head.position.lerp(ai.targetPosition, LERP_FACTOR);
            }
        });
        updateLastTrailSegmentsVisibility();
    }

    // <<< SECTION MOVED: Update visual effects (particles, text) >>>
    // Moved this block outside the (gameActive && !isPaused) check 
    // so effects like explosions can finish after game over.
    // <<< ADD LOGGING >>>
    // console.log(`[animate] Updating Visual Effects. Particles: ${explosionParticles.length}, Texts: ${floatingTexts.length}`);
    // <<< END LOGGING >>>

    // Explosion Particles
    for (let i = explosionParticles.length - 1; i >= 0; i--) {
        const particle = explosionParticles[i];
        // <<< ADD LOGGING >>>
        // console.log(`[animate] Processing particle ${i}. Life: ${particle.life.toFixed(2)}`);
        // <<< END LOGGING >>>
        particle.life -= deltaTimeSeconds;
        if (particle.life <= 0) {
            if (scene) scene.remove(particle.mesh);
            explosionParticles.splice(i, 1);
        } else {
            particle.mesh.position.addScaledVector(particle.velocity, deltaTimeSeconds);
            particle.velocity.y += PARTICLE_GRAVITY * deltaTimeSeconds; // Apply gravity
             // Ground collision (basic)
             if (particle.mesh.position.y < GROUND_Y) {
                particle.mesh.position.y = GROUND_Y;
                particle.velocity.y *= -0.4; // Bounce with damping
                particle.velocity.x *= 0.8;
                particle.velocity.z *= 0.8;
            }
            const progress = 1 - (particle.life / particle.initialLife);
            if(particle.mesh.material) particle.mesh.material.opacity = Math.max(0, 1 - progress);
        }
    }

    // Floating Text
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const text = floatingTexts[i];
        // <<< ADD LOGGING >>>
        // console.log(`[animate] Processing text ${i}. Life: ${text.life.toFixed(2)}`);
        // <<< END LOGGING >>>
        text.life -= deltaTimeSeconds;
        if (text.life <= 0) {
            if(scene) scene.remove(text.mesh);
            floatingTexts.splice(i, 1);
        } else {
            text.mesh.position.y += TEXT_MOVE_SPEED * deltaTimeSeconds;
            const progress = 1 - (text.life / text.initialLife);
            if (text.mesh.material) text.mesh.material.opacity = Math.max(0, 1 - progress);
            // <<< RESTORED: Make text face the camera >>>
            if (camera && text.mesh) text.mesh.lookAt(camera.position);
        }
    }

    // Projectile Trail Particle Update
    for (let i = allTrailParticles.length - 1; i >= 0; i--) {
        const particle = allTrailParticles[i];
        particle.life -= deltaTimeSeconds;
        if (particle.life <= 0) {
            if (scene) scene.remove(particle.mesh);
            allTrailParticles.splice(i, 1);
        } else {
            const progress = 1 - (particle.life / particle.initialLife);
            if(particle.mesh.material) particle.mesh.material.opacity = Math.max(0, 1 - progress);
        }
    }

    // Pickup Spawn Particle Update
    for (let i = pickupSpawnParticles.length - 1; i >= 0; i--) {
        const p = pickupSpawnParticles[i];
        const elapsedTime = (currentTime - p.startTime); // Keep in ms for phase calcs

        // Lifetime Check (using deltaTimeSeconds for consistency)
        p.life -= deltaTimeSeconds;
        const totalDurationMs = (p.expandDuration + p.lingerDuration + p.contractDuration) * 1000; // Convert phase durations to ms

        if (p.life <= 0 || elapsedTime >= totalDurationMs) {
            if(p.mesh && scene) scene.remove(p.mesh); 
            pickupSpawnParticles.splice(i, 1);
            continue;
        }
        
        if (!p.mesh || !p.mesh.material) {
             pickupSpawnParticles.splice(i, 1);
             continue;
        }

        // Calculate current phase progress (elapsedTime is in ms)
        let phaseProgress = 0;
        let currentRadius = 0;
        let currentScale = p.startScale;
        const expandDurationMs = p.expandDuration * 1000;
        const lingerDurationMs = p.lingerDuration * 1000;
        const contractDurationMs = p.contractDuration * 1000;

        if (elapsedTime < expandDurationMs) {
            // Expanding phase
            phaseProgress = elapsedTime / expandDurationMs;
            currentRadius = THREE.MathUtils.lerp(0, p.maxRadius, phaseProgress);
            currentScale = THREE.MathUtils.lerp(p.startScale, p.maxScale, phaseProgress);
        } else if (elapsedTime < expandDurationMs + lingerDurationMs) {
            // Lingering phase
            currentRadius = p.maxRadius;
            currentScale = p.maxScale;
        } else {
            // Contracting phase
            const contractTimeMs = elapsedTime - (expandDurationMs + lingerDurationMs);
            phaseProgress = Math.max(0, Math.min(1, contractTimeMs / contractDurationMs)); // Clamp progress 0-1
            currentRadius = THREE.MathUtils.lerp(p.maxRadius, 0, phaseProgress);
            currentScale = THREE.MathUtils.lerp(p.maxScale, p.startScale, phaseProgress); // Contract scale too
        }

        // Move along direction, scaled by radius, AND rotate over time
        const baseOffset = p.direction.clone().multiplyScalar(currentRadius);
        const angle = (elapsedTime / 1000) * SPAWN_EFFECT_ROTATION_SPEED; // Rotation based on time in seconds
        baseOffset.applyAxisAngle(yAxis, angle); // Rotate around Y axis
        p.mesh.position.copy(p.center).add(baseOffset);

        // Update scale
        p.mesh.scale.set(currentScale, currentScale, currentScale);

        // Update opacity (fade out towards end of life or end of animation)
        const lifeRatio = Math.max(0, Math.min(1, p.life / p.initialLife)); // p.life is in seconds
        const timeRatio = Math.max(0, 1 - (elapsedTime / totalDurationMs));
        p.mesh.material.opacity = Math.min(lifeRatio, timeRatio);
    }
    // <<< END SECTION MOVED >>>

    // --- Pickup Fade-In Update --- 
    const allPickupArrays = [scorePickups, expansionPickups, clearPickups, zoomPickups, sparseTrailPickups, multiSpawnPickups, addAiPickups, ammoPickups];
    for (const pickupArray of allPickupArrays) {
        for (let i = pickupArray.length - 1; i >= 0; i--) { 
            const pickup = pickupArray[i];

            // Only process if isSpawning is explicitly true
            if (pickup.isSpawning === true) {
                const fadeElapsed = currentTime - pickup.spawnStartTime;
                const fadeProgress = Math.min(1, fadeElapsed / pickup.spawnFadeInDuration);

                // Apply opacity to material OR traverse children for Groups
                if (pickup.material) {
                    // Standard mesh
                    pickup.material.opacity = fadeProgress;
                } else if (pickup.isGroup) {
                    // Group (like sparse trail pickup)
                    pickup.traverse((child) => {
                        if (child.isMesh && child.material) {
                            child.material.opacity = fadeProgress;
                        }
                    });
                }

                if (fadeProgress >= 1) {
                    pickup.isSpawning = false; 
                    // Optional: Reset transparency/opacity if needed after fade-in
                    // if (pickup.material) pickup.material.transparent = false;
                    // else if (pickup.isGroup) { ... traverse and set transparent=false ... }
                }
            }
        }
    }
    // --- End Pickup Fade-In Update ---

    // <<< COMMENT OUT Camera Debugging >>>
    // console.log(`[CAM DEBUG] isGameOver=${isGameOver}, gameActive=${gameActive}, camExists=${!!camera}, targetExists=${!!snakeTargetPosition1}`);
    // if (snakeTargetPosition1) { 
    //     console.log(`[CAM DEBUG] targetPos=(${snakeTargetPosition1.x}, ${snakeTargetPosition1.y}, ${snakeTargetPosition1.z})`);
    // }
    // <<< END Debugging >>>

    // 8. Update camera position
    if (!isGameOver && snakeTargetPosition1 && gameActive && camera) {
        const zoomMult = 1 + (zoomLevelP1 * 0.8); // Calculate zoom multiplier
        const camHeight = isZoomedOutP1 ? baseCameraHeight * zoomMult : baseCameraHeight;
        const camDist = isZoomedOutP1 ? baseCameraDistance * zoomMult : baseCameraDistance;
        let camTargetPos, lookAtLerpTarget;
        let focusPoint = snakeHead1 ? snakeHead1.position : snakeTargetPosition1; // Use target pos if head is null
        if (isLookingBack) {
            cameraOffset.copy(snakeDirection1).multiplyScalar(+camDist).y = camHeight;
            camTargetPos = focusPoint.clone().add(cameraOffset);
            lookAtLerpTarget = focusPoint; // Look at self (or target pos) when looking back
        } else {
            cameraOffset.copy(snakeDirection1).multiplyScalar(-camDist).y = camHeight;
            camTargetPos = focusPoint.clone().add(cameraOffset);
            lookAtLerpTarget = focusPoint; // Normally look at self (or target pos)
        }
        camera.position.lerp(camTargetPos, cameraLag);
        targetLookAt.lerp(lookAtLerpTarget, cameraLag);
        camera.lookAt(targetLookAt);

        // Update ammo indicator positions and rotations
        const indicatorLookTarget = camera.position.clone(); 
        indicatorLookTarget.y += 1; // Look slightly above camera position

        if (ammoIndicatorP1 && snakeHead1) { 
            ammoIndicatorP1.position.copy(snakeHead1.position).y += segmentSize * 0.7; 
            ammoIndicatorP1.lookAt(indicatorLookTarget); 
        }
        aiPlayers.forEach(ai => {
            if (ai.ammoIndicator && ai.head && !ai.isSpawning) { 
                ai.ammoIndicator.position.copy(ai.head.position).y += segmentSize * 0.7;
                ai.ammoIndicator.lookAt(indicatorLookTarget); 
            }
        });
    } else if (isGameOver && !isGameOverCameraActive && (playerLostTime !== null || aiDefeatedTime !== null) && snakeTargetPosition1 && camera) {
        // ... (game over delay zoom logic) ...
    } else if (isGameOverCameraActive && camera) {
        // ... (game over manual control logic) ...
    } else if (!gameActive && camera) {
        // ... (pre-game camera logic) ...
    }

    // --- Show Game Over Message Conditionally ---
    if (isGameOver) {
        let timeSinceGameOver = -1;
        const gameOverTime = playerLostTime || aiDefeatedTime;
        if (gameOverTime !== null) {
            timeSinceGameOver = currentTime - gameOverTime;
        }

        const delayToShowMessage = 5000; // 5 seconds
        const shouldShowMessage = timeSinceGameOver >= delayToShowMessage;

        if (shouldShowMessage) {
            // Activate Game Over Camera State WHEN message should show
            if (!isGameOverCameraActive) { 
                // console.log("[Animate] Activating Game Over Camera.");
                // Calculate initial target/position here (Example - adjust as needed)
                const width = boundaryXMax - boundaryXMin, height = boundaryZMax - boundaryZMin;
                const centerX = (boundaryXMin + boundaryXMax) / 2, centerZ = (boundaryZMin + boundaryZMax) / 2;
                const newLookAt = new THREE.Vector3(centerX, 0, centerZ);
                if(setGameOverLookAtTarget) setGameOverLookAtTarget(newLookAt); // Update state

                const largestDim = Math.max(width, height);
                const fovRad = camera.fov * (Math.PI / 180);
                let reqHeight = (Math.tan(fovRad / 2) > epsilon) ? (largestDim / 1.8) / Math.tan(fovRad / 2) : 10;
                const initialTargetHeight = Math.max(baseCameraHeight + 5, reqHeight * 1.2);
                const newTargetPos = new THREE.Vector3(centerX + 0.01, initialTargetHeight, centerZ);
                if(setGameOverCameraTargetPosition) setGameOverCameraTargetPosition(newTargetPos); // Update state

                // Calculate initial offset based on the new target and lookAt
                const initialOffset = newTargetPos.clone().sub(newLookAt);
                if(setGameOverCameraOffset) setGameOverCameraOffset(initialOffset); // Update state

                if(setIsGameOverCameraActive) setIsGameOverCameraActive(true); // Activate the logic
            }
            showGameOverMessage(winner); // Pass the winner code
        } else {
            // Ensure message is hidden during the delay
            if (gameOverTextElement) gameOverTextElement.style.display = 'none';
        }
    } else {
        // Ensure message is hidden if game is not over
        if (gameOverTextElement) gameOverTextElement.style.display = 'none';
    }
    // --- END SHOW GAME OVER MESSAGE LOGIC --- 

    // Update Pause Indicator Visibility (always update)
    if (pauseIndicatorElement) {
        pauseIndicatorElement.style.display = isPaused ? 'block' : 'none';
    }

    // <<< ADDED: Update Score Display >>>
    updateScoreDisplay();

    // 9. Render the scene (always render)
    if(renderer && scene && camera) renderer.render(scene, camera);
}