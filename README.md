# 🛺 Chennai Rush — Endless Runner

> *"Survive the streets of Namma Chennai!"*

A browser-based 3D endless runner built with **HTML · CSS · JavaScript · Three.js**.  
No build tools, no npm, no compilation — just open and play.

---

## 📁 Project Structure

```
chennai-rush/
├── index.html              ← Entry point (all HTML overlays)
├── start-server.bat        ← One-click local server (Python)
├── css/
│   └── style.css           ← All UI styles (menu, HUD, game over)
└── js/
    ├── utils.js            ← Constants, ObjectPool, math helpers
    ├── audio.js            ← Procedural Web Audio sound effects
    ├── input.js            ← Keyboard + touch/swipe controls
    ├── game.js             ← State machine + score/speed tracking
    ├── player.js           ← Low-poly character, lanes, jump physics
    ├── world.js            ← Road tiles, buildings, trees, lamps
    ├── obstacles.js        ← Rickshaws, carts, cows, barriers, potholes
    ├── coins.js            ← Spinning coins, 3 spawn patterns
    ├── ui.js               ← HUD, overlays, screen shake
    └── main.js             ← Three.js setup, game loop, orchestration
```

---

## 🚀 How to Run

### Option A — Python server (recommended)
```
Double-click start-server.bat
```
Then open **http://localhost:8080** in Chrome or Edge.

### Option B — VS Code Live Server
Install the **Live Server** extension → Right-click `index.html` → *Open with Live Server*

### Option C — Direct file (may work in Chrome)
```
Open D:\chennai-rush\index.html directly in Chrome
```
> ⚠️ Some browsers block local ES module loading from `file://`. Use Option A or B for best results.

---

## 🎮 Controls

| Action        | Keyboard              | Mobile      |
|---------------|-----------------------|-------------|
| Move Left     | `←` or `A`           | Swipe Left  |
| Move Right    | `→` or `D`           | Swipe Right |
| Jump          | `Space` or `↑` or `W`| Swipe Up / Tap |

---

## 🏆 Scoring

| Event          | Points        |
|----------------|---------------|
| Running (time) | 10 / second   |
| Coin collected | +50 bonus     |
| High score     | Saved in localStorage |

---

## 🎨 Features

- ✅ 3D low-poly world scrolling at 60 FPS
- ✅ 3-lane movement with smooth LERP
- ✅ Parabolic jump with gravity
- ✅ Running animation (leg/arm swing)
- ✅ 5 obstacle types: rickshaw, cart, cow, barrier, pothole
- ✅ 3 coin patterns: line, arc, zigzag
- ✅ Coin sparkle particles on collection
- ✅ Screen shake on crash
- ✅ Camera drift follows player lane
- ✅ Procedural buildings (Chennai palette)
- ✅ Palm trees, banyan trees, street lamps
- ✅ Web Audio API sounds (no files needed)
- ✅ Speed increases over time
- ✅ High score persisted across sessions
- ✅ Mobile touch / swipe controls
- ✅ Responsive for all screen sizes

---

## 🛠 Tech Stack

| Layer       | Technology                            |
|-------------|---------------------------------------|
| Rendering   | Three.js r160 (CDN)                   |
| Shaders     | MeshLambertMaterial (fast, low-poly)  |
| Audio       | Web Audio API (procedural synthesis)  |
| Storage     | localStorage (high score)             |
| Fonts       | Google Fonts — Rajdhani + Poppins     |
| Build       | None — vanilla scripts                |

---

*Built with ❤️ in Chennai style.*

## Git Practice Session

## practice content 
