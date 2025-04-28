import * as THREE from 'three';
import {
    scene, camera, renderer,
    gameActive, isGameOver, winner, scoreP1, isPaused,
    isSpeedBoostActiveP1, speedBoostEndTimeP1, speedLevelP1,
    isZoomedOutP1, zoomOutEndTimeP1, zoomLevelP1, isSparseTrailActiveP1, sparseTrailEndTimeP1, trailCounterP1, sparseLevelP1, lastUpdateTimeP1,
    aiPlayers,
    snakeHead1, snakeTargetPosition1, prevTargetPos1,
    lastTrailSegment1, explosionParticles, floatingTexts, projectiles, allTrailParticles,
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
    GAME_VERSION
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
        console.log(`[Pre-Check] Player logicalHeadPos is null/undefined!`);
    }
    // console.log(`[Pre-Check] Player trailSegments1.length: ${trailSegments1?.length ?? 'undefined'}`); // Commented out
    // console.log(`[Pre-Check] Boundaries: X(${boundaryXMin?.toFixed(1)}->${boundaryXMax?.toFixed(1)}) Z(${boundaryZMin?.toFixed(1)}->${boundaryZMax?.toFixed(1)})`); // Commented out
    // --------------------------------------

    // 1. Check Player Boundaries (p1Lost only depends on current frame)
    if (logicalHeadPos && !p1Lost && (logicalHeadPos.x <= boundaryXMin || logicalHeadPos.x >= boundaryXMax || logicalHeadPos.z <= boundaryZMin || logicalHeadPos.z >= boundaryZMax)) {
        console.log(`[Collision] Player boundary check...`);
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
            console.log(`[Collision] AI ${ai.id} lost: Missing head object.`);
            lostThisCheck = true;
        } else if (!aiPos) {
             console.log(`[Collision] AI ${ai.id} lost: Missing targetPosition.`);
             lostThisCheck = true;
        } else if (aiPos.x < boundaryXMin + epsilon || aiPos.x > boundaryXMax - epsilon || aiPos.z < boundaryZMin + epsilon || aiPos.z > boundaryZMax - epsilon) {
            console.log(`[Collision] AI ${ai.id} lost: Hit boundary at (${aiPos.x.toFixed(1)}, ${aiPos.z.toFixed(1)}).`);
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
                 console.log(`[Collision] Player lost: Head-on with AI ${ai.id}.`);
                 console.log(`[Collision] AI ${ai.id} lost: Head-on with Player.`);
                p1Lost = true;
                p1LostThisCheck = true; // Mark lost this check
                currentAILostStatus[i] = true; // Mark AI lost this cycle
                if (!prevAILostStatus[i]) { // Only explode AI if not lost last frame
                    const explosionColor = ai.material ? ai.material.color.getHex() : 0xffa500;
                    createExplosionEffect(aiPos, explosionColor, 3);
                }
                // Player explosion should happen outside this loop based on p1Lost flag?
            }
        }
    }
    // AI vs AI
    for (let i = 0; i < aiPlayers.length; i++) {
        if (currentAILostStatus[i]) continue; // Skip if i lost this cycle
        const ai_i = aiPlayers[i];
        const aiPos1 = aiLogicalPositions[i];
        if (!aiPos1) continue;
        for (let j = i + 1; j < aiPlayers.length; j++) {
            if (currentAILostStatus[j]) continue; // Skip if j lost this cycle
            const ai_j = aiPlayers[j]; 
            const aiPos2 = aiLogicalPositions[j];
            if (!aiPos2) continue; 
            if (aiPos1.distanceTo(aiPos2) < collisionThreshold) {
                 console.log(`[Collision] AI ${ai_i.id} lost: Head-on with AI ${ai_j.id}.`);
                 console.log(`[Collision] AI ${ai_j.id} lost: Head-on with AI ${ai_i.id}.`);
                 currentAILostStatus[i] = true;
                 currentAILostStatus[j] = true;
                 // Explode i only if not lost previously
                 if (!prevAILostStatus[i]) {
                     const explosionColor_i = ai_i.material ? ai_i.material.color.getHex() : 0xffa500;
                     createExplosionEffect(aiPos1, explosionColor_i, 3); 
                 }
                 // Explode j only if not lost previously
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
        if (currentAILostStatus[i]) continue; // Skip if lost this cycle
        const currentAI = aiPlayers[i];
        const currentAIPos = aiLogicalPositions[i]; 
        if (!currentAIPos) continue; 
        let lostToTrail = false;
        // Check against player trail
        for (let seg of trailSegments1) {
             if (currentAIPos.distanceTo(seg.position) < collisionThreshold) {
                 // console.log(`[Collision] AI ${currentAI.id} lost: Hit player trail.`);
                 lostToTrail = true;
                 break;
            }
        }
        // Check against other AI trails
        if (!lostToTrail) {
            for (let otherAI of aiPlayers) {
                if (otherAI.id === currentAI.id) continue; 
                for (let seg of otherAI.trailSegments) {
                     if (currentAIPos.distanceTo(seg.position) < collisionThreshold) {
                         // console.log(`[Collision] AI ${currentAI.id} lost: Hit trail of AI ${otherAI.id}.`);
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
                 if (dist < collisionThreshold) {
                     // console.log(`[Collision] AI ${currentAI.id} lost: Hit own trail segment at index ${k}.`);
                     lostToTrail = true;
                     break;
                }
            }
        }
        // If lost to any trail, update status and explode if new
        if (lostToTrail) {
            currentAILostStatus[i] = true;
            if (!prevAILostStatus[i]) { // Only explode if not lost last frame
                 const explosionColor = currentAI.material ? currentAI.material.color.getHex() : 0xffa500;
                 createExplosionEffect(currentAIPos, explosionColor, 3);
            }
        }
    }

    // --- ADD PLAYER EXPLOSION --- 
    if (p1LostThisCheck && logicalHeadPos) { // Explode only if lost *this check*
        console.log(`[Collision] Triggering Player Explosion`);
        createExplosionEffect(logicalHeadPos, P1_HEAD_COLOR_NORMAL, 3); 
    }
    // --- END PLAYER EXPLOSION --- 

    // 5. Determine Winner Code (Uses updated currentAILostStatus)
    let winnerCode = 0; // Default: Ongoing
    // Add detailed logging before the filter
    // console.log(`[Debug CheckCollisions] Before filter: aiPlayers.length=${aiPlayers.length}, currentAILostStatus=[${currentAILostStatus.join(', ')}]`);
    const currentActiveAICount = aiPlayers.filter((ai, index) => !currentAILostStatus[index]).length;
    // console.log(`[Debug CheckCollisions] After filter: currentActiveAICount=${currentActiveAICount}`); // Log the result
    if (p1Lost) {
        winnerCode = (currentActiveAICount > 0) ? 1 : 3; 
        // console.log(`[Collision] Game Over (Player Lost)...`); // Keep game over logs?
    } else if (currentActiveAICount === 0 && gameActive) {
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
    if (gameActive && !isGameOver) {
        if (!isPaused) {
            // Calculate delta time only when not paused
            const deltaTimeSeconds = (currentTime - lastFrameTime) / 1000.0;
            setLastFrameTime(currentTime); // Update last frame time

            // 2. Check game over condition (Skip updates if game over)
            if (gameActive && !isGameOver) {
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
                    if (previousFrameAICollisionStatus[index]) return; // Skip move/pickup check if already lost according to state
                    
                    const intervalAI = ai.isSpeedBoostActive 
                        ? normalUpdateInterval / (1 + ai.speedLevel * SPEED_BOOST_DIMINISHING_FACTOR)
                        : normalUpdateInterval;
                    if ((currentTime - ai.lastUpdateTime) > intervalAI) {
                        // console.log(`[Debug] AI ${ai.id} interval passed. CT=${currentTime.toFixed(0)}, LUA=${ai.lastUpdateTime.toFixed(0)}, Interval=${intervalAI.toFixed(0)}`);
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
                        if (aiMovedThisTick && !currentFrameStatus[index] && !isGameOver) { 
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
                    if (winnerCode !== 0 && !isGameOver) { // Only trigger game over state *once*
                        console.log("[Animate] Game Over detected! Setting state.");
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
                                console.log(`[${GAME_VERSION}] Ensured segment behind head visibility on game over.`);
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
                            console.log(`[Animate] Player lost/draw. Setting playerLostTime: ${currentTime}, Resetting deathZoomFactor.`);
                        } else if (winnerCode === 2 && aiDefeatedTime === null) { // Player Won (Last AI defeated)
                            setAiDefeatedTime(currentTime);
                            setDeathZoomFactor(1.0); // Initialize zoom factor for AI loss
                            console.log(`[Animate] All AIs defeated. Setting aiDefeatedTime: ${currentTime}, Resetting deathZoomFactor.`);
                        }
                        // --- END Timestamps & Zoom Reset --- 
                        
                        // Set Head Colors based on detailed status
                        revertHeadColors(); // Start fresh
                        if (collisionInfo.p1Lost) {
                            setHeadColorToRed(1); // Player is owner 1
                        }
                        currentFrameStatus.forEach((lost, index) => { // Use current frame status
                            if (lost) {
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
                                scene.remove(ai.head);
                                ai.head = null; 
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
            } // End of if(gameActive && !isGameOver)
        } // End of if (!isPaused)
    } // End of if(gameActive && !isGameOver)

    // --- Show Game Over Message Conditionally --- 
    if (isGameOver) {
        // MODIFIED: Check appropriate timestamp based on winner
        let timeSinceGameOver = -1;
        if ((winner === 1 || winner === 3) && playerLostTime !== null) {
            timeSinceGameOver = currentTime - playerLostTime;
        } else if (winner === 2 && aiDefeatedTime !== null) {
            timeSinceGameOver = currentTime - aiDefeatedTime;
        }

        const shouldShowMessage = timeSinceGameOver >= 5000; // Show if 5 seconds have passed

        if (shouldShowMessage) {
            // Activate Game Over Camera State WHEN message should show
            if (!isGameOverCameraActive) { 
                console.log("[Animate] Activating Game Over Camera.");
                // Calculate initial target/position here
                const width = boundaryXMax - boundaryXMin, height = boundaryZMax - boundaryZMin;
                const centerX = (boundaryXMin + boundaryXMax) / 2, centerZ = (boundaryZMin + boundaryZMax) / 2;
                const newLookAt = new THREE.Vector3(centerX, 0, centerZ);
                setGameOverLookAtTarget(newLookAt); // Update state

                const largestDim = Math.max(width, height);
                const fovRad = camera.fov * (Math.PI / 180);
                let reqHeight = (Math.tan(fovRad / 2) > epsilon) ? (largestDim / 1.8) / Math.tan(fovRad / 2) : 10;
                const initialTargetHeight = Math.max(baseCameraHeight + 5, reqHeight * 1.2);
                const newTargetPos = new THREE.Vector3(centerX + 0.01, initialTargetHeight, centerZ);
                setGameOverCameraTargetPosition(newTargetPos); // Update state

                // Calculate initial offset based on the new target and lookAt
                const initialOffset = newTargetPos.clone().sub(newLookAt);
                setGameOverCameraOffset(initialOffset); // Update state

                setIsGameOverCameraActive(true); // Activate the logic
            }
            showGameOverMessage(winner); // Pass the winner code
        } else {
            // Optionally hide message if conditions aren't met (e.g., during the delay)
            if (gameOverTextElement) gameOverTextElement.style.display = 'none';
        }
    } else {
        // Ensure message is hidden if game is not over
        if (gameOverTextElement) gameOverTextElement.style.display = 'none';
    }
    // --- END SHOW GAME OVER MESSAGE LOGIC --- 

    // Update Pause Indicator Visibility
    if (pauseIndicatorElement) {
        pauseIndicatorElement.style.display = isPaused ? 'block' : 'none';
    }

    // --- Visual Updates --- (Use state)
    // Lerp snake head visual positions towards target logical positions
    if (snakeHead1 && !isGameOver) {
        snakeHead1.position.lerp(snakeTargetPosition1, LERP_FACTOR);
    }
    // Lerp AIs
    aiPlayers.forEach((ai, index) => { 
        if (ai.head && !previousFrameAICollisionStatus[index]) { 
             ai.head.position.lerp(ai.targetPosition, LERP_FACTOR);
        }
    });
    // Ensure last segments are visible during MOVEMENT, not necessarily needed after game over
    // but doesn't hurt to leave it unless performance is an issue.
    if (!isGameOver) { // Only run this if game is active
       updateLastTrailSegmentsVisibility();
    }
    updateScoreDisplay(); // Update score UI text

    // 6. Update projectile positions & check hits
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i]; proj.mesh.position.addScaledVector(proj.velocity, deltaTimeSeconds); proj.life -= deltaTimeSeconds;
        let remove = false;
        // Emit trail particles
        const PARTICLE_LIMIT = 10000; // Define limit here too
        for (let p = 0; p < TRAIL_PARTICLE_COUNT_PER_FRAME; p++) {
            // --- Particle Limit Check --- <--- ADDED CHECK
            if (explosionParticles.length + allTrailParticles.length >= PARTICLE_LIMIT) {
                // console.warn(`[Projectile Trail] Particle limit (${PARTICLE_LIMIT}) reached. Skipping trail particle.`);
                break; // Stop emitting trail particles for this projectile this frame if limit reached
            }
            // ---------------------------
            const particleMesh = new THREE.Mesh(trailParticleGeometry, trailParticleMaterial.clone());
            const offset = proj.velocity.clone().normalize().multiplyScalar(-PROJECTILE_SIZE * 1.5);
            particleMesh.position.copy(proj.mesh.position).add(offset).add(new THREE.Vector3((Math.random()-0.5)*0.1, (Math.random()-0.5)*0.1, (Math.random()-0.5)*0.1));
            const pLife = TRAIL_PARTICLE_LIFE * (0.8 + Math.random() * 0.4);
            allTrailParticles.push({ mesh: particleMesh, life: pLife, initialLife: pLife }); scene.add(particleMesh);
        }
        // Check collisions with trails
        let hit = false;
        if (proj.owner === 'player') {
            // Check against all AI trails
            for (const ai of aiPlayers) {
                for (let j = ai.trailSegments.length - 1; j >= 0; j--) {
                    if (proj.mesh.position.distanceTo(ai.trailSegments[j].position) < segmentSize * 0.6) {
                        // Use the AI's specific normal trail color
                        createExplosionEffect(ai.trailSegments[j].position, ai.colors ? ai.colors.trail : P1_TRAIL_COLOR_NORMAL); 
                        scene.remove(ai.trailSegments[j]); ai.trailSegments.splice(j, 1); 
                        hit = true; break;
                    }
                }
                if (hit) break;
            }
            // ADDED: Check against player's own trail if no AI trail was hit
            if (!hit) {
                for (let j = trailSegments1.length - 1; j >= 0; j--) {
                    if (proj.mesh.position.distanceTo(trailSegments1[j].position) < segmentSize * 0.6) {
                        createExplosionEffect(trailSegments1[j].position, P1_TRAIL_COLOR_NORMAL); 
                        scene.remove(trailSegments1[j]); trailSegments1.splice(j, 1); 
                        hit = true; break;
                    }
                }
            }
        } else { // Projectile owner is an AI
            const ownerAI = aiPlayers.find(ai => ai.id === proj.owner);
            // Check against player trail
            for (let j = trailSegments1.length - 1; j >= 0; j--) {
                if (proj.mesh.position.distanceTo(trailSegments1[j].position) < segmentSize * 0.6) {
                    createExplosionEffect(trailSegments1[j].position, P1_TRAIL_COLOR_NORMAL); 
                    scene.remove(trailSegments1[j]); trailSegments1.splice(j, 1); 
                    hit = true; break;
                }
            }
            // Check against OTHER AI trails
            if (!hit) {
                for (const otherAI of aiPlayers) {
                    if (otherAI.id === proj.owner) continue; // Skip owner's trail
                    for (let j = otherAI.trailSegments.length - 1; j >= 0; j--) {
                        if (proj.mesh.position.distanceTo(otherAI.trailSegments[j].position) < segmentSize * 0.6) {
                            // Use the OTHER AI's specific normal trail color
                            createExplosionEffect(otherAI.trailSegments[j].position, otherAI.colors ? otherAI.colors.trail : P1_TRAIL_COLOR_NORMAL); 
                            scene.remove(otherAI.trailSegments[j]); otherAI.trailSegments.splice(j, 1); 
                            hit = true; break;
                        }
                    }
                    if (hit) break;
                }
            }
            // Check against OWN trail (if applicable - AI shoots own trail)
            if (!hit && ownerAI) { 
                for (let j = ownerAI.trailSegments.length - 1; j >= 0; j--) {
                    if (proj.mesh.position.distanceTo(ownerAI.trailSegments[j].position) < segmentSize * 0.6) {
                        // Use the OWNER AI's specific normal trail color
                        createExplosionEffect(ownerAI.trailSegments[j].position, ownerAI.colors ? ownerAI.colors.trail : P1_TRAIL_COLOR_NORMAL);
                        scene.remove(ownerAI.trailSegments[j]); ownerAI.trailSegments.splice(j, 1); 
                        hit = true; break;
                    }
                }
            }
        }
        // Remove projectile if hit or out of bounds/life
        if (hit) { scene.remove(proj.mesh); projectiles.splice(i, 1); continue; } 
        if (proj.life <= 0 || proj.mesh.position.x < boundaryXMin || proj.mesh.position.x > boundaryXMax || proj.mesh.position.z < boundaryZMin || proj.mesh.position.z > boundaryZMax) remove = true;
        if (remove) { scene.remove(proj.mesh); projectiles.splice(i, 1); }
    }
    
    // 7. Update visual effects (particles, text)
    // Explosion Particles
    const pushForce = 1.5, pushRadiusSq = (segmentSize * 0.7)**2;
    for (let i = explosionParticles.length - 1; i >= 0; i--) {
        const p = explosionParticles[i]; p.velocity.y += PARTICLE_GRAVITY * deltaTimeSeconds;
        // Push effect from snake heads
        if (snakeHead1 && p.mesh.position.distanceToSquared(snakeHead1.position) < pushRadiusSq) p.velocity.addScaledVector(p.mesh.position.clone().sub(snakeHead1.position).normalize(), pushForce * (1 - Math.sqrt(p.mesh.position.distanceToSquared(snakeHead1.position)) / (segmentSize*0.7)));
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
            if (ai.ammoIndicator && ai.head) { 
                ai.ammoIndicator.position.copy(ai.head.position).y += segmentSize * 0.7;
                ai.ammoIndicator.lookAt(indicatorLookTarget); // Now accessible
            }
        });
    } else if (isGameOver && !isGameOverCameraActive && (playerLostTime !== null || aiDefeatedTime !== null) && snakeTargetPosition1 && camera) {
        
        // Calculate target zoom (Level 3 equivalent)
        const TARGET_DEATH_ZOOM = 1 + (3 * 0.8); // 3.4
        // Smoothly interpolate the deathZoomFactor
        const currentDeathZoom = THREE.MathUtils.lerp(deathZoomFactor, TARGET_DEATH_ZOOM, 0.015); // Slow lerp factor
        setDeathZoomFactor(currentDeathZoom);

        // Calculate camera height/distance using the interpolated death zoom
        const camHeight = baseCameraHeight * currentDeathZoom;
        const camDist = baseCameraDistance * currentDeathZoom;
        
        // Use the rest of the normal camera follow logic
        let camTargetPos, lookAtLerpTarget;
        let focusPoint = snakeHead1 ? snakeHead1.position : snakeTargetPosition1; 
        if (isLookingBack) {
            cameraOffset.copy(snakeDirection1).multiplyScalar(+camDist).y = camHeight;
            camTargetPos = focusPoint.clone().add(cameraOffset);
            lookAtLerpTarget = focusPoint; 
        } else {
            cameraOffset.copy(snakeDirection1).multiplyScalar(-camDist).y = camHeight;
            camTargetPos = focusPoint.clone().add(cameraOffset);
            lookAtLerpTarget = focusPoint; 
        }
        // Use normal cameraLag during the delay
        camera.position.lerp(camTargetPos, cameraLag); 
        targetLookAt.lerp(lookAtLerpTarget, cameraLag);
        camera.lookAt(targetLookAt);
    } else if (isGameOverCameraActive && camera) {
        // Game Over Camera Logic (drag, pan, zoom)
        const desiredPosition = gameOverLookAtTarget.clone().add(gameOverCameraOffset);
        if (isDraggingCamera || isPanningCamera) { 
            camera.position.copy(desiredPosition);
        } else {
            camera.position.lerp(desiredPosition, gameOverCameraLag);
        }
        if (isDraggingCamera || isPanningCamera) { 
            gameOverLerpedLookAtTarget.copy(gameOverLookAtTarget); 
        } else {
            gameOverLerpedLookAtTarget.lerp(gameOverLookAtTarget, gameOverCameraLag); 
        }
        camera.up.set(0, 1, 0);
        camera.lookAt(gameOverLerpedLookAtTarget); 
    } else if (!gameActive && camera) {
         // Added: Handle camera for Opening Screen / Pre-Game Start
         // Position camera slightly above and behind the starting position, looking at it
         const startPos = snakeTargetPosition1; // Player 1 start position
         const startDir = snakeDirection1; // Initial direction
         
         const initialCamDistance = cameraDistanceBehind * 1.2; // Slightly further back
         const initialCamHeight = cameraHeight * 1.1; // Slightly higher
         
         cameraOffset.copy(startDir).multiplyScalar(-initialCamDistance);
         cameraOffset.y = initialCamHeight;
         cameraTargetPosition.copy(startPos).add(cameraOffset);
         targetLookAt.copy(startPos);
         
         // Use faster lerp initially or just set position?
         // camera.position.copy(cameraTargetPosition); // Jump to position
         camera.position.lerp(cameraTargetPosition, cameraLag * 2); // Faster lerp
         camera.lookAt(targetLookAt);
    }

    // 9. Render the scene
    if(renderer && scene && camera) renderer.render(scene, camera);
} 