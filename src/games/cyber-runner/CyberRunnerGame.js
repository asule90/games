import * as THREE from 'three';
import { BaseGame } from '../BaseGame.js';
import { sounds } from '../../audio/SoundManager.js';

export class CyberRunnerGame extends BaseGame {
  constructor(options = {}) {
    super({ ...options, gameId: 'cyber-runner' });

    this.lanes = [-3.5, 0, 3.5];
    this.currentLane = 1; // 0: left, 1: mid, 2: right
    this.targetX = 0;
    this.speed = 28;
    this.baseSpeed = 28;
    this.maxSpeed = 65;

    this.obstacles = [];
    this.collectibles = [];
    this.particles = [];
    this.spawnTimer = 0;
    this.scoreTimer = 0;

    this.isJumping = false;
    this.jumpVelocity = 0;
    this.gravity = -45;
    this.playerY = 0.6;
    this.baseY = 0.6;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.touchStartX = 0;
    this.touchStartY = 0;
  }

  setupCamera(width, height) {
    this.camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 300);
    this.camera.position.set(0, 4.5, 9);
    this.camera.lookAt(0, 1.2, -15);
  }

  setupScene() {
    this.scene.fog = new THREE.FogExp2(0x060814, 0.015);
    this.scene.background = new THREE.Color(0x060814);

    // Ambient & Directional Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f0ff, 1.5);
    dirLight.position.set(5, 20, 10);
    this.scene.add(dirLight);

    const dirLight2 = new THREE.DirectionalLight(0xff0077, 1.2);
    dirLight2.position.set(-5, 10, -10);
    this.scene.add(dirLight2);

    // Infinite track floor grid
    this.createTrack();

    // Player Craft
    this.createPlayer();

    // Starfield particles
    this.createStarfield();
  }

  createTrack() {
    // Road surface
    const roadGeo = new THREE.PlaneGeometry(12, 400);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x0a0d24,
      roughness: 0.2,
      metalness: 0.8
    });
    this.road = new THREE.Mesh(roadGeo, roadMat);
    this.road.rotation.x = -Math.PI / 2;
    this.road.position.z = -150;
    this.scene.add(this.road);

    // Glowing Lane Dividers
    for (let x of [-1.75, 1.75]) {
      const lineGeo = new THREE.PlaneGeometry(0.12, 400);
      const lineMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.01, -150);
      this.scene.add(line);
    }

    // Glowing Neon Side Rails
    for (let x of [-6, 6]) {
      const railGeo = new THREE.BoxGeometry(0.3, 0.8, 400);
      const railMat = new THREE.MeshStandardMaterial({
        color: 0xff007f,
        emissive: 0xff007f,
        emissiveIntensity: 0.8
      });
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(x, 0.4, -150);
      this.scene.add(rail);
    }
  }

  createPlayer() {
    this.playerGroup = new THREE.Group();

    // Sleek cyber ship body
    const bodyGeo = new THREE.ConeGeometry(0.7, 2.2, 5);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1a1f3c,
      roughness: 0.3,
      metalness: 0.9
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    this.playerGroup.add(body);

    // Wings
    const wingGeo = new THREE.BoxGeometry(2.4, 0.08, 1.2);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00a0cc,
      emissiveIntensity: 0.4,
      metalness: 0.8
    });
    const wings = new THREE.Mesh(wingGeo, wingMat);
    wings.position.set(0, -0.1, 0.2);
    this.playerGroup.add(wings);

    // Cockpit neon canopy
    const cockpitGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const cockpitMat = new THREE.MeshStandardMaterial({
      color: 0xff007f,
      emissive: 0xff007f,
      emissiveIntensity: 0.6,
      roughness: 0.1
    });
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, 0.25, 0.1);
    cockpit.scale.set(0.7, 0.5, 1.6);
    this.playerGroup.add(cockpit);

    // Thruster glow
    const thrusterGeo = new THREE.CylinderGeometry(0.2, 0.35, 0.5, 12);
    const thrusterMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    this.thruster = new THREE.Mesh(thrusterGeo, thrusterMat);
    this.thruster.rotation.x = Math.PI / 2;
    this.thruster.position.set(0, 0, 1.1);
    this.playerGroup.add(this.thruster);

    this.playerGroup.position.set(0, this.baseY, 0);
    this.scene.add(this.playerGroup);
  }

  createStarfield() {
    const starCount = 600;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 200;
      positions[i + 1] = Math.random() * 80 + 2;
      positions[i + 2] = -Math.random() * 300;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 0.8,
      transparent: true,
      opacity: 0.8
    });

    this.stars = new THREE.Points(starGeo, starMat);
    this.scene.add(this.stars);
  }

  setupControls() {
    window.addEventListener('keydown', this.handleKeyDown);
    if (this.container) {
      this.container.addEventListener('touchstart', this.handleTouchStart, { passive: true });
      this.container.addEventListener('touchend', this.handleTouchEnd, { passive: true });
    }
  }

  removeControls() {
    window.removeEventListener('keydown', this.handleKeyDown);
    if (this.container) {
      this.container.removeEventListener('touchstart', this.handleTouchStart);
      this.container.removeEventListener('touchend', this.handleTouchEnd);
    }
  }

  handleKeyDown(e) {
    if (!this.isRunning || this.isPaused || this.isGameOver) return;

    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      this.moveLane(-1);
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      this.moveLane(1);
    } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      this.jump();
    }
  }

  handleTouchStart(e) {
    if (e.touches && e.touches[0]) {
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
    }
  }

  handleTouchEnd(e) {
    if (!this.isRunning || this.isPaused || this.isGameOver) return;
    if (e.changedTouches && e.changedTouches[0]) {
      const dx = e.changedTouches[0].clientX - this.touchStartX;
      const dy = e.changedTouches[0].clientY - this.touchStartY;

      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 30) this.moveLane(1);
        else if (dx < -30) this.moveLane(-1);
      } else {
        if (dy < -30) this.jump();
      }
    }
  }

  moveLane(dir) {
    const nextLane = this.currentLane + dir;
    if (nextLane >= 0 && nextLane <= 2) {
      this.currentLane = nextLane;
      this.targetX = this.lanes[this.currentLane];
      sounds.playClick();
    }
  }

  jump() {
    if (!this.isJumping) {
      this.isJumping = true;
      this.jumpVelocity = 14;
      sounds.playClick();
    }
  }

  spawnObstacle() {
    const laneIndex = Math.floor(Math.random() * 3);
    const x = this.lanes[laneIndex];
    const type = Math.random() > 0.4 ? 'barrier' : 'spikes';

    let mesh;
    if (type === 'barrier') {
      const geo = new THREE.BoxGeometry(2.2, 1.8, 0.6);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xff0044,
        emissive: 0x990022,
        roughness: 0.2,
        metalness: 0.8
      });
      mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, 0.9, -160);
    } else {
      const geo = new THREE.ConeGeometry(0.9, 1.6, 6);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        emissive: 0x884400,
        roughness: 0.3
      });
      mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, 0.8, -160);
    }

    mesh.userData = { type, laneIndex, radius: 1.0 };
    this.scene.add(mesh);
    this.obstacles.push(mesh);

    // Occasionally spawn energy crystal in an open lane
    if (Math.random() > 0.4) {
      const crystalLane = (laneIndex + 1 + Math.floor(Math.random() * 2)) % 3;
      this.spawnCollectible(this.lanes[crystalLane], -160);
    }
  }

  spawnCollectible(x, z) {
    const geo = new THREE.OctahedronGeometry(0.6);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00bbff,
      emissiveIntensity: 0.8,
      wireframe: false
    });
    const crystal = new THREE.Mesh(geo, mat);
    crystal.position.set(x, 1.2, z);
    crystal.userData = { radius: 0.9 };
    this.scene.add(crystal);
    this.collectibles.push(crystal);
  }

  resetState() {
    super.resetState();
    this.currentLane = 1;
    this.targetX = 0;
    this.speed = this.baseSpeed;
    this.spawnTimer = 0;
    this.scoreTimer = 0;
    this.isJumping = false;
    this.jumpVelocity = 0;
    this.playerY = this.baseY;

    // Clear obstacles & collectibles
    this.obstacles.forEach((obj) => {
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    this.obstacles = [];

    this.collectibles.forEach((obj) => {
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    this.collectibles = [];

    if (this.playerGroup) {
      this.playerGroup.position.set(0, this.baseY, 0);
      this.playerGroup.rotation.set(0, 0, 0);
    }
  }

  update(delta) {
    // Smooth lane transition
    const lerpSpeed = 14;
    this.playerGroup.position.x += (this.targetX - this.playerGroup.position.x) * lerpSpeed * delta;

    // Roll banking tilt based on lateral movement
    const dx = this.targetX - this.playerGroup.position.x;
    this.playerGroup.rotation.z = -dx * 0.12;

    // Jump Physics
    if (this.isJumping) {
      this.playerY += this.jumpVelocity * delta;
      this.jumpVelocity += this.gravity * delta;
      if (this.playerY <= this.baseY) {
        this.playerY = this.baseY;
        this.isJumping = false;
        this.jumpVelocity = 0;
      }
    }
    this.playerGroup.position.y = this.playerY;

    // Thruster pulsation
    if (this.thruster) {
      this.thruster.scale.set(
        1 + Math.sin(Date.now() * 0.02) * 0.15,
        1 + Math.cos(Date.now() * 0.02) * 0.15,
        1 + Math.sin(Date.now() * 0.03) * 0.3
      );
    }

    // Move obstacles & collectibles towards player
    const moveDist = this.speed * delta;

    // Road scroll effect
    this.road.position.z = (this.road.position.z + moveDist) % 40 - 150;

    // Spawn obstacles
    this.spawnTimer += delta;
    const interval = Math.max(0.65, 1.8 - (this.speed - this.baseSpeed) * 0.03);
    if (this.spawnTimer >= interval) {
      this.spawnTimer = 0;
      this.spawnObstacle();
    }

    // Dynamic speed and score progression
    this.scoreTimer += delta;
    if (this.scoreTimer >= 0.1) {
      this.score += Math.floor(this.speed * 0.2);
      this.scoreTimer = 0;
      this.onScoreUpdate(this.score);
    }

    // Speed increase
    if (this.speed < this.maxSpeed) {
      this.speed += delta * 0.5;
    }
    this.onStatsUpdate({ speed: Math.floor(this.speed * 3.6), multiplier: (this.speed / this.baseSpeed).toFixed(1) });

    // Update Obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.position.z += moveDist;

      if (obs.userData.type === 'spikes') {
        obs.rotation.y += delta * 3;
      }

      // Collision detection with player
      const pPos = this.playerGroup.position;
      const distX = Math.abs(obs.position.x - pPos.x);
      const distZ = Math.abs(obs.position.z - pPos.z);
      const distY = Math.abs(obs.position.y - pPos.y);

      if (distZ < 1.2 && distX < 1.3 && distY < 1.2) {
        sounds.playHit();
        sounds.playGameOver();
        this.gameOver();
        return;
      }

      // Remove offscreen
      if (obs.position.z > 15) {
        this.scene.remove(obs);
        this.obstacles.splice(i, 1);
      }
    }

    // Update Collectibles
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const col = this.collectibles[i];
      col.position.z += moveDist;
      col.rotation.y += delta * 4;
      col.rotation.x += delta * 2;

      // Pickup detection
      const pPos = this.playerGroup.position;
      const dist = pPos.distanceTo(col.position);
      if (dist < 1.6) {
        sounds.playScore();
        this.score += 250;
        this.onScoreUpdate(this.score);
        this.scene.remove(col);
        this.collectibles.splice(i, 1);
        continue;
      }

      if (col.position.z > 15) {
        this.scene.remove(col);
        this.collectibles.splice(i, 1);
      }
    }

    // Stars move back slightly for parallax
    if (this.stars) {
      const pos = this.stars.geometry.attributes.position.array;
      for (let i = 2; i < pos.length; i += 3) {
        pos[i] += moveDist * 0.3;
        if (pos[i] > 20) pos[i] = -280;
      }
      this.stars.geometry.attributes.position.needsUpdate = true;
    }
  }
}
