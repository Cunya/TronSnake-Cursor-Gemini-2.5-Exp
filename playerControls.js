// Trigger AI Spawn Effects
aiPlayers.forEach(ai => {
    if (ai.needsSpawnEffect) {
        ai.spawnStartTime = now; 
        const effectPosition = ai.targetPosition.clone(); // Use current target position
        const markerCenterY = -segmentSize / 2 + 0.01; 
        effectPosition.y = markerCenterY;
    }
}); 