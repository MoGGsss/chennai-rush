/**
 * audio.js — Procedural Sound Effects via Web Audio API
 * Chennai Rush
 *
 * No external audio files needed. All sounds are synthesised
 * in real-time using oscillators, noise buffers, and envelopes.
 */

'use strict';

class AudioManager {
  constructor() {
    this.ctx          = null;   // AudioContext
    this.masterGain   = null;
    this.bgGain       = null;
    this.bgTimer      = null;
    this.enabled      = true;
    this.bgRunning    = false;
  }

  /* ── Initialise (call once after first user gesture) ── */
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.6;
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('[Audio] Web Audio API not supported:', e);
      this.enabled = false;
    }
  }

  /* ── Resume context (browsers require user gesture first) ── */
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /* ── Internal: wire gain → master ─────────────────────── */
  _connect(node) {
    node.connect(this.masterGain);
  }

  /* ══════════════════════════════════════════════════════
     JUMP — upward frequency sweep
  ══════════════════════════════════════════════════════ */
  playJump() {
    if (!this.enabled || !this.ctx) return;
    const t   = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g   = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(700, t + 0.12);

    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(g);
    this._connect(g);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  /* ══════════════════════════════════════════════════════
     COIN COLLECT — ascending C-E-G chime
  ══════════════════════════════════════════════════════ */
  playCoin() {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    [523, 659, 784].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const g   = this.ctx.createGain();
      const st  = t + i * 0.07;

      osc.type          = 'sine';
      osc.frequency.value = freq;

      g.gain.setValueAtTime(0.22, st);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.18);

      osc.connect(g);
      this._connect(g);
      osc.start(st);
      osc.stop(st + 0.18);
    });
  }

  /* ══════════════════════════════════════════════════════
     CRASH — noise burst + low thud
  ══════════════════════════════════════════════════════ */
  playCrash() {
    if (!this.enabled || !this.ctx) return;
    const t  = this.ctx.currentTime;
    const sr = this.ctx.sampleRate;

    // White noise burst
    const bufLen = sr * 0.35;
    const buf    = this.ctx.createBuffer(1, bufLen, sr);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 1.5);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const ng = this.ctx.createGain();
    ng.gain.value = 0.9;
    src.connect(ng);
    this._connect(ng);
    src.start(t);

    // Low bass thud
    const osc = this.ctx.createOscillator();
    const og  = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.4);
    og.gain.setValueAtTime(0.7, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(og);
    this._connect(og);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  /* ══════════════════════════════════════════════════════
     BACKGROUND MUSIC — looping rhythmic beat
     Simple triangle-wave pattern inspired by Chennai
     street percussion.
  ══════════════════════════════════════════════════════ */
  startBackground() {
    if (!this.enabled || !this.ctx || this.bgRunning) return;
    this.bgRunning = true;

    this.bgGain = this.ctx.createGain();
    this.bgGain.gain.value = 0.07;
    this.bgGain.connect(this.masterGain);

    // Beat pattern: root, fifth, octave, flat-seven
    const pattern = [220, 330, 440, 385, 220, 330, 277, 330];
    let step = 0;

    const tick = () => {
      if (!this.bgRunning) return;

      const note = pattern[step % pattern.length];
      step++;

      const osc = this.ctx.createOscillator();
      const g   = this.ctx.createGain();
      osc.type  = 'triangle';
      osc.frequency.value = note;

      const now = this.ctx.currentTime;
      g.gain.setValueAtTime(0.6, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(g);
      g.connect(this.bgGain);
      osc.start(now);
      osc.stop(now + 0.3);

      // Add occasional hi-hat style click on beats 1 & 3
      if (step % 4 === 1) {
        const n2  = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.04, this.ctx.sampleRate);
        const d2  = n2.getChannelData(0);
        for (let i = 0; i < d2.length; i++) d2[i] = (Math.random() * 2 - 1) * (1 - i / d2.length);
        const s2 = this.ctx.createBufferSource();
        s2.buffer = n2;
        const hg = this.ctx.createGain();
        hg.gain.value = 0.12;
        s2.connect(hg);
        hg.connect(this.bgGain);
        s2.start(now);
      }

      this.bgTimer = setTimeout(tick, 320); // ~188 BPM
    };

    tick();
  }

  stopBackground() {
    this.bgRunning = false;
    clearTimeout(this.bgTimer);
    if (this.bgGain) {
      try { this.bgGain.disconnect(); } catch(e) {}
      this.bgGain = null;
    }
  }

  /* ── Increase BPM as speed rises ─────────────────────── */
  setSpeedFactor(factor) {
    // For now just adjust master volume slightly; BPM change
    // would require restarting the loop — keep it simple.
    if (!this.masterGain) return;
    this.masterGain.gain.value = clamp(0.6 + factor * 0.15, 0.6, 0.9);
  }

  /* ── Toggle mute ──────────────────────────────────────── */
  toggle() {
    if (!this.masterGain) return this.enabled;
    this.enabled = !this.enabled;
    this.masterGain.gain.value = this.enabled ? 0.6 : 0;
    return this.enabled; // returns new state
  }
}
