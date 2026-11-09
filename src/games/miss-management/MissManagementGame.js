import * as THREE from 'three';
import { BaseGame } from '../BaseGame.js';
import { sounds } from '../../audio/SoundManager.js';
import confetti from 'canvas-confetti';

export class MissManagementGame extends BaseGame {
  constructor(options = {}) {
    super({ ...options, gameId: 'miss-management' });

    // Office Game Economy & State
    this.cash = 600;
    this.dayTime = 9 * 60; // 9:00 AM (in minutes, ends at 17:00 / 5:00 PM)
    this.dayEndTime = 17 * 60;
    this.dayLengthSeconds = 120; // 2 minutes real time per office shift
    this.timeScale = (this.dayEndTime - this.dayTime) / this.dayLengthSeconds;

    this.shiftNumber = 1;
    this.targetRevenue = 2400;
    this.projectsCompleted = 0;
    this.projectsFailed = 0;

    // Upgrades
    this.upgrades = {
      turboEspresso: false, // $400
      ergonomicChairs: false, // $500
      dualMonitors: false, // $600
      zenPlants: false // $350
    };

    // Coffee Station State
    this.coffeeCupsReady = 2;
    this.maxCoffeeCups = 4;
    this.isBrewing = false;
    this.brewTimer = 0;
    this.brewDuration = 5;

    // Employees list
    this.employees = [
      {
        id: 'tim',
        name: 'Tim',
        role: 'Dev / IT',
        skill: 'code',
        color: 0x3b82f6,
        hairColor: 0x854d0e,
        deskPos: new THREE.Vector3(-6, 0, -3),
        chairPos: new THREE.Vector3(-6, 0, -2),
        state: 'idle', // idle, working, coffee, break, panic
        stress: 15, // 0 to 100
        speedBoost: 1.0,
        boostTimer: 0,
        activeProject: null,
        meshGroup: null,
        statusSprite: null
      },
      {
        id: 'tara',
        name: 'Tara',
        role: 'Designer',
        skill: 'design',
        color: 0xec4899,
        hairColor: 0xef4444,
        deskPos: new THREE.Vector3(-2, 0, -3),
        chairPos: new THREE.Vector3(-2, 0, -2),
        state: 'idle',
        stress: 10,
        speedBoost: 1.0,
        boostTimer: 0,
        activeProject: null,
        meshGroup: null,
        statusSprite: null
      },
      {
        id: 'winston',
        name: 'Winston',
        role: 'Auditor',
        skill: 'audit',
        color: 0x10b981,
        hairColor: 0x9ca3af,
        deskPos: new THREE.Vector3(2, 0, -3),
        chairPos: new THREE.Vector3(2, 0, -2),
        state: 'idle',
        stress: 20,
        speedBoost: 1.0,
        boostTimer: 0,
        activeProject: null,
        meshGroup: null,
        statusSprite: null
      },
      {
        id: 'luke',
        name: 'Luke',
        role: 'Copywriter',
        skill: 'copy',
        color: 0xf59e0b,
        hairColor: 0x1e293b,
        deskPos: new THREE.Vector3(6, 0, -3),
        chairPos: new THREE.Vector3(6, 0, -2),
        state: 'idle',
        stress: 5,
        speedBoost: 1.0,
        boostTimer: 0,
        activeProject: null,
        meshGroup: null,
        statusSprite: null
      }
    ];

    // Projects Queue
    this.projectsQueue = [];
    this.completedBatches = [];
    this.projectSpawnTimer = 2.0;

    // Raycasting & Interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clickableObjects = [];
    this.selectedEmployee = null;

    this.handleCanvasClick = this.handleCanvasClick.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
  }

  setupCamera(width, height) {
    this.cameraDistance = 16;
    const aspect = width / height;
    this.camera = new THREE.OrthographicCamera(
      -this.cameraDistance * aspect,
      this.cameraDistance * aspect,
      this.cameraDistance,
      -this.cameraDistance,
      -50,
      200
    );
    // Isometric angle
    this.camera.position.set(20, 24, 20);
    this.camera.lookAt(0, 0, -1);
  }

  setupScene() {
    this.scene.background = new THREE.Color(0x0a0f1d);

    // Warm office ambient light
    const ambientLight = new THREE.AmbientLight(0xfff5ea, 0.75);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    dirLight.position.set(15, 30, 15);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    const softFillLight = new THREE.DirectionalLight(0xaaccff, 0.5);
    softFillLight.position.set(-20, 15, -15);
    this.scene.add(softFillLight);

    // Build the 3D Office Environment
    this.buildOfficeArchitecture();
    this.buildDesksAndFurniture();
    this.buildBreakArea();
    this.buildDispatchStation();

    // Spawn 3D Employee Avatars
    this.spawnEmployeeAvatars();

    // Initial project batch
    this.spawnProject();
    this.spawnProject();
  }

  buildOfficeArchitecture() {
    // Office Floor (Warm polished wood parquet / modern tech vinyl)
    const floorGeo = new THREE.BoxGeometry(22, 0.4, 18);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1e2438,
      roughness: 0.35,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, -0.2, 0);
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Grid Floor lines
    const grid = new THREE.GridHelper(22, 22, 0x00f0ff, 0x1e3a5f);
    grid.position.y = 0.02;
    this.scene.add(grid);

    // North & West Backing Walls (Glass & Neon Trim)
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x151b2e,
      roughness: 0.5,
      metalness: 0.2
    });

    const northWallGeo = new THREE.BoxGeometry(22, 6, 0.4);
    const northWall = new THREE.Mesh(northWallGeo, wallMat);
    northWall.position.set(0, 3, -9);
    this.scene.add(northWall);

    const westWallGeo = new THREE.BoxGeometry(0.4, 6, 18);
    const westWall = new THREE.Mesh(westWallGeo, wallMat);
    westWall.position.set(-11, 3, 0);
    this.scene.add(westWall);

    // Glass Windows on North Wall overlooking futuristic skyline
    for (let x = -8; x <= 8; x += 4) {
      const winGeo = new THREE.PlaneGeometry(3, 3.5);
      const winMat = new THREE.MeshBasicMaterial({
        color: 0x0ea5e9,
        transparent: true,
        opacity: 0.25
      });
      const win = new THREE.Mesh(winGeo, winMat);
      win.position.set(x, 3.5, -8.78);
      this.scene.add(win);
    }
  }

  buildDesksAndFurniture() {
    this.employees.forEach((emp) => {
      const deskGroup = new THREE.Group();
      deskGroup.position.copy(emp.deskPos);

      // Wooden Desktop
      const topGeo = new THREE.BoxGeometry(2.8, 0.15, 1.6);
      const topMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 });
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.y = 1.4;
      deskGroup.add(top);

      // Steel Desk Legs
      const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.4);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 });
      for (const lx of [-1.25, 1.25]) {
        for (const lz of [-0.65, 0.65]) {
          const leg = new THREE.Mesh(legGeo, legMat);
          leg.position.set(lx, 0.7, lz);
          deskGroup.add(leg);
        }
      }

      // Computer Monitor 1
      const monGeo = new THREE.BoxGeometry(1.0, 0.65, 0.08);
      const monMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x007799,
        emissiveIntensity: 0.5
      });
      const mon = new THREE.Mesh(monGeo, monMat);
      mon.position.set(-0.35, 1.9, -0.3);
      deskGroup.add(mon);

      // Monitor Stand
      const standGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4);
      const stand = new THREE.Mesh(standGeo, legMat);
      stand.position.set(-0.35, 1.6, -0.3);
      deskGroup.add(stand);

      // Keyboard & Glowing Mousepad
      const kbGeo = new THREE.BoxGeometry(0.7, 0.02, 0.28);
      const kbMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
      const kb = new THREE.Mesh(kbGeo, kbMat);
      kb.position.set(-0.1, 1.5, 0.2);
      deskGroup.add(kb);

      // Desk lamp
      const lampGeo = new THREE.ConeGeometry(0.2, 0.3, 12);
      const lampMat = new THREE.MeshStandardMaterial({ color: emp.color, emissive: emp.color, emissiveIntensity: 0.6 });
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(1.1, 1.8, -0.4);
      deskGroup.add(lamp);

      // Ergonomic Chair
      const chairGroup = new THREE.Group();
      chairGroup.position.copy(emp.chairPos);
      const seatGeo = new THREE.BoxGeometry(0.9, 0.1, 0.9);
      const seatMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
      const seat = new THREE.Mesh(seatGeo, seatMat);
      seat.position.y = 0.9;
      chairGroup.add(seat);
      const backGeo = new THREE.BoxGeometry(0.9, 1.0, 0.1);
      const back = new THREE.Mesh(backGeo, seatMat);
      back.position.set(0, 1.4, 0.45);
      chairGroup.add(back);
      this.scene.add(chairGroup);

      // Clickable collider over the desk for interactions
      const colliderGeo = new THREE.BoxGeometry(3.0, 2.5, 2.2);
      const colliderMat = new THREE.MeshBasicMaterial({ visible: false });
      const collider = new THREE.Mesh(colliderGeo, colliderMat);
      collider.position.set(emp.deskPos.x, 1.4, emp.deskPos.z);
      collider.userData = { type: 'desk', employeeId: emp.id };
      this.scene.add(collider);
      this.clickableObjects.push(collider);

      this.scene.add(deskGroup);
    });
  }

  buildBreakArea() {
    const breakGroup = new THREE.Group();
    breakGroup.position.set(-7.5, 0, 4.5);

    // Coffee Counter
    const counterGeo = new THREE.BoxGeometry(4.0, 1.4, 1.8);
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x222a42, roughness: 0.3 });
    const counter = new THREE.Mesh(counterGeo, counterMat);
    counter.position.y = 0.7;
    breakGroup.add(counter);

    // 3D Espresso Machine
    const machineGeo = new THREE.BoxGeometry(1.4, 1.0, 0.9);
    const machineMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      metalness: 0.8,
      roughness: 0.2
    });
    this.espressoMachine = new THREE.Mesh(machineGeo, machineMat);
    this.espressoMachine.position.set(-0.8, 1.9, 0);
    breakGroup.add(this.espressoMachine);

    // Coffee Cups on Counter
    this.coffeeCupMeshes = [];
    for (let c = 0; c < 4; c++) {
      const cupGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.25);
      const cupMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const cup = new THREE.Mesh(cupGeo, cupMat);
      cup.position.set(0.4 + (c % 2) * 0.4, 1.55, -0.3 + Math.floor(c / 2) * 0.4);
      breakGroup.add(cup);
      this.coffeeCupMeshes.push(cup);
    }

    // Comfortable Velvet Break Sofa
    const sofaGeo = new THREE.BoxGeometry(4.2, 0.7, 1.6);
    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.7 });
    const sofa = new THREE.Mesh(sofaGeo, sofaMat);
    sofa.position.set(1.5, 0.45, 2.5);
    breakGroup.add(sofa);

    // Water cooler
    const coolerGeo = new THREE.CylinderGeometry(0.35, 0.35, 2.0);
    const coolerMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, transparent: true, opacity: 0.8 });
    const cooler = new THREE.Mesh(coolerGeo, coolerMat);
    cooler.position.set(-2.4, 1.0, 0);
    breakGroup.add(cooler);

    // Clickable trigger for Coffee Station
    const coffeeColliderGeo = new THREE.BoxGeometry(5.0, 3.0, 3.5);
    const coffeeColliderMat = new THREE.MeshBasicMaterial({ visible: false });
    const coffeeCollider = new THREE.Mesh(coffeeColliderGeo, coffeeColliderMat);
    coffeeCollider.position.set(-7.5, 1.5, 4.5);
    coffeeCollider.userData = { type: 'coffeeStation' };
    this.scene.add(coffeeCollider);
    this.clickableObjects.push(coffeeCollider);

    this.scene.add(breakGroup);
  }

  buildDispatchStation() {
    const dispatchGroup = new THREE.Group();
    dispatchGroup.position.set(7.5, 0, 4.5);

    // High Tech Laser Copier & Delivery Table
    const tableGeo = new THREE.BoxGeometry(3.6, 1.3, 2.2);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = 0.65;
    dispatchGroup.add(table);

    // Glowing Laser Copier
    const printerGeo = new THREE.BoxGeometry(1.8, 1.2, 1.4);
    const printerMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.6,
      metalness: 0.7
    });
    this.printerMesh = new THREE.Mesh(printerGeo, printerMat);
    this.printerMesh.position.set(0, 1.9, 0);
    dispatchGroup.add(this.printerMesh);

    // Document Trays (Outbox)
    const trayGeo = new THREE.BoxGeometry(0.9, 0.2, 1.2);
    const trayMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b });
    const tray = new THREE.Mesh(trayGeo, trayMat);
    tray.position.set(-1.1, 1.4, 0);
    dispatchGroup.add(tray);

    // Clickable Dispatch Collider
    const dispatchColliderGeo = new THREE.BoxGeometry(4.2, 3.0, 3.5);
    const dispatchColliderMat = new THREE.MeshBasicMaterial({ visible: false });
    const dispatchCollider = new THREE.Mesh(dispatchColliderGeo, dispatchColliderMat);
    dispatchCollider.position.set(7.5, 1.5, 4.5);
    dispatchCollider.userData = { type: 'dispatchStation' };
    this.scene.add(dispatchCollider);
    this.clickableObjects.push(dispatchCollider);

    this.scene.add(dispatchGroup);
  }

  spawnEmployeeAvatars() {
    this.employees.forEach((emp) => {
      const group = new THREE.Group();
      group.position.copy(emp.chairPos);
      group.position.y = 0.8;

      // Body (Torso / Shirt)
      const bodyGeo = new THREE.CylinderGeometry(0.38, 0.42, 1.1, 12);
      const bodyMat = new THREE.MeshStandardMaterial({ color: emp.color, roughness: 0.5 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.55;
      group.add(body);

      // Head
      const headGeo = new THREE.SphereGeometry(0.34, 16, 16);
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdfc4, roughness: 0.4 });
      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.y = 1.35;
      group.add(head);

      // Hair
      const hairGeo = new THREE.SphereGeometry(0.36, 12, 12);
      const hairMat = new THREE.MeshStandardMaterial({ color: emp.hairColor, roughness: 0.6 });
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.set(0, 1.48, -0.05);
      hair.scale.set(1.05, 0.8, 1.05);
      group.add(hair);

      // Typing Arms
      const armGeo = new THREE.BoxGeometry(0.12, 0.5, 0.12);
      const leftArm = new THREE.Mesh(armGeo, bodyMat);
      leftArm.position.set(-0.45, 0.6, -0.2);
      leftArm.rotation.x = -Math.PI / 4;
      group.add(leftArm);

      const rightArm = new THREE.Mesh(armGeo, bodyMat);
      rightArm.position.set(0.45, 0.6, -0.2);
      rightArm.rotation.x = -Math.PI / 4;
      group.add(rightArm);

      // Status Indicator Sprite above head
      const spriteCanvas = document.createElement('canvas');
      spriteCanvas.width = 128;
      spriteCanvas.height = 128;
      const ctx = spriteCanvas.getContext('2d');
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 50px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💻', 64, 64);

      const spriteTexture = new THREE.CanvasTexture(spriteCanvas);
      const spriteMat = new THREE.SpriteMaterial({ map: spriteTexture, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(0, 2.2, 0);
      sprite.scale.set(1.2, 1.2, 1);
      group.add(sprite);

      emp.meshGroup = group;
      emp.statusSprite = sprite;
      emp.spriteCtx = ctx;
      emp.spriteTexture = spriteTexture;
      emp.arms = [leftArm, rightArm];

      this.scene.add(group);
    });
  }

  updateEmployeeSprite(emp) {
    if (!emp.spriteCtx || !emp.spriteTexture) return;
    const ctx = emp.spriteCtx;
    ctx.clearRect(0, 0, 128, 128);

    let icon = '💤';
    let ringColor = '#64748b';

    if (emp.stress >= 80) {
      icon = '🔥';
      ringColor = '#ef4444';
    } else if (emp.boostTimer > 0) {
      icon = '⚡';
      ringColor = '#eab308';
    } else if (emp.state === 'working') {
      if (emp.skill === 'code') icon = '💻';
      else if (emp.skill === 'design') icon = '🎨';
      else if (emp.skill === 'audit') icon = '📊';
      else if (emp.skill === 'copy') icon = '📝';
      ringColor = '#00f0ff';
    } else if (emp.state === 'coffee') {
      icon = '☕';
      ringColor = '#f59e0b';
    }

    // Draw background bubble
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 8;
    ctx.strokeStyle = ringColor;
    ctx.stroke();

    ctx.font = '54px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 64, 68);

    emp.spriteTexture.needsUpdate = true;
  }

  setupControls() {
    if (this.container) {
      this.container.addEventListener('pointerdown', this.handleCanvasClick);
      this.container.addEventListener('pointermove', this.handleMouseMove);
    }
  }

  removeControls() {
    if (this.container) {
      this.container.removeEventListener('pointerdown', this.handleCanvasClick);
      this.container.removeEventListener('pointermove', this.handleMouseMove);
    }
  }

  handleMouseMove(e) {
    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  handleCanvasClick(e) {
    if (!this.isRunning || this.isPaused || this.isGameOver) return;
    if (e.target.closest('button') || e.target.closest('.ui-interactive')) return;

    this.handleMouseMove(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.clickableObjects);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const data = hit.userData;

      if (data.type === 'desk') {
        const emp = this.employees.find((e) => e.id === data.employeeId);
        this.selectEmployee(emp);
      } else if (data.type === 'coffeeStation') {
        this.interactCoffeeStation();
      } else if (data.type === 'dispatchStation') {
        this.interactDispatchStation();
      }
    }
  }

  selectEmployee(emp) {
    sounds.playClick();
    this.selectedEmployee = emp;

    // If an incoming project matches or is ready to assign, assign it!
    const availableProject = this.projectsQueue.find((p) => !p.assignedTo && p.skill === emp.skill);
    if (availableProject && emp.state === 'idle') {
      this.assignProject(availableProject, emp);
    } else {
      // Denise gives a pep talk to reduce stress!
      this.cheerUpEmployee(emp);
    }
  }

  cheerUpEmployee(emp) {
    sounds.playScore();
    emp.stress = Math.max(0, emp.stress - 25);
    this.updateEmployeeSprite(emp);

    // Floating heart or praise
    this.showFloatingMessage(emp.deskPos, '💖 Pep Talk!', '#ff007f');
    this.onStatsUpdate(this.getGameStats());
  }

  interactCoffeeStation() {
    if (this.coffeeCupsReady > 0) {
      // Find the most stressed employee or selected employee
      let targetEmp = this.selectedEmployee;
      if (!targetEmp || targetEmp.state === 'coffee') {
        targetEmp = [...this.employees].sort((a, b) => b.stress - a.stress)[0];
      }

      if (targetEmp) {
        sounds.playBounce();
        this.coffeeCupsReady--;
        targetEmp.stress = Math.max(0, targetEmp.stress - 40);
        targetEmp.boostTimer = 14.0; // 14 seconds caffeine rush
        targetEmp.speedBoost = 1.6;
        this.showFloatingMessage(targetEmp.deskPos, '☕ CAFFEINE RUSH! (1.6x)', '#f59e0b');
        this.updateEmployeeSprite(targetEmp);
      }
    } else {
      // Brew more coffee!
      if (!this.isBrewing) {
        sounds.playClick();
        this.isBrewing = true;
        this.brewTimer = 0;
        this.showFloatingMessage(new THREE.Vector3(-7.5, 2.5, 4.5), '⏳ Brewing...', '#ffffff');
      }
    }
    this.onStatsUpdate(this.getGameStats());
  }

  interactDispatchStation() {
    if (this.completedBatches.length > 0) {
      sounds.playScore();
      confetti({ particleCount: 50, spread: 60, origin: { x: 0.8, y: 0.6 } });

      let payoutTotal = 0;
      this.completedBatches.forEach((proj) => {
        payoutTotal += proj.reward;
        this.projectsCompleted++;
      });
      this.completedBatches = [];

      this.cash += payoutTotal;
      this.score += payoutTotal;
      this.onScoreUpdate(this.score);
      this.showFloatingMessage(new THREE.Vector3(7.5, 2.5, 4.5), `💵 +$${payoutTotal}!`, '#10b981');
    } else {
      sounds.playClick();
      this.showFloatingMessage(new THREE.Vector3(7.5, 2.5, 4.5), 'No completed files yet', '#94a3b8');
    }
    this.onStatsUpdate(this.getGameStats());
  }

  assignProject(proj, emp) {
    sounds.playClick();
    proj.assignedTo = emp.id;
    emp.activeProject = proj;
    emp.state = 'working';
    this.updateEmployeeSprite(emp);
    this.showFloatingMessage(emp.deskPos, `📋 ${proj.title}`, '#00f0ff');
    this.onStatsUpdate(this.getGameStats());
  }

  spawnProject() {
    if (this.projectsQueue.length >= 6) return;

    const titles = [
      { name: 'API Microservice', skill: 'code', reward: 650, time: 28 },
      { name: 'Neon App Redesign', skill: 'design', reward: 700, time: 30 },
      { name: 'Q4 Tax Audit', skill: 'audit', reward: 600, time: 26 },
      { name: 'Viral Press Release', skill: 'copy', reward: 550, time: 24 },
      { name: 'Payment Gateway Bugfix', skill: 'code', reward: 800, time: 32 },
      { name: 'Logo Brand Identity', skill: 'design', reward: 750, time: 29 }
    ];

    const template = titles[Math.floor(Math.random() * titles.length)];
    const proj = {
      id: Math.random().toString(36).substring(2, 9),
      title: template.name,
      skill: template.skill,
      reward: template.reward,
      totalTime: template.time,
      remainingTime: template.time,
      progress: 0,
      assignedTo: null
    };

    this.projectsQueue.push(proj);
    this.onStatsUpdate(this.getGameStats());
  }

  showFloatingMessage(pos, text, color) {
    // In-game dynamic text notifications can be passed to UI overlay
    if (this.options.onFloatingMessage) {
      this.options.onFloatingMessage({ text, color });
    }
  }

  getGameStats() {
    const hours = Math.floor(this.dayTime / 60);
    const mins = Math.floor(this.dayTime % 60);
    const timeFormatted = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;

    return {
      cash: this.cash,
      timeFormatted,
      dayProgress: ((this.dayTime - 9 * 60) / (this.dayEndTime - 9 * 60)) * 100,
      coffeeCupsReady: this.coffeeCupsReady,
      completedBatchesCount: this.completedBatches.length,
      queue: this.projectsQueue,
      employees: this.employees.map((e) => ({
        id: e.id,
        name: e.name,
        role: e.role,
        skill: e.skill,
        stress: Math.round(e.stress),
        isCaffeinated: e.boostTimer > 0,
        state: e.state,
        activeProject: e.activeProject
      }))
    };
  }

  resetState() {
    super.resetState();
    this.cash = 600;
    this.dayTime = 9 * 60;
    this.projectsCompleted = 0;
    this.projectsFailed = 0;
    this.projectsQueue = [];
    this.completedBatches = [];
    this.coffeeCupsReady = 2;
    this.isBrewing = false;

    this.employees.forEach((emp) => {
      emp.state = 'idle';
      emp.stress = 10;
      emp.speedBoost = 1.0;
      emp.boostTimer = 0;
      emp.activeProject = null;
      this.updateEmployeeSprite(emp);
    });

    this.spawnProject();
    this.spawnProject();
  }

  update(delta) {
    // Advance Shift Clock
    this.dayTime += delta * this.timeScale;
    if (this.dayTime >= this.dayEndTime) {
      // Shift Ended! Evaluate Performance
      if (this.cash >= this.targetRevenue) {
        sounds.playWin();
        confetti({ particleCount: 120, spread: 90 });
      } else {
        sounds.playGameOver();
      }
      this.gameOver();
      return;
    }

    // Coffee Brewing Simulation
    if (this.isBrewing) {
      this.brewTimer += delta;
      const actualDuration = this.upgrades.turboEspresso ? 2.5 : this.brewDuration;
      if (this.brewTimer >= actualDuration) {
        this.isBrewing = false;
        this.coffeeCupsReady = Math.min(this.maxCoffeeCups, this.coffeeCupsReady + 2);
        sounds.playBounce();
      }
    }

    // Update Coffee Cup mesh visibility
    this.coffeeCupMeshes.forEach((mesh, idx) => {
      mesh.visible = idx < this.coffeeCupsReady;
    });

    // Spawn new incoming client projects
    this.projectSpawnTimer -= delta;
    if (this.projectSpawnTimer <= 0) {
      this.projectSpawnTimer = 6.0 + Math.random() * 4.0;
      this.spawnProject();
    }

    // Update Projects & Employee Work Simulation
    for (let i = this.projectsQueue.length - 1; i >= 0; i--) {
      const proj = this.projectsQueue[i];

      if (proj.assignedTo) {
        const emp = this.employees.find((e) => e.id === proj.assignedTo);
        if (emp && emp.state === 'working') {
          // Work speed calculation
          let workRate = 14.0 * emp.speedBoost;
          if (this.upgrades.dualMonitors) workRate *= 1.3;

          proj.progress += workRate * delta;

          // Stress accumulation
          let stressRate = 3.5;
          if (this.upgrades.ergonomicChairs) stressRate *= 0.65;
          if (this.upgrades.zenPlants) stressRate *= 0.8;

          emp.stress = Math.min(100, emp.stress + stressRate * delta);

          // Animate typing arms
          if (emp.arms && emp.arms[0]) {
            const wiggle = Math.sin(Date.now() * 0.02) * 0.2;
            emp.arms[0].rotation.x = -Math.PI / 4 + wiggle;
            emp.arms[1].rotation.x = -Math.PI / 4 - wiggle;
          }

          // Project Completed!
          if (proj.progress >= 100) {
            sounds.playScore();
            emp.state = 'idle';
            emp.activeProject = null;
            this.updateEmployeeSprite(emp);

            // Move to dispatch outbox
            this.completedBatches.push(proj);
            this.projectsQueue.splice(i, 1);
            this.showFloatingMessage(emp.deskPos, '✅ Draft Ready for Delivery!', '#10b981');
            continue;
          }
        }
      } else {
        // Unassigned project deadline ticks down
        proj.remainingTime -= delta;
        if (proj.remainingTime <= 0) {
          // Project expired!
          sounds.playHit();
          this.projectsFailed++;
          this.cash = Math.max(0, this.cash - 150);
          this.projectsQueue.splice(i, 1);
          continue;
        }
      }
    }

    // Update Employee caffeine boost timers & sprite animation bobbing
    this.employees.forEach((emp) => {
      if (emp.boostTimer > 0) {
        emp.boostTimer -= delta;
        if (emp.boostTimer <= 0) {
          emp.speedBoost = 1.0;
          this.updateEmployeeSprite(emp);
        }
      }

      // If stress is 100, employee enters panic / burnout mode!
      if (emp.stress >= 100 && emp.state !== 'panic') {
        emp.state = 'panic';
        if (emp.activeProject) {
          emp.activeProject.assignedTo = null;
          emp.activeProject = null;
        }
        sounds.playHit();
        this.updateEmployeeSprite(emp);
      }

      // Idle head bob
      if (emp.meshGroup) {
        emp.meshGroup.position.y = 0.8 + Math.sin(Date.now() * 0.004 + emp.id.length) * 0.03;
      }
    });

    // Notify UI with real-time statistics
    this.onStatsUpdate(this.getGameStats());
  }
}
