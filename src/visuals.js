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
    pickupSpawnParticles,
    isGameOver, // <<< ADDED IMPORT
    winner, // <<< ADDED IMPORT
    setSnakeHead1 // <<< ADDED IMPORT
} from './state.js';
import {
    segmentSize, P1_TRAIL_COLOR_BOOST, P1_TRAIL_COLOR_NORMAL, 
    PARTICLE_COUNT, PARTICLE_SIZE, EXPLOSION_FORCE, PARTICLE_GRAVITY, PARTICLE_LIFE, GROUND_Y,
    TEXT_LIFE, TEXT_MOVE_SPEED, TEXT_SIZE, TEXT_HEIGHT_OFFSET, gridLineMaterial,
    sparseTrailMaterial, ammoPickupMaterial, AMMO_COLOR, AMMO_PICKUP_RADIUS, P1_HEAD_COLOR_NORMAL,
    AI_COLORS, // <-- Import AI_COLORS instead of individual AI colors
    HEAD_COLOR_LOST, // Import the red color
    SPAWN_EFFECT_PARTICLE_COUNT,
    SPAWN_EFFECT_PARTICLE_SIZE,
    SPAWN_EFFECT_MAX_RADIUS,
    SPAWN_EFFECT_START_SCALE,
    SPAWN_EFFECT_MAX_SCALE,
    SPAWN_EFFECT_DURATION_EXPAND,
    SPAWN_EFFECT_DURATION_LINGER,
    SPAWN_EFFECT_DURATION_CONTRACT,
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

    // <<< ADDED: Add userData for identification >>>
    newSegment.userData.isTrailSegment = true;
    newSegment.userData.ownerId = (owner === 1) ? 'player_1' : owner.id; 
    // console.log(`[CreateTrail] Added userData to ${newSegment.uuid}, owner: ${newSegment.userData.ownerId}`); // <<< COMMENTED OUT

    newSegment.position.copy(pos);
    scene.add(newSegment);
    trailArray.push(newSegment);
    // console.log(`[CreateTrail] Pushed ${newSegment.uuid} to trailArray (length: ${trailArray.length})`); // <<< COMMENTED OUT
}

// Creates a particle explosion effect at the given position with the given color
// Optional scale parameter modifies particle count, size, and force.
export function createExplosionEffect(position, color, scale = 1) {
    // --- Particle Limit Check --- <--- ADDED CHECK
    const PARTICLE_LIMIT = 10000;
    if (explosionParticles.length + allTrailParticles.length >= PARTICLE_LIMIT) {
        console.warn(`[createExplosionEffect] Particle limit (${PARTICLE_LIMIT}) reached. Skipping explosion.`);
        return; // Skip creating more particles if limit is reached
    }
    // ---------------------------

    const scaledParticleCount = Math.round(PARTICLE_COUNT * scale);
    const scaledParticleSize = PARTICLE_SIZE * Math.sqrt(scale);
    const scaledExplosionForce = EXPLOSION_FORCE * Math.sqrt(scale);

    const particleGeometry = new THREE.BoxGeometry(scaledParticleSize, scaledParticleSize, scaledParticleSize);
    
    // <<< ADDED: Color validation and fallback >>>
    let validColor = color;
    if (validColor === undefined || validColor === null) {
        console.error(`[createExplosionEffect] Received invalid color: ${color}. Using fallback red.`);
        validColor = 0xff0000; // Fallback to red
    }
    // <<< END ADDED >>>

    for (let i = 0; i < scaledParticleCount; i++) {
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: validColor, // Use validated/fallback color
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
    console.log(`[createExplosionEffect] Created ${scaledParticleCount} particles. Total now: ${explosionParticles.length}`);
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
    console.log(`[createFloatingText] Created text: "${text}". Total now: ${floatingTexts.length}`);
}

// <<< ADDED: Placeholder for Pickup Spawn Effect >>>
export const createPickupSpawnEffect = (position, color) => {
    const particleGeometry = new THREE.SphereGeometry(SPAWN_EFFECT_PARTICLE_SIZE, 8, 8);

    for (let i = 0; i < SPAWN_EFFECT_PARTICLE_COUNT; i++) {
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 1.0,
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        particle.position.copy(position);

        // Random direction
        const direction = new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
        ).normalize();

        const particleData = {
            mesh: particle,
            center: position.clone(),
            direction: direction,
            life: SPAWN_EFFECT_DURATION_EXPAND + SPAWN_EFFECT_DURATION_LINGER + SPAWN_EFFECT_DURATION_CONTRACT,
            initialLife: SPAWN_EFFECT_DURATION_EXPAND + SPAWN_EFFECT_DURATION_LINGER + SPAWN_EFFECT_DURATION_CONTRACT,
            startTime: performance.now(), // Use performance.now() for precise start time
            maxRadius: SPAWN_EFFECT_MAX_RADIUS,
            expandDuration: SPAWN_EFFECT_DURATION_EXPAND,
            lingerDuration: SPAWN_EFFECT_DURATION_LINGER,
            contractDuration: SPAWN_EFFECT_DURATION_CONTRACT,
            startScale: SPAWN_EFFECT_START_SCALE,
            maxScale: SPAWN_EFFECT_MAX_SCALE,
        };

        // console.log('[createPickupSpawnEffect] Creating particle:', particleData); // DEBUG LOG
        pickupSpawnParticles.push(particleData); // Use imported array
        scene.add(particle);
    }
};

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

    const indicatorRadius = 0.1; // Adjusted size for sphere
    const indicatorSpacing = 0.25;
    // Change to SphereGeometry
    const indicatorGeometry = new THREE.SphereGeometry(indicatorRadius, 8, 6); // Use fewer segments for performance
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
    const indicatorRadiusAI = 0.08; // Smaller radius for AI
    const spacing = indicatorRadiusAI * 2.6; // Adjust spacing based on radius
    // Change to SphereGeometry
    const ammoGeometry = new THREE.SphereGeometry(indicatorRadiusAI, 6, 4); // Even fewer segments for AI
    const ammoMaterial = new THREE.MeshPhongMaterial({ color: AMMO_COLOR, emissive: 0x553300 });

    const totalWidth = (aiObject.ammoCount - 1) * spacing;
    const startX = -totalWidth / 2;

    for (let i = 0; i < aiObject.ammoCount; i++) {
        const ammoSphere = new THREE.Mesh(ammoGeometry, ammoMaterial); // Rename variable
        ammoSphere.position.x = startX + i * spacing;
        indicatorGroup.add(ammoSphere);
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

// Reverts all snake head colors back to their normal state
export function revertHeadColors() {
    // Revert Player 1
    // ADDED check for snakeHead1 existence
    if (snakeHead1 && headMaterial1) { 
        headMaterial1.color.setHex(P1_HEAD_COLOR_NORMAL);
    } else {
        // console.log("[revertHeadColors] snakeHead1 is null or undefined."); // Log removed, expected after explosion
    }

    // Revert AIs
    aiPlayers.forEach(ai => {
        if (ai.head && ai.material && ai.colors && !ai.isSpeedBoostActive) { // Check for existence and boost status
            ai.material.color.setHex(ai.colors.normal); // Use the AI's specific normal color
        } else if (ai.head && ai.material && ai.colors && ai.isSpeedBoostActive) {
            // If boost is still active visually but game is over, maybe revert to boost color?
            // For now, let's just ensure it doesn't crash. The boost state should ideally be reset elsewhere.
            // ai.material.color.setHex(ai.colors.boost); 
        }
    });
}

// Sets the head color of a specific owner (1 for player, AI object for AI) to red
export function setHeadColorToRed(owner) {
    if (owner === 1) {
        // ADDED check for snakeHead1 existence
        if (snakeHead1 && headMaterial1) { 
            headMaterial1.color.setHex(HEAD_COLOR_LOST);
        } else {
            // console.log(`setHeadColorToRed: Invalid owner 1 (snakeHead1 is null)`); // Log removed, expected after explosion
        }
    } else if (owner && typeof owner === 'object' && owner.head && owner.material) {
        // It's an AI object
        owner.material.color.setHex(HEAD_COLOR_LOST);
    } else {
        console.warn(`setHeadColorToRed: Invalid owner or missing properties:`, owner);
    }
}

// Clear all trails from the scene and state arrays using scene traversal
export function clearAllTrails() {
    // console.log("[clearAllTrails] Starting scene traversal for trail segments..."); // Keep this log // <<< COMMENTED OUT
    const segmentsToRemove = [];
    scene.traverse((object) => {
        if (object.isMesh && object.userData.isTrailSegment) {
            // Optional log: 
            // console.log(`  -> Found trail segment: ${object.uuid}, Owner: ${object.userData.ownerId}`);
            segmentsToRemove.push(object);
        }
    });

    // console.log(`[clearAllTrails] Found ${segmentsToRemove.length} segments via traversal. Removing...`); // Keep this log // <<< COMMENTED OUT
    segmentsToRemove.forEach(segment => {
        scene.remove(segment);
        // Optional: Clean up geometry/material if needed (usually handled by GC)
        // if (segment.geometry) segment.geometry.dispose();
        // if (segment.material) segment.material.dispose(); 
    });

    // <<< REVERTED: Explicitly remove only LOST AI heads >>>
    aiPlayers.forEach(ai => {
        // Log status before checking head
        // console.log(`[clearAllTrails Check] AI ID: ${ai.id}, Is Lost: ${ai.lost}, Head Exists: ${!!ai.head}`); // Can keep commented
        if (ai.lost && ai.head) { // <<< RESTORED ai.lost check >>>
            // console.log(`[clearAllTrails] Removing LOST AI ${ai.id} head.`); // Reverted log message
            scene.remove(ai.head);
            ai.head = null; // Set head ref to null
        }
    });
    // <<< END REVERTED >>>

    // <<< REVERTED: Explicitly remove only LOST Player head >>>
    if (isGameOver && winner !== 1 && snakeHead1) { // <<< RESTORED player lost check >>>
         // console.log("[clearAllTrails] Removing LOST Player 1 head."); // Reverted log message
         scene.remove(snakeHead1);
         if(setSnakeHead1) setSnakeHead1(null); // Update state
    }
    // <<< END REVERTED >>>

    // --- CRITICAL: Still clear the state arrays afterward --- 
    // Other parts of the code (collision detection) rely on these arrays being empty.
    // console.log("[clearAllTrails] Clearing state arrays (trailSegments1 and ai.trailSegments)..."); // Corrected log // <<< COMMENTED OUT
    trailSegments1.length = 0;
    if(setLastTrailSegment1) setLastTrailSegment1(null);
    aiPlayers.forEach(ai => {
        ai.trailSegments.length = 0;
        ai.lastTrailSegment = null;
    });
    // console.log("[clearAllTrails] Finished."); // Keep this log // <<< COMMENTED OUT
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

export const removePlayerVisuals = (playerId) => {
    // Implementation of removePlayerVisuals function
}; 

// <<< ADDED: Console Error Logging & Download >>>
export function downloadErrorLogFile() {
    // errorLog.length = 0;
}
// Make the download function globally accessible for manual console calls
window.downloadErrorLog = downloadErrorLogFile;
// <<< END ADDED: Console Error Logging & Download >>>

// <<< ADDED: Diagnostic function for orphaned segments >>>
export function diagnoseOrphanedSegments() {
    // console.log("[Diagnose] Running orphan segment check..."); // <<< COMMENTED OUT
    let orphanCount = 0;

    // Get IDs of currently active AIs
    const activeAiIds = aiPlayers.filter(ai => !ai.lost).map(ai => ai.id);
    const isPlayerActive = !isGameOver; // Player is active if game is not over

    scene.traverse((object) => {
        if (object.isMesh && object.userData.isTrailSegment) {
            const ownerId = object.userData.ownerId;
            let isOrphan = false;

            if (ownerId === 'player_1') {
                if (!isPlayerActive) {
                    isOrphan = true;
                }
            } else if (ownerId && ownerId.startsWith('ai-')) {
                if (!activeAiIds.includes(ownerId)) {
                    isOrphan = true;
                }
            } else {
                // Segment with no owner ID? Log as potential issue
                console.warn(`[Diagnose] Found trail segment with missing/invalid ownerId:`, object);
            }

            if (isOrphan) {
                orphanCount++;
                console.warn(`[Diagnose] Found ORPHANED trail segment! Owner: ${ownerId}, Mesh:`, object);
            }
        }
    });

    if (orphanCount > 0) {
        // console.warn(`[Diagnose] Orphan check complete. Found ${orphanCount} orphaned segment(s).`); // <<< COMMENTED OUT
    } else {
        // console.log("[Diagnose] Orphan check complete. No orphaned segments found."); // <<< COMMENTED OUT
    }
}
// <<< END ADDED >>>

// <<< ADDED: Diagnostic function to log all scene meshes >>>
export function logSceneMeshes(contextMessage = "Logging scene meshes") {
    console.log(`--- ${contextMessage} ---`);
    let meshCount = 0;
    scene.traverse((object) => {
        if (object.isMesh) {
            meshCount++;
            console.log(`[Mesh Log] ID: ${object.uuid}, Name: ${object.name}, Position: (${object.position.x.toFixed(1)}, ${object.position.y.toFixed(1)}, ${object.position.z.toFixed(1)}), UserData:`, JSON.stringify(object.userData));
        }
    });
    console.log(`--- ${contextMessage} - Found ${meshCount} meshes ---`);
}
// <<< END ADDED >>>

// Visibility Change Handler
// ... existing code ... 