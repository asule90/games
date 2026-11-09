import * as THREE from 'three';

export class BackgroundEffect {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.shapes = [];
    this.mouseX = 0;
    this.mouseY = 0;
    this.targetMouseX = 0;
    this.targetMouseY = 0;

    this.onResize = this.onResize.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.z = 25;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const pLight1 = new THREE.PointLight(0x00f0ff, 2.5, 50);
    pLight1.position.set(-15, 15, 10);
    this.scene.add(pLight1);

    const pLight2 = new THREE.PointLight(0xff007f, 2.0, 50);
    pLight2.position.set(15, -15, 5);
    this.scene.add(pLight2);

    // Floating Glowing Shapes
    const geometries = [
      new THREE.IcosahedronGeometry(1.8, 0),
      new THREE.TorusGeometry(1.5, 0.4, 16, 32),
      new THREE.OctahedronGeometry(1.6, 0),
      new THREE.TetrahedronGeometry(2.0, 0)
    ];

    const colors = [0x00f0ff, 0xff007f, 0xa855f7, 0x00ff88, 0x3b82f6];

    for (let i = 0; i < 22; i++) {
      const geo = geometries[i % geometries.length];
      const mat = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
        wireframe: i % 2 === 0,
        roughness: 0.3,
        metalness: 0.8,
        transparent: true,
        opacity: 0.45
      });
      const mesh = new THREE.Mesh(geo, mat);

      mesh.position.set(
        (Math.random() - 0.5) * 45,
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 20 - 5
      );

      mesh.userData = {
        rx: (Math.random() - 0.5) * 0.8,
        ry: (Math.random() - 0.5) * 0.8,
        initY: mesh.position.y,
        floatSpeed: 0.5 + Math.random() * 0.8,
        floatOffset: Math.random() * Math.PI * 2
      };

      this.scene.add(mesh);
      this.shapes.push(mesh);
    }

    window.addEventListener('resize', this.onResize);
    window.addEventListener('pointermove', this.onMouseMove);

    this.animate();
  }

  onResize() {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  onMouseMove(e) {
    this.targetMouseX = (e.clientX / window.innerWidth - 0.5) * 4;
    this.targetMouseY = (e.clientY / window.innerHeight - 0.5) * -4;
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

    this.camera.position.x = this.mouseX;
    this.camera.position.y = this.mouseY;
    this.camera.lookAt(0, 0, 0);

    const time = Date.now() * 0.001;
    this.shapes.forEach((s) => {
      s.rotation.x += s.userData.rx * 0.01;
      s.rotation.y += s.userData.ry * 0.01;
      s.position.y = s.userData.initY + Math.sin(time * s.userData.floatSpeed + s.userData.floatOffset) * 1.5;
    });

    this.renderer.render(this.scene, this.camera);
  }
}
