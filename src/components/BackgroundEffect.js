// Lightweight, bulletproof background effect that doesn't consume WebGL contexts
// Guarantees 100% compatibility across all browsers (including software Mesa llvmpipe rendering)
export class BackgroundEffect {
  constructor(canvas) {
    this.canvas = canvas;
    this.init();
  }

  init() {
    // Instead of allocating a WebGL context for background decorations,
    // we use a 2D Canvas / CSS floating particle system.
    // This frees 100% of GPU WebGL contexts for the actual 3D Games!
    if (!this.canvas) return;

    try {
      const ctx = this.canvas.getContext('2d');
      if (!ctx) return;

      this.ctx = ctx;
      this.particles = [];
      this.mouseX = window.innerWidth / 2;
      this.mouseY = window.innerHeight / 2;

      this.resize();
      window.addEventListener('resize', () => this.resize());
      window.addEventListener('pointermove', (e) => {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
      });

      // Spawn joyful floating candy bubbles & stars
      const symbols = ['⭐', '🍩', '🍬', '🎈', '✨', '🧁', '🍪'];
      const colors = ['#ff6b8b', '#ff9f43', '#feca57', '#48dbfb', '#1dd1a1', '#a55eea'];

      for (let i = 0; i < 24; i++) {
        this.particles.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          radius: 14 + Math.random() * 26,
          symbol: symbols[i % symbols.length],
          color: colors[i % colors.length],
          vx: (Math.random() - 0.5) * 0.4,
          vy: -0.3 - Math.random() * 0.5,
          alpha: 0.2 + Math.random() * 0.35,
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.02
        });
      }

      this.animate();
    } catch (err) {
      console.warn('BackgroundEffect fallback:', err);
    }
  }

  resize() {
    if (!this.canvas) return;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    const time = Date.now() * 0.001;

    this.particles.forEach((p) => {
      p.y += p.vy;
      p.x += p.vx + Math.sin(time + p.y * 0.01) * 0.3;
      p.rot += p.vRot;

      // Wrap around screen
      if (p.y < -50) p.y = this.height + 40;
      if (p.x < -50) p.x = this.width + 40;
      if (p.x > this.width + 50) p.x = -40;

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rot);
      this.ctx.globalAlpha = p.alpha;

      // Draw soft pastel glow circle
      this.ctx.beginPath();
      this.ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.fill();

      // Draw friendly emoji
      this.ctx.font = `${Math.round(p.radius * 1.1)}px sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(p.symbol, 0, 0);

      this.ctx.restore();
    });
  }
}
