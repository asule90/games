import * as THREE from 'three';
import { BaseGame } from '../BaseGame.js';
import { sounds } from '../../audio/SoundManager.js';
import confetti from 'canvas-confetti';

export class CyberPongGame extends BaseGame {
  constructor(options = {}) {
    super({ ...options, gameId: 'neon-pong' });

    this.tableWidth = 14;
    this.tableLength = 26;
    this.paddleWidth = 3.2;
    this.paddleDepth = 0.6;
    this.puckRadius = 0.55;

    this.playerScore = 0;
    this.aiScore = 0;
    this.rally = 0;

    this.puckPos = new THREE.Vector3(0, 0.3, 0);
    this.puckVel = new THREE.Vector3(0, 0, 0);
    this.baseSpeed = 16.0;
    this.currentSpeed = 16.0;

    this.playerX = 0;
    this.targetPlayerX = 0;
    this.aiX = 0;
    this.aiSpeed = 12.0;

    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  setupCamera(width, height) {
    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 200);
    this.camera.position.set(0, 11, 16);
    this.camera.lookAt(0, 0, -3);
  }

  setupScene() {
    this.scene.background = new THREE.Color(0x060713);
    this.scene.fog = new THREE.FogExp2(0x060713, 0.02);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xff00bb, 1.2);
    dirLight.position.set(-10, 20, 10);
    this.scene.add(dirLight);

    const dirLight2 = new THREE.DirectionalLight(0x00f5ff, 1.2);
    dirLight2.position.set(10, 20, -10);
    this.scene.add(dirLight2);

    // Build Table & Field
    this.createTable();

    // Create Paddles & Puck
    this.createPaddles();
    this.createPuck();

    this.resetPuck(1);
  }

  createTable() {
    // Arena Floor
    const floorGeo = new THREE.PlaneGeometry(this.tableWidth, this.tableLength);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x090d20,
      roughness: 0.2,
      metalness: 0.8
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    // Center divider line
    const netGeo = new THREE.PlaneGeometry(this.tableWidth, 0.15);
    const netMat = new THREE.MeshBasicMaterial({ color: 0x334466 });
    const net = new THREE.Mesh(netGeo, netMat);
    net.rotation.x = -Math.PI / 2;
    net.position.y = 0.01;
    this.scene.add(net);

    // Glowing Neon Side Rails
    for (let x of [-this.tableWidth / 2, this.tableWidth / 2]) {
      const railGeo = new THREE.BoxGeometry(0.5, 0.8, this.tableLength);
      const railMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00a0cc,
        emissiveIntensity: 0.8
      });
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(x, 0.4, 0);
      this.scene.add(rail);
    }
  }

  createPaddles() {
    // Player Paddle (Cyan)
    const padGeo = new THREE.BoxGeometry(this.paddleWidth, 0.6, this.paddleDepth);
    const playerMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00a0cc,
      emissiveIntensity: 0.9,
      roughness: 0.1
    });
    this.playerPaddle = new THREE.Mesh(padGeo, playerMat);
    this.playerPaddle.position.set(0, 0.3, this.tableLength / 2 - 1.5);
    this.scene.add(this.playerPaddle);

    // AI Paddle (Magenta)
    const aiMat = new THREE.MeshStandardMaterial({
      color: 0xff0066,
      emissive: 0xcc0055,
      emissiveIntensity: 0.9,
      roughness: 0.1
    });
    this.aiPaddle = new THREE.Mesh(padGeo, aiMat);
    this.aiPaddle.position.set(0, 0.3, -this.tableLength / 2 + 1.5);
    this.scene.add(this.aiPaddle);
  }

  createPuck() {
    const geo = new THREE.CylinderGeometry(this.puckRadius, this.puckRadius, 0.35, 24);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffeeaa,
      emissiveIntensity: 1.0,
      metalness: 0.9
    });
    this.puck = new THREE.Mesh(geo, mat);
    this.scene.add(this.puck);

    // Dynamic point light tracking puck
    this.puckLight = new THREE.PointLight(0xffea00, 2.0, 8);
    this.scene.add(this.puckLight);
  }

  setupControls() {
    window.addEventListener('keydown', this.handleKeyDown);
    if (this.container) {
      this.container.addEventListener('pointermove', this.handlePointerMove);
    }
  }

  removeControls() {
    window.removeEventListener('keydown', this.handleKeyDown);
    if (this.container) {
      this.container.removeEventListener('pointermove', this.handlePointerMove);
    }
  }

  handleKeyDown(e) {
    const step = 1.2;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      this.targetPlayerX = Math.max(-this.tableWidth / 2 + this.paddleWidth / 2, this.targetPlayerX - step);
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      this.targetPlayerX = Math.min(this.tableWidth / 2 - this.paddleWidth / 2, this.targetPlayerX + step);
    }
  }

  handlePointerMove(e) {
    if (!this.isRunning || this.isPaused || this.isGameOver || !this.container) return;
    const rect = this.container.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width * 2 - 1; // -1 to 1
    const halfLimit = this.tableWidth / 2 - this.paddleWidth / 2 - 0.3;
    this.targetPlayerX = nx * halfLimit;
  }

  resetPuck(servingTowards = 1) {
    this.puckPos.set(0, 0.25, 0);
    this.currentSpeed = this.baseSpeed;
    this.rally = 0;

    const angle = (Math.random() - 0.5) * 0.8;
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
    this.targetPlayerX = 0;
    this.aiX = 0;
    this.resetPuck(1);
  }

  update(delta) {
    // Smooth player paddle motion
    this.playerX += (this.targetPlayerX - this.playerX) * 18 * delta;
    this.playerPaddle.position.x = this.playerX;

    // AI Paddle tracking with reaction delay
    const aiTargetX = THREE.MathUtils.clamp(
      this.puckPos.x,
      -this.tableWidth / 2 + this.paddleWidth / 2 + 0.3,
      this.tableWidth / 2 - this.paddleWidth / 2 - 0.3
    );
    this.aiX += (aiTargetX - this.aiX) * (this.aiSpeed * 0.8) * delta;
    this.aiPaddle.position.x = this.aiX;

    // Move Puck
    this.puckPos.x += this.puckVel.x * delta;
    this.puckPos.z += this.puckVel.z * delta;

    // Bounce off side rails
    const sideLimit = this.tableWidth / 2 - this.puckRadius - 0.3;
    if (this.puckPos.x < -sideLimit) {
      this.puckPos.x = -sideLimit;
      this.puckVel.x = Math.abs(this.puckVel.x);
      sounds.playBounce();
    } else if (this.puckPos.x > sideLimit) {
      this.puckPos.x = sideLimit;
      this.puckVel.x = -Math.abs(this.puckVel.x);
      sounds.playBounce();
    }

    // Paddle Collision - Player
    const playerZ = this.playerPaddle.position.z;
    if (
      this.puckPos.z >= playerZ - this.paddleDepth / 2 - this.puckRadius &&
      this.puckPos.z <= playerZ + this.paddleDepth / 2 &&
      this.puckVel.z > 0
    ) {
      const offset = (this.puckPos.x - this.playerX) / (this.paddleWidth / 2);
      if (Math.abs(offset) <= 1.1) {
        sounds.playBounce();
        this.rally++;
        this.currentSpeed = Math.min(32.0, this.baseSpeed + this.rally * 0.8);

        // Angle deflection based on hit position
        const returnAngle = offset * (Math.PI / 3); // up to 60 deg
        this.puckVel.x = Math.sin(returnAngle) * this.currentSpeed;
        this.puckVel.z = -Math.cos(returnAngle) * this.currentSpeed;

        this.score += 50 * this.rally;
        this.onScoreUpdate(this.score);
      }
    }

    // Paddle Collision - AI
    const aiZ = this.aiPaddle.position.z;
    if (
      this.puckPos.z <= aiZ + this.paddleDepth / 2 + this.puckRadius &&
      this.puckPos.z >= aiZ - this.paddleDepth / 2 &&
      this.puckVel.z < 0
    ) {
      const offset = (this.puckPos.x - this.aiX) / (this.paddleWidth / 2);
      if (Math.abs(offset) <= 1.1) {
        sounds.playBounce();
        this.rally++;
        this.currentSpeed = Math.min(32.0, this.baseSpeed + this.rally * 0.8);

        const returnAngle = offset * (Math.PI / 3);
        this.puckVel.x = Math.sin(returnAngle) * this.currentSpeed;
        this.puckVel.z = Math.cos(returnAngle) * this.currentSpeed;
      }
    }

    // Goal Check
    const goalBound = this.tableLength / 2 + 1.0;
    if (this.puckPos.z > goalBound) {
      // AI scored against player
      sounds.playHit();
      this.aiScore++;
      this.onStatsUpdate({ playerScore: this.playerScore, aiScore: this.aiScore, rally: 0 });

      if (this.aiScore >= 7) {
        sounds.playGameOver();
        this.gameOver();
      } else {
        this.resetPuck(1);
      }
    } else if (this.puckPos.z < -goalBound) {
      // Player scored!
      sounds.playScore();
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
      this.playerScore++;
      this.score += 500;
      this.onScoreUpdate(this.score);
      this.onStatsUpdate({ playerScore: this.playerScore, aiScore: this.aiScore, rally: 0 });

      if (this.playerScore >= 7) {
        sounds.playWin();
        confetti({ particleCount: 100, spread: 80 });
        this.gameOver();
      } else {
        this.resetPuck(-1);
      }
    }

    // Update Puck Mesh & Light
    this.puck.position.copy(this.puckPos);
    this.puckLight.position.set(this.puckPos.x, 1.2, this.puckPos.z);
    this.puck.rotation.y += delta * 10;

    this.onStatsUpdate({ playerScore: this.playerScore, aiScore: this.aiScore, rally: this.rally });
  }
}
