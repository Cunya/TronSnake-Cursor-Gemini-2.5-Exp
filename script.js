// Add necessary imports for TextGeometry
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

import * as THREE from 'three';
// <<< IMPORTANT: Add these imports MANUALLY above the THREE import >>>
// import { FontLoader } from 'three/addons/loaders/FontLoader.js';
// import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

const GAME_VERSION = "v1.0.2"; // Add Multi-Spawn pickup

let scene, camera, renderer;
let planeMesh, gridMesh;

// Color Constants
const P1_HEAD_COLOR_NORMAL = 0x00ffff; // Cyan
const P1_TRAIL_COLOR_NORMAL = 0x00aaaa; // Dark Cyan
const P1_HEAD_COLOR_BOOST = 0x80ffff; // Lighter Cyan
const P1_TRAIL_COLOR_BOOST = 0x40cccc; // Lighter Dark Cyan

const AI_HEAD_COLOR_NORMAL = 0xff8800; // Orange
const AI_TRAIL_COLOR_NORMAL = 0xcc6600; // Dark Orange
const AI_HEAD_COLOR_BOOST = 0xffaa40; // Lighter Orange
const AI_TRAIL_COLOR_BOOST = 0xdd8840; // Lighter Dark Orange

// Player 1
let snakeHead1;
let snakeTargetPosition1 = new THREE.Vector3(); // Logical position
let prevTargetPos1 = new THREE.Vector3(); // Previous logical position
let snakeDirection1 = new THREE.Vector3(1, 0, 0); // Start moving right
const trailSegments1 = [];
let lastTrailSegment1 = null; // Track the last added segment for visibility
const headMaterial1 = new THREE.MeshPhongMaterial({ color: P1_HEAD_COLOR_NORMAL }); // Cyan
// Trail material - Base properties, color set per segment
const trailMaterial1_base = { side: THREE.DoubleSide }; // Example if we needed other props
let isSpeedBoostActiveP1 = false;
let speedBoostEndTimeP1 = 0;
let isZoomedOutP1 = false; // Player zoom state
let zoomOutEndTimeP1 = 0;
let isSparseTrailActiveP1 = false; // Sparse trail state
let sparseTrailEndTimeP1 = 0;
let trailCounterP1 = 0; // Counter for sparse trail placement
let lastUpdateTimeP1 = 0;

// Player 2 (AI)
let snakeHead2;
let snakeTargetPosition2 = new THREE.Vector3(); // Logical position
let prevTargetPos2 = new THREE.Vector3(); // Previous logical position
let snakeDirection2 = new THREE.Vector3(-1, 0, 0); // Start moving left
const trailSegments2 = [];
let lastTrailSegment2 = null; // Track the last added segment for visibility
const headMaterial2 = new THREE.MeshPhongMaterial({ color: AI_HEAD_COLOR_NORMAL }); // Orange
// Trail material - Base properties, color set per segment
const trailMaterial2_base = { side: THREE.DoubleSide }; // Example
let isSpeedBoostActiveAI = false;
let speedBoostEndTimeAI = 0;
let isSparseTrailActiveAI = false; // Sparse trail state
let sparseTrailEndTimeAI = 0;
let trailCounterAI = 0; // Counter for sparse trail placement
let lastUpdateTimeAI = 0;
let isLookingBack = false; // Flag for look back camera

// Common Game Settings
const segmentSize = 1;
const normalUpdateInterval = 250; // Normal speed
const boostedUpdateInterval = 125; // Faster speed (half interval)
const boostDuration = 3000; // milliseconds (3 seconds)
const zoomOutDuration = 5000; // 5 seconds zoom
const sparseTrailDuration = 8000; // 8 seconds sparse trail
const LERP_FACTOR = 0.2; // Smoothing factor for visual movement

// --- Dynamic Boundary --- 
const initialBoundaryHalfSize = 10;
let boundaryXMin = -initialBoundaryHalfSize;
let boundaryXMax = initialBoundaryHalfSize;
let boundaryZMin = -initialBoundaryHalfSize;
let boundaryZMax = initialBoundaryHalfSize;
const expansionAmount = 20; // Increased expansion amount

// Camera Settings
const cameraHeight = 3; // Lowered camera height further
const cameraDistanceBehind = 4;
const zoomedOutCameraHeight = cameraHeight * 1.8; // Zoom out height
const zoomedOutCameraDistanceBehind = cameraDistanceBehind * 1.8; // Zoom out distance
const cameraLag = 0.08; // Reverted to original value for maximum smoothness
// const lookBackDistance = 5; // Not used for positioning
const cameraViewShiftDistance = 25; 
const gameOverCameraLag = 0.06;

// Scoring & Pickups
let scoreP1 = 0;
const scoreIncrementPerTick = 1; // Score for surviving a tick
const pickupScoreValue = 50;    // Score for getting a pickup
const scorePickups = []; // Renamed array
const scorePickupGeometry = new THREE.BoxGeometry(segmentSize * 0.6, segmentSize * 0.6, segmentSize * 0.6); // Smaller sphere
const scorePickupMaterial = new THREE.MeshPhongMaterial({ color: 0xff00ff, emissive: 0x550055 }); // Bright Pink
const maxScorePickups = 1; // Only one pickup on screen at a time

// Expansion Pickup
const expansionPickups = [];
const expansionPickupGeometry = new THREE.BoxGeometry(segmentSize * 0.7, segmentSize * 0.7, segmentSize * 0.7);
const expansionPickupMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00, emissive: 0x005500 }); // Green
const maxExpansionPickups = 1;
const expansionPickupSpawnChance = 0.15; // Reduced chance slightly
const aiPickupScanRadius = 7; // Increased scan radius slightly

// Clear Wall Pickup
const clearPickups = [];
const clearPickupGeometry = new THREE.BoxGeometry(segmentSize * 0.5, segmentSize * 0.5, segmentSize * 0.5); // Smallest cube
const clearPickupMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xaaaaaa }); // White/Bright
const maxClearPickups = 1;
const clearPickupSpawnChance = 0.10; // Lower chance

// Zoom Pickup
const zoomPickups = [];
const zoomPickupGeometry = new THREE.BoxGeometry(segmentSize * 0.5, segmentSize * 0.5, segmentSize * 0.5); 
const zoomPickupMaterial = new THREE.MeshPhongMaterial({ color: 0x0088ff, emissive: 0x0033aa }); // Blue
const maxZoomPickups = 1;
const zoomPickupSpawnChance = 0.10; // Same chance as clear pickup

// Sparse Trail Pickup
const sparseTrailPickups = [];
// Geometry is now created by a function
// const sparseTrailGeometry = new THREE.TorusGeometry(segmentSize * 0.35, segmentSize * 0.1, 8, 16);
const sparseTrailMaterial = new THREE.MeshPhongMaterial({ color: 0xffff00, emissive: 0xaaaa00 }); // Yellow
const maxSparseTrailPickups = 1;
const sparseTrailPickupSpawnChance = 0.08; 

// Multi-Spawn Pickup
const multiSpawnPickups = [];
const multiSpawnGeometry = new THREE.IcosahedronGeometry(segmentSize * 0.45, 0); // Icosahedron, radius 0.45
const multiSpawnMaterial = new THREE.MeshPhongMaterial({ color: 0x9900ff, emissive: 0x5500aa }); // Purple
const maxMultiSpawnPickups = 1;
const multiSpawnPickupSpawnChance = 0.07; // Make it slightly rarer

// Game state
let isGameOver = false;
let gameActive = false; // New state: controls if game logic runs
let winner = 0; // 0 = ongoing, 1 = Player 1 wins, 2 = AI wins, 3 = Draw
const yAxis = new THREE.Vector3(0, 1, 0); // Define Y axis for rotation

// DOM Elements
let gameOverTextElement;
let versionTextElement;
let openingDialogElement; // New element for opening dialog
let scoreTextElement; // New element for score

const epsilon = 0.01; // Small tolerance for floating point comparisons

const gridLineMaterial = new THREE.LineBasicMaterial({ color: 0x555555 }); // Material for custom grid

// Temporary vectors for camera calculations
const cameraTargetPosition = new THREE.Vector3();
const cameraOffset = new THREE.Vector3();
const targetLookAt = new THREE.Vector3();
const gameOverLookAtTarget = new THREE.Vector3();
const gameOverCameraTargetPosition = new THREE.Vector3();
const lookBackPosition = new THREE.Vector3(); // Can likely be removed if not used
const viewShiftPoint = new THREE.Vector3(); // Renamed from lookAheadPoint

// --- Particle Effect Vars ---
const explosionParticles = [];
let lastFrameTime = 0; // For particle physics delta time
const PARTICLE_COUNT = 60; // Doubled particle count
const PARTICLE_SIZE = 0.15; // Relative to segmentSize
const EXPLOSION_FORCE = 5.0;
const PARTICLE_GRAVITY = -9.8;
const PARTICLE_LIFE = 10.0; // Seconds (Significantly increased duration)
const GROUND_Y = -segmentSize / 2; // Ground level for particles

// --- Font Variable ---
let textFont = null;

// --- Floating Text Vars ---
const floatingTexts = [];
const TEXT_LIFE = 3.0; // Seconds (Increased duration)
const TEXT_MOVE_SPEED = 1.5; // Units per second upwards
const TEXT_SIZE = 0.3;
const TEXT_HEIGHT_OFFSET = 0.5; // Start slightly above pickup

// --- Top Score State ---
let topScore = 0;

// Pickup checks use TARGET positions and check XZ distance with LARGER threshold
const PICKUP_COLLISION_THRESHOLD_SQ = (segmentSize * 0.5) * (segmentSize * 0.5);

// Helper function to get grid center coordinate from world coordinate
function snapToGridCenter(value, axis) {
    const minBound = (axis === 'x') ? boundaryXMin : boundaryZMin;
    // Find the index of the grid cell the value is *within*
    const gridIndex = Math.floor((value - minBound) / segmentSize);
    // Calculate the center coordinate of that cell
    const cellCenter = minBound + (gridIndex * segmentSize) + (segmentSize / 2);
    return cellCenter;
}

function getGridDimensions() {
    const divisionsX = Math.round((boundaryXMax - boundaryXMin) / segmentSize);
    const divisionsZ = Math.round((boundaryZMax - boundaryZMin) / segmentSize);
    return { divisionsX, divisionsZ };
}

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Initial position set later

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // Create initial Plane and Grid
    createPlayAreaVisuals(boundaryXMin, boundaryXMax, boundaryZMin, boundaryZMax);

    // Initial Snake Heads (Materials are already using NORMAL constants)
    const headSize = segmentSize * 1.05;
    const headGeometry = new THREE.BoxGeometry(headSize, headSize, headSize);
    snakeHead1 = new THREE.Mesh(headGeometry.clone(), headMaterial1); 
    const startPos1X = snapToGridCenter(boundaryXMin + segmentSize, 'x');
    const startPos1Z = snapToGridCenter(0, 'z');
    snakeHead1.position.set(startPos1X, 0, startPos1Z); 
    snakeTargetPosition1.set(startPos1X, 0, startPos1Z); 
    prevTargetPos1.copy(snakeTargetPosition1); 
    scene.add(snakeHead1);

    snakeHead2 = new THREE.Mesh(headGeometry.clone(), headMaterial2);
    const startPos2X = snapToGridCenter(boundaryXMax - segmentSize, 'x');
    const startPos2Z = snapToGridCenter(0, 'z');
    snakeHead2.position.set(startPos2X, 0, startPos2Z); 
    snakeTargetPosition2.set(startPos2X, 0, startPos2Z); 
    prevTargetPos2.copy(snakeTargetPosition2); 
    scene.add(snakeHead2);

    // Initial camera position (based on target)
    targetLookAt.copy(snakeTargetPosition1); 
    const initialCameraOffset = snakeDirection1.clone().multiplyScalar(-cameraDistanceBehind);
    initialCameraOffset.y = cameraHeight;
    camera.position.copy(snakeTargetPosition1).add(initialCameraOffset); 
    camera.lookAt(targetLookAt);

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Add keyboard controls listener
    window.addEventListener('keydown', onKeyDown, false);
    window.addEventListener('keyup', onKeyUp, false); // Add keyup listener
    window.addEventListener('click', handleFirstClick); // Add click listener too

    // Add Game Over text display
    createOpeningDialog(); // Create the opening dialog
    createGameOverText();
    createVersionText();
    createScoreText(); // Create score display

    // Spawn initial pickup(s)
    spawnInitialPickups();

    lastUpdateTimeP1 = performance.now(); // Initialize P1 timer
    lastUpdateTimeAI = performance.now(); // Initialize AI timer
    lastFrameTime = performance.now(); // Initialize frame timer

    // Load Top Score
    const storedTopScore = localStorage.getItem('tronSnakeTopScore');
    if (storedTopScore) {
        topScore = parseInt(storedTopScore, 10) || 0; // Parse or default to 0
        console.log(`Loaded Top Score: ${topScore}`);
    } else {
        console.log("No previous top score found.");
    }

    animate();
}

function startGame() {
    if (gameActive) return; // Prevent starting multiple times
    gameActive = true;
    openingDialogElement.style.display = 'none';
    lastUpdateTimeP1 = performance.now(); // Reset P1 timer
    lastUpdateTimeAI = performance.now(); // Reset AI timer
    // Remove the initial interaction listeners once the game starts
    window.removeEventListener('click', handleFirstClick);
}

// Use named function for easier removal
function handleFirstClick() {
    startGame();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
    if (isGameOver) {
        // Any key press restarts when game is over
        resetGame();
        return; // Prevent other actions when game is over
    }
    if (gameActive) { 
        switch (event.key) {
            case 'ArrowLeft':
                snakeDirection1.applyAxisAngle(yAxis, Math.PI / 2);
                break;
            case 'ArrowRight':
                 snakeDirection1.applyAxisAngle(yAxis, -Math.PI / 2);
                break;
            case 'ArrowDown':
                event.preventDefault(); // Prevent page scroll
                isLookingBack = true;
                break;
        }
    }
}

// Add keyup handler
function onKeyUp(event) {
    if (event.key === 'ArrowDown') {
        isLookingBack = false;
    }
}

function createTrailSegment(position, trailArray, playerIndex) { 
    const segmentGeometry = new THREE.BoxGeometry(segmentSize, segmentSize, segmentSize);
    
    let segmentColor;
    if (playerIndex === 1) {
        segmentColor = isSpeedBoostActiveP1 ? P1_TRAIL_COLOR_BOOST : P1_TRAIL_COLOR_NORMAL;
    } else { // Player 2
        segmentColor = isSpeedBoostActiveAI ? AI_TRAIL_COLOR_BOOST : AI_TRAIL_COLOR_NORMAL;
    }
    
    // Create a new material instance for this segment
    const segmentMaterial = new THREE.MeshPhongMaterial({ 
        color: segmentColor
        // Add other base properties if needed, e.g., ...trailMaterial1_base
    });

    const trailSegment = new THREE.Mesh(segmentGeometry, segmentMaterial);
    trailSegment.position.copy(position); 

    // Visibility logic remains the same
    if (playerIndex === 1) {
        if (lastTrailSegment1) lastTrailSegment1.visible = true;
        trailSegment.visible = false;
        lastTrailSegment1 = trailSegment;
    } else { 
        if (lastTrailSegment2) lastTrailSegment2.visible = true;
        trailSegment.visible = false;
        lastTrailSegment2 = trailSegment;
    }

    scene.add(trailSegment);
    trailArray.push(trailSegment);
}

function isPositionSafe(pos, checkOwnTrail = true, checkHeads = true) {
    const checkPos = new THREE.Vector3(snapToGridCenter(pos.x, 'x'), 0, snapToGridCenter(pos.z, 'z'));
    const collisionThreshold = segmentSize * epsilon; // Use epsilon for threshold

    // Boundary check: Is the snapped center outside the boundary limits (with tolerance)?
    if (checkPos.x < boundaryXMin + epsilon || 
        checkPos.x > boundaryXMax - epsilon || 
        checkPos.z < boundaryZMin + epsilon || 
        checkPos.z > boundaryZMax - epsilon) {
        // console.log("Boundary FAIL in isPositionSafe for pos:", pos, "Snapped checkPos:", checkPos);
        return false;
    }
    
    // Trail & Head checks (use small threshold)
    for (let segment of trailSegments1) {
        if (checkPos.distanceTo(segment.position) < collisionThreshold) return false;
    }
    for (let segment of trailSegments2) {
        if (checkPos.distanceTo(segment.position) < collisionThreshold) return false;
    }
    if (checkHeads) {
        // Compare against snapped head positions
        const head1SnappedPos = new THREE.Vector3(snapToGridCenter(snakeHead1.position.x, 'x'), 0, snapToGridCenter(snakeHead1.position.z, 'z'));
        const head2SnappedPos = new THREE.Vector3(snapToGridCenter(snakeHead2.position.x, 'x'), 0, snapToGridCenter(snakeHead2.position.z, 'z'));
        if (checkPos.distanceTo(head1SnappedPos) < collisionThreshold) return false;
        if (checkPos.distanceTo(head2SnappedPos) < collisionThreshold) return false; 
    }
    return true;
}

// --- Updated AI Logic --- 
function updateAIPlayer() {
    const currentPos = snakeTargetPosition2;
    const currentDir = snakeDirection2;
    const lookAheadSteps = 2; // How many steps ahead to check for avoidance

    // --- Identify Target Pickup --- 
    let targetPickupPos = null;
    let closestDistSq = aiPickupScanRadius * aiPickupScanRadius;
    const allPickups = [
        ...scorePickups, 
        ...expansionPickups, 
        ...clearPickups, 
        ...zoomPickups,
        ...sparseTrailPickups,
        ...multiSpawnPickups // Scan for multi-spawn
    ]; 
    for (const pickup of allPickups) {
        const distSq = currentPos.distanceToSquared(pickup.position);
        if (distSq < closestDistSq) {
            closestDistSq = distSq;
            targetPickupPos = pickup.position;
        }
    }

    // --- Evaluate Immediate Safe Moves --- 
    const safeMoves = []; // Stores safe directions { dir: Vector3, pos: Vector3 }
    const potentialDirections = {
        forward: currentDir,
        left: currentDir.clone().applyAxisAngle(yAxis, Math.PI / 2),
        right: currentDir.clone().applyAxisAngle(yAxis, -Math.PI / 2)
    };

    for (const moveName in potentialDirections) {
        const dir = potentialDirections[moveName];
        const nextPos = currentPos.clone().addScaledVector(dir, segmentSize);
        if (isPositionSafe(nextPos, true, true)) {
            safeMoves.push({ dir: dir.clone(), pos: nextPos });
        }
    }

    // --- Pickup Pursuit Logic --- 
    if (targetPickupPos && safeMoves.length > 0) {
        let bestMove = null;
        let minPickupDistSq = currentPos.distanceToSquared(targetPickupPos);

        for (const move of safeMoves) {
            const distSq = move.pos.distanceToSquared(targetPickupPos);
            if (distSq < minPickupDistSq) {
                minPickupDistSq = distSq;
                bestMove = move;
            }
        }

        // If a safe move gets us closer to the pickup, take it
        if (bestMove) {
             // console.log("AI pursuing pickup via safe move.");
             snakeDirection2.copy(bestMove.dir);
             return; 
        }
    }
    
    // --- Fallback: Obstacle Avoidance (with Lookahead) --- 
    // Check Forward (LookaheadSteps)
    let safeForward = true;
    for (let i = 1; i <= lookAheadSteps; i++) {
        const checkPos = currentPos.clone().addScaledVector(currentDir, segmentSize * i);
        if (!isPositionSafe(checkPos, true, true)) {
            safeForward = false;
            break;
        }
    }

    // Random chance to turn even if forward is safe
    if (safeForward && Math.random() < 0.9) { 
         // console.log("AI: Avoidance - Path forward clear, going straight.");
         return; 
    }
    
    // Evaluate Turns (LookaheadSteps + Escape Check)
    const safeTurns = [];   // Safe 2 steps AND has escape route
    const trapTurns = [];   // Safe 2 steps BUT NO escape route
    const backupTurns = []; // Safe only 1 step
    const turnDirections = [potentialDirections.left, potentialDirections.right];

    for (const turnDir of turnDirections) {
        let turnSafeLookahead = true;
        let turnSafeOneStep = false;
        for (let i = 1; i <= lookAheadSteps; i++) {
            const checkPos = currentPos.clone().addScaledVector(turnDir, segmentSize * i);
            if (!isPositionSafe(checkPos, true, true)) {
                turnSafeLookahead = false;
                if (i === 1) turnSafeOneStep = false; 
                break; 
            }
            if (i === 1) turnSafeOneStep = true;
        }

        if (turnSafeLookahead) {
            // Perform escape check
            const simPos = currentPos.clone().addScaledVector(turnDir, segmentSize);
            const simDir = turnDir; // Direction after the turn
            const escapeForwardPos = simPos.clone().addScaledVector(simDir, segmentSize);
            const escapeLeftDir = simDir.clone().applyAxisAngle(yAxis, Math.PI / 2);
            const escapeLeftPos = simPos.clone().addScaledVector(escapeLeftDir, segmentSize);
            const escapeRightDir = simDir.clone().applyAxisAngle(yAxis, -Math.PI / 2);
            const escapeRightPos = simPos.clone().addScaledVector(escapeRightDir, segmentSize);

            const escapeForwardSafe = isPositionSafe(escapeForwardPos, true, true);
            const escapeLeftSafe = isPositionSafe(escapeLeftPos, true, true);
            const escapeRightSafe = isPositionSafe(escapeRightPos, true, true);

            if (escapeForwardSafe || escapeLeftSafe || escapeRightSafe) {
                safeTurns.push(turnDir.clone()); // Good turn
            } else {
                trapTurns.push(turnDir.clone()); // Leads into a dead end
            }
        } else if (turnSafeOneStep) {
            backupTurns.push(turnDir.clone()); // Only safe for one step
        }
    }

    // Decision Making (Avoidance - Prioritize safe escape)
    if (safeTurns.length > 0) {
        const chosenTurnIndex = Math.floor(Math.random() * safeTurns.length);
        // console.log(`AI: Avoidance - Choosing safe turn (${safeTurns.length} options).`);
        snakeDirection2.copy(safeTurns[chosenTurnIndex]);
        return;
    } else if (trapTurns.length > 0) { // Accept trap over backup/crash
        const chosenTurnIndex = Math.floor(Math.random() * trapTurns.length);
        // console.log(`AI: Avoidance - Choosing trap turn (${trapTurns.length} options).`);
        snakeDirection2.copy(trapTurns[chosenTurnIndex]);
        return;
    } else if (backupTurns.length > 0) { // One step turn is better than crash
        const chosenTurnIndex = Math.floor(Math.random() * backupTurns.length);
        // console.log(`AI: Avoidance - Choosing backup turn (${backupTurns.length} options).`);
        snakeDirection2.copy(backupTurns[chosenTurnIndex]);
        return;
    } else if (safeForward) {
        // console.log("AI: Avoidance - Turns blocked/unsafe, forcing forward.");
         return; // Keep current direction (forward)
    } else {
        // console.log("AI: Avoidance - No safe moves detected, crashing forward.");
         return; // Keep current direction (forward)
    }
}

function checkCollisions(head1Pos, head2Pos, trail1, trail2) {
    let p1Lost = false;
    let p2Lost = false;
    const collisionThreshold = segmentSize * epsilon; // Use epsilon
    const head1SnappedPos = new THREE.Vector3(snapToGridCenter(head1Pos.x, 'x'), 0, snapToGridCenter(head1Pos.z, 'z'));
    const head2SnappedPos = new THREE.Vector3(snapToGridCenter(head2Pos.x, 'x'), 0, snapToGridCenter(head2Pos.z, 'z'));

    // Head-on Collision
    if (head1SnappedPos.distanceTo(head2SnappedPos) < collisionThreshold) {
         // console.log("Collision: Head-on"); // Keep commented unless needed
         return 3;
    }

    // Boundary Check (compare snapped position to boundary limits with tolerance)
    if (head1SnappedPos.x < boundaryXMin + epsilon || 
        head1SnappedPos.x > boundaryXMax - epsilon || 
        head1SnappedPos.z < boundaryZMin + epsilon || 
        head1SnappedPos.z > boundaryZMax - epsilon) {
        // REMOVED per-check logging from here
        p1Lost = true;
    }
    if (head2SnappedPos.x < boundaryXMin + epsilon || 
        head2SnappedPos.x > boundaryXMax - epsilon || 
        head2SnappedPos.z < boundaryZMin + epsilon || 
        head2SnappedPos.z > boundaryZMax - epsilon) {
        // REMOVED per-check logging from here
        p2Lost = true;
    }

    // Trail Collision (compare snapped head to snapped trail segments)
    const allTrailSegments = [...trail1, ...trail2];
    if (!p1Lost) {
        for (let segment of allTrailSegments) {
            if (head1SnappedPos.distanceTo(segment.position) < collisionThreshold) { 
                // console.log("Collision: P1 hit trail at", segment.position); // Keep commented unless needed
                p1Lost = true; 
                break; 
            }
        }
    }
    if (!p2Lost) {
        for (let segment of allTrailSegments) {
            if (head2SnappedPos.distanceTo(segment.position) < collisionThreshold) { 
                 // console.log("Collision: P2 hit trail at", segment.position); // Keep commented unless needed
                p2Lost = true; 
                break; 
            }
        }
    }
    if (p1Lost && p2Lost) return 3;
    if (p1Lost) return 1;
    if (p2Lost) return 2;
    return 0;
}

function createOpeningDialog() {
    openingDialogElement = document.createElement('div');
    // Style similar to GameOver, but adjust content and maybe size
    openingDialogElement.style.position = 'absolute';
    openingDialogElement.style.top = '50%';
    openingDialogElement.style.left = '50%';
    openingDialogElement.style.transform = 'translate(-50%, -50%)';
    openingDialogElement.style.color = 'white';
    openingDialogElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'; // Slightly more opaque background
    openingDialogElement.style.padding = '30px 50px';
    openingDialogElement.style.borderRadius = '10px';
    openingDialogElement.style.border = '2px solid rgba(255, 255, 255, 0.6)';
    openingDialogElement.style.fontSize = '24px'; // Smaller base font size
    openingDialogElement.style.fontFamily = 'Arial, sans-serif';
    openingDialogElement.style.textShadow = '1px 1px 3px #000000';
    openingDialogElement.style.textAlign = 'center'; 
    openingDialogElement.style.display = 'block'; // Show initially
    openingDialogElement.style.cursor = 'pointer'; // Indicate it's clickable

    openingDialogElement.innerHTML = 
        `<h2 style="font-size: 32px; margin-top: 0; margin-bottom: 15px; color: #00ffff;">Tron Snake 3D</h2>` +
        `<p style="margin-bottom: 10px;">Use <strong style="color: #00ffff;">Left/Right Arrow Keys</strong> to turn.</p>` +
        `<p style="margin-bottom: 10px;">Trap the <strong style="color: #ff8800;">Orange AI</strong> opponent.</p>` +
        `<p style="margin-bottom: 10px;">Collect <strong style="color: #ff00ff;">Pink Cubes</strong> for points & speed boost!</p>` +
        `<p style="margin-bottom: 10px;">Collect <strong style="color: #00ff00;">Green Cubes</strong> to expand the arena!</p>` +
        `<p style="margin-bottom: 10px;">Collect <strong style="color: #ffffff;">White Cubes</strong> to clear all walls!</p>` +
        `<p style="margin-bottom: 20px;">Collect <strong style="color: #0088ff;">Blue Cubes</strong> to zoom out briefly!</p>` +
        `<p style="margin-bottom: 20px;">Collect <strong style="color: #ffff00;">Yellow Blocks</strong> for sparse trails!</p>` + // Changed Rings to Blocks
        `<p style="margin-bottom: 20px;">Collect <strong style="color: #9900ff;">Purple Gems</strong> to spawn more pickups!</p>` + // Mention multi-spawn
        `<p style="font-size: 18px; color: #cccccc;">(Click or Press Any Key to Start)</p>`;

    document.body.appendChild(openingDialogElement);
}

function createGameOverText() {
    gameOverTextElement = document.createElement('div');
    gameOverTextElement.style.position = 'absolute';
    gameOverTextElement.style.top = '50%';
    gameOverTextElement.style.left = '50%';
    gameOverTextElement.style.transform = 'translate(-50%, -50%)';
    gameOverTextElement.style.color = 'white';
    gameOverTextElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'; // Semi-transparent black background
    gameOverTextElement.style.padding = '20px 40px'; // Add padding
    gameOverTextElement.style.borderRadius = '10px'; // Rounded corners
    gameOverTextElement.style.border = '2px solid rgba(255, 255, 255, 0.5)'; // Subtle white border
    gameOverTextElement.style.fontSize = '48px';
    gameOverTextElement.style.fontFamily = 'Arial, sans-serif';
    gameOverTextElement.style.textShadow = '2px 2px 4px #000000';
    gameOverTextElement.style.textAlign = 'center'; // Center align text
    gameOverTextElement.style.display = 'none';
    document.body.appendChild(gameOverTextElement);
}

function createVersionText() {
    versionTextElement = document.createElement('div');
    versionTextElement.style.position = 'absolute';
    versionTextElement.style.top = '10px';
    versionTextElement.style.right = '10px';
    versionTextElement.style.color = 'rgba(255, 255, 255, 0.8)'; // Slightly more opaque text
    versionTextElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // Semi-transparent black background
    versionTextElement.style.padding = '5px 10px'; // Add padding
    versionTextElement.style.borderRadius = '5px'; // Rounded corners
    versionTextElement.style.fontSize = '14px';
    versionTextElement.style.fontFamily = 'Arial, sans-serif';
    versionTextElement.textContent = GAME_VERSION;
    document.body.appendChild(versionTextElement);
}

function createScoreText() {
    scoreTextElement = document.createElement('div');
    scoreTextElement.style.position = 'absolute';
    scoreTextElement.style.top = '10px';
    scoreTextElement.style.left = '10px';
    scoreTextElement.style.color = 'rgba(255, 255, 255, 0.9)'; // White score text
    scoreTextElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    scoreTextElement.style.padding = '5px 10px';
    scoreTextElement.style.borderRadius = '5px';
    scoreTextElement.style.fontSize = '18px';
    scoreTextElement.style.fontFamily = 'Arial, sans-serif';
    scoreTextElement.textContent = "Score: 0"; // Initial text
    document.body.appendChild(scoreTextElement);
}

function showGameOverMessage(winner) {
    let message = "";
    if (winner === 1) message = 'AI Wins! (Orange)';
    else if (winner === 2) message = 'Player 1 Wins! (Cyan)';
    else if (winner === 3) message = 'Draw!';

    let scoreMessage = `Final Score: ${scoreP1}`;
    if (scoreP1 > topScore && (winner === 2 || winner === 3)) { // Add check if P1 didn't lose outright
       scoreMessage += ` (NEW TOP SCORE!)`;
    }

    gameOverTextElement.innerHTML = 
        `${message}<br>` +
        `<span style="font-size: 32px; color: #cccccc;">${scoreMessage}</span><br>` +
        `<span style="font-size: 24px; color: #aaaaaa;">Top Score: ${topScore}</span><br>` + // Display Top Score
        `<span style="font-size: 24px;">Press Any Key to Restart</span>`;
    gameOverTextElement.style.display = 'block';
}

function resetGame() {
    isGameOver = false;
    winner = 0;
    scoreP1 = 0; // Reset score
    isSpeedBoostActiveP1 = false; // Reset P1 boost state
    speedBoostEndTimeP1 = 0;
    isZoomedOutP1 = false; // Reset zoom state
    zoomOutEndTimeP1 = 0;
    isSparseTrailActiveP1 = false; // Reset sparse trail state
    sparseTrailEndTimeP1 = 0;
    trailCounterP1 = 0;
    isSpeedBoostActiveAI = false; // Reset AI boost state
    speedBoostEndTimeAI = 0;
    isSparseTrailActiveAI = false;
    sparseTrailEndTimeAI = 0;
    trailCounterAI = 0;
    if (scoreTextElement) scoreTextElement.textContent = "Score: 0"; // Reset score display
    gameOverTextElement.style.display = 'none';
    gameActive = true; // Ensure game is active on reset

    // Reset Boundaries
    boundaryXMin = -initialBoundaryHalfSize;
    boundaryXMax = initialBoundaryHalfSize;
    boundaryZMin = -initialBoundaryHalfSize;
    boundaryZMax = initialBoundaryHalfSize;
    createPlayAreaVisuals(boundaryXMin, boundaryXMax, boundaryZMin, boundaryZMax);

    // Clear trails
    trailSegments1.forEach(segment => scene.remove(segment));
    trailSegments1.length = 0;
    trailSegments2.forEach(segment => scene.remove(segment));
    trailSegments2.length = 0;

    // Reset pickups
    spawnInitialPickups();

    // Reset snake positions & colors to normal
    const startPos1X = snapToGridCenter(boundaryXMin + segmentSize, 'x');
    const startPos1Z = snapToGridCenter(0, 'z');
    snakeHead1.position.set(startPos1X, 0, startPos1Z);
    snakeTargetPosition1.set(startPos1X, 0, startPos1Z);
    prevTargetPos1.copy(snakeTargetPosition1);
    snakeDirection1.set(1, 0, 0);
    snakeHead1.material.color.setHex(P1_HEAD_COLOR_NORMAL);

    const startPos2X = snapToGridCenter(boundaryXMax - segmentSize, 'x');
    const startPos2Z = snapToGridCenter(0, 'z');
    snakeHead2.position.set(startPos2X, 0, startPos2Z);
    snakeTargetPosition2.set(startPos2X, 0, startPos2Z);
    prevTargetPos2.copy(snakeTargetPosition2);
    snakeDirection2.set(-1, 0, 0);
    snakeHead2.material.color.setHex(AI_HEAD_COLOR_NORMAL);
    
    // Reset camera immediately (based on target)
    targetLookAt.copy(snakeTargetPosition1);
    cameraOffset.copy(snakeDirection1).multiplyScalar(-cameraDistanceBehind);
    cameraOffset.y = cameraHeight;
    camera.position.copy(snakeTargetPosition1).add(cameraOffset);
    camera.lookAt(targetLookAt);

    lastTrailSegment1 = null; // Reset last segment tracker
    lastTrailSegment2 = null; // Reset last segment tracker
    lastUpdateTimeP1 = performance.now(); // Reset P1 timer
    lastUpdateTimeAI = performance.now(); // Reset AI timer
    lastFrameTime = performance.now(); // Reset frame timer

    // Clear floating texts
    floatingTexts.forEach(t => scene.remove(t.mesh));
    floatingTexts.length = 0;
}

function spawnInitialPickups() {
    // Ensure scene is clear before spawning initial ones (relevant for reset)
    scorePickups.forEach(p => scene.remove(p));
    scorePickups.length = 0;
    expansionPickups.forEach(p => scene.remove(p));
    expansionPickups.length = 0;
    clearPickups.forEach(p => scene.remove(p)); // Clear this too
    clearPickups.length = 0;
    zoomPickups.forEach(p => scene.remove(p));
    zoomPickups.length = 0; // Clear zoom pickups
    sparseTrailPickups.forEach(p => scene.remove(p));
    sparseTrailPickups.length = 0; // Clear sparse pickups
    multiSpawnPickups.forEach(p => scene.remove(p)); multiSpawnPickups.length = 0; // Clear multi-spawn
    
    spawnPickup("score"); 
    spawnPickup("expansion");
    spawnPickup("clear");
    spawnPickup("zoom"); 
    spawnPickup("sparse"); 
    spawnPickup("multi"); // Spawn initial multi-spawn
}

// Updated Spawn Logic for 6 Types
function spawnPickup(forceType = null) {
    let pickupType = forceType;
    
    if (!pickupType) { 
        const rand = Math.random();
        // Define probability ranges
        const multiEnd = multiSpawnPickupSpawnChance;
        const sparseEnd = multiEnd + sparseTrailPickupSpawnChance;
        const zoomEnd = sparseEnd + zoomPickupSpawnChance;
        const clearEnd = zoomEnd + clearPickupSpawnChance;
        const expansionEnd = clearEnd + expansionPickupSpawnChance;

        if (rand < multiEnd && multiSpawnPickups.length < maxMultiSpawnPickups) pickupType = "multi";
        else if (rand < sparseEnd && sparseTrailPickups.length < maxSparseTrailPickups) pickupType = "sparse";
        else if (rand < zoomEnd && zoomPickups.length < maxZoomPickups) pickupType = "zoom";
        else if (rand < clearEnd && clearPickups.length < maxClearPickups) pickupType = "clear";
        else if (rand < expansionEnd && expansionPickups.length < maxExpansionPickups) pickupType = "expansion";
        else if (scorePickups.length < maxScorePickups) pickupType = "score";
        else { /* Fallback */ 
             if (multiSpawnPickups.length < maxMultiSpawnPickups) pickupType = "multi";
             else if (sparseTrailPickups.length < maxSparseTrailPickups) pickupType = "sparse";
             else if (zoomPickups.length < maxZoomPickups) pickupType = "zoom";
             else if (clearPickups.length < maxClearPickups) pickupType = "clear";
             else if (expansionPickups.length < maxExpansionPickups) pickupType = "expansion";
             else if (scorePickups.length < maxScorePickups) pickupType = "score";
             else return; 
        }
    }
    
    // Double check max count
    if (pickupType === "multi" && multiSpawnPickups.length >= maxMultiSpawnPickups) pickupType = null;
    if (pickupType === "sparse" && sparseTrailPickups.length >= maxSparseTrailPickups) pickupType = null;
    if (pickupType === "zoom" && zoomPickups.length >= maxZoomPickups) pickupType = null;
    if (pickupType === "clear" && clearPickups.length >= maxClearPickups) pickupType = null;
    if (pickupType === "expansion" && expansionPickups.length >= maxExpansionPickups) pickupType = null;

    if (!pickupType) { /* Final fallback */
         if (multiSpawnPickups.length < maxMultiSpawnPickups) pickupType = "multi";
         else if (sparseTrailPickups.length < maxSparseTrailPickups) pickupType = "sparse";
         else if (zoomPickups.length < maxZoomPickups) pickupType = "zoom";
         else if (clearPickups.length < maxClearPickups) pickupType = "clear";
         else if (expansionPickups.length < maxExpansionPickups) pickupType = "expansion";
         else if (scorePickups.length < maxScorePickups) pickupType = "score";
         else return; 
    }

    let geometry, material, targetArray, pickupHeight;
    // Use 'pickupVisual' to hold the Mesh/Group template
    let pickupVisual;
    switch (pickupType) {
        case "multi":
            pickupVisual = new THREE.Mesh(multiSpawnGeometry, multiSpawnMaterial);
            targetArray = multiSpawnPickups;
            pickupHeight = segmentSize * 0.45 * 2; // Approx height for Icosahedron radius 0.45
            break;
        case "sparse": 
            pickupVisual = sparseTrailPickupTemplate; 
            targetArray = sparseTrailPickups; 
            pickupHeight = (segmentSize * 0.45 * 2) + 0.1; 
            break;
        case "zoom": 
            pickupVisual = new THREE.Mesh(zoomPickupGeometry, zoomPickupMaterial); 
            targetArray = zoomPickups; 
            pickupHeight = segmentSize * 0.5;
            break;
        case "clear": 
            pickupVisual = new THREE.Mesh(clearPickupGeometry, clearPickupMaterial);
            targetArray = clearPickups; 
            pickupHeight = segmentSize * 0.5;
            break;
        case "expansion": 
            pickupVisual = new THREE.Mesh(expansionPickupGeometry, expansionPickupMaterial);
            targetArray = expansionPickups; 
            pickupHeight = segmentSize * 0.7;
            break;
        case "score": default: 
            pickupVisual = new THREE.Mesh(scorePickupGeometry, scorePickupMaterial);
            targetArray = scorePickups; 
            pickupHeight = segmentSize * 0.6;
            break;
    }

    const maxAttempts = 50;
    const { divisionsX, divisionsZ } = getGridDimensions();
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const gridX = Math.floor(Math.random() * divisionsX);
        const gridZ = Math.floor(Math.random() * divisionsZ);
        const worldX = snapToGridCenter(boundaryXMin + gridX * segmentSize, 'x');
        const worldZ = snapToGridCenter(boundaryZMin + gridZ * segmentSize, 'z');
        // Calculate Y so the bottom rests on the ground plane
        const worldY = GROUND_Y + (pickupHeight / 2.0);
        const potentialPos = new THREE.Vector3(worldX, worldY, worldZ);
        const collisionThreshold = segmentSize * 0.1;
        
        if (!isPositionOccupied(potentialPos, collisionThreshold)) {
            // Clone the template visual (Mesh or Group)
            const pickup = pickupVisual.clone(); 
            pickup.position.copy(potentialPos);
            scene.add(pickup);
            targetArray.push(pickup);
            return;
        }
    }
    console.warn("Could not find empty space for pickup.");
}

// Combined check for if a position is occupied by anything
function isPositionOccupied(pos, threshold) {
    if (pos.distanceTo(snakeTargetPosition1) < threshold) return true;
    if (pos.distanceTo(snakeTargetPosition2) < threshold) return true;
    for (const seg of [...trailSegments1, ...trailSegments2]) {
        if (pos.distanceTo(seg.position) < threshold) return true;
    }
    for (const pick of scorePickups) {
        if (pos.distanceTo(pick.position) < threshold) return true;
    }
    for (const pick of expansionPickups) {
        if (pos.distanceTo(pick.position) < threshold) return true;
    }
    for (const pick of clearPickups) { // Check clear pickups too
        if (pos.distanceTo(pick.position) < threshold) return true;
    }
    for (const pick of zoomPickups) {
        if (pos.distanceTo(pick.position) < threshold) return true;
    } // Check zoom pickups too
    for (const pick of sparseTrailPickups) {
        if (pos.distanceTo(pick.position) < threshold) return true;
    } // Check sparse pickups too
    for (const pick of multiSpawnPickups) { if (pos.distanceTo(pick.position) < threshold) return true; } // Check multi
    return false;
}

function checkScorePickupCollision() {
    // Use the larger threshold
    for (let i = scorePickups.length - 1; i >= 0; i--) {
        const pickup = scorePickups[i];
        const dx = snakeTargetPosition1.x - pickup.position.x;
        const dz = snakeTargetPosition1.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) { // Use larger threshold
            const pos = pickup.position.clone(); const col = pickup.material.color.clone();
            createExplosionEffect(pos, col);
            createFloatingText("Speed Up!", pos, col);
            scoreP1 += pickupScoreValue;
            scene.remove(pickup); scorePickups.splice(i, 1);
            if (!isSpeedBoostActiveP1) { 
                snakeHead1.material.color.setHex(P1_HEAD_COLOR_BOOST);
            }
            isSpeedBoostActiveP1 = true; speedBoostEndTimeP1 = performance.now() + boostDuration;
            spawnPickup(); return true;
        }
    }
    return false;
}

function checkExpansionPickupCollision() {
     // Use the larger threshold
     for (let i = expansionPickups.length - 1; i >= 0; i--) {
        const pickup = expansionPickups[i];
        const dx = snakeTargetPosition1.x - pickup.position.x;
        const dz = snakeTargetPosition1.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) { // Use larger threshold
            const pos = pickup.position.clone(); const col = pickup.material.color.clone();
            createExplosionEffect(pos, col);
            createFloatingText("Expand!", pos, col);
            scene.remove(pickup); expansionPickups.splice(i, 1);

            // Use threshold checks for direction
            const dirX = snakeDirection1.x;
            const dirZ = snakeDirection1.z;
            console.log(`  Player Expansion Check: Raw Direction (${dirX.toFixed(3)}, ${dirZ.toFixed(3)})`);

            let expanded = false;
            if (dirX > 0.5) {
                console.log("  -> Player Branch Entered: dirX > 0.5"); // LOGGING
                boundaryXMax += expansionAmount;
                console.log(`  Expanding boundaryXMax`);
                expanded = true;
            } else if (dirX < -0.5) {
                 console.log("  -> Player Branch Entered: dirX < -0.5"); // LOGGING
                boundaryXMin -= expansionAmount;
                console.log(`  Expanding boundaryXMin`);
                expanded = true;
            } else if (dirZ > 0.5) {
                 console.log("  -> Player Branch Entered: dirZ > 0.5"); // LOGGING
                boundaryZMax += expansionAmount;
                console.log(`  Expanding boundaryZMax`);
                expanded = true;
            } else if (dirZ < -0.5) {
                 console.log("  -> Player Branch Entered: dirZ < -0.5"); // LOGGING
                boundaryZMin -= expansionAmount;
                console.log(`  Expanding boundaryZMin`);
                expanded = true;
            }
            
            if (!expanded) {
                 console.log(`  WARNING: Player expansion direction unclear - not expanding.`);
            }
            
            console.log("  New bounds:", boundaryXMin, boundaryXMax, boundaryZMin, boundaryZMax);
            createPlayAreaVisuals(boundaryXMin, boundaryXMax, boundaryZMin, boundaryZMax);

            spawnPickup(); return true;
        }
    }
    return false;
}

function checkClearPickupCollision() {
    // Use the larger threshold
    for (let i = clearPickups.length - 1; i >= 0; i--) {
        const pickup = clearPickups[i];
        const dx = snakeTargetPosition1.x - pickup.position.x;
        const dz = snakeTargetPosition1.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) { // Use larger threshold
            const pos = pickup.position.clone(); const col = pickup.material.color.clone();
            createExplosionEffect(pos, col); // Effect for pickup itself
            createFloatingText("Clear Walls!", pos, col);
            
            // --- Wall Clear Effects --- 
            const effectFrequency = 4; // Create effect every N segments
            for(let j=0; j < trailSegments1.length; j++) {
                if (j % effectFrequency === 0) {
                    const seg = trailSegments1[j];
                    createExplosionEffect(seg.position.clone(), seg.material.color.clone());
                }
            }
            for(let j=0; j < trailSegments2.length; j++) {
                if (j % effectFrequency === 0) {
                    const seg = trailSegments2[j];
                    createExplosionEffect(seg.position.clone(), seg.material.color.clone());
                }
            }
            // --------------------------

            scene.remove(pickup); clearPickups.splice(i, 1);
            // Clear walls AFTER adding effects
            trailSegments1.forEach(seg => scene.remove(seg)); trailSegments1.length = 0;
            trailSegments2.forEach(seg => scene.remove(seg)); trailSegments2.length = 0;
            lastTrailSegment1 = null; 
            lastTrailSegment2 = null; 
            console.log("  Walls cleared!");
            spawnPickup(); return true;
        }
    }
    return false;
}

function checkAIScorePickupCollision() {
    // Use the larger threshold
    for (let i = scorePickups.length - 1; i >= 0; i--) {
        const pickup = scorePickups[i];
        const dx = snakeTargetPosition2.x - pickup.position.x;
        const dz = snakeTargetPosition2.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) { // Use larger threshold
            const pos = pickup.position.clone(); const col = pickup.material.color.clone();
            createExplosionEffect(pos, col);
            createFloatingText("Speed Up!", pos, col);
            console.log("AI collected score pickup!");
            scene.remove(pickup); scorePickups.splice(i, 1);
            if (!isSpeedBoostActiveAI) { 
                 snakeHead2.material.color.setHex(AI_HEAD_COLOR_BOOST);
            }
            isSpeedBoostActiveAI = true; speedBoostEndTimeAI = performance.now() + boostDuration;
            spawnPickup(); return true;
        }
    }
    return false;
}

function checkAIExpansionPickupCollision() {
     // Use the larger threshold
     for (let i = expansionPickups.length - 1; i >= 0; i--) {
        const pickup = expansionPickups[i];
        const dx = snakeTargetPosition2.x - pickup.position.x;
        const dz = snakeTargetPosition2.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) { // Use larger threshold
            const pos = pickup.position.clone(); const col = pickup.material.color.clone();
            createExplosionEffect(pos, col);
            createFloatingText("Expand!", pos, col);
            console.log("AI collected expansion pickup!");
            scene.remove(pickup); expansionPickups.splice(i, 1);

            // Use threshold checks for direction
            const dirX = snakeDirection2.x;
            const dirZ = snakeDirection2.z;
             console.log(`  AI Expansion Check: Raw Direction (${dirX.toFixed(3)}, ${dirZ.toFixed(3)})`);

            let expanded = false;
            if (dirX > 0.5) {
                console.log("  -> AI Branch Entered: dirX > 0.5"); // LOGGING
                boundaryXMax += expansionAmount;
                console.log(`  Expanding boundaryXMax (AI)`);
                expanded = true;
            } else if (dirX < -0.5) {
                 console.log("  -> AI Branch Entered: dirX < -0.5"); // LOGGING
                boundaryXMin -= expansionAmount;
                console.log(`  Expanding boundaryXMin (AI)`);
                expanded = true;
            } else if (dirZ > 0.5) {
                 console.log("  -> AI Branch Entered: dirZ > 0.5"); // LOGGING
                boundaryZMax += expansionAmount;
                console.log(`  Expanding boundaryZMax (AI)`);
                expanded = true;
            } else if (dirZ < -0.5) {
                 console.log("  -> AI Branch Entered: dirZ < -0.5"); // LOGGING
                boundaryZMin -= expansionAmount;
                console.log(`  Expanding boundaryZMin (AI)`);
                expanded = true;
            }

             if (!expanded) {
                 console.log(`  WARNING: AI expansion direction unclear - not expanding.`);
            }

            console.log("  New bounds:", boundaryXMin, boundaryXMax, boundaryZMin, boundaryZMax);
            createPlayAreaVisuals(boundaryXMin, boundaryXMax, boundaryZMin, boundaryZMax);

            spawnPickup(); return true;
        }
    }
    return false;
}

function checkAIClearPickupCollision() {
    // Use the larger threshold
    for (let i = clearPickups.length - 1; i >= 0; i--) {
        const pickup = clearPickups[i];
        const dx = snakeTargetPosition2.x - pickup.position.x;
        const dz = snakeTargetPosition2.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) { // Use larger threshold
            const pos = pickup.position.clone(); const col = pickup.material.color.clone();
            createExplosionEffect(pos, col); // Effect for pickup itself
            createFloatingText("Clear Walls!", pos, col);

            // --- Wall Clear Effects --- 
            const effectFrequency = 4; // Create effect every N segments
            for(let j=0; j < trailSegments1.length; j++) {
                if (j % effectFrequency === 0) {
                    const seg = trailSegments1[j];
                    createExplosionEffect(seg.position.clone(), seg.material.color.clone());
                }
            }
            for(let j=0; j < trailSegments2.length; j++) {
                if (j % effectFrequency === 0) {
                    const seg = trailSegments2[j];
                    createExplosionEffect(seg.position.clone(), seg.material.color.clone());
                }
            }
            // --------------------------

            scene.remove(pickup); clearPickups.splice(i, 1);
            // Clear walls AFTER adding effects
            trailSegments1.forEach(seg => scene.remove(seg)); trailSegments1.length = 0;
            trailSegments2.forEach(seg => scene.remove(seg)); trailSegments2.length = 0;
            lastTrailSegment1 = null; 
            lastTrailSegment2 = null; 
            console.log("  Walls cleared by AI!");
            spawnPickup(); return true;
        }
    }
    return false;
}

function checkZoomPickupCollision() {
    // Use the larger threshold
    for (let i = zoomPickups.length - 1; i >= 0; i--) {
        const pickup = zoomPickups[i];
        const dx = snakeTargetPosition1.x - pickup.position.x;
        const dz = snakeTargetPosition1.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) { // Use larger threshold
            const pos = pickup.position.clone(); const col = pickup.material.color.clone();
            createExplosionEffect(pos, col);
            createFloatingText("Zoom Out!", pos, col);
            console.log("Player collected Zoom Out pickup!");
            scene.remove(pickup); zoomPickups.splice(i, 1);
            isZoomedOutP1 = true; zoomOutEndTimeP1 = performance.now() + zoomOutDuration;
            spawnPickup(); return true;
        }
    }
    return false;
}

function checkAIZoomPickupCollision() {
    // Use the larger threshold
    for (let i = zoomPickups.length - 1; i >= 0; i--) {
        const pickup = zoomPickups[i];
        const dx = snakeTargetPosition2.x - pickup.position.x;
        const dz = snakeTargetPosition2.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) { // Use larger threshold
            const pos = pickup.position.clone(); const col = pickup.material.color.clone();
            createExplosionEffect(pos, col);
            // AI doesn't get zoom, so no text needed? Or maybe different text?
            // createFloatingText("AI Zoom!", pos, col); // Optional: Add text even if no effect
            console.log("AI collected Zoom Out pickup!");
            scene.remove(pickup); zoomPickups.splice(i, 1);
            spawnPickup(); return true;
        }
    }
    return false;
}

function checkSparseTrailPickupCollision() {
    // Revert to XZ check with larger threshold
    for (let i = sparseTrailPickups.length - 1; i >= 0; i--) {
        const pickup = sparseTrailPickups[i];
        const dx = snakeTargetPosition1.x - pickup.position.x;
        const dz = snakeTargetPosition1.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) { 
            const pos = pickup.position.clone(); 
            const col = sparseTrailMaterial.color.clone();
            createExplosionEffect(pos, col);
            createFloatingText("Sparse Trail!", pos, col);
            console.log("Sparse Trail P1: Attempting remove", pickup);
            scene.remove(pickup); 
            console.log("Sparse Trail P1: Removed from scene.");
            sparseTrailPickups.splice(i, 1);
            isSparseTrailActiveP1 = true;
            sparseTrailEndTimeP1 = performance.now() + sparseTrailDuration;
            trailCounterP1 = 0; // Reset counter on pickup
            console.log(`Sparse Trail P1 Activated: Active=${isSparseTrailActiveP1}, EndTime=${sparseTrailEndTimeP1.toFixed(0)}, Counter=${trailCounterP1}`);
            spawnPickup(); return true;
        }
    }
    return false;
}

function checkAISparseTrailPickupCollision() {
    // Revert to XZ check with larger threshold
    for (let i = sparseTrailPickups.length - 1; i >= 0; i--) {
        const pickup = sparseTrailPickups[i];
        const dx = snakeTargetPosition2.x - pickup.position.x;
        const dz = snakeTargetPosition2.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) {
            const pos = pickup.position.clone(); 
            const col = sparseTrailMaterial.color.clone(); 
            createExplosionEffect(pos, col);
            createFloatingText("Sparse Trail!", pos, col); 
            console.log("Sparse Trail AI: Attempting remove", pickup);
            scene.remove(pickup); 
            console.log("Sparse Trail AI: Removed from scene.");
            sparseTrailPickups.splice(i, 1);
            isSparseTrailActiveAI = true;
            sparseTrailEndTimeAI = performance.now() + sparseTrailDuration;
            trailCounterAI = 0; // Reset counter on pickup
            console.log(`Sparse Trail AI Activated: Active=${isSparseTrailActiveAI}, EndTime=${sparseTrailEndTimeAI.toFixed(0)}, Counter=${trailCounterAI}`);
            spawnPickup(); return true;
        }
    }
    return false;
}

function checkMultiSpawnPickupCollision() {
    // Use the larger threshold 
    for (let i = multiSpawnPickups.length - 1; i >= 0; i--) {
        const pickup = multiSpawnPickups[i];
        const dx = snakeTargetPosition1.x - pickup.position.x;
        const dz = snakeTargetPosition1.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) { 
            const pos = pickup.position.clone(); const col = multiSpawnMaterial.color.clone();
            createExplosionEffect(pos, col);
            createFloatingText("Multi Spawn!", pos, col);
            console.log("Player collected Multi-Spawn pickup!");
            scene.remove(pickup); multiSpawnPickups.splice(i, 1);
            
            // Spawn one of each other type (if limits allow)
            spawnPickup("score");
            spawnPickup("expansion");
            spawnPickup("clear");
            spawnPickup("zoom");
            spawnPickup("sparse");
            
            // Spawn a new random one to replace this multi-spawn
            spawnPickup(); 
            return true;
        }
    }
    return false;
}

function checkAIMultiSpawnPickupCollision() {
    // Use the larger threshold 
    for (let i = multiSpawnPickups.length - 1; i >= 0; i--) {
        const pickup = multiSpawnPickups[i];
        const dx = snakeTargetPosition2.x - pickup.position.x;
        const dz = snakeTargetPosition2.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) {
            const pos = pickup.position.clone(); const col = multiSpawnMaterial.color.clone();
            createExplosionEffect(pos, col);
            createFloatingText("Multi Spawn!", pos, col); // Same text
            console.log("AI collected Multi-Spawn pickup!");
            scene.remove(pickup); multiSpawnPickups.splice(i, 1);
            
            // Spawn one of each other type (if limits allow)
            spawnPickup("score");
            spawnPickup("expansion");
            spawnPickup("clear");
            spawnPickup("zoom");
            spawnPickup("sparse");
            
            // Spawn a new random one to replace this multi-spawn
            spawnPickup(); 
            return true;
        }
    }
    return false;
}

function createPlayAreaVisuals(xMin, xMax, zMin, zMax) {
    // Remove old ones if they exist
    if (planeMesh) scene.remove(planeMesh);
    if (gridMesh) scene.remove(gridMesh);

    const width = xMax - xMin;
    const height = zMax - zMin;
    const centerX = (xMin + xMax) / 2;
    const centerZ = (zMin + zMax) / 2;

    // Plane
    const planeGeometry = new THREE.PlaneGeometry(width, height);
    const planeMaterial = new THREE.MeshPhongMaterial({ color: 0x333333, side: THREE.DoubleSide });
    planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
    planeMesh.rotation.x = -Math.PI / 2;
    planeMesh.position.set(centerX, -segmentSize / 2, centerZ); 
    scene.add(planeMesh);

    // --- Custom Rectangular Grid --- 
    const gridVertices = [];
    const gridYOffset = -segmentSize / 2 + 0.01; // Slightly above the plane
    const { divisionsX, divisionsZ } = getGridDimensions();

    // Vertical lines (along Z axis)
    for (let i = 0; i <= divisionsX; i++) {
        const x = xMin + i * segmentSize;
        gridVertices.push(x, gridYOffset, zMin); // Start point
        gridVertices.push(x, gridYOffset, zMax); // End point
    }

    // Horizontal lines (along X axis)
    for (let i = 0; i <= divisionsZ; i++) {
        const z = zMin + i * segmentSize;
        gridVertices.push(xMin, gridYOffset, z); // Start point
        gridVertices.push(xMax, gridYOffset, z); // End point
    }

    const gridGeometry = new THREE.BufferGeometry();
    gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridVertices, 3));

    gridMesh = new THREE.LineSegments(gridGeometry, gridLineMaterial);
    // No need to set position for LineSegments if vertices are in world space
    scene.add(gridMesh);
}

function animate(currentTime) {
    requestAnimationFrame(animate);

    const currentFrameTime = performance.now();
    const deltaTime = currentFrameTime - lastFrameTime;
    const deltaTimeSeconds = deltaTime / 1000.0; // Delta time in seconds for physics
    lastFrameTime = currentFrameTime;

    let playerMoved = false;
    let aiMoved = false;

    // --- Game Logic Update (Potential) ---
    if (gameActive && !isGameOver) {
        
        // --- Player 1 Update Logic ---
        if (isSpeedBoostActiveP1 && currentTime > speedBoostEndTimeP1) {
            isSpeedBoostActiveP1 = false;
            snakeHead1.material.color.setHex(P1_HEAD_COLOR_NORMAL); // Revert head color
            // console.log("Player speed boost ended."); // REMOVE LOG
        }
        if (isZoomedOutP1 && currentTime > zoomOutEndTimeP1) isZoomedOutP1 = false; 
        if (isSparseTrailActiveP1 && currentTime > sparseTrailEndTimeP1) isSparseTrailActiveP1 = false; // Check sparse expiry
        const currentUpdateIntervalP1 = isSpeedBoostActiveP1 ? boostedUpdateInterval : normalUpdateInterval;
        const deltaTimeP1 = currentTime - lastUpdateTimeP1;

        if (deltaTimeP1 > currentUpdateIntervalP1) {
            lastUpdateTimeP1 = currentTime - (deltaTimeP1 % currentUpdateIntervalP1);
            scoreP1 += scoreIncrementPerTick;
            
            prevTargetPos1.copy(snakeTargetPosition1);
            let nextLogicalPos1 = snakeTargetPosition1.clone().addScaledVector(snakeDirection1, segmentSize);
            snakeTargetPosition1.x = snapToGridCenter(nextLogicalPos1.x, 'x');
            snakeTargetPosition1.z = snapToGridCenter(nextLogicalPos1.z, 'z');
            playerMoved = true;
            
            // Check Player Pickups
            checkScorePickupCollision();
            checkExpansionPickupCollision();
            checkClearPickupCollision();
            checkZoomPickupCollision(); 
            checkSparseTrailPickupCollision(); 
            checkMultiSpawnPickupCollision(); // Check multi-spawn
        }

        // --- AI Update Logic ---
        if (isSpeedBoostActiveAI && currentTime > speedBoostEndTimeAI) {
            isSpeedBoostActiveAI = false;
            snakeHead2.material.color.setHex(AI_HEAD_COLOR_NORMAL); // Revert head color
            // console.log("AI speed boost ended."); // REMOVE LOG
        }
        if (isSparseTrailActiveAI && currentTime > sparseTrailEndTimeAI) isSparseTrailActiveAI = false; // Check sparse expiry
        const currentUpdateIntervalAI = isSpeedBoostActiveAI ? boostedUpdateInterval : normalUpdateInterval;
        const deltaTimeAI = currentTime - lastUpdateTimeAI;
        
        if (deltaTimeAI > currentUpdateIntervalAI) {
            lastUpdateTimeAI = currentTime - (deltaTimeAI % currentUpdateIntervalAI);
            
            updateAIPlayer();

            prevTargetPos2.copy(snakeTargetPosition2);
            let nextLogicalPos2 = snakeTargetPosition2.clone().addScaledVector(snakeDirection2, segmentSize);
            snakeTargetPosition2.x = snapToGridCenter(nextLogicalPos2.x, 'x');
            snakeTargetPosition2.z = snapToGridCenter(nextLogicalPos2.z, 'z');
            aiMoved = true;
            
            // Check AI Pickups
            checkAIScorePickupCollision();
            checkAIExpansionPickupCollision();
            checkAIClearPickupCollision();
            checkAIZoomPickupCollision(); 
            checkAISparseTrailPickupCollision(); 
            checkAIMultiSpawnPickupCollision(); // Check multi-spawn
        }
        
        // --- Collision Check & Trail Creation (Run if either snake moved) --- 
        if (playerMoved || aiMoved) {
            winner = checkCollisions(snakeTargetPosition1, snakeTargetPosition2, trailSegments1, trailSegments2);

            // Create trail segments conditionally
            if (playerMoved && (winner === 0 || winner === 2)) { 
                // Log state BEFORE creating trail segment
                console.log(`P1 Trail Check: SparseActive=${isSparseTrailActiveP1}, Counter=${trailCounterP1}`);
                // Visibility fix: Make last segment visible if this one is skipped
                if (isSparseTrailActiveP1 && trailCounterP1 % 2 !== 0 && lastTrailSegment1) {
                    lastTrailSegment1.visible = true;
                }
                // Only place trail if not sparse OR counter is even
                if (!isSparseTrailActiveP1 || trailCounterP1 % 2 === 0) {
                    createTrailSegment(prevTargetPos1, trailSegments1, 1);
                }
                trailCounterP1++; // Increment regardless of placement
            }
            if (aiMoved && (winner === 0 || winner === 1)) { 
                 // Log state BEFORE creating trail segment
                console.log(`AI Trail Check: SparseActive=${isSparseTrailActiveAI}, Counter=${trailCounterAI}`);
                 // Visibility fix: Make last segment visible if this one is skipped
                if (isSparseTrailActiveAI && trailCounterAI % 2 !== 0 && lastTrailSegment2) {
                    lastTrailSegment2.visible = true;
                }
                 // Only place trail if not sparse OR counter is even
                if (!isSparseTrailActiveAI || trailCounterAI % 2 === 0) {
                    createTrailSegment(prevTargetPos2, trailSegments2, 2);
                }
                trailCounterAI++; // Increment regardless of placement
            }
            
            // Check for head-on collision involving newly created trails (simplified - target vs target handled above)
            // if (winner === 0) { 
            //     if (trailSegments2.length > 0 && snakeTargetPosition1.distanceTo(trailSegments2[trailSegments2.length-1].position) < segmentSize * epsilon) winner = 3; 
            //     else if (trailSegments1.length > 0 && snakeTargetPosition2.distanceTo(trailSegments1[trailSegments1.length-1].position) < segmentSize * epsilon) winner = 3; 
            // }

            // Handle Game Over state (if a crash was detected)
            if (winner !== 0) {
                isGameOver = true;
                // Revert HEAD colors before setting loser to red
                snakeHead1.material.color.setHex(P1_HEAD_COLOR_NORMAL);
                snakeHead2.material.color.setHex(AI_HEAD_COLOR_NORMAL);
                isSpeedBoostActiveP1 = false; 
                isSpeedBoostActiveAI = false;
                
                // Check and Update Top Score
                if (scoreP1 > topScore) {
                    console.log(`New Top Score! ${scoreP1} (Previous: ${topScore})`);
                    topScore = scoreP1;
                    localStorage.setItem('tronSnakeTopScore', topScore.toString());
                }
                
                // Log and Display Game Over Message (now includes top score info)
                console.log(`Game Over! Result: ${winner === 1 ? 'AI Wins' : (winner === 2 ? 'Player 1 Wins' : 'Draw')}. Final Score: ${scoreP1}`);
                showGameOverMessage(winner);
                if (winner === 1 || winner === 3) snakeHead1.material.color.setHex(0xff0000);
                if (winner === 2 || winner === 3) snakeHead2.material.color.setHex(0xff0000);
            }
        }
    }

    // --- Particle Update Loop ---
    const pushForce = 1.5; // How strongly heads push particles
    const pushRadiusSq = (segmentSize * 0.7)**2; // Squared radius for efficiency
    for (let i = explosionParticles.length - 1; i >= 0; i--) {
        const p = explosionParticles[i];

        // Apply Gravity
        p.velocity.y += PARTICLE_GRAVITY * deltaTimeSeconds;

        // Check Head Collisions (simple push)
        if (snakeHead1) {
            const distSq1 = p.mesh.position.distanceToSquared(snakeHead1.position);
            if (distSq1 < pushRadiusSq) {
                const pushDir = p.mesh.position.clone().sub(snakeHead1.position).normalize();
                p.velocity.addScaledVector(pushDir, pushForce * (1 - Math.sqrt(distSq1) / (segmentSize*0.7)) ); // Stronger push when closer
            }
        }
        if (snakeHead2) {
            const distSq2 = p.mesh.position.distanceToSquared(snakeHead2.position);
            if (distSq2 < pushRadiusSq) {
                const pushDir = p.mesh.position.clone().sub(snakeHead2.position).normalize();
                p.velocity.addScaledVector(pushDir, pushForce * (1 - Math.sqrt(distSq2) / (segmentSize*0.7)) );
            }
        }

        // Update Position
        p.mesh.position.addScaledVector(p.velocity, deltaTimeSeconds);

        // Ground Collision
        if (p.mesh.position.y <= GROUND_Y) {
            p.mesh.position.y = GROUND_Y;
            p.velocity.y *= -0.4; // Bounce slightly
            p.velocity.x *= 0.8; // Friction
            p.velocity.z *= 0.8;
        }

        // Update Life & Opacity
        p.life -= deltaTimeSeconds;
        if (p.life <= 0) {
            scene.remove(p.mesh);
            // Dispose geometry/material if needed for complex scenes, but likely okay here
            // p.mesh.geometry.dispose();
            // p.mesh.material.dispose();
            explosionParticles.splice(i, 1); // Remove from array
        } else {
            p.mesh.material.opacity = Math.max(0, p.life / p.initialLife);
        }
    }

    // --- Floating Text Update Loop ---
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const textObj = floatingTexts[i];
        
        // Move Upwards
        textObj.mesh.position.y += TEXT_MOVE_SPEED * deltaTimeSeconds;
        
        // Make text face the camera
        if(camera) textObj.mesh.lookAt(camera.position);
        
        // Update Life & Opacity
        textObj.life -= deltaTimeSeconds;
        if (textObj.life <= 0) {
            scene.remove(textObj.mesh);
            // Dispose geometry/material if needed
            // textObj.mesh.geometry.dispose();
            // textObj.mesh.material.dispose();
            floatingTexts.splice(i, 1); // Remove from array
        } else {
            textObj.mesh.material.opacity = Math.max(0, textObj.life / textObj.initialLife);
        }
    }

    // --- Visual Updates (Every Frame) ---
    // Make the most recent trail segment visible NOW
    if (lastTrailSegment1) {
        lastTrailSegment1.visible = true;
    }
    if (lastTrailSegment2) {
        lastTrailSegment2.visible = true;
    }

    // Smoothly move snake heads towards their target positions
    if (snakeHead1) snakeHead1.position.lerp(snakeTargetPosition1, LERP_FACTOR);
    if (snakeHead2) snakeHead2.position.lerp(snakeTargetPosition2, LERP_FACTOR);

    // Update score display 
    if (scoreTextElement) { scoreTextElement.textContent = `Score: ${scoreP1}`; }

    // Update camera
    if (!isGameOver && snakeHead1 && gameActive) { 
        // Determine current camera parameters based on zoom state
        const currentHeight = isZoomedOutP1 ? zoomedOutCameraHeight : cameraHeight;
        const currentDistance = isZoomedOutP1 ? zoomedOutCameraDistanceBehind : cameraDistanceBehind;
        // const currentLookBackDistance = lookBackDistance; // Not currently used for positioning

        let camTargetPos; // Target position for the camera
        let lookAtTargetForLerp; // Target point for the look-at lerp

        if (isLookingBack) {
            // Look Backwards - Position camera AHEAD of the snake, looking AT the snake.
            cameraOffset.copy(snakeDirection1).multiplyScalar(+currentDistance); // Offset AHEAD (+distance)
            cameraOffset.y = currentHeight;
            camTargetPos = snakeHead1.position.clone().add(cameraOffset); // Target pos is ahead
            
            lookAtTargetForLerp = snakeHead1.position; // Look back AT the snake's head

        } else {
            // Normal Follow Camera - Position BEHIND the snake, looking AT the snake.
            cameraOffset.copy(snakeDirection1).multiplyScalar(-currentDistance); // Offset BEHIND (-distance)
            cameraOffset.y = currentHeight;
            camTargetPos = snakeHead1.position.clone().add(cameraOffset); // Target pos is behind
            
            lookAtTargetForLerp = snakeHead1.position; 
        }

        // Apply smooth movement
        camera.position.lerp(camTargetPos, cameraLag);
        targetLookAt.lerp(lookAtTargetForLerp, cameraLag); 
        camera.lookAt(targetLookAt);

    } else if (isGameOver) {
        // Game Over Zoom Out Camera
        const width = boundaryXMax - boundaryXMin;
        const height = boundaryZMax - boundaryZMin;
        const centerX = (boundaryXMin + boundaryXMax) / 2;
        const centerZ = (boundaryZMin + boundaryZMax) / 2;
        const largestDimension = Math.max(width, height);
        const fovRad = camera.fov * (Math.PI / 180);
        let requiredHeight = 10; 
        if (Math.tan(fovRad / 2) > epsilon) { 
             requiredHeight = (largestDimension / 2) / Math.tan(fovRad / 2);
        }
        const targetHeight = Math.max(cameraHeight + 5, requiredHeight * 1.2); 

        // Add a tiny offset to the X position to prevent potential gimbal lock
        gameOverCameraTargetPosition.set(centerX + 0.01, targetHeight, centerZ); 
        gameOverLookAtTarget.set(centerX, 0, centerZ); 

        camera.position.lerp(gameOverCameraTargetPosition, gameOverCameraLag); 
        camera.up.set(0, 1, 0); // Set UP vector *before* lookAt
        camera.lookAt(gameOverLookAtTarget); 
    }

    renderer.render(scene, camera);
}

// --- Particle Explosion Effect ---
function createExplosionEffect(position, color) {
    const particleGeometry = new THREE.BoxGeometry(PARTICLE_SIZE, PARTICLE_SIZE, PARTICLE_SIZE);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const particleMaterial = new THREE.MeshPhongMaterial({
            color: color, 
            transparent: true, 
            opacity: 1.0
        });
        const particleMesh = new THREE.Mesh(particleGeometry, particleMaterial);
        particleMesh.position.copy(position);

        // Random outward velocity
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5),
            (Math.random() * 0.6 + 0.2), // Bias upwards slightly
            (Math.random() - 0.5)
        ).normalize().multiplyScalar(EXPLOSION_FORCE * (0.8 + Math.random() * 0.4)); // Randomize force slightly

        explosionParticles.push({
            mesh: particleMesh,
            velocity: velocity,
            life: PARTICLE_LIFE,
            initialLife: PARTICLE_LIFE
        });
        scene.add(particleMesh);
    }
}

// --- Floating Text Effect Creation ---
function createFloatingText(text, position, color) {
    if (!textFont) {
        console.warn("Font not loaded yet, cannot create text effect.");
        return; 
    }

    // Use TextGeometry directly, not THREE.TextGeometry
    const textGeometry = new TextGeometry(text, {
        font: textFont,
        size: TEXT_SIZE,
        height: TEXT_SIZE * 0.1, 
        curveSegments: 4, 
    });
    // Center the geometry
    textGeometry.center(); 

    const textMaterial = new THREE.MeshPhongMaterial({
        color: color, 
        transparent: true, 
        opacity: 1.0,
    });

    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.copy(position);
    textMesh.position.y += TEXT_HEIGHT_OFFSET;
    
    floatingTexts.push({
        mesh: textMesh,
        life: TEXT_LIFE,
        initialLife: TEXT_LIFE
    });
    scene.add(textMesh);
}

// --- Load Font (Do this early) ---
const fontLoader = new FontLoader();
// Use URL for helvetiker font from Three.js examples repo
fontLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/fonts/helvetiker_regular.typeface.json', 
    function (loadedFont) {
        console.log("Font loaded successfully from URL.");
        textFont = loadedFont;
    }, 
    undefined, // Progress callback (optional)
    function (error) {
        console.error('Font loading failed:', error);
    }
);

// --- Create Stacked Cube Geometry Function ---
function createSparseTrailPickupVisual() {
    const group = new THREE.Group();
    const cubeWidth = segmentSize * 0.8; // Keep slightly narrow
    const cubeHeight = segmentSize * 0.45; // Make taller (0.45 * 2 = 0.9 total cube height)
    const cubeDepth = segmentSize * 0.8; // Keep slightly narrow
    const gap = 0.1; // Increased gap between cubes

    const cubeGeom = new THREE.BoxGeometry(cubeWidth, cubeHeight, cubeDepth);
    const cubeMesh1 = new THREE.Mesh(cubeGeom, sparseTrailMaterial);
    const cubeMesh2 = new THREE.Mesh(cubeGeom, sparseTrailMaterial); 

    cubeMesh1.position.y = -(cubeHeight / 2 + gap / 2);
    cubeMesh2.position.y = (cubeHeight / 2 + gap / 2);

    group.add(cubeMesh1);
    group.add(cubeMesh2);

    return group;
}
// Create the template visual once
const sparseTrailPickupTemplate = createSparseTrailPickupVisual();

init(); 