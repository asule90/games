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
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 120);
    this.camera.position.z = 26;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    // Warm, cheerful lighting
    const ambientLight = new THREE.AmbientLight(0xfff5ee, 0.7);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffdf88, 1.4);
    sunLight.position.set(12, 18, 15);
    this.scene.add(sunLight);

    const candyLight = new THREE.PointLight(0xff66b2, 2.0, 45);
    candyLight.position.set(-15, 10, 8);
    this.scene.add(candyLight);

    const mintLight = new THREE.PointLight(0x00f0ff, 1.8, 45);
    mintLight.position.set(15, -12, 6);
    this.scene.add(mintLight);

    // Fun & Playful Shapes (Donuts, Stars, Toy Cubes, Sweet Spheres)
    const geometries = [
      new THREE.TorusGeometry(1.4, 0.55, 16, 32), // Glazed Donut
      new THREE.IcosahedronGeometry(1.6, 0),       // Gem / Star
      new THREE.SphereGeometry(1.3, 24, 24),       // Bubble / Marbles
      new THREE.BoxGeometry(1.8, 1.8, 1.8),        // Lucky Toy Block
      new THREE.OctahedronGeometry(1.5, 0)         // Crystal Candy
    ];

    // Cheerful pastel candy palette
    const colors = [
      0xff6b8b, // Strawberry Pink
      0xffb03a, // Sunny Orange
      0xffd43b, // Golden Lemon
      0x48dbfb, // Sky Blue
      0x1dd1a1, // Mint Green
      0xa55eea  // Sweet Lavender
    ];

    for (let i = 0; i < 28; i++) {
      const geo = geometries[i % geometries.length];
      const color = colors[i % colors.length];

      const mat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.25,
        metalness: 0.15,
        transparent: true,
        opacity: 0.72
      });

      const mesh = new THREE.Mesh(geo, mat);

      mesh.position.set(
        (Math.random() - 0.5) * 44,
        (Math.random() - 0.5) * 32,
        (Math.random() - 0.5) * 18 - 4
      );

      mesh.userData = {
        rx: (Math.random() - 0.5) * 0.7,
        ry: (Math.random() - 0.5) * 0.7,
        rz: (Math.random() - 0.5) * 0.5,
        initY: mesh.position.y,
        initX: mesh.position.x,
        floatSpeed: 0.6 + Math.random() * 0.9,
        floatAmp: 1.2 + Math.random() * 1.5,
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
    this.targetMouseX = (e.clientX / window.innerWidth - 0.5) * 3.5;
    this.targetMouseY = (e.clientY / window.innerHeight - 0.5) * -3.5;
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    this.mouseX += (this.targetMouseX - this.mouseX) * 0.04;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.04;

    this.camera.position.x = this.mouseX;
    this.camera.position.y = this.mouseY;
    this.camera.lookAt(0, 0, 0);

    const time = Date.now() * 0.0012;
    this.shapes.forEach((s) => {
      s.rotation.x += s.userData.rx * 0.015;
      s.rotation.y += s.userData.ry * 0.015;
      s.rotation.z += s.userData.rz * 0.01;
      s.position.y = s.userData.initY + Math.sin(time * s.userData.floatSpeed + s.userData.floatOffset) * s.userData.floatAmp;
      s.position.x = s.userData.initX + Math.cos(time * (s.userData.floatSpeed * 0.7) + s.userData.floatOffset) * 0.8;
    });

    this.renderer.render(this.scene, this.camera);
  }
}
