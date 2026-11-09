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

    // Callbacks
    this.onScoreUpdate = options.onScoreUpdate || (() => {});
    this.onGameOverCallback = options.onGameOver || (() => {});
    this.onStatsUpdate = options.onStatsUpdate || (() => {});

    this.handleResize = this.handleResize.bind(this);
  }

  init(container) {
    this.container = container;
    this.scene = new THREE.Scene();

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    try {
      // First attempt: High quality
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'default'
      });
    } catch (err1) {
      console.warn('Initial WebGL init failed, attempting safe fallback without antialias...', err1);
      try {
        // Second attempt: Safe basic fallback
        this.renderer = new THREE.WebGLRenderer({
          antialias: false,
          alpha: true,
          powerPreference: 'default',
          precision: 'mediump'
        });
      } catch (err2) {
        console.error('WebGL is not available in browser:', err2);
        this.showWebGLErrorNotice(container);
        return;
      }
    }

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
  }

  showWebGLErrorNotice(container) {
    const notice = document.createElement('div');
    notice.style.cssText = `
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #181534;
      color: #fff;
      padding: 2rem;
      text-align: center;
      font-family: sans-serif;
      z-index: 200;
    `;
    notice.innerHTML = `
      <div style="font-size: 3.5rem; margin-bottom: 1rem;">🎮</div>
      <h2 style="font-size: 1.8rem; margin-bottom: 1rem; color: #ff6b8b;">WebGL Belum Aktif di Browser</h2>
      <p style="max-width: 520px; line-height: 1.6; color: #cbd5e1; margin-bottom: 1.5rem;">
        Peramban Anda saat ini memblokir WebGL (Software Mesa Renderer). Silakan aktifkan opsi 
        <strong>"Use graphics acceleration when available"</strong> di pengaturan browser Anda (<code>chrome://settings/system</code> atau <code>brave://settings/system</code>), lalu restart browser.
      </p>
      <button onclick="window.location.hash='#/'" style="
        background: linear-gradient(135deg, #ff6b8b, #ff9f43);
        border: none;
        color: #fff;
        font-weight: bold;
        padding: 0.8rem 1.6rem;
        border-radius: 9999px;
        cursor: pointer;
      ">Kembali ke Beranda</button>
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
    if (!this.isGameOver) {
      this.isPaused = false;
      this.clock.start();
    }
  }

  restart() {
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
    if (!this.isRunning) return;

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

    this.scene = null;
    this.camera = null;
    this.renderer = null;
  }
}
