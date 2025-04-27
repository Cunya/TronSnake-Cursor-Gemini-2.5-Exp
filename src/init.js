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
    setPreviousFrameAICollisionStatus
} from './state.js';
import {
    initialBoundaryHalfSize, segmentSize, cameraHeight, cameraDistanceBehind, P1_HEAD_COLOR_NORMAL,
    AMMO_PICKUP_THRESHOLD, CLEAR_WALL_PICKUP_THRESHOLD, ADD_AI_PICKUP_THRESHOLD, EXPAND_PICKUP_THRESHOLD, MULTI_PICKUP_THRESHOLD,
    AI_COLORS
} from './constants.js';
import { snapToGridCenter } from './utils.js';
import { onKeyDown, onKeyUp, onTouchStart, onTouchEnd, handleFirstClick, startGame } from './playerControls.js';
import { spawnInitialPickups } from './pickups.js';
import { createPlayAreaVisuals, initializePickupTemplates, updateAmmoIndicatorP1, updateAmmoIndicatorAI, clearAllTrails, clearFloatingTexts, clearExplosionParticles, revertHeadColors } from './visuals.js';
import { createOpeningDialog, createGameOverText, createVersionText, createScoreText, createTopScoreText, createPauseIndicator, createGitHubLink } from './ui.js';
import { clearAllProjectiles } from './projectile.js';
import { animate } from './gameLoop.js';
import { isPositionSafe } from './ai.js';

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
export function createNewAIPlayer(scene, startX, startZ, startDirX, startDirZ) {
    const colorIndex = aiPlayers.length % AI_COLORS.length; // Cycle through colors
    const assignedColors = AI_COLORS[colorIndex];

    const headSize = segmentSize * 1.05;
    const headGeometry = new THREE.BoxGeometry(headSize, headSize, headSize);
    // Use the assigned normal color for the material
    const headMaterial = new THREE.MeshPhongMaterial({ color: assignedColors.normal }); 
    const snakeHead = new THREE.Mesh(headGeometry, headMaterial);
    const targetPosition = new THREE.Vector3(startX, 0, startZ);
    const prevTargetPos = new THREE.Vector3(startX, 0, startZ);
    const direction = new THREE.Vector3(startDirX, 0, startDirZ);
    
    snakeHead.position.copy(targetPosition);
    scene.add(snakeHead);

    return {
        id: `ai-${aiPlayers.length}`, // Simple unique ID
        head: snakeHead,
        targetPosition: targetPosition,
        prevTargetPos: prevTargetPos,
        direction: direction,
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
        ammoIndicator: null // Will need to be created/updated separately
    };
}

export function resetGame() {
    console.log(`--- Entering resetGame ---`);
    // Capture top score at the start of reset
    console.log(`[resetGame] Value of topScore BEFORE assignment: ${topScore}`);
    if(setTopScoreAtGameStart) setTopScoreAtGameStart(topScore);
    console.log(`[resetGame] Value of topScoreAtGameStart AFTER assignment: ${topScoreAtGameStart}`);

    // Reset flags and scores
    if(setIsGameOver) setIsGameOver(false);
    if(setIsPaused) setIsPaused(false);
    if(setWinner) setWinner(0);
    if(setScoreP1) setScoreP1(0);
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
    revertHeadColors(); // Reset head colors to normal

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

    // --- Reset AI Players --- 
    // Remove existing AI visuals and clear the array
    aiPlayers.forEach(ai => {
        if (ai.head && scene) scene.remove(ai.head);
        if (ai.ammoIndicator && scene) scene.remove(ai.ammoIndicator);
        // Clear AI trails individually if needed, or rely on clearAllTrails
        ai.trailSegments.forEach(seg => scene.remove(seg)); // Safer to clear here
    });
    aiPlayers.length = 0; // Clear the main array
    
    // Reset Max Pickup Counts
    if(setMaxScorePickups) setMaxScorePickups(1);
    if(setMaxExpansionPickups) setMaxExpansionPickups(1);
    if(setMaxClearPickups) setMaxClearPickups(1);
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
    spawnInitialPickups();

    // Reset player 1 snake position
    const startPos1X = snapToGridCenter(bXMin + segmentSize, 'x');
    const startPos1Z = snapToGridCenter(0, 'z');
    if(snakeHead1) snakeHead1.position.set(startPos1X, 0, startPos1Z);
    snakeTargetPosition1.set(startPos1X, 0, startPos1Z);
    prevTargetPos1.copy(snakeTargetPosition1);
    snakeDirection1.set(1, 0, 0);
    // headMaterial1 color already reset by revertHeadColors

    // --- Initialize First AI --- 
    let aiSpawnPos = null;
    const maxSpawnAttempts = 50; // Limit attempts to find a spot
    console.log("[resetGame] Finding safe spawn for initial AI...");
    for (let attempt = 0; attempt < maxSpawnAttempts; attempt++) {
        // Try spawning near the right edge, moving inwards slightly
        const tryX = bXMax - segmentSize * (1 + Math.floor(attempt / 5)); // Move inwards every 5 attempts
        const tryZ = snapToGridCenter(0 + (Math.random() - 0.5) * (bZMax - bZMin) * 0.8, 'z'); // Random Z near center
        const potentialPos = new THREE.Vector3(snapToGridCenter(tryX, 'x'), 0, tryZ);

        // Check safety (against trails and pickups, not heads)
        if (isPositionSafe(potentialPos, null, true, false)) { 
            aiSpawnPos = potentialPos;
            console.log(`[resetGame] Found safe AI spawn at (${aiSpawnPos.x.toFixed(1)}, ${aiSpawnPos.z.toFixed(1)}) on attempt ${attempt + 1}`);
            break;
        }
    }
    // Fallback if no safe spot found (should be rare)
    if (!aiSpawnPos) {
        console.warn("[resetGame] Could not find safe spawn for initial AI, using default near edge.");
        aiSpawnPos = new THREE.Vector3(snapToGridCenter(bXMax - segmentSize, 'x'), 0, snapToGridCenter(0, 'z'));
    }

    // Create AI at the determined safe(r) position
    const firstAI = createNewAIPlayer(scene, aiSpawnPos.x, aiSpawnPos.z, -1, 0); // Start moving left
    aiPlayers.push(firstAI);
    // After adding the new AI(s), reset the collision status based on the current number of AIs
    if(setPreviousFrameAICollisionStatus) setPreviousFrameAICollisionStatus(aiPlayers.map(() => false));

    // Reset camera immediately
    if (snakeHead1 && camera) {
        targetLookAt.copy(snakeTargetPosition1);
        cameraOffset.copy(snakeDirection1).multiplyScalar(-cameraDistanceBehind);
        cameraOffset.y = cameraHeight;
        camera.position.copy(snakeTargetPosition1).add(cameraOffset);
        camera.lookAt(targetLookAt);
    }

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

    // --- Initialize First AI --- 
    const aiStartX = snapToGridCenter(bXMax - segmentSize, 'x');
    const aiStartZ = snapToGridCenter(0, 'z');
    const firstAI = createNewAIPlayer(newScene, aiStartX, aiStartZ, -1, 0); // Pass newScene
    aiPlayers.push(firstAI);
    
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
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: false });
    document.addEventListener('visibilitychange', handleVisibilityChange, false);

    // Create UI Elements
    createGameOverText(); 
    createVersionText();
    createScoreText();
    createPauseIndicator();
    createGitHubLink();
    // Top score text created after loading score

    // Timing Init
    const now = performance.now();
    if(setLastUpdateTimeP1) setLastUpdateTimeP1(now);

    // Load Font -> Then Load Top Score -> Then Create remaining UI -> Spawn Pickups -> Start Game
    const fontLoader = new FontLoader();
    fontLoader.load(
        'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/fonts/helvetiker_regular.typeface.json',
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
            
            spawnInitialPickups(); 

            // Start the animation loop AFTER font, score, UI, and initial pickups are ready
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
             initializePickupTemplates(); 
             updateAmmoIndicatorP1(); 
             createTopScoreText(); 
             createOpeningDialog(); 
             spawnInitialPickups(); // <-- Also call here in error case if templates might partially work?
             animate(performance.now());
        }
    );
}

// Start the game initialization
init(); 