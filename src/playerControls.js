import { isGameOver, gameActive, snakeDirection1, setLookingBack, setLookBackTouchId, lookBackTouchId, setGameActive, openingDialogElement, lastUpdateTimeP1, setLastUpdateTimeP1, isPaused, setIsPaused, gameOverTextElement,
    isDraggingCamera, setIsDraggingCamera,
    lastPointerX, setLastPointerX,
    lastPointerY, setLastPointerY,
    gameOverCameraOffset, setGameOverCameraOffset,
    gameOverLookAtTarget, setGameOverLookAtTarget,
    camera,
    isInitialDragMove, setIsInitialDragMove,
    isPanningCamera, setIsPanningCamera,
    aiPlayers,
    scorePickups, expansionPickups, clearPickups, zoomPickups, sparseTrailPickups, multiSpawnPickups, addAiPickups, ammoPickups,
    scene,
    gridMesh
} from './state.js';
import { yAxis, CAMERA_ROTATION_SPEED, CAMERA_PANNING_SPEED, CAMERA_ZOOM_SPEED, MIN_ZOOM_DISTANCE, MAX_ZOOM_DISTANCE, GAME_VERSION, segmentSize, sparseTrailMaterial } from './constants.js';
import { resetGame, createAISpawnRingEffect } from './init.js';
import { shootProjectile } from './projectile.js';
import { createPickupSpawnEffect } from './visuals.js';
import * as THREE from 'three';
import { MathUtils } from 'three';
import { removeGameOverPointerListeners } from './ui.js';

// Temporary placeholders for imports
// REMOVED: let resetGame = () => console.warn('resetGame not imported yet');
// REMOVED: let shootProjectile = () => console.warn('shootProjectile not imported yet');

// Start Game (Called by first click/touch)
export function startGame() {
    if (gameActive) return; // Prevent starting multiple times
    setGameActive(true);
    if(openingDialogElement) openingDialogElement.style.display = 'none';
    // lastUpdateTimeP1 = performance.now(); // Reset P1 timer - Needs setter
    // lastUpdateTimeAI = performance.now(); // Reset AI timer - Needs setter
    
    // --- <<< ADD: Trigger Deferred Visuals >>> ---
    const now = performance.now();

    // Trigger AI Spawn Effects
    aiPlayers.forEach(ai => {
        if (ai.needsSpawnEffect) {
            ai.spawnStartTime = now; // Reset spawn timer
            const effectPosition = ai.targetPosition.clone(); // Use current target position
            const markerCenterY = -segmentSize / 2 + 0.01; 
            effectPosition.y = markerCenterY;
            createAISpawnRingEffect(effectPosition, ai.colors ? ai.colors.normal : 0xffffff); // Use AI color or fallback
            ai.needsSpawnEffect = false; // Mark as done
            // console.log(`[startGame] Triggered spawn effect for AI ${ai.id}`); // <<< COMMENTED OUT
        }
    });

    // Trigger Pickup Fade-Ins and Spawn Particle Effects
    const allPickupArrays = [scorePickups, expansionPickups, clearPickups, zoomPickups, sparseTrailPickups, multiSpawnPickups, addAiPickups, ammoPickups];
    allPickupArrays.forEach(arr => {
        arr.forEach(pickup => {
            // Start Fade-in
            if (pickup.needsFadeIn) {
                pickup.isSpawning = true;
                pickup.spawnStartTime = now;
                pickup.needsFadeIn = false;
            }
            // Create Spawn Particle Effect
            if (pickup.needsSpawnParticles) {
                const effectColor = pickup.material ? pickup.material.color : sparseTrailMaterial.color; // Use pickup color or fallback
                createPickupSpawnEffect(pickup.position, effectColor);
                pickup.needsSpawnParticles = false;
            }
        });
    });
    // console.log(`[startGame] Deferred visual effects triggered.`); // <<< COMMENTED OUT
    // --- <<< END Trigger Deferred Visuals >>> ---
    
    // Remove the initial interaction listeners once the game starts
    window.removeEventListener('click', handleFirstClick);
}

// Use named function for easier removal
export function handleFirstClick() {
    startGame();
}

export function onKeyDown(event) {
    // Log the key press
    // console.log(`[Input] KeyDown: ${event.key}`); // Commented out

    // MODIFIED: Allow restart if game is over, regardless of UI state
    if (isGameOver) { 
        // Any key press (except modifiers maybe) restarts if game is over
        resetGame();
        return;
    }

    // Handle Pause Toggle (Escape key)
    if (event.key === 'Escape' && gameActive && !isGameOver) {
        setIsPaused(!isPaused); // Toggle pause state
        console.log("Pause Toggled: ", isPaused);
        event.preventDefault(); // Prevent any default browser behavior for Escape
        return;
    }

    // If paused OR game over, don't process other game inputs
    if (isPaused || isGameOver) {
        return;
    }

    // Add check: If game is not active, start it on first key press
    if (!gameActive) {
        startGame();
        return; // First key press only starts the game
    }

    // If we reach here, gameActive is true and not paused and not game over
    switch (event.key) {
        case 'ArrowLeft':
            snakeDirection1.applyAxisAngle(yAxis, Math.PI / 2);
            break;
        case 'ArrowRight':
            snakeDirection1.applyAxisAngle(yAxis, -Math.PI / 2);
            break;
        case ' ': // Spacebar
            event.preventDefault(); 
            shootProjectile(); // <<< RE-ENABLED
            break;
        case 'ArrowDown':
            event.preventDefault(); 
            setLookingBack(true);
            break;
    }
}

export function onKeyUp(event) {
    // ADDED: If game is over or paused, ignore key up
    if (isGameOver || isPaused) {
        return;
    }
    // END ADDED
    if (event.key === 'ArrowDown') {
        setLookingBack(false);
    }
}

export function onTouchStart(event) {
    // --- Check for Game Over Camera Drag First ---
    if (isGameOver) {
        // If game is over, check the touch target.
        // If it's the game over dialog, restart the game.
        // Otherwise, initiate potential camera drag.
        if (gameOverTextElement && gameOverTextElement.contains(event.target)) {
            // Tapped on the game over dialog - restart the game
            resetGame();
        } else if (event.target !== gameOverTextElement) {
            // Tapped outside the dialog - initiate camera drag
             handleGameOverPointerDown(event.changedTouches[0].clientX, event.changedTouches[0].clientY, event);
        }
        // Prevent further processing like starting game or player controls in either game over case
        return; 
    }
    // --- End Game Over Check ---

    if (!gameActive) {
        // If game not active BUT not game over, treat as start trigger
        // This handles the initial touch start before gameActive is true
        startGame(); 
        // We might still want to process the *action* of this first touch below
        // return; // Decide if first touch ONLY starts or also acts
        return; // <-- ADD THIS RETURN to ensure first touch only starts the game
    }
    
    event.preventDefault(); 

    const lookBackZoneHeight = window.innerHeight / 3; 
    const shootZoneHeight = window.innerHeight / 3;    
    const turnZoneWidth = window.innerWidth / 2;

    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        const touchX = touch.clientX;
        const touchY = touch.clientY;

        if (touchY < shootZoneHeight) {
            shootProjectile(); // <<< RE-ENABLED
        } else if (touchY > window.innerHeight - lookBackZoneHeight) {
            if (lookBackTouchId === null) { 
                setLookingBack(true);
                setLookBackTouchId(touch.identifier);
            }
        } else {
            if (touchX < turnZoneWidth) {
                snakeDirection1.applyAxisAngle(yAxis, Math.PI / 2);
            } else {
                snakeDirection1.applyAxisAngle(yAxis, -Math.PI / 2);
            }
        }
    }
}

export function onTouchEnd(event) {
    // --- Check for Game Over Camera Drag --- 
    if (isGameOver && isDraggingCamera) {
        handleGameOverPointerUp(event);
        return; // Prevent look back logic etc.
    }
    // --- End Game Over Check --- 

    if (!gameActive) return; 
    event.preventDefault();

    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        if (touch.identifier === lookBackTouchId) {
            setLookingBack(false);
            setLookBackTouchId(null); 
            break; 
        }
    }
}

// --- NEW: Game Over Camera Control Handlers ---

// Helper to get pointer coordinates consistently
function getPointerCoords(event) {
    if (event.touches && event.touches.length > 0) {
        return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    } else if (event.changedTouches && event.changedTouches.length > 0) {
        // Use changedTouches for touchend/touchcancel
        return { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
    }
    return { x: event.clientX, y: event.clientY }; // Mouse fallback
}

// --- Panning Logic --- 
function panCamera(deltaX, deltaY) {
    if (!camera) return;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);

    // Project forward vector onto the XZ plane (ground)
    const forwardOnPlane = new THREE.Vector3(forward.x, 0, forward.z).normalize();
    
    // Calculate the right vector (already parallel to XZ plane)
    const right = new THREE.Vector3().crossVectors(camera.up, forward).normalize(); // camera.up is (0,1,0)

    // Calculate movement based on deltas and vectors
    // Panning right (positive deltaX) moves along the right vector
    // Panning 'up' on screen (negative deltaY) should now move BACKWARDS along the forwardOnPlane vector
    const moveX = right.multiplyScalar(deltaX * CAMERA_PANNING_SPEED);
    const moveZ = forwardOnPlane.multiplyScalar(deltaY * CAMERA_PANNING_SPEED);
    const totalMove = moveX.add(moveZ);

    // Update the look-at target
    const newTarget = gameOverLookAtTarget.clone().add(totalMove);
    setGameOverLookAtTarget(newTarget); // Use the imported setter
    // console.log(`[${GAME_VERSION}] Panning Target: (${newTarget.x.toFixed(2)}, ${newTarget.y.toFixed(2)}, ${newTarget.z.toFixed(2)})`); // Debug Log
}

// --- Zooming Logic --- 
export function handleGameOverWheel(event) {
    console.log(`[${GAME_VERSION}] handleGameOverWheel Fired`); // Keep: Function called
    if (!isGameOver || !camera) {
        console.log(`[${GAME_VERSION}] Zoom Exit: isGameOver=${isGameOver}, camera=${!!camera}`); // Keep: Early exit reason
        return;
    }
    event.preventDefault();
    const currentOffset = gameOverCameraOffset.clone(); 
    const currentDistance = currentOffset.length();
    const scrollAmount = event.deltaY;
    console.log(`[${GAME_VERSION}] Zoom - Scroll DeltaY: ${scrollAmount}`); // Keep: Scroll amount
    const zoomFactor = scrollAmount > 0 ? (1 + CAMERA_ZOOM_SPEED) : (1 - CAMERA_ZOOM_SPEED);
    console.log(`[${GAME_VERSION}] Zoom - Factor: ${zoomFactor.toFixed(3)}`); // Keep: Zoom factor
    let newDistance = currentDistance * zoomFactor;
    newDistance = MathUtils.clamp(newDistance, MIN_ZOOM_DISTANCE, MAX_ZOOM_DISTANCE);
    console.log(`[${GAME_VERSION}] Zoom - Current Dist: ${currentDistance.toFixed(2)}, New Dist: ${newDistance.toFixed(2)}`); // Keep: Distances
    const newOffset = currentOffset.setLength(newDistance); 
    console.log(`[${GAME_VERSION}] Zoom - Old Offset: (${gameOverCameraOffset.x.toFixed(2)}, ${gameOverCameraOffset.y.toFixed(2)}, ${gameOverCameraOffset.z.toFixed(2)})`); // Keep: Old offset
    console.log(`[${GAME_VERSION}] Zoom - New Offset: (${newOffset.x.toFixed(2)}, ${newOffset.y.toFixed(2)}, ${newOffset.z.toFixed(2)})`); // Keep: New offset
    setGameOverCameraOffset(newOffset);
    console.log(`[${GAME_VERSION}] Zoom - Offset Set in State`); // Keep: Confirmation
}

export function handleGameOverPointerDown(clientX, clientY, event) {
    if (!isGameOver) return;
    if(event) event.preventDefault(); 
    setLastPointerX(clientX);
    setLastPointerY(clientY);
    let addListeners = false;
    // Left Mouse Button (or Touch) for Rotation
    if (event.type === 'touchstart' || event.button === 0) { 
        setIsDraggingCamera(true);
        setIsInitialDragMove(true); 
        // console.log(`[${GAME_VERSION}] Pointer Down (Rotation) - Set isInitialDragMove = true`); // Commented out - Redundant
        console.log(`[${GAME_VERSION}] Pointer Down (Rotation)`); // Keep basic log
        addListeners = true;
    } 
    // Middle Mouse Button for Panning
    else if (event.button === 1) { 
        setIsPanningCamera(true);
        console.log(`[${GAME_VERSION}] Pointer Down (Panning)`); // Keep basic log
        addListeners = true;
    }
    if (addListeners) {
        window.addEventListener('mousemove', handleGameOverPointerMove);
        window.addEventListener('mouseup', handleGameOverPointerUp);
        window.addEventListener('touchmove', handleGameOverPointerMove, { passive: false }); 
        window.addEventListener('touchend', handleGameOverPointerUp);
        window.addEventListener('touchcancel', handleGameOverPointerUp);
    }
}

export function handleGameOverPointerMove(event) {
    if (!isGameOver || (!isDraggingCamera && !isPanningCamera)) return;
    if(event.cancelable) event.preventDefault();
    const coords = getPointerCoords(event);
    const deltaX = coords.x - lastPointerX;
    const deltaY = coords.y - lastPointerY;
    setLastPointerX(coords.x);
    setLastPointerY(coords.y);

    // Panning Logic
    if (isPanningCamera) {
        panCamera(deltaX, deltaY);
    }
    // Rotation Logic (Existing)
    else if (isDraggingCamera) {
        // console.log(`[${GAME_VERSION}] Move Start (Rotation) - Current isInitialDragMove = ${isInitialDragMove}`); // Commented out
        // console.log(`[${GAME_VERSION}] Move - DeltaX: ${deltaX.toFixed(2)}, DeltaY: ${deltaY.toFixed(2)}`); // Commented out

        if (!camera) {
            console.error(`[${GAME_VERSION}] Camera not found in handleGameOverPointerMove`); // Keep Errors
            return;
        }

        const currentOffset = gameOverCameraOffset.clone();
        // console.log(`[${GAME_VERSION}]   Initial Offset: (${currentOffset.x.toFixed(2)}, ${currentOffset.y.toFixed(2)}, ${currentOffset.z.toFixed(2)})`); // Commented out
        
        const yawAngle = -deltaX * CAMERA_ROTATION_SPEED;
        const yawQuaternion = new THREE.Quaternion().setFromAxisAngle(yAxis, yawAngle);
        const yawedOffset = currentOffset.clone().applyQuaternion(yawQuaternion);
        // console.log(`[${GAME_VERSION}]   Yaw Angle: ${yawAngle.toFixed(4)} -> Yawed Offset: (${yawedOffset.x.toFixed(2)}, ${yawedOffset.y.toFixed(2)}, ${yawedOffset.z.toFixed(2)})`); // Commented out

        const pitchAngle = -deltaY * CAMERA_ROTATION_SPEED;
        const rightVector = new THREE.Vector3();
        camera.getWorldDirection(rightVector); 
        rightVector.cross(camera.up);
        rightVector.normalize();
        if (rightVector.lengthSq() < 0.001) { 
            console.warn(`[${GAME_VERSION}] Pitch rotation axis issue: Using fallback right vector.`); // Keep Warnings
            rightVector.set(1, 0, 0).applyQuaternion(yawQuaternion);
        }
        // console.log(`[${GAME_VERSION}]   Pitch Angle: ${pitchAngle.toFixed(4)}, Right Vector: (${rightVector.x.toFixed(2)}, ${rightVector.y.toFixed(2)}, ${rightVector.z.toFixed(2)})`); // Commented out
        // console.log(`[${GAME_VERSION}]   Camera Up: (${camera.up.x.toFixed(2)}, ${camera.up.y.toFixed(2)}, ${camera.up.z.toFixed(2)})`); // Commented out

        const pitchQuaternion = new THREE.Quaternion().setFromAxisAngle(rightVector, pitchAngle);
        const potentialNewOffset = yawedOffset.clone().applyQuaternion(pitchQuaternion);
        // console.log(`[${GAME_VERSION}]   Potential Offset (Yaw+Pitch): (${potentialNewOffset.x.toFixed(2)}, ${potentialNewOffset.y.toFixed(2)}, ${potentialNewOffset.z.toFixed(2)})`); // Commented out

        const normalizedPotentialOffset = potentialNewOffset.clone().normalize();
        const minY = Math.sin(0.17); 
        const maxY = Math.sin(Math.PI / 2 - 0.17); 
        // console.log(`[${GAME_VERSION}]   Normalized Y: ${normalizedPotentialOffset.y.toFixed(3)} (Limits: ${minY.toFixed(3)} - ${maxY.toFixed(3)})`); // Commented out

        let finalOffset;
        if (isInitialDragMove || (normalizedPotentialOffset.y > minY && normalizedPotentialOffset.y < maxY)) {
            finalOffset = potentialNewOffset;
            // console.log(`[${GAME_VERSION}]   Pitch Applied (Y limits OK or Initial Move).`); // Commented out
        } else {
            finalOffset = yawedOffset;
            // console.log(`[${GAME_VERSION}]   Pitch Angle Limit Hit (Y limits), using yawed offset only.`); // Commented out
        }

        // console.log(`[${GAME_VERSION}]   Setting Offset: (${finalOffset.x.toFixed(2)}, ${finalOffset.y.toFixed(2)}, ${finalOffset.z.toFixed(2)})`); // Commented out
        setGameOverCameraOffset(finalOffset);
    }
}

// --- NEW: Separate function for listener cleanup ---
export function cleanupGameOverListeners() {
    console.log(`[${GAME_VERSION}] cleanupGameOverListeners called`); // Keep
    window.removeEventListener('mousemove', handleGameOverPointerMove);
    window.removeEventListener('mouseup', handleGameOverPointerUp);
    window.removeEventListener('touchmove', handleGameOverPointerMove);
    window.removeEventListener('touchend', handleGameOverPointerUp);
    window.removeEventListener('touchcancel', handleGameOverPointerUp);
}

export function handleGameOverPointerUp(event) {
    if (!event) {
        console.warn(`[${GAME_VERSION}] handleGameOverPointerUp called without event.`); // Keep warning
        return;
    }
    if (!isGameOver) return;
    let stateChanged = false;
    if (event.type === 'touchend' || event.type === 'touchcancel') {
        if (isDraggingCamera) {
            setIsDraggingCamera(false);
            setIsInitialDragMove(false); 
            console.log(`[${GAME_VERSION}] Touch Up (Rotation) - State updated`); // Keep
            stateChanged = true;
        }
    } else if (event.type === 'mouseup') {
        if (event.button === 0 && isDraggingCamera) {
            setIsDraggingCamera(false);
            setIsInitialDragMove(false); 
            console.log(`[${GAME_VERSION}] Mouse Up Left (Rotation) - State updated`); // Keep
            stateChanged = true;
        } else if (event.button === 1 && isPanningCamera) {
            setIsPanningCamera(false);
            console.log(`[${GAME_VERSION}] Mouse Up Middle (Panning) - State updated`); // Keep
            stateChanged = true;
        }
    }
    if (stateChanged && !isDraggingCamera && !isPanningCamera) {
         cleanupGameOverListeners(); 
    }
}

// <<< ADDED: Debug Click Handler >>>
export function handleDebugClick(event) {
    // We don't preventDefault or check gameActive, so this runs alongside other click logic
    // console.log("--- Debug Click Detected ---"); // Optional: uncomment if needed

    if (!camera || !scene) {
        console.warn("[Debug Click] Camera or Scene not available yet.");
        return;
    }

    const mouse = new THREE.Vector2();
    // Calculate normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const allIntersects = raycaster.intersectObjects(scene.children, true); // true for recursive

    // Filter out intersections with the gridMesh
    const validIntersects = allIntersects.filter(intersect => intersect.object !== gridMesh);

    if (validIntersects.length > 0) {
        const intersect = validIntersects[0]; // Closest non-grid object
        const object = intersect.object;

        console.groupCollapsed("--- Debug Click Info --- Object Found ---"); // Group logs
        console.log("Object:", object);
        console.log(`  UUID: ${object.uuid}`);
        console.log(`  Name: ${object.name || '(no name)'}`);
        console.log(`  Type: ${object.type}`);
        console.log(`  Position: (${object.position.x.toFixed(2)}, ${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)})`);
        console.log(`  Visible: ${object.visible}`);
        console.log(`  UserData:`, JSON.parse(JSON.stringify(object.userData))); // Deep copy for logging

        if (object.material) {
            console.log("  Material Info:");
            console.log(`    UUID: ${object.material.uuid}`);
            if (object.material.color) {
                console.log(`    Color: #${object.material.color.getHexString()}`);
            } else {
                console.log("    Color: (material has no color property)");
            }
            console.log(`    Opacity: ${object.material.opacity}`);
            console.log(`    Transparent: ${object.material.transparent}`);
        } else {
            console.log("  Material Info: (no material)");
        }
        console.log("  Intersection Point: (%f, %f, %f)", intersect.point.x.toFixed(2), intersect.point.y.toFixed(2), intersect.point.z.toFixed(2));
        console.log("  Distance from Camera: %f", intersect.distance.toFixed(2));
        console.groupEnd();

    } else {
        console.log("--- Debug Click Info --- Clicked empty space or only grid --- "); // Modified message
    }
}
// <<< END ADDED >>>

// We need to ensure the *initial* listeners ('mousedown', 'touchstart') are added
// when the game over screen appears and removed when the game resets.
// This should be handled in ui.js showGameOverMessage and init.js resetGame.

// We will modify ui.js and init.js later to add/remove the initial 'down' listeners. 