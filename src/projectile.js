import * as THREE from 'three';
import { 
    scene, isGameOver, gameActive, 
    ammoCountP1, ammoCountAI, 
    snakeHead1, snakeHead2, snakeDirection1, snakeDirection2, 
    projectiles, // The array of projectiles
    setAmmoCountP1, setAmmoCountAI 
} from './state.js';
import { 
    PROJECTILE_SPEED, segmentSize, 
    projectileGeometry, projectileMaterial 
} from './constants.js';
import { updateAmmoIndicatorP1, updateAmmoIndicatorAI } from './visuals.js';

// --- Shoot Projectile Function (Player) ---
export function shootProjectile() {
    if (isGameOver || !gameActive || ammoCountP1 <= 0 || !snakeHead1) {
        return; 
    }

    setAmmoCountP1(ammoCountP1 - 1);
    updateAmmoIndicatorP1(); 

    const startPos = snakeHead1.position.clone().addScaledVector(snakeDirection1, segmentSize * 0.6);
    startPos.y = 0; 
    const projectileMesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
    projectileMesh.position.copy(startPos);

    const velocity = snakeDirection1.clone().multiplyScalar(PROJECTILE_SPEED);

    projectiles.push({ // Push directly to the imported array
        mesh: projectileMesh,
        velocity: velocity,
        life: 2.0, 
        owner: 'player' 
    });
    scene.add(projectileMesh);
}

// --- AI Shoot Projectile Function ---
export function aiShootProjectile() {
    if (isGameOver || !gameActive || ammoCountAI <= 0 || !snakeHead2) {
        return; 
    }

    setAmmoCountAI(ammoCountAI - 1);
    updateAmmoIndicatorAI(); 

    const startPos = snakeHead2.position.clone().addScaledVector(snakeDirection2, segmentSize * 0.6);
    startPos.y = 0; 
    const projectileMesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
    projectileMesh.position.copy(startPos);

    const velocity = snakeDirection2.clone().multiplyScalar(PROJECTILE_SPEED);

    projectiles.push({ // Push directly to the imported array
        mesh: projectileMesh,
        velocity: velocity,
        life: 2.0, 
        owner: 'ai' 
    });
    scene.add(projectileMesh);
}

// --- Clear Projectiles Function (Called on reset) ---
export function clearAllProjectiles() {
    projectiles.forEach(p => scene.remove(p.mesh)); 
    projectiles.length = 0; // Clear the array
    // Also clear trail particles associated with them (assuming handled elsewhere or needs adding here)
} 