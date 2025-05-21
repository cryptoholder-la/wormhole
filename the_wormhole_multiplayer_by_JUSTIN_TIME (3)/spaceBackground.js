// spaceBackground.js - Starfield Simulation
// (No HTML! Only JS module.)

/**
 * @file Standalone animated space/starfield effect for a <canvas> background.
 * All tweakable values marked with @tweakable for live adjustments!
 */

class SpaceBackground {
  constructor(canvasId) {
    /** @type {HTMLCanvasElement} */
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.starList = [];
    this.lastW = 0;
    this.lastH = 0;

    // --- Tweakable config! ---
    /**
     * @tweakable How many animated stars to draw
     */
    this.STAR_COUNT = 160;

    /**
     * @tweakable Space star color palette
     */
    this.STAR_COLORS = [
      "#fff",  // White
      "#0ff",  // Cyan
      "#f0f",  // Purple
      "#fdc",  // Pale yellow
      "#ff0",  // Yellow
      "#0af",  // Blue
      "#ffbfa2", // Peachy
      "#aef"   // Light blue
    ];

    /**
     * @tweakable Range of visible star size (px): [min, max]
     */
    this.SIZE_RANGE = [0.9, 2.7];

    /**
     * @tweakable Star twinkle speed factor (lower = slower twinkle): [min, max]
     */
    this.TWINKLE_RANGE = [0.18, 0.68];

    /**
     * @tweakable Minimum baseline vertical speed for stars (px/frame)
     */
    this.SPEED_BASE = 0.05;

    /**
     * @tweakable Enable parallax effect (slower far stars, faster close)
     */
    this.USE_PARALLAX = true;

    /**
     * @tweakable Draw each star as a glowing radial gradient (true) or flat circle (false)
     */
    this.USE_GRADIENTS = true;

    /**
     * @tweakable Vertical background color gradient: top color
     */
    this.BG_GRAD_TOP = '#020528';

    /**
     * @tweakable Vertical background color gradient: bottom color
     */
    this.BG_GRAD_BOTTOM = '#0c0030';

    this.init();
  }

  init() {
    this.resizeCanvas();
    this.generateStars();
    this.startAnimation();
    this.addEventListeners();
  }

  resizeCanvas() {
    const w = window.innerWidth, h = window.innerHeight;
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
    this.lastW = w;
    this.lastH = h;
  }

  generateStars() {
    const W = this.canvas.width;
    const H = this.canvas.height;

    this.starList = Array.from({ length: this.STAR_COUNT }, () => {
      // Parallax 0.6..1.2 if enabled, else 1
      let size = Math.random() * (this.SIZE_RANGE[1] - this.SIZE_RANGE[0]) + this.SIZE_RANGE[0];
      const parallax = this.USE_PARALLAX
        ? (size - this.SIZE_RANGE[0])/(this.SIZE_RANGE[1] - this.SIZE_RANGE[0]) * 0.6 + 0.6
        : 1.0;

      return {
        x: Math.random() * W,
        y: Math.random() * H,
        size,
        color: this.STAR_COLORS[Math.floor(Math.random() * this.STAR_COLORS.length)],
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * (this.TWINKLE_RANGE[1] - this.TWINKLE_RANGE[0]) + this.TWINKLE_RANGE[0],
        parallax,
        alpha: 0.55 + 0.4 * Math.random()
      };
    });
  }

  drawSpaceGradient() {
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    grad.addColorStop(0, this.BG_GRAD_TOP);
    grad.addColorStop(1, this.BG_GRAD_BOTTOM);
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  animate = (timestamp) => {
    // Check for resize
    if (this.lastW !== window.innerWidth || this.lastH !== window.innerHeight) {
      this.resizeCanvas();
      this.generateStars();
    }

    // Clear & background gradient
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawSpaceGradient();

    const H = this.canvas.height, W = this.canvas.width;

    this.starList.forEach(star => {
      // Update vertical position (faster for parallax/size)
      star.y += this.SPEED_BASE * star.parallax + star.size * 0.003;

      // Loop to top if off screen
      if (star.y - star.size > H) {
        star.y = -star.size;
        star.x = Math.random() * W;
      }

      // Star twinkle (sinusoidal alpha)
      const tw = 0.3 + 0.7 * Math.abs(Math.sin(timestamp * star.twinkleSpeed * 0.0006 + star.twinklePhase));
      const alpha = Math.min(1.0, star.alpha * tw);

      if (this.USE_GRADIENTS) {
        // Draw glow gradient star
        const grad = this.ctx.createRadialGradient(
          star.x, star.y, star.size * 0.16,
          star.x, star.y, star.size * 0.92
        );
        grad.addColorStop(0, star.color);
        grad.addColorStop(1, "rgba(0,0,0,0.10)");
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.beginPath();
        this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        this.ctx.fillStyle = grad;
        this.ctx.shadowColor = star.color;
        this.ctx.shadowBlur = star.size * 1.8;
        this.ctx.fill();
        this.ctx.restore();
      } else {
        // Draw solid star
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.beginPath();
        this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        this.ctx.fillStyle = star.color;
        this.ctx.fill();
        this.ctx.restore();
      }
    });

    requestAnimationFrame(this.animate);
  };

  startAnimation() {
    requestAnimationFrame(this.animate);
  }

  addEventListeners() {
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.generateStars();
    });
  }
}

// Initialize when DOM is ready (for <canvas id="space-bg-canvas">)
document.addEventListener('DOMContentLoaded', () => {
  new SpaceBackground('space-bg-canvas');
});