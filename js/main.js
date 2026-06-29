/**
 * main.js — Entry Point, Three.js Setup & Game Loop
 * Chennai Rush
 *
 * This file bootstraps the entire game:
 *   1. Creates the Three.js scene, renderer & camera
 *   2. Sets up lighting and fog
 *   3. Instantiates all game systems
 *   4. Wires up UI button events
 *   5. Wires up input → player actions
 *   6. Runs the requestAnimationFrame game loop
 *
 * Game loop (each frame):
 *   ┌──────────────────────────────────┐
 *   │  calcDelta → updateGame →        │
 *   │  updatePlayer → updateWorld →    │
 *   │  updateObstacles → updateCoins → │
 *   │  updateUI → render              │
 *   └──────────────────────────────────┘
 */

'use strict';

/* ══════════════════════════════════════════════════════
   MODULE-LEVEL VARIABLES
   All accessible to functions below without passing args.
══════════════════════════════════════════════════════ */
let renderer, scene, camera;
let gm, player, world, obstacles, coins, ui, audio, input;
let clock;
let running = false; // Is the animation loop active?

/* ══════════════════════════════════════════════════════
   INIT — Called once on page load
══════════════════════════════════════════════════════ */
async function init() {
  /* ── Three.js Renderer ────────────────────────────── */
  const canvas = document.getElementById('game-canvas');
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled  = true;
  renderer.shadowMap.type     = THREE.PCFSoftShadowMap;
  renderer.setClearColor(COLORS.skyTop, 1);

  /* ── Scene ────────────────────────────────────────── */
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(COLORS.fog, 0.012);
  scene.background = new THREE.Color(COLORS.skyTop);

  /* ── Camera ───────────────────────────────────────── */
  camera = new THREE.PerspectiveCamera(
    65,                                        // FOV
    window.innerWidth / window.innerHeight,    // Aspect
    0.1,                                       // Near
    500                                        // Far
  );
  // Fixed behind-the-player view
  camera.position.set(0, 5.5, 11);
  camera.lookAt(0, 1.8, -4);

  /* ── Lighting ─────────────────────────────────────── */
  // Hemisphere: warm sky, cool ground
  const hemi = new THREE.HemisphereLight(0xFF8C42, 0x7A6040, 0.8);
  scene.add(hemi);

  // Primary sun: warm directional light with shadows
  const sun = new THREE.DirectionalLight(0xFFD090, 1.4);
  sun.position.set(8, 20, -10);
  sun.castShadow            = true;
  sun.shadow.mapSize.width  = 1024;
  sun.shadow.mapSize.height = 1024;
  sun.shadow.camera.near    = 0.5;
  sun.shadow.camera.far     = 150;
  sun.shadow.camera.left    = -30;
  sun.shadow.camera.right   = 30;
  sun.shadow.camera.top     = 30;
  sun.shadow.camera.bottom  = -30;
  scene.add(sun);

  // Soft fill light from opposite side
  const fill = new THREE.DirectionalLight(0xFF7055, 0.4);
  fill.position.set(-5, 8, 5);
  scene.add(fill);

  /* ── Clock (for delta time) ───────────────────────── */
  clock = new THREE.Clock();

  /* ── Instantiate game systems ─────────────────────── */
  gm        = new GameManager();
  audio     = new AudioManager();
  input     = new InputHandler();
  ui        = new UIManager();
  world     = new WorldManager(scene);
  obstacles = new ObstacleManager(scene);
  coins     = new CoinManager(scene);
  player    = new Player(scene);

  ui.setCamera(camera);

  /* ── Wire up input → player actions ──────────────── */
  input.on('left',  () => {
    if (gm.state === STATE.PLAYING) player.moveLeft();
  });
  input.on('right', () => {
    if (gm.state === STATE.PLAYING) player.moveRight();
  });
  input.on('jump',  () => {
    if (gm.state === STATE.PLAYING) {
      player.jump();
      audio.playJump();
    }
  });

  /* ── Wire up UI buttons ───────────────────────────── */
  document.getElementById('btn-play').addEventListener('click', () => {
    audio.init();
    audio.resume();
    startGame();
  });

  document.getElementById('btn-restart').addEventListener('click', () => {
    audio.resume();
    ui.hideGameOver();
    setTimeout(() => startGame(), 350);
  });

  document.getElementById('btn-to-menu').addEventListener('click', () => {
    audio.resume();
    ui.hideGameOver();
    setTimeout(() => goToMenu(), 350);
  });

  document.getElementById('btn-sound').addEventListener('click', () => {
    const enabled = audio.toggle();
    ui.setSoundIcon(enabled);
  });

  /* ── Responsive resize ────────────────────────────── */
  window.addEventListener('resize', onResize);

  /* ── Show loading, then reveal menu ──────────────── */
  await ui.animateLoading(1800);
  ui.hideLoading();
  await sleep(600);
  ui.showMenu(gm.highScore);

  /* ── Start render loop (renders menu/idle scene) ─── */
  running = true;
  loop();
}

/* ══════════════════════════════════════════════════════
   GAME FLOW
══════════════════════════════════════════════════════ */

function startGame() {
  // Reset all systems
  gm.start();
  player.reset();
  world.reset();
  obstacles.reset();
  coins.reset();

  // Show HUD, enable input
  ui.hideMenu();
  ui.showHUD();
  input.setActive(true);

  // Start background music
  audio.startBackground();

  // Sync HUD display
  ui.updateScore(0);
  ui.updateCoins(0);
  ui.updateDistance('0m');
  ui.updateSpeedBar(0);
}

function triggerGameOver() {
  gm.gameOver();
  input.setActive(false);
  audio.stopBackground();
  audio.playCrash();
  ui.screenShake();

  // Short delay for crash effect, then show game over screen
  setTimeout(() => {
    ui.hideHUD();
    ui.showGameOver(
      gm.score,
      gm.highScore,
      gm.coins,
      gm.distanceStr,
      gm.newRecord
    );
  }, 600);
}

function goToMenu() {
  gm.state = STATE.MENU;
  input.setActive(false);
  audio.stopBackground();
  ui.hideHUD();
  ui.showMenu(gm.highScore);
}

/* ══════════════════════════════════════════════════════
   MAIN GAME LOOP
══════════════════════════════════════════════════════ */
function loop() {
  if (!running) return;
  requestAnimationFrame(loop);

  // Delta time, capped at 100ms to prevent huge jumps after tab hide
  const rawDelta = clock.getDelta();
  const delta    = Math.min(rawDelta, 0.1);

  const isPlaying = gm.state === STATE.PLAYING;

  /* ── Update game state & speed ──────────────────── */
  gm.update(delta);

  if (isPlaying) {
    const speed = gm.speed;

    /* ── Player ─────────────────────────────────────── */
    player.update(delta);

    /* ── World (road scroll) ────────────────────────── */
    world.update(delta, speed);

    /* ── Obstacles ──────────────────────────────────── */
    obstacles.update(delta, speed);

    /* ── Coins ──────────────────────────────────────── */
    coins.update(delta, speed);

    /* ── Collision: obstacles → game over ───────────── */
    const playerBox = player.getBox();
    if (obstacles.checkCollision(playerBox)) {
      triggerGameOver();
    }

    /* ── Collision: coins → collect ─────────────────── */
    const collected = coins.checkCollection(playerBox);
    if (collected > 0) {
      for (let i = 0; i < collected; i++) {
        gm.addCoin();
        audio.playCoin();
      }
      ui.updateCoins(gm.coins);
    }

    /* ── HUD updates ────────────────────────────────── */
    ui.updateScore(gm.score);
    ui.updateDistance(gm.distanceStr);
    ui.updateSpeedBar(gm.speedFraction);
    audio.setSpeedFactor(gm.speedFraction);

    /* ── Subtle camera drift with player lane ───────── */
    camera.position.x = lerp(camera.position.x, player.posX * 0.25, delta * 5);

  } else if (gm.state === STATE.MENU) {
    // Slowly scroll world in menu for ambient feel
    world.update(delta, SPEED_INIT * 0.4);
  }

  /* ── Screen shake effect ─────────────────────────── */
  ui.updateEffects(delta);

  /* ── Render ──────────────────────────────────────── */
  renderer.render(scene, camera);
}

/* ══════════════════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════════════════ */
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/* ══════════════════════════════════════════════════════
   KICK OFF
══════════════════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', init);
