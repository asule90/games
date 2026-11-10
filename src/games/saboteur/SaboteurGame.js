// Saboteur 3D - Three.js WebGL Board Game with Offline & Online Multiplayer
import * as THREE from 'three';
import { BaseGame } from '../BaseGame.js';
import { sounds } from '../../audio/SoundManager.js';
import confetti from 'canvas-confetti';
import {
  CARD_TYPES,
  ROLES,
  TOOLS,
  renderCardCanvas
} from './SaboteurCards.js';
import { SaboteurState } from './SaboteurState.js';
import { SaboteurAI } from './SaboteurAI.js';

export class SaboteurGame extends BaseGame {
  constructor(options = {}) {
    super({ ...options, gameId: 'saboteur' });

    // Mode: 'solo' (offline vs bots) or 'multiplayer' (online websocket)
    this.gameMode = 'solo';
    this.playerCount = 4;
    this.playerName = localStorage.getItem('saboteur_player_name') || 'Penambang Berani';
    this.playerAvatar = '🧔';

    // State Engines
    this.localState = null;
    this.networkState = null;
    this.ws = null;
    this.roomCode = null;
    this.sessionToken = localStorage.getItem('saboteur_session_token') || null;
    this.isHost = false;

    // Board Configuration
    this.cellWidth = 2.4;
    this.cellHeight = 3.3;
    this.boardMinX = -1;
    this.boardMaxX = 9;
    this.boardMinY = -4;
    this.boardMaxY = 4;

    // Interaction State
    this.selectedCardIndex = -1;
    this.cardRotation = 0; // 0 or 180
    this.hoverGridPos = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // Camera Pan/Orbit
    this.isDraggingBoard = false;
    this.dragStart = new THREE.Vector2();
    this.cameraTarget = new THREE.Vector3(8, 0, 0);

    // 3D Objects Cache
    this.cardMeshes = new Map(); // key: "x,y" => THREE.Group
    this.hoverMesh = null;
    this.torchLights = [];
    this.textureCache = new Map();

    // DOM UI Container
    this.uiOverlay = null;

    // Bound listeners
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onWheel = this.onWheel.bind(this);
  }

  setupCamera(width, height) {
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(8, 19, 13);
    this.camera.lookAt(this.cameraTarget);
  }

  setupScene() {
    this.scene.background = new THREE.Color(0x0e0c0b);
    this.scene.fog = new THREE.FogExp2(0x0e0c0b, 0.024);

    // Ambient light - dim cavern tone
    const ambient = new THREE.AmbientLight(0x4a3b32, 1.2);
    this.scene.add(ambient);

    // Directional lantern light
    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.0);
    dirLight.position.set(10, 24, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    this.scene.add(dirLight);

    // Cavern Floor
    const floorGeo = new THREE.PlaneGeometry(60, 40);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x181412,
      roughness: 0.85,
      metalness: 0.15
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.05;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Mine Shaft Wooden Grid Beams
    this.createMineShaftGrid();

    // Flickering Cavern Torches
    this.createTorches();

    // Hover Highlight Mesh
    const hoverGeo = new THREE.BoxGeometry(this.cellWidth, 0.12, this.cellHeight);
    const hoverMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.45,
      wireframe: false
    });
    this.hoverMesh = new THREE.Mesh(hoverGeo, hoverMat);
    this.hoverMesh.visible = false;
    this.scene.add(this.hoverMesh);
  }

  createMineShaftGrid() {
    const gridGroup = new THREE.Group();
    const lineMat = new THREE.LineBasicMaterial({ color: 0x332822, transparent: true, opacity: 0.6 });

    // Draw subtle guideline grid
    for (let x = this.boardMinX; x <= this.boardMaxX + 1; x++) {
      const points = [];
      const wx = (x - 0.5) * this.cellWidth;
      points.push(new THREE.Vector3(wx, 0.01, (this.boardMinY - 0.5) * this.cellHeight));
      points.push(new THREE.Vector3(wx, 0.01, (this.boardMaxY + 0.5) * this.cellHeight));
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      gridGroup.add(new THREE.Line(geom, lineMat));
    }

    for (let y = this.boardMinY; y <= this.boardMaxY + 1; y++) {
      const points = [];
      const wz = (y - 0.5) * this.cellHeight;
      points.push(new THREE.Vector3((this.boardMinX - 0.5) * this.cellWidth, 0.01, wz));
      points.push(new THREE.Vector3((this.boardMaxX + 0.5) * this.cellWidth, 0.01, wz));
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      gridGroup.add(new THREE.Line(geom, lineMat));
    }

    this.scene.add(gridGroup);
  }

  createTorches() {
    const torchPositions = [
      new THREE.Vector3(-1, 2, -10),
      new THREE.Vector3(12, 2, -10),
      new THREE.Vector3(-1, 2, 10),
      new THREE.Vector3(12, 2, 10),
      new THREE.Vector3(20, 2, 0)
    ];

    torchPositions.forEach((pos) => {
      const torchLight = new THREE.PointLight(0xff7722, 2.0, 16);
      torchLight.position.copy(pos);
      this.scene.add(torchLight);

      // Torch flame particle
      const flameGeo = new THREE.SphereGeometry(0.2, 8, 8);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa33 });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.copy(pos);
      this.scene.add(flame);

      this.torchLights.push({ light: torchLight, baseIntensity: 2.0, phase: Math.random() * 10 });
    });
  }

  setupControls() {
    if (!this.container) return;
    this.container.addEventListener('pointerdown', this.onPointerDown);
    this.container.addEventListener('pointermove', this.onPointerMove);
    this.container.addEventListener('pointerup', this.onPointerUp);
    this.container.addEventListener('wheel', this.onWheel, { passive: false });
  }

  init(container) {
    const ok = super.init(container);
    if (!ok) return false;

    this.createDomUI();
    this.startSoloGame(4);
    return true;
  }

  // Start Offline / Solo Game vs AI
  startSoloGame(players = 4) {
    this.gameMode = 'solo';
    this.playerCount = players;
    this.localState = new SaboteurState({ playerCount: players });
    this.update3DBoardFromState(this.localState.getPublicStateForPlayer(0));
    this.renderUI();
    sounds.playPickaxe();
  }

  // Update 3D card meshes based on game state
  update3DBoardFromState(state) {
    if (!state || !state.grid) return;

    const currentKeys = new Set();

    state.grid.forEach((cardData) => {
      const key = `${cardData.x},${cardData.y}`;
      currentKeys.add(key);

      let meshGroup = this.cardMeshes.get(key);
      const textureKey = this.getCardTextureKey(cardData);

      if (!meshGroup || meshGroup.userData.textureKey !== textureKey) {
        if (meshGroup) {
          this.scene.remove(meshGroup);
        }

        meshGroup = this.createCard3DMesh(cardData);
        meshGroup.userData.textureKey = textureKey;
        this.scene.add(meshGroup);
        this.cardMeshes.set(key, meshGroup);
      }
    });

    // Remove cards destroyed by rockfall
    for (const [key, meshGroup] of this.cardMeshes.entries()) {
      if (!currentKeys.has(key)) {
        this.scene.remove(meshGroup);
        this.cardMeshes.delete(key);
      }
    }
  }

  getCardTextureKey(cardData) {
    if (cardData.isGoal && !cardData.revealed) return 'goal_hidden';
    if (cardData.isGoal && cardData.revealed) return `goal_${cardData.isGold ? 'gold' : 'coal'}`;
    if (cardData.isStart) return 'start';
    return `${cardData.templateId || 'path'}_rot${cardData.rotation || 0}`;
  }

  createCard3DMesh(cardData) {
    const group = new THREE.Group();
    const wx = cardData.x * this.cellWidth;
    const wz = cardData.y * this.cellHeight;
    group.position.set(wx, 0.08, wz);

    // Stone Slab Geometry
    const slabGeo = new THREE.BoxGeometry(this.cellWidth * 0.94, 0.14, this.cellHeight * 0.94);

    // Stone Edge Materials
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x3d322c, roughness: 0.9 });
    const bottomMat = new THREE.MeshStandardMaterial({ color: 0x241d1a, roughness: 0.9 });

    // Top Face: Render procedural canvas texture
    const canvas = renderCardCanvas(cardData, 300, 420);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const topMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.7,
      metalness: 0.1
    });

    // Materials array for Box: [right, left, top, bottom, front, back]
    const materials = [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat];
    const mesh = new THREE.Mesh(slabGeo, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // Sub-data
    group.userData = { cardData, x: cardData.x, y: cardData.y };
    return group;
  }

  // Pointer & Camera Interaction
  onPointerDown(e) {
    if (e.target !== this.renderer.domElement) return;

    this.isDraggingBoard = true;
    this.dragStart.set(e.clientX, e.clientY);
  }

  onPointerMove(e) {
    if (this.isDraggingBoard) {
      const dx = (e.clientX - this.dragStart.x) * 0.02;
      const dy = (e.clientY - this.dragStart.y) * 0.02;
      this.dragStart.set(e.clientX, e.clientY);

      this.camera.position.x -= dx;
      this.camera.position.z -= dy;
      this.cameraTarget.x -= dx;
      this.cameraTarget.z -= dy;
      this.camera.lookAt(this.cameraTarget);
      return;
    }

    // Raycast on board plane
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.plane, intersection);

    if (intersection) {
      const gx = Math.round(intersection.x / this.cellWidth);
      const gy = Math.round(intersection.z / this.cellHeight);

      if (gx >= this.boardMinX && gx <= this.boardMaxX && gy >= this.boardMinY && gy <= this.boardMaxY) {
        this.hoverGridPos = { x: gx, y: gy };
        this.hoverMesh.position.set(gx * this.cellWidth, 0.1, gy * this.cellHeight);
        this.hoverMesh.visible = true;

        // Check placement validity for highlight color
        const state = this.getCurrentState();
        if (state && this.selectedCardIndex >= 0 && state.myHand) {
          const card = state.myHand[this.selectedCardIndex];
          if (card && card.type === CARD_TYPES.PATH) {
            const tempCard = { ...card };
            if (this.cardRotation === 180) {
              tempCard.edges = [card.edges[2], card.edges[3], card.edges[0], card.edges[1]];
            }

            const val = this.localState ? this.localState.isValidPathPlacement(tempCard, gx, gy) : { valid: true };
            this.hoverMesh.material.color.setHex(val.valid ? 0x10b981 : 0xef4444);
          } else {
            this.hoverMesh.material.color.setHex(0x3b82f6);
          }
        }
        return;
      }
    }

    this.hoverGridPos = null;
    this.hoverMesh.visible = false;
  }

  onPointerUp(e) {
    if (this.isDraggingBoard) {
      this.isDraggingBoard = false;
      return;
    }

    if (this.hoverGridPos) {
      this.handleGridClick(this.hoverGridPos.x, this.hoverGridPos.y);
    }
  }

  onWheel(e) {
    e.preventDefault();
    const zoomDelta = e.deltaY * 0.015;
    this.camera.position.y = THREE.MathUtils.clamp(this.camera.position.y + zoomDelta, 8, 32);
    this.camera.position.z = THREE.MathUtils.clamp(this.camera.position.z + zoomDelta * 0.7, 5, 26);
    this.camera.lookAt(this.cameraTarget);
  }

  // Handle clicking a grid cell
  handleGridClick(x, y) {
    const state = this.getCurrentState();
    if (!state || this.selectedCardIndex < 0 || !state.myHand) return;

    const card = state.myHand[this.selectedCardIndex];
    if (!card) return;

    // 1. Path Card Placement
    if (card.type === CARD_TYPES.PATH) {
      if (this.gameMode === 'solo') {
        const res = this.localState.playPathCard(0, card.uid, x, y, this.cardRotation);
        if (res.success) {
          sounds.playCardPlace();
          this.selectedCardIndex = -1;
          this.onActionCompleted();
        } else {
          this.showToast(res.error, 'error');
        }
      } else {
        this.sendWsMessage('play_path', { cardUid: card.uid, x, y, rotation: this.cardRotation });
        this.selectedCardIndex = -1;
      }
    }

    // 2. Rockfall Action on Grid Card
    else if (card.type === CARD_TYPES.ACTION && card.actionType === 'rockfall') {
      if (this.gameMode === 'solo') {
        const res = this.localState.playActionCard(0, card.uid, { x, y });
        if (res.success) {
          sounds.playRockfall();
          this.selectedCardIndex = -1;
          this.onActionCompleted();
        } else {
          this.showToast(res.error, 'error');
        }
      } else {
        this.sendWsMessage('play_action', { cardUid: card.uid, targetInfo: { x, y } });
        this.selectedCardIndex = -1;
      }
    }

    // 3. Map Inspection on Goal Card
    else if (card.type === CARD_TYPES.ACTION && card.actionType === 'map') {
      const goalIdx = (this.localState ? this.localState.goalCards : []).findIndex((g) => g.x === x && g.y === y);
      if (goalIdx !== -1) {
        if (this.gameMode === 'solo') {
          const res = this.localState.playActionCard(0, card.uid, { goalIndex: goalIdx });
          if (res.success) {
            sounds.playScore();
            const isGold = this.localState.players[0].knownGoals.get(goalIdx);
            this.showToast(isGold ? '🏆 PETA MENGUNGKAP: Ini EMAS ASLI!' : '🪨 PETA MENGUNGKAP: Ini hanya batu arang.', 'info');
            this.selectedCardIndex = -1;
            this.onActionCompleted();
          } else {
            this.showToast(res.error, 'error');
          }
        } else {
          this.sendWsMessage('play_action', { cardUid: card.uid, targetInfo: { goalIndex: goalIdx } });
          this.selectedCardIndex = -1;
        }
      }
    }
  }

  // After human player completes an action in solo mode, run AI turns if needed
  onActionCompleted() {
    this.update3DBoardFromState(this.localState.getPublicStateForPlayer(0));
    this.renderUI();

    if (this.localState.roundOver) {
      if (this.localState.winnerRole === ROLES.MINER) {
        sounds.playGoldFound();
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      } else {
        sounds.playGameOver();
      }
      return;
    }

    // Trigger AI Bots
    this.runAIBotsLoop();
  }

  runAIBotsLoop() {
    if (this.gameMode !== 'solo' || !this.localState || this.localState.roundOver) return;

    const curr = this.localState.getCurrentPlayer();
    if (curr && curr.isAI) {
      setTimeout(() => {
        if (!this.localState.roundOver && this.localState.getCurrentPlayer().isAI) {
          SaboteurAI.executeTurn(this.localState, this.localState.currentTurnIndex);
          sounds.playCardPlace();
          this.update3DBoardFromState(this.localState.getPublicStateForPlayer(0));
          this.renderUI();

          if (!this.localState.roundOver) {
            this.runAIBotsLoop();
          } else {
            if (this.localState.winnerRole === ROLES.MINER) {
              sounds.playGoldFound();
              confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
            } else {
              sounds.playGameOver();
            }
          }
        }
      }, 900);
    }
  }

  getCurrentState() {
    if (this.gameMode === 'solo') {
      return this.localState ? this.localState.getPublicStateForPlayer(0) : null;
    }
    return this.networkState;
  }

  // UI Overlay Generation
  createDomUI() {
    if (this.uiOverlay) this.uiOverlay.remove();

    this.uiOverlay = document.createElement('div');
    this.uiOverlay.id = 'saboteur-ui-overlay';
    this.uiOverlay.innerHTML = `
      <style>
        #saboteur-ui-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-family: var(--font-main, 'Plus Jakarta Sans', sans-serif);
          color: #fff;
          z-index: 20;
          overflow: hidden;
        }
        .sabo-interactive { pointer-events: auto; }
        .sabo-top-bar {
          display: flex;
          justify-content: space-between;
          padding: 0.8rem 1rem;
          background: linear-gradient(180deg, rgba(14,12,11,0.92) 0%, rgba(14,12,11,0) 100%);
        }
        .sabo-pill {
          background: rgba(36,29,26,0.85);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,215,0,0.25);
          padding: 0.4rem 0.9rem;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.88rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }
        .sabo-btn {
          background: #d97706;
          color: #fff;
          border: none;
          padding: 0.45rem 1rem;
          border-radius: 9999px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sabo-btn:hover { background: #b45309; transform: translateY(-1px); }
        .sabo-btn-secondary {
          background: rgba(255,255,255,0.15);
          color: #f3f4f6;
        }
        .sabo-btn-secondary:hover { background: rgba(255,255,255,0.25); }
        .sabo-sidebar {
          position: absolute;
          top: 4.5rem;
          left: 1rem;
          width: 250px;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .sabo-player-card {
          background: rgba(28,24,22,0.85);
          backdrop-filter: blur(6px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 0.4rem 0.7rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.82rem;
          transition: border-color 0.2s;
        }
        .sabo-player-card.active-turn {
          border-color: #fbbf24;
          background: rgba(217,119,6,0.22);
          box-shadow: 0 0 12px rgba(251,191,36,0.3);
        }
        .sabo-broken-badge {
          background: #991b1b;
          color: #fecaca;
          font-size: 0.72rem;
          padding: 1px 6px;
          border-radius: 4px;
          font-weight: bold;
        }
        .sabo-log-drawer {
          position: absolute;
          top: 4.5rem;
          right: 1rem;
          width: 260px;
          max-height: 220px;
          overflow-y: auto;
          background: rgba(20,16,15,0.85);
          backdrop-filter: blur(6px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 0.6rem;
          font-size: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        .sabo-bottom-tray {
          background: linear-gradient(0deg, rgba(14,12,11,0.96) 0%, rgba(14,12,11,0.8) 70%, rgba(14,12,11,0) 100%);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.6rem;
        }
        .sabo-hand-cards {
          display: flex;
          gap: 0.6rem;
          overflow-x: auto;
          max-width: 95vw;
          padding: 0.4rem;
        }
        .sabo-card-thumb {
          width: 86px;
          height: 122px;
          border-radius: 8px;
          border: 2px solid #52443c;
          background: #231c19;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: transform 0.15s, border-color 0.15s;
          user-select: none;
        }
        .sabo-card-thumb:hover { transform: translateY(-6px); border-color: #fbbf24; }
        .sabo-card-thumb.selected {
          transform: translateY(-12px);
          border-color: #10b981;
          box-shadow: 0 6px 18px rgba(16,185,129,0.4);
        }
        .sabo-action-panel {
          display: flex;
          gap: 0.6rem;
          align-items: center;
        }
        .sabo-modal {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
        }
        .sabo-modal-content {
          background: #241d1a;
          border: 2px solid #fbbf24;
          border-radius: 16px;
          padding: 2rem;
          max-width: 480px;
          width: 90%;
          text-align: center;
          box-shadow: 0 12px 36px rgba(0,0,0,0.6);
        }
        .sabo-toast {
          position: absolute;
          top: 15%;
          left: 50%;
          transform: translateX(-50%);
          padding: 0.6rem 1.4rem;
          background: rgba(16,185,129,0.9);
          border-radius: 9999px;
          font-weight: 700;
          font-size: 0.95rem;
          box-shadow: 0 4px 16px rgba(0,0,0,0.4);
          z-index: 60;
          display: none;
        }
      </style>

      <!-- Toast -->
      <div id="sabo-toast" class="sabo-toast">Pesan notifikasi</div>

      <!-- Top HUD Bar -->
      <div class="sabo-top-bar">
        <div style="display:flex; gap:0.6rem;">
          <div class="sabo-pill">
            <span>Ronde:</span>
            <strong id="sabo-round-text" style="color:#fbbf24;">1 / 3</strong>
          </div>
          <div class="sabo-pill">
            <span>Dek:</span>
            <strong id="sabo-deck-count" style="color:#60a5fa;">44</strong>
          </div>
          <div class="sabo-pill">
            <span>Mode:</span>
            <span id="sabo-mode-text" style="color:#34d399;">Solo vs AI</span>
          </div>
        </div>

        <div style="display:flex; gap:0.6rem;">
          <button id="sabo-btn-mode-toggle" class="sabo-btn sabo-interactive" style="background:#4f46e5;">
            🌐 Multiplayer Rooms
          </button>
          <button id="sabo-btn-peek-role" class="sabo-btn sabo-btn-secondary sabo-interactive">
            👁️ Intip Peran
          </button>
        </div>
      </div>

      <!-- Left Sidebar: Players List -->
      <div class="sabo-sidebar" id="sabo-players-list"></div>

      <!-- Right Log Drawer -->
      <div class="sabo-log-drawer" id="sabo-log-list"></div>

      <!-- Bottom Hand Tray -->
      <div class="sabo-bottom-tray">
        <div class="sabo-action-panel sabo-interactive">
          <button id="sabo-btn-rotate" class="sabo-btn sabo-btn-secondary" title="Putar Kartu 180 Derajat">
            🔄 Putar (180°)
          </button>
          <button id="sabo-btn-discard" class="sabo-btn" style="background:#dc2626;" title="Buang 1 Kartu dan Akhiri Giliran">
            🗑️ Buang Kartu (Pass)
          </button>
          <span id="sabo-turn-hint" style="font-size:0.85rem; color:#9ca3af; margin-left:0.5rem;">
            Pilih kartu di bawah, lalu klik petak tambang untuk memasang.
          </span>
        </div>

        <div class="sabo-hand-cards sabo-interactive" id="sabo-hand-tray"></div>
      </div>

      <!-- Multiplayer Lobby Modal (Hidden by default) -->
      <div id="sabo-multiplayer-modal" class="sabo-modal sabo-interactive" style="display:none;">
        <div class="sabo-modal-content">
          <h2 style="color:#fbbf24; margin-bottom:0.5rem; font-size:1.5rem;">⛏️ SABOTEUR MULTIPLAYER</h2>
          <p style="color:#9ca3af; font-size:0.88rem; margin-bottom:1.5rem;">
            Mainkan bersama 3-10 teman dengan room code atau scan QR code dari HP masing-masing!
          </p>

          <div style="display:flex; flex-direction:column; gap:0.8rem; text-align:left; margin-bottom:1.2rem;">
            <div>
              <label style="font-size:0.8rem; color:#d1d5db;">Nama / Nickname Anda:</label>
              <input id="sabo-input-name" type="text" value="${this.playerName}" style="width:100%; padding:0.5rem; background:#181412; border:1px solid #52443c; border-radius:6px; color:#fff; font-weight:700; margin-top:0.2rem;" />
            </div>

            <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
              <button id="sabo-btn-create-room" class="sabo-btn" style="flex:1;">✨ Buat Room Baru</button>
            </div>

            <div style="display:flex; align-items:center; gap:0.5rem; margin-top:0.5rem;">
              <input id="sabo-input-room-code" type="text" placeholder="Masukkan Kode (e.g. GOLD-7)" style="flex:1; padding:0.5rem; background:#181412; border:1px solid #52443c; border-radius:6px; color:#fbbf24; font-weight:800; text-transform:uppercase;" />
              <button id="sabo-btn-join-room" class="sabo-btn sabo-btn-secondary">Gabung</button>
            </div>
          </div>

          <!-- Active Room View inside Modal -->
          <div id="sabo-room-active-view" style="display:none; border-top:1px solid #3d322c; padding-top:1rem; margin-top:1rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.8rem;">
              <div>
                <span style="color:#9ca3af; font-size:0.8rem;">Kode Room:</span>
                <div id="sabo-active-room-code" style="font-size:1.4rem; font-weight:900; color:#fbbf24;">MINE-10</div>
              </div>
              <div id="sabo-room-link-qr" style="background:#fff; padding:4px; border-radius:4px; width:64px; height:64px; display:flex; align-items:center; justify-content:center; color:#000; font-size:0.7rem; font-weight:bold;">
                📱 QR
              </div>
            </div>

            <div id="sabo-room-players-chips" style="display:flex; gap:0.4rem; flex-wrap:wrap; margin-bottom:1rem; min-height:40px;"></div>

            <div style="display:flex; gap:0.5rem;">
              <button id="sabo-btn-add-bot" class="sabo-btn sabo-btn-secondary" style="flex:1;">+ Tambah Bot AI</button>
              <button id="sabo-btn-start-multi" class="sabo-btn" style="flex:1.2; background:#10b981;">🚀 Mulai Game</button>
            </div>
          </div>

          <button id="sabo-btn-close-modal" class="sabo-btn sabo-btn-secondary" style="margin-top:1.2rem; width:100%;">
            Tutup / Main Solo Offline
          </button>
        </div>
      </div>
    `;

    this.container.appendChild(this.uiOverlay);
    this.attachUIEventListeners();
  }

  attachUIEventListeners() {
    const btnPeek = document.getElementById('sabo-btn-peek-role');
    btnPeek?.addEventListener('click', () => {
      const state = this.getCurrentState();
      if (!state) return;
      const roleText = state.myRole === ROLES.MINER ? '⛏️ PENAMBANG EMAS (Gali terowongan menuju EMAS!)' : '💣 PENYABOT (Gagalkan penambang & pasang jalan buntu!)';
      this.showToast(`Peran Anda: ${roleText}`, 'info', 3500);
    });

    const btnRotate = document.getElementById('sabo-btn-rotate');
    btnRotate?.addEventListener('click', () => {
      this.cardRotation = this.cardRotation === 0 ? 180 : 0;
      this.renderHandTray();
      sounds.playClick();
    });

    const btnDiscard = document.getElementById('sabo-btn-discard');
    btnDiscard?.addEventListener('click', () => {
      const state = this.getCurrentState();
      if (!state || this.selectedCardIndex < 0 || !state.myHand) {
        this.showToast('Pilih salah satu kartu di tangan untuk dibuang!', 'error');
        return;
      }
      const card = state.myHand[this.selectedCardIndex];
      if (this.gameMode === 'solo') {
        const res = this.localState.discardCard(0, card.uid);
        if (res.success) {
          sounds.playClick();
          this.selectedCardIndex = -1;
          this.onActionCompleted();
        }
      } else {
        this.sendWsMessage('discard', { cardUid: card.uid });
        this.selectedCardIndex = -1;
      }
    });

    // Multiplayer Modal
    const btnModeToggle = document.getElementById('sabo-btn-mode-toggle');
    const modal = document.getElementById('sabo-multiplayer-modal');
    btnModeToggle?.addEventListener('click', () => {
      modal.style.display = 'flex';
    });

    const btnCloseModal = document.getElementById('sabo-btn-close-modal');
    btnCloseModal?.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    const btnCreateRoom = document.getElementById('sabo-btn-create-room');
    btnCreateRoom?.addEventListener('click', () => {
      const nameInput = document.getElementById('sabo-input-name');
      this.playerName = nameInput?.value.trim() || 'Dwarf Player';
      localStorage.setItem('saboteur_player_name', this.playerName);
      this.initWebSocket(() => {
        this.sendWsMessage('create_room', { name: this.playerName, avatar: this.playerAvatar });
      });
    });

    const btnJoinRoom = document.getElementById('sabo-btn-join-room');
    btnJoinRoom?.addEventListener('click', () => {
      const codeInput = document.getElementById('sabo-input-room-code');
      const nameInput = document.getElementById('sabo-input-name');
      const code = codeInput?.value.trim().toUpperCase();
      this.playerName = nameInput?.value.trim() || 'Dwarf Player';
      localStorage.setItem('saboteur_player_name', this.playerName);
      if (!code) {
        this.showToast('Masukkan kode ruangan terlebih dahulu!', 'error');
        return;
      }
      this.initWebSocket(() => {
        this.sendWsMessage('join_room', { roomCode: code, name: this.playerName, avatar: this.playerAvatar, sessionToken: this.sessionToken });
      });
    });

    const btnAddBot = document.getElementById('sabo-btn-add-bot');
    btnAddBot?.addEventListener('click', () => {
      this.sendWsMessage('add_bot', {});
    });

    const btnStartMulti = document.getElementById('sabo-btn-start-multi');
    btnStartMulti?.addEventListener('click', () => {
      this.sendWsMessage('start_game', {});
    });
  }

  // WebSocket Connection for Multiplayer
  initWebSocket(onOpenCallback) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (onOpenCallback) onOpenCallback();
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('Connected to Saboteur WebSocket Server');
        if (onOpenCallback) onOpenCallback();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWsMessage(data);
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket connection error, falling back to solo mode:', err);
        this.showToast('Server multiplayer belum terhubung. Beralih ke Solo AI.', 'error');
      };
    } catch (e) {
      console.warn('WS Init failed:', e);
    }
  }

  sendWsMessage(type, payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  handleWsMessage(data) {
    if (data.type === 'room_created' || data.type === 'room_joined') {
      this.roomCode = data.roomCode;
      this.sessionToken = data.sessionToken;
      this.isHost = data.isHost;
      localStorage.setItem('saboteur_session_token', this.sessionToken);
      this.gameMode = 'multiplayer';

      const activeView = document.getElementById('sabo-room-active-view');
      const codeDisplay = document.getElementById('sabo-active-room-code');
      if (activeView) activeView.style.display = 'block';
      if (codeDisplay) codeDisplay.textContent = this.roomCode;
      this.showToast(`Berhasil masuk ke room ${this.roomCode}!`, 'info');
    } else if (data.type === 'lobby_state') {
      this.renderLobbyPlayers(data.players);
    } else if (data.type === 'game_state') {
      const modal = document.getElementById('sabo-multiplayer-modal');
      if (modal) modal.style.display = 'none';

      this.networkState = data.gameState;
      this.update3DBoardFromState(this.networkState);
      this.renderUI();
    } else if (data.type === 'error') {
      this.showToast(data.message, 'error');
    }
  }

  renderLobbyPlayers(players) {
    const chipsContainer = document.getElementById('sabo-room-players-chips');
    if (!chipsContainer || !players) return;
    chipsContainer.innerHTML = players.map((p) => `
      <span style="background:#3d322c; border:1px solid #52443c; padding:3px 8px; border-radius:6px; font-size:0.8rem; font-weight:700;">
        ${p.avatar} ${p.name} ${p.isAI ? '<span style="color:#60a5fa;">(Bot)</span>' : ''}
      </span>
    `).join('');
  }

  // Render Full DOM UI
  renderUI() {
    const state = this.getCurrentState();
    if (!state) return;

    // 1. Top bar stats
    const roundText = document.getElementById('sabo-round-text');
    if (roundText) roundText.textContent = `${state.round} / ${state.maxRounds}`;

    const deckCount = document.getElementById('sabo-deck-count');
    if (deckCount) deckCount.textContent = state.deckCount;

    const modeText = document.getElementById('sabo-mode-text');
    if (modeText) modeText.textContent = this.gameMode === 'solo' ? 'Solo vs AI (Offline)' : `Room ${this.roomCode}`;

    // 2. Players list sidebar
    const playersList = document.getElementById('sabo-players-list');
    if (playersList && state.players) {
      playersList.innerHTML = state.players.map((p, idx) => {
        const isCurrent = idx === state.currentTurnIndex;
        const brokenBadges = p.brokenTools.map((t) => {
          const icon = t === TOOLS.PICKAXE ? '⛏️❌' : t === TOOLS.LANTERN ? '💡❌' : '🛒❌';
          return `<span class="sabo-broken-badge">${icon}</span>`;
        }).join(' ');

        return `
          <div class="sabo-player-card ${isCurrent ? 'active-turn' : ''}">
            <div style="display:flex; align-items:center; gap:0.4rem;">
              <span style="font-size:1.1rem;">${p.avatar}</span>
              <div>
                <strong style="color:${isCurrent ? '#fbbf24' : '#f3f4f6'};">${p.name}</strong>
                <div style="font-size:0.72rem; color:#9ca3af;">🪙 ${p.goldNuggets} Emas</div>
              </div>
            </div>
            <div>${brokenBadges}</div>
          </div>
        `;
      }).join('');
    }

    // 3. Log list
    const logList = document.getElementById('sabo-log-list');
    if (logList && state.logs) {
      logList.innerHTML = state.logs.map((log) => `
        <div style="color:#d1d5db; line-height:1.25;">
          <span style="color:#fbbf24; font-size:0.68rem;">[${log.time}]</span> ${log.text}
        </div>
      `).join('');
    }

    // 4. Hand Tray
    this.renderHandTray();
  }

  renderHandTray() {
    const state = this.getCurrentState();
    const tray = document.getElementById('sabo-hand-tray');
    if (!tray || !state || !state.myHand) return;

    tray.innerHTML = '';

    state.myHand.forEach((card, idx) => {
      const thumb = document.createElement('div');
      thumb.className = `sabo-card-thumb ${idx === this.selectedCardIndex ? 'selected' : ''}`;

      // Preview canvas inside card thumbnail
      const canvas = renderCardCanvas(card, 160, 220);
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.borderRadius = '6px';
      if (this.selectedCardIndex === idx && this.cardRotation === 180 && card.type === CARD_TYPES.PATH) {
        canvas.style.transform = 'rotate(180deg)';
      }

      thumb.appendChild(canvas);
      thumb.addEventListener('click', () => {
        this.selectedCardIndex = this.selectedCardIndex === idx ? -1 : idx;
        sounds.playClick();
        this.renderHandTray();
      });

      tray.appendChild(thumb);
    });
  }

  showToast(msg, type = 'info', duration = 2400) {
    const toast = document.getElementById('sabo-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.background = type === 'error' ? 'rgba(220,38,38,0.95)' : 'rgba(16,185,129,0.95)';
    toast.style.display = 'block';
    setTimeout(() => {
      if (toast) toast.style.display = 'none';
    }, duration);
  }

  update(delta) {
    super.update(delta);

    // Cavern torches flickering animation
    const time = this.clock.getElapsedTime();
    this.torchLights.forEach((t) => {
      t.light.intensity = t.baseIntensity + Math.sin(time * 8 + t.phase) * 0.45;
    });
  }

  destroy() {
    if (this.uiOverlay) {
      this.uiOverlay.remove();
      this.uiOverlay = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    window.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    super.destroy();
  }
}
