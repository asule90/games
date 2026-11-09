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
    this.dayLengthSeconds = 150; // 2.5 minutes per office shift
    this.timeScale = (this.dayEndTime - this.dayTime) / this.dayLengthSeconds;

    this.shiftNumber = 1;
    this.targetRevenue = 2800;
    this.projectsCompleted = 0;
    this.projectsFailed = 0;

    // Upgrades Store
    this.upgrades = {
      turboEspresso: false, // $400 - Brew in 2.5s + max 4 cups
      ergonomicChairs: false, // $500 - 40% less stress buildup
      dualMonitors: false, // $600 - +35% employee work speed
      zenPlants: false // $350 - passive stress healing aura
    };

    // Coffee Station State
    this.coffeeCupsReady = 2;
    this.maxCoffeeCups = 4;
    this.isBrewing = false;
    this.brewTimer = 0;
    this.brewDuration = 5.0;
    this.coffeeCupMeshes = [];

    // Sofa Position for Break Lounge
    this.sofaSitPositions = [
      new THREE.Vector3(-7.0, 0, 7.0),
      new THREE.Vector3(-6.0, 0, 7.0),
      new THREE.Vector3(-5.0, 0, 7.0),
      new THREE.Vector3(-4.0, 0, 7.0)
    ];

    // Employees list
    this.employees = [
      {
        id: 'tim',
        name: 'Tim',
        role: 'Lead Developer',
        specialty: 'IT & Code',
        skill: 'code',
        icon: '💻',
        color: 0x3b82f6,
        colorHex: '#3b82f6',
        hairColor: 0x78350f,
        deskPos: new THREE.Vector3(-6.5, 0, -3.2),
        chairPos: new THREE.Vector3(-6.5, 0, -2.1),
        state: 'idle', // idle, working, break, panic
        stress: 15,
        speedBoost: 1.0,
        boostTimer: 0,
        breakTimer: 0,
        activeProject: null,
        meshGroup: null,
        chairGroup: null,
        secondMonitorMesh: null,
        statusSprite: null,
        nameplateSprite: null
      },
      {
        id: 'tara',
        name: 'Tara',
        role: 'Lead Designer',
        specialty: 'UI / UX Design',
        skill: 'design',
        icon: '🎨',
        color: 0xec4899,
        colorHex: '#ec4899',
        hairColor: 0xd97706,
        deskPos: new THREE.Vector3(-2.2, 0, -3.2),
        chairPos: new THREE.Vector3(-2.2, 0, -2.1),
        state: 'idle',
        stress: 10,
        speedBoost: 1.0,
        boostTimer: 0,
        breakTimer: 0,
        activeProject: null,
        meshGroup: null,
        chairGroup: null,
        secondMonitorMesh: null,
        statusSprite: null,
        nameplateSprite: null
      },
      {
        id: 'winston',
        name: 'Winston',
        role: 'Chief Auditor',
        specialty: 'Finance & Audit',
        skill: 'audit',
        icon: '📊',
        color: 0x10b981,
        colorHex: '#10b981',
        hairColor: 0x94a3b8,
        deskPos: new THREE.Vector3(2.2, 0, -3.2),
        chairPos: new THREE.Vector3(2.2, 0, -2.1),
        state: 'idle',
        stress: 20,
        speedBoost: 1.0,
        boostTimer: 0,
        breakTimer: 0,
        activeProject: null,
        meshGroup: null,
        chairGroup: null,
        secondMonitorMesh: null,
        statusSprite: null,
        nameplateSprite: null
      },
      {
        id: 'luke',
        name: 'Luke',
        role: 'Senior Copywriter',
        specialty: 'Copy & Content',
        skill: 'copy',
        icon: '📝',
        color: 0xf59e0b,
        colorHex: '#f59e0b',
        hairColor: 0x1e293b,
        deskPos: new THREE.Vector3(6.5, 0, -3.2),
        chairPos: new THREE.Vector3(6.5, 0, -2.1),
        state: 'idle',
        stress: 5,
        speedBoost: 1.0,
        boostTimer: 0,
        breakTimer: 0,
        activeProject: null,
        meshGroup: null,
        chairGroup: null,
        secondMonitorMesh: null,
        statusSprite: null,
        nameplateSprite: null
      }
    ];

    // Denise Spencer (Manager Protagonist)
    this.denise = {
      pos: new THREE.Vector3(0, 0, 2.5),
      meshGroup: null
    };

    // Projects Queue
    this.projectsQueue = [];
    this.completedBatches = [];
    this.projectSpawnTimer = 1.5;

    // Raycasting & Interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clickableObjects = [];
    this.selectedEmployeeId = 'tim';

    // Upgrade decorative meshes
    this.plantMeshes = [];

    this.handleCanvasClick = this.handleCanvasClick.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
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
    // Isometric view angled nicely toward the office
    this.camera.position.set(20, 25, 21);
    this.camera.lookAt(0, 0.5, 0);
  }

  setupScene() {
    // Cheerful, bright daylight sky blue
    this.scene.background = new THREE.Color(0xd9e8f8);

    // Warm, welcoming office ambient light
    const ambientLight = new THREE.AmbientLight(0xfff7ed, 0.95);
    this.scene.add(ambientLight);

    // Soft warm sunlight from the top right
    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.25);
    dirLight.position.set(16, 32, 16);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    // Cool skylight fill from opposite side
    const softFillLight = new THREE.DirectionalLight(0xbbe1fa, 0.6);
    softFillLight.position.set(-20, 20, -15);
    this.scene.add(softFillLight);

    // Build the 3D Office Environment
    this.buildOfficeArchitecture();
    this.buildDesksAndFurniture();
    this.buildBreakArea();
    this.buildDispatchStation();
    this.buildManagerArea();

    // Spawn 3D Employee Avatars
    this.spawnEmployeeAvatars();

    // Spawn Denise Spencer
    this.spawnDeniseAvatar();

    // Initial project batch
    this.spawnProject();
    this.spawnProject();
  }

  buildOfficeArchitecture() {
    // Office Floor: Warm Honey Birch Wood Flooring
    const floorGeo = new THREE.BoxGeometry(24, 0.4, 20);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xd4a373, // Honey birch oak
      roughness: 0.35,
      metalness: 0.05
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, -0.2, 0.5);
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Designer Rug under the workstations (Navy with Cyan border)
    const rugGeo = new THREE.BoxGeometry(18, 0.02, 6);
    const rugMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8
    });
    const rug = new THREE.Mesh(rugGeo, rugMat);
    rug.position.set(0, 0.02, -2.8);
    this.scene.add(rug);

    // Grid Floor lines for crisp architectural style
    const grid = new THREE.GridHelper(24, 24, 0xffffff, 0xc59a68);
    grid.position.y = 0.03;
    grid.position.z = 0.5;
    this.scene.add(grid);

    // North & West Backing Walls (Warm Cream / Pastel Mint)
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.7,
      metalness: 0.1
    });

    const skirtingMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.5
    });

    // North Wall
    const northWallGeo = new THREE.BoxGeometry(24, 6.5, 0.4);
    const northWall = new THREE.Mesh(northWallGeo, wallMat);
    northWall.position.set(0, 3.25, -9.5);
    this.scene.add(northWall);

    const northSkirting = new THREE.Mesh(new THREE.BoxGeometry(24, 0.4, 0.45), skirtingMat);
    northSkirting.position.set(0, 0.2, -9.45);
    this.scene.add(northSkirting);

    // West Wall
    const westWallGeo = new THREE.BoxGeometry(0.4, 6.5, 20);
    const westWall = new THREE.Mesh(westWallGeo, wallMat);
    westWall.position.set(-12, 3.25, 0.5);
    this.scene.add(westWall);

    const westSkirting = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 20), skirtingMat);
    westSkirting.position.set(-11.95, 0.2, 0.5);
    this.scene.add(westSkirting);

    // Big Floor-To-Ceiling Sunny Windows on North Wall
    for (let x = -9; x <= 9; x += 4.5) {
      // Window frame
      const frameGeo = new THREE.BoxGeometry(3.6, 4.0, 0.15);
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.set(x, 4.0, -9.28);
      this.scene.add(frame);

      // Glass pane showing bright sunny sky and skyline
      const glassGeo = new THREE.PlaneGeometry(3.3, 3.7);
      const glassMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.45
      });
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.set(x, 4.0, -9.2);
      this.scene.add(glass);
    }

    // Modern Whiteboard on West Wall with colorful sticky notes
    const wbGeo = new THREE.BoxGeometry(0.1, 3.0, 5.0);
    const wbMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const wb = new THREE.Mesh(wbGeo, wbMat);
    wb.position.set(-11.7, 3.8, -3.0);
    this.scene.add(wb);

    // JoyArcade Studio Wall Banner
    const bannerSprite = this.createFloatingTextSprite(
      '🚀 JOYARCADE CREATIVE STUDIO • "WORK SMART & SMILE"',
      'rgba(30, 41, 59, 0.9)',
      '#38bdf8',
      '#f59e0b',
      600,
      80
    );
    bannerSprite.position.set(0, 5.8, -9.2);
    bannerSprite.scale.set(7.5, 1.0, 1);
    this.scene.add(bannerSprite);
  }

  buildDesksAndFurniture() {
    this.employees.forEach((emp) => {
      const deskGroup = new THREE.Group();
      deskGroup.position.copy(emp.deskPos);

      // Warm Oak Wood Desktop
      const topGeo = new THREE.BoxGeometry(3.0, 0.16, 1.7);
      const topMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3 });
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.y = 1.4;
      deskGroup.add(top);

      // Chrome / Steel Desk Legs
      const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.4);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 });
      for (const lx of [-1.35, 1.35]) {
        for (const lz of [-0.7, 0.7]) {
          const leg = new THREE.Mesh(legGeo, legMat);
          leg.position.set(lx, 0.7, lz);
          deskGroup.add(leg);
        }
      }

      // Computer Monitor 1
      const monGeo = new THREE.BoxGeometry(1.1, 0.7, 0.08);
      const monMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        emissive: 0x0284c7,
        emissiveIntensity: 0.4
      });
      const mon = new THREE.Mesh(monGeo, monMat);
      mon.position.set(-0.35, 2.0, -0.3);
      deskGroup.add(mon);

      // Monitor Stand
      const standGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5);
      const stand = new THREE.Mesh(standGeo, legMat);
      stand.position.set(-0.35, 1.65, -0.3);
      deskGroup.add(stand);

      // Optional Second Monitor (Unlocked via Upgrades Store)
      const secondMon = new THREE.Mesh(monGeo, monMat);
      secondMon.position.set(0.85, 2.0, -0.2);
      secondMon.rotation.y = -0.25;
      secondMon.visible = this.upgrades.dualMonitors;
      deskGroup.add(secondMon);
      emp.secondMonitorMesh = secondMon;

      // Keyboard & Glowing Mousepad
      const kbGeo = new THREE.BoxGeometry(0.75, 0.02, 0.3);
      const kbMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
      const kb = new THREE.Mesh(kbGeo, kbMat);
      kb.position.set(-0.1, 1.5, 0.25);
      deskGroup.add(kb);

      // Personalized Desk Lamp
      const lampGeo = new THREE.ConeGeometry(0.2, 0.35, 12);
      const lampMat = new THREE.MeshStandardMaterial({ color: emp.color, emissive: emp.color, emissiveIntensity: 0.7 });
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(1.2, 1.9, -0.4);
      deskGroup.add(lamp);

      // Ceramic Coffee Mug
      const mugGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.18, 12);
      const mugMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const mug = new THREE.Mesh(mugGeo, mugMat);
      mug.position.set(0.9, 1.55, 0.35);
      deskGroup.add(mug);

      // Ergonomic Office Chair
      const chairGroup = new THREE.Group();
      chairGroup.position.copy(emp.chairPos);
      const seatGeo = new THREE.BoxGeometry(0.95, 0.12, 0.95);
      const seatMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
      const seat = new THREE.Mesh(seatGeo, seatMat);
      seat.position.y = 0.9;
      chairGroup.add(seat);

      const backGeo = new THREE.BoxGeometry(0.95, 1.1, 0.12);
      const back = new THREE.Mesh(backGeo, seatMat);
      back.position.set(0, 1.45, 0.45);
      chairGroup.add(back);
      emp.chairGroup = chairGroup;
      this.scene.add(chairGroup);

      // 3D Visual Floating Nameplate Badge above desk!
      const nameplateText = `${emp.name} • ${emp.specialty} ${emp.icon}`;
      const nameplateSprite = this.createFloatingTextSprite(
        nameplateText,
        'rgba(15, 23, 42, 0.92)',
        '#ffffff',
        emp.colorHex
      );
      nameplateSprite.position.set(emp.deskPos.x, 3.4, emp.deskPos.z);
      this.scene.add(nameplateSprite);
      emp.nameplateSprite = nameplateSprite;

      // Clickable collider over the desk for interactions
      const colliderGeo = new THREE.BoxGeometry(3.2, 3.0, 2.5);
      const colliderMat = new THREE.MeshBasicMaterial({ visible: false });
      const collider = new THREE.Mesh(colliderGeo, colliderMat);
      collider.position.set(emp.deskPos.x, 1.5, emp.deskPos.z);
      collider.userData = { type: 'desk', employeeId: emp.id };
      this.scene.add(collider);
      this.clickableObjects.push(collider);

      this.scene.add(deskGroup);
    });
  }

  buildBreakArea() {
    const breakGroup = new THREE.Group();
    breakGroup.position.set(-7.8, 0, 4.5);

    // Warm Wooden Coffee Counter
    const counterGeo = new THREE.BoxGeometry(4.2, 1.4, 2.0);
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });
    const counter = new THREE.Mesh(counterGeo, counterMat);
    counter.position.y = 0.7;
    breakGroup.add(counter);

    // Espresso Machine (Can turn gold with Turbo Espresso upgrade)
    const machineGeo = new THREE.BoxGeometry(1.6, 1.1, 1.0);
    this.espressoMachineMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      metalness: 0.7,
      roughness: 0.2
    });
    this.espressoMachine = new THREE.Mesh(machineGeo, this.espressoMachineMat);
    this.espressoMachine.position.set(-0.9, 1.95, 0);
    breakGroup.add(this.espressoMachine);

    // Coffee Cups on Counter
    this.coffeeCupMeshes = [];
    for (let c = 0; c < 4; c++) {
      const cupGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.25);
      const cupMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const cup = new THREE.Mesh(cupGeo, cupMat);
      cup.position.set(0.3 + (c % 2) * 0.45, 1.55, -0.35 + Math.floor(c / 2) * 0.45);
      cup.visible = c < this.coffeeCupsReady;
      breakGroup.add(cup);
      this.coffeeCupMeshes.push(cup);
    }

    // Comfortable Velvet Lounge Sofa (Violet/Purple)
    const sofaGroup = new THREE.Group();
    sofaGroup.position.set(2.0, 0, 2.5);

    const sofaBase = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 0.6, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.7 })
    );
    sofaBase.position.y = 0.35;
    sofaGroup.add(sofaBase);

    const sofaBack = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 1.1, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x6d28d9, roughness: 0.7 })
    );
    sofaBack.position.set(0, 0.9, 0.8);
    sofaGroup.add(sofaBack);

    // Cozy Lounge Table with Flower Vase
    const tableMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 0.6, 16),
      new THREE.MeshStandardMaterial({ color: 0x334155 })
    );
    tableMesh.position.set(0, 0.3, -1.3);
    sofaGroup.add(tableMesh);

    const vaseMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.1, 0.4, 12),
      new THREE.MeshStandardMaterial({ color: 0xec4899 })
    );
    vaseMesh.position.set(0, 0.7, -1.3);
    sofaGroup.add(vaseMesh);

    breakGroup.add(sofaGroup);

    // Water cooler
    const coolerGeo = new THREE.CylinderGeometry(0.35, 0.35, 2.0);
    const coolerMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, transparent: true, opacity: 0.85 });
    const cooler = new THREE.Mesh(coolerGeo, coolerMat);
    cooler.position.set(-2.5, 1.0, 0);
    breakGroup.add(cooler);

    // Floating 3D Station Signboard
    const stationSprite = this.createFloatingTextSprite(
      '☕ ESPRESSO BAR & LOUNGE 🛋️',
      'rgba(15, 23, 42, 0.9)',
      '#f59e0b',
      '#f59e0b'
    );
    stationSprite.position.set(-7.8, 3.6, 4.5);
    this.scene.add(stationSprite);

    // Clickable trigger for Coffee Station
    const coffeeColliderGeo = new THREE.BoxGeometry(6.0, 3.5, 4.5);
    const coffeeColliderMat = new THREE.MeshBasicMaterial({ visible: false });
    const coffeeCollider = new THREE.Mesh(coffeeColliderGeo, coffeeColliderMat);
    coffeeCollider.position.set(-7.8, 1.5, 4.5);
    coffeeCollider.userData = { type: 'coffeeStation' };
    this.scene.add(coffeeCollider);
    this.clickableObjects.push(coffeeCollider);

    this.scene.add(breakGroup);
  }

  buildDispatchStation() {
    const dispatchGroup = new THREE.Group();
    dispatchGroup.position.set(7.8, 0, 4.5);

    // Dispatch Work Table
    const tableGeo = new THREE.BoxGeometry(4.0, 1.4, 2.2);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = 0.7;
    dispatchGroup.add(table);

    // Laser Copier / Client Dispatch Printer
    const printerGeo = new THREE.BoxGeometry(2.0, 1.3, 1.5);
    const printerMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.6,
      metalness: 0.7
    });
    this.printerMesh = new THREE.Mesh(printerGeo, printerMat);
    this.printerMesh.position.set(0.2, 2.0, 0);
    dispatchGroup.add(this.printerMesh);

    // Document Trays (Outbox)
    const trayGeo = new THREE.BoxGeometry(1.0, 0.25, 1.4);
    const trayMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b });
    const tray = new THREE.Mesh(trayGeo, trayMat);
    tray.position.set(-1.2, 1.45, 0);
    dispatchGroup.add(tray);

    // Floating 3D Station Signboard
    const dispatchSprite = this.createFloatingTextSprite(
      '📤 CLIENT DISPATCH (CLAIM $$$)',
      'rgba(15, 23, 42, 0.9)',
      '#10b981',
      '#10b981'
    );
    dispatchSprite.position.set(7.8, 3.6, 4.5);
    this.scene.add(dispatchSprite);

    // Clickable Dispatch Collider
    const dispatchColliderGeo = new THREE.BoxGeometry(5.0, 3.5, 4.5);
    const dispatchColliderMat = new THREE.MeshBasicMaterial({ visible: false });
    const dispatchCollider = new THREE.Mesh(dispatchColliderGeo, dispatchColliderMat);
    dispatchCollider.position.set(7.8, 1.5, 4.5);
    dispatchCollider.userData = { type: 'dispatchStation' };
    this.scene.add(dispatchCollider);
    this.clickableObjects.push(dispatchCollider);

    this.scene.add(dispatchGroup);
  }

  buildManagerArea() {
    // Denise Spencer's Center Management Command Rug & Standing Area
    const cmdRug = new THREE.Mesh(
      new THREE.CylinderGeometry(2.0, 2.0, 0.02, 24),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.7 })
    );
    cmdRug.position.set(0, 0.02, 2.5);
    this.scene.add(cmdRug);
  }

  spawnDeniseAvatar() {
    // Denise Spencer - The vibrant Office Manager
    const group = new THREE.Group();
    group.position.copy(this.denise.pos);
    group.position.y = 0;

    // Body (Magenta / Coral Business Suit)
    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.42, 1.2, 12);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.5 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.1;
    group.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdfc4, roughness: 0.4 });
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.95;
    group.add(head);

    // Stylish Auburn Hair
    const hairGeo = new THREE.SphereGeometry(0.38, 14, 14);
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.6 });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 2.08, -0.06);
    hair.scale.set(1.08, 0.85, 1.08);
    group.add(hair);

    // Left Arm holding Manager Clipboard
    const armMat = new THREE.MeshStandardMaterial({ color: 0xe11d48 });
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.12), armMat);
    leftArm.position.set(-0.45, 1.25, 0.1);
    leftArm.rotation.x = -Math.PI / 4;
    group.add(leftArm);

    // Manager Clipboard
    const clipGeo = new THREE.BoxGeometry(0.35, 0.45, 0.04);
    const clipMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
    const clip = new THREE.Mesh(clipGeo, clipMat);
    clip.position.set(-0.45, 1.25, 0.35);
    clip.rotation.x = -Math.PI / 4;
    group.add(clip);

    // Right Arm (Pointing / Guiding)
    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.12), armMat);
    rightArm.position.set(0.45, 1.25, 0.1);
    group.add(rightArm);

    // Floating 3D Badge: "Denise Spencer (Office Manager)"
    const deniseSprite = this.createFloatingTextSprite(
      '👑 Denise Spencer (Manager)',
      'rgba(225, 29, 72, 0.95)',
      '#ffffff',
      '#fbbf24'
    );
    deniseSprite.position.set(0, 2.8, 0);
    group.add(deniseSprite);

    this.denise.meshGroup = group;
    this.denise.rightArm = rightArm;
    this.scene.add(group);
  }

  spawnEmployeeAvatars() {
    this.employees.forEach((emp) => {
      const group = new THREE.Group();
      group.position.copy(emp.chairPos);
      group.position.y = 0.8;

      // Body (Torso / Shirt)
      const bodyGeo = new THREE.CylinderGeometry(0.38, 0.44, 1.1, 12);
      const bodyMat = new THREE.MeshStandardMaterial({ color: emp.color, roughness: 0.5 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.55;
      group.add(body);

      // Head
      const headGeo = new THREE.SphereGeometry(0.35, 16, 16);
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdfc4, roughness: 0.4 });
      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.y = 1.35;
      group.add(head);

      // Hair
      const hairGeo = new THREE.SphereGeometry(0.37, 12, 12);
      const hairMat = new THREE.MeshStandardMaterial({ color: emp.hairColor, roughness: 0.6 });
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.set(0, 1.48, -0.05);
      hair.scale.set(1.05, 0.8, 1.05);
      group.add(hair);

      // Typing Arms
      const armGeo = new THREE.BoxGeometry(0.13, 0.5, 0.13);
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

      this.updateEmployeeSprite(emp);
      this.scene.add(group);
    });
  }

  createFloatingTextSprite(text, bgColor = 'rgba(15,23,42,0.9)', textColor = '#ffffff', borderColor = '#38bdf8', w = 480, h = 96) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Rounded rectangle
    const r = h / 2 - 4;
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(8, 8, w - 16, h - 16, r);
    ctx.fill();

    ctx.lineWidth = 6;
    ctx.strokeStyle = borderColor;
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(w / 120, h / 120, 1);
    return sprite;
  }

  updateEmployeeSprite(emp) {
    if (!emp.spriteCtx || !emp.spriteTexture) return;
    const ctx = emp.spriteCtx;
    ctx.clearRect(0, 0, 128, 128);

    let icon = '💤';
    let ringColor = '#64748b';

    if (emp.state === 'panic') {
      icon = '💥';
      ringColor = '#dc2626';
    } else if (emp.state === 'break') {
      icon = '🛋️';
      ringColor = '#8b5cf6';
    } else if (emp.stress >= 80) {
      icon = '🔥';
      ringColor = '#ef4444';
    } else if (emp.boostTimer > 0) {
      icon = '⚡';
      ringColor = '#eab308';
    } else if (emp.state === 'working') {
      icon = emp.icon || '💻';
      ringColor = emp.colorHex || '#00f0ff';
    }

    // Draw circular indicator
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 8;
    ctx.strokeStyle = ringColor;
    ctx.stroke();

    ctx.font = '52px sans-serif';
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
        this.selectEmployee(data.employeeId);
      } else if (data.type === 'coffeeStation') {
        this.interactCoffeeStation();
      } else if (data.type === 'dispatchStation') {
        this.interactDispatchStation();
      }
    }
  }

  selectEmployee(empId) {
    sounds.playClick();
    this.selectedEmployeeId = empId;
    const emp = this.employees.find((e) => e.id === empId);

    // If an idle employee matches a queued project, assign it automatically
    const availableProject = this.projectsQueue.find((p) => !p.assignedTo && p.skill === emp.skill);
    if (availableProject && emp.state === 'idle') {
      this.assignProject(availableProject, emp);
    }

    this.onStatsUpdate(this.getGameStats());
  }

  givePepTalk(empId) {
    const emp = this.employees.find((e) => e.id === empId);
    if (!emp) return;

    sounds.playScore();
    emp.stress = Math.max(0, emp.stress - 25);
    if (emp.state === 'panic' && emp.stress < 70) {
      emp.state = 'idle';
    }
    this.updateEmployeeSprite(emp);
    this.showFloatingMessage(emp.deskPos, `💖 Denise: Great job, ${emp.name}!`, '#ec4899');
    this.onStatsUpdate(this.getGameStats());
  }

  giveCoffee(empId) {
    const emp = this.employees.find((e) => e.id === empId);
    if (!emp) return;

    if (this.coffeeCupsReady <= 0) {
      this.interactCoffeeStation();
      return;
    }

    sounds.playBounce();
    this.coffeeCupsReady--;
    emp.stress = Math.max(0, emp.stress - 40);
    emp.boostTimer = 16.0; // 16s Caffeine Rush
    emp.speedBoost = 1.6;
    if (emp.state === 'panic') {
      emp.state = 'idle';
    }
    this.updateEmployeeSprite(emp);
    this.showFloatingMessage(emp.deskPos, `☕ ${emp.name} CAFFEINE RUSH! (1.6x Speed)`, '#f59e0b');
    this.onStatsUpdate(this.getGameStats());
  }

  sendToBreak(empId) {
    const emp = this.employees.find((e) => e.id === empId);
    if (!emp) return;

    sounds.playClick();
    if (emp.activeProject) {
      emp.activeProject.assignedTo = null;
      emp.activeProject = null;
    }

    emp.state = 'break';
    emp.breakTimer = 6.0; // 6 seconds in lounge sofa
    this.updateEmployeeSprite(emp);

    // Animate move to sofa
    const sofaSlot = this.employees.indexOf(emp) % this.sofaSitPositions.length;
    const targetPos = this.sofaSitPositions[sofaSlot];
    if (emp.meshGroup) {
      emp.meshGroup.position.set(targetPos.x, 0.45, targetPos.z);
    }

    this.showFloatingMessage(new THREE.Vector3(-7.5, 2.5, 4.5), `🛋️ ${emp.name} is resting in the lounge...`, '#8b5cf6');
    this.onStatsUpdate(this.getGameStats());
  }

  interactCoffeeStation() {
    if (this.coffeeCupsReady > 0) {
      // Find selected or most stressed employee
      let targetEmp = this.employees.find((e) => e.id === this.selectedEmployeeId);
      if (!targetEmp || targetEmp.state === 'break') {
        targetEmp = [...this.employees].sort((a, b) => b.stress - a.stress)[0];
      }
      if (targetEmp) {
        this.giveCoffee(targetEmp.id);
      }
    } else {
      // Brew more coffee!
      if (!this.isBrewing) {
        sounds.playClick();
        this.isBrewing = true;
        this.brewTimer = 0;
        this.showFloatingMessage(new THREE.Vector3(-7.8, 2.5, 4.5), '⏳ Brewing Fresh Espresso...', '#ffffff');
      }
    }
    this.onStatsUpdate(this.getGameStats());
  }

  interactDispatchStation() {
    if (this.completedBatches.length > 0) {
      sounds.playScore();
      confetti({ particleCount: 70, spread: 70, origin: { x: 0.8, y: 0.6 } });

      let payoutTotal = 0;
      this.completedBatches.forEach((proj) => {
        payoutTotal += proj.reward;
        this.projectsCompleted++;
      });
      this.completedBatches = [];

      this.cash += payoutTotal;
      this.score += payoutTotal;
      this.onScoreUpdate(this.score);
      this.showFloatingMessage(new THREE.Vector3(7.8, 2.5, 4.5), `💵 Client Paid +$${payoutTotal}!`, '#10b981');
    } else {
      sounds.playClick();
      this.showFloatingMessage(new THREE.Vector3(7.8, 2.5, 4.5), 'Belum ada file selesai', '#94a3b8');
    }
    this.onStatsUpdate(this.getGameStats());
  }

  buyUpgrade(key) {
    const prices = {
      turboEspresso: 400,
      ergonomicChairs: 500,
      dualMonitors: 600,
      zenPlants: 350,
      donutParty: 250
    };

    const cost = prices[key];
    if (cost === undefined || this.cash < cost) {
      sounds.playHit();
      this.showFloatingMessage(new THREE.Vector3(0, 2, 2.5), 'Uang kantor belum cukup!', '#ef4444');
      return false;
    }

    if (key === 'donutParty') {
      // Repeatable instant party!
      this.cash -= cost;
      sounds.playScore();
      confetti({ particleCount: 100, spread: 80 });
      this.employees.forEach((emp) => {
        emp.stress = 0;
        if (emp.state === 'panic') emp.state = 'idle';
        this.updateEmployeeSprite(emp);
      });
      this.showFloatingMessage(new THREE.Vector3(0, 2.5, 2.5), '🍩 DONUT PARTY! Semua stres tim 0%!', '#ec4899');
      this.onStatsUpdate(this.getGameStats());
      return true;
    }

    if (this.upgrades[key]) {
      // Already owned
      return false;
    }

    this.cash -= cost;
    this.upgrades[key] = true;
    sounds.playWin();
    confetti({ particleCount: 60, spread: 50 });

    if (key === 'turboEspresso') {
      this.maxCoffeeCups = 4;
      if (this.espressoMachineMat) {
        this.espressoMachineMat.color.setHex(0xf59e0b); // Shiny gold
        this.espressoMachineMat.metalness = 0.9;
      }
      this.showFloatingMessage(new THREE.Vector3(-7.8, 2.5, 4.5), '⚡ Turbo Espresso Aktif (Seduh 2.5s)!', '#f59e0b');
    } else if (key === 'dualMonitors') {
      this.employees.forEach((emp) => {
        if (emp.secondMonitorMesh) emp.secondMonitorMesh.visible = true;
      });
      this.showFloatingMessage(new THREE.Vector3(0, 2.5, -2), '🖥️ Dual Monitors Aktif (+35% Speed)!', '#38bdf8');
    } else if (key === 'ergonomicChairs') {
      this.employees.forEach((emp) => {
        if (emp.chairGroup) {
          emp.chairGroup.children.forEach((c) => {
            if (c.material) c.material.color.setHex(0x0284c7);
          });
        }
      });
      this.showFloatingMessage(new THREE.Vector3(0, 2.5, -2), '🪑 Kursi Ergonomis Aktif (-40% Stres)!', '#10b981');
    } else if (key === 'zenPlants') {
      this.spawnZenPlants();
      this.showFloatingMessage(new THREE.Vector3(0, 2.5, 0), '🌿 Zen Monstera Aktif (Aura Relaksasi)!', '#22c55e');
    }

    this.onStatsUpdate(this.getGameStats());
    return true;
  }

  spawnZenPlants() {
    const plantLocations = [
      new THREE.Vector3(-9.5, 0, -3.2),
      new THREE.Vector3(-4.4, 0, -3.2),
      new THREE.Vector3(4.4, 0, -3.2),
      new THREE.Vector3(9.5, 0, -3.2),
      new THREE.Vector3(-10.5, 0, 8.0)
    ];

    plantLocations.forEach((loc) => {
      const plantGroup = new THREE.Group();
      plantGroup.position.copy(loc);

      // Pot
      const potGeo = new THREE.CylinderGeometry(0.35, 0.25, 0.7, 12);
      const potMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 });
      const pot = new THREE.Mesh(potGeo, potMat);
      pot.position.y = 0.35;
      plantGroup.add(pot);

      // Lush Monstera Leaves
      const leafGeo = new THREE.SphereGeometry(0.4, 8, 8);
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.4 });
      for (let i = 0; i < 4; i++) {
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.set(Math.sin(i * 1.5) * 0.25, 0.85 + i * 0.15, Math.cos(i * 1.5) * 0.25);
        leaf.scale.set(0.9, 0.3, 1.2);
        leaf.rotation.y = i * 0.8;
        plantGroup.add(leaf);
      }

      this.scene.add(plantGroup);
      this.plantMeshes.push(plantGroup);
    });
  }

  assignProject(proj, emp) {
    sounds.playClick();
    proj.assignedTo = emp.id;
    emp.activeProject = proj;
    emp.state = 'working';
    this.updateEmployeeSprite(emp);
    this.showFloatingMessage(emp.deskPos, `📋 ${emp.name}: Mengerjakan "${proj.title}"`, '#00f0ff');
    this.onStatsUpdate(this.getGameStats());
  }

  spawnProject() {
    if (this.projectsQueue.length >= 6) return;

    const titles = [
      { name: 'API Microservice Core', skill: 'code', targetEmp: 'tim', reward: 750, time: 32 },
      { name: 'Neon Mobile App UI', skill: 'design', targetEmp: 'tara', reward: 800, time: 34 },
      { name: 'Q4 Tax & Legal Audit', skill: 'audit', targetEmp: 'winston', reward: 700, time: 30 },
      { name: 'Viral Product Launch Copy', skill: 'copy', targetEmp: 'luke', reward: 650, time: 28 },
      { name: 'Payment Gateway Security', skill: 'code', targetEmp: 'tim', reward: 900, time: 36 },
      { name: '3D Brand Mascot Kit', skill: 'design', targetEmp: 'tara', reward: 850, time: 32 },
      { name: 'Corporate Balance Sheet', skill: 'audit', targetEmp: 'winston', reward: 720, time: 30 },
      { name: 'SEO Viral Press Release', skill: 'copy', targetEmp: 'luke', reward: 600, time: 26 }
    ];

    const template = titles[Math.floor(Math.random() * titles.length)];
    const proj = {
      id: Math.random().toString(36).substring(2, 9),
      title: template.name,
      skill: template.skill,
      targetEmp: template.targetEmp,
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
      upgrades: { ...this.upgrades },
      selectedEmployeeId: this.selectedEmployeeId,
      queue: this.projectsQueue,
      employees: this.employees.map((e) => ({
        id: e.id,
        name: e.name,
        role: e.role,
        specialty: e.specialty,
        skill: e.skill,
        icon: e.icon,
        colorHex: e.colorHex,
        stress: Math.round(e.stress),
        isCaffeinated: e.boostTimer > 0,
        caffeineRemaining: Math.ceil(e.boostTimer),
        state: e.state,
        breakRemaining: Math.ceil(e.breakTimer),
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
    this.selectedEmployeeId = 'tim';

    this.employees.forEach((emp) => {
      emp.state = 'idle';
      emp.stress = 10;
      emp.speedBoost = 1.0;
      emp.boostTimer = 0;
      emp.breakTimer = 0;
      emp.activeProject = null;
      if (emp.meshGroup) {
        emp.meshGroup.position.copy(emp.chairPos);
        emp.meshGroup.position.y = 0.8;
      }
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
        confetti({ particleCount: 150, spread: 100 });
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
    if (this.coffeeCupMeshes && this.coffeeCupMeshes.length > 0) {
      this.coffeeCupMeshes.forEach((mesh, idx) => {
        if (mesh) mesh.visible = idx < this.coffeeCupsReady;
      });
    }

    // Spawn new incoming client projects
    this.projectSpawnTimer -= delta;
    if (this.projectSpawnTimer <= 0) {
      this.projectSpawnTimer = 5.0 + Math.random() * 4.0;
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
          if (this.upgrades.dualMonitors) workRate *= 1.35;

          proj.progress += workRate * delta;

          // Stress accumulation
          let stressRate = 3.2;
          if (this.upgrades.ergonomicChairs) stressRate *= 0.6;
          if (this.upgrades.zenPlants) stressRate *= 0.75;

          emp.stress = Math.min(100, emp.stress + stressRate * delta);

          // Animate typing arms
          if (emp.arms && emp.arms[0]) {
            const wiggle = Math.sin(Date.now() * 0.02) * 0.25;
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
            this.showFloatingMessage(emp.deskPos, `✅ ${proj.title} Siap Dikirim!`, '#10b981');
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
          this.cash = Math.max(0, this.cash - 120);
          this.projectsQueue.splice(i, 1);
          this.showFloatingMessage(new THREE.Vector3(0, 2, 0), '❌ Deadline Proyek Terlewat!', '#ef4444');
          continue;
        }
      }
    }

    // Update Employee states & timers
    this.employees.forEach((emp) => {
      // Break Lounge timer
      if (emp.state === 'break') {
        emp.breakTimer -= delta;
        emp.stress = Math.max(0, emp.stress - delta * 25); // rapidly drop stress
        if (emp.breakTimer <= 0) {
          emp.state = 'idle';
          emp.stress = 0;
          // Return to chair
          if (emp.meshGroup) {
            emp.meshGroup.position.copy(emp.chairPos);
            emp.meshGroup.position.y = 0.8;
          }
          this.updateEmployeeSprite(emp);
          this.showFloatingMessage(emp.deskPos, `✨ ${emp.name} kembali segar bertenaga!`, '#10b981');
        }
      }

      // Caffeine boost timer
      if (emp.boostTimer > 0) {
        emp.boostTimer -= delta;
        if (emp.boostTimer <= 0) {
          emp.speedBoost = 1.0;
          this.updateEmployeeSprite(emp);
        }
      }

      // Burnout / Panic check
      if (emp.stress >= 100 && emp.state !== 'panic') {
        emp.state = 'panic';
        if (emp.activeProject) {
          emp.activeProject.assignedTo = null;
          emp.activeProject = null;
        }
        sounds.playHit();
        this.updateEmployeeSprite(emp);
        this.showFloatingMessage(emp.deskPos, `💥 BURNOUT! ${emp.name} butuh istirahat / donat!`, '#ef4444');
      }

      // Passive stress reduction from Zen Plants
      if (this.upgrades.zenPlants && emp.state !== 'working' && emp.stress > 0) {
        emp.stress = Math.max(0, emp.stress - delta * 1.5);
      }

      // Idle head bob
      if (emp.meshGroup && emp.state !== 'break') {
        emp.meshGroup.position.y = 0.8 + Math.sin(Date.now() * 0.004 + emp.id.length) * 0.025;
      }
    });

    // Denise avatar animation bobbing
    if (this.denise.meshGroup) {
      this.denise.meshGroup.position.y = Math.sin(Date.now() * 0.003) * 0.03;
      if (this.denise.rightArm) {
        this.denise.rightArm.rotation.x = Math.sin(Date.now() * 0.005) * 0.2;
      }
    }

    // Notify UI with real-time statistics
    this.onStatsUpdate(this.getGameStats());
  }
}
