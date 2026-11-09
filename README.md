# CyberArcade 3D — HTML5 & Three.js WebGL Games

A modern, high-performance 3D WebGL arcade platform built with Three.js, HTML5, and Vite. Instant-play directly in any modern desktop or mobile browser without installation.

Live URL: [https://games.asepsulaeman.com](https://games.asepsulaeman.com)

---

## 🎮 Included Games

### 1. Cyber Runner 3D
* **Genre**: Endless 3D Sci-Fi Runner
* **Description**: Pilot a neon speeder through a high-speed hyperspace tunnel. Dodge laser barriers and spinning spikes while collecting energy crystals. Speed accelerates dynamically over time.
* **Controls**:
  * Desktop: `A` / `D` or `←` / `→` to switch lanes, `Space` / `↑` to Jump, `P` or `Esc` to Pause.
  * Mobile: Swipe Left/Right to steer, Swipe Up to jump.

### 2. Neon Tower Stacker
* **Genre**: Isometric 3D Precision Stacking
* **Description**: Stack shifting colored blocks into the stratosphere. Blocks that overhang the tower are sliced off with realistic 3D gravity physics. Score perfect placements to build combo multipliers and expand your tower!
* **Controls**:
  * Desktop: `Space` or Click anywhere to drop block, `P` or `Esc` to Pause.
  * Mobile: Tap anywhere on screen to place block.

### 3. Cosmic Marble 3D
* **Genre**: 3D Physics Balance / Relic Maze
* **Description**: Guide a cosmic sphere across floating platforms in deep space. Real-time momentum, roll rotation, and friction physics. Collect all ancient relics to awaken the warp portal and advance to the next level.
* **Controls**:
  * Desktop: `W` `A` `S` `D` or Arrow keys to roll, hold & drag mouse, `P` or `Esc` to Pause.
  * Mobile: Drag finger on screen to roll and steer.

### 4. Cyber Pong 3D
* **Genre**: Fast-paced 3D Neon Air Hockey / AI Battle
* **Description**: Face off against an adaptive AI opponent on a glowing neon arena. Angle your paddle to curve shots, build rally streaks, and be the first to reach 7 points!
* **Controls**:
  * Desktop: Move mouse horizontally or `A` / `D` keys to glide paddle, `P` or `Esc` to Pause.
  * Mobile: Drag paddle along the bottom of the screen.

---

## 🚀 Key Features

* **Three.js & WebGL Engine**: Hardware-accelerated 60fps rendering, dynamic lighting, soft shadows, particle effects, and post-processing aesthetics.
* **Pure Web Audio API Synthesizer**: 100% self-contained retro procedural sound effects (beeps, arpeggios, whooshes, collisions, and victory fanfare) with no external audio file dependencies.
* **Persistent High Scores**: Local storage tracks your personal bests across all games.
* **Responsive & Mobile Ready**: Clean on-screen touch controls on mobile devices and responsive canvas sizing.
* **SPA Routing**: URL hash navigation (`#/game/:id`) allows direct links and seamless browser back/forward history.
* **Zero Bloat & Fast Load**: Optimized Vite production bundle served via Alpine Nginx with Gzip compression.

---

## 🛠️ Development & Deployment

### Local Development
```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev

# Build production bundle
npm run build
```

### Docker Production Deployment
```bash
# Build and run container
docker compose up -d --build

# View logs
docker compose logs -f
```

---

## 🌐 Traefik & Domain Routing
The service is containerized as `games-web` on the `dokploy-network` and routed through Traefik to `games.asepsulaeman.com` with automated HTTPS.
