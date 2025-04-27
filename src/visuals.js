import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import {
    scene, setLastTrailSegment1, lastTrailSegment1,
    explosionParticles, floatingTexts, textFont, camera, snakeHead1, ammoIndicatorP1,
    headMaterial1, setAmmoIndicatorP1, setPlaneMesh, setGridMesh,
    planeMesh, gridMesh, setSparseTrailPickupTemplate, setAmmoPickupTemplate, trailSegments1,
    ammoCountP1, isSpeedBoostActiveP1,
    aiPlayers, // Need AI array
    allTrailParticles, // Replaced by aiPlayers - Keeping for now, might be used by particles
} from './state.js';
import {
    segmentSize, P1_TRAIL_COLOR_BOOST, P1_TRAIL_COLOR_NORMAL, 
    PARTICLE_COUNT, PARTICLE_SIZE, EXPLOSION_FORCE, PARTICLE_GRAVITY, PARTICLE_LIFE, GROUND_Y,
    TEXT_LIFE, TEXT_MOVE_SPEED, TEXT_SIZE, TEXT_HEIGHT_OFFSET, gridLineMaterial,
    sparseTrailMaterial, ammoPickupMaterial, AMMO_COLOR, AMMO_PICKUP_RADIUS, P1_HEAD_COLOR_NORMAL,
    AI_COLORS // <-- Import AI_COLORS instead of individual AI colors
} from './constants.js';
import { getGridDimensions } from './utils.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js'; // Needed for createFloatingText check

export function createTrailSegment(pos, trailArray, owner) {
    const segmentGeometry = new THREE.BoxGeometry(segmentSize, segmentSize, segmentSize);
    let segmentMaterial;
    let newSegment;
    let assignedColors = null;

    if (owner === 1) { // Player 1
        // Use boost color if active, otherwise normal
        const color = isSpeedBoostActiveP1 ? P1_TRAIL_COLOR_BOOST : P1_TRAIL_COLOR_NORMAL;
        segmentMaterial = new THREE.MeshPhongMaterial({ color: color });
        newSegment = new THREE.Mesh(segmentGeometry, segmentMaterial);
        if(setLastTrailSegment1) setLastTrailSegment1(newSegment); // Use setter
    } else if (owner && typeof owner === 'object' && owner.id.startsWith('ai-')) { // AI object
        assignedColors = owner.colors; // Get the AI's specific colors
        if (!assignedColors) {
            console.error("createTrailSegment: AI object missing colors property!", owner);
            assignedColors = AI_COLORS[0]; // Fallback to first color
        }
        // Use boost trail color if active, otherwise normal trail color
        const color = owner.isSpeedBoostActive ? assignedColors.boostTrail : assignedColors.trail;
        segmentMaterial = new THREE.MeshPhongMaterial({ color: color });
        newSegment = new THREE.Mesh(segmentGeometry, segmentMaterial);
        owner.lastTrailSegment = newSegment; // Update segment within the AI object
    } else {
        console.error("createTrailSegment: Invalid owner specified", owner);
        return;
    }

    newSegment.position.copy(pos);
    scene.add(newSegment);
    trailArray.push(newSegment);
}

// Creates a particle explosion effect at the given position with the given color
// Optional scale parameter modifies particle count, size, and force.
export function createExplosionEffect(position, color, scale = 1) {
    const scaledParticleCount = Math.round(PARTICLE_COUNT * scale);
    const scaledParticleSize = PARTICLE_SIZE * Math.sqrt(scale);
    const scaledExplosionForce = EXPLOSION_FORCE * Math.sqrt(scale);

    const particleGeometry = new THREE.BoxGeometry(scaledParticleSize, scaledParticleSize, scaledParticleSize);
    
    for (let i = 0; i < scaledParticleCount; i++) {
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: color, // Use provided color
            transparent: true,
            opacity: 1.0
        });
        const particleMesh = new THREE.Mesh(particleGeometry, particleMaterial);
        particleMesh.position.copy(position);

        const velocity = new THREE.Vector3(
            (Math.random() - 0.5),
            (Math.random() * 0.6 + 0.2),
            (Math.random() - 0.5)
        ).normalize().multiplyScalar(scaledExplosionForce * (0.8 + Math.random() * 0.4));

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
    // console.log("[updateAmmoIndicatorP1] Called."); // Log entry
    if (!snakeHead1) {
        // console.log("[updateAmmoIndicatorP1] snakeHead1 not found, exiting.");
        return;
    }

    let indicatorGroup = ammoIndicatorP1;
    if (!indicatorGroup) {
        // console.log("[updateAmmoIndicatorP1] ammoIndicatorP1 group not found in state, creating new group.");
        indicatorGroup = new THREE.Group();
        if (setAmmoIndicatorP1) setAmmoIndicatorP1(indicatorGroup); // Use setter
        else console.error("[updateAmmoIndicatorP1] setAmmoIndicatorP1 setter not found!"); // Keep error log
        if (scene) scene.add(indicatorGroup);
        else console.error("[updateAmmoIndicatorP1] scene not found!"); // Keep error log
    }

    // Check if group exists after potential creation
    if (!indicatorGroup) {
         console.error("[updateAmmoIndicatorP1] Failed to get or create indicatorGroup!"); // Keep error log
         return;
    }

    // Clear existing indicators
    let childrenToRemove = [...indicatorGroup.children]; 
    // console.log(`[updateAmmoIndicatorP1] Clearing ${childrenToRemove.length} existing indicator meshes.`);
    childrenToRemove.forEach(child => indicatorGroup.remove(child));

    // Get current ammo count
    const count = ammoCountP1; 
    // console.log(`[updateAmmoIndicatorP1] Current ammoCountP1 from state: ${count}`);

    const indicatorSize = 0.2;
    const indicatorSpacing = 0.25;
    const indicatorGeometry = new THREE.BoxGeometry(indicatorSize, indicatorSize, indicatorSize);
    const indicatorMaterial = new THREE.MeshPhongMaterial({ color: AMMO_COLOR });

    // Add new indicators
    // console.log(`[updateAmmoIndicatorP1] Adding ${count} new indicator meshes.`);
    for (let i = 0; i < count; i++) {
        const indicatorMesh = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        indicatorMesh.position.x = (i - (count - 1) / 2) * indicatorSpacing;
        indicatorGroup.add(indicatorMesh);
    }

    // Position the group
    indicatorGroup.position.copy(snakeHead1.position);
    indicatorGroup.position.y += segmentSize * 0.7;
    // console.log(`[updateAmmoIndicatorP1] Set group position to (${indicatorGroup.position.x.toFixed(1)}, ${indicatorGroup.position.y.toFixed(1)}, ${indicatorGroup.position.z.toFixed(1)})`);
    
    // Rotation is handled in gameLoop
}

export function updateAmmoIndicatorAI(aiObject) {
    if (!aiObject || !aiObject.head || !scene) return;

    // Remove existing indicator for this AI if it exists
    if (aiObject.ammoIndicator) {
        scene.remove(aiObject.ammoIndicator);
    }

    // Create new indicator group
    const indicatorGroup = new THREE.Group();
    const cubeSize = segmentSize * 0.15;
    const spacing = cubeSize * 1.3;
    const ammoGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const ammoMaterial = new THREE.MeshPhongMaterial({ color: AMMO_COLOR, emissive: 0x553300 });

    const totalWidth = (aiObject.ammoCount - 1) * spacing;
    const startX = -totalWidth / 2;

    for (let i = 0; i < aiObject.ammoCount; i++) {
        const ammoCube = new THREE.Mesh(ammoGeometry, ammoMaterial);
        ammoCube.position.x = startX + i * spacing;
        indicatorGroup.add(ammoCube);
    }

    indicatorGroup.position.copy(aiObject.head.position).y += segmentSize * 0.7; 
    // Rotation handled in game loop
    scene.add(indicatorGroup);
    aiObject.ammoIndicator = indicatorGroup; // Store reference in the AI object
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
    if (lastTrailSegment1) lastTrailSegment1.visible = true;
    aiPlayers.forEach(ai => {
        if (ai.lastTrailSegment) ai.lastTrailSegment.visible = true;
    });
}

// Revert snake head colors to normal (e.g., on game over)
export function revertHeadColors() {
    if (snakeHead1) headMaterial1.color.setHex(P1_HEAD_COLOR_NORMAL);
    aiPlayers.forEach(ai => {
        // Revert to the AI's specific normal color
        if (ai.head && ai.colors) ai.material.color.setHex(ai.colors.normal);
    });
}

// Set specific snake head to red (loser color)
export function setHeadColorToRed(owner) {
    if (owner === 1 && snakeHead1) {
        headMaterial1.color.setHex(0xff0000);
    } else if (owner && typeof owner === 'object' && owner.id.startsWith('ai-')) {
        if (owner.head) owner.material.color.setHex(0xff0000);
    } else {
         console.warn("setHeadColorToRed: Invalid owner", owner);
    }
}

// Clear all trails from the scene and state arrays
export function clearAllTrails() {
    trailSegments1.forEach(seg => scene.remove(seg));
    trailSegments1.length = 0;
    if(setLastTrailSegment1) setLastTrailSegment1(null);

    aiPlayers.forEach(ai => {
        ai.trailSegments.forEach(seg => scene.remove(seg));
        ai.trailSegments.length = 0;
        ai.lastTrailSegment = null;
    });
    // REMOVED: trailSegments2.forEach(seg => scene.remove(seg));
    // REMOVED: trailSegments2.length = 0;
    // REMOVED: if(setLastTrailSegment2) setLastTrailSegment2(null);
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
// let isSpeedBoostActiveP1 = false; // REMOVED - Should use imported state
// let isSpeedBoostActiveAI = false; // REMOVED - Should use imported state
// let ammoCountP1 = 0; // REMOVED - Should use imported state
// let ammoCountAI = 0; // REMOVED - Should use imported state 