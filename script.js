// Add necessary imports for TextGeometry
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

import * as THREE from 'three';
// <<< IMPORTANT: Add these imports MANUALLY above the THREE import >>>
// import { FontLoader } from 'three/addons/loaders/FontLoader.js';
// import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

const GAME_VERSION = "v1.0.28"; // Updated version

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
let zoomLevelP1 = 0; // Zoom intensity level
let isSparseTrailActiveP1 = false; // Sparse trail state
let sparseTrailEndTimeP1 = 0;
let trailCounterP1 = 0; // Counter for sparse trail placement
let sparseLevelP1 = 1; // Sparseness level (higher means more gaps)
let lastUpdateTimeP1 = 0;
let ammoCountP1 = 0; // NEW: Ammo count for Player 1
let ammoIndicatorP1 = null; // NEW: Group to hold ammo indicator meshes

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
let sparseLevelAI = 1; // Sparseness level for AI
let lastUpdateTimeAI = 0;
let isLookingBack = false; // Flag for look back camera
let lookBackTouchId = null; // Store ID of touch used for looking back
let ammoCountAI = 0; // NEW: Ammo count for AI
let ammoIndicatorAI = null; // NEW: Group to hold AI ammo indicator meshes

// --- Unlock Tracking (NEW) ---
let unlockedScoresThisGame = new Set(); // Tracks unlock scores hit in the current game session

// Common Game Settings
const segmentSize = 1;
const normalUpdateInterval = 250; // Normal speed
const boostedUpdateInterval = 125; // Faster speed (half interval)
const boostDuration = 3000; // milliseconds (3 seconds)
const zoomOutDuration = 10000; // Doubled to 10 seconds zoom
const sparseTrailDuration = 8000; // 8 seconds sparse trail
const LERP_FACTOR = 0.2; // Smoothing factor for visual movement

// --- Dynamic Boundary --- 
const initialBoundaryHalfSize = 15; // Increased initial size
let boundaryXMin = -initialBoundaryHalfSize;
let boundaryXMax = initialBoundaryHalfSize;
let boundaryZMin = -initialBoundaryHalfSize;
let boundaryZMax = initialBoundaryHalfSize;
const expansionAmount = 10; // Expansion amount as per updated rules

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
const scorePickups = []; // Renamed array
const scorePickupGeometry = new THREE.BoxGeometry(segmentSize * 0.6, segmentSize * 0.6, segmentSize * 0.6); // Smaller sphere
const scorePickupMaterial = new THREE.MeshPhongMaterial({ color: 0xff00ff, emissive: 0x550055 }); // Bright Pink
let maxScorePickups = 1; // Changed to let

// Expansion Pickup
const expansionPickups = [];
const expansionPickupGeometry = new THREE.BoxGeometry(segmentSize * 0.7, segmentSize * 0.7, segmentSize * 0.7);
const expansionPickupMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00, emissive: 0x005500 }); // Green
let maxExpansionPickups = 1; // Changed to let
const expansionPickupSpawnChance = 0.15; // Reduced chance slightly
const aiPickupScanRadius = 7; // Increased scan radius slightly

// Clear Wall Pickup
const clearPickups = [];
const clearPickupGeometry = new THREE.BoxGeometry(segmentSize * 0.5, segmentSize * 0.5, segmentSize * 0.5); // Smallest cube
const clearPickupMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xaaaaaa }); // White/Bright
let maxClearPickups = 1; // Changed to let
const clearPickupSpawnChance = 0.10; // Lower chance

// Zoom Pickup
const zoomPickups = [];
const zoomPickupGeometry = new THREE.BoxGeometry(segmentSize * 0.5, segmentSize * 0.5, segmentSize * 0.5); 
const zoomPickupMaterial = new THREE.MeshPhongMaterial({ color: 0x0088ff, emissive: 0x0033aa }); // Blue
let maxZoomPickups = 1; // Changed to let
const zoomPickupSpawnChance = 0.10; // Same chance as clear pickup

// Sparse Trail Pickup
const sparseTrailPickups = [];
// Geometry is now created by a function
// const sparseTrailGeometry = new THREE.TorusGeometry(segmentSize * 0.35, segmentSize * 0.1, 8, 16);
const sparseTrailMaterial = new THREE.MeshPhongMaterial({ color: 0xffff00, emissive: 0xaaaa00 }); // Yellow
let maxSparseTrailPickups = 1; // Changed to let
const sparseTrailPickupSpawnChance = 0.08; 

// Ammo Pickup (NEW)
const ammoPickups = [];
const AMMO_COLOR = 0xffa500; // Orange
const ammoPickupMaterial = new THREE.MeshPhongMaterial({ color: AMMO_COLOR, emissive: 0xaa7500 }); 
// Use same visual style as sparse trail for "Blocks"
let ammoPickupTemplate; // Will be created later like sparse trail
let maxAmmoPickups = 1; 
const ammoPickupSpawnChance = 0.08; // Same as sparse initially

// --- Define Ammo Pickup Geometry (Sphere) ---
const AMMO_PICKUP_RADIUS = segmentSize * 0.4;
ammoPickupTemplate = new THREE.Mesh(
    new THREE.SphereGeometry(AMMO_PICKUP_RADIUS, 16, 12), // Sphere geometry
    ammoPickupMaterial
);

// Multi-Spawn Pickup
const multiSpawnPickups = [];
const multiSpawnGeometry = new THREE.IcosahedronGeometry(segmentSize * 0.45, 0); // Icosahedron, radius 0.45
const multiSpawnMaterial = new THREE.MeshPhongMaterial({ color: 0x9900ff, emissive: 0x5500aa }); // Purple
let maxMultiSpawnPickups = 1; // Changed to let
const multiSpawnPickupSpawnChance = 0.07; // Make it slightly rarer

// NEW Pickup Type Placeholder
const addAiPickups = []; // Placeholder array
const addAiPickupGeometry = new THREE.OctahedronGeometry(segmentSize * 0.6, 0); // Placeholder shape
const addAiPickupMaterial = new THREE.MeshPhongMaterial({ color: 0x888888, emissive: 0x444444 }); // Placeholder Gray
let maxAddAiPickups = 1; // Placeholder max

// Game state
let isGameOver = false;
let gameActive = false; // New state: controls if game logic runs
let winner = 0; // 0 = ongoing, 1 = Player 1 wins, 2 = AI wins, 3 = Draw
const yAxis = new THREE.Vector3(0, 1, 0); // Define Y axis for rotation

// --- AI Specific Constants ---
const AI_LOOK_AHEAD_STEPS = 3; 
const AI_PICKUP_SCAN_RADIUS_SQ = 7 * 7; // Use squared for efficiency
const AI_STRAIGHT_BIAS = 0.9; // 90% chance to go straight if safe and not pursuing pickup

// DOM Elements
let gameOverTextElement;
let versionTextElement;
let openingDialogElement; // New element for opening dialog
let scoreTextElement; // New element for score
let topScoreTextElement; // New element for top score display

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
let topScoreAtGameStart = 0; // NEW: Store top score at game start
let pickupsCollectedCounter = 0; // Counter for Clear Walls pickup

// Pickup checks use TARGET positions and check XZ distance with LARGER threshold
const PICKUP_COLLISION_THRESHOLD_SQ = (segmentSize * 0.5) * (segmentSize * 0.5);

// --- Projectile State (NEW) ---
const projectiles = []; // Array to hold active projectiles
const PROJECTILE_SPEED = 20; // Units per second
const PROJECTILE_SIZE = 0.3;
const projectileGeometry = new THREE.SphereGeometry(PROJECTILE_SIZE, 8, 8);
const projectileMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xaaaaaa });

// --- Projectile Trail Particle Settings (NEW) ---
const TRAIL_PARTICLE_COUNT_PER_FRAME = 2;
const TRAIL_PARTICLE_SIZE = 0.08;
const TRAIL_PARTICLE_LIFE = 0.3; // seconds
const trailParticleGeometry = new THREE.BoxGeometry(TRAIL_PARTICLE_SIZE, TRAIL_PARTICLE_SIZE, TRAIL_PARTICLE_SIZE);
const trailParticleMaterial = new THREE.MeshBasicMaterial({ // Use BasicMaterial for simple trail
    color: 0xffddaa, // Orangey-white 
    transparent: true,
    opacity: 0.8
});
let allTrailParticles = []; // Array to manage ALL trail particles for easier update

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

    // Add touch controls listener
    window.addEventListener('touchstart', onTouchStart, { passive: false }); // Use non-passive to allow preventDefault
    window.addEventListener('touchend', onTouchEnd, { passive: false });

    // Add Game Over text display
    // Moved createOpeningDialog call below localStorage loading
    createGameOverText();
    createVersionText();
    createScoreText(); // Create score display
    // Moved createTopScoreText call below localStorage loading

    // Spawn initial pickup(s) - MOVED DOWN
    // spawnInitialPickups();

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
    // <<< ASSIGN LOADED VALUE HERE >>>
    topScoreAtGameStart = topScore;
    console.log(`Initial topScoreAtGameStart set to: ${topScoreAtGameStart}`);

    // Create UI elements AFTER topScore is potentially loaded
    createOpeningDialog(); 
    createTopScoreText(); 

    // Spawn initial pickup(s) AFTER topScore is loaded
    spawnInitialPickups();
    logTotalPickupCount("After Initial Spawn"); // Log initial count

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
            case ' ': // Spacebar (NEW)
                event.preventDefault(); // Prevent page scroll if space is held
                shootProjectile();
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
    
    // --- Pre-calculate potential turns ---
    const leftDir = currentDir.clone().applyAxisAngle(yAxis, Math.PI / 2);
    const rightDir = currentDir.clone().applyAxisAngle(yAxis, -Math.PI / 2);

    // --- 0. AI Shooting Logic (NEW) --- 
    // Check if AI has ammo and if player trail is ahead
    if (ammoCountAI > 0) {
        let playerTrailAhead = false;
        // Check a few steps ahead for player trail segments
        for (let i = 1; i <= AI_LOOK_AHEAD_STEPS; i++) {
            const checkPos = currentPos.clone().addScaledVector(currentDir, segmentSize * i);
            // Need a way to check specifically for player 1's trail at this position
            // Using a simplified distance check against trailSegments1 for now
            for (const seg1 of trailSegments1) {
                 if (checkPos.distanceTo(seg1.position) < segmentSize * 0.5) { // Smaller threshold for direct hit check
                    playerTrailAhead = true;
                    break;
                 }
            }
            if (playerTrailAhead) break;
        }

        if (playerTrailAhead) {
            // console.log("AI sees Player trail ahead, attempting to shoot!");
            aiShootProjectile(); 
            // Note: AI will still proceed with its movement decision for this frame after shooting
        }
    }

    // --- 1. Check Forward Safety --- 
    let safeForwardSteps = 0;
    for (let i = 1; i <= AI_LOOK_AHEAD_STEPS; i++) {
        const checkPos = currentPos.clone().addScaledVector(currentDir, segmentSize * i);
        if (!isPositionSafe(checkPos, true, true)) {
            break; // Obstacle found
        }
        safeForwardSteps++;
    }
    const isForwardSafe = safeForwardSteps > 0; // Is even one step forward safe?
    const isForwardClear = safeForwardSteps === AI_LOOK_AHEAD_STEPS; // Is the full lookahead path clear?

    // --- 2. Survival Mode (If Forward is Immediately Unsafe) ---
    if (!isForwardSafe) {
        
        // --- NEW: Self-Trail Shooting --- 
        const blockingPos = currentPos.clone().addScaledVector(currentDir, segmentSize);
        let ownTrailBlocking = false;
        // Check if the immediate blocking position contains own trail
        for (const seg2 of trailSegments2) {
            if (blockingPos.distanceTo(seg2.position) < segmentSize * 0.5) { 
                ownTrailBlocking = true;
                break;
            }
        }

        // If own trail is blocking and AI has ammo, shoot forward
        if (ownTrailBlocking && ammoCountAI > 0) {
            // console.log("AI: Own trail blocking, shooting forward!");
            aiShootProjectile(); 
            // Shoot, but still need to decide movement for *this* frame
            // Proceed to find best turn, hoping shot clears path for next frame
        }
        // --- End Self-Trail Shooting ---

        // console.log("AI: Forward unsafe, entering SURVIVAL mode.");
        const bestTurnDir = findBestTurn(currentPos, leftDir, rightDir); // Find best escape
        if (bestTurnDir) {
             // console.log("  -> Taking best escape turn.");
            snakeDirection2.copy(bestTurnDir);
        } else {
            // console.log("  -> No safe escape turn, crashing forward.");
            // No direction change, continue forward into obstacle
        }
        return; // Decision made (escape or crash)
    }

    // --- 3. Pickup Pursuit (If Forward is Safe) ---
    let targetPickupPos = findTargetPickup(currentPos);
    if (targetPickupPos) {
        const bestMove = findBestMoveTowards(currentPos, currentDir, leftDir, rightDir, targetPickupPos);
        if (bestMove) {
            // console.log("AI: Pursuing pickup via safe move.");
             snakeDirection2.copy(bestMove.dir);
            return; // Decision made (pursue pickup)
        }
        // console.log("AI: Target pickup identified, but no safe move closer.");
    }

    // --- 4. Default Movement (If Forward is Safe and Not Pursuing Pickup) ---
    // High probability to go straight if the path is clear
    if (isForwardClear && Math.random() < AI_STRAIGHT_BIAS) { 
        // console.log("AI: Forward clear, continuing straight (bias).");
        return; // Decision made (continue straight)
    }

    // If not going straight (either path not fully clear or random chance), find the best turn
    // console.log(`AI: Forward safe (clear: ${isForwardClear}), evaluating turns.`);
    const bestTurnDir = findBestTurn(currentPos, leftDir, rightDir);
    if (bestTurnDir) {
        // console.log("  -> Taking best available turn.");
        snakeDirection2.copy(bestTurnDir);
    } else {
        // console.log("  -> Forward safe, but no good turns available, continuing straight.");
        // No direction change, continue straight
    }
    // Decision made (turn or continue straight if turns unsafe)
}

// --- AI Helper: Find Closest Pickup ---
function findTargetPickup(currentPos) {
    let targetPickupPos = null;
    let closestDistSq = AI_PICKUP_SCAN_RADIUS_SQ;
    const allPickups = [
        ...scorePickups, ...expansionPickups, ...clearPickups, 
        ...zoomPickups, ...sparseTrailPickups, ...multiSpawnPickups, 
        ...addAiPickups
    ]; 
    for (const pickup of allPickups) {
        const distSq = currentPos.distanceToSquared(pickup.position);
        if (distSq < closestDistSq) {
            closestDistSq = distSq;
            targetPickupPos = pickup.position; // Store position directly
        }
    }
    return targetPickupPos;
            }

// --- AI Helper: Find Best Safe Move Towards Target ---
function findBestMoveTowards(currentPos, currentDir, leftDir, rightDir, targetPos) {
    let bestMove = null;
    let minTargetDistSq = currentPos.distanceToSquared(targetPos); // Start with current distance

    const potentialMoves = [
        { dir: currentDir, name: "forward" },
        { dir: leftDir,    name: "left" },
        { dir: rightDir,   name: "right" }
    ];

    for (const move of potentialMoves) {
        const nextPos = currentPos.clone().addScaledVector(move.dir, segmentSize);
        // Check if the immediate next step is safe
        if (isPositionSafe(nextPos, true, true)) {
            const distSq = nextPos.distanceToSquared(targetPos);
            // Must be *strictly* closer than the current minimum
            if (distSq < minTargetDistSq) { 
                minTargetDistSq = distSq;
                bestMove = move; // Update best move found so far
            }
        }
    }
    return bestMove; // Returns {dir, name} or null
}


// --- AI Helper: Evaluate and Choose Best Turn ---
function findBestTurn(currentPos, leftDir, rightDir) {
    let leftSafeSteps = 0;
    let rightSafeSteps = 0;
    let isLeftImmediatelySafe = false;
    let isRightImmediatelySafe = false;

    // Check Left Turn
    const leftCheckPos = currentPos.clone().addScaledVector(leftDir, segmentSize);
    if (isPositionSafe(leftCheckPos, true, true)) {
        isLeftImmediatelySafe = true;
        leftSafeSteps = 1; // At least one step is safe
        for (let i = 2; i <= AI_LOOK_AHEAD_STEPS; i++) {
            const nextLeftPos = leftCheckPos.clone().addScaledVector(leftDir, segmentSize * (i - 1));
            if (!isPositionSafe(nextLeftPos, true, true)) break;
            leftSafeSteps++;
        }
    }

    // Check Right Turn
    const rightCheckPos = currentPos.clone().addScaledVector(rightDir, segmentSize);
    if (isPositionSafe(rightCheckPos, true, true)) {
        isRightImmediatelySafe = true;
        rightSafeSteps = 1; // At least one step is safe
        for (let i = 2; i <= AI_LOOK_AHEAD_STEPS; i++) {
            const nextRightPos = rightCheckPos.clone().addScaledVector(rightDir, segmentSize * (i - 1));
            if (!isPositionSafe(nextRightPos, true, true)) break;
            rightSafeSteps++;
        }
        }

    // Decision Logic:
    if (isLeftImmediatelySafe && isRightImmediatelySafe) {
        // Both turns are initially safe, choose the one with more lookahead steps
        if (leftSafeSteps > rightSafeSteps) {
            return leftDir;
        } else if (rightSafeSteps > leftSafeSteps) {
            return rightDir;
        } else {
            // Equal steps, choose randomly
            return (Math.random() < 0.5) ? leftDir : rightDir;
        }
    } else if (isLeftImmediatelySafe) {
        return leftDir; // Only left is safe
    } else if (isRightImmediatelySafe) {
        return rightDir; // Only right is safe
    } else {
        return null; // Neither turn is immediately safe
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

// --- Helper Function for Unlock Status --- 
function getUnlockStatusText(currentTopScore) {
    const pickups = [
        { name: "Zoom Out", color: "#0088ff", type: "Blue Cube", score: 0, desc: "Grants 20 pts. Briefly zooms out player camera." }, 
        { name: "Speed Up", color: "#ff00ff", type: "Pink Cube", score: 50, desc: "Grants 40 pts. Temporary speed boost." }, 
        { name: "Sparse Trail", color: "#ffff00", type: "Yellow Blocks", score: 200, desc: "Grants 60 pts. Leave gaps in your trail." }, 
        { name: "Ammo", color: "#ffa500", type: "Orange Sphere", score: 300, desc: "Grants 80 pts. Allows player to shoot trails (Spacebar). (Spawns every 10 pickups)" }, // UPDATED Text
        { name: "Clear Walls", color: "#ffffff", type: "White Cube", score: 500, desc: "Grants 100 pts. Removes walls. (Spawns every 5 pickups)", spawnCondition: "counter", counterThreshold: 5 }, 
        { name: "More Players", color: "#888888", type: "Gray Octahedron", score: 1000, desc: "Grants 125 pts. Spawns a new AI opponent. (Spawns every 20 pickups)", spawnCondition: "counter", counterThreshold: 20 }, 
        { name: "Expand", color: "#00ff00", type: "Green Cube", score: 1500, desc: "Grants 150 pts. Expands play area. (Spawns every 15 pickups)", spawnCondition: "counter", counterThreshold: 15 }, 
        { name: "More", color: "#9900ff", type: "Purple Gems", score: 2000, desc: "Grants 200 pts. Increases max pickups & spawns 2 others. (Spawns every 15 pickups)" } 
    ];

    let unlockedHTML = '<h3 style="font-size: clamp(18px, 3vw, 22px); margin-bottom: 10px; margin-top: 20px; color: #dddddd;">Unlocked Powerups:</h3>'; // Adjusted heading size
    let nextUnlockScore = Infinity;
    let allUnlocked = true;
    let anyUnlocked = false; 

    pickups.forEach(p => {
        // Display based on score unlock, but mention counter if applicable
        if (currentTopScore >= p.score) {
            unlockedHTML += `<p style="margin-bottom: 10px; font-size: 18px;"><strong style="color: ${p.color};">${p.name} (${p.type}):</strong> ${p.desc}</p>`;
            if (p.score > 0) anyUnlocked = true; 
        } else {
            allUnlocked = false;
            if (p.score < nextUnlockScore) {
                nextUnlockScore = p.score;
            }
        }
    });

    // Ensure *something* is shown if absolutely nothing is unlocked (e.g., if Blue Cube was removed or score somehow negative)
    if (unlockedHTML.includes('<p style') === false) { // Check if any <p> was actually added
         unlockedHTML += '<p style="font-size: 18px; color: #cccccc;">None yet!</p>';
    }

    let nextUnlockMsg = "";
    if (allUnlocked) {
        nextUnlockMsg = `<p style="margin-top: 20px; font-size: 18px; color: #aaffaa;">All powerups unlocked!</p>`; // Renamed
    } else {
        nextUnlockMsg = `<p style="margin-top: 20px; font-size: 18px; color: #aaaaff;">Next powerup unlocks at ${nextUnlockScore} points (Top Score)!</p>`; // Renamed
    }

    // Add controls text
    let controlsText = 
        `<div style="margin-top: 20px; border-top: 1px solid #555; padding-top: 15px;">` +
        `<h4 style="font-size: 18px; margin-bottom: 8px; color: #cccccc;">Controls:</h4>` +
        `<p style="font-size: 16px; margin-bottom: 5px;">Arrows: Left/Right (Turn), Down (Look Back)</p>` +
        `<p style="font-size: 16px; margin-bottom: 5px;">Touch: Left/Right Side (Turn), Bottom (Look Back)</p>` +
        `</div>`;

    // Return object including controls text
    return { unlockedHTML, nextUnlockMsg, controlsText }; 
}

function createOpeningDialog() {
    if (!openingDialogElement) { // Create if it doesn't exist
        openingDialogElement = document.createElement('div');
        // Style similar to GameOver, but adjust content and maybe size
        openingDialogElement.style.position = 'absolute';
        openingDialogElement.style.top = '50%';
        openingDialogElement.style.left = '50%';
        // Ensure dialog doesn't exceed viewport width, especially on mobile
        openingDialogElement.style.width = 'clamp(300px, 90vw, 600px)'; 
        openingDialogElement.style.transform = 'translate(-50%, -50%)';
        openingDialogElement.style.color = 'white';
        openingDialogElement.style.backgroundColor = 'rgba(0, 0, 0, 0.85)'; // Slightly more opaque
        openingDialogElement.style.padding = 'clamp(15px, 4vw, 30px) clamp(20px, 5vw, 50px)'; // Responsive padding
        openingDialogElement.style.borderRadius = '10px';
        openingDialogElement.style.border = '2px solid rgba(255, 255, 255, 0.6)';
        // Responsive base font size using clamp: min 16px, preferred 3vw, max 24px
        openingDialogElement.style.fontSize = 'clamp(16px, 3vw, 24px)';
        openingDialogElement.style.fontFamily = 'Arial, sans-serif';
        openingDialogElement.style.textShadow = '1px 1px 3px #000000';
        openingDialogElement.style.textAlign = 'center'; 
        openingDialogElement.style.cursor = 'pointer';
        // Ensure it's scrollable if content overflows (less likely with responsive fonts, but safer)
        openingDialogElement.style.maxHeight = '80vh'; 
        openingDialogElement.style.overflowY = 'auto';
        document.body.appendChild(openingDialogElement);
    }

    // --- Dynamic Content Generation --- 
    const unlockStatus = getUnlockStatusText(topScore); // Call helper

    // Use responsive font sizes within the HTML string as well
    let dialogHTML = 
        `<h2 style="font-size: clamp(24px, 5vw, 32px); margin-top: 0; margin-bottom: 15px; color: #00ffff;">Powerup Tron</h2>` + // Renamed game title
        `<p style="font-size: clamp(16px, 3vw, 20px); margin-bottom: 20px;">Trap the <strong style="color: #ff8800;">Orange AI</strong> opponent. Use <strong style="color: #ffa500;">Ammo</strong> (Spacebar) to clear walls!</p>` + // Added Ammo mention
        // Apply responsive styles to getUnlockStatusText output 
        unlockStatus.unlockedHTML + // Use the HTML with embedded responsive styles now
        unlockStatus.nextUnlockMsg + 
        unlockStatus.controlsText + 
        `<p style="margin-top: 25px; font-size: clamp(14px, 2.5vw, 18px); color: #cccccc;">(Click, Touch, or Press Any Key to Start)</p>`; // Updated prompt text

    openingDialogElement.innerHTML = dialogHTML;
    openingDialogElement.style.display = 'block'; // Show initially
}

function createGameOverText() {
    gameOverTextElement = document.createElement('div');
    gameOverTextElement.style.position = 'absolute';
    gameOverTextElement.style.top = '50%';
    gameOverTextElement.style.left = '50%';
    // Ensure dialog doesn't exceed viewport width
    gameOverTextElement.style.width = 'clamp(300px, 90vw, 700px)';
    gameOverTextElement.style.transform = 'translate(-50%, -50%)';
    gameOverTextElement.style.color = 'white';
    gameOverTextElement.style.backgroundColor = 'rgba(0, 0, 0, 0.75)'; // Slightly more opaque background
    gameOverTextElement.style.padding = 'clamp(15px, 4vw, 20px) clamp(20px, 5vw, 40px)'; // Responsive padding
    gameOverTextElement.style.borderRadius = '10px';
    gameOverTextElement.style.border = '2px solid rgba(255, 255, 255, 0.5)';
    // Responsive font size for the main game over message
    gameOverTextElement.style.fontSize = 'clamp(28px, 6vw, 48px)';
    gameOverTextElement.style.fontFamily = 'Arial, sans-serif';
    gameOverTextElement.style.textShadow = '2px 2px 4px #000000';
    gameOverTextElement.style.textAlign = 'center';
    // Ensure scrollable if content overflows
    gameOverTextElement.style.maxHeight = '85vh'; 
    gameOverTextElement.style.overflowY = 'auto';
    gameOverTextElement.style.display = 'none'; 
    // Add cursor pointer to indicate it's clickable for restart
    gameOverTextElement.style.cursor = 'pointer'; 
    document.body.appendChild(gameOverTextElement);
}

function createVersionText() {
    versionTextElement = document.createElement('div');
    versionTextElement.style.position = 'absolute';
    versionTextElement.style.top = '10px';
    versionTextElement.style.right = '10px';
    versionTextElement.style.color = 'rgba(255, 255, 255, 0.9)'; // Consistent color
    versionTextElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; 
    versionTextElement.style.padding = '5px 10px';
    versionTextElement.style.borderRadius = '5px'; 
    versionTextElement.style.fontSize = '18px'; // Consistent font size
    versionTextElement.style.fontFamily = 'Arial, sans-serif';
    // Format text as "Version X.Y.Z"
    versionTextElement.textContent = `Version ${GAME_VERSION.substring(1)}`; 
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

// --- Create Top Score Display --- 
function createTopScoreText() {
    topScoreTextElement = document.createElement('div');
    topScoreTextElement.style.position = 'absolute';
    topScoreTextElement.style.bottom = '10px'; // Position at bottom
    topScoreTextElement.style.left = '10px'; // Position at left
    topScoreTextElement.style.right = 'unset'; 
    topScoreTextElement.style.color = 'rgba(255, 255, 255, 0.9)'; // Consistent color
    topScoreTextElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    topScoreTextElement.style.padding = '5px 10px';
    topScoreTextElement.style.borderRadius = '5px';
    topScoreTextElement.style.fontSize = '18px'; // Consistent font size
    topScoreTextElement.style.fontFamily = 'Arial, sans-serif';
    topScoreTextElement.textContent = `Top Score: ${topScore}`; // Updated text prefix
    document.body.appendChild(topScoreTextElement);
}

function showGameOverMessage(winner) {
    let message = "";
    if (winner === 1) message = 'AI Wins! (Orange)';
    else if (winner === 2) message = 'Player 1 Wins! (Cyan)';
    else if (winner === 3) message = 'Draw!';

    let scoreMessage = `Final Score: ${scoreP1}`;
    if (scoreP1 > topScore && (winner === 2 || winner === 3)) { 
       scoreMessage += ` (NEW TOP SCORE!)`;
       if(topScoreTextElement) topScoreTextElement.textContent = `Top Score: ${scoreP1}`; 
    }

    const unlockStatus = getUnlockStatusText(topScore);

    // Use responsive font sizes in the HTML string
    gameOverTextElement.innerHTML = 
        `${message}<br>` +
        // Responsive score message
        `<span style="font-size: clamp(20px, 4vw, 32px); color: #cccccc;">${scoreMessage}</span><br>` +
        // --- Add Unlock Status (Uses responsive styles from getUnlockStatusText) --- 
        `<div style="margin-top: 20px; border-top: 1px solid #555; padding-top: 15px;">` + // Removed redundant font size
        unlockStatus.unlockedHTML + 
        unlockStatus.nextUnlockMsg +
        `</div>` +
        // --------------------------
        // Use responsive controls text from getUnlockStatusText
        unlockStatus.controlsText + 
        // Responsive restart prompt
        `<span style="display: block; margin-top: 15px; font-size: clamp(16px, 3vw, 24px); color: #dddddd;">Tap or Press Any Key to Restart</span>`;
    gameOverTextElement.style.display = 'block';
}

function resetGame() {
    console.log(`--- Entering resetGame ---`); // Log entry

    // <<< MOVE ASSIGNMENT TO THE TOP >>>
    console.log(`[resetGame] Value of topScore BEFORE assignment: ${topScore}`); // Log before
    topScoreAtGameStart = topScore;
    console.log(`[resetGame] Value of topScoreAtGameStart AFTER assignment: ${topScoreAtGameStart}`); // Log after

    isGameOver = false;
    winner = 0;
    scoreP1 = 0; // Reset score
    isSpeedBoostActiveP1 = false; // Reset P1 boost state
    speedBoostEndTimeP1 = 0;
    isZoomedOutP1 = false; // Reset zoom state
    zoomOutEndTimeP1 = 0;
    zoomLevelP1 = 0; // Reset zoom level
    isSparseTrailActiveP1 = false; // Reset sparse trail state
    sparseTrailEndTimeP1 = 0;
    trailCounterP1 = 0;
    sparseLevelP1 = 1; // Reset sparse level
    isSpeedBoostActiveAI = false; // Reset AI boost state
    speedBoostEndTimeAI = 0;
    isSparseTrailActiveAI = false;
    sparseTrailEndTimeAI = 0;
    trailCounterAI = 0;
    sparseLevelAI = 1; // Reset AI sparse level
    pickupsCollectedCounter = 0; // Reset counter on game reset
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

    // Clear explosion particles (debris)
    explosionParticles.forEach(p => scene.remove(p.mesh));
    explosionParticles.length = 0;

    // --- Reset Ammo and Projectiles (NEW) ---
    ammoCountP1 = 0;
    if(ammoIndicatorP1) updateAmmoIndicatorP1(); // Clear visual indicator
    projectiles.forEach(p => scene.remove(p.mesh)); // Remove meshes from scene
    projectiles.length = 0; // Clear array
    // -----------------------------------------
    unlockedScoresThisGame.clear(); // <<< NEW: Reset unlock tracking

    // Reset Max Pickup Counts
    maxScorePickups = 1;
    maxExpansionPickups = 1;
    maxClearPickups = 1;
    maxZoomPickups = 1;
    maxSparseTrailPickups = 1;
    maxMultiSpawnPickups = 1; // Reset this too, although it doesn't increase itself
    maxAddAiPickups = 1; // Reset Add AI placeholders
    console.log("Pickup Max limits reset to 1.");
}

function spawnInitialPickups() {
    // Ensure scene is clear before spawning initial ones (relevant for reset)
    scorePickups.forEach(p => scene.remove(p));
    scorePickups.length = 0;
    expansionPickups.forEach(p => scene.remove(p));
    expansionPickups.length = 0;
    clearPickups.forEach(p => scene.remove(p));
    clearPickups.length = 0;
    zoomPickups.forEach(p => scene.remove(p));
    zoomPickups.length = 0;
    sparseTrailPickups.forEach(p => scene.remove(p));
    sparseTrailPickups.length = 0;
    multiSpawnPickups.forEach(p => scene.remove(p)); 
    multiSpawnPickups.length = 0;
    addAiPickups.forEach(p => scene.remove(p));
    addAiPickups.length = 0;
    ammoPickups.forEach(p => scene.remove(p)); // Clear Ammo
    ammoPickups.length = 0;

    // --- Determine Initially Eligible Types based on topScore --- 
    const allPossibleTypes = [
        { score: 0, type: "zoom" },        // Non-counter
        { score: 50, type: "score" },       // Non-counter (Speed Up)
        { score: 200, type: "sparse" },      // Non-counter
        { score: 300, type: "ammo" },        // Counter-based
        { score: 500, type: "clear" },       // Counter-based
        { score: 1000, type: "add_ai" },     // Counter-based
        { score: 1500, type: "expansion" }, // Counter-based
        { score: 2000, type: "multi" }      // Counter-based
    ];
    // Define types primarily spawned via counter later in the game
    const counterBasedTypes = ["ammo", "clear", "add_ai", "expansion", "multi"];

    const initiallyEligibleTypes = allPossibleTypes
        .filter(p => topScore >= p.score) // Filter by topScore
        .map(p => p.type); // Get only the type names

    // Filter out the counter-based types for initial spawn
    const nonCounterEligibleTypes = initiallyEligibleTypes.filter(type => !counterBasedTypes.includes(type));

    console.log(`Initial spawn eligibility (all based on topScore ${topScore}):`, initiallyEligibleTypes);
    console.log(`Attempting initial spawn for non-counter types:`, nonCounterEligibleTypes);

    if (nonCounterEligibleTypes.length === 0) {
        console.warn("No non-counter powerups unlocked based on topScore! Cannot perform initial spawn.");
        // Optionally, spawn one zoom anyway? For now, just return.
        return;
    }

    // --- Attempt to spawn one of each non-counter eligible type --- (NEW LOGIC)
    let spawnedCount = 0;
    for (const typeToSpawn of nonCounterEligibleTypes) {
        console.log(`  Initial spawn attempt: Forcing type '${typeToSpawn}'`);
        const success = spawnPickup(typeToSpawn);
        if (success) {
            spawnedCount++;
        }
    }
    console.log(`Finished initial spawn attempts for non-counter types. Spawned ${spawnedCount} pickups.`);
}

// Updated Spawn Logic for 6 Types
function spawnPickup(forceType = null) {
    console.log(`--- spawnPickup called with forceType: ${forceType} ---`); // <<< NEW LOG
    let pickupType = forceType;
    const CLEAR_WALL_PICKUP_THRESHOLD = 5; // Rule: Spawns every 5 pickups
    const ADD_AI_PICKUP_THRESHOLD = 20; // Rule: Spawns every 20 pickups (UPDATED from 10)
    const EXPAND_PICKUP_THRESHOLD = 15; // Rule: Spawns every 15 pickups 
    const AMMO_PICKUP_THRESHOLD = 10; // Rule: Spawns every 10 pickups (NEW COUNTER)
    const MULTI_PICKUP_THRESHOLD = 15; // Rule: Spawns every 15 pickups (NEW COUNTER)
    
    let attemptExtraClearSpawn = false; // Flag for extra clear wall
    let attemptExtraAmmoSpawn = false; // Flag for extra ammo (NEW)

    // --- Check for Extra Spawns --- 
    // Rule: When counter hits multiple of threshold (5), attempt extra clear spawn
    if (topScore >= 500 && pickupsCollectedCounter > 0 && pickupsCollectedCounter % CLEAR_WALL_PICKUP_THRESHOLD === 0 && clearPickups.length < maxClearPickups) {
        console.log(`  -> EXTRA SPAWN CHECK: Counter is ${pickupsCollectedCounter} (Multiple of ${CLEAR_WALL_PICKUP_THRESHOLD}), Eligible for extra Clear Walls.`);
        attemptExtraClearSpawn = true; 
    }
    // Rule: When counter hits multiple of threshold (10), attempt extra ammo spawn
    if (topScore >= 300 && pickupsCollectedCounter > 0 && pickupsCollectedCounter % AMMO_PICKUP_THRESHOLD === 0 && ammoPickups.length < maxAmmoPickups) {
        console.log(`  -> EXTRA SPAWN CHECK: Counter is ${pickupsCollectedCounter} (Multiple of ${AMMO_PICKUP_THRESHOLD}), Eligible for extra Ammo.`);
        attemptExtraAmmoSpawn = true; // Set flag (NEW)
    }

    // --- Determine Primary Spawn Type (if not forced) --- 
    if (!pickupType) {
        console.log("  -> No forceType, determining eligible types..."); 
        // --- Score/Counter-based Unlock Logic ---
        let eligibleTypes = [];
        // Always check if below max count

        // Score Unlocks (Use scoreP1 for dynamic unlocking)
        if (zoomPickups.length < maxZoomPickups) eligibleTypes.push({ type: "zoom"}); // Zoom always available
        if (scoreP1 >= 50 && scorePickups.length < maxScorePickups) eligibleTypes.push({ type: "score"}); // Speed Up
        if (scoreP1 >= 200 && sparseTrailPickups.length < maxSparseTrailPickups) eligibleTypes.push({ type: "sparse"}); // Sparse Trail
        if (scoreP1 >= 300 && ammoPickups.length < maxAmmoPickups) eligibleTypes.push({ type: "ammo" }); // Ammo 
        // Multi is counter based now

        // Counter Unlocks (Use scoreP1 for unlock, counter for spawn frequency)
        const clearEligible = scoreP1 >= 500 && pickupsCollectedCounter >= CLEAR_WALL_PICKUP_THRESHOLD && clearPickups.length < maxClearPickups; 
        const addAiEligible = scoreP1 >= 1000 && pickupsCollectedCounter >= ADD_AI_PICKUP_THRESHOLD && addAiPickups.length < maxAddAiPickups;
        const expandEligible = scoreP1 >= 1500 && pickupsCollectedCounter >= EXPAND_PICKUP_THRESHOLD && expansionPickups.length < maxExpansionPickups;
        const multiEligible = scoreP1 >= 2000 && pickupsCollectedCounter >= MULTI_PICKUP_THRESHOLD && multiSpawnPickups.length < maxMultiSpawnPickups; 

        if (clearEligible) eligibleTypes.push({ type: "clear"});
        if (addAiEligible) eligibleTypes.push({ type: "add_ai"}); 
        if (expandEligible) eligibleTypes.push({ type: "expansion"});
        if (multiEligible) eligibleTypes.push({ type: "multi" }); 

        // Fallback: If NO counter types are eligible yet, ensure score types are still possible
        // This prevents dead states early on if only Zoom is available
        if (eligibleTypes.length === 0) {
             console.log("  -> No counter types eligible, falling back to score types.");
             if (zoomPickups.length < maxZoomPickups) eligibleTypes.push({ type: "zoom"});
             if (scoreP1 >= 50 && scorePickups.length < maxScorePickups) eligibleTypes.push({ type: "score"}); 
             if (scoreP1 >= 200 && sparseTrailPickups.length < maxSparseTrailPickups) eligibleTypes.push({ type: "sparse"}); 
        }

        // If still no eligible types, do nothing
        if (eligibleTypes.length === 0) {
            console.log("  -> No eligible pickup types to spawn (including fallbacks).");
            return; // Exit if nothing can be spawned
        }

        // --- Debug Log ---
        // console.log(`Eligible pickup types: ${JSON.stringify(eligibleTypes.map(t => t.type))}`); 
        // -----------------

        // Randomly select from the eligible types
        const randomIndex = Math.floor(Math.random() * eligibleTypes.length);
        pickupType = eligibleTypes[randomIndex].type;
        console.log(`  -> Randomly selected pickupType: ${pickupType}`); 
        // --- End Original Random Selection ---
    }

    console.log(`  -> Final pickupType determined: ${pickupType}`); 
    console.log(`  -> Extra clear spawn flag: ${attemptExtraClearSpawn}`); 
    console.log(`  -> Extra ammo spawn flag: ${attemptExtraAmmoSpawn}`); 

    // Ensure a pickupType was determined (either forced or selected)
    if (!pickupType) {
        console.warn("  -> No pickup type could be determined. Exiting spawnPickup."); 
        return; // Return if no primary type determined
    }

    // --- Primary Spawn Attempt --- 
    console.log(`  -> Attempting primary spawn: ${pickupType}`); 
    const primarySpawnSuccess = trySpawn(pickupType);

    // --- Attempt Extra Spawns if Flagged --- 
    let extraClearSuccess = false;
    if (attemptExtraClearSpawn) {
        console.log("  -> Checking conditions for extra clear spawn attempt..."); 
        if (clearPickups.length < maxClearPickups) {
            console.log(`    -> Proceeding with extra Clear Walls spawn.`); 
            extraClearSuccess = trySpawn("clear"); 
        } else {
            console.log(`    -> Skipping extra Clear Walls spawn (max reached: ${clearPickups.length}/${maxClearPickups}).`); 
        }
    }
    let extraAmmoSuccess = false;
    if (attemptExtraAmmoSpawn) { 
        console.log("  -> Checking conditions for extra ammo spawn attempt..."); 
        if (ammoPickups.length < maxAmmoPickups) {
            console.log(`    -> Proceeding with extra Ammo spawn.`); 
            extraAmmoSuccess = trySpawn("ammo"); 
        } else {
            console.log(`    -> Skipping extra Ammo spawn (max reached: ${ammoPickups.length}/${maxAmmoPickups}).`); 
        }
    }

    console.log(`--- spawnPickup finished for forceType: ${forceType} ---`); 
    // Return true if the primary forced spawn was successful (or if no type forced)
    // We don't necessarily care about extra spawns for the initial spawn success check
    return primarySpawnSuccess; 
}

// Helper function to contain the actual spawning logic to avoid duplication
function trySpawn(typeToSpawn) {
    if (!typeToSpawn) {
        console.warn("trySpawn: Called with no type.");
        return false; // Indicate failure
    }
    // console.log(`Attempting to spawn type: ${typeToSpawn}`); // Debug Log

    let geometry, material, targetArray, pickupHeight;
    let pickupVisual;
    let spawnTypeName = typeToSpawn; // Use the passed-in type name

    switch (typeToSpawn) {
        case "multi":
            pickupVisual = new THREE.Mesh(multiSpawnGeometry, multiSpawnMaterial);
            targetArray = multiSpawnPickups;
            pickupHeight = segmentSize * 0.45 * 2; 
            break;
        case "sparse": 
            pickupVisual = sparseTrailPickupTemplate; 
            targetArray = sparseTrailPickups; 
            pickupHeight = (segmentSize * 0.27 * 2) + 0.3; // Use updated height/gap
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
        case "score": // Combined original default and score case
            pickupVisual = new THREE.Mesh(scorePickupGeometry, scorePickupMaterial);
            targetArray = scorePickups; 
            pickupHeight = segmentSize * 0.6;
            spawnTypeName = "score"; // Ensure sets name
            break;
        case "add_ai": 
            // console.warn("Add AI Pickup spawned (Placeholder - No effect yet)"); // Commented out
            pickupVisual = new THREE.Mesh(addAiPickupGeometry, addAiPickupMaterial);
            targetArray = addAiPickups;
            pickupHeight = segmentSize * 0.6 * 2; 
            break;
        case "ammo": // <<< ADDED ammo case
            pickupVisual = ammoPickupTemplate.clone(); // Use cloned template
            targetArray = ammoPickups; 
            pickupHeight = AMMO_PICKUP_RADIUS * 2; // Height is diameter of sphere
            break;
        // REMOVED duplicate default case
        default:
             console.error(`trySpawn: Unknown pickup type requested: ${typeToSpawn}`);
             return; // Don't proceed if type is unknown
    }

    // Check if the target array is already full
    if (targetArray.length >= getMaxForType(typeToSpawn)) {
        // console.log(`Skipping spawn for ${spawnTypeName} - max count reached (${targetArray.length}/${getMaxForType(typeToSpawn)}).`);
        return false; // Indicate failure (max reached)
    }

    const maxAttempts = 50;
    const { divisionsX, divisionsZ } = getGridDimensions();
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const gridX = Math.floor(Math.random() * divisionsX);
        const gridZ = Math.floor(Math.random() * divisionsZ);
        // Get the center of the random grid cell
        const worldX = snapToGridCenter(boundaryXMin + gridX * segmentSize, 'x');
        const worldZ = snapToGridCenter(boundaryZMin + gridZ * segmentSize, 'z');
        // Calculate Y so the bottom rests on the ground plane
        const worldY = GROUND_Y + (pickupHeight / 2.0);
        const potentialPos = new THREE.Vector3(worldX, worldY, worldZ);
        const collisionThreshold = segmentSize * 0.1; // Threshold for occupied check
        
        // Step 1: Check if the target cell itself is occupied (by heads, targets, other pickups)
        if (!isPositionOccupied(potentialPos, collisionThreshold)) {
            
            // Step 2: Check if any adjacent cell has a wall
            if (!isCellAdjacentToWall(gridX, gridZ)) { 
                // If cell is not occupied AND no adjacent walls, spawn the pickup
                const pickup = pickupVisual.clone(); 
                pickup.position.copy(potentialPos);
                scene.add(pickup);
                targetArray.push(pickup);
                logTotalPickupCount(`Spawned ${spawnTypeName}`); // Updated log message
                
                return true; // Successfully spawned 
            } 
        } 
    }
    console.warn(`Could not find empty space for pickup type ${spawnTypeName}.`);
    logTotalPickupCount(`Failed spawn ${spawnTypeName}`); // Log count after failed spawn
    return false; // Indicate failure (no space found)
}

// Helper to get max count for a type (needed for trySpawn check)
function getMaxForType(pickupType) {
    switch (pickupType) {
        case "multi": return maxMultiSpawnPickups;
        case "sparse": return maxSparseTrailPickups;
        case "zoom": return maxZoomPickups;
        case "clear": return maxClearPickups;
        case "expansion": return maxExpansionPickups;
        case "score": return maxScorePickups;
        case "add_ai": return maxAddAiPickups;
        case "ammo": return maxAmmoPickups; // <<< ADDED ammo max check
        default: return Infinity; // Should not happen
    }
}

// Combined check for if a position is occupied by anything
function isPositionOccupied(pos, threshold) {
    const HEAD_DISTANCE_THRESHOLD_SQ = 5 * 5; // Minimum squared distance from heads
    const TRAIL_PICKUP_THRESHOLD = segmentSize * 0.45; // Increased threshold for trails/pickups

    // Check distance from current snake head positions (visual)
    if (snakeHead1 && pos.distanceToSquared(snakeHead1.position) < HEAD_DISTANCE_THRESHOLD_SQ) return true;
    if (snakeHead2 && pos.distanceToSquared(snakeHead2.position) < HEAD_DISTANCE_THRESHOLD_SQ) return true;

    // Check distance from target positions (logical) - Keep using the smaller threshold passed in?
    // Or perhaps use the larger one here too? Let's try keeping it small for targets.
    if (pos.distanceTo(snakeTargetPosition1) < threshold) return true;
    if (pos.distanceTo(snakeTargetPosition2) < threshold) return true;
    
    // Check trails (walls) using LARGER threshold
    for (const seg of [...trailSegments1, ...trailSegments2]) {
        if (pos.distanceTo(seg.position) < TRAIL_PICKUP_THRESHOLD) { // Use larger threshold
            return true;
        }
    }
    // Check other pickups using LARGER threshold
    for (const pick of scorePickups) {
        if (pos.distanceTo(pick.position) < TRAIL_PICKUP_THRESHOLD) return true; // Use larger threshold
    }
    for (const pick of expansionPickups) {
        if (pos.distanceTo(pick.position) < TRAIL_PICKUP_THRESHOLD) return true; // Use larger threshold
    }
    for (const pick of clearPickups) { // Check clear pickups too
        if (pos.distanceTo(pick.position) < TRAIL_PICKUP_THRESHOLD) return true; // Use larger threshold
    }
    for (const pick of zoomPickups) {
        if (pos.distanceTo(pick.position) < TRAIL_PICKUP_THRESHOLD) return true; // Use larger threshold
    } // Check zoom pickups too
    for (const pick of sparseTrailPickups) {
        if (pos.distanceTo(pick.position) < TRAIL_PICKUP_THRESHOLD) return true; // Use larger threshold
    } // Check sparse pickups too
    for (const pick of multiSpawnPickups) { 
        if (pos.distanceTo(pick.position) < TRAIL_PICKUP_THRESHOLD) return true; // Use larger threshold
    } // Check multi
    for (const pick of addAiPickups) { 
        if (pos.distanceTo(pick.position) < TRAIL_PICKUP_THRESHOLD) return true; // Use larger threshold
    } // Check Add AI placeholder
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
            createFloatingText("+40 Speed Up!", pos, col); // Updated text
            scoreP1 += 40; // Pink Cube: 40 points
            checkUnlocks(scoreP1); // <<< NEW: Check for unlocks after pickup score
            scene.remove(pickup); scorePickups.splice(i, 1);
            logTotalPickupCount("Collected Player SpeedUp"); // Log count after removal
            if (!isSpeedBoostActiveP1) {
                snakeHead1.material.color.setHex(P1_HEAD_COLOR_BOOST);
            }
            isSpeedBoostActiveP1 = true; speedBoostEndTimeP1 = performance.now() + boostDuration;
            pickupsCollectedCounter++; // Increment counter

            // Spawn replacement: Spawn the *same type* back
            spawnPickup("score"); // Ensure specific type is passed
            return true;
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
            createFloatingText("+150 Expand!", pos, col); // Updated text
            scoreP1 += 150; // Green Cube: 150 points (Updated)
            checkUnlocks(scoreP1); // <<< NEW: Check for unlocks after pickup score
            scene.remove(pickup); expansionPickups.splice(i, 1);
            logTotalPickupCount("Collected Player Expand"); // Log count after removal

            const dirX = snakeDirection1.x;
            const dirZ = snakeDirection1.z;
            let expanded = false;
            if (dirX > 0.5) {
                boundaryXMax += expansionAmount;
                expanded = true;
            } else if (dirX < -0.5) {
                boundaryXMin -= expansionAmount;
                expanded = true;
            } else if (dirZ > 0.5) {
                boundaryZMax += expansionAmount;
                expanded = true;
            } else if (dirZ < -0.5) {
                boundaryZMin -= expansionAmount;
                expanded = true;
            }
            if (!expanded) {
                 // console.log(`  WARNING: Player expansion direction unclear - not expanding.`);
            }
            createPlayAreaVisuals(boundaryXMin, boundaryXMax, boundaryZMin, boundaryZMax);

            pickupsCollectedCounter++; // Increment counter

            // DO NOT spawn standard replacement for counter-based pickup
            // spawnPickup();
            return true;
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
            createFloatingText("+100 Clear Walls!", pos, col); // <<< UPDATED points text

            scoreP1 += 100; // White Cube: 100 points (Updated)
            checkUnlocks(scoreP1); // <<< NEW: Check for unlocks after pickup score
            scene.remove(pickup); clearPickups.splice(i, 1);
            logTotalPickupCount("Collected Player Clear"); // Log count after removal
            // Clear walls AFTER adding effects
            trailSegments1.forEach(seg => scene.remove(seg)); trailSegments1.length = 0;
            trailSegments2.forEach(seg => scene.remove(seg)); trailSegments2.length = 0;
            lastTrailSegment1 = null;
            lastTrailSegment2 = null;

            pickupsCollectedCounter++;

            // DO NOT spawn standard replacement for clear wall pickup
            // spawnPickup();
            return true;
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
            scoreP1 += 20; // Blue Cube: 20 points
            checkUnlocks(scoreP1); // <<< NEW: Check for unlocks after pickup score
            scene.remove(pickup); zoomPickups.splice(i, 1);
            logTotalPickupCount("Collected Player Zoom"); // Log count after removal

            const currentTime = performance.now();
            let newLevelP1;
            if (isZoomedOutP1 && zoomOutEndTimeP1 > currentTime) {
                zoomLevelP1++;
                newLevelP1 = zoomLevelP1;
                console.log(`Zoom Out Stacked! New Level=${zoomLevelP1}`);
            } else {
                isZoomedOutP1 = true;
                zoomLevelP1 = 1;
                newLevelP1 = zoomLevelP1;
                console.log(`Zoom Out Activated! Level=${zoomLevelP1}`);
            }
            zoomOutEndTimeP1 = currentTime + zoomOutDuration;
            createFloatingText(`+20 Zoom Out! (Lv ${newLevelP1})`, pos, col);

            pickupsCollectedCounter++; // Increment counter

            // Spawn replacement: Spawn the *same type* back
            spawnPickup("zoom"); // Ensure specific type is passed
            return true;
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

            const currentTime = performance.now();
            let newLevelP1;
            if (isSparseTrailActiveP1 && sparseTrailEndTimeP1 > currentTime) {
                sparseLevelP1++;
                newLevelP1 = sparseLevelP1;
            } else {
                isSparseTrailActiveP1 = true;
                sparseLevelP1 = 1;
                newLevelP1 = sparseLevelP1;
            }
            sparseTrailEndTimeP1 = currentTime + sparseTrailDuration;
            trailCounterP1 = 0;
            createFloatingText(`+60 Sparse Trail! (Lv ${newLevelP1})`, pos, col);
            scoreP1 += 60; // Yellow Blocks: 60 points (Updated)
            checkUnlocks(scoreP1); // <<< NEW: Check for unlocks after pickup score
            scene.remove(pickup);
            sparseTrailPickups.splice(i, 1);
            logTotalPickupCount("Collected Player Sparse"); // Log count after removal

            pickupsCollectedCounter++; // Increment counter

            // Spawn replacement: Spawn the *same type* back
            spawnPickup("sparse"); // Ensure specific type is passed
            return true;
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
            createFloatingText("+200 Max ++!", pos, col); // Updated text with points
            scoreP1 += 200; // Purple Gems: 200 points (Updated)
            checkUnlocks(scoreP1); // <<< NEW: Check for unlocks after pickup score
            scene.remove(pickup); multiSpawnPickups.splice(i, 1);
            logTotalPickupCount("Collected Player Multi"); // Log count after removal
            pickupsCollectedCounter++; // Increment main counter BEFORE spawning replacements

            // --- Spawn Replacements According to Rules --- 
            // Rule: Spawns 2 powerups of random type.
            const availableSpawnTypes = [
                "score", "expansion", "clear", "zoom", 
                "sparse", "add_ai", "ammo" // <<< ADDED ammo
            ]; 
            let typesToSpawn = [];
            // Determine eligible types based on current unlocks and counts
            let eligibleRandomTypes = [];
            if (zoomPickups.length < maxZoomPickups) eligibleRandomTypes.push("zoom");
            if (scoreP1 >= 50 && scorePickups.length < maxScorePickups) eligibleRandomTypes.push("score");
            if (scoreP1 >= 200 && sparseTrailPickups.length < maxSparseTrailPickups) eligibleRandomTypes.push("sparse");
            if (scoreP1 >= 300 && clearPickups.length < maxClearPickups) eligibleRandomTypes.push("clear"); // Only if unlocked
            if (scoreP1 >= 1000 && addAiPickups.length < maxAddAiPickups) eligibleRandomTypes.push("add_ai"); // Only if unlocked
            if (scoreP1 >= 1500 && expansionPickups.length < maxExpansionPickups) eligibleRandomTypes.push("expansion"); // Only if unlocked
            if (scoreP1 >= 300 && ammoPickups.length < maxAmmoPickups) eligibleRandomTypes.push("ammo"); // <<< ADDED ammo eligibility
            // Note: Don't randomly spawn another 'multi' from here

            // Spawn first random type (if any are eligible)
            if (eligibleRandomTypes.length > 0) {
                const randomTypeIndex1 = Math.floor(Math.random() * eligibleRandomTypes.length);
                const typeToSpawn1 = eligibleRandomTypes[randomTypeIndex1];
                console.log(`Multi Spawn: Spawning random type 1: ${typeToSpawn1}`);
                spawnPickup(typeToSpawn1); 
                // Increase max count for the spawned type
                switch(typeToSpawn1) {
                    case "score": maxScorePickups++; break;
                    case "expansion": maxExpansionPickups++; break;
                    case "clear": maxClearPickups++; break;
                    case "zoom": maxZoomPickups++; break;
                    case "sparse": maxSparseTrailPickups++; break;
                    case "add_ai": maxAddAiPickups++; break;
                    case "ammo": maxAmmoPickups++; break; // <<< ADDED ammo max increase
                }
            }
            
            // Spawn second random type (if any are eligible)
             if (eligibleRandomTypes.length > 0) {
                const randomTypeIndex2 = Math.floor(Math.random() * eligibleRandomTypes.length);
                const typeToSpawn2 = eligibleRandomTypes[randomTypeIndex2];
                console.log(`Multi Spawn: Spawning random type 2: ${typeToSpawn2}`);
                spawnPickup(typeToSpawn2);
                 // Increase max count for the spawned type
                 switch(typeToSpawn2) {
                    case "score": maxScorePickups++; break;
                    case "expansion": maxExpansionPickups++; break;
                    case "clear": maxClearPickups++; break;
                    case "zoom": maxZoomPickups++; break;
                    case "sparse": maxSparseTrailPickups++; break;
                    case "add_ai": maxAddAiPickups++; break;
                    case "ammo": maxAmmoPickups++; break; // <<< ADDED ammo max increase
                }
            }

            // Rule: Spawns a new powerup with the same type.
            console.log("Multi Spawn: Spawning self-replacement.");
            spawnPickup("multi"); 

            // REMOVED extra clear wall spawn check from here
            
            return true;
        }
    }
    return false;
}

// --- AI Collision Checks --- 

function checkAIScorePickupCollision() {
    // Use the larger threshold
    for (let i = scorePickups.length - 1; i >= 0; i--) {
        const pickup = scorePickups[i];
        const dx = snakeTargetPosition2.x - pickup.position.x;
        const dz = snakeTargetPosition2.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) { // Use larger threshold
            const pos = pickup.position.clone(); const col = pickup.material.color.clone();
            createExplosionEffect(pos, col);
            // AI doesn't get points or floating text like player
            // createFloatingText("Speed Up!", pos, col); 
            scene.remove(pickup); scorePickups.splice(i, 1);
            logTotalPickupCount("Collected AI SpeedUp"); // Log count after removal
            if (!isSpeedBoostActiveAI) { 
                 snakeHead2.material.color.setHex(AI_HEAD_COLOR_BOOST);
            }
            isSpeedBoostActiveAI = true; speedBoostEndTimeAI = performance.now() + boostDuration;
            pickupsCollectedCounter++; // Increment counter

            // Spawn replacement for non-counter based pickups
            spawnPickup("score");
            return true;
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
            // AI doesn't get points or floating text like player
            // createFloatingText("Expand!", pos, col);
            scene.remove(pickup); expansionPickups.splice(i, 1);
            logTotalPickupCount("Collected AI Expand"); // Log count after removal

            const dirX = snakeDirection2.x;
            const dirZ = snakeDirection2.z;
            let expanded = false;
            if (dirX > 0.5) {
                boundaryXMax += expansionAmount;
                expanded = true;
            } else if (dirX < -0.5) {
                boundaryXMin -= expansionAmount;
                expanded = true;
            } else if (dirZ > 0.5) {
                boundaryZMax += expansionAmount;
                expanded = true;
            } else if (dirZ < -0.5) {
                boundaryZMin -= expansionAmount;
                expanded = true;
            }
             if (!expanded) {
                 // console.log(`  WARNING: AI expansion direction unclear - not expanding.`);
            }
            createPlayAreaVisuals(boundaryXMin, boundaryXMax, boundaryZMin, boundaryZMax);

            pickupsCollectedCounter++; // Increment counter

            // DO NOT spawn standard replacement for counter-based pickup
            // spawnPickup();
            return true;
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
            // AI doesn't get points or floating text like player
            // createFloatingText("Clear Walls!", pos, col);

            scene.remove(pickup); clearPickups.splice(i, 1);
            logTotalPickupCount("Collected AI Clear"); // Log count after removal
            // Clear walls AFTER adding effects
            trailSegments1.forEach(seg => scene.remove(seg)); trailSegments1.length = 0;
            trailSegments2.forEach(seg => scene.remove(seg)); trailSegments2.length = 0;
            lastTrailSegment1 = null;
            lastTrailSegment2 = null;

            pickupsCollectedCounter++;

            // DO NOT spawn standard replacement for clear wall pickup
            // spawnPickup();
            return true;
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
             // AI doesn't get points or floating text like player
            scene.remove(pickup); zoomPickups.splice(i, 1);
            logTotalPickupCount("Collected AI Zoom"); // Log count after removal
            pickupsCollectedCounter++; // Increment counter

            // Spawn replacement for non-counter based pickups
            spawnPickup("zoom");
            return true;
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

            const currentTime = performance.now();
            let newLevelAI;
            if (isSparseTrailActiveAI && sparseTrailEndTimeAI > currentTime) {
                sparseLevelAI++;
                newLevelAI = sparseLevelAI;
            } else {
                isSparseTrailActiveAI = true;
                sparseLevelAI = 1;
                newLevelAI = sparseLevelAI;
            }
            sparseTrailEndTimeAI = currentTime + sparseTrailDuration;
            trailCounterAI = 0;

            createFloatingText(`Sparse Trail! (Lv ${newLevelAI})`, pos, col);
            scene.remove(pickup);
            sparseTrailPickups.splice(i, 1);
            logTotalPickupCount("Collected AI Sparse"); // Log count after removal

            pickupsCollectedCounter++; // Increment counter

            // Spawn replacement for non-counter based pickups
            spawnPickup("sparse");
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
            // AI doesn't get points or floating text like player
            // createFloatingText("Max ++!", pos, col); 
            scene.remove(pickup); multiSpawnPickups.splice(i, 1);
            logTotalPickupCount("Collected AI Multi"); // Log count after removal
            pickupsCollectedCounter++; // Increment main counter BEFORE spawning replacements

            // --- Spawn Replacements According to Rules --- 
            // Rule: Spawns 2 powerups of random type.
            const availableSpawnTypes = [
                "score", "expansion", "clear", "zoom", 
                "sparse", "add_ai", "ammo" // <<< ADDED ammo
            ]; 
            let typesToSpawn = [];
            // Determine eligible types based on current unlocks and counts
            let eligibleRandomTypes = [];
            if (zoomPickups.length < maxZoomPickups) eligibleRandomTypes.push("zoom");
            if (scoreP1 >= 50 && scorePickups.length < maxScorePickups) eligibleRandomTypes.push("score");
            if (scoreP1 >= 200 && sparseTrailPickups.length < maxSparseTrailPickups) eligibleRandomTypes.push("sparse");
            if (scoreP1 >= 300 && clearPickups.length < maxClearPickups) eligibleRandomTypes.push("clear"); // Only if unlocked
            if (scoreP1 >= 1000 && addAiPickups.length < maxAddAiPickups) eligibleRandomTypes.push("add_ai"); // Only if unlocked
            if (scoreP1 >= 1500 && expansionPickups.length < maxExpansionPickups) eligibleRandomTypes.push("expansion"); // Only if unlocked
            if (scoreP1 >= 300 && ammoPickups.length < maxAmmoPickups) eligibleRandomTypes.push("ammo"); // <<< ADDED ammo eligibility
            // Note: Don't randomly spawn another 'multi' from here

            // Spawn first random type (if any are eligible)
            if (eligibleRandomTypes.length > 0) {
                const randomTypeIndex1 = Math.floor(Math.random() * eligibleRandomTypes.length);
                const typeToSpawn1 = eligibleRandomTypes[randomTypeIndex1];
                console.log(`AI Multi Spawn: Spawning random type 1: ${typeToSpawn1}`);
                spawnPickup(typeToSpawn1); 
                // Increase max count for the spawned type
                switch(typeToSpawn1) {
                    case "score": maxScorePickups++; break;
                    case "expansion": maxExpansionPickups++; break;
                    case "clear": maxClearPickups++; break;
                    case "zoom": maxZoomPickups++; break;
                    case "sparse": maxSparseTrailPickups++; break;
                    case "add_ai": maxAddAiPickups++; break;
                    case "ammo": maxAmmoPickups++; break; // <<< ADDED ammo max increase
                }
            }
            
            // Spawn second random type (if any are eligible)
             if (eligibleRandomTypes.length > 0) {
                const randomTypeIndex2 = Math.floor(Math.random() * eligibleRandomTypes.length);
                const typeToSpawn2 = eligibleRandomTypes[randomTypeIndex2];
                console.log(`AI Multi Spawn: Spawning random type 2: ${typeToSpawn2}`);
                spawnPickup(typeToSpawn2);
                 // Increase max count for the spawned type
                 switch(typeToSpawn2) {
                    case "score": maxScorePickups++; break;
                    case "expansion": maxExpansionPickups++; break;
                    case "clear": maxClearPickups++; break;
                    case "zoom": maxZoomPickups++; break;
                    case "sparse": maxSparseTrailPickups++; break;
                    case "add_ai": maxAddAiPickups++; break;
                    case "ammo": maxAmmoPickups++; break; // <<< ADDED ammo max increase
                }
            }

            // Rule: Spawns a new powerup with the same type.
            console.log("AI Multi Spawn: Spawning self-replacement.");
            spawnPickup("multi"); 

            // REMOVED extra clear wall spawn check from here

            return true;
        }
    }
    return false;
}

function checkAddAiPickupCollision() { // Player version
    for (let i = addAiPickups.length - 1; i >= 0; i--) {
        const pickup = addAiPickups[i];
        const dx = snakeTargetPosition1.x - pickup.position.x;
        const dz = snakeTargetPosition1.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) {
            const pos = pickup.position.clone(); const col = addAiPickupMaterial.color.clone();
            createExplosionEffect(pos, col);
            createFloatingText("+125 More Players!", pos, col); // <<< UPDATED points text
            scoreP1 += 125; // Add AI: 125 points (Updated)
            checkUnlocks(scoreP1); // <<< NEW: Check for unlocks after pickup score
            scene.remove(pickup); addAiPickups.splice(i, 1);
            logTotalPickupCount("Collected Player AddAI"); // Log count after removal
            // TODO: Implement actual AI spawning!
            pickupsCollectedCounter++; // Increment counter

            // DO NOT spawn standard replacement for counter-based pickup
            // spawnPickup();
            return true;
        }
    }
    return false;
}

function checkAIAddAiPickupCollision() { // AI version
     for (let i = addAiPickups.length - 1; i >= 0; i--) {
        const pickup = addAiPickups[i];
        const dx = snakeTargetPosition2.x - pickup.position.x;
        const dz = snakeTargetPosition2.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) {
            const pos = pickup.position.clone(); const col = addAiPickupMaterial.color.clone();
            createExplosionEffect(pos, col);
            // AI doesn't get points or floating text like player
            scene.remove(pickup); addAiPickups.splice(i, 1);
            logTotalPickupCount("Collected AI AddAI"); // Log count after removal
            // TODO: Implement actual AI spawning!
            pickupsCollectedCounter++; // Increment counter

            // DO NOT spawn standard replacement for counter-based pickup
            // spawnPickup();
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
        }
        // Check zoom expiry and reset level
        if (isZoomedOutP1 && currentTime > zoomOutEndTimeP1) {
            isZoomedOutP1 = false; 
            zoomLevelP1 = 0; // Reset level when timer expires
            console.log("Zoom Out P1 Expired.");
        }
        // Check sparse expiry and reset level
        if (isSparseTrailActiveP1 && currentTime > sparseTrailEndTimeP1) { 
            isSparseTrailActiveP1 = false;
            sparseLevelP1 = 1; // Reset level when timer expires
            console.log("Sparse Trail P1 Expired.");
        } 
        const currentUpdateIntervalP1 = isSpeedBoostActiveP1 ? boostedUpdateInterval : normalUpdateInterval;
        const deltaTimeP1 = currentTime - lastUpdateTimeP1;

        if (deltaTimeP1 > currentUpdateIntervalP1) {
            lastUpdateTimeP1 = currentTime - (deltaTimeP1 % currentUpdateIntervalP1);
            scoreP1 += scoreIncrementPerTick;
            checkUnlocks(scoreP1); // <<< NEW: Check for unlocks after tick score
            
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
            checkMultiSpawnPickupCollision();
            checkAddAiPickupCollision(); // Add check for new pickup
            checkAmmoPickupCollision(); // <<< ADDED ammo check call
        }

        // --- AI Update Logic ---
        if (isSpeedBoostActiveAI && currentTime > speedBoostEndTimeAI) {
            isSpeedBoostActiveAI = false;
            snakeHead2.material.color.setHex(AI_HEAD_COLOR_NORMAL); // Revert head color
        }
        // Check sparse expiry and reset level for AI
        if (isSparseTrailActiveAI && currentTime > sparseTrailEndTimeAI) { 
            isSparseTrailActiveAI = false;
            sparseLevelAI = 1; // Reset level when timer expires
            console.log("Sparse Trail AI Expired.");
        } 
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
            checkAIMultiSpawnPickupCollision();
            checkAIAddAiPickupCollision(); // Add check for new pickup
            checkAIAmmoPickupCollision(); // <<< UNCOMMENTED AI ammo check call
        }
        
        // --- Collision Check & Trail Creation (Run if either snake moved) --- 
        if (playerMoved || aiMoved) {
            winner = checkCollisions(snakeTargetPosition1, snakeTargetPosition2, trailSegments1, trailSegments2);

            // Create trail segments conditionally
            if (playerMoved && (winner === 0 || winner === 2)) { 
                // Log state BEFORE creating trail segment
                // console.log(`P1 Trail Check: SparseActive=${isSparseTrailActiveP1}, Level=${sparseLevelP1}, Counter=${trailCounterP1}`);
                const placeIntervalP1 = sparseLevelP1 + 1;
                // Visibility fix: Make last segment visible if this one is skipped
                if (isSparseTrailActiveP1 && trailCounterP1 % placeIntervalP1 !== 0 && lastTrailSegment1) {
                    lastTrailSegment1.visible = true;
                }
                // Only place trail if not sparse OR counter is at the interval based on level
                if (!isSparseTrailActiveP1 || trailCounterP1 % placeIntervalP1 === 0) {
                    createTrailSegment(prevTargetPos1, trailSegments1, 1);
                }
                trailCounterP1++; // Increment regardless of placement
            }
            if (aiMoved && (winner === 0 || winner === 1)) { 
                 // Log state BEFORE creating trail segment
                // console.log(`AI Trail Check: SparseActive=${isSparseTrailActiveAI}, Level=${sparseLevelAI}, Counter=${trailCounterAI}`);
                 const placeIntervalAI = sparseLevelAI + 1;
                 // Visibility fix: Make last segment visible if this one is skipped
                if (isSparseTrailActiveAI && trailCounterAI % placeIntervalAI !== 0 && lastTrailSegment2) {
                    lastTrailSegment2.visible = true;
                }
                 // Only place trail if not sparse OR counter is at the interval based on level
                if (!isSparseTrailActiveAI || trailCounterAI % placeIntervalAI === 0) {
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
                    console.log(`[Game Over] New Top Score! ${scoreP1} (Previous: ${topScore})`);
                    topScore = scoreP1;
                    localStorage.setItem('tronSnakeTopScore', topScore.toString());
                    // Update the display immediately
                    if(topScoreTextElement) topScoreTextElement.textContent = `Top Score: ${topScore}`; // Updated text prefix
                }
                // <<< ADD LOG HERE >>>
                console.log(`[Game Over Check] Value of topScore right after update check: ${topScore}`);
                
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
        // Determine current camera parameters based on zoom state and level
        // const currentHeight_old = isZoomedOutP1 ? zoomedOutCameraHeight : cameraHeight;
        // const currentDistance_old = isZoomedOutP1 ? zoomedOutCameraDistanceBehind : cameraDistanceBehind;
        
        // Dynamic zoom based on level
        const zoomMultiplier = 1 + (zoomLevelP1 * 0.8); // Base + 80% per level (Can adjust 0.8)
        const currentHeight = isZoomedOutP1 ? cameraHeight * zoomMultiplier : cameraHeight;
        const currentDistance = isZoomedOutP1 ? cameraDistanceBehind * zoomMultiplier : cameraDistanceBehind;

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

        // Calculate look target for indicators (ensure it's defined before use)
        const lookTarget = camera.position.clone();
        lookTarget.y += 1; // Tilt up slightly

        // Update player ammo indicator position 
        if (ammoIndicatorP1 && snakeHead1) {
            ammoIndicatorP1.position.copy(snakeHead1.position);
            ammoIndicatorP1.position.y += segmentSize * 0.7; // Position above head
            // Make indicator face camera slightly tilted up
            // const lookTarget = camera.position.clone(); // <<< MOVED Declaration outside block
            // lookTarget.y += 1; // Tilt up slightly
            ammoIndicatorP1.lookAt(lookTarget); 
        }
        // Update AI ammo indicator position 
        if (ammoIndicatorAI && snakeHead2) {
            ammoIndicatorAI.position.copy(snakeHead2.position);
            ammoIndicatorAI.position.y += segmentSize * 0.7; // Position above head
            ammoIndicatorAI.lookAt(lookTarget); // Use same look target as P1 for simplicity
        }

        // --- Projectile Update Loop (NEW) ---
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const proj = projectiles[i];
            
            // Update position
            proj.mesh.position.addScaledVector(proj.velocity, deltaTimeSeconds);
            proj.life -= deltaTimeSeconds;

            let hit = false;
            let removeProjectile = false;

            // Determine target trail based on owner
            const targetTrail = (proj.owner === 'player') ? trailSegments2 : trailSegments1;
            const targetColor = (proj.owner === 'player') ? AI_TRAIL_COLOR_NORMAL : P1_TRAIL_COLOR_NORMAL;
            const hitMsg = (proj.owner === 'player') ? "Player Projectile hit AI trail!" : "AI Projectile hit Player trail!";

            // Check collision with target trail segments
            for (let j = targetTrail.length - 1; j >= 0; j--) {
                const segment = targetTrail[j];
                // Simple distance check
                if (proj.mesh.position.distanceTo(segment.position) < segmentSize * 0.6) { 
                    console.log(hitMsg);
                    // Create effect at hit location
                    createExplosionEffect(segment.position, targetColor); 
                    // Remove the trail segment
                    scene.remove(segment);
                    targetTrail.splice(j, 1);
                    // Mark projectile for removal
                    hit = true;
                    removeProjectile = true;
                    break; // Projectile hits only one segment
                }
            }

            // Check boundary collision or lifetime expiry
            if (!hit) {
                 if (proj.life <= 0 || 
                    proj.mesh.position.x < boundaryXMin || proj.mesh.position.x > boundaryXMax ||
                    proj.mesh.position.z < boundaryZMin || proj.mesh.position.z > boundaryZMax)
                 {
                     removeProjectile = true;
                     // console.log("Projectile removed (boundary/timeout).");
                 }
            }

            // Remove projectile if marked
            if (removeProjectile) {
                scene.remove(proj.mesh);
                projectiles.splice(i, 1);
            }
        }

        // --- Projectile Update Loop (UPDATED for Trail and Self-Collision) ---
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const proj = projectiles[i];
            const currentProjPos = proj.mesh.position;
            
            // Update position
            currentProjPos.addScaledVector(proj.velocity, deltaTimeSeconds);
            proj.life -= deltaTimeSeconds;

            // --- Emit Trail Particles --- 
            // ... (trail particle emission code remains the same)

            let removeProjectile = false; 

            // --- Collision Checks --- 
            const opponentTrail = (proj.owner === 'player') ? trailSegments2 : trailSegments1;
            const ownerTrail = (proj.owner === 'player') ? trailSegments1 : trailSegments2;
            const opponentColor = (proj.owner === 'player') ? AI_TRAIL_COLOR_NORMAL : P1_TRAIL_COLOR_NORMAL;
            const ownerColor = (proj.owner === 'player') ? P1_TRAIL_COLOR_NORMAL : AI_TRAIL_COLOR_NORMAL;

            // 1. Check collision with OPPONENT trail first
            for (let j = opponentTrail.length - 1; j >= 0; j--) {
                const segment = opponentTrail[j];
                if (currentProjPos.distanceTo(segment.position) < segmentSize * 0.6) { 
                    console.log(`Projectile (${proj.owner}) hit OPPONENT trail.`);
                    createExplosionEffect(segment.position, opponentColor); 
                    scene.remove(segment);
                    opponentTrail.splice(j, 1);
                    removeProjectile = true;
                    break; // Projectile hits only one segment
                }
            }

            // If opponent trail was hit, remove projectile and skip owner check
            if (removeProjectile) {
                scene.remove(proj.mesh);
                projectiles.splice(i, 1);
                continue; // Move to the next projectile
            }

            // 2. If no opponent hit, check collision with OWNER trail
            for (let j = ownerTrail.length - 1; j >= 0; j--) {
                const segment = ownerTrail[j];
                if (currentProjPos.distanceTo(segment.position) < segmentSize * 0.6) { 
                    console.log(`Projectile (${proj.owner}) hit OWN trail.`);
                    createExplosionEffect(segment.position, ownerColor); 
                    scene.remove(segment);
                    ownerTrail.splice(j, 1);
                    removeProjectile = true;
                    break; // Projectile hits only one segment
                }
            }
            
            // If owner trail was hit, mark for removal (will be handled below)
            // No need for another 'continue' here, falls through to boundary/lifetime check

            // Check boundary collision or lifetime expiry (only if no hit occurred yet)
            if (!removeProjectile) { // Check if already marked for removal by hit
                 if (proj.life <= 0 || 
                    currentProjPos.x < boundaryXMin || currentProjPos.x > boundaryXMax ||
                    currentProjPos.z < boundaryZMin || currentProjPos.z > boundaryZMax)
                 {
                     removeProjectile = true;
                     // console.log("Projectile removed (boundary/timeout).");
                 }
            }

            // Remove projectile if marked for any reason (opponent hit, owner hit, boundary, timeout)
            if (removeProjectile) {
                scene.remove(proj.mesh);
                projectiles.splice(i, 1);
            }
        }

        // --- Trail Particle Update Loop --- 
        // ... (trail particle update code remains the same)

        // Update AI ammo indicator position (NEW)
        if (ammoIndicatorAI && snakeHead2) {
            ammoIndicatorAI.position.copy(snakeHead2.position);
            ammoIndicatorAI.position.y += segmentSize * 0.7; // Position above head
            ammoIndicatorAI.lookAt(lookTarget); // Use same look target as P1 for simplicity
        }

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
    // const cubeHeight = segmentSize * 0.45; // Old height
    const cubeHeight = segmentSize * 0.27; // New height (60% of 0.45)
    const cubeDepth = segmentSize * 0.8; // Keep slightly narrow
    // const gap = 0.1; // Old gap
    const gap = 0.3; // Increased gap between cubes

    const cubeGeom = new THREE.BoxGeometry(cubeWidth, cubeHeight, cubeDepth); // Use new height
    const cubeMesh1 = new THREE.Mesh(cubeGeom.clone(), sparseTrailMaterial); // Clone geometry
    const cubeMesh2 = new THREE.Mesh(cubeGeom.clone(), sparseTrailMaterial); // Clone geometry

    cubeMesh1.position.y = -(cubeHeight / 2 + gap / 2);
    cubeMesh2.position.y = (cubeHeight / 2 + gap / 2);

    group.add(cubeMesh1);
    group.add(cubeMesh2);

    return group;
}
// Create the template visual once
const sparseTrailPickupTemplate = createSparseTrailPickupVisual();

// --- Create Ammo Pickup Visual Function (REMOVED - Now using sphere) ---
/*
function createAmmoPickupVisual() {
    const group = new THREE.Group();
    const cubeWidth = segmentSize * 0.8; 
    const cubeHeight = segmentSize * 0.27; 
    const cubeDepth = segmentSize * 0.8; 
    const gap = 0.3; 

    const cubeGeom = new THREE.BoxGeometry(cubeWidth, cubeHeight, cubeDepth); 
    // Use ammoMaterial here
    const cubeMesh1 = new THREE.Mesh(cubeGeom.clone(), ammoPickupMaterial); 
    const cubeMesh2 = new THREE.Mesh(cubeGeom.clone(), ammoPickupMaterial); 

    cubeMesh1.position.y = -(cubeHeight / 2 + gap / 2);
    cubeMesh2.position.y = (cubeHeight / 2 + gap / 2);

    group.add(cubeMesh1);
    group.add(cubeMesh2);

    return group;
}
// Create the template visual once
ammoPickupTemplate = createAmmoPickupVisual(); // Initialize the template
*/

// --- Ammo Indicator Update Function (NEW) ---
function updateAmmoIndicatorP1() {
    if (!snakeHead1) return; // Safety check

    // Create group if it doesn't exist
    if (!ammoIndicatorP1) {
        ammoIndicatorP1 = new THREE.Group();
        scene.add(ammoIndicatorP1);
    }

    // Clear existing indicators
    while (ammoIndicatorP1.children.length) {
        ammoIndicatorP1.remove(ammoIndicatorP1.children[0]);
    }

    // Add small cubes based on ammoCountP1
    const indicatorSize = 0.2;
    const indicatorSpacing = 0.25;
    const indicatorGeometry = new THREE.BoxGeometry(indicatorSize, indicatorSize, indicatorSize);
    // Use a slightly different material (e.g., less emissive) to differentiate from pickup
    const indicatorMaterial = new THREE.MeshPhongMaterial({ color: AMMO_COLOR }); 

    for (let i = 0; i < ammoCountP1; i++) {
        const indicatorMesh = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        // Position cubes horizontally
        indicatorMesh.position.x = (i - (ammoCountP1 - 1) / 2) * indicatorSpacing;
        ammoIndicatorP1.add(indicatorMesh);
    }

    // Initial position update (will be updated in animate)
    ammoIndicatorP1.position.copy(snakeHead1.position);
    ammoIndicatorP1.position.y += segmentSize * 0.7; 
}

// --- AI Ammo Indicator Update Function (NEW) ---
function updateAmmoIndicatorAI() {
    if (!snakeHead2) return; // Safety check

    // Create group if it doesn't exist
    if (!ammoIndicatorAI) {
        ammoIndicatorAI = new THREE.Group();
        scene.add(ammoIndicatorAI);
    }

    // Clear existing indicators
    while (ammoIndicatorAI.children.length) {
        ammoIndicatorAI.remove(ammoIndicatorAI.children[0]);
    }

    // Add small cubes based on ammoCountAI
    const indicatorSize = 0.2;
    const indicatorSpacing = 0.25;
    const indicatorGeometry = new THREE.BoxGeometry(indicatorSize, indicatorSize, indicatorSize);
    const indicatorMaterial = new THREE.MeshPhongMaterial({ color: AMMO_COLOR }); 

    for (let i = 0; i < ammoCountAI; i++) {
        const indicatorMesh = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        indicatorMesh.position.x = (i - (ammoCountAI - 1) / 2) * indicatorSpacing;
        ammoIndicatorAI.add(indicatorMesh);
    }

    // Initial position update (will be updated in animate)
    ammoIndicatorAI.position.copy(snakeHead2.position);
    ammoIndicatorAI.position.y += segmentSize * 0.7; 
}

// --- Touch Controls --- 
function onTouchStart(event) {
    // --- Add Game Over Check First --- 
    if (isGameOver) {
        resetGame();
        event.preventDefault(); // Prevent default actions if we reset
        return; // Stop further processing for this touch
    }
    // ----------------------------------
    
    if (!gameActive) return; // Keep check for when game hasn't started yet (but not game over)
    event.preventDefault(); // Prevent scrolling/zooming

    const lookBackZoneHeight = window.innerHeight / 3; // Bottom third
    const shootZoneHeight = window.innerHeight / 3;    // Top third (NEW)
    const turnZoneWidth = window.innerWidth / 2;

    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        const touchX = touch.clientX;
        const touchY = touch.clientY;

        // Check for Shoot first (Top Zone)
        if (touchY < shootZoneHeight) {
            shootProjectile(); 
            // console.log("Touch Shoot Activated");
        } 
        // Check for Look Back (Bottom Zone) - Use else if to make zones exclusive
        else if (touchY > window.innerHeight - lookBackZoneHeight) {
            if (lookBackTouchId === null) { // Only allow one finger for look back
                isLookingBack = true;
                lookBackTouchId = touch.identifier;
                // console.log("Touch Look Back ON, ID:", lookBackTouchId);
            }
        } 
        // If not Shoot or Look Back, check for Turns (Middle Zone)
        else { 
             if (touchX < turnZoneWidth) {
                 // Turn Left
                 snakeDirection1.applyAxisAngle(yAxis, Math.PI / 2);
                 // console.log("Touch Turn Left");
             } else {
                 // Turn Right
                 snakeDirection1.applyAxisAngle(yAxis, -Math.PI / 2);
                 // console.log("Touch Turn Right");
             }
        }
    }
}

function onTouchEnd(event) {
    if (!gameActive) return; // Check gameActive just in case
    event.preventDefault();

    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        // If the touch that ended was the one used for looking back
        if (touch.identifier === lookBackTouchId) {
            isLookingBack = false;
            lookBackTouchId = null; // Clear the stored ID
            // console.log("Touch Look Back OFF, ID:", touch.identifier);
            break; // Assume only one look back touch
        }
    }
}

// --- Helper to check if a grid cell contains a wall ---
function isCellWall(gridX, gridZ) {
    const worldX = snapToGridCenter(boundaryXMin + gridX * segmentSize, 'x');
    const worldZ = snapToGridCenter(boundaryZMin + gridZ * segmentSize, 'z');
    const checkPos = new THREE.Vector3(worldX, 0, worldZ); // Y doesn't matter for this check
    const wallCheckThreshold = segmentSize * 0.45; // Use same threshold as pickup check

    for (const seg of [...trailSegments1, ...trailSegments2]) {
        if (checkPos.distanceTo(seg.position) < wallCheckThreshold) {
            return true; // Found a wall segment in this cell
        }
    }
    return false; // No wall segments found
}

// --- Helper to check if any adjacent cell has a wall ---
function isCellAdjacentToWall(gridX, gridZ) {
    const { divisionsX, divisionsZ } = getGridDimensions();
    const neighbors = [
        { dx: 1, dz: 0 }, // Right
        { dx: -1, dz: 0 }, // Left
        { dx: 0, dz: 1 }, // Up (relative to grid)
        { dx: 0, dz: -1 } // Down (relative to grid)
    ];

    for (const neighbor of neighbors) {
        const checkX = gridX + neighbor.dx;
        const checkZ = gridZ + neighbor.dz;

        // Basic boundary check for the neighbor coordinates
        if (checkX < 0 || checkX >= divisionsX || checkZ < 0 || checkZ >= divisionsZ) {
            continue; // Neighbor is outside grid bounds
        }

        if (isCellWall(checkX, checkZ)) {
            // console.log(`Spawn Rejected: Adjacent wall found at grid (${checkX}, ${checkZ}) relative to (${gridX}, ${gridZ})`);
            return true; // Found a wall in an adjacent cell
        }
    }
    return false; // No adjacent walls found
}

// --- Helper Function to Log Total Pickups ---
function logTotalPickupCount(contextMessage) {
    const totalPickups = 
        zoomPickups.length + 
        scorePickups.length + 
        sparseTrailPickups.length + 
        clearPickups.length + 
        addAiPickups.length + 
        expansionPickups.length + 
        multiSpawnPickups.length;
    console.log(`PICKUP COUNT (${contextMessage}): ${totalPickups}`);
}

// --- Shoot Projectile Function (NEW) ---
function shootProjectile() {
    if (isGameOver || !gameActive || ammoCountP1 <= 0 || !snakeHead1) {
        return; // Can't shoot if game over, inactive, no ammo, or no head
    }

    ammoCountP1--;
    updateAmmoIndicatorP1(); // Update visual

    // Create projectile slightly in front of the head
    const startPos = snakeHead1.position.clone().addScaledVector(snakeDirection1, segmentSize * 0.6);
    startPos.y = 0; // Keep projectile on the ground plane initially
    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    projectile.position.copy(startPos);

    const velocity = snakeDirection1.clone().multiplyScalar(PROJECTILE_SPEED);

    projectiles.push({
        mesh: projectile,
        velocity: velocity,
        life: 2.0, // Max lifetime in seconds to prevent stray projectiles
        owner: 'player' // <<< ADDED owner property
    });
    scene.add(projectile);
    // console.log(`Projectile shot! Ammo left: ${ammoCountP1}`);
}

// --- AI Shoot Projectile Function (NEW) ---
function aiShootProjectile() {
    if (isGameOver || !gameActive || ammoCountAI <= 0 || !snakeHead2) {
        return; // Can't shoot
    }

    ammoCountAI--;
    updateAmmoIndicatorAI(); // Update visual

    // Create projectile slightly in front of the head
    const startPos = snakeHead2.position.clone().addScaledVector(snakeDirection2, segmentSize * 0.6);
    startPos.y = 0; // Keep projectile on the ground plane initially
    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    projectile.position.copy(startPos);

    const velocity = snakeDirection2.clone().multiplyScalar(PROJECTILE_SPEED);

    projectiles.push({
        mesh: projectile,
        velocity: velocity,
        life: 2.0, // Max lifetime
        owner: 'ai' // <<< Set owner to AI
    });
    scene.add(projectile);
    // console.log(`AI Projectile shot! Ammo left: ${ammoCountAI}`);
}

// --- Player Pickup Collision Checks ---

function checkAmmoPickupCollision() { // <<< NEW Function
    // Use the larger threshold
    for (let i = ammoPickups.length - 1; i >= 0; i--) {
        const pickup = ammoPickups[i];
        const dx = snakeTargetPosition1.x - pickup.position.x;
        const dz = snakeTargetPosition1.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) { // Use larger threshold
            const pos = pickup.position.clone(); 
            const col = ammoPickupMaterial.color.clone();
            createExplosionEffect(pos, col);
            createFloatingText("+80 Ammo!", pos, col); // Ammo points: 80
            scoreP1 += 80; 
            checkUnlocks(scoreP1); // <<< NEW: Check for unlocks after pickup score
            scene.remove(pickup); ammoPickups.splice(i, 1);
            logTotalPickupCount("Collected Player Ammo"); 
            
            ammoCountP1++; // Increment ammo count
            updateAmmoIndicatorP1(); // Update visual indicator
            
            pickupsCollectedCounter++; // Increment main counter

            // DO NOT spawn replacement for counter-based pickup (Ammo)
            // spawnPickup("ammo"); 
            return true;
        }
    }
    return false;
}

// NEW function for AI Ammo Collection
function checkAIAmmoPickupCollision() { 
    // Use the larger threshold
    for (let i = ammoPickups.length - 1; i >= 0; i--) {
        const pickup = ammoPickups[i];
        const dx = snakeTargetPosition2.x - pickup.position.x;
        const dz = snakeTargetPosition2.z - pickup.position.z;
        if ((dx * dx + dz * dz) < PICKUP_COLLISION_THRESHOLD_SQ) { // Use larger threshold
            const pos = pickup.position.clone(); 
            const col = ammoPickupMaterial.color.clone();
            createExplosionEffect(pos, col); // Keep effect
            // AI doesn't get points or floating text
            scene.remove(pickup); ammoPickups.splice(i, 1);
            logTotalPickupCount("Collected AI Ammo"); 
            
            ammoCountAI++; // Increment AI ammo count
            updateAmmoIndicatorAI(); // Update AI visual indicator
            
            pickupsCollectedCounter++; // Increment main counter

            // DO NOT spawn replacement for counter-based pickup (Ammo)
            // spawnPickup("ammo"); 
            return true;
        }
    }
    return false;
}

// --- Unlock Check Function (NEW) ---
const UNLOCK_THRESHOLDS = [
    { score: 50, name: "Speed Up!", color: 0xff00ff, type: "score" },
    { score: 200, name: "Sparse Trail!", color: 0xffff00, type: "sparse" },
    { score: 300, name: "Ammo!", color: 0xffa500, type: "ammo" },
    { score: 500, name: "Clear Walls!", color: 0xffffff, type: "clear" },
    { score: 1000, name: "More Players!", color: 0x888888, type: "add_ai" },
    { score: 1500, name: "Expand!", color: 0x00ff00, type: "expansion" },
    { score: 2000, name: "More!", color: 0x9900ff, type: "multi" }
];

function checkUnlocks(currentScore) {
    if (!snakeHead1) return; // Need player head position

    // console.log(`Checking unlocks for score: ${currentScore}, TopScoreAtStart: ${topScoreAtGameStart}`); // Add top level log

    for (const unlock of UNLOCK_THRESHOLDS) {
        // console.log(`  Evaluating: ${unlock.name} (req: ${unlock.score})`); // Log which unlock is being checked
        const alreadyUnlockedThisGame = unlockedScoresThisGame.has(unlock.score);
        // console.log(`    Already unlocked this game? ${alreadyUnlockedThisGame}`);

        if (currentScore >= unlock.score && !alreadyUnlockedThisGame) {
            console.log(`>>> Threshold Met for ${unlock.name} <<<`); // Log threshold met
            console.log(`    Current Score: ${currentScore}, Unlock Score: ${unlock.score}, Top Score at Start: ${topScoreAtGameStart}`);
            unlockedScoresThisGame.add(unlock.score);

            // Only show notification AND spawn if this is a NEW unlock compared to the start of the game
            const isNewUnlock = unlock.score > topScoreAtGameStart;
            console.log(`    Is this a new unlock this session? ${isNewUnlock} (${unlock.score} > ${topScoreAtGameStart})`);

            if (isNewUnlock) {
                console.log(`    [Action] Announcing and Spawning: ${unlock.name}`);
                console.log(`--- UNLOCKED (New this Session): ${unlock.name} at score ${currentScore} ---`);
                
                // Create floating text notification near player head (MOVED INSIDE)
                const textPos = snakeHead1.position.clone();
                textPos.y += 1.0; // Position slightly higher for visibility
                createFloatingText(`Unlocked: ${unlock.name}`, textPos, new THREE.Color(unlock.color));

                // Attempt to spawn the newly unlocked pickup ONLY if it's a new unlock this session (MOVED INSIDE)
                console.log(`  -> Attempting initial spawn for newly unlocked: ${unlock.type}`);
                spawnPickup(unlock.type);
            } else {
                console.log(`    [Action] Skipping Announce/Spawn (Already Available): ${unlock.name}`);
                console.log(`--- UNLOCKED (Already Available): ${unlock.name} at score ${currentScore} ---`);
                // Do not spawn or notify if already available at game start
            }
        }
    }
}

init(); 