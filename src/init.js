// The main init function and related setup will be moved here. This will be the entry point. 

// Entry point for the game
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import {
    scene, camera, renderer, planeMesh, gridMesh, // Core Three elements
    snakeHead1, snakeHead2, snakeTargetPosition1, snakeTargetPosition2, prevTargetPos1, prevTargetPos2, snakeDirection1, snakeDirection2,
    headMaterial1, headMaterial2, // Snake materials
    trailSegments1, trailSegments2, // Trail arrays
    scoreP1, topScore, topScoreAtGameStart, pickupsCollectedCounter, unlockedScoresThisGame, // Score & unlock state
    isSpeedBoostActiveP1, speedBoostEndTimeP1, isZoomedOutP1, zoomOutEndTimeP1, zoomLevelP1, isSparseTrailActiveP1, sparseTrailEndTimeP1, trailCounterP1, sparseLevelP1, ammoCountP1,
    isSpeedBoostActiveAI, speedBoostEndTimeAI, isSparseTrailActiveAI, sparseTrailEndTimeAI, trailCounterAI, sparseLevelAI, ammoCountAI,
    boundaryXMin, boundaryXMax, boundaryZMin, boundaryZMax, // Boundaries
    maxScorePickups, maxExpansionPickups, maxClearPickups, maxZoomPickups, maxSparseTrailPickups, maxAmmoPickups, maxMultiSpawnPickups, maxAddAiPickups, // Max pickups
    floatingTexts, explosionParticles, projectiles, // Effect arrays
    targetLookAt, cameraOffset, // Camera helpers
    // Import UI Elements needed in resetGame
    topScoreTextElement,
    // State Setters
    setScene, setCamera, setRenderer, setSnakeHead1, setSnakeHead2, setTopScore, setTopScoreAtGameStart,
    setLastUpdateTimeP1, setLastUpdateTimeAI, setLastFrameTime,
    setIsGameOver, setWinner, setScoreP1, setSpeedBoostActiveP1, setSpeedBoostEndTimeP1, setIsZoomedOutP1, setZoomOutEndTimeP1,
    setZoomLevelP1, setIsSparseTrailActiveP1, setSparseTrailEndTimeP1, setTrailCounterP1, setSparseLevelP1,
    setSpeedBoostActiveAI, setSpeedBoostEndTimeAI, setIsSparseTrailActiveAI, setSparseTrailEndTimeAI, setTrailCounterAI, setSparseLevelAI,
    setPickupsCollectedCounter, setBoundaryXMin, setBoundaryXMax, setBoundaryZMin, setBoundaryZMax,
    setLastTrailSegment1, setLastTrailSegment2, setAmmoCountP1, setAmmoCountAI,
    setMaxScorePickups, setMaxExpansionPickups, setMaxClearPickups, setMaxZoomPickups, setMaxSparseTrailPickups, setMaxMultiSpawnPickups, setMaxAddAiPickups, setMaxAmmoPickups,
    setGameActive, setTextFont, setOpeningDialogElement, setGameOverTextElement, setVersionTextElement, setScoreTextElement, setTopScoreTextElement,
    // Import setters for new counters
    setNextAmmoSpawnCount, setNextClearSpawnCount, setNextAddAiSpawnCount, setNextExpansionSpawnCount, setNextMultiSpawnCount,
    // Make sure pickup arrays are imported
    scorePickups, expansionPickups, clearPickups, zoomPickups, sparseTrailPickups, multiSpawnPickups, addAiPickups, ammoPickups,
} from './state.js';
import {
    initialBoundaryHalfSize, segmentSize, cameraHeight, cameraDistanceBehind, P1_HEAD_COLOR_NORMAL, AI_HEAD_COLOR_NORMAL,
    AMMO_PICKUP_THRESHOLD, CLEAR_WALL_PICKUP_THRESHOLD, ADD_AI_PICKUP_THRESHOLD, EXPAND_PICKUP_THRESHOLD, MULTI_PICKUP_THRESHOLD
} from './constants.js';
import { snapToGridCenter } from './utils.js';
import { onKeyDown, onKeyUp, onTouchStart, onTouchEnd, handleFirstClick, startGame } from './playerControls.js';
import { spawnInitialPickups } from './pickups.js';
import { createPlayAreaVisuals, initializePickupTemplates, updateAmmoIndicatorP1, updateAmmoIndicatorAI, clearAllTrails, clearFloatingTexts, clearExplosionParticles, revertHeadColors } from './visuals.js';
import { createOpeningDialog, createGameOverText, createVersionText, createScoreText, createTopScoreText } from './ui.js';
import { clearAllProjectiles } from './projectile.js';
import { animate } from './gameLoop.js';

export function resetGame() {
    console.log(`--- Entering resetGame ---`);
    // Capture top score at the start of reset
    console.log(`[resetGame] Value of topScore BEFORE assignment: ${topScore}`);
    if(setTopScoreAtGameStart) setTopScoreAtGameStart(topScore);
    console.log(`[resetGame] Value of topScoreAtGameStart AFTER assignment: ${topScoreAtGameStart}`);

    // Reset flags and scores
    if(setIsGameOver) setIsGameOver(false);
    if(setWinner) setWinner(0);
    if(setScoreP1) setScoreP1(0);
    if(setSpeedBoostActiveP1) setSpeedBoostActiveP1(false);
    if(setSpeedBoostEndTimeP1) setSpeedBoostEndTimeP1(0);
    if(setIsZoomedOutP1) setIsZoomedOutP1(false);
    if(setZoomOutEndTimeP1) setZoomOutEndTimeP1(0);
    if(setZoomLevelP1) setZoomLevelP1(0);
    if(setIsSparseTrailActiveP1) setIsSparseTrailActiveP1(false);
    if(setSparseTrailEndTimeP1) setSparseTrailEndTimeP1(0);
    if(setTrailCounterP1) setTrailCounterP1(0);
    if(setSparseLevelP1) setSparseLevelP1(1);
    if(setSpeedBoostActiveAI) setSpeedBoostActiveAI(false);
    if(setSpeedBoostEndTimeAI) setSpeedBoostEndTimeAI(0);
    if(setIsSparseTrailActiveAI) setIsSparseTrailActiveAI(false);
    if(setSparseTrailEndTimeAI) setSparseTrailEndTimeAI(0);
    if(setTrailCounterAI) setTrailCounterAI(0);
    if(setSparseLevelAI) setSparseLevelAI(1);
    if(setPickupsCollectedCounter) setPickupsCollectedCounter(0);

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

    // Reset Pickups & Counters
    // spawnInitialPickups(); // Keep removed - initial spawn happens in init only // <-- Comment is now wrong
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

    // Spawn a fresh set of initial pickups AFTER clearing and resetting counters
    spawnInitialPickups(); // <-- RE-ADD call here

    // Reset snake positions
    const startPos1X = snapToGridCenter(bXMin + segmentSize, 'x');
    const startPos1Z = snapToGridCenter(0, 'z');
    if(snakeHead1) snakeHead1.position.set(startPos1X, 0, startPos1Z);
    snakeTargetPosition1.set(startPos1X, 0, startPos1Z);
    prevTargetPos1.copy(snakeTargetPosition1);
    snakeDirection1.set(1, 0, 0);
    // headMaterial1 color already reset by revertHeadColors

    const startPos2X = snapToGridCenter(bXMax - segmentSize, 'x');
    const startPos2Z = snapToGridCenter(0, 'z');
    if(snakeHead2) snakeHead2.position.set(startPos2X, 0, startPos2Z);
    snakeTargetPosition2.set(startPos2X, 0, startPos2Z);
    prevTargetPos2.copy(snakeTargetPosition2);
    snakeDirection2.set(-1, 0, 0);
    // headMaterial2 color already reset by revertHeadColors

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
    if(setLastTrailSegment2) setLastTrailSegment2(null);
    const now = performance.now();
    if(setLastUpdateTimeP1) setLastUpdateTimeP1(now);
    if(setLastUpdateTimeAI) setLastUpdateTimeAI(now);
    if(setLastFrameTime) setLastFrameTime(now);

    // Reset Ammo
    if(setAmmoCountP1) setAmmoCountP1(0);
    updateAmmoIndicatorP1();
    if(setAmmoCountAI) setAmmoCountAI(0);
    updateAmmoIndicatorAI();

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

    const newSnakeHead2 = new THREE.Mesh(headGeometry.clone(), headMaterial2);
    const startPos2X = snapToGridCenter(bXMax - segmentSize, 'x');
    const startPos2Z = snapToGridCenter(0, 'z');
    newSnakeHead2.position.set(startPos2X, 0, startPos2Z);
    snakeTargetPosition2.set(startPos2X, 0, startPos2Z);
    prevTargetPos2.copy(snakeTargetPosition2);
    newScene.add(newSnakeHead2);
    if(setSnakeHead2) setSnakeHead2(newSnakeHead2);

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

    // Create UI Elements
    createGameOverText(); // Creates element, stores in state via setter
    createVersionText();
    createScoreText();
    // Top score text created after loading score

    // Timing Init
    const now = performance.now();
    if(setLastUpdateTimeP1) setLastUpdateTimeP1(now);
    if(setLastUpdateTimeAI) setLastUpdateTimeAI(now);
    if(setLastFrameTime) setLastFrameTime(now);

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
            updateAmmoIndicatorAI();
            
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
             updateAmmoIndicatorAI();
             createTopScoreText(); 
             createOpeningDialog(); 
             spawnInitialPickups(); // <-- Also call here in error case if templates might partially work?
             animate(performance.now());
        }
    );
}

// Start the game initialization
init(); 