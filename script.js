import * as THREE from 'three';

let scene, camera, renderer;

// Player 1
let snakeHead1;
let snakeDirection1 = new THREE.Vector3(1, 0, 0); // Start moving right
const trailSegments1 = [];
const headMaterial1 = new THREE.MeshPhongMaterial({ color: 0x00ffff }); // Cyan
const trailMaterial1 = new THREE.MeshPhongMaterial({ color: 0x00aaaa }); // Darker Cyan

// Player 2 (AI)
let snakeHead2;
let snakeDirection2 = new THREE.Vector3(-1, 0, 0); // Start moving left
const trailSegments2 = [];
const headMaterial2 = new THREE.MeshPhongMaterial({ color: 0xff8800 }); // Orange
const trailMaterial2 = new THREE.MeshPhongMaterial({ color: 0xcc6600 }); // Darker Orange

// Common Game Settings
const segmentSize = 1;
let lastUpdateTime = 0;
const updateInterval = 150; // milliseconds - controls speed
const boundary = 10;

// Game state
let isGameOver = false;
let winner = 0; // 0 = ongoing, 1 = Player 1 wins, 2 = AI wins, 3 = Draw

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 18, 0.1); // Higher view, almost top-down
    camera.lookAt(0, 0, 0);

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

    // Ground Plane
    const planeGeometry = new THREE.PlaneGeometry(boundary * 2, boundary * 2);
    const planeMaterial = new THREE.MeshPhongMaterial({ color: 0x333333, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -segmentSize / 2;
    scene.add(plane);

    // Grid Helper
    const gridHelper = new THREE.GridHelper(boundary * 2, boundary * 2);
    gridHelper.position.y = -segmentSize / 2 + 0.01;
    scene.add(gridHelper);

    // Initial Snake Heads
    const headGeometry = new THREE.BoxGeometry(segmentSize, segmentSize, segmentSize);
    snakeHead1 = new THREE.Mesh(headGeometry.clone(), headMaterial1);
    snakeHead1.position.set(-boundary / 2, 0, 0); // Start P1 on the left
    scene.add(snakeHead1);

    snakeHead2 = new THREE.Mesh(headGeometry.clone(), headMaterial2);
    snakeHead2.position.set(boundary / 2, 0, 0); // Start AI on the right
    scene.add(snakeHead2);

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Add keyboard controls listener (only for Player 1 and reset)
    window.addEventListener('keydown', onKeyDown, false);

    // Add Game Over text display
    createGameOverText();

    animate();
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

    // Player 1 Controls (Arrows)
    switch (event.key) {
        case 'ArrowUp':
            if (snakeDirection1.z === 0) snakeDirection1.set(0, 0, -1);
            break;
        case 'ArrowDown':
            if (snakeDirection1.z === 0) snakeDirection1.set(0, 0, 1);
            break;
        case 'ArrowLeft':
            if (snakeDirection1.x === 0) snakeDirection1.set(-1, 0, 0);
            break;
        case 'ArrowRight':
            if (snakeDirection1.x === 0) snakeDirection1.set(1, 0, 0);
            break;
    }
}

function createTrailSegment(position, material, trailArray) {
    const segmentGeometry = new THREE.BoxGeometry(segmentSize, segmentSize, segmentSize);
    const trailSegment = new THREE.Mesh(segmentGeometry, material);
    trailSegment.position.copy(position);
    scene.add(trailSegment);
    trailArray.push(trailSegment);
}

// Helper to check if a potential position is safe
function isPositionSafe(pos, checkOwnTrail = true) {
    // Boundary check
    if (Math.abs(pos.x) >= boundary || Math.abs(pos.z) >= boundary) {
        return false;
    }

    // Check against Player 1's trail
    for (let segment of trailSegments1) {
        if (pos.distanceTo(segment.position) < segmentSize / 2) {
            return false;
        }
    }

    // Check against AI's trail (optional, prevent immediate self-collision on turn)
    if (checkOwnTrail) {
        for (let segment of trailSegments2) {
            if (pos.distanceTo(segment.position) < segmentSize / 2) {
                return false;
            }
        }
    }
    
    // Check against Player 1's head position
    if (pos.distanceTo(snakeHead1.position) < segmentSize / 2) {
        return false;
    }

    return true;
}

// AI Logic Update
function updateAIPlayer() {
    const currentPos = snakeHead2.position;
    const currentDir = snakeDirection2;

    const potentialPosForward = currentPos.clone().addScaledVector(currentDir, segmentSize);
    const safeForward = isPositionSafe(potentialPosForward);

    if (safeForward) {
        // Optional: Add randomness to sometimes turn even if forward is safe
        // if (Math.random() < 0.1) { ... try turning ... } else { return; // Go straight } 
        return; // Prefer going straight
    }

    // Forward is not safe, try turning
    const possibleTurns = [];

    // Calculate potential left/right directions relative to current direction
    const dirLeft = new THREE.Vector3();
    const dirRight = new THREE.Vector3();

    // Simplified turning logic for grid movement
    if (currentDir.x !== 0) { // Moving horizontally
        dirLeft.set(0, 0, -currentDir.x); // Turn up/down
        dirRight.set(0, 0, currentDir.x);
    } else { // Moving vertically
        dirLeft.set(currentDir.z, 0, 0); // Turn left/right
        dirRight.set(-currentDir.z, 0, 0);
    }

    const potentialPosLeft = currentPos.clone().addScaledVector(dirLeft, segmentSize);
    const potentialPosRight = currentPos.clone().addScaledVector(dirRight, segmentSize);

    if (isPositionSafe(potentialPosLeft)) {
        possibleTurns.push(dirLeft);
    }
    if (isPositionSafe(potentialPosRight)) {
        possibleTurns.push(dirRight);
    }

    if (possibleTurns.length > 0) {
        // Choose a random safe turn
        const chosenTurnIndex = Math.floor(Math.random() * possibleTurns.length);
        snakeDirection2.copy(possibleTurns[chosenTurnIndex]);
    } else {
        // No safe moves, AI will crash going forward
    }
}

// Returns: 0 = no collision, 1 = P1 lost, 2 = AI lost, 3 = draw (head-on)
function checkCollisions(head1Pos, head2Pos, trail1, trail2) {
    let p1Lost = false;
    let p2Lost = false;

    // Check head-on collision
    if (head1Pos.distanceTo(head2Pos) < segmentSize) {
        return 3; // Draw
    }

    // P1 boundary collision
    if (Math.abs(head1Pos.x) >= boundary || Math.abs(head1Pos.z) >= boundary) {
        p1Lost = true;
    }
    // P2 (AI) boundary collision
    if (Math.abs(head2Pos.x) >= boundary || Math.abs(head2Pos.z) >= boundary) {
        p2Lost = true;
    }

    // Check collisions with trails
    // Important: Check against the *other* player's head position too
    const allTrailSegments = [...trail1, ...trail2]; 

    for (let segment of allTrailSegments) {
        if (!p1Lost && head1Pos.distanceTo(segment.position) < segmentSize / 2) p1Lost = true;
        if (!p2Lost && head2Pos.distanceTo(segment.position) < segmentSize / 2) p2Lost = true;
    }
    
    // Check head collisions explicitly after trail checks
    if (!p1Lost && head1Pos.distanceTo(head2Pos) < segmentSize / 2) { p1Lost = true; p2Lost = true; } // Direct head collision

    if (p1Lost && p2Lost) return 3; // Draw or simultaneous loss
    if (p1Lost) return 1;
    if (p2Lost) return 2; // AI lost

    return 0; // No collision
}

let gameOverTextElement;
function createGameOverText() {
    gameOverTextElement = document.createElement('div');
    gameOverTextElement.style.position = 'absolute';
    gameOverTextElement.style.top = '50%';
    gameOverTextElement.style.left = '50%';
    gameOverTextElement.style.transform = 'translate(-50%, -50%)';
    gameOverTextElement.style.color = 'white';
    gameOverTextElement.style.fontSize = '48px';
    gameOverTextElement.style.fontFamily = 'Arial, sans-serif';
    gameOverTextElement.style.textShadow = '2px 2px 4px #000000';
    gameOverTextElement.style.display = 'none'; // Hidden initially
    document.body.appendChild(gameOverTextElement);
}

function showGameOverMessage(winner) {
    if (winner === 1) {
        gameOverTextElement.textContent = 'AI Wins! (Orange)'; // AI wins if P1 lost
    } else if (winner === 2) {
        gameOverTextElement.textContent = 'Player 1 Wins! (Cyan)'; // P1 wins if AI lost
    } else if (winner === 3) {
        gameOverTextElement.textContent = 'Draw!';
    } else {
         gameOverTextElement.textContent = '';
    }
    gameOverTextElement.innerHTML += '<br><span style="font-size: 24px;">Press Space to Restart</span>';
    gameOverTextElement.style.display = 'block';
}

function resetGame() {
    isGameOver = false;
    winner = 0;
    gameOverTextElement.style.display = 'none';

    // Remove trails
    trailSegments1.forEach(segment => scene.remove(segment));
    trailSegments1.length = 0;
    trailSegments2.forEach(segment => scene.remove(segment));
    trailSegments2.length = 0;

    // Reset snake positions and directions
    snakeHead1.position.set(-boundary / 2, 0, 0);
    snakeDirection1.set(1, 0, 0);
    snakeHead1.material.color.setHex(0x00ffff); // Reset color

    snakeHead2.position.set(boundary / 2, 0, 0);
    snakeDirection2.set(-1, 0, 0); // AI starts left
    snakeHead2.material.color.setHex(0xff8800); // Reset color

    lastUpdateTime = performance.now();
}

function animate(currentTime) {
    requestAnimationFrame(animate);

    const deltaTime = currentTime - lastUpdateTime;

    if (!isGameOver && deltaTime > updateInterval) {
        lastUpdateTime = currentTime - (deltaTime % updateInterval);

        // --- Update AI Direction --- 
        updateAIPlayer(); // AI decides its move

        // --- Store previous positions --- 
        const prevPos1 = snakeHead1.position.clone();
        const prevPos2 = snakeHead2.position.clone();

        // --- Move Snakes --- 
        snakeHead1.position.addScaledVector(snakeDirection1, segmentSize);
        snakeHead2.position.addScaledVector(snakeDirection2, segmentSize); // AI moves based on updated direction

        // --- Check Collisions (before adding new trail segments) --- 
        // Pass copies of positions to avoid issues if one crashes into boundary/trail
        // and the other crashes into the first one's *new* invalid position in the same tick.
        const collisionCheckPos1 = snakeHead1.position.clone();
        const collisionCheckPos2 = snakeHead2.position.clone();
        winner = checkCollisions(collisionCheckPos1, collisionCheckPos2, trailSegments1, trailSegments2);

        // --- Add trail segments at previous positions --- 
        createTrailSegment(prevPos1, trailMaterial1, trailSegments1);
        createTrailSegment(prevPos2, trailMaterial2, trailSegments2);
        
        // --- Post-move Collision Check (head vs new trail) --- 
        if (winner === 0) {
             // Check if P1's new head position hits AI's new trail segment (at prevPos2)
             if (snakeHead1.position.distanceTo(prevPos2) < segmentSize / 2) {
                winner = 3; // Treat as draw if they cross paths perfectly
             } 
             // Check if AI's new head position hits P1's new trail segment (at prevPos1)
             else if (snakeHead2.position.distanceTo(prevPos1) < segmentSize / 2) {
                 winner = 3; // Treat as draw
             }
        }

        // --- Handle Game Over --- 
        if (winner !== 0) {
            isGameOver = true;
            console.log(`Game Over! Result: ${winner === 1 ? 'AI Wins' : (winner === 2 ? 'Player 1 Wins' : 'Draw')}. Press Space to restart.`);
            showGameOverMessage(winner);

            // Indicate loser(s) - P1 loses if winner is 1 (AI wins) or 3 (Draw)
            if (winner === 1 || winner === 3) snakeHead1.material.color.setHex(0xff0000);
            // AI loses if winner is 2 (P1 wins) or 3 (Draw)
            if (winner === 2 || winner === 3) snakeHead2.material.color.setHex(0xff0000);
        }
    }

    renderer.render(scene, camera);
}

init(); 