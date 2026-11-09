import * as THREE from 'three';
import { BaseGame } from '../BaseGame.js';
import { sounds } from '../../audio/SoundManager.js';
import confetti from 'canvas-confetti';

export class CosmicMarbleGame extends BaseGame {
  constructor(options = {}) {
    super({ ...options, gameId: 'cosmic-marble' });

    this.radius = 0.8;
    this.marblePos = new THREE.Vector3(0, this.radius, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.acceleration = 24.0;
    this.friction = 0.94;
    this.gravity = -30.0;
    this.level = 1;

    this.platforms = [];
    this.relics = [];
    this.keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, KeyW: false, KeyS: false, KeyA: false, KeyD: false };

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
  }

  setupCamera(width, height) {
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 500);
    this.camera.position.set(0, 10, 15);
    this.camera.lookAt(0, 0, 0);
  }

  setupScene() {
    this.scene.background = new THREE.Color(0x040612);
    this.scene.fog = new THREE.FogExp2(0x040612, 0.015);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f5ff, 1.3);
    dirLight.position.set(15, 30, 20);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xff00bb, 1.5, 40);
    pointLight.position.set(0, 6, 0);
    this.scene.add(pointLight);

    // Create Marble
    this.createMarble();

    // Build Level
    this.buildLevel(this.level);
  }

  createMarble() {
    const geo = new THREE.SphereGeometry(this.radius, 32, 32);
    // Cool grid texture pattern on sphere so rolling rotation is visually stunning
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, 236, 236);
    ctx.fillStyle = '#ff0077';
    ctx.beginPath();
    ctx.arc(128, 128, 48, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.2,
      metalness: 0.6,
      emissive: 0x003344,
      emissiveIntensity: 0.3
    });

    this.marble = new THREE.Mesh(geo, mat);
    this.marble.castShadow = true;
    this.marble.receiveShadow = true;
    this.scene.add(this.marble);
  }

  buildLevel(lvl) {
    // Clean old platforms and relics
    this.platforms.forEach((p) => this.scene.remove(p.mesh));
    this.platforms = [];
    this.relics.forEach((r) => this.scene.remove(r.mesh));
    this.relics = [];
    if (this.portal) {
      this.scene.remove(this.portal.mesh);
      this.portal = null;
    }

    // Level design: modular connecting platforms
    const layout = [
      { x: 0, z: 0, w: 10, d: 10 },
      { x: 0, z: -14, w: 6, d: 14 },
      { x: 12, z: -14, w: 12, d: 6 },
      { x: 12, z: -28, w: 8, d: 16 },
      { x: -6, z: -28, w: 18, d: 8 }
    ];

    layout.forEach((block, idx) => {
      const geo = new THREE.BoxGeometry(block.w, 1.5, block.d);
      const mat = new THREE.MeshStandardMaterial({
        color: idx === 0 ? 0x1e293b : 0x111c30,
        roughness: 0.4,
        metalness: 0.5
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(block.x, -0.75, block.z);
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      // Neon border rim
      const edgeGeo = new THREE.EdgesGeometry(geo);
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 2 });
      const edge = new THREE.LineSegments(edgeGeo, edgeMat);
      mesh.add(edge);

      this.platforms.push({
        mesh,
        minX: block.x - block.w / 2,
        maxX: block.x + block.w / 2,
        minZ: block.z - block.d / 2,
        maxZ: block.z + block.d / 2
      });

      // Spawn relics on non-starting platforms
      if (idx > 0) {
        this.spawnRelic(block.x, 1.2, block.z);
      }
    });

    // Portal pad at end of track
    const lastBlock = layout[layout.length - 1];
    this.createPortal(lastBlock.x, 0.1, lastBlock.z);

    // Reset marble position
    this.marblePos.set(0, this.radius, 0);
    this.velocity.set(0, 0, 0);
    if (this.marble) {
      this.marble.position.copy(this.marblePos);
    }
  }

  spawnRelic(x, y, z) {
    const geo = new THREE.IcosahedronGeometry(0.7, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      emissive: 0xff9900,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.9
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.relics.push({ mesh, collected: false });
  }

  createPortal(x, y, z) {
    const geo = new THREE.TorusGeometry(1.6, 0.25, 16, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 1.8, z);
    mesh.rotation.y = Math.PI / 4;
    this.scene.add(mesh);
    this.portal = { mesh, x, z, active: false };
  }

  setupControls() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    if (this.container) {
      this.container.addEventListener('pointermove', this.handlePointerMove);
    }
  }

  removeControls() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    if (this.container) {
      this.container.removeEventListener('pointermove', this.handlePointerMove);
    }
  }

  handleKeyDown(e) {
    if (this.keys.hasOwnProperty(e.code)) {
      this.keys[e.code] = true;
    }
  }

  handleKeyUp(e) {
    if (this.keys.hasOwnProperty(e.code)) {
      this.keys[e.code] = false;
    }
  }

  handlePointerMove(e) {
    if (!this.isRunning || this.isPaused || this.isGameOver) return;
    if (e.buttons === 1) {
      const rect = this.container.getBoundingClientRect();
      const cx = (e.clientX - rect.left) / rect.width - 0.5;
      const cy = (e.clientY - rect.top) / rect.height - 0.5;
      this.velocity.x += cx * 0.8;
      this.velocity.z += cy * 0.8;
    }
  }

  resetState() {
    super.resetState();
    this.level = 1;
    this.buildLevel(this.level);
  }

  update(delta) {
    // Keyboard inputs
    let ax = 0;
    let az = 0;
    if (this.keys.ArrowLeft || this.keys.KeyA) ax -= 1;
    if (this.keys.ArrowRight || this.keys.KeyD) ax += 1;
    if (this.keys.ArrowUp || this.keys.KeyW) az -= 1;
    if (this.keys.ArrowDown || this.keys.KeyS) az += 1;

    if (ax !== 0 || az !== 0) {
      const inputVec = new THREE.Vector2(ax, az).normalize().multiplyScalar(this.acceleration * delta);
      this.velocity.x += inputVec.x;
      this.velocity.z += inputVec.y;
    }

    // Apply friction
    this.velocity.x *= Math.pow(this.friction, delta * 60);
    this.velocity.z *= Math.pow(this.friction, delta * 60);

    // Speed limiter
    const maxSpeed = 16.0;
    if (this.velocity.length() > maxSpeed) {
      this.velocity.clampLength(0, maxSpeed);
    }

    // Check if on any platform
    let onPlatform = false;
    for (const p of this.platforms) {
      if (
        this.marblePos.x >= p.minX - this.radius * 0.5 &&
        this.marblePos.x <= p.maxX + this.radius * 0.5 &&
        this.marblePos.z >= p.minZ - this.radius * 0.5 &&
        this.marblePos.z <= p.maxZ + this.radius * 0.5
      ) {
        onPlatform = true;
        break;
      }
    }

    if (onPlatform) {
      this.marblePos.x += this.velocity.x * delta;
      this.marblePos.z += this.velocity.z * delta;
      this.marblePos.y = this.radius;
      this.velocity.y = 0;
    } else {
      // Marble is in freefall!
      this.velocity.y += this.gravity * delta;
      this.marblePos.addScaledVector(this.velocity, delta);

      if (this.marblePos.y < -20) {
        sounds.playGameOver();
        this.gameOver();
        return;
      }
    }

    // Realistic marble rotation according to rolling speed & direction
    if (onPlatform && this.marble) {
      const rollDist = new THREE.Vector2(this.velocity.x, this.velocity.z).length() * delta;
      if (rollDist > 0.0001) {
        const angle = rollDist / this.radius;
        // Axis perpendicular to velocity
        const axis = new THREE.Vector3(this.velocity.z, 0, -this.velocity.x).normalize();
        this.marble.rotateOnWorldAxis(axis, angle);
      }
    }

    this.marble.position.copy(this.marblePos);

    // Relic collection & rotation
    let remaining = 0;
    for (let i = this.relics.length - 1; i >= 0; i--) {
      const relic = this.relics[i];
      if (!relic.collected) {
        remaining++;
        relic.mesh.rotation.y += delta * 2.5;
        relic.mesh.rotation.x += delta * 1.5;

        const dist = this.marblePos.distanceTo(relic.mesh.position);
        if (dist < this.radius + 0.7) {
          relic.collected = true;
          this.scene.remove(relic.mesh);
          this.score += 500;
          sounds.playScore();
          this.onScoreUpdate(this.score);
        }
      }
    }

    this.onStatsUpdate({ level: this.level, remainingRelics: remaining });

    // Portal warp logic
    if (this.portal) {
      this.portal.mesh.rotation.z += delta * 2;
      if (remaining === 0) {
        this.portal.mesh.material.color.setHex(0x00ff88);
        this.portal.active = true;

        const pDist = new THREE.Vector2(this.marblePos.x - this.portal.x, this.marblePos.z - this.portal.z).length();
        if (pDist < 1.5) {
          // Level Completed!
          sounds.playWin();
          confetti({ particleCount: 70, spread: 60 });
          this.score += 1500;
          this.level++;
          this.onScoreUpdate(this.score);
          this.buildLevel(this.level);
        }
      }
    }

    // Camera smoothly follows marble
    const targetCamX = this.marblePos.x;
    const targetCamY = Math.max(8, this.marblePos.y + 9);
    const targetCamZ = this.marblePos.z + 13;

    this.camera.position.x += (targetCamX - this.camera.position.x) * 5 * delta;
    this.camera.position.y += (targetCamY - this.camera.position.y) * 5 * delta;
    this.camera.position.z += (targetCamZ - this.camera.position.z) * 5 * delta;
    this.camera.lookAt(this.marblePos.x, this.marblePos.y, this.marblePos.z);
  }
}
