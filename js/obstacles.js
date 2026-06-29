/**
 * obstacles.js — Obstacle Spawner & Scene Management
 * Chennai Rush
 *
 * Obstacle types (all Chennai-themed, low-poly):
 *   1. rickshaw  — Auto-rickshaw (yellow body, orange roof)
 *   2. cart      — Street vendor cart (wooden with canopy)
 *   3. barrier   — Road safety barrier (red & white stripes)
 *   4. cow       — Sacred cow blocking the road 🐄
 *   5. pothole   — Large pothole (flat dark disc)
 *
 * Obstacles are built fresh each spawn and disposed on despawn.
 * Spawn interval decreases as game speed increases.
 */

'use strict';

const OBS_TYPES = ['rickshaw', 'cart', 'barrier', 'cow', 'pothole'];

class ObstacleManager {
  constructor(scene) {
    this._scene       = scene;
    this._active      = [];       // Currently live obstacles
    this._spawnTimer  = 1.8;     // Seconds until first spawn
    this._minInterval = 0.75;
    this._maxInterval = 2.6;
    this._lastLane    = -1;      // Avoid same-lane repeat
  }

  /* ══════════════════════════════════════════════════════
     MESH BUILDERS
  ══════════════════════════════════════════════════════ */

  _mat(color) { return new THREE.MeshLambertMaterial({ color }); }

  /** Auto-rickshaw */
  _buildRickshaw() {
    const g = new THREE.Group();

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.05, 2.7), this._mat(COLORS.rickshawBody));
    body.position.y = 0.9; g.add(body);

    // Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.22, 2.4), this._mat(COLORS.rickshawRoof));
    roof.position.y = 1.57; g.add(roof);

    // Windscreen
    const ws = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.60, 0.08), this._mat(0x1A2A3A));
    ws.position.set(0, 1.05, -1.40); g.add(ws);

    // 3 wheels
    const wGeo = new THREE.CylinderGeometry(0.30, 0.30, 0.22, 8);
    const wMat = this._mat(0x222222);
    [[-0.68, 0, -0.95], [0.68, 0, -0.95], [0, 0, 1.05]].forEach(([wx, wy, wz]) => {
      const w = new THREE.Mesh(wGeo, wMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.30, wz);
      g.add(w);
    });

    // Driver head
    const drv = new THREE.Mesh(new THREE.SphereGeometry(0.26, 6, 5), this._mat(COLORS.skin));
    drv.position.set(0, 1.60, 0.65); g.add(drv);

    g._obsType = 'rickshaw';
    return g;
  }

  /** Street vendor cart */
  _buildCart() {
    const g = new THREE.Group();

    const base = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.52, 1.75), this._mat(COLORS.cartBody));
    base.position.y = 0.62; g.add(base);

    // Items on cart
    for (let i = 0; i < 5; i++) {
      const item = new THREE.Mesh(
        new THREE.BoxGeometry(randFloat(0.2, 0.35), randFloat(0.15, 0.38), randFloat(0.2, 0.35)),
        this._mat(randItem(COLORS.buildings))
      );
      item.position.set(randFloat(-0.38, 0.38), 1.08, randFloat(-0.55, 0.55));
      g.add(item);
    }

    // Canopy poles
    [[-0.48, -0.52], [0.48, -0.52], [-0.48, 0.52], [0.48, 0.52]].forEach(([px, pz]) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.15, 5), this._mat(0x777777));
      pole.position.set(px, 1.50, pz); g.add(pole);
    });

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.09, 1.85), this._mat(COLORS.cartCanopy));
    canopy.position.y = 2.10; g.add(canopy);

    const wGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.18, 8);
    [-0.62, 0.62].forEach(wx => {
      const w = new THREE.Mesh(wGeo, this._mat(0x333333));
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.27, 0); g.add(w);
    });

    g._obsType = 'cart';
    return g;
  }

  /** Road barrier */
  _buildBarrier() {
    const g = new THREE.Group();

    const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.44), this._mat(0x444444));
    base.position.y = 0.09; g.add(base);

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.48, 0.36), this._mat(COLORS.barrierRed));
    body.position.y = 0.42; g.add(body);

    // White stripes
    [-0.9, 0, 0.9].forEach(bx => {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.50, 0.38), this._mat(COLORS.barrierWhite));
      stripe.position.set(bx, 0.42, 0); g.add(stripe);
    });

    [-1.08, 1.08].forEach(px => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.05, 6), this._mat(0x888888));
      post.position.set(px, 0.52, 0); g.add(post);
    });

    g._obsType = 'barrier';
    return g;
  }

  /** Sacred cow */
  _buildCow() {
    const g = new THREE.Group();

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.88, 1.65), this._mat(COLORS.cowBody));
    body.position.y = 0.88; g.add(body);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.52, 0.62), this._mat(COLORS.cowBody));
    head.position.set(0, 1.32, -1.07); g.add(head);

    // Snout
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.27, 0.2), this._mat(COLORS.cowSpot));
    snout.position.set(0, 1.14, -1.40); g.add(snout);

    // Eyes
    [-0.17, 0.17].forEach(ex => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), this._mat(0x111111));
      eye.position.set(ex, 1.38, -1.37); g.add(eye);
    });

    // Spots
    [0.28, -0.28].forEach(ox => {
      const spot = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.33, 0.17), this._mat(COLORS.cowSpot));
      spot.position.set(ox, 0.98, randFloat(-0.4, 0.4));
      spot.rotation.z = randFloat(-0.4, 0.4); g.add(spot);
    });

    // 4 legs
    const legGeo = new THREE.BoxGeometry(0.19, 0.62, 0.19);
    [[-0.30, 0.31, -0.68], [0.30, 0.31, -0.68], [-0.30, 0.31, 0.52], [0.30, 0.31, 0.52]].forEach(p => {
      const leg = new THREE.Mesh(legGeo, this._mat(COLORS.cowBody));
      leg.position.set(...p); g.add(leg);
    });

    // Horns
    const hornGeo = new THREE.CylinderGeometry(0.04, 0.03, 0.38, 5);
    [-0.19, 0.19].forEach(hx => {
      const horn = new THREE.Mesh(hornGeo, this._mat(0xF0D060));
      horn.rotation.z = hx > 0 ? 0.45 : -0.45;
      horn.position.set(hx, 1.70, -0.92); g.add(horn);
    });

    // Tail
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 0.65, 5), this._mat(COLORS.cowSpot));
    tail.rotation.z = 0.85;
    tail.position.set(0.05, 1.08, 0.88); g.add(tail);

    g._obsType = 'cow';
    return g;
  }

  /** Pothole */
  _buildPothole() {
    const g = new THREE.Group();

    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.88, 0.88, 0.09, 12),
      this._mat(COLORS.potholeRim)
    );
    rim.position.y = 0.02; g.add(rim);

    const hole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.70, 0.70, 0.07, 12),
      this._mat(COLORS.pothole)
    );
    hole.position.y = 0.03; g.add(hole);

    // Crack lines
    for (let c = 0; c < 3; c++) {
      const crack = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.04, randFloat(0.5, 1.0)),
        this._mat(0x1A1A2A)
      );
      crack.position.set(randFloat(-0.4, 0.4), 0.05, randFloat(-0.3, 0.3));
      crack.rotation.y = randFloat(0, Math.PI); g.add(crack);
    }

    g._obsType = 'pothole';
    return g;
  }

  /* ── Factory ─────────────────────────────────────────── */
  _buildMesh(type) {
    switch (type) {
      case 'rickshaw': return this._buildRickshaw();
      case 'cart':     return this._buildCart();
      case 'barrier':  return this._buildBarrier();
      case 'cow':      return this._buildCow();
      case 'pothole':  return this._buildPothole();
      default:         return this._buildBarrier();
    }
  }

  /* ══════════════════════════════════════════════════════
     SPAWN
  ══════════════════════════════════════════════════════ */
  _spawn() {
    const type  = randItem(OBS_TYPES);
    const mesh  = this._buildMesh(type);

    // Avoid same lane as last spawn
    let lane;
    do { lane = randInt(0, 2); } while (lane === this._lastLane && Math.random() < 0.7);
    this._lastLane = lane;

    mesh.position.set(LANES[lane], 0, SPAWN_Z - randFloat(0, 15));
    mesh.castShadow = true;
    this._scene.add(mesh);
    this._active.push(mesh);
  }

  /* ══════════════════════════════════════════════════════
     UPDATE
  ══════════════════════════════════════════════════════ */
  update(delta, speed) {
    const dz = speed * delta;

    // Lerp spawn interval based on speed
    const t        = clamp((speed - SPEED_INIT) / (SPEED_MAX - SPEED_INIT), 0, 1);
    const interval = lerp(this._maxInterval, this._minInterval, t);

    this._spawnTimer -= delta;
    if (this._spawnTimer <= 0) {
      this._spawnTimer = interval * randFloat(0.8, 1.2); // Some variance
      this._spawn();
    }

    // Move all active obstacles forward (toward camera)
    const toRemove = [];
    this._active.forEach(obs => {
      obs.position.z += dz;

      // Cow gently sways
      if (obs._obsType === 'cow') {
        obs.rotation.y = Math.sin(Date.now() * 0.0015) * 0.08;
      }

      if (obs.position.z > DESPAWN_Z) toRemove.push(obs);
    });

    // Recycle despawned obstacles
    toRemove.forEach(obs => {
      const idx = this._active.indexOf(obs);
      if (idx !== -1) this._active.splice(idx, 1);
      this._scene.remove(obs);
      obs.traverse(c => { if (c.geometry) c.geometry.dispose(); });
    });
  }

  /* ══════════════════════════════════════════════════════
     COLLISION DETECTION
  ══════════════════════════════════════════════════════ */
  checkCollision(playerBox) {
    const obsBox = new THREE.Box3();
    for (let i = 0; i < this._active.length; i++) {
      const obs = this._active[i];

      // Quick Z-range cull (only check obstacles near player)
      if (obs.position.z < -10 || obs.position.z > 7) continue;

      obsBox.setFromObject(obs);
      obsBox.expandByScalar(-0.15); // Slightly forgiving

      if (playerBox.intersectsBox(obsBox)) return true;
    }
    return false;
  }

  /* ══════════════════════════════════════════════════════
     RESET
  ══════════════════════════════════════════════════════ */
  reset() {
    this._active.forEach(obs => {
      this._scene.remove(obs);
      obs.traverse(c => { if (c.geometry) c.geometry.dispose(); });
    });
    this._active      = [];
    this._spawnTimer  = 1.8;
    this._lastLane    = -1;
  }
}
