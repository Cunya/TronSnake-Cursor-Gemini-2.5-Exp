import { isGameOver, gameActive, snakeDirection1, setLookingBack, setLookBackTouchId, lookBackTouchId, setGameActive, openingDialogElement, lastUpdateTimeP1, lastUpdateTimeAI, isPaused, setIsPaused } from './state.js';
import { yAxis } from './constants.js';
import { resetGame } from './init.js';         // <-- Import resetGame from init.js
import { shootProjectile } from './projectile.js'; // <-- Import shootProjectile from projectile.js

// Temporary placeholders for imports
// REMOVED: let resetGame = () => console.warn('resetGame not imported yet');
// REMOVED: let shootProjectile = () => console.warn('shootProjectile not imported yet');

// Start Game (Called by first click/touch)
export function startGame() {
    if (gameActive) return; // Prevent starting multiple times
    setGameActive(true);
    if(openingDialogElement) openingDialogElement.style.display = 'none';
    // lastUpdateTimeP1 = performance.now(); // Reset P1 timer - Needs setter
    // lastUpdateTimeAI = performance.now(); // Reset AI timer - Needs setter
    
    // Remove the initial interaction listeners once the game starts
    window.removeEventListener('click', handleFirstClick);
}

// Use named function for easier removal
export function handleFirstClick() {
    startGame();
}

export function onKeyDown(event) {
    if (isGameOver) {
        resetGame();
        return;
    }

    // Handle Pause Toggle (Escape key)
    if (event.key === 'Escape' && gameActive && !isGameOver) {
        setIsPaused(!isPaused); // Toggle pause state
        console.log("Pause Toggled: ", isPaused);
        event.preventDefault(); // Prevent any default browser behavior for Escape
        return;
    }

    // If paused, don't process other game inputs
    if (isPaused) {
        return;
    }

    // Add check: If game is not active, start it on first key press
    if (!gameActive) {
        // Check for potentially non-gameplay keys if needed, 
        // but for now, any key (except maybe modifiers?) starts.
        // We could filter specific keys here if desired.
        startGame();
        return; // First key press only starts the game
    }

    // If we reach here, gameActive is true
    switch (event.key) {
        case 'ArrowLeft':
            snakeDirection1.applyAxisAngle(yAxis, Math.PI / 2);
            break;
        case 'ArrowRight':
            snakeDirection1.applyAxisAngle(yAxis, -Math.PI / 2);
            break;
        case ' ': // Spacebar
            event.preventDefault(); 
            shootProjectile();
            break;
        case 'ArrowDown':
            event.preventDefault(); 
            setLookingBack(true);
            break;
    }
    // Removed the redundant outer if(gameActive) check
}

export function onKeyUp(event) {
    if (event.key === 'ArrowDown') {
        setLookingBack(false);
    }
}

export function onTouchStart(event) {
    if (isGameOver) {
        resetGame();
        event.preventDefault();
        return; 
    }

    if (!gameActive) {
        // If game not active BUT not game over, treat as start trigger
        // This handles the initial touch start before gameActive is true
        startGame(); 
        // We might still want to process the *action* of this first touch below
        // return; // Decide if first touch ONLY starts or also acts
        return; // <-- ADD THIS RETURN to ensure first touch only starts the game
    }
    
    event.preventDefault(); 

    const lookBackZoneHeight = window.innerHeight / 3; 
    const shootZoneHeight = window.innerHeight / 3;    
    const turnZoneWidth = window.innerWidth / 2;

    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        const touchX = touch.clientX;
        const touchY = touch.clientY;

        if (touchY < shootZoneHeight) {
            shootProjectile();
        } else if (touchY > window.innerHeight - lookBackZoneHeight) {
            if (lookBackTouchId === null) { 
                setLookingBack(true);
                setLookBackTouchId(touch.identifier);
            }
        } else {
            if (touchX < turnZoneWidth) {
                snakeDirection1.applyAxisAngle(yAxis, Math.PI / 2);
            } else {
                snakeDirection1.applyAxisAngle(yAxis, -Math.PI / 2);
            }
        }
    }
}

export function onTouchEnd(event) {
    if (!gameActive) return; 
    event.preventDefault();

    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        if (touch.identifier === lookBackTouchId) {
            setLookingBack(false);
            setLookBackTouchId(null); 
            break; 
        }
    }
} 