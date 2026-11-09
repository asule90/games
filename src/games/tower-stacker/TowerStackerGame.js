import * as THREE from 'three';
import { BaseGame } from '../BaseGame.js';
import { sounds } from '../../audio/SoundManager.js';

export class TowerStackerGame extends BaseGame {
  constructor(options = {}) {
    super({ ...options, gameId: 'tower-stacker' });

    this.boxHeight = 1.2;
    this.originalWidth = 6.0;
    this.originalDepth = 6.0;

    this.stack = [];
    this.overhangs = [];
    this.direction = 'x'; // 'x' or 'z'
    this.moveSpeed = 7.0;
    this.currentPosition = 0;
    this.moveDirection = 1;

    this.combo = 0;
    this.hue = 200;

    this.handleClick = this.handleClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  setupCamera(width, height) {
    this.cameraDistance = 14;
    const aspect = width / height;
    this.camera = new THREE.OrthographicCamera(
      -this.cameraDistance * aspect,
      this.cameraDistance * aspect,
      this.cameraDistance,
      -this.cameraDistance,
      -100,
      1000
    );
    this.camera.position.set(15, 15, 15);
    this.camera.lookAt(0, 0, 0);
  }

  setupScene() {
    this.scene.background = new THREE.Color(0x0e111a);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(20, 40, 20);
    this.scene.add(dirLight);

    const dirLight2 = new THREE.DirectionalLight(0x4466aa, 0.8);
    dirLight2.position.set(-20, 20, -20);
    this.scene.add(dirLight2);

    this.initStack();
  }

  getColor(index) {
    const h = (this.hue + index * 6) % 360;
    return new THREE.Color(`hsl(${h}, 75%, 55%)`);
  }

  initStack() {
    // Base foundation block
    const baseGeo = new THREE.BoxGeometry(this.originalWidth, this.boxHeight * 4, this.originalDepth);
    const baseMat = new THREE.MeshStandardMaterial({
      color: this.getColor(0),
      roughness: 0.3,
      metalness: 0.2
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.set(0, -this.boxHeight * 1.5, 0);
    this.scene.add(baseMesh);

    this.stack = [
      {
        mesh: baseMesh,
        width: this.originalWidth,
        depth: this.originalDepth,
        x: 0,
        z: 0,
        y: 0
      }
    ];

    this.spawnNextBlock();
  }

  spawnNextBlock() {
    const prev = this.stack[this.stack.length - 1];
    const index = this.stack.length;
    const y = index * this.boxHeight;

    this.direction = index % 2 === 1 ? 'x' : 'z';

    const geo = new THREE.BoxGeometry(prev.width, this.boxHeight, prev.depth);
    const mat = new THREE.MeshStandardMaterial({
      color: this.getColor(index),
      roughness: 0.25,
      metalness: 0.3
    });
    const mesh = new THREE.Mesh(geo, mat);

    const spawnDist = 10;
    const x = this.direction === 'x' ? -spawnDist : prev.x;
    const z = this.direction === 'z' ? -spawnDist : prev.z;

    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    this.activeBlock = {
      mesh,
      width: prev.width,
      depth: prev.depth,
      y,
      x,
      z
    };

    this.moveDirection = 1;
    this.currentPosition = -spawnDist;
  }

  setupControls() {
    window.addEventListener('keydown', this.handleKeyDown);
    if (this.container) {
      this.container.addEventListener('pointerdown', this.handleClick);
    }
  }

  removeControls() {
    window.removeEventListener('keydown', this.handleKeyDown);
    if (this.container) {
      this.container.removeEventListener('pointerdown', this.handleClick);
    }
  }

  handleKeyDown(e) {
    if (e.code === 'Space') {
      e.preventDefault();
      this.placeBlock();
    }
  }

  handleClick(e) {
    if (e.target.closest('button')) return;
    this.placeBlock();
  }

  placeBlock() {
    if (!this.isRunning || this.isPaused || this.isGameOver || !this.activeBlock) return;

    const prev = this.stack[this.stack.length - 1];
    const active = this.activeBlock;

    let delta = 0;
    let perfectThreshold = 0.15;

    if (this.direction === 'x') {
      delta = active.mesh.position.x - prev.x;
      const isOverhang = Math.abs(delta) >= active.width;

      if (isOverhang) {
        this.dropActiveBlock();
        return;
      }

      // Check perfect snap
      if (Math.abs(delta) < perfectThreshold) {
        this.combo++;
        sounds.playStackNote(this.combo);
        active.mesh.position.x = prev.x;
        // Expand slight bonus on 5 streak
        if (this.combo % 5 === 0) {
          active.width = Math.min(this.originalWidth, active.width + 0.5);
          active.mesh.geometry.dispose();
          active.mesh.geometry = new THREE.BoxGeometry(active.width, this.boxHeight, active.depth);
        }
      } else {
        this.combo = 0;
        sounds.playBounce();

        const overlap = active.width - Math.abs(delta);
        const overhangSize = Math.abs(delta);
        const overhangX = delta > 0
          ? active.mesh.position.x + overlap / 2
          : active.mesh.position.x - overlap / 2;

        this.spawnFallingPiece(
          overhangSize,
          this.boxHeight,
          active.depth,
          overhangX,
          active.y,
          active.mesh.position.z,
          active.mesh.material.color
        );

        active.width = overlap;
        active.mesh.geometry.dispose();
        active.mesh.geometry = new THREE.BoxGeometry(active.width, this.boxHeight, active.depth);
        active.mesh.position.x = prev.x + delta / 2;
      }
    } else {
      // Z axis
      delta = active.mesh.position.z - prev.z;
      const isOverhang = Math.abs(delta) >= active.depth;

      if (isOverhang) {
        this.dropActiveBlock();
        return;
      }

      if (Math.abs(delta) < perfectThreshold) {
        this.combo++;
        sounds.playStackNote(this.combo);
        active.mesh.position.z = prev.z;
        if (this.combo % 5 === 0) {
          active.depth = Math.min(this.originalDepth, active.depth + 0.5);
          active.mesh.geometry.dispose();
          active.mesh.geometry = new THREE.BoxGeometry(active.width, this.boxHeight, active.depth);
        }
      } else {
        this.combo = 0;
        sounds.playBounce();

        const overlap = active.depth - Math.abs(delta);
        const overhangSize = Math.abs(delta);
        const overhangZ = delta > 0
          ? active.mesh.position.z + overlap / 2
          : active.mesh.position.z - overlap / 2;

        this.spawnFallingPiece(
          active.width,
          this.boxHeight,
          overhangSize,
          active.mesh.position.x,
          active.y,
          overhangZ,
          active.mesh.material.color
        );

        active.depth = overlap;
        active.mesh.geometry.dispose();
        active.mesh.geometry = new THREE.BoxGeometry(active.width, this.boxHeight, active.depth);
        active.mesh.position.z = prev.z + delta / 2;
      }
    }

    // Successfully stacked
    this.stack.push({
      mesh: active.mesh,
      width: active.width,
      depth: active.depth,
      x: active.mesh.position.x,
      z: active.mesh.position.z,
      y: active.y
    });

    this.score++;
    this.onScoreUpdate(this.score);
    this.onStatsUpdate({ combo: this.combo, height: this.score });

    // Speed increases subtly
    this.moveSpeed = Math.min(14.0, 7.0 + this.score * 0.15);

    // Spawn next block
    this.spawnNextBlock();
  }

  dropActiveBlock() {
    sounds.playHit();
    sounds.playGameOver();
    const active = this.activeBlock;
    this.spawnFallingPiece(
      active.width,
      this.boxHeight,
      active.depth,
      active.mesh.position.x,
      active.y,
      active.mesh.position.z,
      active.mesh.material.color
    );
    this.scene.remove(active.mesh);
    this.activeBlock = null;
    this.gameOver();
  }

  spawnFallingPiece(w, h, d, x, y, z, color) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.3
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    this.overhangs.push({
      mesh,
      vy: 0,
      rotSpeed: (Math.random() - 0.5) * 4
    });
  }

  resetState() {
    super.resetState();
    this.combo = 0;
    this.moveSpeed = 7.0;
    this.hue = Math.floor(Math.random() * 360);

    // Cleanup stack
    this.stack.forEach((item) => {
      this.scene.remove(item.mesh);
      if (item.mesh.geometry) item.mesh.geometry.dispose();
      if (item.mesh.material) item.mesh.material.dispose();
    });
    this.stack = [];

    // Cleanup overhangs
    this.overhangs.forEach((item) => {
      this.scene.remove(item.mesh);
      if (item.mesh.geometry) item.mesh.geometry.dispose();
      if (item.mesh.material) item.mesh.material.dispose();
    });
    this.overhangs = [];

    if (this.activeBlock) {
      this.scene.remove(this.activeBlock.mesh);
      if (this.activeBlock.mesh.geometry) this.activeBlock.mesh.geometry.dispose();
      if (this.activeBlock.mesh.material) this.activeBlock.mesh.material.dispose();
      this.activeBlock = null;
    }

    this.camera.position.set(15, 15, 15);
    this.camera.lookAt(0, 0, 0);

    this.initStack();
  }

  update(delta) {
    // Move active block back and forth
    if (this.activeBlock) {
      const bound = 9;
      this.currentPosition += this.moveSpeed * this.moveDirection * delta;

      if (this.currentPosition > bound) {
        this.currentPosition = bound;
        this.moveDirection = -1;
      } else if (this.currentPosition < -bound) {
        this.currentPosition = -bound;
        this.moveDirection = 1;
      }

      if (this.direction === 'x') {
        this.activeBlock.mesh.position.x = this.currentPosition;
      } else {
        this.activeBlock.mesh.position.z = this.currentPosition;
      }
    }

    // Update falling slices
    for (let i = this.overhangs.length - 1; i >= 0; i--) {
      const p = this.overhangs[i];
      p.vy -= 30 * delta;
      p.mesh.position.y += p.vy * delta;
      p.mesh.rotation.x += p.rotSpeed * delta;
      p.mesh.rotation.z += p.rotSpeed * delta;

      if (p.mesh.position.y < -30) {
        this.scene.remove(p.mesh);
        if (p.mesh.geometry) p.mesh.geometry.dispose();
        if (p.mesh.material) p.mesh.material.dispose();
        this.overhangs.splice(i, 1);
      }
    }

    // Smooth camera elevation follow stack height
    const targetY = 15 + (this.stack.length - 1) * this.boxHeight;
    this.camera.position.y += (targetY - this.camera.position.y) * 4 * delta;
    this.camera.lookAt(0, (this.stack.length - 1) * this.boxHeight * 0.9, 0);
  }
}
