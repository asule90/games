import * as THREE from 'three';
import { BaseGame } from '../BaseGame.js';
import { sounds } from '../../audio/SoundManager.js';
import confetti from 'canvas-confetti';

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 1.0;

const TETROMINOES = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    color: 0x00f0ff,
    colorHex: '#00f0ff'
  },
  O: {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: 0xfeca57,
    colorHex: '#feca57'
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: 0xa55eea,
    colorHex: '#a55eea'
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    color: 0x1dd1a1,
    colorHex: '#1dd1a1'
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    color: 0xff6b8b,
    colorHex: '#ff6b8b'
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: 0x54a0ff,
    colorHex: '#54a0ff'
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: 0xff9f43,
    colorHex: '#ff9f43'
  }
};

const TETROMINO_KEYS = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export class TetrisGame extends BaseGame {
  constructor(options = {}) {
    super({ ...options, gameId: 'tetris-3d' });

    // Grid matrix: ROWS x COLS, stores color hex or null
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.gridMeshes = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

    // Gameplay stats
    this.level = 1;
    this.linesCleared = 0;
    this.dropInterval = 0.8;
    this.dropTimer = 0;
    this.lockTimer = 0;
    this.lockDelay = 0.5;

    // Active Pieces
    this.bag = [];
    this.currentPiece = null;
    this.nextPieceKey = null;
    this.holdPieceKey = null;
    this.canHold = true;

    // 3D Groups
    this.boardGroup = null;
    this.currentPieceGroup = null;
    this.ghostPieceGroup = null;
    this.nextDisplayGroup = null;
    this.holdDisplayGroup = null;
    this.ambientParticles = null;

    // Materials cache for performance
    this.cubeGeo = new THREE.BoxGeometry(0.92, 0.92, 0.92);
    this.ghostMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.22,
      wireframe: false
    });

    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  setupCamera(width, height) {
    this.cameraDistance = 16.5;
    const aspect = width / height;
    this.camera = new THREE.OrthographicCamera(
      -this.cameraDistance * aspect,
      this.cameraDistance * aspect,
      this.cameraDistance,
      -this.cameraDistance,
      -50,
      200
    );
    // Slight stylish isometric angle for deep 3D block relief
    this.camera.position.set(0, 10, 26);
    this.camera.lookAt(0, 9.5, 0);
  }

  setupScene() {
    this.scene.background = new THREE.Color(0x0a0c1a);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambientLight);

    // Directional sunlight
    const dirLight1 = new THREE.DirectionalLight(0xffeedd, 1.2);
    dirLight1.position.set(15, 30, 20);
    dirLight1.castShadow = true;
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x00f0ff, 0.6);
    dirLight2.position.set(-15, 10, 15);
    this.scene.add(dirLight2);

    // Build Tetris Well Matrix Frame
    this.buildTetrisWell();

    // Build Side Podiums (HOLD & NEXT)
    this.buildSideDisplays();

    // Floating background particles
    this.buildBackgroundAmbiance();

    // Initialize Game Pieces
    this.refillBag();
    this.nextPieceKey = this.pullFromBag();
    this.spawnNextPiece();
    this.updateNextDisplay();
    this.updateHoldDisplay();
  }

  buildTetrisWell() {
    this.boardGroup = new THREE.Group();
    this.scene.add(this.boardGroup);

    // Well Backplate (Dark glass matrix with subtle grid lines)
    const backplateGeo = new THREE.PlaneGeometry(COLS * BLOCK_SIZE, ROWS * BLOCK_SIZE);
    const backplateMat = new THREE.MeshBasicMaterial({
      color: 0x12172f,
      transparent: true,
      opacity: 0.75
    });
    const backplate = new THREE.Mesh(backplateGeo, backplateMat);
    backplate.position.set(0, (ROWS * BLOCK_SIZE) / 2 - 0.5, -0.5);
    this.boardGroup.add(backplate);

    // Frame Borders (Left, Right, Bottom)
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x222d4f,
      metalness: 0.8,
      roughness: 0.2
    });

    const borderLeft = new THREE.Mesh(new THREE.BoxGeometry(0.3, ROWS * BLOCK_SIZE + 0.3, 1.0), frameMat);
    borderLeft.position.set(-COLS * 0.5 - 0.15, (ROWS * BLOCK_SIZE) / 2 - 0.5, 0);
    this.boardGroup.add(borderLeft);

    const borderRight = new THREE.Mesh(new THREE.BoxGeometry(0.3, ROWS * BLOCK_SIZE + 0.3, 1.0), frameMat);
    borderRight.position.set(COLS * 0.5 + 0.15, (ROWS * BLOCK_SIZE) / 2 - 0.5, 0);
    this.boardGroup.add(borderRight);

    const borderBottom = new THREE.Mesh(new THREE.BoxGeometry(COLS * BLOCK_SIZE + 0.9, 0.3, 1.0), frameMat);
    borderBottom.position.set(0, -0.65, 0);
    this.boardGroup.add(borderBottom);

    // Glowing Neon Wire Grid
    const gridHelper = new THREE.GridHelper(ROWS * BLOCK_SIZE, ROWS, 0x00f0ff, 0x1e2d4d);
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.position.set(0, (ROWS * BLOCK_SIZE) / 2 - 0.5, -0.48);
    gridHelper.scale.set(COLS / ROWS, 1, 1);
    this.boardGroup.add(gridHelper);

    // Groups for falling piece & ghost piece
    this.currentPieceGroup = new THREE.Group();
    this.boardGroup.add(this.currentPieceGroup);

    this.ghostPieceGroup = new THREE.Group();
    this.boardGroup.add(this.ghostPieceGroup);
  }

  buildSideDisplays() {
    // Left: HOLD Box
    this.holdDisplayGroup = new THREE.Group();
    this.holdDisplayGroup.position.set(-8.5, 14.5, 0);
    this.scene.add(this.holdDisplayGroup);

    const holdSprite = this.createTextSprite('HOLD (C)', 'rgba(30, 41, 59, 0.9)', '#a55eea', '#a55eea');
    holdSprite.position.set(0, 2.5, 0);
    holdSprite.scale.set(3.2, 0.8, 1);
    this.holdDisplayGroup.add(holdSprite);

    const holdPodium = new THREE.Mesh(
      new THREE.BoxGeometry(4.0, 3.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x12172f, roughness: 0.3, metalness: 0.5 })
    );
    this.holdDisplayGroup.add(holdPodium);

    // Right: NEXT Box
    this.nextDisplayGroup = new THREE.Group();
    this.nextDisplayGroup.position.set(8.5, 14.5, 0);
    this.scene.add(this.nextDisplayGroup);

    const nextSprite = this.createTextSprite('NEXT', 'rgba(30, 41, 59, 0.9)', '#00f0ff', '#00f0ff');
    nextSprite.position.set(0, 2.5, 0);
    nextSprite.scale.set(3.0, 0.8, 1);
    this.nextDisplayGroup.add(nextSprite);

    const nextPodium = new THREE.Mesh(
      new THREE.BoxGeometry(4.0, 3.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x12172f, roughness: 0.3, metalness: 0.5 })
    );
    this.nextDisplayGroup.add(nextPodium);

    // Floating Stats Badges on Left below HOLD
    this.statsSprite = this.createTextSprite('LVL 1 • LINES 0', 'rgba(15, 23, 42, 0.9)', '#10b981', '#10b981');
    this.statsSprite.position.set(-8.5, 8.5, 0);
    this.statsSprite.scale.set(3.5, 0.8, 1);
    this.scene.add(this.statsSprite);
  }

  buildBackgroundAmbiance() {
    const count = 60;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 45;
      positions[i * 3 + 1] = Math.random() * 30;
      positions[i * 3 + 2] = -5 - Math.random() * 20;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.35,
      transparent: true,
      opacity: 0.6
    });

    this.ambientParticles = new THREE.Points(geo, mat);
    this.scene.add(this.ambientParticles);
  }

  createTextSprite(text, bgColor = 'rgba(15,23,42,0.9)', textColor = '#ffffff', borderColor = '#38bdf8') {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(8, 8, 368, 80, 24);
    ctx.fill();

    ctx.lineWidth = 6;
    ctx.strokeStyle = borderColor;
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 192, 48);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    return new THREE.Sprite(mat);
  }

  refillBag() {
    this.bag = [...TETROMINO_KEYS];
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
    }
  }

  pullFromBag() {
    if (this.bag.length === 0) {
      this.refillBag();
    }
    return this.bag.pop();
  }

  spawnNextPiece() {
    const key = this.nextPieceKey || this.pullFromBag();
    this.nextPieceKey = this.pullFromBag();
    this.canHold = true;

    const template = TETROMINOES[key];
    const matrix = template.shape.map((row) => [...row]);

    // Spawn centered horizontally at top
    const startX = Math.floor((COLS - matrix[0].length) / 2);
    const startY = ROWS - matrix.length;

    this.currentPiece = {
      type: key,
      matrix,
      x: startX,
      y: startY,
      color: template.color
    };

    // Check collision at spawn (Game Over)
    if (this.checkCollision(this.currentPiece.x, this.currentPiece.y, this.currentPiece.matrix)) {
      sounds.playGameOver();
      this.gameOver();
      return;
    }

    this.renderCurrentAndGhost();
    this.updateNextDisplay();
  }

  holdPiece() {
    if (!this.canHold || !this.currentPiece) return;
    sounds.playBounce();
    this.canHold = false;

    const currentKey = this.currentPiece.type;
    if (this.holdPieceKey) {
      const swapKey = this.holdPieceKey;
      this.holdPieceKey = currentKey;
      const template = TETROMINOES[swapKey];
      this.currentPiece = {
        type: swapKey,
        matrix: template.shape.map((row) => [...row]),
        x: Math.floor((COLS - template.shape[0].length) / 2),
        y: ROWS - template.shape.length,
        color: template.color
      };
    } else {
      this.holdPieceKey = currentKey;
      this.spawnNextPiece();
    }

    this.updateHoldDisplay();
    this.renderCurrentAndGhost();
  }

  updateNextDisplay() {
    if (!this.nextDisplayGroup) return;

    // Remove previous mini blocks
    const toRemove = [];
    this.nextDisplayGroup.children.forEach((c) => {
      if (c.isMesh && c.geometry === this.cubeGeo) toRemove.push(c);
    });
    toRemove.forEach((c) => this.nextDisplayGroup.remove(c));

    if (!this.nextPieceKey) return;
    const template = TETROMINOES[this.nextPieceKey];
    const shape = template.shape;
    const mat = new THREE.MeshStandardMaterial({
      color: template.color,
      roughness: 0.25,
      metalness: 0.3
    });

    const offX = (shape[0].length - 1) * 0.5;
    const offY = (shape.length - 1) * 0.5;

    shape.forEach((row, rIdx) => {
      row.forEach((val, cIdx) => {
        if (val) {
          const mesh = new THREE.Mesh(this.cubeGeo, mat);
          mesh.scale.set(0.7, 0.7, 0.7);
          mesh.position.set((cIdx - offX) * 0.7, (offY - rIdx) * 0.7, 0.35);
          this.nextDisplayGroup.add(mesh);
        }
      });
    });
  }

  updateHoldDisplay() {
    if (!this.holdDisplayGroup) return;

    const toRemove = [];
    this.holdDisplayGroup.children.forEach((c) => {
      if (c.isMesh && c.geometry === this.cubeGeo) toRemove.push(c);
    });
    toRemove.forEach((c) => this.holdDisplayGroup.remove(c));

    if (!this.holdPieceKey) return;
    const template = TETROMINOES[this.holdPieceKey];
    const shape = template.shape;
    const mat = new THREE.MeshStandardMaterial({
      color: template.color,
      roughness: 0.25,
      metalness: 0.3
    });

    const offX = (shape[0].length - 1) * 0.5;
    const offY = (shape.length - 1) * 0.5;

    shape.forEach((row, rIdx) => {
      row.forEach((val, cIdx) => {
        if (val) {
          const mesh = new THREE.Mesh(this.cubeGeo, mat);
          mesh.scale.set(0.7, 0.7, 0.7);
          mesh.position.set((cIdx - offX) * 0.7, (offY - rIdx) * 0.7, 0.35);
          this.holdDisplayGroup.add(mesh);
        }
      });
    });
  }

  checkCollision(posX, posY, matrix) {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          const gridX = posX + c;
          const gridY = posY - r;

          // Out of bounds
          if (gridX < 0 || gridX >= COLS || gridY < 0) {
            return true;
          }

          // Settled block collision
          if (gridY < ROWS && this.grid[gridY][gridX] !== null) {
            return true;
          }
        }
      }
    }
    return false;
  }

  rotateMatrix(matrix, clockwise = true) {
    const N = matrix.length;
    const result = Array.from({ length: N }, () => Array(N).fill(0));
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (clockwise) {
          result[c][N - 1 - r] = matrix[r][c];
        } else {
          result[N - 1 - c][r] = matrix[r][c];
        }
      }
    }
    return result;
  }

  rotatePiece(clockwise = true) {
    if (!this.currentPiece) return;
    const rotated = this.rotateMatrix(this.currentPiece.matrix, clockwise);

    // Wall kicks: try basic shifts (0, -1, +1, -2, +2)
    const kicks = [0, -1, 1, -2, 2];
    for (const offset of kicks) {
      if (!this.checkCollision(this.currentPiece.x + offset, this.currentPiece.y, rotated)) {
        this.currentPiece.x += offset;
        this.currentPiece.matrix = rotated;
        sounds.playClick();
        this.renderCurrentAndGhost();
        return;
      }
    }
  }

  moveLeft() {
    if (!this.currentPiece) return;
    if (!this.checkCollision(this.currentPiece.x - 1, this.currentPiece.y, this.currentPiece.matrix)) {
      this.currentPiece.x--;
      sounds.playClick();
      this.renderCurrentAndGhost();
    }
  }

  moveRight() {
    if (!this.currentPiece) return;
    if (!this.checkCollision(this.currentPiece.x + 1, this.currentPiece.y, this.currentPiece.matrix)) {
      this.currentPiece.x++;
      sounds.playClick();
      this.renderCurrentAndGhost();
    }
  }

  softDrop() {
    if (!this.currentPiece) return;
    if (!this.checkCollision(this.currentPiece.x, this.currentPiece.y - 1, this.currentPiece.matrix)) {
      this.currentPiece.y--;
      this.score += 1;
      this.onScoreUpdate(this.score);
      this.renderCurrentAndGhost();
      this.dropTimer = 0;
    } else {
      this.lockPiece();
    }
  }

  hardDrop() {
    if (!this.currentPiece) return;
    let droppedRows = 0;
    while (!this.checkCollision(this.currentPiece.x, this.currentPiece.y - 1, this.currentPiece.matrix)) {
      this.currentPiece.y--;
      droppedRows++;
    }

    this.score += droppedRows * 2;
    this.onScoreUpdate(this.score);
    sounds.playBounce();
    this.lockPiece();
  }

  getGhostY() {
    if (!this.currentPiece) return 0;
    let ghostY = this.currentPiece.y;
    while (!this.checkCollision(this.currentPiece.x, ghostY - 1, this.currentPiece.matrix)) {
      ghostY--;
    }
    return ghostY;
  }

  renderCurrentAndGhost() {
    // Clear previous piece meshes
    while (this.currentPieceGroup.children.length > 0) {
      this.currentPieceGroup.remove(this.currentPieceGroup.children[0]);
    }
    while (this.ghostPieceGroup.children.length > 0) {
      this.ghostPieceGroup.remove(this.ghostPieceGroup.children[0]);
    }

    if (!this.currentPiece) return;

    const mat = new THREE.MeshStandardMaterial({
      color: this.currentPiece.color,
      roughness: 0.2,
      metalness: 0.4
    });

    const ghostY = this.getGhostY();

    this.currentPiece.matrix.forEach((row, r) => {
      row.forEach((val, c) => {
        if (val) {
          const gridX = this.currentPiece.x + c;
          const gridY = this.currentPiece.y - r;
          const worldX = (gridX - (COLS - 1) / 2) * BLOCK_SIZE;
          const worldY = gridY * BLOCK_SIZE;

          // Active Piece Cube
          const cube = new THREE.Mesh(this.cubeGeo, mat);
          cube.position.set(worldX, worldY, 0);
          this.currentPieceGroup.add(cube);

          // Ghost Cube
          const ghostCubeY = (ghostY - r) * BLOCK_SIZE;
          const ghostCube = new THREE.Mesh(this.cubeGeo, this.ghostMat);
          ghostCube.position.set(worldX, ghostCubeY, 0);
          this.ghostPieceGroup.add(ghostCube);
        }
      });
    });
  }

  lockPiece() {
    if (!this.currentPiece) return;

    this.currentPiece.matrix.forEach((row, r) => {
      row.forEach((val, c) => {
        if (val) {
          const gridX = this.currentPiece.x + c;
          const gridY = this.currentPiece.y - r;
          if (gridY >= 0 && gridY < ROWS && gridX >= 0 && gridX < COLS) {
            this.grid[gridY][gridX] = this.currentPiece.color;

            // Create permanent settled mesh
            const worldX = (gridX - (COLS - 1) / 2) * BLOCK_SIZE;
            const worldY = gridY * BLOCK_SIZE;
            const meshMat = new THREE.MeshStandardMaterial({
              color: this.currentPiece.color,
              roughness: 0.25,
              metalness: 0.3
            });
            const cube = new THREE.Mesh(this.cubeGeo, meshMat);
            cube.position.set(worldX, worldY, 0);
            this.boardGroup.add(cube);
            this.gridMeshes[gridY][gridX] = cube;
          }
        }
      });
    });

    this.currentPiece = null;
    this.renderCurrentAndGhost();

    // Check for full line clears!
    this.checkLineClears();

    // Spawn next
    this.spawnNextPiece();
  }

  checkLineClears() {
    const fullRows = [];
    for (let r = 0; r < ROWS; r++) {
      if (this.grid[r].every((cell) => cell !== null)) {
        fullRows.push(r);
      }
    }

    if (fullRows.length === 0) return;

    // Line clear scoring
    const linePoints = [0, 100, 300, 500, 800];
    const earned = (linePoints[fullRows.length] || 1000) * this.level;
    this.score += earned;
    this.linesCleared += fullRows.length;
    this.level = Math.floor(this.linesCleared / 10) + 1;
    this.dropInterval = Math.max(0.12, 0.8 - (this.level - 1) * 0.065);

    this.onScoreUpdate(this.score);

    if (fullRows.length >= 4) {
      // TETRIS!
      sounds.playWin();
      confetti({ particleCount: 90, spread: 75 });
    } else {
      sounds.playScore();
    }

    // Remove rows from grid & meshes
    fullRows.forEach((r) => {
      for (let c = 0; c < COLS; c++) {
        if (this.gridMeshes[r][c]) {
          this.boardGroup.remove(this.gridMeshes[r][c]);
          this.gridMeshes[r][c] = null;
        }
      }
    });

    // Shift down remaining rows
    let newGrid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    let newMeshes = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    let writeRow = 0;

    for (let r = 0; r < ROWS; r++) {
      if (!fullRows.includes(r)) {
        for (let c = 0; c < COLS; c++) {
          newGrid[writeRow][c] = this.grid[r][c];
          newMeshes[writeRow][c] = this.gridMeshes[r][c];
          if (newMeshes[writeRow][c]) {
            newMeshes[writeRow][c].position.y = writeRow * BLOCK_SIZE;
          }
        }
        writeRow++;
      }
    }

    this.grid = newGrid;
    this.gridMeshes = newMeshes;

    // Update floating stats badge
    if (this.statsSprite) {
      this.scene.remove(this.statsSprite);
      this.statsSprite = this.createTextSprite(`LVL ${this.level} • LINES ${this.linesCleared}`, 'rgba(15, 23, 42, 0.9)', '#10b981', '#10b981');
      this.statsSprite.position.set(-8.5, 8.5, 0);
      this.statsSprite.scale.set(3.5, 0.8, 1);
      this.scene.add(this.statsSprite);
    }
  }

  setupControls() {
    window.addEventListener('keydown', this.handleKeyDown);
  }

  removeControls() {
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown(e) {
    if (!this.isRunning || this.isPaused || this.isGameOver) return;

    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      e.preventDefault();
      this.moveLeft();
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      e.preventDefault();
      this.moveRight();
    } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      this.rotatePiece(true);
    } else if (e.code === 'KeyZ') {
      e.preventDefault();
      this.rotatePiece(false);
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      e.preventDefault();
      this.softDrop();
    } else if (e.code === 'Space') {
      e.preventDefault();
      this.hardDrop();
    } else if (e.code === 'KeyC' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      e.preventDefault();
      this.holdPiece();
    }
  }

  resetState() {
    super.resetState();
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

    // Clear meshes
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.gridMeshes[r][c]) {
          this.boardGroup.remove(this.gridMeshes[r][c]);
          this.gridMeshes[r][c] = null;
        }
      }
    }

    this.level = 1;
    this.linesCleared = 0;
    this.dropInterval = 0.8;
    this.dropTimer = 0;
    this.holdPieceKey = null;
    this.canHold = true;

    this.refillBag();
    this.nextPieceKey = this.pullFromBag();
    this.spawnNextPiece();
    this.updateNextDisplay();
    this.updateHoldDisplay();
  }

  update(delta) {
    if (!this.currentPiece) return;

    this.dropTimer += delta;
    if (this.dropTimer >= this.dropInterval) {
      this.dropTimer = 0;
      if (!this.checkCollision(this.currentPiece.x, this.currentPiece.y - 1, this.currentPiece.matrix)) {
        this.currentPiece.y--;
        this.renderCurrentAndGhost();
      } else {
        this.lockPiece();
      }
    }

    // Ambient floating particles drift
    if (this.ambientParticles) {
      const pos = this.ambientParticles.geometry.attributes.position.array;
      for (let i = 1; i < pos.length; i += 3) {
        pos[i] += delta * 0.4;
        if (pos[i] > 30) pos[i] = 0;
      }
      this.ambientParticles.geometry.attributes.position.needsUpdate = true;
    }
  }
}
