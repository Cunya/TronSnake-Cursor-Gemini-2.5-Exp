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
    // State Setters
    setSpeedBoostActiveP1, setIsGameOver, setWinner, setTopScore, setLastFrameTime, setLastUpdateTimeP1,
    setScoreP1, setSpeedLevelP1,
    setIsZoomedOutP1, setZoomLevelP1, setIsSparseTrailActiveP1, setSparseLevelP1,
    setTrailCounterP1,
    setLastTrailSegment1
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
    AMMO_COLOR // <-- Import AMMO_COLOR for explosion
} from './constants.js';
import { snapToGridCenter } from './utils.js';
import { updateAllAIPlayers } from './ai.js';
import { checkPlayerPickupCollisions, checkAIPickupCollisions, checkUnlocks } from './pickups.js';
import { 
    createTrailSegment, updateLastTrailSegmentsVisibility, revertHeadColors, setHeadColorToRed, 
    createExplosionEffect, updateAmmoIndicatorP1, updateAmmoIndicatorAI 
} from './visuals.js';
import { showGameOverMessage, updateScoreDisplay } from './ui.js';

// Game Over Collision Check (Internal to game loop)
// Returns object: { winnerCode: 0|1|2|3, p1Lost: bool, aiLostStatus: bool[] }
function checkCollisions() {
    let p1Lost = false;
    let aiLostStatus = aiPlayers.map(() => false); // Track loss status for each AI
    const collisionThreshold = segmentSize * 0.45; // Increased threshold for wall hits
    
    // Use LOGICAL positions for checks
    const logicalHeadPos = snakeTargetPosition1; // Player's logical position
    const aiLogicalPositions = aiPlayers.map(ai => ai.targetPosition); // Array of AI logical positions

    // --- Add Logging Before Player Checks ---
    if (logicalHeadPos) {
        // console.log(`[Pre-Check] Player logicalHeadPos: (${logicalHeadPos.x.toFixed(1)}, ${logicalHeadPos.z.toFixed(1)})`); // Commented out
    } else {
        console.log(`[Pre-Check] Player logicalHeadPos is null/undefined!`);
    }
    // console.log(`[Pre-Check] Player trailSegments1.length: ${trailSegments1?.length ?? 'undefined'}`); // Commented out
    // console.log(`[Pre-Check] Boundaries: X(${boundaryXMin?.toFixed(1)}->${boundaryXMax?.toFixed(1)}) Z(${boundaryZMin?.toFixed(1)}->${boundaryZMax?.toFixed(1)})`); // Commented out
    // --------------------------------------

    // 1. Check Player Boundaries
    if (logicalHeadPos && (logicalHeadPos.x <= boundaryXMin || logicalHeadPos.x >= boundaryXMax || logicalHeadPos.z <= boundaryZMin || logicalHeadPos.z >= boundaryZMax)) {
        console.log(`[Collision] Player boundary check (NO EPSILON): Pos=(${logicalHeadPos.x.toFixed(1)}, ${logicalHeadPos.z.toFixed(1)}) Boundaries=(${boundaryXMin.toFixed(1)}->${boundaryXMax.toFixed(1)}, ${boundaryZMin.toFixed(1)}->${boundaryZMax.toFixed(1)})`);
        p1Lost = true;
    }

    // 2. Check AI Boundaries
    for (let i = 0; i < aiPlayers.length; i++) {
        const ai = aiPlayers[i];
        const aiPos = aiLogicalPositions[i]; 
        if (!ai.head) { // Still check for missing head visual
            console.log(`[Collision] AI ${ai.id} lost: Missing head object.`);
            aiLostStatus[i] = true;
            // Use AI's current head color (or fallback to orange if material missing)
            const explosionColor = ai.material ? ai.material.color.getHex() : 0xffa500; // Orange fallback
            createExplosionEffect(aiPos ?? ai.head?.position ?? new THREE.Vector3(0,0,0), explosionColor, 3); // Reduced scale explosion
            continue;
        }
        if (!aiPos) { // Check if logical position is somehow missing (shouldn't happen)
             console.log(`[Collision] AI ${ai.id} lost: Missing targetPosition.`);
             aiLostStatus[i] = true;
             // Use AI's current head color (or fallback to orange if material missing)
             const explosionColor = ai.material ? ai.material.color.getHex() : 0xffa500; // Orange fallback
             createExplosionEffect(ai.head?.position ?? new THREE.Vector3(0,0,0), explosionColor, 3); // Reduced scale explosion
             continue;
        }
        if (aiPos.x < boundaryXMin + epsilon || aiPos.x > boundaryXMax - epsilon || aiPos.z < boundaryZMin + epsilon || aiPos.z > boundaryZMax - epsilon) {
            console.log(`[Collision] AI ${ai.id} lost: Hit boundary at (${aiPos.x.toFixed(1)}, ${aiPos.z.toFixed(1)}).`);
            aiLostStatus[i] = true;
             // Use AI's current head color (or fallback to orange if material missing)
            const explosionColor = ai.material ? ai.material.color.getHex() : 0xffa500; // Orange fallback
            createExplosionEffect(aiPos, explosionColor, 3); // Reduced scale explosion
        }
    }

    // 3. Check Head-on Collisions
    // Player vs AIs
    if (logicalHeadPos && !p1Lost) {
        for (let i = 0; i < aiPlayers.length; i++) {
            const ai = aiPlayers[i]; // Get the AI object
            const aiPos = aiLogicalPositions[i];
            if (aiPos && !aiLostStatus[i] && logicalHeadPos.distanceTo(aiPos) < collisionThreshold) {
                 console.log(`[Collision] Player lost: Head-on with AI ${ai.id}.`);
                 console.log(`[Collision] AI ${ai.id} lost: Head-on with Player.`);
                p1Lost = true;
                aiLostStatus[i] = true; // Both lose
                // Use AI's current head color (or fallback to orange if material missing)
                const explosionColor = ai.material ? ai.material.color.getHex() : 0xffa500; // Orange fallback
                createExplosionEffect(aiPos, explosionColor, 3); // Reduced scale explosion for AI
            }
        }
    }
    // AI vs AI
    for (let i = 0; i < aiPlayers.length; i++) {
        const ai_i = aiPlayers[i]; // Get AI object i
        const aiPos1 = aiLogicalPositions[i];
        if (aiLostStatus[i] || !aiPos1) continue; 
        for (let j = i + 1; j < aiPlayers.length; j++) {
            const ai_j = aiPlayers[j]; // Get AI object j
            const aiPos2 = aiLogicalPositions[j];
            if (aiLostStatus[j] || !aiPos2) continue; 
            if (aiPos1.distanceTo(aiPos2) < collisionThreshold) {
                 console.log(`[Collision] AI ${ai_i.id} lost: Head-on with AI ${ai_j.id}.`);
                 console.log(`[Collision] AI ${ai_j.id} lost: Head-on with AI ${ai_i.id}.`);
                aiLostStatus[i] = true;
                const explosionColor_i = ai_i.material ? ai_i.material.color.getHex() : 0xffa500; // Orange fallback
                createExplosionEffect(aiPos1, explosionColor_i, 3); // Reduced scale explosion for AI i
                aiLostStatus[j] = true; // Both lose
                const explosionColor_j = ai_j.material ? ai_j.material.color.getHex() : 0xffa500; // Orange fallback
                createExplosionEffect(aiPos2, explosionColor_j, 3); // Reduced scale explosion for AI j
            }
        }
    }

    // 4. Check Trail Collisions
    // Player vs All AI Trails
    if (logicalHeadPos && !p1Lost) {
        if (trailSegments1?.length > 0) { // Add check if trail exists before logging potentially large array
             // console.log(`[Pre-Check] Player trailSegments1[0].position:`, trailSegments1[0]?.position);
        }
        for (const ai of aiPlayers) {
            for (let seg of ai.trailSegments) {
                const dist = logicalHeadPos.distanceTo(seg.position);
                if (dist < segmentSize * 0.5) { 
                    console.log(`[Collision] Player vs AI Trail: PlayerPos=(${logicalHeadPos.x.toFixed(1)}, ${logicalHeadPos.z.toFixed(1)}) AISegPos=(${seg.position.x.toFixed(1)}, ${seg.position.z.toFixed(1)}) Dist=${dist.toFixed(3)} Threshold=${(segmentSize * 0.5).toFixed(3)}`);
                    p1Lost = true;
                    break;
                }
            }
            if (p1Lost) break;
        }
    }
    // Player vs Own Trail
    if (logicalHeadPos && !p1Lost) {
         const checkLength = Math.max(0, trailSegments1.length - 1); 
         if (checkLength > 0) {
            // console.log(`[Pre-Check] Checking Player vs Own Trail (${checkLength} segments)`);
         }
         for (let k = 0; k < checkLength; k++) { 
            const seg = trailSegments1[k];
            const dist = logicalHeadPos.distanceTo(seg.position);
            if (dist < segmentSize * 0.5) { 
                console.log(`[Collision] Player vs Own Trail: PlayerPos=(${logicalHeadPos.x.toFixed(1)}, ${logicalHeadPos.z.toFixed(1)}) OwnSegPos=(${seg.position.x.toFixed(1)}, ${seg.position.z.toFixed(1)}) Index=${k} Dist=${dist.toFixed(3)} Threshold=${(segmentSize * 0.5).toFixed(3)}`);
                p1Lost = true;
                break;
            }
        }
    }

    // Each AI vs All Trails (Player + AI)
    for (let i = 0; i < aiPlayers.length; i++) {
        const currentAI = aiPlayers[i];
        const currentAIPos = aiLogicalPositions[i]; 
        if (aiLostStatus[i] || !currentAIPos) continue; 
        
        // Check against player trail
        for (let seg of trailSegments1) {
             // Check distance against logical AI position
             if (currentAIPos.distanceTo(seg.position) < collisionThreshold) {
                 console.log(`[Collision] AI ${currentAI.id} lost: Hit player trail.`);
                aiLostStatus[i] = true;
                const explosionColor = currentAI.material ? currentAI.material.color.getHex() : 0xffa500; // Orange fallback
                createExplosionEffect(currentAIPos, explosionColor, 3); // Reduced scale explosion
                break;
            }
        }
        if (aiLostStatus[i]) continue; 

        // Check against other AI trails
        for (let otherAI of aiPlayers) {
            if (otherAI.id === currentAI.id) continue; 
            for (let seg of otherAI.trailSegments) {
                 // Check distance against logical AI position
                 if (currentAIPos.distanceTo(seg.position) < collisionThreshold) {
                     console.log(`[Collision] AI ${currentAI.id} lost: Hit trail of AI ${otherAI.id}.`);
                    aiLostStatus[i] = true;
                    const explosionColor = currentAI.material ? currentAI.material.color.getHex() : 0xffa500; // Orange fallback
                    createExplosionEffect(currentAIPos, explosionColor, 3); // Reduced scale explosion
                    break;
                }
            }
             if (aiLostStatus[i]) break; 
        }
        if (aiLostStatus[i]) continue;

        // Check against own trail (skipping last segment)
         const aiCheckLength = Math.max(0, currentAI.trailSegments.length - 1);
         for (let k = 0; k < aiCheckLength; k++) {
             const seg = currentAI.trailSegments[k];
             // Check distance against logical AI position
             if (currentAIPos.distanceTo(seg.position) < collisionThreshold) {
                 console.log(`[Collision] AI ${currentAI.id} lost: Hit own trail segment at index ${k}.`);
                aiLostStatus[i] = true;
                const explosionColor = currentAI.material ? currentAI.material.color.getHex() : 0xffa500; // Orange fallback
                createExplosionEffect(currentAIPos, explosionColor, 3); // Reduced scale explosion
                break;
            }
        }
    }

    // 5. Determine Winner Code (Revised Logic)
    let winnerCode = 0; // Default: Ongoing
    const currentActiveAICount = aiPlayers.filter((ai, index) => !aiLostStatus[index]).length;

    if (p1Lost) { // Player lost, game over!
        winnerCode = (currentActiveAICount > 0) ? 1 : 3; // AI wins (1) unless it's a Draw (3)
        console.log(`[Collision] Game Over (Player Lost). p1Lost=${p1Lost}, activeAICount=${currentActiveAICount}, winnerCode=${winnerCode}`);
    } else if (currentActiveAICount === 0 && gameActive) { // Player didn't lose, and no AIs left active
        winnerCode = 2; // Player wins
        console.log(`[Collision] Game Over (All AIs Lost / Player Survived). p1Lost=${p1Lost}, activeAICount=${currentActiveAICount}, winnerCode=${winnerCode}`);
    } 
    // Implicit else: game continues (winnerCode remains 0)
    
    return { winnerCode, p1Lost, aiLostStatus };
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
    // Initialize collision status for the frame (assuming no one lost yet)
    let currentFrameAICollisionStatus = aiPlayers.map(() => false);
    
    // --- Game Logic Update ---
    if (gameActive && !isGameOver) {
        // Check if paused
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
                let aiMovedStatus = aiPlayers.map(() => false); // Track movement status per AI
                aiPlayers.forEach((ai, index) => { // Add index
                    // ---> ADD Check: Only update movement if AI is not already marked as lost THIS FRAME <-----
                    if (currentFrameAICollisionStatus[index]) return; // Skip update if lost
                    
                    const intervalAI = ai.isSpeedBoostActive 
                        ? normalUpdateInterval / (1 + ai.speedLevel * SPEED_BOOST_DIMINISHING_FACTOR)
                        : normalUpdateInterval;
                    if ((currentTime - ai.lastUpdateTime) > intervalAI) {
                        ai.lastUpdateTime = currentTime - ((currentTime - ai.lastUpdateTime) % intervalAI);
                        ai.prevTargetPos.copy(ai.targetPosition);
                        let nextPos = ai.targetPosition.clone().addScaledVector(ai.direction, segmentSize);
                        ai.targetPosition.set(snapToGridCenter(nextPos.x, 'x'), 0, snapToGridCenter(nextPos.z, 'z'));
                        aiMoved = true; // Flag that *an* AI moved
                        aiMovedStatus[index] = true; // Set specific AI moved status

                        // Check pickup collision immediately after move for this specific AI
                        checkAIPickupCollisions(ai);
                    }
                });
                // Update AI logic *after* determining potential moves
                if (aiMoved) {
                     updateAllAIPlayers(); // Call the function that updates all AI decisions
                }

                // Check collisions & Handle Trails
                if (playerMoved || aiMoved) {
                    const collisionInfo = checkCollisions(); // Get detailed collision info
                    currentFrameAICollisionStatus = collisionInfo.aiLostStatus; // Store it
                    const winnerCode = collisionInfo.winnerCode;
                    if(setWinner) setWinner(winnerCode);

                    // Player Trail
                    if (playerMoved) { 
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
                        const aiMovedThisTick = aiMovedStatus[index]; // Use the tracked status

                        if (aiMovedThisTick && !collisionInfo.aiLostStatus[index]) { // Check specific AI loss status
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
                    if (winnerCode !== 0) {
                        setIsGameOver(true);
                        // Reset Boosts (already done correctly)
                        // ...
                        if (scoreP1 > topScore) {
                            setTopScore(scoreP1);
                            localStorage.setItem('tronSnakeTopScore', scoreP1.toString());
                        }
                        showGameOverMessage(winnerCode); // Pass winner code for message

                        // Set Head Colors based on detailed status
                        revertHeadColors(); // Start fresh
                        if (collisionInfo.p1Lost) {
                            setHeadColorToRed(1); // Player is owner 1
                        }
                        collisionInfo.aiLostStatus.forEach((lost, index) => {
                            if (lost) {
                                setHeadColorToRed(aiPlayers[index]); // Pass the AI object
                            }
                        });
                    }
                }
            } // End of if(gameActive && !isGameOver)
        } // End of if (!isPaused)
    } // End of if(gameActive && !isGameOver)

    // --- Visual Updates ---
    // Lerp snake head visual positions towards target logical positions
    if (snakeHead1) snakeHead1.position.lerp(snakeTargetPosition1, LERP_FACTOR);
    // Lerp AIs
    aiPlayers.forEach((ai, index) => { // Add index
        // ---> ADD Check: Only lerp if AI is not lost <--- 
        if (ai.head && !currentFrameAICollisionStatus[index]) { 
             ai.head.position.lerp(ai.targetPosition, LERP_FACTOR);
        }
    });
    updateLastTrailSegmentsVisibility(); // Ensure last segments are visible during movement
    updateScoreDisplay(); // Update score UI text

    // Update Game Over Dialog Visibility
    if (gameOverTextElement) { // Check if the element exists in state
        gameOverTextElement.style.display = isGameOver ? 'block' : 'none';
    }

    // Update Pause Indicator Visibility
    if (pauseIndicatorElement) {
        pauseIndicatorElement.style.display = isPaused ? 'block' : 'none';
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
        aiPlayers.forEach(ai => {
            if (ai.ammoIndicator) { // Need to create/manage these indicators
                ai.ammoIndicator.position.copy(ai.head.position).y += segmentSize * 0.7;
                ai.ammoIndicator.lookAt(indicatorLookTarget);
            }
        });
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