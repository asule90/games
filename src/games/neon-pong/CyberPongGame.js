import * as THREE from 'three';
import { BaseGame } from '../BaseGame.js';
import { sounds } from '../../audio/SoundManager.js';
import confetti from 'canvas-confetti';

export class CyberPongGame extends BaseGame {
  constructor(options = {}) {
    super({ ...options, gameId: 'neon-pong' });

    // Table geometry
    this.tableWidth = 14;
    this.tableLength = 26;
    this.malletRadius = 1.35;
    this.puckRadius = 0.55;
    this.goalWidth = 5.6;

    // Scores & Match State
    this.playerScore = 0;
    this.aiScore = 0;
    this.rally = 0;
    this.targetScore = 7;

    // Puck state
    this.puckPos = new THREE.Vector3(0, 0.28, 0);
    this.puckVel = new THREE.Vector3(0, 0, 0);
    this.baseSpeed = 16.0;
    this.currentSpeed = 16.0;
    this.maxSpeed = 34.0;

    // Player mallet state
    this.playerX = 0;
    this.playerZ = 10.5;
    this.targetPlayerX = 0;
    this.targetPlayerZ = 10.5;
    this.playerVelX = 0;
    this.playerVelZ = 0;

    // AI mallet state
    this.aiX = 0;
    this.aiZ = -10.5;
    this.aiSpeed = 14.0;
    this.aiVelX = 0;
    this.aiVelZ = 0;

    // Power smash state
    this.smashTimer = 0;
    this.isSmashing = false;

    // Active input keys for continuous motion
    this.keys = {
      left: false,
      right: false,
      up: false,
      down: false
    };

    // Pointer / touch tracking
    this.isPointerDown = false;
    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.planeIntersect = new THREE.Vector3();

    // Hit sparks particle pool
    this.sparks = [];

    // Bind event handlers
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleResize = this.handleResize.bind(this);
  }

  // Responsive camera framing for all devices (tall mobile portrait -> ultrawide desktop)
  setupCamera(width, height) {
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 200);
    this.updateCameraFraming(width, height);
  }

  updateCameraFraming(width, height) {
    if (!this.camera) return;
    const aspect = width / height;
    this.camera.aspect = aspect;

    if (aspect < 0.6) {
      // Tall mobile phones (portrait ~9:19.5)
      this.camera.fov = 58;
      this.camera.position.set(0, 34, 25);
      this.camera.lookAt(0, 0, 1.0);
    } else if (aspect < 1.0) {
      // Tablet portrait / square
      this.camera.fov = 52;
      this.camera.position.set(0, 28, 24);
      this.camera.lookAt(0, 0, 2.0);
    } else {
      // Landscape desktop / laptop
      this.camera.fov = 44;
      this.camera.position.set(0, 23, 22);
      this.camera.lookAt(0, 0, 3.5);
    }
    this.camera.updateProjectionMatrix();
  }

  handleResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.updateCameraFraming(width, height);
    this.renderer.setSize(width, height);
  }

  setupScene() {
    this.scene.background = new THREE.Color(0x060814);
    this.scene.fog = new THREE.FogExp2(0x060814, 0.015);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Cyan directional light (illuminates player side)
    const dirLight1 = new THREE.DirectionalLight(0x00f0ff, 1.3);
    dirLight1.position.set(-12, 22, 14);
    this.scene.add(dirLight1);

    // Magenta directional light (illuminates AI side)
    const dirLight2 = new THREE.DirectionalLight(0xff00bb, 1.3);
    dirLight2.position.set(12, 22, -14);
    this.scene.add(dirLight2);

    // Soft overhead center spot
    const overheadSpot = new THREE.PointLight(0xffffff, 1.0, 40);
    overheadSpot.position.set(0, 20, 0);
    this.scene.add(overheadSpot);

    // Arena elements
    this.createTable();
    this.createMallets();
    this.createPuck();
    this.createSparkPool();

    // Start puck serving towards AI
    this.resetPuck(1);
  }

  createTable() {
    // 1. Table Ice Surface
    const floorGeo = new THREE.PlaneGeometry(this.tableWidth, this.tableLength);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x080e22,
      roughness: 0.15,
      metalness: 0.85
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    // Table Under-border Glow (Aura)
    const auraGeo = new THREE.PlaneGeometry(this.tableWidth + 2.0, this.tableLength + 2.0);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x0b1335,
      side: THREE.BackSide
    });
    const aura = new THREE.Mesh(auraGeo, auraMat);
    aura.rotation.x = -Math.PI / 2;
    aura.position.y = -0.05;
    this.scene.add(aura);

    // 2. Center Divider Line
    const centerLineGeo = new THREE.PlaneGeometry(this.tableWidth - 0.2, 0.2);
    const centerLineMat = new THREE.MeshBasicMaterial({ color: 0x1dd1a1 });
    const centerLine = new THREE.Mesh(centerLineGeo, centerLineMat);
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.y = 0.015;
    this.scene.add(centerLine);

    // Center Neon Circle
    const centerRingGeo = new THREE.RingGeometry(2.3, 2.5, 48);
    const centerRingMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });
    const centerRing = new THREE.Mesh(centerRingGeo, centerRingMat);
    centerRing.rotation.x = -Math.PI / 2;
    centerRing.position.y = 0.018;
    this.scene.add(centerRing);

    const centerDotGeo = new THREE.CircleGeometry(0.5, 32);
    const centerDotMat = new THREE.MeshBasicMaterial({ color: 0x1dd1a1 });
    const centerDot = new THREE.Mesh(centerDotGeo, centerDotMat);
    centerDot.rotation.x = -Math.PI / 2;
    centerDot.position.y = 0.02;
    this.scene.add(centerDot);

    // 3. Goal Crease Arcs
    // Player Goal Arc (Cyan)
    const playerCreaseGeo = new THREE.RingGeometry(3.3, 3.48, 36, 1, 0, Math.PI);
    const playerCreaseMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });
    const playerCrease = new THREE.Mesh(playerCreaseGeo, playerCreaseMat);
    playerCrease.rotation.x = -Math.PI / 2;
    playerCrease.position.set(0, 0.02, this.tableLength / 2);
    this.scene.add(playerCrease);

    // AI Goal Arc (Magenta)
    const aiCreaseGeo = new THREE.RingGeometry(3.3, 3.48, 36, 1, Math.PI, Math.PI);
    const aiCreaseMat = new THREE.MeshBasicMaterial({ color: 0xff0077, side: THREE.DoubleSide });
    const aiCrease = new THREE.Mesh(aiCreaseGeo, aiCreaseMat);
    aiCrease.rotation.x = -Math.PI / 2;
    aiCrease.position.set(0, 0.02, -this.tableLength / 2);
    this.scene.add(aiCrease);

    // 4. Glowing Neon Side Rails (Left & Right)
    for (let x of [-this.tableWidth / 2, this.tableWidth / 2]) {
      const railGeo = new THREE.BoxGeometry(0.65, 0.85, this.tableLength);
      const railMat = new THREE.MeshStandardMaterial({
        color: 0x00d4ff,
        emissive: 0x0099cc,
        emissiveIntensity: 0.85,
        roughness: 0.2
      });
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(x, 0.42, 0);
      this.scene.add(rail);

      // Inner glowing neon light strip
      const stripGeo = new THREE.BoxGeometry(0.1, 0.15, this.tableLength);
      const stripMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const strip = new THREE.Mesh(stripGeo, stripMat);
      strip.position.set(x > 0 ? x - 0.3 : x + 0.3, 0.5, 0);
      this.scene.add(strip);
    }

    // 5. Back Walls with Goal Opening (Goal mouth width: this.goalWidth = 5.6)
    const halfGoal = this.goalWidth / 2;
    const sideWallWidth = (this.tableWidth - this.goalWidth) / 2; // (14 - 5.6) / 2 = 4.2
    const wallZOffset = this.tableLength / 2;

    for (let end of [-1, 1]) {
      const zPos = end * wallZOffset;
      const isPlayerEnd = end > 0;
      const wallColor = isPlayerEnd ? 0x00f0ff : 0xff0077;
      const wallEmissive = isPlayerEnd ? 0x0088cc : 0xaa0055;

      const wallMat = new THREE.MeshStandardMaterial({
        color: wallColor,
        emissive: wallEmissive,
        emissiveIntensity: 0.8,
        roughness: 0.2
      });

      // Left segment of back wall
      const leftWallGeo = new THREE.BoxGeometry(sideWallWidth, 0.85, 0.65);
      const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
      leftWall.position.set(-(this.tableWidth / 2 - sideWallWidth / 2), 0.42, zPos);
      this.scene.add(leftWall);

      // Right segment of back wall
      const rightWall = new THREE.Mesh(leftWallGeo, wallMat);
      rightWall.position.set(this.tableWidth / 2 - sideWallWidth / 2, 0.42, zPos);
      this.scene.add(rightWall);

      // Recessed Goal Pocket
      const pocketGeo = new THREE.BoxGeometry(this.goalWidth, 0.4, 1.2);
      const pocketMat = new THREE.MeshStandardMaterial({
        color: isPlayerEnd ? 0x002244 : 0x440022,
        roughness: 0.6
      });
      const pocket = new THREE.Mesh(pocketGeo, pocketMat);
      pocket.position.set(0, 0.15, zPos + end * 0.6);
      this.scene.add(pocket);

      // Goal Light Bar (Flashes when goal scored)
      const barGeo = new THREE.BoxGeometry(this.goalWidth, 0.25, 0.15);
      const barMat = new THREE.MeshStandardMaterial({
        color: wallColor,
        emissive: wallColor,
        emissiveIntensity: 1.2
      });
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.position.set(0, 0.5, zPos + end * 1.15);
      this.scene.add(bar);

      if (isPlayerEnd) this.playerGoalBar = bar;
      else this.aiGoalBar = bar;
    }
  }

  // Creates high-fidelity Air Hockey Mallets (Strikers) with metallic disc & luminous neon grip
  createMallet(colorHex, emissiveHex, isPlayer = true) {
    const group = new THREE.Group();

    // 1. Heavy Base Disc
    const baseGeo = new THREE.CylinderGeometry(this.malletRadius, this.malletRadius * 1.06, 0.38, 36);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x161a29,
      roughness: 0.12,
      metalness: 0.88
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.19;
    group.add(baseMesh);

    // 2. Outer Beveled Neon Glow Ring
    const ringGeo = new THREE.TorusGeometry(this.malletRadius * 0.98, 0.1, 16, 36);
    const ringMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: emissiveHex,
      emissiveIntensity: 1.6,
      roughness: 0.1
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.34;
    group.add(ringMesh);

    // 3. Inner Concentric Accent Ring
    const innerRingGeo = new THREE.TorusGeometry(this.malletRadius * 0.62, 0.06, 16, 32);
    const innerRingMesh = new THREE.Mesh(innerRingGeo, ringMat);
    innerRingMesh.rotation.x = Math.PI / 2;
    innerRingMesh.position.y = 0.36;
    group.add(innerRingMesh);

    // 4. Ergonomic Handle Grip Stem
    const stemGeo = new THREE.CylinderGeometry(0.38, 0.55, 0.72, 24);
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x22283e,
      roughness: 0.25,
      metalness: 0.75
    });
    const stemMesh = new THREE.Mesh(stemGeo, stemMat);
    stemMesh.position.y = 0.72;
    group.add(stemMesh);

    // 5. Crown Knob Cap
    const capGeo = new THREE.SphereGeometry(0.44, 24, 16);
    const capMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: emissiveHex,
      emissiveIntensity: 1.2,
      roughness: 0.2,
      metalness: 0.6
    });
    const capMesh = new THREE.Mesh(capGeo, capMat);
    capMesh.position.y = 1.08;
    group.add(capMesh);

    // 6. Under-Glow Table Light
    const malletLight = new THREE.PointLight(colorHex, 2.5, 6.0);
    malletLight.position.set(0, 0.45, 0);
    group.add(malletLight);

    // 7. Soft Under-glow Shadow Disc on Table
    const glowDiscGeo = new THREE.CircleGeometry(this.malletRadius * 1.35, 32);
    const glowDiscMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });
    const glowDisc = new THREE.Mesh(glowDiscGeo, glowDiscMat);
    glowDisc.rotation.x = -Math.PI / 2;
    glowDisc.position.y = 0.02;
    group.add(glowDisc);

    this.scene.add(group);
    return { group, ringMat, light: malletLight };
  }

  createMallets() {
    // Player Mallet (Cyan #00f0ff)
    this.playerMalletObj = this.createMallet(0x00f0ff, 0x00d4ff, true);
    this.playerPaddle = this.playerMalletObj.group;
    this.playerPaddle.position.set(0, 0, 10.5);

    // AI Mallet (Hot Pink #ff0077)
    this.aiMalletObj = this.createMallet(0xff0077, 0xff0055, false);
    this.aiPaddle = this.aiMalletObj.group;
    this.aiPaddle.position.set(0, 0, -10.5);
  }

  createPuck() {
    // Heavy Glowing Air Hockey Puck
    const geo = new THREE.CylinderGeometry(this.puckRadius, this.puckRadius, 0.35, 32);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffe600,
      emissiveIntensity: 1.3,
      metalness: 0.85,
      roughness: 0.1
    });
    this.puck = new THREE.Mesh(geo, mat);
    this.puck.position.set(0, 0.22, 0);
    this.scene.add(this.puck);

    // Top Glowing Emblem Ring on Puck
    const puckRingGeo = new THREE.RingGeometry(0.25, 0.42, 24);
    const puckRingMat = new THREE.MeshBasicMaterial({ color: 0xff3838, side: THREE.DoubleSide });
    const puckRing = new THREE.Mesh(puckRingGeo, puckRingMat);
    puckRing.rotation.x = -Math.PI / 2;
    puckRing.position.y = 0.18;
    this.puck.add(puckRing);

    // Puck Point Light
    this.puckLight = new THREE.PointLight(0xffea00, 2.5, 9);
    this.scene.add(this.puckLight);
  }

  createSparkPool() {
    this.sparks = [];
    const sparkGeo = new THREE.SphereGeometry(0.12, 8, 8);
    for (let i = 0; i < 24; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0 });
      const mesh = new THREE.Mesh(sparkGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.sparks.push({
        mesh,
        mat,
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.4
      });
    }
  }

  spawnHitSparks(x, z, colorHex) {
    let spawned = 0;
    for (let s of this.sparks) {
      if (s.life <= 0) {
        s.mesh.position.set(x, 0.3, z);
        s.mat.color.setHex(colorHex);
        s.mat.opacity = 1.0;
        s.mesh.visible = true;
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 8;
        s.vel.set(Math.cos(angle) * speed, 1.5 + Math.random() * 3, Math.sin(angle) * speed);
        s.life = 0.35;
        s.maxLife = 0.35;
        spawned++;
        if (spawned >= 8) break;
      }
    }
  }

  updateSparks(delta) {
    for (let s of this.sparks) {
      if (s.life > 0) {
        s.life -= delta;
        s.mesh.position.addScaledVector(s.vel, delta);
        s.vel.y -= 9.8 * delta; // gravity
        s.mat.opacity = Math.max(0, s.life / s.maxLife);
        if (s.life <= 0) {
          s.mesh.visible = false;
        }
      }
    }
  }

  setupControls() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    if (this.container) {
      this.container.style.touchAction = 'none';
      this.container.addEventListener('pointerdown', this.handlePointerDown);
      this.container.addEventListener('pointermove', this.handlePointerMove);
      this.container.addEventListener('pointerup', this.handlePointerUp);
      this.container.addEventListener('pointercancel', this.handlePointerUp);

      // Touch fallbacks
      this.container.addEventListener('touchstart', this.handleTouchStart, { passive: false });
      this.container.addEventListener('touchmove', this.handleTouchMove, { passive: false });
      this.container.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    }
  }

  removeControls() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);

    if (this.container) {
      this.container.removeEventListener('pointerdown', this.handlePointerDown);
      this.container.removeEventListener('pointermove', this.handlePointerMove);
      this.container.removeEventListener('pointerup', this.handlePointerUp);
      this.container.removeEventListener('pointercancel', this.handlePointerUp);

      this.container.removeEventListener('touchstart', this.handleTouchStart);
      this.container.removeEventListener('touchmove', this.handleTouchMove);
      this.container.removeEventListener('touchend', this.handleTouchEnd);
    }
  }

  // Keyboard controls
  handleKeyDown(e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = true;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') this.keys.up = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') this.keys.down = true;

    if (e.code === 'Space') {
      this.powerSmash();
    }
  }

  handleKeyUp(e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') this.keys.up = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') this.keys.down = false;
  }

  // Touch / Pointer controls
  updatePointerToTable(clientX, clientY) {
    if (!this.isRunning || this.isPaused || this.isGameOver || !this.container || !this.camera) return;
    const rect = this.container.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera({ x: nx, y: ny }, this.camera);
    if (this.raycaster.ray.intersectPlane(this.groundPlane, this.planeIntersect)) {
      const limitX = this.tableWidth / 2 - this.malletRadius - 0.35;
      this.targetPlayerX = THREE.MathUtils.clamp(this.planeIntersect.x, -limitX, limitX);

      // Defend in player half: from center line (1.2) to baseline (11.4)
      const minZ = 1.2;
      const maxZ = this.tableLength / 2 - this.malletRadius - 0.25;
      this.targetPlayerZ = THREE.MathUtils.clamp(this.planeIntersect.z, minZ, maxZ);
    }
  }

  handlePointerDown(e) {
    this.isPointerDown = true;
    try {
      this.container?.setPointerCapture?.(e.pointerId);
    } catch (err) {}
    this.updatePointerToTable(e.clientX, e.clientY);
  }

  handlePointerMove(e) {
    // On mouse: track on hover; on touch: track when down
    if (e.pointerType === 'touch' && !this.isPointerDown) return;
    this.updatePointerToTable(e.clientX, e.clientY);
  }

  handlePointerUp(e) {
    this.isPointerDown = false;
    try {
      this.container?.releasePointerCapture?.(e.pointerId);
    } catch (err) {}
  }

  handleTouchStart(e) {
    if (e.touches && e.touches[0]) {
      e.preventDefault();
      this.isPointerDown = true;
      this.updatePointerToTable(e.touches[0].clientX, e.touches[0].clientY);
    }
  }

  handleTouchMove(e) {
    if (e.touches && e.touches[0]) {
      e.preventDefault();
      this.updatePointerToTable(e.touches[0].clientX, e.touches[0].clientY);
    }
  }

  handleTouchEnd(e) {
    this.isPointerDown = false;
  }

  // Power Smash Mechanic: Lunge forward to strike puck with hyper velocity!
  powerSmash() {
    if (!this.isRunning || this.isPaused || this.isGameOver || this.isSmashing) return;
    this.isSmashing = true;
    this.smashTimer = 0.24;
    sounds.playClick();

    // Pulse mallet glow
    if (this.playerMalletObj?.ringMat) {
      this.playerMalletObj.ringMat.emissiveIntensity = 3.5;
    }

    // Check if puck is in front of player
    const dx = this.puckPos.x - this.playerX;
    const dz = this.puckPos.z - this.playerZ;
    const dist = Math.hypot(dx, dz);

    if (dist < this.malletRadius + this.puckRadius + 2.5 && this.puckPos.z < this.playerZ) {
      // Direct Smash Contact!
      sounds.playBounce();
      this.rally += 2;
      this.currentSpeed = Math.min(this.maxSpeed, this.currentSpeed + 8.0);
      const angle = (dx / (dist || 1)) * 0.7;
      this.puckVel.x = Math.sin(angle) * this.currentSpeed;
      this.puckVel.z = -Math.cos(angle) * this.currentSpeed;

      this.score += 250;
      this.onScoreUpdate(this.score);
      this.spawnHitSparks(this.puckPos.x, this.puckPos.z, 0x00f0ff);
      confetti({ particleCount: 20, spread: 50, origin: { y: 0.8 } });
    }
  }

  resetPuck(servingTowards = 1) {
    this.puckPos.set(0, 0.25, servingTowards > 0 ? 3.0 : -3.0);
    this.currentSpeed = this.baseSpeed;
    this.rally = 0;

    const angle = (Math.random() - 0.5) * 0.6;
    this.puckVel.set(
      Math.sin(angle) * this.currentSpeed,
      0,
      servingTowards * Math.cos(angle) * this.currentSpeed
    );
  }

  resetState() {
    super.resetState();
    this.playerScore = 0;
    this.aiScore = 0;
    this.rally = 0;

    this.playerX = 0;
    this.playerZ = 10.5;
    this.targetPlayerX = 0;
    this.targetPlayerZ = 10.5;

    this.aiX = 0;
    this.aiZ = -10.5;
    this.isSmashing = false;
    this.smashTimer = 0;

    this.resetPuck(1);
    this.onStatsUpdate({
      playerScore: this.playerScore,
      aiScore: this.aiScore,
      rally: this.rally
    });
  }

  update(delta) {
    // 1. Continuous Keyboard / D-Pad Movement
    const keySpeedX = 22.0;
    const keySpeedZ = 18.0;
    const limitX = this.tableWidth / 2 - this.malletRadius - 0.35;
    const minZ = 1.2;
    const maxZ = this.tableLength / 2 - this.malletRadius - 0.25;

    if (this.keys.left) {
      this.targetPlayerX = Math.max(-limitX, this.targetPlayerX - keySpeedX * delta);
    }
    if (this.keys.right) {
      this.targetPlayerX = Math.min(limitX, this.targetPlayerX + keySpeedX * delta);
    }
    if (this.keys.up) {
      this.targetPlayerZ = Math.max(minZ, this.targetPlayerZ - keySpeedZ * delta);
    }
    if (this.keys.down) {
      this.targetPlayerZ = Math.min(maxZ, this.targetPlayerZ + keySpeedZ * delta);
    }

    // 2. Smash Timer & Lunge animation
    if (this.isSmashing) {
      this.smashTimer -= delta;
      if (this.smashTimer <= 0) {
        this.isSmashing = false;
        if (this.playerMalletObj?.ringMat) {
          this.playerMalletObj.ringMat.emissiveIntensity = 1.6;
        }
      }
    }

    // Smooth Player Mallet Interpolation
    const prevPlayerX = this.playerX;
    const prevPlayerZ = this.playerZ;

    const smashOffsetZ = this.isSmashing ? -1.8 : 0;
    const desiredZ = THREE.MathUtils.clamp(this.targetPlayerZ + smashOffsetZ, minZ, maxZ);

    this.playerX += (this.targetPlayerX - this.playerX) * Math.min(1.0, 24 * delta);
    this.playerZ += (desiredZ - this.playerZ) * Math.min(1.0, 24 * delta);

    this.playerVelX = (this.playerX - prevPlayerX) / (delta || 0.016);
    this.playerVelZ = (this.playerZ - prevPlayerZ) / (delta || 0.016);

    this.playerPaddle.position.set(this.playerX, 0, this.playerZ);

    // 3. AI Mallet Movement
    const prevAiX = this.aiX;
    const prevAiZ = this.aiZ;

    // AI tracks puck X within table limits
    const aiTargetX = THREE.MathUtils.clamp(this.puckPos.x, -limitX, limitX);

    // AI tactical depth: if puck is in AI half and coming, strike forward; otherwise defend
    let aiTargetZ = -10.5;
    if (this.puckPos.z < -1.0 && this.puckVel.z < 0) {
      // Strike forward towards puck
      aiTargetZ = Math.max(-11.2, this.puckPos.z - 1.2);
    } else {
      // Return to defensive stance
      aiTargetZ = -10.2;
    }

    this.aiX += (aiTargetX - this.aiX) * Math.min(1.0, this.aiSpeed * delta);
    this.aiZ += (aiTargetZ - this.aiZ) * Math.min(1.0, (this.aiSpeed * 0.7) * delta);

    this.aiVelX = (this.aiX - prevAiX) / (delta || 0.016);
    this.aiVelZ = (this.aiZ - prevAiZ) / (delta || 0.016);

    this.aiPaddle.position.set(this.aiX, 0, this.aiZ);

    // 4. Move Puck
    this.puckPos.x += this.puckVel.x * delta;
    this.puckPos.z += this.puckVel.z * delta;

    // Side Rail Collisions (X Bounds)
    const sideLimit = this.tableWidth / 2 - this.puckRadius - 0.35; // 7 - 0.55 - 0.35 = 6.1
    if (this.puckPos.x < -sideLimit) {
      this.puckPos.x = -sideLimit;
      this.puckVel.x = Math.abs(this.puckVel.x);
      sounds.playBounce();
      this.spawnHitSparks(this.puckPos.x, this.puckPos.z, 0x00f0ff);
    } else if (this.puckPos.x > sideLimit) {
      this.puckPos.x = sideLimit;
      this.puckVel.x = -Math.abs(this.puckVel.x);
      sounds.playBounce();
      this.spawnHitSparks(this.puckPos.x, this.puckPos.z, 0x00f0ff);
    }

    // Prevent horizontal stagnation
    if (Math.abs(this.puckVel.z) < 2.5) {
      this.puckVel.z = (this.puckVel.z >= 0 ? 1 : -1) * 4.0;
    }

    // 5. Circle-to-Circle Collision: Player Mallet & Puck
    const collRadius = this.malletRadius + this.puckRadius;
    const pdx = this.puckPos.x - this.playerX;
    const pdz = this.puckPos.z - this.playerZ;
    const pdistSq = pdx * pdx + pdz * pdz;

    if (pdistSq < collRadius * collRadius) {
      const pdist = Math.sqrt(pdistSq) || 0.001;
      const nx = pdx / pdist;
      const nz = pdz / pdist;

      // Separate puck so it doesn't overlap mallet
      this.puckPos.x = this.playerX + nx * (collRadius + 0.06);
      this.puckPos.z = this.playerZ + nz * (collRadius + 0.06);

      // Normal velocity reflection
      const dot = this.puckVel.x * nx + this.puckVel.z * nz;
      if (dot < 0) {
        this.puckVel.x -= 2 * dot * nx;
        this.puckVel.z -= 2 * dot * nz;
      }

      // Add mallet momentum impulse
      this.puckVel.x += this.playerVelX * 0.45;
      this.puckVel.z += this.playerVelZ * 0.45;

      // Guarantee puck shoots towards AI half
      if (this.puckVel.z > -4.0) {
        this.puckVel.z = -Math.abs(this.currentSpeed * 0.75);
      }

      this.rally++;
      this.currentSpeed = Math.min(this.maxSpeed, this.baseSpeed + this.rally * 0.7);

      const spd = Math.hypot(this.puckVel.x, this.puckVel.z) || this.currentSpeed;
      this.puckVel.x = (this.puckVel.x / spd) * this.currentSpeed;
      this.puckVel.z = (this.puckVel.z / spd) * this.currentSpeed;

      sounds.playBounce();
      this.score += 50 * this.rally;
      this.onScoreUpdate(this.score);
      this.spawnHitSparks(this.puckPos.x, this.puckPos.z, 0x00f0ff);
    }

    // 6. Circle-to-Circle Collision: AI Mallet & Puck
    const aidx = this.puckPos.x - this.aiX;
    const aidz = this.puckPos.z - this.aiZ;
    const aidistSq = aidx * aidx + aidz * aidz;

    if (aidistSq < collRadius * collRadius) {
      const aidist = Math.sqrt(aidistSq) || 0.001;
      const nx = aidx / aidist;
      const nz = aidz / aidist;

      this.puckPos.x = this.aiX + nx * (collRadius + 0.06);
      this.puckPos.z = this.aiZ + nz * (collRadius + 0.06);

      const dot = this.puckVel.x * nx + this.puckVel.z * nz;
      if (dot < 0) {
        this.puckVel.x -= 2 * dot * nx;
        this.puckVel.z -= 2 * dot * nz;
      }

      this.puckVel.x += this.aiVelX * 0.4;
      this.puckVel.z += this.aiVelZ * 0.4;

      if (this.puckVel.z < 4.0) {
        this.puckVel.z = Math.abs(this.currentSpeed * 0.75);
      }

      this.rally++;
      this.currentSpeed = Math.min(this.maxSpeed, this.baseSpeed + this.rally * 0.7);

      const spd = Math.hypot(this.puckVel.x, this.puckVel.z) || this.currentSpeed;
      this.puckVel.x = (this.puckVel.x / spd) * this.currentSpeed;
      this.puckVel.z = (this.puckVel.z / spd) * this.currentSpeed;

      sounds.playBounce();
      this.spawnHitSparks(this.puckPos.x, this.puckPos.z, 0xff0066);
    }

    // 7. Back Wall Bounce vs Goal Pockets
    const backWallZ = this.tableLength / 2 - this.puckRadius - 0.2; // 13 - 0.55 - 0.2 = 12.25
    const halfGoalMouth = this.goalWidth / 2 - 0.2; // 2.6

    // Player End (Z > 0)
    if (this.puckPos.z >= backWallZ) {
      if (Math.abs(this.puckPos.x) >= halfGoalMouth) {
        // Hit back wall outside goal -> bounce
        this.puckPos.z = backWallZ;
        this.puckVel.z = -Math.abs(this.puckVel.z);
        sounds.playBounce();
        this.spawnHitSparks(this.puckPos.x, this.puckPos.z, 0x00f0ff);
      } else if (this.puckPos.z > this.tableLength / 2 + 0.8) {
        // AI SCORED in player goal!
        sounds.playHit();
        this.aiScore++;
        this.onStatsUpdate({ playerScore: this.playerScore, aiScore: this.aiScore, rally: 0 });

        if (this.playerGoalBar) {
          this.playerGoalBar.material.emissiveIntensity = 4.0;
          setTimeout(() => {
            if (this.playerGoalBar) this.playerGoalBar.material.emissiveIntensity = 1.2;
          }, 400);
        }

        if (this.aiScore >= this.targetScore) {
          sounds.playGameOver();
          this.gameOver();
        } else {
          this.resetPuck(1); // Serve towards AI next
        }
      }
    }

    // AI End (Z < 0)
    if (this.puckPos.z <= -backWallZ) {
      if (Math.abs(this.puckPos.x) >= halfGoalMouth) {
        // Hit back wall outside goal -> bounce
        this.puckPos.z = -backWallZ;
        this.puckVel.z = Math.abs(this.puckVel.z);
        sounds.playBounce();
        this.spawnHitSparks(this.puckPos.x, this.puckPos.z, 0xff0077);
      } else if (this.puckPos.z < -this.tableLength / 2 - 0.8) {
        // PLAYER SCORED in AI goal!
        sounds.playScore();
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.65 } });
        this.playerScore++;
        this.score += 500;
        this.onScoreUpdate(this.score);
        this.onStatsUpdate({ playerScore: this.playerScore, aiScore: this.aiScore, rally: 0 });

        if (this.aiGoalBar) {
          this.aiGoalBar.material.emissiveIntensity = 4.0;
          setTimeout(() => {
            if (this.aiGoalBar) this.aiGoalBar.material.emissiveIntensity = 1.2;
          }, 400);
        }

        if (this.playerScore >= this.targetScore) {
          sounds.playWin();
          confetti({ particleCount: 120, spread: 90 });
          this.gameOver();
        } else {
          this.resetPuck(-1); // Serve towards player next
        }
      }
    }

    // 8. Update Puck Mesh & Tracking Light
    this.puck.position.copy(this.puckPos);
    this.puckLight.position.set(this.puckPos.x, 1.2, this.puckPos.z);
    this.puck.rotation.y += delta * 12;

    // 9. Update Sparks
    this.updateSparks(delta);
  }
}
