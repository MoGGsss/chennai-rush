/**
 * world.js — Procedural Road, Buildings & Environment
 * Chennai Rush
 *
 * Road segments are recycled via an object pool.
 * Each segment is a THREE.Group containing:
 *   • Road surface + curbs + lane markings
 *   • Two buildings (left / right)
 *   • 1–2 decorations: palm trees, banyan trees, lamp posts
 *
 * When a segment passes the camera (Z > DESPAWN_Z),
 * it is moved to SPAWN_Z and regenerated with fresh
 * buildings and decorations (random each time).
 *
 * Sky background and ground plane are static.
 */

'use strict';

class WorldManager {
  constructor(scene) {
    this._scene    = scene;
    this._segments = []; // array of segment Groups

    this._buildEnvironment();
    this._buildRoadSegments();
  }

  /* ══════════════════════════════════════════════════════
     STATIC ENVIRONMENT: Sky background + far ground
  ══════════════════════════════════════════════════════ */
  _buildEnvironment() {
    const scene = this._scene;

    // Ground plane (wide, extends far)
    const gGeo  = new THREE.PlaneGeometry(200, 600);
    const gMat  = new THREE.MeshLambertMaterial({ color: COLORS.ground });
    const ground = new THREE.Mesh(gGeo, gMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.01, -200);
    ground.receiveShadow = true;
    scene.add(ground);

    // Sky backdrop (large sphere, inside-out)
    const skyGeo = new THREE.SphereGeometry(400, 16, 8);
    const skyMat = new THREE.MeshBasicMaterial({
      color: COLORS.skyTop,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(skyGeo, skyMat));
  }

  /* ══════════════════════════════════════════════════════
     ROAD SEGMENT POOL
  ══════════════════════════════════════════════════════ */
  _buildRoadSegments() {
    for (let i = 0; i < ROAD_SEGS; i++) {
      // Lay segments consecutively starting far ahead of player
      const z   = -((ROAD_SEGS - 1 - i) * SEGMENT_LEN);
      const seg = this._createSegment(z);
      this._segments.push(seg);
      this._scene.add(seg);
    }
  }

  /* ── Create one complete road segment group ────────── */
  _createSegment(z) {
    const g = new THREE.Group();
    g.position.z = z;

    // ── Road surface ─────────────────────────────────
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD_WIDTH, SEGMENT_LEN),
      new THREE.MeshLambertMaterial({ color: COLORS.road })
    );
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    g.add(road);

    // ── Lane dashes (centre line) ─────────────────────
    for (let d = -SEGMENT_LEN / 2 + 3; d < SEGMENT_LEN / 2; d += 5) {
      const dash = new THREE.Mesh(
        new THREE.PlaneGeometry(0.12, 2.5),
        new THREE.MeshLambertMaterial({ color: COLORS.roadLine })
      );
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.01, d);
      g.add(dash);
    }

    // ── Curbs ─────────────────────────────────────────
    [-1, 1].forEach(side => {
      const curb = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.18, SEGMENT_LEN),
        new THREE.MeshLambertMaterial({ color: COLORS.curb })
      );
      curb.position.set(side * (ROAD_WIDTH / 2 + 0.175), 0.09, 0);
      g.add(curb);

      // Sidewalk strip
      const walk = new THREE.Mesh(
        new THREE.PlaneGeometry(2.5, SEGMENT_LEN),
        new THREE.MeshLambertMaterial({ color: COLORS.sidewalk })
      );
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(side * (ROAD_WIDTH / 2 + 1.6), 0.001, 0);
      g.add(walk);
    });

    // ── Buildings ─────────────────────────────────────
    [-1, 1].forEach(side => {
      const b = this._makeBuilding(side);
      g.add(b);
    });

    // ── Street decorations ───────────────────────────
    this._addDecorations(g);

    return g;
  }

  /* ── Generate a random Chennai-style building ──────── */
  _makeBuilding(side) {
    const g = new THREE.Group();

    const width  = randFloat(3.5, 7);
    const depth  = randFloat(4,   9);
    const height = randFloat(3.5, 14);
    const color  = randItem(COLORS.buildings);

    // Main body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshLambertMaterial({ color })
    );
    body.position.y = height / 2;
    body.castShadow = true;
    g.add(body);

    // Flat rooftop trim
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.3, 0.25, depth + 0.3),
      new THREE.MeshLambertMaterial({ color: 0xF0E0C8 })
    );
    roof.position.y = height + 0.125;
    g.add(roof);

    // Windows (2 columns × 3 rows)
    const winMat = new THREE.MeshLambertMaterial({
      color: Math.random() < 0.3 ? COLORS.windowLit : COLORS.window
    });
    const winGeo = new THREE.BoxGeometry(0.55, 0.65, 0.05);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        const win = new THREE.Mesh(winGeo, winMat);
        win.position.set(
          (col - 0.5) * 1.2,
          1.2 + row * 1.8,
          depth / 2 + 0.03
        );
        g.add(win);
      }
    }

    // Position the building group to the correct side
    const xOffset = side * (ROAD_WIDTH / 2 + width / 2 + 1.8);
    g.position.set(xOffset, 0, 0);

    return g;
  }

  /* ── Add trees / lamp posts to a segment ───────────── */
  _addDecorations(g) {
    // One decoration per side per segment
    [-1, 1].forEach(side => {
      const x = side * (ROAD_WIDTH / 2 + 0.9);

      // Pick a random z within the segment
      const z = randFloat(-SEGMENT_LEN / 2 + 2, SEGMENT_LEN / 2 - 2);

      // Randomly choose decoration type
      const roll = Math.random();
      if (roll < 0.45) {
        g.add(this._makePalmTree(x, z));
      } else if (roll < 0.70) {
        g.add(this._makeLampPost(x, z));
      } else if (roll < 0.85) {
        g.add(this._makeBanyanTree(x, z));
      }
      // else: no decoration (gap)
    });
  }

  /* ── Palm tree ─────────────────────────────────────── */
  _makePalmTree(x, z) {
    const g = new THREE.Group();

    // Trunk
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.18, 3.5, 6),
      new THREE.MeshLambertMaterial({ color: COLORS.palmTrunk })
    );
    trunk.position.y = 1.75;
    g.add(trunk);

    // Leaf clusters (3 spheroids)
    const leafMat = new THREE.MeshLambertMaterial({ color: COLORS.palmLeaf });
    [[-0.5, 3.7, 0.2], [0.5, 3.6, -0.1], [0, 4.0, 0]].forEach(([lx, ly, lz]) => {
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 6, 5),
        leafMat
      );
      leaf.scale.set(1.2, 0.5, 1.2);
      leaf.position.set(lx, ly, lz);
      g.add(leaf);
    });

    g.position.set(x, 0, z);
    return g;
  }

  /* ── Banyan tree ───────────────────────────────────── */
  _makeBanyanTree(x, z) {
    const g = new THREE.Group();

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.30, 3.2, 7),
      new THREE.MeshLambertMaterial({ color: COLORS.banyanTrunk })
    );
    trunk.position.y = 1.6;
    g.add(trunk);

    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 8, 6),
      new THREE.MeshLambertMaterial({ color: COLORS.banyanLeaf })
    );
    canopy.scale.y = 0.7;
    canopy.position.y = 3.8;
    g.add(canopy);

    g.position.set(x, 0, z);
    return g;
  }

  /* ── Street lamp post ──────────────────────────────── */
  _makeLampPost(x, z) {
    const g = new THREE.Group();

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 4.5, 6),
      new THREE.MeshLambertMaterial({ color: COLORS.lampPost })
    );
    pole.position.y = 2.25;
    g.add(pole);

    // Arm
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.07, 0.07),
      new THREE.MeshLambertMaterial({ color: COLORS.lampPost })
    );
    arm.position.set(0.4, 4.55, 0);
    g.add(arm);

    // Lamp head
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.18, 0.35),
      new THREE.MeshLambertMaterial({ color: COLORS.lampGlow, emissive: 0xFFF9C4, emissiveIntensity: 0.5 })
    );
    lamp.position.set(0.8, 4.46, 0);
    g.add(lamp);

    g.position.set(x, 0, z);
    return g;
  }

  /* ══════════════════════════════════════════════════════
     UPDATE — scroll all segments, recycle when past camera
  ══════════════════════════════════════════════════════ */
  update(delta, speed) {
    const dz = speed * delta; // how far the world moves this frame

    this._segments.forEach(seg => {
      seg.position.z += dz;

      // If segment has passed the camera, recycle it to front
      if (seg.position.z > DESPAWN_Z) {
        // Find the segment currently furthest ahead (lowest Z)
        let minZ = Infinity;
        this._segments.forEach(s => { if (s.position.z < minZ) minZ = s.position.z; });

        seg.position.z = minZ - SEGMENT_LEN;

        // Regenerate content (buildings + decorations)
        this._refreshSegment(seg);
      }
    });
  }

  /* ── Remove old children and rebuild a segment ─────── */
  _refreshSegment(seg) {
    // Remove everything except the first 5 static children
    // (road, lane dashes, left curb, right curb, left sidewalk, right sidewalk)
    // It's simpler to just remove ALL and re-add everything.
    while (seg.children.length > 0) {
      const child = seg.children[0];
      seg.remove(child);
      // Dispose geometries to avoid memory leaks
      if (child.geometry) child.geometry.dispose();
      child.traverse && child.traverse(c => {
        if (c.geometry) c.geometry.dispose();
      });
    }

    // Re-add road surface
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD_WIDTH, SEGMENT_LEN),
      new THREE.MeshLambertMaterial({ color: COLORS.road })
    );
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    seg.add(road);

    // Lane dashes
    for (let d = -SEGMENT_LEN / 2 + 3; d < SEGMENT_LEN / 2; d += 5) {
      const dash = new THREE.Mesh(
        new THREE.PlaneGeometry(0.12, 2.5),
        new THREE.MeshLambertMaterial({ color: COLORS.roadLine })
      );
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.01, d);
      seg.add(dash);
    }

    // Curbs + sidewalks
    [-1, 1].forEach(side => {
      const curb = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.18, SEGMENT_LEN),
        new THREE.MeshLambertMaterial({ color: COLORS.curb })
      );
      curb.position.set(side * (ROAD_WIDTH / 2 + 0.175), 0.09, 0);
      seg.add(curb);

      const walk = new THREE.Mesh(
        new THREE.PlaneGeometry(2.5, SEGMENT_LEN),
        new THREE.MeshLambertMaterial({ color: COLORS.sidewalk })
      );
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(side * (ROAD_WIDTH / 2 + 1.6), 0.001, 0);
      seg.add(walk);

      seg.add(this._makeBuilding(side));
    });

    this._addDecorations(seg);
  }

  /* ── Reset all segments to initial positions ────────── */
  reset() {
    this._segments.forEach((seg, i) => {
      seg.position.z = -((ROAD_SEGS - 1 - i) * SEGMENT_LEN);
      this._refreshSegment(seg);
    });
  }
}
