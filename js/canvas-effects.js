/**
 * AetherWeather — Dynamic Canvas Atmospheric Particle Engine
 * 60 FPS Canvas animations for Rain, Thunderstorms, Snow, Clear Night Stars, and Sunny Sunbeams.
 */

class WeatherCanvasEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.mode = 'clear-day'; // 'clear-day', 'clear-night', 'rain', 'thunder', 'snow', 'cloudy'
    this.particles = [];
    this.ripples = [];
    this.shootingStars = [];
    this.lightningAlpha = 0;
    this.lightningTimer = 0;
    this.sunAngle = 0;
    this.isRunning = true;
    this.animationFrameId = null;

    this.initCanvasSize();
    window.addEventListener('resize', () => this.initCanvasSize());
    this.initParticles();
    this.loop();
  }

  initCanvasSize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    this.initParticles();
  }

  setMode(newMode) {
    if (this.mode === newMode) return;
    this.mode = newMode;
    this.particles = [];
    this.ripples = [];
    this.shootingStars = [];
    this.lightningAlpha = 0;
    this.initParticles();
  }

  toggle() {
    this.isRunning = !this.isRunning;
    if (this.isRunning) {
      this.loop();
    } else {
      cancelAnimationFrame(this.animationFrameId);
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
    return this.isRunning;
  }

  initParticles() {
    this.particles = [];
    const count = this.getParticleCount();

    for (let i = 0; i < count; i++) {
      if (this.mode === 'rain' || this.mode === 'thunder') {
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          length: 15 + Math.random() * 25,
          speed: 12 + Math.random() * 12,
          opacity: 0.2 + Math.random() * 0.45,
          width: 1 + Math.random() * 1.5,
          wind: -2 + Math.random() * 1
        });
      } else if (this.mode === 'snow') {
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          radius: 1.5 + Math.random() * 3.5,
          speed: 0.8 + Math.random() * 1.8,
          wind: -0.5 + Math.random() * 1,
          swing: Math.random() * Math.PI * 2,
          swingSpeed: 0.02 + Math.random() * 0.03,
          opacity: 0.4 + Math.random() * 0.5
        });
      } else if (this.mode === 'clear-night') {
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          radius: 0.6 + Math.random() * 1.8,
          opacity: 0.2 + Math.random() * 0.7,
          twinkleSpeed: 0.01 + Math.random() * 0.03,
          phase: Math.random() * Math.PI * 2
        });
      } else if (this.mode === 'clear-day') {
        // Floating ambient golden sparkles / dust motes
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          radius: 1 + Math.random() * 2.5,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -0.3 - Math.random() * 0.5,
          opacity: 0.15 + Math.random() * 0.35,
          pulse: Math.random() * Math.PI * 2
        });
      } else if (this.mode === 'cloudy') {
        // Soft volumetric drifting fog dots
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          radius: 50 + Math.random() * 120,
          vx: 0.2 + Math.random() * 0.3,
          opacity: 0.02 + Math.random() * 0.04
        });
      }
    }
  }

  getParticleCount() {
    const isMobile = this.width < 768;
    if (this.mode === 'rain' || this.mode === 'thunder') return isMobile ? 80 : 160;
    if (this.mode === 'snow') return isMobile ? 60 : 120;
    if (this.mode === 'clear-night') return isMobile ? 90 : 180;
    if (this.mode === 'clear-day') return isMobile ? 30 : 60;
    if (this.mode === 'cloudy') return isMobile ? 15 : 25;
    return 40;
  }

  updateAndRender() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    if (this.mode === 'rain' || this.mode === 'thunder') {
      this.renderRain();
      if (this.mode === 'thunder') this.renderLightning();
    } else if (this.mode === 'snow') {
      this.renderSnow();
    } else if (this.mode === 'clear-night') {
      this.renderStars();
    } else if (this.mode === 'clear-day') {
      this.renderSunbeams();
    } else if (this.mode === 'cloudy') {
      this.renderClouds();
    }

    // Render floor ripples (rain impacts)
    this.renderRipples();
  }

  renderRain() {
    this.ctx.strokeStyle = '#38bdf8';
    this.ctx.lineCap = 'round';

    for (let p of this.particles) {
      this.ctx.beginPath();
      this.ctx.lineWidth = p.width;
      this.ctx.strokeStyle = `rgba(56, 189, 248, ${p.opacity})`;
      this.ctx.moveTo(p.x, p.y);
      this.ctx.lineTo(p.x + p.wind * 2, p.y + p.length);
      this.ctx.stroke();

      p.y += p.speed;
      p.x += p.wind;

      // When hitting ground or leaving screen
      if (p.y > this.height) {
        if (Math.random() < 0.2) {
          this.ripples.push({
            x: p.x,
            y: this.height - 5 - Math.random() * 20,
            radius: 1,
            maxRadius: 8 + Math.random() * 12,
            opacity: 0.5
          });
        }
        p.y = -p.length;
        p.x = Math.random() * this.width;
      }
    }
  }

  renderLightning() {
    this.lightningTimer++;
    if (this.lightningTimer > 180 && Math.random() < 0.03) {
      this.lightningAlpha = 0.55 + Math.random() * 0.35;
      this.lightningTimer = 0;
    }

    if (this.lightningAlpha > 0) {
      this.ctx.fillStyle = `rgba(216, 180, 254, ${this.lightningAlpha})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.lightningAlpha *= 0.88;
      if (this.lightningAlpha < 0.01) this.lightningAlpha = 0;
    }
  }

  renderSnow() {
    this.ctx.fillStyle = '#ffffff';

    for (let p of this.particles) {
      p.swing += p.swingSpeed;
      p.x += Math.sin(p.swing) * 0.8 + p.wind;
      p.y += p.speed;

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(240, 249, 255, ${p.opacity})`;
      this.ctx.fill();

      if (p.y > this.height) {
        p.y = -p.radius * 2;
        p.x = Math.random() * this.width;
      }
      if (p.x > this.width) p.x = 0;
      if (p.x < 0) p.x = this.width;
    }
  }

  renderStars() {
    for (let p of this.particles) {
      p.phase += p.twinkleSpeed;
      const currentOpacity = Math.max(0.1, p.opacity + Math.sin(p.phase) * 0.3);

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
      this.ctx.fill();
    }

    // Occasional shooting star
    if (Math.random() < 0.008 && this.shootingStars.length < 2) {
      this.shootingStars.push({
        x: Math.random() * this.width * 0.8,
        y: Math.random() * (this.height * 0.4),
        len: 80 + Math.random() * 80,
        speed: 15 + Math.random() * 8,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
        opacity: 1
      });
    }

    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const s = this.shootingStars[i];
      const endX = s.x - Math.cos(s.angle) * s.len;
      const endY = s.y - Math.sin(s.angle) * s.len;

      const grad = this.ctx.createLinearGradient(s.x, s.y, endX, endY);
      grad.addColorStop(0, `rgba(255, 255, 255, ${s.opacity})`);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      this.ctx.beginPath();
      this.ctx.moveTo(s.x, s.y);
      this.ctx.lineTo(endX, endY);
      this.ctx.strokeStyle = grad;
      this.ctx.lineWidth = 1.8;
      this.ctx.stroke();

      s.x += Math.cos(s.angle) * s.speed;
      s.y += Math.sin(s.angle) * s.speed;
      s.opacity -= 0.025;

      if (s.opacity <= 0 || s.x > this.width || s.y > this.height) {
        this.shootingStars.splice(i, 1);
      }
    }
  }

  renderSunbeams() {
    this.sunAngle += 0.001;
    const sunCenterX = this.width * 0.85;
    const sunCenterY = 80;

    // Soft warm radial glow
    const radial = this.ctx.createRadialGradient(sunCenterX, sunCenterY, 30, sunCenterX, sunCenterY, 350);
    radial.addColorStop(0, 'rgba(251, 191, 36, 0.16)');
    radial.addColorStop(0.5, 'rgba(251, 191, 36, 0.05)');
    radial.addColorStop(1, 'rgba(251, 191, 36, 0)');
    this.ctx.fillStyle = radial;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Subtle sun sparkles / motes
    for (let p of this.particles) {
      p.pulse += 0.02;
      p.x += p.vx;
      p.y += p.vy;

      const op = Math.max(0.05, p.opacity + Math.sin(p.pulse) * 0.15);
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(254, 240, 138, ${op})`;
      this.ctx.fill();

      if (p.y < 0) {
        p.y = this.height + 10;
        p.x = Math.random() * this.width;
      }
      if (p.x < 0 || p.x > this.width) {
        p.x = Math.random() * this.width;
      }
    }
  }

  renderClouds() {
    for (let p of this.particles) {
      p.x += p.vx;
      if (p.x - p.radius > this.width) {
        p.x = -p.radius;
        p.y = Math.random() * this.height;
      }

      const grad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
      grad.addColorStop(0, `rgba(203, 213, 225, ${p.opacity})`);
      grad.addColorStop(1, 'rgba(203, 213, 225, 0)');

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  renderRipples() {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      this.ctx.beginPath();
      this.ctx.ellipse(r.x, r.y, r.radius * 2, r.radius * 0.6, 0, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(56, 189, 248, ${r.opacity})`;
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      r.radius += 0.6;
      r.opacity -= 0.02;

      if (r.opacity <= 0 || r.radius > r.maxRadius) {
        this.ripples.splice(i, 1);
      }
    }
  }

  loop() {
    if (!this.isRunning) return;
    this.updateAndRender();
    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }
}

// Export instance
window.WeatherCanvasEngine = WeatherCanvasEngine;
