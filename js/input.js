/**
 * input.js — Keyboard & Touch/Swipe Input Handler
 * Chennai Rush
 *
 * Listens for keyboard events (arrows, WASD, space)
 * and touch swipe gestures. Fires callbacks registered
 * via InputHandler.on(event, callback).
 *
 * Events emitted:
 *   'left'  — move to left lane
 *   'right' — move to right lane
 *   'jump'  — jump
 */

'use strict';

class InputHandler {
  constructor() {
    this._callbacks = { left: [], right: [], jump: [] };

    // Touch tracking
    this._touchStartX = 0;
    this._touchStartY = 0;
    this._touchStartTime = 0;

    this._active = false; // Only fire when game is active

    this._initKeyboard();
    this._initTouch();
  }

  /* ── Register a callback for an event ─────────────────── */
  on(event, fn) {
    if (this._callbacks[event]) {
      this._callbacks[event].push(fn);
    }
  }

  /* ── Enable / disable input (e.g., on menu) ───────────── */
  setActive(val) { this._active = val; }

  /* ── Fire all callbacks for an event ──────────────────── */
  _emit(event) {
    if (!this._active) return;
    (this._callbacks[event] || []).forEach(fn => fn());
  }

  /* ══════════════════════════════════════════════════════
     KEYBOARD
  ══════════════════════════════════════════════════════ */
  _initKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Prevent browser scroll on arrow/space keys
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this._emit('left');
          break;

        case 'ArrowRight':
        case 'd':
        case 'D':
          this._emit('right');
          break;

        case 'ArrowUp':
        case 'w':
        case 'W':
        case ' ':          // Space bar
          this._emit('jump');
          break;
      }
    });
  }

  /* ══════════════════════════════════════════════════════
     TOUCH / SWIPE
     We detect swipe direction based on displacement from
     touchstart to touchend. A minimum threshold avoids
     accidental triggers on taps.
  ══════════════════════════════════════════════════════ */
  _initTouch() {
    const canvas = document.getElementById('game-canvas');

    canvas.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      this._touchStartX    = t.clientX;
      this._touchStartY    = t.clientY;
      this._touchStartTime = Date.now();
      e.preventDefault(); // prevent scroll
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      const t  = e.changedTouches[0];
      const dx = t.clientX - this._touchStartX;
      const dy = t.clientY - this._touchStartY;
      const dt = Date.now() - this._touchStartTime;

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Minimum swipe distance (px) — avoids accidental taps
      const MIN_SWIPE = 35;

      if (absDx < MIN_SWIPE && absDy < MIN_SWIPE) {
        // Treat as tap → jump
        if (dt < 250) this._emit('jump');
        return;
      }

      if (absDx > absDy) {
        // Horizontal swipe
        if (dx < 0) this._emit('left');
        else        this._emit('right');
      } else {
        // Vertical swipe
        if (dy < 0) this._emit('jump');  // swipe up
        // swipe down — unused for now
      }

      e.preventDefault();
    }, { passive: false });

    // Prevent context menu on long-press
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }
}
