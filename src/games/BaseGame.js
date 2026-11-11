import * as THREE from 'three';

export class BaseGame {
  constructor(options = {}) {
    this.options = options;
    this.container = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.animationFrameId = null;
    this.clock = new THREE.Clock();
    this.score = 0;
    this.highScore = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.isGameOver = false;
    this.isInitialized = false;
    this.supports2DFallback = false;

    // Callbacks
    this.onScoreUpdate = options.onScoreUpdate || (() => {});
    this.onGameOverCallback = options.onGameOver || (() => {});
    this.onStatsUpdate = options.onStatsUpdate || (() => {});

    this.handleResize = this.handleResize.bind(this);
  }

  init(container) {
    this.container = container;
    this.isInitialized = false;

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: 'default',
        precision: 'mediump',
        failIfMajorPerformanceCaveat: false
      });
    } catch (err) {
      console.warn('Primary WebGLRenderer creation failed in browser, attempting fallback:', err);
      try {
        const testCanvas = document.createElement('canvas');
        const gl = testCanvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false }) ||
                   testCanvas.getContext('webgl', { failIfMajorPerformanceCaveat: false }) ||
                   testCanvas.getContext('experimental-webgl', { failIfMajorPerformanceCaveat: false });
        if (gl) {
          this.renderer = new THREE.WebGLRenderer({
            canvas: testCanvas,
            context: gl,
            antialias: false,
            alpha: true,
            failIfMajorPerformanceCaveat: false
          });
        }
      } catch (fallbackErr) {
        console.warn('Fallback WebGL context creation also failed:', fallbackErr);
      }
    }

    if (!this.renderer) {
      if (this.supports2DFallback) {
        console.log('WebGL context unavailable; delegating to 2D Fallback Mode.');
        return false;
      }
      this.showWebGLErrorNotice(container);
      return false;
    }

    this.scene = new THREE.Scene();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    try {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } catch (e) {}

    this.container.appendChild(this.renderer.domElement);
    window.addEventListener('resize', this.handleResize);

    this.setupCamera(width, height);
    this.setupScene();
    this.setupControls();
    this.isInitialized = true;
    return true;
  }

  showWebGLErrorNotice(container) {
    if (!container) return;
    const prev = container.querySelector('.webgl-notice-overlay');
    if (prev) prev.remove();

    const notice = document.createElement('div');
    notice.className = 'webgl-notice-overlay';
    notice.style.cssText = `
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #15132d;
      color: #fff;
      padding: 2rem;
      text-align: center;
      font-family: var(--font-body, sans-serif);
      z-index: 200;
    `;
    notice.innerHTML = `
      <div style="font-size: 3.5rem; margin-bottom: 0.75rem;">🛠️</div>
      <h2 style="font-size: 1.8rem; margin-bottom: 0.75rem; color: #feca57; font-family: var(--font-display, sans-serif);">WebGL 2 Diblokir Internal oleh Browser (Linux)</h2>
      <p style="max-width: 580px; line-height: 1.6; color: #cbd5e1; margin-bottom: 1.25rem; font-size: 0.95rem;">
        Peramban Chromium / Brave di Linux secara default memblokir WebGL 2 pada driver grafis Mesa (<em>BindToCurrentSequence failed</em>) meskipun tombol akselerasi grafis di menu Settings sudah aktif.
      </p>
      <div style="background: rgba(0,0,0,0.45); border: 2px dashed #ff6b8b; border-radius: 18px; padding: 1.25rem 1.5rem; max-width: 540px; text-align: left; margin-bottom: 1.5rem;">
        <p style="font-weight: 800; color: #ff6b8b; margin-bottom: 0.6rem; font-size: 1.05rem;">💡 Solusi Mudah (Cukup 1 Langkah):</p>
        <ol style="margin-left: 1.25rem; line-height: 1.8; color: #f8fafc; font-size: 0.95rem;">
          <li>Buka tab baru: <strong>chrome://flags</strong> (atau <strong>brave://flags</strong>)</li>
          <li>Cari flag: <strong>Override software rendering list</strong> (<code>#ignore-gpu-blocklist</code>)</li>
          <li>Ubah statusnya dari <em>Default</em> menjadi <strong style="color:#10b981;">Enabled</strong></li>
          <li>Klik tombol <strong>Relaunch</strong> di pojok kanan bawah browser.</li>
        </ol>
      </div>
      <button onclick="window.location.hash='#/'" style="
        background: linear-gradient(135deg, #ff6b8b, #ff9f43);
        border: none;
        color: #fff;
        font-family: var(--font-display, sans-serif);
        font-weight: 800;
        font-size: 1rem;
        padding: 0.85rem 1.8rem;
        border-radius: 9999px;
        cursor: pointer;
        box-shadow: 0 6px 20px rgba(255, 107, 139, 0.4);
      ">← Kembali ke Beranda</button>
    `;
    container.appendChild(notice);
  }

  setupCamera(width, height) {
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(0, 5, 10);
    this.camera.lookAt(0, 0, 0);
  }

  setupScene() {
    // Override in subclass
  }

  setupControls() {
    // Override in subclass
  }

  handleResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    if (this.camera.isPerspectiveCamera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    } else if (this.camera.isOrthographicCamera) {
      const aspect = width / height;
      const d = this.cameraDistance || 15;
      this.camera.left = -d * aspect;
      this.camera.right = d * aspect;
      this.camera.top = d;
      this.camera.bottom = -d;
      this.camera.updateProjectionMatrix();
    }

    this.renderer.setSize(width, height);
  }

  start() {
    if (!this.isInitialized || !this.renderer) {
      console.warn('Game cannot start because WebGL renderer is not initialized.');
      return;
    }
    this.isRunning = true;
    this.isPaused = false;
    this.isGameOver = false;
    this.score = 0;
    this.onScoreUpdate(this.score);
    this.clock.start();
    this.loop();
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    if (!this.isGameOver && this.isInitialized) {
      this.isPaused = false;
      this.clock.start();
    }
  }

  restart() {
    if (!this.isInitialized) return;
    this.resetState();
    this.start();
  }

  resetState() {
    this.score = 0;
    this.isGameOver = false;
    this.isPaused = false;
  }

  gameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    const isNewHigh = this.saveHighScore(this.score);
    this.onGameOverCallback(this.score, isNewHigh);
  }

  saveHighScore(score) {
    const key = `highscore_${this.options.gameId || 'game'}`;
    const prev = parseInt(localStorage.getItem(key) || '0', 10);
    if (score > prev) {
      localStorage.setItem(key, score.toString());
      this.highScore = score;
      return true;
    }
    this.highScore = prev;
    return false;
  }

  getHighScore() {
    const key = `highscore_${this.options.gameId || 'game'}`;
    return parseInt(localStorage.getItem(key) || '0', 10);
  }

  loop() {
    if (!this.isRunning || !this.isInitialized || !this.renderer) return;

    this.animationFrameId = requestAnimationFrame(() => this.loop());

    if (this.isPaused) return;

    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.update(delta);

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  update(delta) {
    // Override in subclass
  }

  destroy() {
    this.isRunning = false;
    this.isInitialized = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    window.removeEventListener('resize', this.handleResize);

    if (this.removeControls) {
      this.removeControls();
    }

    if (this.scene) {
      this.scene.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    }

    if (this.renderer) {
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer.dispose();
    }

    if (this.container) {
      const notice = this.container.querySelector('.webgl-notice-overlay');
      if (notice) notice.remove();
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
  }
}
