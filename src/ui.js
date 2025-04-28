import { 
    topScore, topScoreAtGameStart, gameActive, isGameOver, winner, scoreP1, unlockedScoresThisGame, 
    gameOverTextElement, versionTextElement, openingDialogElement, scoreTextElement, topScoreTextElement,
    pauseIndicatorElement, renderer, // Import renderer for canvas access
    // Import state needed for initial offset calculation
    gameOverLookAtTarget, gameOverCameraTargetPosition, setGameOverCameraOffset,
    setOpeningDialogElement, setGameOverTextElement, setVersionTextElement, setScoreTextElement, setTopScoreTextElement,
    setPauseIndicatorElement
} from './state.js';
import { GAME_VERSION } from './constants.js';
// Import the handler function
import { handleGameOverPointerDown, handleGameOverWheel } from './playerControls.js';
import * as THREE from 'three'; // Need THREE for Vector3 subtraction

// Add new state for dialog minimization
let isGameOverDialogMinimized = false;
// No setter needed globally, managed internally by toggle function

// Helper Function for Unlock Status Text
export function getUnlockStatusText(currentTopScore) {
    // Pickup descriptions (could be moved to constants eventually)
    const pickups = [
        { name: "Zoom Out", color: "#0088ff", type: "Blue Cube", score: 0, desc: "Grants 20 pts. Briefly zooms out player camera." },
        { name: "Speed Up", color: "#ff00ff", type: "Pink Cube", score: 50, desc: "Grants 40 pts. Temporary speed boost." },
        { name: "Sparse Trail", color: "#ffff00", type: "Yellow Blocks", score: 200, desc: "Grants 60 pts. Leave gaps in your trail." },
        { name: "Ammo", color: "#ffa500", type: "Orange Sphere", score: 300, desc: "Grants 80 pts. Allows player to shoot trails (Spacebar). (Spawns every 10 pickups)" },
        { name: "Clear Walls", color: "#ffffff", type: "White Cube", score: 500, desc: "Grants 100 pts. Removes walls. (Spawns every 5 pickups)", spawnCondition: "counter", counterThreshold: 5 },
        { name: "More Players", color: "#888888", type: "Gray Octahedron", score: 1000, desc: "Grants 125 pts. Spawns a new AI opponent. (Spawns every 20 pickups)", spawnCondition: "counter", counterThreshold: 20 },
        { name: "Expand", color: "#00ff00", type: "Green Cube", score: 1500, desc: "Grants 150 pts. Expands play area. (Spawns every 15 pickups)", spawnCondition: "counter", counterThreshold: 15 },
        { name: "More", color: "#9900ff", type: "Purple Gems", score: 2000, desc: "Grants 200 pts. Increases max pickups & spawns 2 others. (Spawns every 15 pickups)" }
    ];

    let unlockedHTML = '<h3 style="font-size: clamp(18px, 3vw, 22px); margin-bottom: 10px; margin-top: 20px; color: #dddddd;">Unlocked Powerups:</h3>';
    let nextUnlockScore = Infinity;
    let allUnlocked = true;

    pickups.forEach(p => {
        if (currentTopScore >= p.score) {
            unlockedHTML += `<p style="margin-bottom: 10px; font-size: 18px;"><strong style="color: ${p.color};">${p.name} (${p.type}):</strong> ${p.desc}</p>`;
        } else {
            allUnlocked = false;
            if (p.score < nextUnlockScore) {
                nextUnlockScore = p.score;
            }
        }
    });

    if (unlockedHTML.includes('<p style') === false) {
        unlockedHTML += '<p style="font-size: 18px; color: #cccccc;">None yet!</p>';
    }

    let nextUnlockMsg = "";
    if (allUnlocked) {
        nextUnlockMsg = `<p style="margin-top: 20px; font-size: 18px; color: #aaffaa;">All powerups unlocked!</p>`;
    } else {
        nextUnlockMsg = `<p style="margin-top: 20px; font-size: 18px; color: #aaaaff;">Next powerup unlocks at ${nextUnlockScore} points (Top Score)!</p>`;
    }

    let controlsText =
        `<div style="margin-top: 20px; border-top: 1px solid #555; padding-top: 15px;">` +
        `<h4 style="font-size: 18px; margin-bottom: 8px; color: #cccccc;">Controls:</h4>` +
        `<p style="font-size: 16px; margin-bottom: 5px;">Arrows: Left/Right (Turn), Down (Look Back)</p>` +
        `<p style="font-size: 16px; margin-bottom: 5px;">Touch: Left/Right Side (Turn), Bottom (Look Back)</p>` +
        `<p style="font-size: 16px; margin-bottom: 5px;">Shoot: Spacebar / Top Touch Zone</p>` +
        `</div>`;

    return { unlockedHTML, nextUnlockMsg, controlsText };
}

// Create Opening Dialog (Called from init)
export function createOpeningDialog() {
    // Needs state.openingDialogElement and setter
    let dialogElement = openingDialogElement;
    if (!dialogElement) {
        dialogElement = document.createElement('div');
        dialogElement.style.position = 'absolute';
        dialogElement.style.top = '50%';
        dialogElement.style.left = '50%';
        dialogElement.style.width = 'clamp(300px, 90vw, 600px)';
        dialogElement.style.transform = 'translate(-50%, -50%)';
        dialogElement.style.color = 'white';
        dialogElement.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        dialogElement.style.padding = 'clamp(15px, 4vw, 30px) clamp(20px, 5vw, 50px)';
        dialogElement.style.borderRadius = '10px';
        dialogElement.style.border = '2px solid rgba(255, 255, 255, 0.6)';
        dialogElement.style.fontSize = 'clamp(16px, 3vw, 24px)';
        dialogElement.style.fontFamily = 'Arial, sans-serif';
        dialogElement.style.textShadow = '1px 1px 3px #000000';
        dialogElement.style.textAlign = 'center';
        dialogElement.style.cursor = 'pointer';
        dialogElement.style.maxHeight = '80vh';
        dialogElement.style.overflowY = 'auto';
        document.body.appendChild(dialogElement);
        // Need state.setOpeningDialogElement(dialogElement);
        setOpeningDialogElement(dialogElement);
    }

    const unlockStatus = getUnlockStatusText(topScore);

    let dialogHTML =
        `<h2 style="font-size: clamp(24px, 5vw, 32px); margin-top: 0; margin-bottom: 15px; color: #00ffff;">Powerup Tron</h2>` +
        `<p style="font-size: clamp(16px, 3vw, 20px); margin-bottom: 20px;">Collect points to unlock exciting powerups and dominate the arena!</p>` +
        unlockStatus.unlockedHTML +
        unlockStatus.nextUnlockMsg +
        unlockStatus.controlsText +
        `<p style="margin-top: 25px; font-size: clamp(14px, 2.5vw, 18px); color: #cccccc;">(Click, Touch, or Press Any Key to Start)</p>`;

    dialogElement.innerHTML = dialogHTML;
    dialogElement.style.display = 'block';
}

// Create Game Over Text Element (Called from init)
export function createGameOverText() {
    // Needs state.gameOverTextElement and setter
    let element = gameOverTextElement;
    if (!element) {
        element = document.createElement('div');
        element.id = 'gameOverDialog'; // Add an ID for easier styling/selection
        element.style.position = 'absolute';
        element.style.top = '50%';
        element.style.left = '50%';
        element.style.width = 'clamp(300px, 90vw, 700px)';
        element.style.transform = 'translate(-50%, -50%)';
        element.style.color = 'white';
        element.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
        element.style.padding = 'clamp(15px, 4vw, 20px) clamp(20px, 5vw, 40px)';
        element.style.borderRadius = '10px';
        element.style.border = '2px solid rgba(255, 255, 255, 0.5)';
        element.style.fontSize = 'clamp(28px, 6vw, 48px)'; // Base font size for title
        element.style.fontFamily = 'Arial, sans-serif';
        element.style.textShadow = '2px 2px 4px #000000';
        element.style.textAlign = 'center';
        element.style.maxHeight = '85vh'; // Keep max height
        element.style.overflowY = 'hidden'; // Start hidden, toggle to auto when maximized
        element.style.display = 'none';
        element.style.transition = 'all 0.3s ease-out'; // Add transition

        // Container for the actual content (to be shown/hidden)
        const contentContainer = document.createElement('div');
        contentContainer.id = 'gameOverContentContainer';
        element.appendChild(contentContainer); // Add content container

        // Create Minimize Toggle Button
        const minimizeButton = document.createElement('span');
        minimizeButton.id = 'gameOverMinimizeButton';
        minimizeButton.textContent = '_'; // Initial icon
        minimizeButton.style.position = 'absolute';
        minimizeButton.style.top = '5px';
        minimizeButton.style.right = '10px';
        minimizeButton.style.fontSize = '24px';
        minimizeButton.style.lineHeight = '24px';
        minimizeButton.style.cursor = 'pointer';
        minimizeButton.style.color = '#cccccc';
        minimizeButton.style.userSelect = 'none';
        minimizeButton.title = 'Minimize/Maximize Dialog';

        element.appendChild(minimizeButton); // Add button *after* container

        document.body.appendChild(element);
        setGameOverTextElement(element); // Store reference in state

        // Add the toggle listener here, only once
        minimizeButton.onclick = () => {
             isGameOverDialogMinimized = !isGameOverDialogMinimized;
             updateGameOverDialogAppearance();
        };
    }
}

// Create Version Text Element (Called from init)
export function createVersionText() {
    // Needs state.versionTextElement and setter
    let element = versionTextElement;
    if (!element) {
        element = document.createElement('div');
        element.style.position = 'absolute';
        element.style.bottom = '10px';
        element.style.right = '10px';
        element.style.color = 'rgba(255, 255, 255, 0.9)';
        element.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        element.style.padding = '5px 10px';
        element.style.borderRadius = '5px';
        element.style.fontSize = '18px';
        element.style.fontFamily = 'Arial, sans-serif';
        element.textContent = `Version ${GAME_VERSION.substring(1)}`;
        document.body.appendChild(element);
        // Need state.setVersionTextElement(element);
        setVersionTextElement(element);
    }
}

// Create Score Text Element (Called from init)
export function createScoreText() {
    // Needs state.scoreTextElement and setter
    let element = scoreTextElement;
    if (!element) {
        element = document.createElement('div');
        element.style.position = 'absolute';
        element.style.top = '10px';
        element.style.left = '10px';
        element.style.color = 'rgba(255, 255, 255, 0.9)';
        element.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        element.style.padding = '5px 10px';
        element.style.borderRadius = '5px';
        element.style.fontSize = '18px';
        element.style.fontFamily = 'Arial, sans-serif';
        element.textContent = "Score: 0";
        document.body.appendChild(element);
        // Need state.setScoreTextElement(element);
        setScoreTextElement(element);
    }
}

// Create Top Score Text Element (Called from init)
export function createTopScoreText() {
    // Needs state.topScoreTextElement and setter
    let element = topScoreTextElement;
    if (!element) {
        element = document.createElement('div');
        const originalFontSize = '18px'; // Store original style
        const originalColor = 'rgba(255, 255, 255, 0.9)';

        element.style.position = 'absolute';
        element.style.bottom = '10px';
        element.style.left = '10px';
        element.style.right = 'unset';
        element.style.color = originalColor;
        element.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        element.style.padding = '5px 10px';
        element.style.borderRadius = '5px';
        element.style.fontSize = originalFontSize;
        element.style.fontFamily = 'Arial, sans-serif';
        element.textContent = `Top Score: ${topScore}`;

        // Store original styles for later reset
        element.dataset.originalFontSize = originalFontSize;
        element.dataset.originalColor = originalColor;

        document.body.appendChild(element);
        // Need state.setTopScoreTextElement(element);
        setTopScoreTextElement(element);
    }
}

// Create Pause Indicator (Called from init)
export function createPauseIndicator() {
    let element = pauseIndicatorElement;
    if (!element) {
        element = document.createElement('div');
        element.style.position = 'absolute';
        element.style.top = '50%';
        element.style.left = '50%';
        element.style.transform = 'translate(-50%, -50%)';
        element.style.color = 'rgba(255, 255, 255, 0.8)';
        element.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        element.style.padding = '20px 40px';
        element.style.borderRadius = '8px';
        element.style.fontSize = '48px';
        element.style.fontFamily = 'Arial, sans-serif';
        element.style.textShadow = '2px 2px 4px #000000';
        element.style.textAlign = 'center';
        element.style.display = 'none'; // Initially hidden
        element.textContent = 'Paused';
        document.body.appendChild(element);
        setPauseIndicatorElement(element); // Store reference in state
    }
}

// --- Listener Functions ---
// Wrap the handler in functions that extract coordinates for consistency
function onGameOverMouseDown(event) {
    // Only trigger if click is not on the dialog itself
    if (gameOverTextElement && !gameOverTextElement.contains(event.target)) {
        handleGameOverPointerDown(event.clientX, event.clientY, event);
    }
}

function onGameOverTouchStart(event) {
    // Only trigger if touch is not on the dialog itself
    if (gameOverTextElement && !gameOverTextElement.contains(event.target)) {
        // Use the first touch in the changedTouches list
        if (event.changedTouches.length > 0) {
             handleGameOverPointerDown(event.changedTouches[0].clientX, event.changedTouches[0].clientY, event);
        }
    }
}

// Function to add pointer down listeners
function addGameOverPointerListeners() {
    const targetElement = renderer?.domElement || window; // Prefer canvas, fallback to window
    console.log(`[${GAME_VERSION}] Adding game over pointer listeners (mousedown, touchstart, wheel)`);
    targetElement.addEventListener('mousedown', onGameOverMouseDown);
    targetElement.addEventListener('touchstart', onGameOverTouchStart, { passive: true });
    // Add wheel listener here
    window.addEventListener('wheel', handleGameOverWheel, { passive: false }); 
}

// Function to remove pointer down listeners (exported for resetGame)
export function removeGameOverPointerListeners() {
    const targetElement = renderer?.domElement || window;
    console.log(`[${GAME_VERSION}] Removing game over pointer listeners (mousedown, touchstart, wheel)`);
    targetElement.removeEventListener('mousedown', onGameOverMouseDown);
    targetElement.removeEventListener('touchstart', onGameOverTouchStart);
    // Remove wheel listener here
    window.removeEventListener('wheel', handleGameOverWheel);
}

// Show Game Over Message (Called from animate)
// This function now *only* populates the content container the first time
// and makes the main dialog visible. It no longer handles the minimize state directly.
export function showGameOverMessage(winnerCode) {
    if (!gameOverTextElement) return;

    const contentContainer = document.getElementById('gameOverContentContainer');
    if (!contentContainer) return;

    // Store winnerCode for potential later use if needed (e.g., for debugging)
    gameOverTextElement.dataset.winnerCode = winnerCode;

    // --- Calculate and Set Initial Camera Offset ---
    // This uses the target position calculated in gameLoop's game over logic
    const initialOffset = gameOverCameraTargetPosition.clone().sub(gameOverLookAtTarget);
    setGameOverCameraOffset(initialOffset);
    // --- End Initial Offset Calculation ---

    // Populate content (existing code)
    let message = "";
    if (winnerCode === 1) message = 'AI Wins!';
    else if (winnerCode === 2) message = 'Player Wins!';
    else if (winnerCode === 3) message = 'Draw!';
    else { message = 'Game Over?'; console.warn("showGameOverMessage called with unknown winnerCode:", winnerCode); }

    let scoreMessage = `Final Score: ${scoreP1}`;
    // Need topScore from state here - Import it at the top
    if (scoreP1 > topScore && (winnerCode === 2 || winnerCode === 3)) {
        scoreMessage += ` (NEW TOP SCORE!)`;
    }

    const unlockStatus = getUnlockStatusText(topScore); // Needs topScore
    contentContainer.innerHTML =
        `<span id="mainGameOverMessage" style="display: block; margin-bottom: 5px;">${message}</span>` + // Ensure block display
        `<span style="font-size: clamp(20px, 4vw, 32px); color: #cccccc; display: block; margin-bottom: 15px;">${scoreMessage}</span>` + // Ensure block display
        `<div id="gameOverUnlocks" style="margin-top: 20px; border-top: 1px solid #555; padding-top: 15px;">` +
        unlockStatus.unlockedHTML +
        unlockStatus.nextUnlockMsg +
        `</div>` +
        `<div id="gameOverControls">` + // Wrap controls too
        unlockStatus.controlsText +
        `</div>` +
        `<span id="restartText" style="display: block; margin-top: 15px; font-size: clamp(16px, 3vw, 24px); color: #dddddd; cursor: pointer;">Tap or Press Any Key to Restart</span>`;

    // Ensure the dialog starts maximized
    isGameOverDialogMinimized = false;
    updateGameOverDialogAppearance();

    // Make the main dialog visible
    gameOverTextElement.style.display = 'block';

    // --- Add the pointer down listeners ---
    addGameOverPointerListeners();
}

// Helper function to update appearance based on minimized state
function updateGameOverDialogAppearance() {
    if (!gameOverTextElement) return;

    const minimizeButton = document.getElementById('gameOverMinimizeButton');
    const contentContainer = document.getElementById('gameOverContentContainer'); // Target the container

    if (!minimizeButton || !contentContainer) return; // Safety check

    if (isGameOverDialogMinimized) {
        // Minimized State - Move to bottom center, shrink
        gameOverTextElement.style.top = 'unset'; // Remove top positioning
        gameOverTextElement.style.bottom = '60px'; // Position near bottom (adjust if needed to avoid itch link)
        gameOverTextElement.style.left = '50%';
        gameOverTextElement.style.transform = 'translateX(-50%)'; // Center horizontally only
        gameOverTextElement.style.width = '200px'; // Fixed smaller width
        gameOverTextElement.style.height = 'auto';
        gameOverTextElement.style.minHeight = '30px'; // Smaller min height
        gameOverTextElement.style.padding = '5px 20px 5px 10px'; // Adjusted padding
        gameOverTextElement.style.overflowY = 'hidden';

        // Hide the content container
        contentContainer.style.display = 'none';

        minimizeButton.textContent = '+';
        minimizeButton.title = 'Maximize Dialog';
        // Adjust button position within the smaller box if needed
        minimizeButton.style.top = '3px'; 
        minimizeButton.style.right = '5px';

    } else {
        // Maximized/Normal State - Restore original position and size
        gameOverTextElement.style.top = '50%';
        gameOverTextElement.style.bottom = 'unset'; // Remove bottom positioning
        gameOverTextElement.style.left = '50%';
        gameOverTextElement.style.transform = 'translate(-50%, -50%)'; // Center both ways
        gameOverTextElement.style.width = 'clamp(300px, 90vw, 700px)'; // Restore width
        gameOverTextElement.style.minHeight = '';
        gameOverTextElement.style.padding = 'clamp(15px, 4vw, 20px) clamp(20px, 5vw, 40px)'; // Restore padding
        gameOverTextElement.style.overflowY = 'auto';

        // Show the content container
        contentContainer.style.display = 'block';

        minimizeButton.textContent = '_';
        minimizeButton.title = 'Minimize Dialog';
        // Restore button position
        minimizeButton.style.top = '5px';
        minimizeButton.style.right = '10px';
    }
}

// Update Score Display (Called from animate)
export function updateScoreDisplay() {
    if (scoreTextElement) {
        scoreTextElement.textContent = `Score: ${scoreP1}`;
    }

    // Update Top Score Display & Style
    if (topScoreTextElement) {
        const originalSize = topScoreTextElement.dataset.originalFontSize || '18px'; // Fallback
        const originalColor = topScoreTextElement.dataset.originalColor || 'rgba(255, 255, 255, 0.9)'; // Fallback

        // Check if current score exceeds the top score recorded AT THE START of this game
        if (scoreP1 > topScoreAtGameStart) {
            topScoreTextElement.textContent = `Top Score: ${scoreP1}`; // Show current score as potential new top
            topScoreTextElement.style.fontSize = '36px'; // Make it bigger
            topScoreTextElement.style.color = '#ffd700'; // Make it gold
        } else {
            // Otherwise, display the actual current top score and use normal style
            topScoreTextElement.textContent = `Top Score: ${topScore}`; // Show the actual top score
            topScoreTextElement.style.fontSize = originalSize;
            topScoreTextElement.style.color = originalColor;
        }
    }
}

// NEW: Create GitHub Link Element
export function createGitHubLink() {
    const linkElement = document.createElement('a');
    linkElement.href = "https://github.com/Cunya/TronSnake-Cursor-Gemini-2.5-Exp";
    linkElement.target = "_blank"; // Open in new tab
    linkElement.rel = "noopener noreferrer"; // Security best practice
    linkElement.textContent = "GitHub"; // Or use an icon

    // Style similar to version/score text
    linkElement.style.position = 'absolute';
    linkElement.style.top = '10px';
    linkElement.style.right = '10px';
    linkElement.style.color = 'rgba(255, 255, 255, 0.9)';
    linkElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    linkElement.style.padding = '5px 10px';
    linkElement.style.borderRadius = '5px';
    linkElement.style.fontSize = '18px';
    linkElement.style.fontFamily = 'Arial, sans-serif';
    linkElement.style.textDecoration = 'none';
    linkElement.style.zIndex = '10'; // Ensure it's on top

    document.body.appendChild(linkElement);
    // No need to store this in state unless we plan to update it
}

// NEW: Create Itch.io Link Element
export function createItchLink() {
    const linkElement = document.createElement('a');
    linkElement.href = "https://tamasmartinec.itch.io/powerup-tron";
    linkElement.target = "_blank"; // Open in new tab
    linkElement.rel = "noopener noreferrer"; // Security best practice
    linkElement.textContent = "Support the project on itch.io";

    // Style similar to version/score text, but centered at bottom
    linkElement.style.position = 'absolute';
    linkElement.style.bottom = '10px';
    linkElement.style.left = '50%';
    linkElement.style.transform = 'translateX(-50%)'; // Center horizontally
    linkElement.style.color = 'rgba(255, 255, 255, 0.9)';
    linkElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    linkElement.style.padding = '5px 10px';
    linkElement.style.borderRadius = '5px';
    linkElement.style.fontSize = '18px';
    linkElement.style.fontFamily = 'Arial, sans-serif';
    linkElement.style.textDecoration = 'none';
    linkElement.style.zIndex = '10'; // Ensure it's on top

    document.body.appendChild(linkElement);
    // No need to store this in state unless we plan to update it
} 