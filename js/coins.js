/**
 * coins.js — Coin Spawner, Animation & Collection
 * Chennai Rush
 *
 * Coins are gold spinning discs spawned in three patterns:
 *   line    — straight row across one lane
 *   arc     — curved across all 3 lanes
 *   zigzag  — alternating lanes
 *
 * Each coin is a flat CylinderGeometry. They spin on Y-axis
 * and are collected when the player gets close.
 *
 * Object pool keeps ~40 coins; they are recycled on despawn.
 */

'use strict';

const COIN_PATTERNS = ['line', 'arc', 'zigzag'];

class CoinManager {
  constructor(scene) {
    this._scene      = scene;
    this._coins      = [];    // All active coin objects (plain array)
    this._spawnTimer = 2.0;   // Seconds until first coin pattern
    this._maxInterval = 3.5;
    this._minInterval = 1.4;

    // Shared materials (reused across all coins for performance)
    this._faceMat = new THREE.MeshLambertMaterial({ color: COLORS.coin });
    this._edgeMat = new THREE.MeshLambertMaterial({ color: COLORS.coinEdge });
  }

  /* ── Build a single coin mesh ─────────────────────── */
  _buildCoin() {
    const g = new THREE.Group();

    // Flat disc (face)
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.10, 10),
      this._faceMat
    );
    disc.rotation.z = Math.PI / 2; // Rotate to face player
    g.add(disc);

    // Rim (slightly larger, edge colour)
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.30, 0.30, 0.06, 10),
      this._edgeMat
    );
    rim.rotation.z = Math.PI / 2;
    g.add(rim);

    return g;
  }

  /* ══════════════════════════════════════════════════════
     SPAWN PATTERNS
  ══════════════════════════════════════════════════════ */

  /** Spawn a group of coins in a pattern */
  _spawnPattern() {
    const pattern = randItem(COIN_PATTERNS);
    const baseZ   = SPAWN_Z - 5;
    const height  = 0.9; // Y height of coins

    switch (pattern) {

      case 'line': {
        // 5–7 coins in a straight line in one lane
        const lane  = LANES[randInt(0, 2)];
        const count = randInt(5, 8);
        for (let i = 0; i < count; i++) {
          this._spawnCoin(lane, height, baseZ - i * 2.2);
        }
        break;
      }

      case 'arc': {
        // Coins arc across all 3 lanes (L → C → R → C → L)
        const sequence = [
          [LANES[0], height],
          [LANES[1], height + 0.5],
          [LANES[2], height],
          [LANES[1], height + 0.5],
          [LANES[0], height],
          [LANES[1], height + 0.5],
          [LANES[2], height],
        ];
        sequence.forEach(([lx, ly], i) => {
          this._spawnCoin(lx, ly, baseZ - i * 2.5);
        });
        break;
      }

      case 'zigzag': {
        // Alternate left and right lane
        const count = randInt(6, 9);
        const lanes = [LANES[0], LANES[2]];
        for (let i = 0; i < count; i++) {
          this._spawnCoin(lanes[i % 2], height, baseZ - i * 2.0);
        }
        break;
      }
    }
  }

  /** Place a single coin at (x, y, z) */
  _spawnCoin(x, y, z) {
    const coin = this._buildCoin();
    coin.position.set(x, y, z);
    coin._spinY = 0; // Current spin angle
    coin._collected = false;
    this._scene.add(coin);
    this._coins.push(coin);
  }

  /* ══════════════════════════════════════════════════════
     UPDATE
  ══════════════════════════════════════════════════════ */
  update(delta, speed) {
    const dz = speed * delta;

    // Spawn timer
    const t        = clamp((speed - SPEED_INIT) / (SPEED_MAX - SPEED_INIT), 0, 1);
    const interval = lerp(this._maxInterval, this._minInterval, t);

    this._spawnTimer -= delta;
    if (this._spawnTimer <= 0) {
      this._spawnTimer = interval;
      this._spawnPattern();
    }

    // Move and spin each coin
    const toRemove = [];
    this._coins.forEach(c => {
      c.position.z += dz;

      // Spin animation
      c._spinY += delta * 4.0;
      c.rotation.y = c._spinY;

      // Gentle bob
      c.position.y += Math.sin(c._spinY * 2) * delta * 0.3;

      if (c.position.z > DESPAWN_Z) {
        toRemove.push(c);
      }
    });

    // Remove despawned coins
    toRemove.forEach(c => this._removeCoin(c));
  }

  /* ══════════════════════════════════════════════════════
     COLLECTION CHECK
     Returns number of coins collected this frame.
  ══════════════════════════════════════════════════════ */
  checkCollection(playerBox) {
    let collected = 0;
    const coinBox = new THREE.Box3();
    const toRemove = [];

    this._coins.forEach(c => {
      if (c._collected) return;
      // Only check coins near player Z
      if (c.position.z < -8 || c.position.z > 5) return;

      coinBox.setFromCenterAndSize(
        c.position.clone(),
        new THREE.Vector3(0.7, 0.7, 0.7)
      );

      if (playerBox.intersectsBox(coinBox)) {
        c._collected = true;
        collected++;
        toRemove.push(c);
        this._collectEffect(c.position.clone());
      }
    });

    toRemove.forEach(c => this._removeCoin(c));
    return collected;
  }

  /* ── Visual burst when a coin is collected ────────── */
  _collectEffect(pos) {
    // Spawn 6 tiny sparkle particles that fly outward and fade
    for (let i = 0; i < 6; i++) {
      const spark = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 4, 3),
        new THREE.MeshBasicMaterial({ color: COLORS.coinShine })
      );
      spark.position.copy(pos);
      const angle = (i / 6) * Math.PI * 2;
      spark._velX = Math.cos(angle) * 2.5;
      spark._velY = Math.sin(angle) * 2.5 + 1.5;
      spark._velZ = randFloat(-0.5, 0.5);
      spark._life = 0.35;
      this._scene.add(spark);

      // Animate the spark
      const tick = () => {
        spark._life -= 0.016;
        spark.position.x += spark._velX * 0.016;
        spark.position.y += spark._velY * 0.016;
        spark.position.z += spark._velZ * 0.016;
        spark._velY      -= 8 * 0.016; // gravity
        spark.material.opacity = spark._life / 0.35;
        if (spark._life <= 0) {
          this._scene.remove(spark);
          spark.geometry.dispose();
        } else {
          requestAnimationFrame(tick);
        }
      };
      spark.material.transparent = true;
      requestAnimationFrame(tick);
    }
  }

  /* ── Remove a coin from scene and array ─────────────── */
  _removeCoin(c) {
    const idx = this._coins.indexOf(c);
    if (idx !== -1) this._coins.splice(idx, 1);
    this._scene.remove(c);
    c.traverse(ch => { if (ch.geometry) ch.geometry.dispose(); });
  }

  /* ══════════════════════════════════════════════════════
     RESET
  ══════════════════════════════════════════════════════ */
  reset() {
    [...this._coins].forEach(c => this._removeCoin(c));
    this._coins       = [];
    this._spawnTimer  = 2.0;
  }
}
