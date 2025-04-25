import * as THREE from 'three';
import { P1_HEAD_COLOR_NORMAL, AI_HEAD_COLOR_NORMAL } from './constants.js';

// Scene, Camera, Renderer (Initialized in init.js)
export let scene;
export let camera;
export let renderer;
export let planeMesh, gridMesh; // Play area visuals

// Player 1 State
export let snakeHead1;
export let snakeTargetPosition1 = new THREE.Vector3(); // Logical position
export let prevTargetPos1 = new THREE.Vector3(); // Previous logical position
export let snakeDirection1 = new THREE.Vector3(1, 0, 0); // Start moving right
export const trailSegments1 = [];
export let lastTrailSegment1 = null; // Track the last added segment for visibility
export const headMaterial1 = new THREE.MeshPhongMaterial({ color: P1_HEAD_COLOR_NORMAL }); 
export let isSpeedBoostActiveP1 = false;
export let speedBoostEndTimeP1 = 0;
export let isZoomedOutP1 = false; 
export let zoomOutEndTimeP1 = 0;
export let zoomLevelP1 = 0; 
export let isSparseTrailActiveP1 = false; 
export let sparseTrailEndTimeP1 = 0;
export let trailCounterP1 = 0; 
export let sparseLevelP1 = 1; 
export let lastUpdateTimeP1 = 0;
export let ammoCountP1 = 0; 
export let ammoIndicatorP1 = null; 
export let scoreP1 = 0;

// Player 2 (AI) State
export let snakeHead2;
export let snakeTargetPosition2 = new THREE.Vector3(); // Logical position
export let prevTargetPos2 = new THREE.Vector3(); // Previous logical position
export let snakeDirection2 = new THREE.Vector3(-1, 0, 0); // Start moving left
export const trailSegments2 = [];
export let lastTrailSegment2 = null; 
export const headMaterial2 = new THREE.MeshPhongMaterial({ color: AI_HEAD_COLOR_NORMAL });
export let isSpeedBoostActiveAI = false;
export let speedBoostEndTimeAI = 0;
export let isSparseTrailActiveAI = false; 
export let sparseTrailEndTimeAI = 0;
export let trailCounterAI = 0; 
export let sparseLevelAI = 1; 
export let lastUpdateTimeAI = 0;
export let ammoCountAI = 0; 
export let ammoIndicatorAI = null; 

// --- Unlock Tracking --- 
export let unlockedScoresThisGame = new Set(); 

// Control State
export let isLookingBack = false; // Flag for look back camera
export let lookBackTouchId = null; // Store ID of touch used for looking back

// --- Dynamic Boundary State --- 
export let boundaryXMin; // = -initialBoundaryHalfSize; (Set in init/reset)
export let boundaryXMax; // = initialBoundaryHalfSize;
export let boundaryZMin; // = -initialBoundaryHalfSize;
export let boundaryZMax; // = initialBoundaryHalfSize;

// Pickup Arrays (Mutable state)
export const scorePickups = []; 
export let maxScorePickups = 1; 
export const expansionPickups = [];
export let maxExpansionPickups = 1; 
export const clearPickups = [];
export let maxClearPickups = 1; 
export const zoomPickups = [];
export let maxZoomPickups = 1; 
export const sparseTrailPickups = [];
export let maxSparseTrailPickups = 1; 
export const ammoPickups = [];
export let maxAmmoPickups = 1; 
export const multiSpawnPickups = [];
export let maxMultiSpawnPickups = 1; 
export const addAiPickups = []; 
export let maxAddAiPickups = 1; 

// Game State Flags & Variables
export let isGameOver = false;
export let gameActive = false; 
export let winner = 0; // 0 = ongoing, 1 = P1 lost, 2 = AI lost, 3 = Draw

// DOM Elements (Initialized in ui.js/init.js)
export let gameOverTextElement;
export let versionTextElement;
export let openingDialogElement; 
export let scoreTextElement; 
export let topScoreTextElement; 

// Temporary vectors for camera calculations (Mutable state used in loop)
export const cameraTargetPosition = new THREE.Vector3();
export const cameraOffset = new THREE.Vector3();
export const targetLookAt = new THREE.Vector3();
export const gameOverLookAtTarget = new THREE.Vector3();
export const gameOverCameraTargetPosition = new THREE.Vector3();
export const viewShiftPoint = new THREE.Vector3(); 

// Particle/Text Effect Arrays (Mutable state)
export const explosionParticles = [];
export const floatingTexts = [];
export let allTrailParticles = []; // Projectile trails

// Font Variable (Loaded in init.js)
export let textFont = null;

// Timing Variables (Mutable state)
export let lastFrameTime = 0; 

// Top Score State
export let topScore = 0;
export let topScoreAtGameStart = 0; 
export let pickupsCollectedCounter = 0; 

// Projectile State
export const projectiles = []; 

// Pickup Templates (initialized later, but state needs to be accessible)
export let sparseTrailPickupTemplate;
export let ammoPickupTemplate;

// --- Functions to set state --- (Needed because modules are static)
export function setScene(newScene) { scene = newScene; }
export function setCamera(newCamera) { camera = newCamera; }
export function setRenderer(newRenderer) { renderer = newRenderer; }
export function setPlaneMesh(newMesh) { planeMesh = newMesh; }
export function setGridMesh(newMesh) { gridMesh = newMesh; }
export function setSnakeHead1(head) { snakeHead1 = head; }
export function setSnakeHead2(head) { snakeHead2 = head; }
export function setAmmoIndicatorP1(indicator) { ammoIndicatorP1 = indicator; }
export function setAmmoIndicatorAI(indicator) { ammoIndicatorAI = indicator; }
export function setLookingBack(value) { isLookingBack = value; }
export function setLookBackTouchId(value) { lookBackTouchId = value; }
export function setBoundaryXMin(value) { boundaryXMin = value; }
export function setBoundaryXMax(value) { boundaryXMax = value; }
export function setBoundaryZMin(value) { boundaryZMin = value; }
export function setBoundaryZMax(value) { boundaryZMax = value; }
export function setMaxScorePickups(value) { maxScorePickups = value; }
export function setMaxExpansionPickups(value) { maxExpansionPickups = value; }
export function setMaxClearPickups(value) { maxClearPickups = value; }
export function setMaxZoomPickups(value) { maxZoomPickups = value; }
export function setMaxSparseTrailPickups(value) { maxSparseTrailPickups = value; }
export function setMaxAmmoPickups(value) { maxAmmoPickups = value; }
export function setMaxMultiSpawnPickups(value) { maxMultiSpawnPickups = value; }
export function setMaxAddAiPickups(value) { maxAddAiPickups = value; }
export function setIsGameOver(value) { isGameOver = value; }
export function setGameActive(value) { gameActive = value; }
export function setWinner(value) { winner = value; }
export function setGameOverTextElement(elem) { gameOverTextElement = elem; }
export function setVersionTextElement(elem) { versionTextElement = elem; }
export function setOpeningDialogElement(elem) { openingDialogElement = elem; }
export function setScoreTextElement(elem) { scoreTextElement = elem; }
export function setTopScoreTextElement(elem) { topScoreTextElement = elem; }
export function setTextFont(font) { textFont = font; }
export function setLastFrameTime(time) { lastFrameTime = time; }
export function setTopScore(score) { topScore = score; }
export function setTopScoreAtGameStart(score) { topScoreAtGameStart = score; }
export function setPickupsCollectedCounter(count) { pickupsCollectedCounter = count; }
export function setSparseTrailPickupTemplate(template) { sparseTrailPickupTemplate = template; }
export function setAmmoPickupTemplate(template) { ammoPickupTemplate = template; }
export function setLastTrailSegment1(segment) { lastTrailSegment1 = segment; }
export function setLastTrailSegment2(segment) { lastTrailSegment2 = segment; }
export function setSpeedBoostActiveP1(value) { isSpeedBoostActiveP1 = value; }
export function setSpeedBoostEndTimeP1(time) { speedBoostEndTimeP1 = time; }
export function setIsZoomedOutP1(value) { isZoomedOutP1 = value; }
export function setZoomOutEndTimeP1(time) { zoomOutEndTimeP1 = time; }
export function setZoomLevelP1(level) { zoomLevelP1 = level; }
export function setIsSparseTrailActiveP1(value) { isSparseTrailActiveP1 = value; }
export function setSparseTrailEndTimeP1(time) { sparseTrailEndTimeP1 = time; }
export function setTrailCounterP1(count) { trailCounterP1 = count; }
export function setSparseLevelP1(level) { sparseLevelP1 = level; }
export function setLastUpdateTimeP1(time) { lastUpdateTimeP1 = time; }
export function setAmmoCountP1(count) { ammoCountP1 = count; }
export function setSpeedBoostActiveAI(value) { isSpeedBoostActiveAI = value; }
export function setSpeedBoostEndTimeAI(time) { speedBoostEndTimeAI = time; }
export function setIsSparseTrailActiveAI(value) { isSparseTrailActiveAI = value; }
export function setSparseTrailEndTimeAI(time) { sparseTrailEndTimeAI = time; }
export function setTrailCounterAI(count) { trailCounterAI = count; }
export function setSparseLevelAI(level) { sparseLevelAI = level; }
export function setLastUpdateTimeAI(time) { lastUpdateTimeAI = time; }
export function setAmmoCountAI(count) { ammoCountAI = count; }

// Function to update score and text element
export function setScoreP1(newScore) {
    scoreP1 = newScore;
    if (scoreTextElement) {
        scoreTextElement.textContent = `Score: ${scoreP1}`;
    } else {
        console.warn("scoreTextElement not yet initialized in state.");
    }
} 