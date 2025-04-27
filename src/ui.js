import { 
    topScore, topScoreAtGameStart, gameActive, isGameOver, winner, scoreP1, unlockedScoresThisGame, 
    gameOverTextElement, versionTextElement, openingDialogElement, scoreTextElement, topScoreTextElement,
    pauseIndicatorElement,
    setOpeningDialogElement, setGameOverTextElement, setVersionTextElement, setScoreTextElement, setTopScoreTextElement,
    setPauseIndicatorElement
} from './state.js';
import { GAME_VERSION } from './constants.js';

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
        `<p style="font-size: clamp(16px, 3vw, 20px); margin-bottom: 20px;">Trap the <strong style="color: #ff8800;">Orange AI</strong> opponent. Use <strong style="color: #ffa500;">Ammo</strong> (Spacebar) to clear walls!</p>` +
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
        element.style.fontSize = 'clamp(28px, 6vw, 48px)';
        element.style.fontFamily = 'Arial, sans-serif';
        element.style.textShadow = '2px 2px 4px #000000';
        element.style.textAlign = 'center';
        element.style.maxHeight = '85vh';
        element.style.overflowY = 'auto';
        element.style.display = 'none';
        element.style.cursor = 'pointer';
        document.body.appendChild(element);
        // Need state.setGameOverTextElement(element);
        setGameOverTextElement(element);
    }
}

// Create Version Text Element (Called from init)
export function createVersionText() {
    // Needs state.versionTextElement and setter
    let element = versionTextElement;
    if (!element) {
        element = document.createElement('div');
        element.style.position = 'absolute';
        element.style.top = '10px';
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

// Show Game Over Message (Called from animate)
export function showGameOverMessage(winnerCode) {
    if (!gameOverTextElement) return;

    let message = "";
    if (winnerCode === 1) message = 'AI Wins!';
    else if (winnerCode === 2) message = 'Player Wins!';
    else if (winnerCode === 3) message = 'Draw!';
    else { message = 'Game Over?'; console.warn("showGameOverMessage called with unknown winnerCode:", winnerCode); }

    let scoreMessage = `Final Score: ${scoreP1}`;
    if (scoreP1 > topScore && (winnerCode === 2 || winnerCode === 3)) {
        scoreMessage += ` (NEW TOP SCORE!)`;
    }

    const unlockStatus = getUnlockStatusText(topScore);

    gameOverTextElement.innerHTML =
        `${message}<br>` +
        `<span style="font-size: clamp(20px, 4vw, 32px); color: #cccccc;">${scoreMessage}</span><br>` +
        `<div style="margin-top: 20px; border-top: 1px solid #555; padding-top: 15px;">` +
        unlockStatus.unlockedHTML +
        unlockStatus.nextUnlockMsg +
        `</div>` +
        unlockStatus.controlsText +
        `<span style="display: block; margin-top: 15px; font-size: clamp(16px, 3vw, 24px); color: #dddddd;">Tap or Press Any Key to Restart</span>`;
    gameOverTextElement.style.display = 'block';
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