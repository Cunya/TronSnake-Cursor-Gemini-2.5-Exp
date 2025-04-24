import * as THREE from 'three';

const GAME_VERSION = "v0.3.4";

let scene, camera, renderer;
let planeMesh, gridMesh;

// Player 1
let snakeHead1;
let snakeTargetPosition1 = new THREE.Vector3(); // Logical position
let prevTargetPos1 = new THREE.Vector3(); // Previous logical position
let snakeDirection1 = new THREE.Vector3(1, 0, 0); // Start moving right
const trailSegments1 = [];
let lastTrailSegment1 = null; // Track the last added segment for visibility
const headMaterial1 = new THREE.MeshPhongMaterial({ color: 0x00ffff }); // Cyan
const trailMaterial1 = new THREE.MeshPhongMaterial({ color: 0x00aaaa }); // Darker Cyan
let isSpeedBoostActiveP1 = false;
let speedBoostEndTimeP1 = 0;
let lastUpdateTimeP1 = 0;

// Player 2 (AI)
let snakeHead2;
let snakeTargetPosition2 = new THREE.Vector3(); // Logical position
let prevTargetPos2 = new THREE.Vector3(); // Previous logical position
let snakeDirection2 = new THREE.Vector3(-1, 0, 0); // Start moving left
const trailSegments2 = [];
let lastTrailSegment2 = null; // Track the last added segment for visibility
const headMaterial2 = new THREE.MeshPhongMaterial({ color: 0xff8800 }); // Orange
const trailMaterial2 = new THREE.MeshPhongMaterial({ color: 0xcc6600 }); // Darker Orange
let isSpeedBoostActiveAI = false;
let speedBoostEndTimeAI = 0;
let lastUpdateTimeAI = 0;
let isLookingBack = false; // Flag for look back camera

// Common Game Settings
const segmentSize = 1;
const normalUpdateInterval = 250; // Normal speed
const boostedUpdateInterval = 125; // Faster speed (half interval)
const boostDuration = 3000; // milliseconds (3 seconds)
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
const cameraLag = 0.08;
const lookBackDistance = 5; // How far behind the snake the camera goes
const lookAheadTarget = 10; // How far the camera looks ahead during look back
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
const lookBackPosition = new THREE.Vector3(); // Temp vector for look back calc
const lookAheadPoint = new THREE.Vector3(); // Temp vector for look back target

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

    // Initial Snake Heads (Slightly larger head geometry)
    const headSize = segmentSize * 1.05; // Make head 5% bigger
    const headGeometry = new THREE.BoxGeometry(headSize, headSize, headSize);
    snakeHead1 = new THREE.Mesh(headGeometry.clone(), headMaterial1); // Ensure P1 uses headMaterial1 (Cyan)
    const startPos1X = snapToGridCenter(boundaryXMin + segmentSize, 'x');
    const startPos1Z = snapToGridCenter(0, 'z');
    snakeHead1.position.set(startPos1X, 0, startPos1Z); 
    snakeTargetPosition1.set(startPos1X, 0, startPos1Z); 
    prevTargetPos1.copy(snakeTargetPosition1); 
    scene.add(snakeHead1);

    snakeHead2 = new THREE.Mesh(headGeometry.clone(), headMaterial2); // Ensure P2 uses headMaterial2 (Orange)
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
        if (event.key === ' ') resetGame();
        return; 
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

function createTrailSegment(position, material, trailArray, playerIndex) {
    const segmentGeometry = new THREE.BoxGeometry(segmentSize, segmentSize, segmentSize);
    const trailSegment = new THREE.Mesh(segmentGeometry, material);
    trailSegment.position.copy(position); 

    if (playerIndex === 1) {
        // // Make the previous segment visible (REMOVED - Handled in animate)
        // if (lastTrailSegment1) {
        //     lastTrailSegment1.visible = true;
        // }
        // Make the new segment invisible initially
        trailSegment.visible = false;
        // Update the reference to the newest segment
        lastTrailSegment1 = trailSegment;
    } else { // Player 2 (AI)
        // // Make the previous segment visible (REMOVED - Handled in animate)
        // if (lastTrailSegment2) {
        //     lastTrailSegment2.visible = true;
        // }
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
    const allPickups = [...scorePickups, ...expansionPickups, ...clearPickups]; 
    for (const pickup of allPickups) {
        const distSq = currentPos.distanceToSquared(pickup.position);
        if (distSq < closestDistSq) {
            // Simple distance check is enough here, directionality handled below
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
    
    // Evaluate Turns (LookaheadSteps)
    const possibleTurns = []; // Turns safe for lookAheadSteps
    const backupTurns = []; // Turns safe for only 1 step
    const turnDirections = [
        potentialDirections.left,  // Use pre-calculated left
        potentialDirections.right // Use pre-calculated right
    ];

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
            possibleTurns.push(turnDir.clone()); // Clone needed here
        } else if (turnSafeOneStep) {
            backupTurns.push(turnDir.clone()); // Clone needed here
        }
    }

    // Decision Making (Avoidance)
    if (possibleTurns.length > 0) {
        const chosenTurnIndex = Math.floor(Math.random() * possibleTurns.length);
        // console.log(`AI: Avoidance - Choosing safe turn (${possibleTurns.length} options).`);
        snakeDirection2.copy(possibleTurns[chosenTurnIndex]);
        return;
    } else if (backupTurns.length > 0) {
        const chosenTurnIndex = Math.floor(Math.random() * backupTurns.length);
        // console.log(`AI: Avoidance - Choosing backup turn (${backupTurns.length} options).`);
        snakeDirection2.copy(backupTurns[chosenTurnIndex]);
        return;
    } else if (safeForward) {
        // console.log("AI: Avoidance - Turns blocked, forcing forward.");
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
        `<p style="margin-bottom: 20px;">Collect <strong style="color: #ffffff;">White Cubes</strong> to clear all walls!</p>` +
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

    gameOverTextElement.innerHTML = 
        `${message}<br>` +
        `<span style="font-size: 32px; color: #cccccc;">Final Score: ${scoreP1}</span><br>` +
        `<span style="font-size: 24px;">Press Space to Restart</span>`;
    gameOverTextElement.style.display = 'block';
}

function resetGame() {
    isGameOver = false;
    winner = 0;
    scoreP1 = 0; // Reset score
    isSpeedBoostActiveP1 = false; // Reset P1 boost state
    speedBoostEndTimeP1 = 0;
    isSpeedBoostActiveAI = false; // Reset AI boost state
    speedBoostEndTimeAI = 0;
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

    // Reset snake positions & colors (Re-confirm hex codes)
    const startPos1X = snapToGridCenter(boundaryXMin + segmentSize, 'x');
    const startPos1Z = snapToGridCenter(0, 'z');
    snakeHead1.position.set(startPos1X, 0, startPos1Z);
    snakeTargetPosition1.set(startPos1X, 0, startPos1Z);
    prevTargetPos1.copy(snakeTargetPosition1);
    snakeDirection1.set(1, 0, 0);
    snakeHead1.material.color.setHex(0x00ffff); // Ensure P1 resets to Cyan

    const startPos2X = snapToGridCenter(boundaryXMax - segmentSize, 'x');
    const startPos2Z = snapToGridCenter(0, 'z');
    snakeHead2.position.set(startPos2X, 0, startPos2Z);
    snakeTargetPosition2.set(startPos2X, 0, startPos2Z);
    prevTargetPos2.copy(snakeTargetPosition2);
    snakeDirection2.set(-1, 0, 0);
    snakeHead2.material.color.setHex(0xff8800); // Ensure P2 resets to Orange
    
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
}

function spawnInitialPickups() {
    // Ensure scene is clear before spawning initial ones (relevant for reset)
    scorePickups.forEach(p => scene.remove(p));
    scorePickups.length = 0;
    expansionPickups.forEach(p => scene.remove(p));
    expansionPickups.length = 0;
    clearPickups.forEach(p => scene.remove(p)); // Clear this too
    clearPickups.length = 0;
    
    // Spawn initial set, maybe guarantee one of each type if possible
    spawnPickup("score"); 
    spawnPickup("expansion");
    spawnPickup("clear");
    // Fill remaining slots randomly if needed
    // while ((scorePickups.length + expansionPickups.length + clearPickups.length) < (maxScorePickups + maxExpansionPickups + maxClearPickups)) {
    //     spawnPickup();
    // }
}

// Spawns a pickup, optionally forcing expansion type
function spawnPickup(forceType = null) {
    let pickupType = forceType;
    
    if (!pickupType) { // Determine randomly if not forced
        const rand = Math.random();
        if (rand < clearPickupSpawnChance && clearPickups.length < maxClearPickups) {
            pickupType = "clear";
        } else if (rand < clearPickupSpawnChance + expansionPickupSpawnChance && expansionPickups.length < maxExpansionPickups) {
            pickupType = "expansion";
        } else if (scorePickups.length < maxScorePickups) { 
            pickupType = "score";
        } else {
            // Try falling back if preferred type is full
            if (clearPickups.length < maxClearPickups) pickupType = "clear";
            else if (expansionPickups.length < maxExpansionPickups) pickupType = "expansion";
            else if (scorePickups.length < maxScorePickups) pickupType = "score";
            else {
                 console.log("Cannot spawn any pickup type - all maxed out.");
                 return; // All types are full
            }
        }
    }
    
    // Double check max count for the determined type
    if (pickupType === "clear" && clearPickups.length >= maxClearPickups) pickupType = null;
    if (pickupType === "expansion" && expansionPickups.length >= maxExpansionPickups) pickupType = null;
    if (pickupType === "score" && scorePickups.length >= maxScorePickups) pickupType = null;

    if (!pickupType) {
        // If the forced or randomly chosen type was full, try to find *any* available slot
         if (clearPickups.length < maxClearPickups) pickupType = "clear";
         else if (expansionPickups.length < maxExpansionPickups) pickupType = "expansion";
         else if (scorePickups.length < maxScorePickups) pickupType = "score";
         else return; // Still no slot available
    }

    let geometry, material, targetArray;
    switch (pickupType) {
        case "clear":
            geometry = clearPickupGeometry;
            material = clearPickupMaterial;
            targetArray = clearPickups;
            break;
        case "expansion":
            geometry = expansionPickupGeometry;
            material = expansionPickupMaterial;
            targetArray = expansionPickups;
            break;
        case "score": // Default to score/speed
        default:
            geometry = scorePickupGeometry;
            material = scorePickupMaterial;
            targetArray = scorePickups;
            break;
    }

    const maxAttempts = 50;
    const { divisionsX, divisionsZ } = getGridDimensions();
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const gridX = Math.floor(Math.random() * divisionsX);
        const gridZ = Math.floor(Math.random() * divisionsZ);
        const worldX = snapToGridCenter(boundaryXMin + gridX * segmentSize, 'x');
        const worldZ = snapToGridCenter(boundaryZMin + gridZ * segmentSize, 'z');
        const potentialPos = new THREE.Vector3(worldX, 0, worldZ);
        const collisionThreshold = segmentSize * 0.1;

        if (!isPositionOccupied(potentialPos, collisionThreshold)) {
            const pickup = new THREE.Mesh(geometry, material);
            pickup.position.copy(potentialPos);
            scene.add(pickup);
            targetArray.push(pickup);
            // console.log(`Spawned ${pickupType} pickup at`, potentialPos);
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
    return false;
}

function checkScorePickupCollision() {
    for (let i = scorePickups.length - 1; i >= 0; i--) {
        const pickup = scorePickups[i];
        if (snakeTargetPosition1.distanceTo(pickup.position) < segmentSize * 0.1) {
            scoreP1 += pickupScoreValue;
            scene.remove(pickup);
            scorePickups.splice(i, 1);
            isSpeedBoostActiveP1 = true; // Set PLAYER boost
            speedBoostEndTimeP1 = performance.now() + boostDuration;
            spawnPickup(); 
            return true;
        }
    }
    return false;
}

function checkExpansionPickupCollision() {
     for (let i = expansionPickups.length - 1; i >= 0; i--) {
        const pickup = expansionPickups[i];
        if (snakeTargetPosition1.distanceTo(pickup.position) < segmentSize * 0.1) {
            console.log("Player Expansion pickup collected!");
            scene.remove(pickup);
            expansionPickups.splice(i, 1);

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

            spawnPickup();
            return true;
        }
    }
    return false;
}

function checkClearPickupCollision() {
    for (let i = clearPickups.length - 1; i >= 0; i--) {
        const pickup = clearPickups[i];
        if (snakeTargetPosition1.distanceTo(pickup.position) < segmentSize * 0.1) {
            console.log("Player collected Clear Wall pickup!");
            scene.remove(pickup);
            clearPickups.splice(i, 1);
            trailSegments1.forEach(seg => scene.remove(seg));
            trailSegments1.length = 0;
            trailSegments2.forEach(seg => scene.remove(seg));
            trailSegments2.length = 0;
            lastTrailSegment1 = null; // Clear tracker
            lastTrailSegment2 = null; // Clear tracker
            console.log("  Walls cleared!");
            spawnPickup();
            return true;
        }
    }
    return false;
}

function checkAIScorePickupCollision() {
    for (let i = scorePickups.length - 1; i >= 0; i--) {
        const pickup = scorePickups[i];
        if (snakeTargetPosition2.distanceTo(pickup.position) < segmentSize * 0.1) {
            console.log("AI collected score pickup!");
            scene.remove(pickup);
            scorePickups.splice(i, 1);
            isSpeedBoostActiveAI = true; // Set AI boost
            speedBoostEndTimeAI = performance.now() + boostDuration;
            spawnPickup(); 
            return true;
        }
    }
    return false;
}

function checkAIExpansionPickupCollision() {
     for (let i = expansionPickups.length - 1; i >= 0; i--) {
        const pickup = expansionPickups[i];
        if (snakeTargetPosition2.distanceTo(pickup.position) < segmentSize * 0.1) {
            console.log("AI collected expansion pickup!");
            scene.remove(pickup);
            expansionPickups.splice(i, 1);

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

            spawnPickup();
            return true;
        }
    }
    return false;
}

function checkAIClearPickupCollision() {
    for (let i = clearPickups.length - 1; i >= 0; i--) {
        const pickup = clearPickups[i];
        if (snakeTargetPosition2.distanceTo(pickup.position) < segmentSize * 0.1) {
            console.log("AI collected Clear Wall pickup!");
            scene.remove(pickup);
            clearPickups.splice(i, 1);
            trailSegments1.forEach(seg => scene.remove(seg));
            trailSegments1.length = 0;
            trailSegments2.forEach(seg => scene.remove(seg));
            trailSegments2.length = 0;
            lastTrailSegment1 = null; // Clear tracker
            lastTrailSegment2 = null; // Clear tracker
            console.log("  Walls cleared by AI!");
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

    let playerMoved = false;
    let aiMoved = false;

    // --- Game Logic Update (Potential) ---
    if (gameActive && !isGameOver) {
        
        // --- Player 1 Update Logic ---
        if (isSpeedBoostActiveP1 && currentTime > speedBoostEndTimeP1) {
            isSpeedBoostActiveP1 = false;
            console.log("Player speed boost ended.");
        }
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
            
            // Check Player Pickups immediately after position update
            checkScorePickupCollision();
            checkExpansionPickupCollision();
            checkClearPickupCollision();
        }

        // --- AI Update Logic ---
        if (isSpeedBoostActiveAI && currentTime > speedBoostEndTimeAI) {
            isSpeedBoostActiveAI = false;
            console.log("AI speed boost ended.");
        }
        const currentUpdateIntervalAI = isSpeedBoostActiveAI ? boostedUpdateInterval : normalUpdateInterval;
        const deltaTimeAI = currentTime - lastUpdateTimeAI;
        
        if (deltaTimeAI > currentUpdateIntervalAI) {
            lastUpdateTimeAI = currentTime - (deltaTimeAI % currentUpdateIntervalAI);
            
            updateAIPlayer(); // Decide direction

            prevTargetPos2.copy(snakeTargetPosition2);
            let nextLogicalPos2 = snakeTargetPosition2.clone().addScaledVector(snakeDirection2, segmentSize);
            snakeTargetPosition2.x = snapToGridCenter(nextLogicalPos2.x, 'x');
            snakeTargetPosition2.z = snapToGridCenter(nextLogicalPos2.z, 'z');
            aiMoved = true;
            
            // Check AI Pickups immediately after position update
            checkAIScorePickupCollision();
            checkAIExpansionPickupCollision();
            checkAIClearPickupCollision();
        }
        
        // --- Collision Check & Trail Creation (Run if either snake moved) --- 
        if (playerMoved || aiMoved) {
            winner = checkCollisions(snakeTargetPosition1, snakeTargetPosition2, trailSegments1, trailSegments2);

            // Create trail segments at PREVIOUS TARGET positions (only if not crashed)
            if (playerMoved && (winner === 0 || winner === 2)) { 
                createTrailSegment(prevTargetPos1, trailMaterial1, trailSegments1, 1);
            }
            if (aiMoved && (winner === 0 || winner === 1)) { 
                createTrailSegment(prevTargetPos2, trailMaterial2, trailSegments2, 2);
            }
            
            // Check for head-on collision involving newly created trails (simplified - target vs target handled above)
            // if (winner === 0) { 
            //     if (trailSegments2.length > 0 && snakeTargetPosition1.distanceTo(trailSegments2[trailSegments2.length-1].position) < segmentSize * epsilon) winner = 3; 
            //     else if (trailSegments1.length > 0 && snakeTargetPosition2.distanceTo(trailSegments1[trailSegments1.length-1].position) < segmentSize * epsilon) winner = 3; 
            // }

            // Handle Game Over state (if a crash was detected)
            if (winner !== 0) {
                isGameOver = true;
                isSpeedBoostActiveP1 = false; // Turn off boosts on game over
                isSpeedBoostActiveAI = false;
                console.log(`Game Over! Result: ${winner === 1 ? 'AI Wins' : (winner === 2 ? 'Player 1 Wins' : 'Draw')}. Final Score: ${scoreP1}`);
                showGameOverMessage(winner);
                if (winner === 1 || winner === 3) snakeHead1.material.color.setHex(0xff0000);
                if (winner === 2 || winner === 3) snakeHead2.material.color.setHex(0xff0000);
            }
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
        let camTargetPos; // Position camera should move towards
        let lookAtTargetForLerp; // Point targetLookAt should move towards

        if (isLookingBack) {
            // Look Back Camera
            lookBackPosition.copy(snakeDirection1).multiplyScalar(lookBackDistance); // Offset backwards
            lookBackPosition.y = cameraHeight; // Set height
            camTargetPos = snakeHead1.position.clone().add(lookBackPosition); // Add offset to current visual pos
            
            lookAheadPoint.copy(snakeDirection1).multiplyScalar(lookAheadTarget); // Point ahead
            lookAtTargetForLerp = snakeHead1.position.clone().add(lookAheadPoint); // Look ahead from visual pos

        } else {
            // Normal Follow Camera
            cameraOffset.copy(snakeDirection1).multiplyScalar(-cameraDistanceBehind); // Offset forward (negative direction)
            cameraOffset.y = cameraHeight;
            camTargetPos = snakeHead1.position.clone().add(cameraOffset); // Base on visual pos
            
            lookAtTargetForLerp = snakeHead1.position; // Look at the snake's visual pos
        }

        // Apply smooth movement to calculated targets
        cameraTargetPosition.copy(camTargetPos); // Store the target for lerp
        camera.position.lerp(cameraTargetPosition, cameraLag);
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

init(); 