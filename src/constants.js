import * as THREE from 'three';

// Game constants (colors, sizes, speeds, etc.) will be defined and exported from here 

// Version
export const GAME_VERSION = "v1.1.38";

// Color Constants
export const P1_HEAD_COLOR_NORMAL = 0x00ffff; // Cyan
export const P1_TRAIL_COLOR_NORMAL = 0x00aaaa; // Dark Cyan (Reverted)
export const P1_HEAD_COLOR_BOOST = 0x80ffff;  // Lighter Cyan (Reverted)
export const P1_TRAIL_COLOR_BOOST = 0x40cccc; // Lighter Dark Cyan (Reverted)
export const HEAD_COLOR_LOST = 0xff0000; // Red for lost state

export const AMMO_COLOR = 0xffa500; // Orange
export const AMMO_TRAIL_COLOR = 0xff4500; // Reddish-Orange for projectile trail

// Game Settings
export const segmentSize = 1;
export const normalUpdateInterval = 250; // Normal speed
export const boostDuration = 3000; // milliseconds (3 seconds)
export const SPEED_BOOST_DIMINISHING_FACTOR = 0.75; // Higher = less diminishing return
export const zoomOutDuration = 20000; // Doubled *again* to 20 seconds zoom
export const sparseTrailDuration = 8000; // 8 seconds sparse trail
export const LERP_FACTOR = 0.2; // Smoothing factor for visual movement

// Dynamic Boundary
export const initialBoundaryHalfSize = 15; // Increased initial size
export const expansionAmount = 10; // Expansion amount as per updated rules

// Camera Settings
export const cameraHeight = 3; // Lowered camera height further
export const cameraDistanceBehind = 4;
export const zoomedOutCameraHeight = cameraHeight * 1.8; // Zoom out height
export const zoomedOutCameraDistanceBehind = cameraDistanceBehind * 1.8; // Zoom out distance
export const cameraLag = 0.08; // Reverted to original value for maximum smoothness
export const cameraViewShiftDistance = 25;
export const gameOverCameraLag = 0.06;
export const CAMERA_ROTATION_SPEED = 0.003; // Sensitivity for game over screen drag rotation
export const CAMERA_PANNING_SPEED = 0.01;   // Sensitivity for middle-mouse panning
export const CAMERA_ZOOM_SPEED = 0.1;       // Sensitivity for mouse wheel zoom (as a factor)
export const MIN_ZOOM_DISTANCE = 5;        // Minimum distance from target
export const MAX_ZOOM_DISTANCE = 100;       // Maximum distance from target

// Scoring
export const scoreIncrementPerTick = 1; // Score for surviving a tick
export const SPEED_BOOST_SCORE_MULTIPLIER = 0.5; // Each speed level adds 50% bonus score

// Pickup Geometries & Materials (Consider moving instantiation later if complex)
export const scorePickupGeometry = new THREE.BoxGeometry(segmentSize * 0.6, segmentSize * 0.6, segmentSize * 0.6); 
export const scorePickupMaterial = new THREE.MeshPhongMaterial({ color: 0xff00ff, emissive: 0x550055 }); // Bright Pink
export const expansionPickupGeometry = new THREE.BoxGeometry(segmentSize * 0.7, segmentSize * 0.7, segmentSize * 0.7);
export const expansionPickupMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00, emissive: 0x005500 }); // Green
export const clearPickupGeometry = new THREE.BoxGeometry(segmentSize * 0.5, segmentSize * 0.5, segmentSize * 0.5); 
export const clearPickupMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xaaaaaa }); // White/Bright
export const zoomPickupGeometry = new THREE.BoxGeometry(segmentSize * 0.5, segmentSize * 0.5, segmentSize * 0.5); 
export const zoomPickupMaterial = new THREE.MeshPhongMaterial({ color: 0x0088ff, emissive: 0x0033aa }); // Blue
export const sparseTrailMaterial = new THREE.MeshPhongMaterial({ color: 0xffff00, emissive: 0xaaaa00 }); // Yellow
export const ammoPickupMaterial = new THREE.MeshPhongMaterial({ color: AMMO_COLOR, emissive: 0xaa7500 }); 
export const multiSpawnGeometry = new THREE.IcosahedronGeometry(segmentSize * 0.45, 0); // Icosahedron, radius 0.45
export const multiSpawnMaterial = new THREE.MeshPhongMaterial({ color: 0x9900ff, emissive: 0x5500aa }); // Purple
export const addAiPickupGeometry = new THREE.OctahedronGeometry(segmentSize * 0.6, 0); // Placeholder shape
export const addAiPickupMaterial = new THREE.MeshPhongMaterial({ color: 0x888888, emissive: 0x444444 }); // Placeholder Gray
export const AMMO_PICKUP_RADIUS = segmentSize * 0.4;

// Pickup Spawn Chances/Thresholds
export const expansionPickupSpawnChance = 0.15;
export const clearPickupSpawnChance = 0.10;
export const zoomPickupSpawnChance = 0.10;
export const sparseTrailPickupSpawnChance = 0.08;
export const ammoPickupSpawnChance = 0.08;
export const multiSpawnPickupSpawnChance = 0.07;
export const CLEAR_WALL_PICKUP_THRESHOLD = 5;
export const ADD_AI_PICKUP_THRESHOLD = 20;
export const EXPAND_PICKUP_THRESHOLD = 15;
export const AMMO_PICKUP_THRESHOLD = 10;
export const MULTI_PICKUP_THRESHOLD = 15;
export const PICKUP_COLLISION_THRESHOLD_SQ = (segmentSize * 0.5) * (segmentSize * 0.5);

// AI Constants
export const AI_LOOK_AHEAD_STEPS = 3;
export const AI_PICKUP_SCAN_RADIUS_SQ = 7 * 7;
export const AI_STRAIGHT_BIAS = 0.9;
export const aiPickupScanRadius = 7; // (Duplicate? Keeping for now)

// General Constants
export const epsilon = 0.01;
export const yAxis = new THREE.Vector3(0, 1, 0);
export const gridLineMaterial = new THREE.LineBasicMaterial({ color: 0x555555 });

// Particle Effect Constants
export const PARTICLE_COUNT = 60;
export const PARTICLE_SIZE = 0.15;
export const EXPLOSION_FORCE = 5.0;
export const PARTICLE_GRAVITY = -9.8;
export const PARTICLE_LIFE = 7.0;
export const GROUND_Y = -segmentSize / 2;

// Floating Text Constants
export const TEXT_LIFE = 3.0;
export const TEXT_MOVE_SPEED = 1.5;
export const TEXT_SIZE = 0.3;
export const TEXT_HEIGHT_OFFSET = 0.5;

// <<< ADDED: Pickup Spawn Effect Constants >>>
export const SPAWN_EFFECT_PARTICLE_COUNT = 80; // Doubled from 40
export const SPAWN_EFFECT_PARTICLE_SIZE = 0.1;
// export const SPAWN_EFFECT_OUTWARD_DURATION = 0.2; // seconds // REMOVED - Replaced by phase durations
// export const SPAWN_EFFECT_INWARD_DURATION = 0.3; // seconds // REMOVED - Replaced by phase durations
export const SPAWN_EFFECT_MAX_RADIUS = 1.5;
export const SPAWN_EFFECT_START_SCALE = 0.5;
export const SPAWN_EFFECT_MAX_SCALE = 1.2;
export const SPAWN_EFFECT_DURATION_EXPAND = 0.3; // Duration of expansion phase (seconds)
export const SPAWN_EFFECT_DURATION_LINGER = 0.5; // Duration of lingering phase (seconds)
export const SPAWN_EFFECT_DURATION_CONTRACT = 0.4; // Duration of contraction phase (seconds)
export const SPAWN_EFFECT_ROTATION_SPEED = Math.PI * 4; // Radians per second for spiral motion
// <<< END ADDED >>>

// Projectile Constants
export const PROJECTILE_SPEED = 20;
export const PROJECTILE_SIZE = 0.3;
export const projectileGeometry = new THREE.SphereGeometry(PROJECTILE_SIZE, 8, 8);
export const projectileMaterial = new THREE.MeshPhongMaterial({ 
    color: AMMO_COLOR, 
    emissive: new THREE.Color(AMMO_COLOR).multiplyScalar(0.5) // Make emissive a darker shade of AMMO_COLOR
});

// Projectile Trail Particle Constants
export const TRAIL_PARTICLE_COUNT_PER_FRAME = 2;
export const TRAIL_PARTICLE_SIZE = 0.08;
export const TRAIL_PARTICLE_LIFE = 0.3;
export const trailParticleGeometry = new THREE.BoxGeometry(TRAIL_PARTICLE_SIZE, TRAIL_PARTICLE_SIZE, TRAIL_PARTICLE_SIZE);
export const trailParticleMaterial = new THREE.MeshBasicMaterial({
    color: AMMO_TRAIL_COLOR,
    transparent: true,
    opacity: 0.8
});

// Unlock Thresholds Data
export const UNLOCK_THRESHOLDS = [
    { score: 50, name: "Speed Up!", color: 0xff00ff, type: "score" },
    { score: 200, name: "Sparse Trail!", color: 0xffff00, type: "sparse" },
    { score: 300, name: "Ammo!", color: 0xffa500, type: "ammo" },
    { score: 500, name: "Clear Walls!", color: 0xffffff, type: "clear" },
    { score: 1000, name: "More Players!", color: 0x888888, type: "add_ai" },
    { score: 1500, name: "Expand!", color: 0x00ff00, type: "expansion" },
    { score: 2000, name: "More!", color: 0x9900ff, type: "multi" }
];

// --- AI Colors ---
export const AI_COLORS = [
    // AI 0: Was Orange (0xff8800), now Dark Orange
    { name: 'DarkOrange', normal: 0xcc6600, trail: 0x994c00, boost: 0xff8800, boostTrail: 0xdd6600 },
    // AI 1: Red (Remains the same)
    { name: 'Red',    normal: 0xff0000, trail: 0xcc0000, boost: 0xff6666, boostTrail: 0xdd4444 },
    // AI 2: Was Purple (0x9900ff), now BlueViolet
    { name: 'BlueViolet', normal: 0x8A2BE2, trail: 0x6A1FBC, boost: 0xAA66EE, boostTrail: 0x9040D0 },
    // AI 3: Was Green (0x00cc00), now ForestGreen
    { name: 'ForestGreen',  normal: 0x228B22, trail: 0x1A681A, boost: 0x66CC66, boostTrail: 0x44AA44 },
    // Add more distinct colors if more AIs are needed
];

// --- REMOVED OLD SINGLE COLORS ---
// export const AI_HEAD_COLOR_NORMAL = 0xff8800; // Orange
// export const AI_TRAIL_COLOR_NORMAL = 0xcc6600; // Dark Orange
// export const AI_HEAD_COLOR_BOOST = 0xffaa40; // Lighter Orange
// export const AI_TRAIL_COLOR_BOOST = 0xdd8840; // Lighter Dark Orange

// Game Settings & Tunables
export const ARENA_SIZE = 30;

// <<< ADDED: AI Spawning Constants >>>
export const AI_MAX_AMMO = 3;
export const AI_SHOOT_INTERVAL = 500; // ms between AI shots
export const AI_SPAWN_DURATION = 2000; // ms for AI spawn delay (when AI can start moving)
export const AI_SPAWN_RING_VISUAL_DURATION = 1900; // <<< REDUCED: ms for the visual ring effect animation (Slightly less than spawn duration)
export const AI_SPAWN_RING_MAX_RADIUS = segmentSize * 2.0; // Defines the initial large radius for the rings
export const AI_SPAWN_RING_DURATION = AI_SPAWN_DURATION; // <<< KEPT: Original link, might be unused now
export const AI_SPAWN_RING_COUNT = 3; // Number of concentric rings
export const AI_SPAWN_RING_RADIUS_STEP = 0.6; // Multiplier for radius increase per ring
export const AI_SPAWN_EFFECT_COLOR = 0x8A2BE2; // BlueViolet (Example)
// <<< END ADDED >>>

// ... rest of constants.js ... 