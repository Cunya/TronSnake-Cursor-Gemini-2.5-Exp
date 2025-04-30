// The main init function and related setup will be moved here. This will be the entry point. 

// Entry point for the game
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import {
    scene, camera, renderer, planeMesh, gridMesh, // Core Three elements
    snakeHead1, snakeTargetPosition1, prevTargetPos1, snakeDirection1,
    headMaterial1, // Snake materials
    trailSegments1, // Trail arrays
    scoreP1, topScore, topScoreAtGameStart, pickupsCollectedCounter, unlockedScoresThisGame, // Score & unlock state
    isSpeedBoostActiveP1, speedBoostEndTimeP1, isZoomedOutP1, zoomOutEndTimeP1, zoomLevelP1, isSparseTrailActiveP1, sparseTrailEndTimeP1, trailCounterP1, sparseLevelP1, ammoCountP1,
    aiPlayers,
    boundaryXMin, boundaryXMax, boundaryZMin, boundaryZMax, // Boundaries
    maxScorePickups, maxExpansionPickups, maxClearPickups, maxZoomPickups, maxSparseTrailPickups, maxAmmoPickups, maxMultiSpawnPickups, maxAddAiPickups, // Max pickups
    floatingTexts, explosionParticles, projectiles, // Effect arrays
    targetLookAt, cameraOffset, // Camera helpers
    // Import UI Elements needed in resetGame
    topScoreTextElement,
    // State Setters
    setScene, setCamera, setRenderer, setSnakeHead1, setTopScore, setTopScoreAtGameStart,
    setLastUpdateTimeP1, setLastFrameTime,
    setIsGameOver, setWinner, setScoreP1, setSpeedBoostActiveP1, setSpeedBoostEndTimeP1, setIsZoomedOutP1, setZoomOutEndTimeP1,
    setZoomLevelP1, setIsSparseTrailActiveP1, setSparseTrailEndTimeP1, setTrailCounterP1, setSparseLevelP1,
    setAmmoCountP1,
    setMaxScorePickups, setMaxExpansionPickups, setMaxClearPickups, setMaxZoomPickups, setMaxSparseTrailPickups, setMaxMultiSpawnPickups, setMaxAddAiPickups, setMaxAmmoPickups,
    setGameActive, setTextFont, setOpeningDialogElement, setGameOverTextElement, setVersionTextElement, setScoreTextElement, setTopScoreTextElement,
    setBoundaryXMin, setBoundaryXMax, setBoundaryZMin, setBoundaryZMax,
    setLastTrailSegment1,
    // Import setters for new counters
    setNextAmmoSpawnCount, setNextClearSpawnCount, setNextAddAiSpawnCount, setNextExpansionSpawnCount, setNextMultiSpawnCount,
    // Make sure pickup arrays are imported
    scorePickups, expansionPickups, clearPickups, zoomPickups, sparseTrailPickups, multiSpawnPickups, addAiPickups, ammoPickups,
    // Import necessary state for visibility change handler
    gameActive, isGameOver, setIsPaused,
    setSpeedLevelP1,
    // Import collision status setter
    setPreviousFrameAICollisionStatus,
    playerLostTime, // Import playerLostTime
    setPlayerLostTime, // Import setter
    isGameOverCameraActive, // ADDED Import
    setIsGameOverCameraActive, // ADDED Import
    deathZoomFactor, // ADDED Import
    setDeathZoomFactor,
    aiDefeatedTime, // ADDED Import
    setAiDefeatedTime, // ADDED Import
    aiSpawnRingEffects, setAiSpawnRingEffects, // <<< Import AI Spawn Effects state (Keep First One)
    setAiPlayers,
    setPickupsCollectedCounter // <<< ADDED IMPORT
} from './state.js';
import {
    initialBoundaryHalfSize, segmentSize, cameraHeight, cameraDistanceBehind, P1_HEAD_COLOR_NORMAL,
    AMMO_PICKUP_THRESHOLD, CLEAR_WALL_PICKUP_THRESHOLD, ADD_AI_PICKUP_THRESHOLD, EXPAND_PICKUP_THRESHOLD, MULTI_PICKUP_THRESHOLD,
    AI_COLORS,
    AI_SPAWN_DURATION, 
    AI_SPAWN_RING_MAX_RADIUS, AI_SPAWN_RING_DURATION, AI_SPAWN_RING_COUNT, 
    AI_SPAWN_RING_RADIUS_STEP, AI_SPAWN_EFFECT_COLOR, GAME_VERSION, GROUND_Y,
    AI_SPAWN_RING_VISUAL_DURATION,
} from './constants.js';
import { snapToGridCenter } from './utils.js';
import { onKeyDown, onKeyUp, onTouchStart, onTouchEnd, handleFirstClick, startGame, handleDebugClick } from './playerControls.js';
import { spawnInitialPickups } from './pickups.js';
import { createPlayAreaVisuals, initializePickupTemplates, updateAmmoIndicatorP1, updateAmmoIndicatorAI, clearAllTrails, clearFloatingTexts, clearExplosionParticles, revertHeadColors } from './visuals.js';
import { createOpeningDialog, createGameOverText, createVersionText, createScoreText, createTopScoreText, createPauseIndicator, createGitHubLink, createItchLink, removeGameOverPointerListeners } from './ui.js';
import { clearAllProjectiles } from './projectile.js';
import { animate } from './gameLoop.js';
import { isPositionSafe } from './ai.js';
import { cleanupGameOverListeners } from './playerControls.js';

// <<< ADDED: Console Error Logging & Download >>>
const errorLog = [];
const originalConsoleError = console.error; // Keep a reference to the original

// Override console.error
console.error = function(...args) {
    // 1. Call the original console.error so messages still appear in the dev console
    originalConsoleError.apply(console, args);

    // 2. Format the arguments into a string
    const message = args.map(arg => {
        if (arg instanceof Error) {
            // Include stack trace for Error objects
            return `${arg.name}: ${arg.message}\nStack: ${arg.stack}`;
        } else if (typeof arg === 'object' && arg !== null) {
            // Try to stringify objects, handle errors
            try {
                return JSON.stringify(arg, null, 2); // Pretty print JSON
            } catch (e) {
                return '[Unserializable Object]';
            }
        } else {
            // Convert other types to string
            return String(arg);
        }
    }).join(' '); // Join multiple arguments with a space

    // 3. Add a timestamp and store the formatted message
    const timestamp = new Date().toISOString();
    errorLog.push(`[${timestamp}] ${message}`);
};

// Function to download the logged errors
function downloadErrorLogFile() {
    if (errorLog.length === 0) {
        console.log("No errors captured to download.");
        return;
    }
    // Join errors with double newline for readability
    const logContent = errorLog.join('\n\n');
    const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'logs/tron_snake_errors.log'; // Suggest saving inside a logs folder
    link.style.display = 'none'; // Hide the link
    document.body.appendChild(link);
    link.click(); // Simulate a click to trigger download

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`Error log downloaded (${errorLog.length} entries).`);
    // Optional: Clear the log after download if desired
    // errorLog.length = 0;
}
// Make the download function globally accessible for manual console calls
window.downloadErrorLog = downloadErrorLogFile;
// <<< END ADDED: Console Error Logging & Download >>>

// Visibility Change Handler
function handleVisibilityChange() {
    if (document.hidden) {
        // Pause the game if it's active and not over when the tab becomes hidden
        if (gameActive && !isGameOver) {
            setIsPaused(true);
            console.log("Game paused due to visibility change.");
        }
    } else {
        // Optional: Automatically unpause when tab becomes visible?
        // For now, let's require manual unpause (Escape key)
        // if (gameActive && !isGameOver && isPaused) {
        //     setIsPaused(false);
        //     console.log("Game unpaused due to visibility change.");
        // }
    }
}

// Helper function to create a new AI player object
// MODIFIED for delayed spawning
export function createNewAIPlayer(startX, startZ, startDirX, startDirZ) {
    const colorIndex = aiPlayers.length % AI_COLORS.length; // Cycle through colors
    const assignedColors = AI_COLORS[colorIndex];

    const headSize = segmentSize * 1.05;
    const headGeometry = new THREE.BoxGeometry(headSize, headSize, headSize);
    const headMaterial = new THREE.MeshPhongMaterial({ color: assignedColors.normal }); 
    const aiHeadMesh = new THREE.Mesh(headGeometry, headMaterial);
    const startPos = new THREE.Vector3(startX, 0, startZ);
    const startDir = new THREE.Vector3(startDirX, 0, startDirZ);
    
    aiHeadMesh.position.copy(startPos);
    // scene.add(aiHeadMesh); // <<< DEFERRED: Head is added after spawn delay in gameLoop

    const newAI = {
        id: `ai-${aiPlayers.length}`, // Simple unique ID
        head: aiHeadMesh,             // <<< ADDED: Store reference to the head mesh
        targetPosition: startPos.clone(), // Initialize target position
        prevTargetPos: startPos.clone(), // Initialize previous position
        direction: startDir.clone(), // Initialize direction
        material: headMaterial, 
        colors: assignedColors, // Store the assigned color object
        trailSegments: [],
        lastTrailSegment: null,
        isSpeedBoostActive: false,
        speedBoostEndTime: 0,
        speedLevel: 0,
        isSparseTrailActive: false,
        sparseTrailEndTime: 0,
        trailCounter: 0,
        sparseLevel: 1,
        lastUpdateTime: performance.now(),
        ammoCount: 0,
        ammoIndicator: null, // Will need to be created/updated separately
        isSpawning: true,             // <<< ADDED: Flag to indicate spawning state
        spawnStartTime: performance.now(), // <<< ADDED: Timestamp when spawning started
        spawnDuration: AI_SPAWN_DURATION, // <<< ADDED: Duration of the spawn effect/delay
        needsSpawnEffect: true,       // <<< ADDED: Flag to trigger visual effect creation later
    };

    // scene.add(aiHeadMesh); // <<< DEFERRED (Removed from original location too)
    aiPlayers.push(newAI);
    setAiPlayers([...aiPlayers]); // Update state

    // <<< DEFERRED: Trigger the visual spawn effect later, not here >>>
    // const effectPosition = startPos.clone();
    // const markerCenterY = -segmentSize / 2 + 0.01; 
    // effectPosition.y = markerCenterY;
    // createAISpawnRingEffect(effectPosition, assignedColors.normal);

    return newAI; // Return the created AI object
}

// <<< ADDED: Function to create the AI spawn ring visual effect >>>
export function createAISpawnRingEffect(position, color) {
    if (!scene) {
        console.error("[createAISpawnRingEffect] Scene not available!");
        return;
    }
    const baseDuration = AI_SPAWN_RING_VISUAL_DURATION; // Use the new visual duration constant
    const baseRadius = AI_SPAWN_RING_MAX_RADIUS; 
    const startTime = performance.now();
    let currentEffects = [...aiSpawnRingEffects]; // Get current effects

    for (let i = 0; i < AI_SPAWN_RING_COUNT; i++) {
        // Calculate radii for staggered appearance (outer rings start slightly larger)
        const ringRadius = baseRadius * (1 + i * AI_SPAWN_RING_RADIUS_STEP);
        const innerRadius = ringRadius - segmentSize * 0.1; // Make the ring thin
        const ringGeometry = new THREE.RingGeometry(innerRadius, ringRadius, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: color || AI_SPAWN_EFFECT_COLOR,
            transparent: true,
            opacity: 0.8, // Start fairly opaque
            side: THREE.DoubleSide
        });

        const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial.clone());
        // Start at max radius, scaled by ring index
        const startRadius = AI_SPAWN_RING_MAX_RADIUS * (1 + i * AI_SPAWN_RING_RADIUS_STEP);
        ringMesh.scale.setScalar(1); // <-- CORRECT: Set initial scale to 1
        ringMesh.position.copy(position);
        ringMesh.material.opacity = 0.8;
        ringMesh.material.transparent = true;
        ringMesh.rotation.x = -Math.PI / 2; // <<< ADDED BACK: Rotate ring to lay flat on XZ plane
        
        const effectData = {
            mesh: ringMesh,
            material: ringMaterial,
            initialDuration: baseDuration,
            remainingDuration: baseDuration,
            maxRadius: ringRadius, 
        };

        currentEffects.push(effectData);
        scene.add(ringMesh);
    }
    setAiSpawnRingEffects(currentEffects); // Update state with new effects
}

export function resetGame() {
    console.log(`--- Entering resetGame ---`);
    // Capture top score at the start of reset
    // console.log(`[resetGame] Value of topScore BEFORE assignment: ${topScore}`);
    if(setTopScoreAtGameStart) setTopScoreAtGameStart(topScore);
    // console.log(`[resetGame] Value of topScoreAtGameStart AFTER assignment: ${topScoreAtGameStart}`);

    // --- Remove Game Over Listeners ---
    removeGameOverPointerListeners();
    // Ensure any active drag is stopped and move/up/wheel listeners are removed
    cleanupGameOverListeners();
    // --- End Listener Removal ---

    // Reset flags and scores
    if(setIsGameOver) setIsGameOver(false);
    if(setIsGameOverCameraActive) setIsGameOverCameraActive(false);
    if(setIsPaused) setIsPaused(false);
    if(setWinner) setWinner(0);
    if(setPlayerLostTime) setPlayerLostTime(null);
    if(setAiDefeatedTime) setAiDefeatedTime(null);
    if(setDeathZoomFactor) setDeathZoomFactor(1.0);
    if(setScoreP1) setScoreP1(0);
    if(setPickupsCollectedCounter) setPickupsCollectedCounter(0);
    unlockedScoresThisGame.clear();
    if(setSpeedBoostActiveP1) setSpeedBoostActiveP1(false);
    if(setSpeedBoostEndTimeP1) setSpeedBoostEndTimeP1(0);
    if(setSpeedLevelP1) setSpeedLevelP1(0);
    if(setIsZoomedOutP1) setIsZoomedOutP1(false);
    if(setZoomOutEndTimeP1) setZoomOutEndTimeP1(0);
    if(setZoomLevelP1) setZoomLevelP1(0);
    if(setIsSparseTrailActiveP1) setIsSparseTrailActiveP1(false);
    if(setSparseTrailEndTimeP1) setSparseTrailEndTimeP1(0);
    if(setTrailCounterP1) setTrailCounterP1(0);
    if(setSparseLevelP1) setSparseLevelP1(1);
    if(setAmmoCountP1) setAmmoCountP1(0);
    // Reset collision status tracking for AIs
    if(setPreviousFrameAICollisionStatus) setPreviousFrameAICollisionStatus([]); // Reset to empty array

    // Reset UI elements
    // if(scoreTextElement) scoreTextElement.textContent = "Score: 0"; // Keep this removed - handled by updateScoreDisplay
    // if(gameOverTextElement) gameOverTextElement.style.display = 'none'; // <-- REMOVE THIS AGAIN
    // Set game state. The animate loop or specific UI functions should handle updating the DOM based on state.
    if(setGameActive) setGameActive(true); // Ensure game is active on reset

    // Reset Boundaries
    const bXMin = -initialBoundaryHalfSize;
    const bXMax = initialBoundaryHalfSize;
    const bZMin = -initialBoundaryHalfSize;
    const bZMax = initialBoundaryHalfSize;
    if(setBoundaryXMin) setBoundaryXMin(bXMin);
    if(setBoundaryXMax) setBoundaryXMax(bXMax);
    if(setBoundaryZMin) setBoundaryZMin(bZMin);
    if(setBoundaryZMax) setBoundaryZMax(bZMax);
    createPlayAreaVisuals(bXMin, bXMax, bZMin, bZMax);

    // Clear visual elements
    clearAllTrails();
    clearFloatingTexts();
    clearExplosionParticles();
    clearAllProjectiles();
    // MOVED: revertHeadColors(); // Reset head colors to normal

    // --> ADD CLEARING FOR PICKUPS <--
    console.log("[resetGame] Clearing existing pickup objects...");
    [scorePickups, expansionPickups, clearPickups, zoomPickups, sparseTrailPickups, multiSpawnPickups, addAiPickups, ammoPickups].forEach(arr => {
        if (arr) { // Ensure array exists
            arr.forEach(p => {
                if (p && scene) { // Ensure pickup and scene exist
                    scene.remove(p);
                }
            });
            arr.length = 0; // Clear the array
        }
    });
    // --> END PICKUP CLEARING <--

    // ---> ADD CLEARING FOR AI SPAWN EFFECTS <---
    aiSpawnRingEffects.forEach(effect => {
        if (effect.mesh && scene) {
            scene.remove(effect.mesh);
        }
    });
    setAiSpawnRingEffects([]); // Clear the state array
    // ---> END AI SPAWN EFFECT CLEARING <---

    // --- Reset AI Players --- 
    // Remove existing AI visuals and clear the array
    // console.log(`[resetGame] Cleaning up ${aiPlayers.length} AI objects...`); // <<< COMMENTED OUT
    aiPlayers.forEach(ai => {
        // console.log(`[resetGame] Processing AI ${ai.id}. Head Exists: ${!!ai.head}, Is Lost: ${ai.lost}`); // <<< COMMENTED OUT
        if (ai.head && scene) {
            // console.log(`[resetGame] Attempting to remove head for AI ${ai.id}`); // <<< COMMENTED OUT
            scene.remove(ai.head);
            // console.log(`[resetGame] Called scene.remove for AI ${ai.id} head.`); // <<< COMMENTED OUT
        }
        if (ai.ammoIndicator && scene) {
            // console.log(`[resetGame] Removing ammo indicator for AI ${ai.id}`); // <<< COMMENTED OUT
            scene.remove(ai.ammoIndicator);
        }
        // Clear AI trails individually if needed, or rely on clearAllTrails
        ai.trailSegments.forEach(seg => scene.remove(seg)); // Remove visual segments
        ai.trailSegments.length = 0; // <-- Explicitly clear the internal array
        ai.lastTrailSegment = null; // <-- Ensure last segment ref is cleared too
    });
    aiPlayers.length = 0;
    setAiPlayers([]); // Update state
    
    // Reset Max Pickup Counts
    if(setMaxScorePickups) setMaxScorePickups(1);
    if(setMaxExpansionPickups) setMaxExpansionPickups(1);
    if(setMaxClearPickups) setMaxClearPickups(10); // Allow up to 10 Clear Walls pickups
    if(setMaxZoomPickups) setMaxZoomPickups(1);
    if(setMaxSparseTrailPickups) setMaxSparseTrailPickups(1);
    if(setMaxMultiSpawnPickups) setMaxMultiSpawnPickups(1);
    if(setMaxAddAiPickups) setMaxAddAiPickups(1);
    if(setMaxAmmoPickups) setMaxAmmoPickups(1);
    // Reset counter pickup thresholds
    if(setNextAmmoSpawnCount) setNextAmmoSpawnCount(AMMO_PICKUP_THRESHOLD);
    if(setNextClearSpawnCount) setNextClearSpawnCount(CLEAR_WALL_PICKUP_THRESHOLD);
    if(setNextAddAiSpawnCount) setNextAddAiSpawnCount(ADD_AI_PICKUP_THRESHOLD);
    if(setNextExpansionSpawnCount) setNextExpansionSpawnCount(EXPAND_PICKUP_THRESHOLD);
    if(setNextMultiSpawnCount) setNextMultiSpawnCount(MULTI_PICKUP_THRESHOLD);

    // Spawn a fresh set of initial pickups
    spawnInitialPickups(); // <<< UNCOMMENTED - Needs to run on reset

    // Reset player 1 snake position & visuals
    const startPos1X = snapToGridCenter(bXMin + segmentSize, 'x');
    const startPos1Z = snapToGridCenter(0, 'z');

    if (snakeHead1) { // If head exists, just reposition it
        snakeHead1.position.set(startPos1X, 0, startPos1Z);
        snakeHead1.visible = true; // Ensure it's visible
    } else { // If head is null (e.g., after death), recreate it
        console.log("[resetGame] snakeHead1 is null, recreating...");
        const headSize = segmentSize * 1.05;
        const headGeometry = new THREE.BoxGeometry(headSize, headSize, headSize);
        // headMaterial1 should still exist and be in the correct state (reset by revertHeadColors)
        const newSnakeHead1 = new THREE.Mesh(headGeometry, headMaterial1);
        newSnakeHead1.position.set(startPos1X, 0, startPos1Z);
        newSnakeHead1.visible = true; // ADDED: Explicitly set visibility
        if (scene) { // Add to scene only if scene exists
            scene.add(newSnakeHead1);
        } else {
            console.error("[resetGame] Scene does not exist when recreating snakeHead1!");
        }
        setSnakeHead1(newSnakeHead1); // Update state with the new head object
    }

    snakeTargetPosition1.set(startPos1X, 0, startPos1Z);
    prevTargetPos1.copy(snakeTargetPosition1);
    snakeDirection1.set(1, 0, 0);
    // headMaterial1 color already reset by revertHeadColors

    // --- Initialize First AI --- 
    let aiSpawnPos = null;
    const maxSpawnAttempts = 50; // Limit attempts to find a spot
    const headHalfWidth = (segmentSize * 1.05) / 2.0; // <<< RE-ADD headHalfWidth
    // console.log(`[resetGame] Finding safe spawn for initial AI... (Head half width: ${headHalfWidth.toFixed(2)})`);
    for (let attempt = 0; attempt < maxSpawnAttempts; attempt++) {
        // Try spawning near the right edge, moving inwards slightly
        const tryX = bXMax - segmentSize * (1 + Math.floor(attempt / 5)); // Move inwards every 5 attempts
        const tryZ = snapToGridCenter(0 + (Math.random() - 0.5) * (bZMax - bZMin) * 0.8, 'z'); // Random Z near center
        const potentialPos = new THREE.Vector3(snapToGridCenter(tryX, 'x'), 0, tryZ);

        // Check safety using isPositionSafe (checks trails, etc., ignores pickups due to isSpawnCheck=true)
        const isSafeFromTrails = isPositionSafe(potentialPos, null, true, false);
        
        // <<< RE-ADD: Explicit boundary check including mesh size >>>
        const isWithinBounds = 
            potentialPos.x >= boundaryXMin + headHalfWidth &&
            potentialPos.x <= boundaryXMax - headHalfWidth &&
            potentialPos.z >= boundaryZMin + headHalfWidth &&
            potentialPos.z <= boundaryZMax - headHalfWidth;

        // MODIFIED: Use the specific trail check and the explicit bounds check
        if (isSafeFromTrails && isWithinBounds) { 
            aiSpawnPos = potentialPos;
            // console.log(`[resetGame] Found safe AI spawn at (${aiSpawnPos.x.toFixed(1)}, ${aiSpawnPos.z.toFixed(1)}) on attempt ${attempt + 1}`);
            break;
        }
    }
    // Fallback if no safe spot found (should be rare)
    if (!aiSpawnPos) {
        console.warn("[resetGame] Could not find safe spawn for initial AI, using default near edge, adjusted for mesh size.");
        // <<< RE-ADD: Adjust fallback to account for head width >>>
        const fallbackX = snapToGridCenter(bXMax - headHalfWidth - segmentSize, 'x'); // Ensure center is at least half-width + one segment away
        aiSpawnPos = new THREE.Vector3(fallbackX, 0, snapToGridCenter(0, 'z'));
        console.log(`[resetGame] Using fallback AI spawn position: (${aiSpawnPos.x.toFixed(1)}, ${aiSpawnPos.z.toFixed(1)})`); // Added log
    }

    // Create AI at the determined safe(r) position
    const aiStartDir = new THREE.Vector3(-1, 0, 0); 
    // --- MODIFIED: Use new createNewAIPlayer signature ---
    const firstAI = createNewAIPlayer(aiSpawnPos.x, aiSpawnPos.z, aiStartDir.x, aiStartDir.z); 
    // console.log(`[resetGame] Created AI ${firstAI.id} at (${aiSpawnPos.x.toFixed(1)}, ${aiSpawnPos.z.toFixed(1)}) spawning...`);
    // aiPlayers.push(firstAI); // Pushed inside createNewAIPlayer now

    // <<< MOVE AND FIX: Initialize AI collision status AFTER AIs are created >>>
    if(setPreviousFrameAICollisionStatus) {
        const initialAIStatus = aiPlayers.map(() => false); // Create array of 'false' for each AI
        setPreviousFrameAICollisionStatus(initialAIStatus);
        // console.log(`[resetGame] Initialized previousFrameAICollisionStatus: [${initialAIStatus.join(', ')}]`);
    }
    // <<< END FIX >>>

    // Reset camera immediately
    if (snakeHead1 && camera) { // Use the potentially newly created snakeHead1
        targetLookAt.copy(snakeTargetPosition1);
        cameraOffset.copy(snakeDirection1).multiplyScalar(-cameraDistanceBehind);
        cameraOffset.y = cameraHeight;
        camera.position.copy(snakeTargetPosition1).add(cameraOffset);
        camera.lookAt(targetLookAt);
    }

    // --- MOVED: Call revertHeadColors AFTER player and AI heads are setup ---
    revertHeadColors(); 

    // Reset trackers and timers
    if(setLastTrailSegment1) setLastTrailSegment1(null);
    const now = performance.now();
    if(setLastUpdateTimeP1) setLastUpdateTimeP1(now);

    // Reset Player Ammo
    updateAmmoIndicatorP1();

    // Reset AI Ammo (handled within AI object creation/reset)
    
    // Reset unlock tracking for the new game
    unlockedScoresThisGame.clear();

    // --- Reset UI Styles --- 
    // Ensure top score text starts with default style
    if (topScoreTextElement) {
        const originalSize = topScoreTextElement.dataset.originalFontSize || '18px';
        const originalColor = topScoreTextElement.dataset.originalColor || 'rgba(255, 255, 255, 0.9)';
        topScoreTextElement.textContent = `Top Score: ${topScore}`; // Update text content just in case
        topScoreTextElement.style.fontSize = originalSize;
        topScoreTextElement.style.color = originalColor;
    }
    // Optionally reset other dynamic UI styles here if needed

    // Log final state before exiting resetGame
    // console.log(`[resetGame] Exiting. P1 Pos: (${snakeTargetPosition1.x.toFixed(1)}, ${snakeTargetPosition1.z.toFixed(1)}) Dir: (${snakeDirection1.x.toFixed(1)}, ${snakeDirection1.z.toFixed(1)})`);
}

function onWindowResize() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

export function init() {
    console.log(`Starting TronSnake Game ${GAME_VERSION}`); // <<< ADDED VERSION LOG
    
    // Scene
    const newScene = new THREE.Scene();
    newScene.background = new THREE.Color(0x111111);
    if(setScene) setScene(newScene);

    // Camera
    const newCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    if(setCamera) setCamera(newCamera);

    // Renderer
    const newRenderer = new THREE.WebGLRenderer({ antialias: true });
    newRenderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(newRenderer.domElement);
    if(setRenderer) setRenderer(newRenderer);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    newScene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    newScene.add(directionalLight);

    // Initial Boundary Values (set state)
    const bXMin = -initialBoundaryHalfSize;
    const bXMax = initialBoundaryHalfSize;
    const bZMin = -initialBoundaryHalfSize;
    const bZMax = initialBoundaryHalfSize;
    if(setBoundaryXMin) setBoundaryXMin(bXMin);
    if(setBoundaryXMax) setBoundaryXMax(bXMax);
    if(setBoundaryZMin) setBoundaryZMin(bZMin);
    if(setBoundaryZMax) setBoundaryZMax(bZMax);

    // Create initial Plane and Grid
    createPlayAreaVisuals(bXMin, bXMax, bZMin, bZMax);

    // Initial Snake Heads
    const headSize = segmentSize * 1.05;
    const headGeometry = new THREE.BoxGeometry(headSize, headSize, headSize);
    const newSnakeHead1 = new THREE.Mesh(headGeometry.clone(), headMaterial1);
    const startPos1X = snapToGridCenter(bXMin + segmentSize, 'x');
    const startPos1Z = snapToGridCenter(0, 'z');
    newSnakeHead1.position.set(startPos1X, 0, startPos1Z);
    snakeTargetPosition1.set(startPos1X, 0, startPos1Z);
    prevTargetPos1.copy(snakeTargetPosition1);
    newScene.add(newSnakeHead1);
    if(setSnakeHead1) setSnakeHead1(newSnakeHead1);

    // --- MOVE First AI Initialization LATER --- 
    // const aiStartX = snapToGridCenter(boundaryXMax - segmentSize, 'x');
    // const aiStartZ = snapToGridCenter(0, 'z');
    // createNewAIPlayer(aiStartX, aiStartZ, -1, 0); // <<< MOVED >>>
    
    // Initial camera position
    targetLookAt.copy(snakeTargetPosition1);
    const initialCameraOffset = snakeDirection1.clone().multiplyScalar(-cameraDistanceBehind);
    initialCameraOffset.y = cameraHeight;
    newCamera.position.copy(snakeTargetPosition1).add(initialCameraOffset);
    newCamera.lookAt(targetLookAt);

    // Event Listeners
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('keydown', onKeyDown, false);
    window.addEventListener('keyup', onKeyUp, false);
    window.addEventListener('click', handleFirstClick);
    window.addEventListener('click', handleDebugClick);
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: false });
    document.addEventListener('visibilitychange', handleVisibilityChange, false);

    // Create UI Elements
    createGameOverText(); 
    createVersionText();
    createScoreText();
    createPauseIndicator();
    createGitHubLink();
    createItchLink();
    // Top score text created after loading score

    // Timing Init
    const now = performance.now();
    if(setLastUpdateTimeP1) setLastUpdateTimeP1(now);

    // --- Add Download Button --- (COMMENTING OUT)
    /*
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = 'Download Error Log';
    downloadBtn.style.position = 'fixed';
    downloadBtn.style.bottom = '10px';
    downloadBtn.style.right = '10px';
    downloadBtn.style.zIndex = '1000'; // Ensure it's visible
    downloadBtn.onclick = downloadErrorLogFile; // Use the function defined above
    document.body.appendChild(downloadBtn);
    */
    // --- End Download Button ---

    // Load Font -> Then Load Top Score -> Then Create remaining UI -> Spawn Pickups -> Start Game
    const fontLoader = new FontLoader();
    fontLoader.load(
        // 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/fonts/helvetiker_regular.typeface.json',
        'Assets/Fonts/helvetiker_regular.typeface.json', // MODIFIED: Load from local path with correct casing
        (loadedFont) => {
            console.log("Font loaded.");
            if(setTextFont) setTextFont(loadedFont);
            
            // Load Top Score
            const storedTopScore = localStorage.getItem('tronSnakeTopScore');
            let loadedScore = 0; // Use a temporary variable
            if (storedTopScore) {
                const parsedScore = parseInt(storedTopScore, 10);
                if (!isNaN(parsedScore)) {
                    loadedScore = parsedScore;
                    console.log(`[Init] Loaded top score: ${loadedScore}`);
                } else {
                    console.warn(`[Init] Invalid top score in localStorage: ${storedTopScore}`);
                }            
            }
            // Set both topScore and topScoreAtGameStart from the loaded value
            if(setTopScore) setTopScore(loadedScore);
            if(setTopScoreAtGameStart) setTopScoreAtGameStart(loadedScore);
            console.log(`[Init] Set topScore=${topScore}, topScoreAtGameStart=${topScoreAtGameStart}`);

            // Now create UI elements that depend on top score
            createTopScoreText(); 
            createOpeningDialog(); 
            initializePickupTemplates(); 
            updateAmmoIndicatorP1(); 
            // updateAmmoIndicatorAI(); // Needs rework
            
            // <<< CREATE Initial AI HERE, just before starting loop >>>
            const aiStartX = snapToGridCenter(boundaryXMax - segmentSize, 'x');
            const aiStartZ = snapToGridCenter(0, 'z');
            createNewAIPlayer(aiStartX, aiStartZ, -1, 0); 
            console.log(`[Init] Initial AI created after font load.`);
            // <<< END Initial AI Creation >>>

            spawnInitialPickups(); 

            // Start the animation loop AFTER font, score, UI, AI, and initial pickups are ready
            animate(performance.now());
        },
        // onProgress callback (optional)
        (xhr) => {
            // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        // onError callback
        (err) => {
            console.error('An error happened loading the font:', err);
             // Optionally, provide a fallback or start loop anyway?
             // Fallback: Attempt to continue without the font if loading fails
             console.warn("Continuing without custom font due to loading error.");
             initializePickupTemplates(); 
             updateAmmoIndicatorP1(); 
             createTopScoreText(); 
             createOpeningDialog(); 

             // <<< ALSO CREATE Initial AI HERE in error case >>>
             const aiStartX = snapToGridCenter(boundaryXMax - segmentSize, 'x');
             const aiStartZ = snapToGridCenter(0, 'z');
             createNewAIPlayer(aiStartX, aiStartZ, -1, 0); 
             console.log(`[Init] Initial AI created in font error fallback.`);
             // <<< END Initial AI Creation >>>

             spawnInitialPickups(); // <-- Also call here in error case if templates might partially work?
             animate(performance.now());
        }
    );
}

// Start the game initialization
init(); 