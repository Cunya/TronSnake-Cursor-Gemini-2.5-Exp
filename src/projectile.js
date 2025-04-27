import * as THREE from 'three';
import { 
    scene, projectiles, allTrailParticles, 
    snakeHead1, snakeTargetPosition1, snakeDirection1, ammoCountP1, 
    aiPlayers, // Import AI array
    setAmmoCountP1, 
} from './state.js';
import { PROJECTILE_SPEED, projectileGeometry, projectileMaterial } from './constants.js';
import { updateAmmoIndicatorP1, updateAmmoIndicatorAI } from './visuals.js';

// --- Player Shoot ---
export function shootProjectile() {
    if (ammoCountP1 <= 0) return; // Check player ammo

    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    const offset = snakeDirection1.clone().multiplyScalar(1.5); // Start slightly ahead
    projectile.position.copy(snakeTargetPosition1).add(offset);
    const velocity = snakeDirection1.clone().multiplyScalar(PROJECTILE_SPEED);
    projectiles.push({ mesh: projectile, velocity: velocity, life: 3.0, owner: 'player' }); // Set owner
    scene.add(projectile);
    setAmmoCountP1(ammoCountP1 - 1); // Decrement player ammo
    updateAmmoIndicatorP1(); // Needs import? Assumed available
}

// --- AI Shoot ---
// Now accepts the specific AI object that is shooting
export function aiShootProjectile(aiObject) {
    if (!aiObject || aiObject.ammoCount <= 0) return; // Check specific AI ammo

    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    const offset = aiObject.direction.clone().multiplyScalar(1.5); // Use AI direction
    projectile.position.copy(aiObject.targetPosition).add(offset); // Use AI position
    const velocity = aiObject.direction.clone().multiplyScalar(PROJECTILE_SPEED);
    // Use specific AI ID as owner
    projectiles.push({ mesh: projectile, velocity: velocity, life: 3.0, owner: aiObject.id }); 
    scene.add(projectile);
    aiObject.ammoCount -= 1; // Decrement specific AI ammo
    // Need to import updateAmmoIndicatorAI
    if (typeof updateAmmoIndicatorAI === 'function') { // Check if imported/available
        updateAmmoIndicatorAI(aiObject); // Update specific AI indicator
    } else {
        console.warn("updateAmmoIndicatorAI not available in projectile.js");
    }
}

// --- Clear Projectiles ---
export function clearAllProjectiles() {
    projectiles.forEach(p => {
        if (p.mesh) scene.remove(p.mesh);
        // Also remove associated trail particles? (Handled in gameLoop)
    });
    projectiles.length = 0;
} 