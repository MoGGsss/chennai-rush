/**
 * utils.js — Game Constants, Object Pool & Math Helpers
 * Chennai Rush
 *
 * All constants and shared utilities live here so other files
 * only need to reference one place. No imports needed — these
 * are global since they are loaded as regular <script> tags.
 */

'use strict';

/* ══════════════════════════════════════════════════════
   LANE CONFIG
══════════════════════════════════════════════════════ */
const LANES       = [-2.8, 0, 2.8];   // X-positions: Left, Center, Right
const LANE_LEFT   = 0;
const LANE_CENTER = 1;
const LANE_RIGHT  = 2;
const LANE_LERP   = 12;               // Lane-switch interpolation speed

/* ══════════════════════════════════════════════════════
   PHYSICS
══════════════════════════════════════════════════════ */
const GRAVITY     = 28;   // Downward acceleration (units/s²)
const JUMP_FORCE  = 11.5; // Initial upward velocity when jumping
const GROUND_Y    = 0.9;  // Player centre height while on ground

/* ══════════════════════════════════════════════════════
   WORLD
══════════════════════════════════════════════════════ */
const SEGMENT_LEN  = 30;   // Length of one road tile (Z axis)
const ROAD_SEGS    = 14;   // Number of road tiles in recycle pool
const ROAD_WIDTH   = 9;    // Road width (X axis)

/* ══════════════════════════════════════════════════════
   GAME SPEED
══════════════════════════════════════════════════════ */
const SPEED_INIT   = 14;   // Starting world speed (units/s)
const SPEED_MAX    = 40;   // Hard cap
const SPEED_RAMP   = 0.55; // Speed added per second (slowly accelerates)
const SCORE_RATE   = 10;   // Score points per second while alive

/* ══════════════════════════════════════════════════════
   SPAWN / DESPAWN THRESHOLDS
══════════════════════════════════════════════════════ */
const SPAWN_Z    = -155;  // Z where new obstacles/coins appear (far ahead)
const DESPAWN_Z  =  25;   // Z where they are recycled (behind camera)

/* ══════════════════════════════════════════════════════
   CHENNAI COLOR PALETTE
══════════════════════════════════════════════════════ */
const COLORS = {
  // ── Road & Ground ──────────────────────────────
  road:          0x3C3C4E,
  roadLine:      0xFFFF88,
  curb:          0xBBAA88,
  sidewalk:      0xC9BA98,
  ground:        0x9A7D50,
  groundFar:     0x87704A,

  // ── Sky (warm Chennai dusk) ─────────────────────
  skyTop:        0xFF6B35,
  skyBottom:     0xFF8C00,
  fog:           0xFF7A40,

  // ── Buildings (terracotta, cream, teal, ochre) ──
  buildings: [
    0xE8956D,  // terracotta
    0xF5E6C8,  // cream
    0x4AADAC,  // teal
    0xD4845A,  // dark terracotta
    0x8BC8C8,  // light teal
    0xE6B85C,  // ochre
    0xFF7043,  // deep orange
    0x80CBC4,  // soft teal
    0xFFCC80,  // peach
    0xCE93D8,  // lavender
    0xB0BEC5,  // blue-grey
    0xA5D6A7,  // soft green
  ],

  // ── Window tint (on buildings) ─────────────────
  window:        0x1A2A3A,
  windowLit:     0xFFF9C4,

  // ── Player ─────────────────────────────────────
  skin:          0xD4956A,
  shirt:         0xFF6B35,
  pants:         0x1A237E,
  shoes:         0x1A1A1A,
  hair:          0x1A0A00,

  // ── Obstacles ──────────────────────────────────
  rickshawBody:  0xFFD700,
  rickshawRoof:  0xFF9800,
  rickshawWheel: 0x222222,
  cartBody:      0xA0522D,
  cartCanopy:    0xFF5252,
  barrierRed:    0xFF2222,
  barrierWhite:  0xFFFFFF,
  pothole:       0x252535,
  potholeRim:    0x444455,
  cowBody:       0xF5DEB3,
  cowSpot:       0x888877,

  // ── Coins ──────────────────────────────────────
  coin:          0xFFD700,
  coinEdge:      0xC8A000,
  coinShine:     0xFFFDE7,

  // ── Nature / Street ────────────────────────────
  palmTrunk:     0x8D6E4F,
  palmLeaf:      0x2E7D52,
  banyanTrunk:   0x795548,
  banyanLeaf:    0x33691E,
  lampPost:      0x546E7A,
  lampGlow:      0xFFF9C4,
};

/* ══════════════════════════════════════════════════════
   OBJECT POOL
   Recycles Three.js Groups/Meshes to avoid GC pressure.
══════════════════════════════════════════════════════ */
class ObjectPool {
  /**
   * @param {Function} createFn  — Factory: returns a new object
   * @param {Function} resetFn   — Called before re-issuing an object
   * @param {number}   maxSize   — Hard cap to prevent runaway allocation
   */
  constructor(createFn, resetFn, maxSize = 30) {
    this.createFn = createFn;
    this.resetFn  = resetFn  || (() => {});
    this.dormant  = [];          // Objects waiting to be reused
    this.active   = new Set();   // Currently in the scene
    this.maxSize  = maxSize;
  }

  /** Retrieve an object (from pool or freshly created) */
  get(...args) {
    let obj = this.dormant.pop();
    if (!obj) {
      if (this.active.size >= this.maxSize) return null; // Pool exhausted
      obj = this.createFn();
    }
    this.resetFn(obj, ...args);
    this.active.add(obj);
    return obj;
  }

  /** Return an object to the dormant pool */
  release(obj) {
    if (this.active.has(obj)) {
      this.active.delete(obj);
      this.dormant.push(obj);
    }
  }

  /** Release all active objects at once (e.g., on game reset) */
  releaseAll() {
    this.active.forEach(o => this.dormant.push(o));
    this.active.clear();
  }

  /** Iterate over every active object */
  forEach(fn) { this.active.forEach(fn); }

  get size() { return this.active.size; }
}

/* ══════════════════════════════════════════════════════
   MATH HELPERS
══════════════════════════════════════════════════════ */
function lerp(a, b, t)     { return a + (b - a) * t; }
function clamp(v, lo, hi)  { return Math.max(lo, Math.min(hi, v)); }
function randInt(lo, hi)   { return Math.floor(Math.random() * (hi - lo + 1)) + lo; }
function randFloat(lo, hi) { return Math.random() * (hi - lo) + lo; }
function randItem(arr)     { return arr[Math.floor(Math.random() * arr.length)]; }
function randSign()        { return Math.random() < 0.5 ? -1 : 1; }
