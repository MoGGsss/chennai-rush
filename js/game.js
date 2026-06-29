/**
 * game.js — Game State Machine + Score / Speed Tracking
 * Chennai Rush
 *
 * GameManager is the single source of truth for:
 *  - Current state (MENU / PLAYING / GAMEOVER)
 *  - Score, coins, distance, speed
 *  - High score (persisted in localStorage)
 */

'use strict';

/* ── State constants ──────────────────────────────────── */
const STATE = Object.freeze({
  MENU:     'MENU',
  PLAYING:  'PLAYING',
  GAMEOVER: 'GAMEOVER',
});

class GameManager {
  constructor() {
    this.state      = STATE.MENU;
    this.score      = 0;
    this.coins      = 0;
    this.distance   = 0;    // metres
    this.speed      = SPEED_INIT;
    this.highScore  = parseInt(localStorage.getItem('cr_highscore') || '0', 10);
    this.newRecord  = false;

    // Running time used to drive speed ramp
    this._elapsed   = 0;
  }

  /* ─── Transition to PLAYING ────────────────────────── */
  start() {
    this._reset();
    this.state = STATE.PLAYING;
  }

  /* ─── Transition to GAMEOVER ───────────────────────── */
  gameOver() {
    if (this.state !== STATE.PLAYING) return;
    this.state = STATE.GAMEOVER;

    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.newRecord = true;
      localStorage.setItem('cr_highscore', this.highScore);
    } else {
      this.newRecord = false;
    }
  }

  /* ─── Reset all live values ─────────────────────────── */
  _reset() {
    this.score    = 0;
    this.coins    = 0;
    this.distance = 0;
    this.speed    = SPEED_INIT;
    this._elapsed = 0;
    this.newRecord = false;
  }

  /* ─── Called each frame while PLAYING ──────────────── */
  update(delta) {
    if (this.state !== STATE.PLAYING) return;

    this._elapsed += delta;

    // Accumulate score over time
    this.score += SCORE_RATE * delta;

    // Distance in metres (world units ≈ metres at this scale)
    this.distance += this.speed * delta;

    // Gradually ramp up speed over time (logarithmic feel)
    this.speed = Math.min(
      SPEED_MAX,
      SPEED_INIT + this._elapsed * SPEED_RAMP
    );
  }

  /* ─── Add a collected coin ──────────────────────────── */
  addCoin() {
    this.coins++;
    this.score += 50; // Bonus per coin
  }

  /* ─── Formatted distance string ─────────────────────── */
  get distanceStr() {
    return `${Math.floor(this.distance)}m`;
  }

  /* ─── 0–1 speed progress for UI bar ─────────────────── */
  get speedFraction() {
    return clamp((this.speed - SPEED_INIT) / (SPEED_MAX - SPEED_INIT), 0, 1);
  }
}
