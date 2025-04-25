import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import {
    scene, setLastTrailSegment1, setLastTrailSegment2, lastTrailSegment1, lastTrailSegment2,
    explosionParticles, floatingTexts, textFont, camera, snakeHead1, snakeHead2, ammoIndicatorP1, ammoIndicatorAI,
    headMaterial1, headMaterial2, setAmmoIndicatorP1, setAmmoIndicatorAI, setPlaneMesh, setGridMesh,
    planeMesh, gridMesh, setSparseTrailPickupTemplate, setAmmoPickupTemplate, trailSegments1, trailSegments2,
} from './state.js';
import {
    segmentSize, P1_TRAIL_COLOR_BOOST, P1_TRAIL_COLOR_NORMAL, AI_TRAIL_COLOR_BOOST, AI_TRAIL_COLOR_NORMAL,
    PARTICLE_COUNT, PARTICLE_SIZE, EXPLOSION_FORCE, PARTICLE_GRAVITY, PARTICLE_LIFE, GROUND_Y,
    TEXT_LIFE, TEXT_MOVE_SPEED, TEXT_SIZE, TEXT_HEIGHT_OFFSET, gridLineMaterial,
    sparseTrailMaterial, ammoPickupMaterial, AMMO_COLOR, AMMO_PICKUP_RADIUS, P1_HEAD_COLOR_NORMAL,
    AI_HEAD_COLOR_NORMAL
} from './constants.js';
import { getGridDimensions } from './utils.js';

export function createTrailSegment(position, trailArray, playerIndex) {
    const segmentGeometry = new THREE.BoxGeometry(segmentSize, segmentSize, segmentSize);

    let segmentColor;
    let isBoostActive;
    if (playerIndex === 1) {
        // Need to import isSpeedBoostActiveP1 from state for this check
        // For now, assume it's accessible directly (will fix imports later)
        isBoostActive = isSpeedBoostActiveP1; 
        segmentColor = isBoostActive ? P1_TRAIL_COLOR_BOOST : P1_TRAIL_COLOR_NORMAL;
    } else { // Player 2
        // Need to import isSpeedBoostActiveAI
        isBoostActive = isSpeedBoostActiveAI; 
        segmentColor = isBoostActive ? AI_TRAIL_COLOR_BOOST : AI_TRAIL_COLOR_NORMAL;
    }

    const segmentMaterial = new THREE.MeshPhongMaterial({ color: segmentColor });
    const trailSegment = new THREE.Mesh(segmentGeometry, segmentMaterial);
    trailSegment.position.copy(position);

    if (playerIndex === 1) {
        if (lastTrailSegment1) lastTrailSegment1.visible = true;
        trailSegment.visible = false;
        setLastTrailSegment1(trailSegment); // Use setter
    } else {
        if (lastTrailSegment2) lastTrailSegment2.visible = true;
        trailSegment.visible = false;
        setLastTrailSegment2(trailSegment); // Use setter
    }

    scene.add(trailSegment);
    trailArray.push(trailSegment); // Can push directly
}

export function createExplosionEffect(position, color) {
    const particleGeometry = new THREE.BoxGeometry(PARTICLE_SIZE, PARTICLE_SIZE, PARTICLE_SIZE);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const particleMaterial = new THREE.MeshPhongMaterial({
            color: color,
            transparent: true,
            opacity: 1.0
        });
        const particleMesh = new THREE.Mesh(particleGeometry, particleMaterial);
        particleMesh.position.copy(position);

        const velocity = new THREE.Vector3(
            (Math.random() - 0.5),
            (Math.random() * 0.6 + 0.2),
            (Math.random() - 0.5)
        ).normalize().multiplyScalar(EXPLOSION_FORCE * (0.8 + Math.random() * 0.4));

        explosionParticles.push({ // Can push directly
            mesh: particleMesh,
            velocity: velocity,
            life: PARTICLE_LIFE,
            initialLife: PARTICLE_LIFE
        });
        scene.add(particleMesh);
    }
}

export function createFloatingText(text, position, color) {
    if (!textFont) {
        console.warn("Font not loaded yet, cannot create text effect.");
        return;
    }

    const textGeometry = new TextGeometry(text, {
        font: textFont,
        size: TEXT_SIZE,
        height: TEXT_SIZE * 0.1,
        curveSegments: 4,
    });
    textGeometry.center();

    const textMaterial = new THREE.MeshPhongMaterial({
        color: color,
        transparent: true,
        opacity: 1.0,
    });

    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.copy(position);
    textMesh.position.y += TEXT_HEIGHT_OFFSET;

    floatingTexts.push({ // Can push directly
        mesh: textMesh,
        life: TEXT_LIFE,
        initialLife: TEXT_LIFE
    });
    scene.add(textMesh);
}

function createSparseTrailPickupVisual() {
    const group = new THREE.Group();
    const cubeWidth = segmentSize * 0.8;
    const cubeHeight = segmentSize * 0.27;
    const cubeDepth = segmentSize * 0.8;
    const gap = 0.3;

    const cubeGeom = new THREE.BoxGeometry(cubeWidth, cubeHeight, cubeDepth);
    const cubeMesh1 = new THREE.Mesh(cubeGeom.clone(), sparseTrailMaterial);
    const cubeMesh2 = new THREE.Mesh(cubeGeom.clone(), sparseTrailMaterial);

    cubeMesh1.position.y = -(cubeHeight / 2 + gap / 2);
    cubeMesh2.position.y = (cubeHeight / 2 + gap / 2);

    group.add(cubeMesh1);
    group.add(cubeMesh2);

    return group;
}

function createAmmoPickupVisual() {
     // Use Sphere Geometry based on constants
    return new THREE.Mesh(
        new THREE.SphereGeometry(AMMO_PICKUP_RADIUS, 16, 12), 
        ammoPickupMaterial
    );
}

// Initialize templates (called from init)
export function initializePickupTemplates() {
    setSparseTrailPickupTemplate(createSparseTrailPickupVisual());
    setAmmoPickupTemplate(createAmmoPickupVisual());
}

export function updateAmmoIndicatorP1() {
    if (!snakeHead1) return;

    let indicatorGroup = ammoIndicatorP1;
    if (!indicatorGroup) {
        indicatorGroup = new THREE.Group();
        setAmmoIndicatorP1(indicatorGroup); // Use setter
        scene.add(indicatorGroup);
    }

    while (indicatorGroup.children.length) {
        indicatorGroup.remove(indicatorGroup.children[0]);
    }

    // Need ammoCountP1 from state
    // Assume accessible for now (will fix imports later)
    const count = ammoCountP1; 
    const indicatorSize = 0.2;
    const indicatorSpacing = 0.25;
    const indicatorGeometry = new THREE.BoxGeometry(indicatorSize, indicatorSize, indicatorSize);
    const indicatorMaterial = new THREE.MeshPhongMaterial({ color: AMMO_COLOR });

    for (let i = 0; i < count; i++) {
        const indicatorMesh = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        indicatorMesh.position.x = (i - (count - 1) / 2) * indicatorSpacing;
        indicatorGroup.add(indicatorMesh);
    }

    if (indicatorGroup) {
        indicatorGroup.position.copy(snakeHead1.position);
        indicatorGroup.position.y += segmentSize * 0.7;
    }
}

export function updateAmmoIndicatorAI() {
    if (!snakeHead2) return;

    let indicatorGroup = ammoIndicatorAI;
    if (!indicatorGroup) {
        indicatorGroup = new THREE.Group();
        setAmmoIndicatorAI(indicatorGroup); // Use setter
        scene.add(indicatorGroup);
    }

    while (indicatorGroup.children.length) {
        indicatorGroup.remove(indicatorGroup.children[0]);
    }

    // Need ammoCountAI from state
    // Assume accessible for now (will fix imports later)
    const count = ammoCountAI; 
    const indicatorSize = 0.2;
    const indicatorSpacing = 0.25;
    const indicatorGeometry = new THREE.BoxGeometry(indicatorSize, indicatorSize, indicatorSize);
    const indicatorMaterial = new THREE.MeshPhongMaterial({ color: AMMO_COLOR });

    for (let i = 0; i < count; i++) {
        const indicatorMesh = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        indicatorMesh.position.x = (i - (count - 1) / 2) * indicatorSpacing;
        indicatorGroup.add(indicatorMesh);
    }

    if(indicatorGroup) {
        indicatorGroup.position.copy(snakeHead2.position);
        indicatorGroup.position.y += segmentSize * 0.7;
    }
}

export function createPlayAreaVisuals(xMin, xMax, zMin, zMax) {
    if (planeMesh) scene.remove(planeMesh);
    if (gridMesh) scene.remove(gridMesh);

    const width = xMax - xMin;
    const height = zMax - zMin;
    const centerX = (xMin + xMax) / 2;
    const centerZ = (zMin + zMax) / 2;

    const planeGeometry = new THREE.PlaneGeometry(width, height);
    const planeMaterial = new THREE.MeshPhongMaterial({ color: 0x333333, side: THREE.DoubleSide });
    const newPlaneMesh = new THREE.Mesh(planeGeometry, planeMaterial);
    newPlaneMesh.rotation.x = -Math.PI / 2;
    newPlaneMesh.position.set(centerX, -segmentSize / 2, centerZ);
    scene.add(newPlaneMesh);
    setPlaneMesh(newPlaneMesh); // Use setter

    const gridVertices = [];
    const gridYOffset = -segmentSize / 2 + 0.01;
    const { divisionsX, divisionsZ } = getGridDimensions(); // Use util function

    for (let i = 0; i <= divisionsX; i++) {
        const x = xMin + i * segmentSize;
        gridVertices.push(x, gridYOffset, zMin);
        gridVertices.push(x, gridYOffset, zMax);
    }
    for (let i = 0; i <= divisionsZ; i++) {
        const z = zMin + i * segmentSize;
        gridVertices.push(xMin, gridYOffset, z);
        gridVertices.push(xMax, gridYOffset, z);
    }

    const gridGeometry = new THREE.BufferGeometry();
    gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridVertices, 3));
    const newGridMesh = new THREE.LineSegments(gridGeometry, gridLineMaterial);
    scene.add(newGridMesh);
    setGridMesh(newGridMesh); // Use setter
}

// --- Visual Update Helpers (called within animate) ---

// Make the most recent trail segment visible
export function updateLastTrailSegmentsVisibility() {
    if (lastTrailSegment1) {
        lastTrailSegment1.visible = true;
    }
    if (lastTrailSegment2) {
        lastTrailSegment2.visible = true;
    }
}

// Revert snake head colors to normal (e.g., on game over)
export function revertHeadColors() {
    if (snakeHead1) snakeHead1.material.color.setHex(P1_HEAD_COLOR_NORMAL);
    if (snakeHead2) snakeHead2.material.color.setHex(AI_HEAD_COLOR_NORMAL);
}

// Set specific snake head to red (loser color)
export function setHeadColorToRed(playerIndex) {
     if (playerIndex === 1 && snakeHead1) snakeHead1.material.color.setHex(0xff0000);
     if (playerIndex === 2 && snakeHead2) snakeHead2.material.color.setHex(0xff0000);
}

// Clear all trails from the scene and state arrays
export function clearAllTrails() {
    trailSegments1.forEach(seg => scene.remove(seg));
    trailSegments1.length = 0;
    trailSegments2.forEach(seg => scene.remove(seg));
    trailSegments2.length = 0;
    setLastTrailSegment1(null);
    setLastTrailSegment2(null);
}

// Clear floating texts from scene and state array
export function clearFloatingTexts() {
    floatingTexts.forEach(t => scene.remove(t.mesh));
    floatingTexts.length = 0;
}

// Clear explosion particles from scene and state array
export function clearExplosionParticles() {
    explosionParticles.forEach(p => scene.remove(p.mesh));
    explosionParticles.length = 0;
}

// --- Need to fix state access --- 
// Temporary placeholders for state needed inside functions above
// These will be properly imported once state.js is fully populated
let isSpeedBoostActiveP1 = false;
let isSpeedBoostActiveAI = false;
let ammoCountP1 = 0;
let ammoCountAI = 0; 