import { 
    topScore, topScoreAtGameStart, gameActive, isGameOver, winner, scoreP1, unlockedScoresThisGame, 
    gameOverTextElement, versionTextElement, openingDialogElement, scoreTextElement, topScoreTextElement,
    pauseIndicatorElement, renderer, camera, // Import camera needed for middle mouse pan calc
    // Import state needed for initial offset calculation
    gameOverLookAtTarget, gameOverCameraTargetPosition, setGameOverCameraOffset,
    setOpeningDialogElement, setGameOverTextElement, setVersionTextElement, setScoreTextElement, setTopScoreTextElement,
    setPauseIndicatorElement,
    // Setters for camera drag/pan state
    setIsDraggingCamera, setLastPointerX, setLastPointerY, 
    lastPointerX, lastPointerY, // ADDED Imports for state variables
    isDraggingCamera, isPanningCamera, // ADDED Imports for state variables
    isInitialDragMove, // ADDED Import for state variable
    gameOverCameraOffset, setGameOverCameraTargetPosition,
    setGameOverLookAtTarget, setIsInitialDragMove,
    setIsPanningCamera
} from './state.js';
import { GAME_VERSION } from './constants.js';
// Import the handler function
import { handleGameOverPointerDown, handleGameOverWheel } from './playerControls.js';
import * as THREE from 'three'; // Need THREE for Vector3 subtraction
import { resetGame } from './init.js';

// Add new state for dialog minimization
let isGameOverDialogMinimized = false;

// ADDED: Function to reset the internal minimized state
export function resetGameOverDialogState() {
    console.log("[UI] Resetting isGameOverDialogMinimized to false.");
    isGameOverDialogMinimized = false;
}

// Helper Function for Unlock Status Text
export function getUnlockStatusText(currentTopScore) {
    // Pickup descriptions (could be moved to constants eventually)
    const pickups = [
        { name: "Zoom Out", color: "#0088ff", type: "Blue Cube", score: 0, desc: "Grants 20 pts. Briefly zooms out player camera." },
        { name: "Speed Up", color: "#ff00ff", type: "Pink Cube", score: 50, desc: "Grants 40 pts. Temporary speed boost." },
        { name: "Sparse Trail", color: "#ffff00", type: "Yellow Blocks", score: 200, desc: "Grants 60 pts. Leave gaps in your trail." },
        { name: "Ammo", color: "#ffa500", type: "Orange Sphere", score: 300, desc: "Grants 80 pts. Allows player to shoot trails (Spacebar). (Spawns every 10 pickups)" },
        { name: "Clear Walls", color: "#ffffff", type: "White Cube", score: 500, desc: "Grants 100 pts. Removes walls. (Spawns every 5 pickups)", spawnCondition: "counter", counterThreshold: 5 },
        { name: "More Players", color: "#888888", type: "Gray Octahedron", score: 1000, desc: "Grants 125 pts. Spawns a new AI opponent. (Spawns every 20 pickups)", spawnCondition: "counter", counterThreshold: 20 },
        { name: "Expand", color: "#00ff00", type: "Green Cube", score: 1500, desc: "Grants 150 pts. Expands play area. (Spawns every 15 pickups)", spawnCondition: "counter", counterThreshold: 15 },
        { name: "More", color: "#9900ff", type: "Purple Gems", score: 2000, desc: "Grants 200 pts. Increases max pickups & spawns 2 others. (Spawns every 15 pickups)" }
    ];

    let unlockedHTML = '<h3 style="font-size: clamp(18px, 3vw, 22px); margin-bottom: 10px; margin-top: 20px; color: #dddddd;">Unlocked Powerups:</h3>';
    let nextUnlockScore = Infinity;
    let allUnlocked = true;

    pickups.forEach(p => {
        if (currentTopScore >= p.score) {
            unlockedHTML += `<p style="margin-bottom: 10px; font-size: 18px;"><strong style="color: ${p.color};">${p.name} (${p.type}):</strong> ${p.desc}</p>`;
        } else {
            allUnlocked = false;
            if (p.score < nextUnlockScore) {
                nextUnlockScore = p.score;
            }
        }
    });

    if (unlockedHTML.includes('<p style') === false) {
        unlockedHTML += '<p style="font-size: 18px; color: #cccccc;">None yet!</p>';
    }

    let nextUnlockMsg = "";
    if (allUnlocked) {
        nextUnlockMsg = `<p style="margin-top: 20px; font-size: 18px; color: #aaffaa;">All powerups unlocked!</p>`;
    } else {
        nextUnlockMsg = `<p style="margin-top: 20px; font-size: 18px; color: #aaaaff;">Next powerup unlocks at ${nextUnlockScore} points (Top Score)!</p>`;
    }

    let controlsText =
        `<div style="margin-top: 20px; border-top: 1px solid #555; padding-top: 15px;">` +
        `<h4 style="font-size: 18px; margin-bottom: 8px; color: #cccccc;">Controls:</h4>` +
        `<p style="font-size: 16px; margin-bottom: 5px;">Arrows: Left/Right (Turn), Down (Look Back)</p>` +
        `<p style="font-size: 16px; margin-bottom: 5px;">Touch: Left/Right Side (Turn), Bottom (Look Back)</p>` +
        `<p style="font-size: 16px; margin-bottom: 5px;">Shoot: Spacebar / Top Touch Zone</p>` +
        `</div>`;

    return { unlockedHTML, nextUnlockMsg, controlsText };
}

// Create Opening Dialog (Called from init)
export function createOpeningDialog() {
    // Needs state.openingDialogElement and setter
    let dialogElement = openingDialogElement;
    if (!dialogElement) {
        dialogElement = document.createElement('div');
        dialogElement.style.position = 'absolute';
        dialogElement.style.top = '50%';
        dialogElement.style.left = '50%';
        dialogElement.style.width = 'clamp(300px, 90vw, 600px)';
        dialogElement.style.transform = 'translate(-50%, -50%)';
        dialogElement.style.color = 'white';
        dialogElement.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        dialogElement.style.padding = 'clamp(15px, 4vw, 30px) clamp(20px, 5vw, 50px)';
        dialogElement.style.borderRadius = '10px';
        dialogElement.style.border = '2px solid rgba(255, 255, 255, 0.6)';
        dialogElement.style.fontSize = 'clamp(16px, 3vw, 24px)';
        dialogElement.style.fontFamily = 'Arial, sans-serif';
        dialogElement.style.textShadow = '1px 1px 3px #000000';
        dialogElement.style.textAlign = 'center';
        dialogElement.style.cursor = 'pointer';
        dialogElement.style.maxHeight = '80vh';
        dialogElement.style.overflowY = 'auto';
        document.body.appendChild(dialogElement);
        // Need state.setOpeningDialogElement(dialogElement);
        setOpeningDialogElement(dialogElement);
    }

    const unlockStatus = getUnlockStatusText(topScore);

    let dialogHTML =
        `<h2 style="font-size: clamp(24px, 5vw, 32px); margin-top: 0; margin-bottom: 15px; color: #00ffff;">Powerup Tron</h2>` +
        `<p style="font-size: clamp(16px, 3vw, 20px); margin-bottom: 20px;">Collect points to unlock exciting powerups and dominate the arena!</p>` +
        unlockStatus.unlockedHTML +
        unlockStatus.nextUnlockMsg +
        unlockStatus.controlsText +
        `<p style="margin-top: 25px; font-size: clamp(14px, 2.5vw, 18px); color: #cccccc;">(Click, Touch, or Press Any Key to Start)</p>`;

    dialogElement.innerHTML = dialogHTML;
    dialogElement.style.display = 'block';
}

// Create Game Over Text Element (Called from init)
export function createGameOverText() {
    // Needs state.gameOverTextElement and setter
    let element = gameOverTextElement;
    if (!element) {
        element = document.createElement('div');
        element.id = 'gameOverDialog'; // Add an ID for easier styling/selection
        element.style.position = 'absolute';
        element.style.top = '50%';
        element.style.left = '50%';
        element.style.width = 'clamp(300px, 90vw, 700px)';
        element.style.transform = 'translate(-50%, -50%)';
        element.style.color = 'white';
        element.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
        element.style.padding = 'clamp(15px, 4vw, 20px) clamp(20px, 5vw, 40px)';
        element.style.borderRadius = '10px';
        element.style.border = '2px solid rgba(255, 255, 255, 0.5)';
        element.style.fontSize = 'clamp(28px, 6vw, 48px)'; // Base font size for title
        element.style.fontFamily = 'Arial, sans-serif';
        element.style.textShadow = '2px 2px 4px #000000';
        element.style.textAlign = 'center';
        element.style.maxHeight = '85vh'; // Keep max height
        element.style.overflowY = 'hidden'; // Start hidden, toggle to auto when maximized
        element.style.display = 'none';
        element.style.transition = 'all 0.3s ease-out'; // Add transition

        // Container for the actual content (to be shown/hidden)
        const contentContainer = document.createElement('div');
        contentContainer.id = 'gameOverContentContainer';
        element.appendChild(contentContainer); // Add content container

        // Create Minimize Toggle Button
        const minimizeButton = document.createElement('span');
        minimizeButton.id = 'gameOverMinimizeButton';
        minimizeButton.textContent = '_'; // Initial icon
        minimizeButton.style.position = 'absolute';
        minimizeButton.style.top = '5px';
        minimizeButton.style.right = '10px';
        minimizeButton.style.fontSize = '24px';
        minimizeButton.style.lineHeight = '24px';
        minimizeButton.style.cursor = 'pointer';
        minimizeButton.style.color = '#cccccc';
        minimizeButton.style.userSelect = 'none';
        minimizeButton.title = 'Minimize/Maximize Dialog';

        element.appendChild(minimizeButton); // Add button *after* container

        document.body.appendChild(element);
        setGameOverTextElement(element); // Store reference in state

        // Add the toggle listener here, only once
        minimizeButton.onclick = (event) => {
             // ADDED Console Logs for debugging
             console.log("[GameOver Minimize] Clicked!");
             // Prevent the click from bubbling up and potentially triggering restart
             event.stopPropagation(); 
             isGameOverDialogMinimized = !isGameOverDialogMinimized;
             console.log(`[GameOver Minimize] isGameOverDialogMinimized set to: ${isGameOverDialogMinimized}`);
             updateGameOverDialogAppearance();
        };
    }
}

// Create Version Text Element (Called from init)
export function createVersionText() {
    // Needs state.versionTextElement and setter
    let element = versionTextElement;
    if (!element) {
        element = document.createElement('div');
        element.style.position = 'absolute';
        element.style.bottom = '10px';
        element.style.right = '10px';
        element.style.color = 'rgba(255, 255, 255, 0.9)';
        element.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        element.style.padding = '5px 10px';
        element.style.borderRadius = '5px';
        element.style.fontSize = '18px';
        element.style.fontFamily = 'Arial, sans-serif';
        element.textContent = `Version ${GAME_VERSION.substring(1)}`;
        document.body.appendChild(element);
        // Need state.setVersionTextElement(element);
        setVersionTextElement(element);
    }
}

// Create Score Text Element (Called from init)
export function createScoreText() {
    // Needs state.scoreTextElement and setter
    let element = scoreTextElement;
    if (!element) {
        element = document.createElement('div');
        element.style.position = 'absolute';
        element.style.top = '10px';
        element.style.left = '10px';
        element.style.color = 'rgba(255, 255, 255, 0.9)';
        element.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        element.style.padding = '5px 10px';
        element.style.borderRadius = '5px';
        element.style.fontSize = '18px';
        element.style.fontFamily = 'Arial, sans-serif';
        element.textContent = "Score: 0";
        document.body.appendChild(element);
        // Need state.setScoreTextElement(element);
        setScoreTextElement(element);
    }
}

// Create Top Score Text Element (Called from init)
export function createTopScoreText() {
    // Needs state.topScoreTextElement and setter
    let element = topScoreTextElement;
    if (!element) {
        element = document.createElement('div');
        const originalFontSize = '18px'; // Store original style
        const originalColor = 'rgba(255, 255, 255, 0.9)';

        element.style.position = 'absolute';
        element.style.bottom = '10px';
        element.style.left = '10px';
        element.style.right = 'unset';
        element.style.color = originalColor;
        element.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        element.style.padding = '5px 10px';
        element.style.borderRadius = '5px';
        element.style.fontSize = originalFontSize;
        element.style.fontFamily = 'Arial, sans-serif';
        element.textContent = `Top Score: ${topScore}`;

        // Store original styles for later reset
        element.dataset.originalFontSize = originalFontSize;
        element.dataset.originalColor = originalColor;

        document.body.appendChild(element);
        // Need state.setTopScoreTextElement(element);
        setTopScoreTextElement(element);
    }
}

// Create Pause Indicator (Called from init)
export function createPauseIndicator() {
    let element = pauseIndicatorElement;
    if (!element) {
        element = document.createElement('div');
        element.style.position = 'absolute';
        element.style.top = '50%';
        element.style.left = '50%';
        element.style.transform = 'translate(-50%, -50%)';
        element.style.color = 'rgba(255, 255, 255, 0.8)';
        element.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        element.style.padding = '20px 40px';
        element.style.borderRadius = '8px';
        element.style.fontSize = '48px';
        element.style.fontFamily = 'Arial, sans-serif';
        element.style.textShadow = '2px 2px 4px #000000';
        element.style.textAlign = 'center';
        element.style.display = 'none'; // Initially hidden
        element.textContent = 'Paused';
        document.body.appendChild(element);
        setPauseIndicatorElement(element); // Store reference in state
    }
}

// --- Listener Callback Functions (defined outside to allow removal) ---
let gameOverMouseDownListener = null;
let gameOverTouchStartListener = null;
let gameOverMouseMoveListener = null;
let gameOverTouchMoveListener = null;
let gameOverMouseUpListener = null;
let gameOverTouchEndListener = null;
let gameOverWheelListener = null;

// --- NEW Function to Add Listeners ---
export function addGameOverPointerListeners() {
    if (gameOverMouseDownListener || gameOverTouchStartListener || gameOverWheelListener) {
        console.log("[addGameOverPointerListeners] Listeners already seem to be attached. Skipping.");
        return; // Avoid attaching multiple times
    }
    console.log(`[${GAME_VERSION}] Adding game over pointer listeners (mousedown, touchstart, wheel)`);

    gameOverMouseDownListener = (event) => {
        // Prevent default browser actions (like text selection)
        event.preventDefault();
        
        setIsInitialDragMove(true); // Set flag for first move

        if (event.button === 0) { // Left mouse button for drag
            setIsDraggingCamera(true);
            setLastPointerX(event.clientX);
            setLastPointerY(event.clientY);
            document.addEventListener('mousemove', gameOverMouseMoveListener);
            document.addEventListener('mouseup', gameOverMouseUpListener);
        } else if (event.button === 1) { // Middle mouse button for pan
            setIsPanningCamera(true);
            setLastPointerX(event.clientX);
            setLastPointerY(event.clientY);
            document.addEventListener('mousemove', gameOverMouseMoveListener);
            document.addEventListener('mouseup', gameOverMouseUpListener);
        }
    };

    gameOverTouchStartListener = (event) => {
         // Check if the touch is on the UI element itself to allow interaction
        if (gameOverTextElement && gameOverTextElement.contains(event.target)) {
             return; // Don't prevent default or start drag if touch is on UI
        }
        // Prevent default touch actions (like scrolling or zooming the page)
        event.preventDefault();

        if (event.touches.length === 1) {
            setIsInitialDragMove(true); // Set flag for first move
            setIsDraggingCamera(true);
            setLastPointerX(event.touches[0].clientX);
            setLastPointerY(event.touches[0].clientY);
            document.addEventListener('touchmove', gameOverTouchMoveListener, { passive: false });
            document.addEventListener('touchend', gameOverTouchEndListener);
        }
        // Add panning logic for two-finger touch if desired later
    };

    gameOverMouseMoveListener = (event) => {
        event.preventDefault();

        const deltaX = event.clientX - lastPointerX;
        const deltaY = event.clientY - lastPointerY;

        // Reset look-at on first move after initiating drag/pan
        if (isInitialDragMove) {
            setGameOverLookAtTarget(gameOverLookAtTarget);
            setIsInitialDragMove(false); // Reset flag after first move
        }

        if (isDraggingCamera) { // Left mouse button OR 1-finger touch drag = Rotate
             const rotationSensitivity = 0.005;
             const azimuthAngle = -deltaX * rotationSensitivity; // Rotation around Y
             const elevationAngle = -deltaY * rotationSensitivity; // Rotation around local X
 
             const currentOffset = gameOverCameraOffset.clone(); // Get the offset vector from state
             const yAxis = new THREE.Vector3(0, 1, 0); // World Up
 
             // Calculate the axis for elevation based on the *current* offset and world up
             const rightAxis = new THREE.Vector3().crossVectors(yAxis, currentOffset).normalize();
 
             // Apply elevation rotation first, around the calculated right axis
             currentOffset.applyAxisAngle(rightAxis, elevationAngle);

             // Check elevation limits *before* azimuth rotation (simpler clamping)
             const minPolarAngle = 0.1; 
             const maxPolarAngle = Math.PI - 0.1; 
             let currentPolarAngle = Math.acos(THREE.MathUtils.clamp(currentOffset.y / currentOffset.length(), -1, 1));
             
             // If limits exceeded, clamp the elevation rotation angle itself
             let effectiveElevationAngle = elevationAngle;
             if (currentPolarAngle < minPolarAngle && elevationAngle < 0) { // Trying to look too far up
                  // Calculate angle needed to reach minPolarAngle and apply that instead
                 const targetY = currentOffset.length() * Math.cos(minPolarAngle);
                 const currentY = currentOffset.y;
                 // This needs a more robust way to calculate the *clamped* angle
                 // For now, let's revert the invalid rotation
                 currentOffset.applyAxisAngle(rightAxis, -elevationAngle); // Revert elevation
                 effectiveElevationAngle = 0; // Mark as no effective rotation
             } else if (currentPolarAngle > maxPolarAngle && elevationAngle > 0) { // Trying to look too far down
                  // Similar clamping issue, revert for now
                 currentOffset.applyAxisAngle(rightAxis, -elevationAngle); // Revert elevation
                 effectiveElevationAngle = 0; // Mark as no effective rotation
             }
             // If we didn't revert, re-apply the valid elevation
             if (effectiveElevationAngle !== 0) {
                 currentOffset.applyAxisAngle(rightAxis, effectiveElevationAngle);
             } // If reverted, currentOffset is already back to pre-elevation state

             // Now apply azimuth rotation around the world Y axis
             currentOffset.applyAxisAngle(yAxis, azimuthAngle);
 
             setGameOverCameraOffset(currentOffset); // Update state with the final offset

        } else if (isPanningCamera) { // Middle mouse button drag = Pan
             // Panning logic (adjust sensitivity)
             const panSensitivity = 0.1;
             const panVector = new THREE.Vector3();

             // Calculate camera's right and up vectors in world space
             const cameraRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
             const cameraUp = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);

             // Move target based on delta mouse movement relative to camera orientation
             panVector.addScaledVector(cameraRight, -deltaX * panSensitivity);
             panVector.addScaledVector(cameraUp, deltaY * panSensitivity);

             const newLookAtTarget = gameOverLookAtTarget.clone().add(panVector);
             setGameOverLookAtTarget(newLookAtTarget);
        }

        setLastPointerX(event.clientX);
        setLastPointerY(event.clientY);
    };

    gameOverTouchMoveListener = (event) => {
        event.preventDefault(); // Prevent page scroll/zoom
        if (event.touches.length === 1) {
            // Same rotation logic as mouse drag
             const deltaX = event.touches[0].clientX - lastPointerX;
             const deltaY = event.touches[0].clientY - lastPointerY;
 
             if (isInitialDragMove) {
                setGameOverLookAtTarget(gameOverLookAtTarget);
                setIsInitialDragMove(false); 
             }
 
             const rotationSensitivity = 0.005;
             const azimuthAngle = -deltaX * rotationSensitivity;
             const elevationAngle = -deltaY * rotationSensitivity;
             const currentOffset = gameOverCameraOffset.clone();
             const yAxis = new THREE.Vector3(0, 1, 0);
             
             const rightAxis = new THREE.Vector3().crossVectors(yAxis, currentOffset).normalize();
             currentOffset.applyAxisAngle(rightAxis, elevationAngle);

             // Clamp elevation (Simplified: revert if invalid for now)
             const minPolarAngle = 0.1; 
             const maxPolarAngle = Math.PI - 0.1; 
             const currentPolarAngle = Math.acos(THREE.MathUtils.clamp(currentOffset.y / currentOffset.length(), -1, 1));
             let effectiveElevationAngle = elevationAngle;
             if (currentPolarAngle < minPolarAngle && elevationAngle < 0) {
                 currentOffset.applyAxisAngle(rightAxis, -elevationAngle); // Revert
                 effectiveElevationAngle = 0;
             } else if (currentPolarAngle > maxPolarAngle && elevationAngle > 0) {
                 currentOffset.applyAxisAngle(rightAxis, -elevationAngle); // Revert
                 effectiveElevationAngle = 0;
             }
             if (effectiveElevationAngle !== 0) {
                 currentOffset.applyAxisAngle(rightAxis, effectiveElevationAngle);
             } // else: already reverted

             // Apply azimuth
             currentOffset.applyAxisAngle(yAxis, azimuthAngle);
             
             setGameOverCameraOffset(currentOffset); 
 
             setLastPointerX(event.touches[0].clientX);
             setLastPointerY(event.touches[0].clientY);
        }
    };

    gameOverMouseUpListener = (event) => {
        if (event.button === 0) { // Left mouse button
            setIsDraggingCamera(false);
        } else if (event.button === 1) { // Middle mouse button
            setIsPanningCamera(false);
        }
        document.removeEventListener('mousemove', gameOverMouseMoveListener);
        document.removeEventListener('mouseup', gameOverMouseUpListener);
    };

    gameOverTouchEndListener = (event) => {
        // Check if the touch ending is the one that started the drag
        if (isDraggingCamera) { 
            setIsDraggingCamera(false);
            document.removeEventListener('touchmove', gameOverTouchMoveListener);
            document.removeEventListener('touchend', gameOverTouchEndListener);
        }
    };

    gameOverWheelListener = (event) => {
        event.preventDefault();
        const zoomSensitivity = 0.05;
        const zoomAmount = event.deltaY * zoomSensitivity;

        // Calculate direction vector from camera to target
        const direction = new THREE.Vector3().subVectors(gameOverLookAtTarget, camera.position).normalize();
        
        // Calculate new offset magnitude
        let currentMagnitude = gameOverCameraOffset.length();
        let newMagnitude = currentMagnitude + zoomAmount;

        // Clamp zoom distance (prevent zooming too close or too far)
        const minZoomDistance = 5; // Example minimum distance
        const maxZoomDistance = 200; // Example maximum distance
        newMagnitude = THREE.MathUtils.clamp(newMagnitude, minZoomDistance, maxZoomDistance);

        // Calculate new offset vector based on the direction and new magnitude
        const newOffset = direction.clone().multiplyScalar(-newMagnitude); // Negate direction to get offset *from* target

        setGameOverCameraOffset(newOffset); // Update state
    };

    // Attach the listeners
    document.addEventListener('mousedown', gameOverMouseDownListener);
    document.addEventListener('touchstart', gameOverTouchStartListener, { passive: false });
    document.addEventListener('wheel', gameOverWheelListener, { passive: false });
}

// --- Function to Remove Listeners ---
export function removeGameOverPointerListeners() {
    console.log(`[${GAME_VERSION}] Removing game over pointer listeners`);
    if (gameOverMouseDownListener) document.removeEventListener('mousedown', gameOverMouseDownListener);
    if (gameOverTouchStartListener) document.removeEventListener('touchstart', gameOverTouchStartListener);
    if (gameOverMouseMoveListener) document.removeEventListener('mousemove', gameOverMouseMoveListener); // Ensure move listener is removed
    if (gameOverTouchMoveListener) document.removeEventListener('touchmove', gameOverTouchMoveListener);
    if (gameOverMouseUpListener) document.removeEventListener('mouseup', gameOverMouseUpListener);       // Ensure up listener is removed
    if (gameOverTouchEndListener) document.removeEventListener('touchend', gameOverTouchEndListener);
    if (gameOverWheelListener) document.removeEventListener('wheel', gameOverWheelListener);

    // Clear listener function variables
    gameOverMouseDownListener = null;
    gameOverTouchStartListener = null;
    gameOverMouseMoveListener = null;
    gameOverTouchMoveListener = null;
    gameOverMouseUpListener = null;
    gameOverTouchEndListener = null;
    gameOverWheelListener = null;

    // Reset camera interaction state just in case
    setIsDraggingCamera(false);
    setIsPanningCamera(false);
}

// Show Game Over Message (Called from animate)
// This function now *only* populates the content container the first time
// and makes the main dialog visible. It no longer handles the minimize state directly.
export function showGameOverMessage(winnerCode) {
    if (!gameOverTextElement) return;

    // Check if message for this winner code is already set
    // Convert winnerCode to string for comparison with dataset property
    if (gameOverTextElement.dataset.winnerCode === String(winnerCode)) {
        // Ensure dialog is visible even if content is already set
        gameOverTextElement.style.display = 'block'; 
        return; // Don't re-populate or reset appearance
    }

    console.log(`[UI] Populating showGameOverMessage for winnerCode: ${winnerCode}`);
    gameOverTextElement.dataset.winnerCode = String(winnerCode); // Store as string

    const contentContainer = document.getElementById('gameOverContentContainer');
    if (!contentContainer) return;

    // Populate content (existing code)
    let message = "";
    if (winnerCode === 1) message = 'AI Wins!';
    else if (winnerCode === 2) message = 'Player Wins!';
    else if (winnerCode === 3) message = 'Draw!';
    else { message = 'Game Over?'; console.warn("showGameOverMessage called with unknown winnerCode:", winnerCode); }

    let scoreMessage = `Final Score: ${scoreP1}`;
    // Need topScore from state here
    if (scoreP1 > topScore && (winnerCode === 2 || winnerCode === 3)) {
        // Check if it's also higher than the score at the start of the game to confirm it's *this* game's achievement
        if (scoreP1 > topScoreAtGameStart) { 
             scoreMessage += ` (NEW TOP SCORE!)`;
        }
    }

    const unlockStatus = getUnlockStatusText(topScore); // Needs topScore
    contentContainer.innerHTML =
        `<span id="mainGameOverMessage" style="display: block; margin-bottom: 5px;">${message}</span>` + // Ensure block display
        `<span style="font-size: clamp(20px, 4vw, 32px); color: #cccccc; display: block; margin-bottom: 15px;">${scoreMessage}</span>` + // Ensure block display
        `<div id="gameOverUnlocks" style="margin-top: 20px; border-top: 1px solid #555; padding-top: 15px;">` +
        unlockStatus.unlockedHTML +
        unlockStatus.nextUnlockMsg +
        `</div>` +
        `<div id="gameOverControls">` + // Wrap controls too
        unlockStatus.controlsText +
        `</div>` +
        `<span id="restartText" style="display: block; margin-top: 15px; font-size: clamp(16px, 3vw, 24px); color: #dddddd; cursor: pointer;">Tap or Press Any Key to Restart</span>`;

    // Ensure the dialog starts maximized - Call AFTER setting content
    updateGameOverDialogAppearance(); // Call to apply initial (maximized) style

    // Make the main dialog visible
    gameOverTextElement.style.display = 'block';
}

// Helper function to update appearance based on minimized state
function updateGameOverDialogAppearance() {
    console.log(`[GameOver Minimize] updateGameOverDialogAppearance called. Minimized: ${isGameOverDialogMinimized}`); // ADDED Log
    if (!gameOverTextElement) {
        console.log("[GameOver Minimize] gameOverTextElement not found in update.");
        return;
    }

    const minimizeButton = document.getElementById('gameOverMinimizeButton');
    const contentContainer = document.getElementById('gameOverContentContainer'); // Target the container

    if (!minimizeButton) console.log("[GameOver Minimize] minimizeButton not found in update.");
    if (!contentContainer) console.log("[GameOver Minimize] contentContainer not found in update.");
    if (!minimizeButton || !contentContainer) return; // Safety check

    if (isGameOverDialogMinimized) {
        console.log("[GameOver Minimize] Applying Minimized Styles.");
        // Minimized State - Move to bottom center, shrink
        gameOverTextElement.style.top = 'unset'; // Remove top positioning
        gameOverTextElement.style.bottom = '60px'; // Position near bottom (adjust if needed to avoid itch link)
        gameOverTextElement.style.left = '50%';
        gameOverTextElement.style.transform = 'translateX(-50%)'; // Center horizontally only
        gameOverTextElement.style.width = '200px'; // Fixed smaller width
        gameOverTextElement.style.height = 'auto';
        gameOverTextElement.style.minHeight = '30px'; // Smaller min height
        gameOverTextElement.style.padding = '5px 20px 5px 10px'; // Adjusted padding
        gameOverTextElement.style.overflowY = 'hidden';

        // Hide the content container
        contentContainer.style.display = 'none';

        minimizeButton.textContent = '+';
        minimizeButton.title = 'Maximize Dialog';
        // Adjust button position within the smaller box if needed
        minimizeButton.style.top = '3px'; 
        minimizeButton.style.right = '5px';

    } else {
        console.log("[GameOver Minimize] Applying Maximized Styles.");
        // Maximized/Normal State - Restore original position and size
        gameOverTextElement.style.top = '50%';
        gameOverTextElement.style.bottom = 'unset'; // Remove bottom positioning
        gameOverTextElement.style.left = '50%';
        gameOverTextElement.style.transform = 'translate(-50%, -50%)'; // Center both ways
        gameOverTextElement.style.width = 'clamp(300px, 90vw, 700px)'; // Restore width
        gameOverTextElement.style.minHeight = '';
        gameOverTextElement.style.padding = 'clamp(15px, 4vw, 20px) clamp(20px, 5vw, 40px)'; // Restore padding
        gameOverTextElement.style.overflowY = 'auto';

        // Show the content container
        contentContainer.style.display = 'block';

        minimizeButton.textContent = '_';
        minimizeButton.title = 'Minimize Dialog';
        // Restore button position
        minimizeButton.style.top = '5px';
        minimizeButton.style.right = '10px';
    }
}

// Update Score Display (Called from animate)
export function updateScoreDisplay() {
    if (scoreTextElement) {
        scoreTextElement.textContent = `Score: ${scoreP1}`;
    }

    // Update Top Score Display & Style
    if (topScoreTextElement) {
        const originalSize = topScoreTextElement.dataset.originalFontSize || '18px'; // Fallback
        const originalColor = topScoreTextElement.dataset.originalColor || 'rgba(255, 255, 255, 0.9)'; // Fallback

        // Check if current score exceeds the top score recorded AT THE START of this game
        if (scoreP1 > topScoreAtGameStart) {
            topScoreTextElement.textContent = `Top Score: ${scoreP1}`; // Show current score as potential new top
            topScoreTextElement.style.fontSize = '36px'; // Make it bigger
            topScoreTextElement.style.color = '#ffd700'; // Make it gold
        } else {
            // Otherwise, display the actual current top score and use normal style
            topScoreTextElement.textContent = `Top Score: ${topScore}`; // Show the actual top score
            topScoreTextElement.style.fontSize = originalSize;
            topScoreTextElement.style.color = originalColor;
        }
    }
}

// NEW: Create GitHub Link Element
export function createGitHubLink() {
    const linkElement = document.createElement('a');
    linkElement.href = "https://github.com/Cunya/TronSnake-Cursor-Gemini-2.5-Exp";
    linkElement.target = "_blank"; // Open in new tab
    linkElement.rel = "noopener noreferrer"; // Security best practice
    linkElement.textContent = "GitHub"; // Or use an icon

    // Style similar to version/score text
    linkElement.style.position = 'absolute';
    linkElement.style.top = '10px';
    linkElement.style.right = '10px';
    linkElement.style.color = 'rgba(255, 255, 255, 0.9)';
    linkElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    linkElement.style.padding = '5px 10px';
    linkElement.style.borderRadius = '5px';
    linkElement.style.fontSize = '18px';
    linkElement.style.fontFamily = 'Arial, sans-serif';
    linkElement.style.textDecoration = 'none';
    linkElement.style.zIndex = '10'; // Ensure it's on top

    document.body.appendChild(linkElement);
    // No need to store this in state unless we plan to update it
}

// NEW: Create Itch.io Link Element
export function createItchLink() {
    const linkElement = document.createElement('a');
    linkElement.href = "https://tamasmartinec.itch.io/powerup-tron";
    linkElement.target = "_blank"; // Open in new tab
    linkElement.rel = "noopener noreferrer"; // Security best practice
    linkElement.textContent = "Support the project on itch.io";

    // Style similar to version/score text, but centered at bottom
    linkElement.style.position = 'absolute';
    linkElement.style.bottom = '10px';
    linkElement.style.left = '50%';
    linkElement.style.transform = 'translateX(-50%)'; // Center horizontally
    linkElement.style.color = 'rgba(255, 255, 255, 0.9)';
    linkElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    linkElement.style.padding = '5px 10px';
    linkElement.style.borderRadius = '5px';
    linkElement.style.fontSize = '18px';
    linkElement.style.fontFamily = 'Arial, sans-serif';
    linkElement.style.textDecoration = 'none';
    linkElement.style.zIndex = '10'; // Ensure it's on top

    document.body.appendChild(linkElement);
    // No need to store this in state unless we plan to update it
} 