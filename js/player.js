/**
 * player.js — Player Character: Mesh, Lane Movement & Jump Physics
 * Chennai Rush
 *
 * The player is a low-poly humanoid made from THREE.js primitives:
 *   Head (sphere) + Body (box) + Arms (boxes) + Legs (boxes)
 *
 * Movement model:
 *   • X axis — lane switching with smooth LERP
 *   • Y axis — parabolic jump using gravity constant
 *   • Z axis — stationary (world scrolls past)
 *
 * Running animation: legs/arms oscillate based on run timer.
 */

'use strict';

class Player {
  constructor(scene) {
    this._scene       = scene;
    this.group        = new THREE.Group();

    // Lane state
    this.lane         = LANE_CENTER; // 0=left 1=center 2=right
    this.targetX      = LANES[LANE_CENTER];
    this.posX         = LANES[LANE_CENTER];

    // Vertical state
    this.posY         = GROUND_Y;
    this.velY         = 0;
    this.isJumping    = false;

    // Animation
    this._runTime     = 0;
    this._landShake   = 0; // brief squash on landing

    // Body part refs for animation
    this._parts       = {};

    // Collision box (updated each frame)
    this._box         = new THREE.Box3();

    this._build();
    scene.add(this.group);
  }

  /* ══════════════════════════════════════════════════════
     MESH CONSTRUCTION
  ══════════════════════════════════════════════════════ */
  _build() {
    const M = (geo, color, rough = 0.85) =>
      new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color }));

    // ── Hair / head ──────────────────────────────────
    const hair = M(new THREE.SphereGeometry(0.30, 7, 6), COLORS.hair);
    hair.position.set(0, 1.62, 0);
    hair.scale.y = 0.85;
    this.group.add(hair);

    const head = M(new THREE.SphereGeometry(0.26, 8, 7), COLORS.skin);
    head.position.set(0, 1.55, 0);
    this.group.add(head);

    // ── Body (torso) ─────────────────────────────────
    const torso = M(new THREE.BoxGeometry(0.5, 0.55, 0.28), COLORS.shirt);
    torso.position.set(0, 1.10, 0);
    this.group.add(torso);
    this._parts.torso = torso;

    // ── Belt ─────────────────────────────────────────
    const belt = M(new THREE.BoxGeometry(0.52, 0.08, 0.30), 0x222222);
    belt.position.set(0, 0.83, 0);
    this.group.add(belt);

    // ── Upper arms ───────────────────────────────────
    const armGeo = new THREE.BoxGeometry(0.14, 0.38, 0.14);

    const lArm = M(armGeo, COLORS.shirt);
    lArm.position.set(-0.34, 1.10, 0);
    this.group.add(lArm);
    this._parts.lArm = lArm;

    const rArm = M(armGeo, COLORS.shirt);
    rArm.position.set( 0.34, 1.10, 0);
    this.group.add(rArm);
    this._parts.rArm = rArm;

    // ── Hands ─────────────────────────────────────────
    const handGeo = new THREE.SphereGeometry(0.09, 5, 4);
    const lHand = M(handGeo, COLORS.skin);
    lHand.position.set(-0.34, 0.88, 0);
    this.group.add(lHand);
    this._parts.lHand = lHand;

    const rHand = M(handGeo, COLORS.skin);
    rHand.position.set( 0.34, 0.88, 0);
    this.group.add(rHand);
    this._parts.rHand = rHand;

    // ── Hips ─────────────────────────────────────────
    const hips = M(new THREE.BoxGeometry(0.46, 0.22, 0.26), COLORS.pants);
    hips.position.set(0, 0.76, 0);
    this.group.add(hips);

    // ── Legs ─────────────────────────────────────────
    const legGeo = new THREE.BoxGeometry(0.18, 0.44, 0.18);

    const lLeg = M(legGeo, COLORS.pants);
    lLeg.position.set(-0.14, 0.48, 0);
    this.group.add(lLeg);
    this._parts.lLeg = lLeg;

    const rLeg = M(legGeo, COLORS.pants);
    rLeg.position.set( 0.14, 0.48, 0);
    this.group.add(rLeg);
    this._parts.rLeg = rLeg;

    // ── Shoes ─────────────────────────────────────────
    const shoeGeo = new THREE.BoxGeometry(0.20, 0.12, 0.26);

    const lShoe = M(shoeGeo, COLORS.shoes);
    lShoe.position.set(-0.14, 0.22, 0.04);
    this.group.add(lShoe);
    this._parts.lShoe = lShoe;

    const rShoe = M(shoeGeo, COLORS.shoes);
    rShoe.position.set( 0.14, 0.22, 0.04);
    this.group.add(rShoe);
    this._parts.rShoe = rShoe;

    // Position the whole group
    this.group.position.set(this.posX, this.posY, 0);

    // Cast shadows
    this.group.traverse(c => {
      if (c.isMesh) { c.castShadow = true; }
    });
  }

  /* ══════════════════════════════════════════════════════
     CONTROLS
  ══════════════════════════════════════════════════════ */
  moveLeft() {
    if (this.lane > LANE_LEFT) {
      this.lane--;
      this.targetX = LANES[this.lane];
      this._tiltBody(-0.25);
    }
  }

  moveRight() {
    if (this.lane < LANE_RIGHT) {
      this.lane++;
      this.targetX = LANES[this.lane];
      this._tiltBody(0.25);
    }
  }

  jump() {
    if (!this.isJumping) {
      this.isJumping = true;
      this.velY      = JUMP_FORCE;
    }
  }

  /* Briefly tilt torso on lane change for feel */
  _tiltBody(angle) {
    if (!this._parts.torso) return;
    this._parts.torso.rotation.z = angle;
    setTimeout(() => {
      if (this._parts.torso) this._parts.torso.rotation.z = 0;
    }, 200);
  }

  /* ══════════════════════════════════════════════════════
     UPDATE (called each frame)
  ══════════════════════════════════════════════════════ */
  update(delta) {
    // ── Lane LERP ───────────────────────────────────
    this.posX = lerp(this.posX, this.targetX, LANE_LERP * delta);

    // ── Jump / gravity ───────────────────────────────
    if (this.isJumping) {
      this.velY  -= GRAVITY * delta;
      this.posY  += this.velY * delta;

      if (this.posY <= GROUND_Y) {
        this.posY      = GROUND_Y;
        this.velY      = 0;
        this.isJumping = false;
        this._landShake = 0.1; // Trigger landing squash
      }
    }

    // Landing squash/stretch
    if (this._landShake > 0) {
      this._landShake -= delta * 3;
      const sq = 1 + this._landShake;
      this.group.scale.set(sq, 2 - sq, sq);
    } else {
      this.group.scale.set(1, 1, 1);
      this._landShake = 0;
    }

    // ── Apply position ────────────────────────────────
    this.group.position.set(this.posX, this.posY - GROUND_Y, 0);

    // ── Running animation ─────────────────────────────
    this._runTime += delta * 8; // animation speed
    const sw = Math.sin(this._runTime);

    // Leg swing (opposite phase)
    if (this._parts.lLeg) {
      this._parts.lLeg.position.z  =  sw * 0.12;
      this._parts.lShoe.position.z =  sw * 0.12 + 0.04;
      this._parts.rLeg.position.z  = -sw * 0.12;
      this._parts.rShoe.position.z = -sw * 0.12 + 0.04;
    }

    // Arm swing (opposite to legs)
    if (this._parts.lArm) {
      this._parts.lArm.position.z  = -sw * 0.10;
      this._parts.lHand.position.z = -sw * 0.10;
      this._parts.rArm.position.z  =  sw * 0.10;
      this._parts.rHand.position.z =  sw * 0.10;
    }

    // Torso bob
    if (this._parts.torso) {
      this._parts.torso.position.y = 1.10 + Math.abs(sw) * 0.02;
    }
  }

  /* ══════════════════════════════════════════════════════
     COLLISION
  ══════════════════════════════════════════════════════ */
  getBox() {
    // Slightly smaller than full mesh for forgiving gameplay
    const cx = this.group.position.x;
    const cy = this.posY;
    const cz = this.group.position.z;
    this._box.setFromCenterAndSize(
      new THREE.Vector3(cx, cy + 0.6, cz),
      new THREE.Vector3(0.55, 1.4, 0.5)
    );
    return this._box;
  }

  /* ══════════════════════════════════════════════════════
     RESET (on restart)
  ══════════════════════════════════════════════════════ */
  reset() {
    this.lane      = LANE_CENTER;
    this.targetX   = LANES[LANE_CENTER];
    this.posX      = LANES[LANE_CENTER];
    this.posY      = GROUND_Y;
    this.velY      = 0;
    this.isJumping = false;
    this._runTime  = 0;
    this._landShake = 0;
    this.group.position.set(this.posX, 0, 0);
    this.group.scale.set(1, 1, 1);
    if (this._parts.torso) this._parts.torso.rotation.z = 0;
  }
}
