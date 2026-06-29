/**
 * ui.js — HUD & Overlay Manager
 * Chennai Rush
 *
 * Manages all DOM overlays:
 *   • Loading screen
 *   • Main menu (with best score)
 *   • In-game HUD (score, coins, distance, speed bar)
 *   • Game over screen (stats, new record badge)
 *
 * Also provides:
 *   • screenShake() — camera shake on collision
 *   • scorePopup()  — bump animation on score change
 */

'use strict';

class UIManager {
  constructor() {
    /* ── Grab all DOM element references once ─────── */
    this.els = {
      loading:       document.getElementById('loading-overlay'),
      loadingBar:    document.getElementById('loading-bar'),
      loadingTip:    document.getElementById('loading-tip'),

      menu:          document.getElementById('menu-overlay'),
      menuBest:      document.getElementById('menu-best-val'),

      hud:           document.getElementById('hud-overlay'),
      hudScore:      document.getElementById('hud-score'),
      hudCoins:      document.getElementById('hud-coin-count'),
      hudDist:       document.getElementById('hud-dist-count'),
      speedBar:      document.getElementById('speed-bar'),

      gameover:      document.getElementById('gameover-overlay'),
      goScore:       document.getElementById('go-score'),
      goBest:        document.getElementById('go-best'),
      goCoins:       document.getElementById('go-coins'),
      goDist:        document.getElementById('go-dist'),
      goNewRecord:   document.getElementById('go-new-record'),

      btnPlay:       document.getElementById('btn-play'),
      btnRestart:    document.getElementById('btn-restart'),
      btnToMenu:     document.getElementById('btn-to-menu'),
      btnSound:      document.getElementById('btn-sound'),
    };

    this._lastScore  = 0;
    this._shakeTimer = 0;
    this._camera     = null; // Set by main.js after creation
  }

  /* ─── Provide camera reference for screen shake ───── */
  setCamera(camera) {
    this._camera       = camera;
    this._camBasePos   = camera.position.clone();
  }

  /* ══════════════════════════════════════════════════════
     LOADING
  ══════════════════════════════════════════════════════ */

  /** Animate the loading bar from 0 → 100% over `ms` ms */
  animateLoading(ms = 1800) {
    return new Promise(resolve => {
      const bar = this.els.loadingBar;
      const tips = [
        'Tip: Swipe UP to jump over obstacles!',
        'Tip: Coins give 50 bonus points each.',
        'Tip: Speed increases every 500m — stay sharp!',
        'Tip: Sacred cows cannot be moved. Only dodged!',
        'Tip: Try to reach 10,000 points. Superstar!',
      ];
      let tipIdx = 0;
      const tipInterval = setInterval(() => {
        tipIdx = (tipIdx + 1) % tips.length;
        if (this.els.loadingTip) this.els.loadingTip.textContent = tips[tipIdx];
      }, 900);

      let pct = 0;
      const step = () => {
        pct += randFloat(4, 12);
        if (pct >= 100) {
          pct = 100;
          bar.style.width = '100%';
          clearInterval(tipInterval);
          setTimeout(resolve, 280);
          return;
        }
        bar.style.width = pct + '%';
        setTimeout(step, ms / 15);
      };
      step();
    });
  }

  hideLoading() {
    this.els.loading.style.opacity = '0';
    this.els.loading.style.transition = 'opacity 0.5s ease';
    setTimeout(() => this.els.loading.classList.add('hidden'), 520);
  }

  /* ══════════════════════════════════════════════════════
     MENU
  ══════════════════════════════════════════════════════ */
  showMenu(highScore) {
    this.els.menu.classList.remove('hidden');
    if (this.els.menuBest) {
      this.els.menuBest.textContent = Math.floor(highScore).toLocaleString();
    }
  }

  hideMenu() {
    this.els.menu.style.opacity = '0';
    this.els.menu.style.transition = 'opacity 0.35s ease';
    setTimeout(() => {
      this.els.menu.classList.add('hidden');
      this.els.menu.style.opacity = '';
      this.els.menu.style.transition = '';
    }, 360);
  }

  /* ══════════════════════════════════════════════════════
     HUD
  ══════════════════════════════════════════════════════ */
  showHUD() { this.els.hud.classList.remove('hidden'); }
  hideHUD() { this.els.hud.classList.add('hidden'); }

  updateScore(score) {
    const rounded = Math.floor(score);
    if (this.els.hudScore) {
      this.els.hudScore.textContent = rounded.toLocaleString();

      // Bump animation every ~200 points
      if (Math.floor(score / 200) > Math.floor(this._lastScore / 200)) {
        this.els.hudScore.classList.remove('bump');
        // Force reflow
        void this.els.hudScore.offsetWidth;
        this.els.hudScore.classList.add('bump');
      }
    }
    this._lastScore = score;
  }

  updateCoins(count) {
    if (this.els.hudCoins) this.els.hudCoins.textContent = count;
  }

  updateDistance(dist) {
    if (this.els.hudDist) this.els.hudDist.textContent = dist;
  }

  updateSpeedBar(fraction) {
    if (this.els.speedBar) {
      this.els.speedBar.style.width = clamp(fraction * 100, 4, 100) + '%';
    }
  }

  /* ══════════════════════════════════════════════════════
     GAME OVER
  ══════════════════════════════════════════════════════ */
  showGameOver(score, highScore, coins, distance, newRecord) {
    const fmt = n => Math.floor(n).toLocaleString();
    if (this.els.goScore) this.els.goScore.textContent = fmt(score);
    if (this.els.goBest)  this.els.goBest.textContent  = fmt(highScore);
    if (this.els.goCoins) this.els.goCoins.textContent  = coins;
    if (this.els.goDist)  this.els.goDist.textContent   = distance;

    if (this.els.goNewRecord) {
      this.els.goNewRecord.classList.toggle('hidden', !newRecord);
    }

    this.els.gameover.classList.remove('hidden');
  }

  hideGameOver() {
    this.els.gameover.style.opacity = '0';
    this.els.gameover.style.transition = 'opacity 0.3s ease';
    setTimeout(() => {
      this.els.gameover.classList.add('hidden');
      this.els.gameover.style.opacity = '';
      this.els.gameover.style.transition = '';
    }, 320);
  }

  /* ══════════════════════════════════════════════════════
     EFFECTS
  ══════════════════════════════════════════════════════ */

  /** Camera shake for 0.4 s on obstacle collision */
  screenShake() {
    this._shakeTimer = 0.40;
  }

  /** Call this in the main game loop to apply shake */
  updateEffects(delta) {
    if (this._shakeTimer > 0 && this._camera && this._camBasePos) {
      this._shakeTimer -= delta;
      const intensity = this._shakeTimer * 0.18;
      this._camera.position.x = this._camBasePos.x + (Math.random() - 0.5) * intensity;
      this._camera.position.y = this._camBasePos.y + (Math.random() - 0.5) * intensity * 0.5;
      if (this._shakeTimer <= 0) {
        this._camera.position.copy(this._camBasePos);
        this._shakeTimer = 0;
      }
    }
  }

  /** Toggle sound icon between 🔊 and 🔇 */
  setSoundIcon(enabled) {
    if (this.els.btnSound) {
      this.els.btnSound.textContent = enabled ? '🔊' : '🔇';
    }
  }
}
