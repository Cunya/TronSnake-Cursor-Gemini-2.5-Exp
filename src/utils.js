import { boundaryXMin, boundaryZMin } from './state.js';
import { segmentSize } from './constants.js';

// Helper function to get grid center coordinate from world coordinate
export function snapToGridCenter(value, axis) {
    const minBound = (axis === 'x') ? boundaryXMin : boundaryZMin;
    // Find the index of the grid cell the value is *within*
    const gridIndex = Math.floor((value - minBound) / segmentSize);
    // Calculate the center coordinate of that cell
    const cellCenter = minBound + (gridIndex * segmentSize) + (segmentSize / 2);
    return cellCenter;
}

// Helper function to log total pickups (Import necessary state arrays)
import { 
    zoomPickups, scorePickups, sparseTrailPickups, clearPickups, 
    addAiPickups, expansionPickups, multiSpawnPickups, ammoPickups 
} from './state.js';

export function logTotalPickupCount(contextMessage) {
    const totalPickups = 
        zoomPickups.length + 
        scorePickups.length + 
        sparseTrailPickups.length + 
        clearPickups.length + 
        addAiPickups.length + 
        expansionPickups.length + 
        multiSpawnPickups.length + 
        ammoPickups.length; // Added ammo
    console.log(`PICKUP COUNT (${contextMessage}): ${totalPickups}`);
}

// Grid dimensions helper (Import boundary state)
import { boundaryXMax, boundaryZMax } from './state.js';

export function getGridDimensions() {
    const divisionsX = Math.round((boundaryXMax - boundaryXMin) / segmentSize);
    const divisionsZ = Math.round((boundaryZMax - boundaryZMin) / segmentSize);
    return { divisionsX, divisionsZ };
} 