// Exciting Neon Space Arcade Game Engine
(function () {
  'use strict';

  // --- Web Audio API Synth Engine ---
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.bgmTimer = null;
      this.step = 0;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    playLaser() {
      if (this.muted || !this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.12);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.12);
      } catch (e) {}
    }

    playExplosion(isBig = false) {
      if (this.muted || !this.ctx) return;
      try {
        const duration = isBig ? 0.5 : 0.25;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(isBig ? 600 : 1000, this.ctx.currentTime);
        filter.frequency.linearRampToValueAtTime(40, this.ctx.currentTime + duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(isBig ? 0.4 : 0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start();
        noise.stop(this.ctx.currentTime + duration);
      } catch (e) {}
    }

    playPowerup() {
      if (this.muted || !this.ctx) return;
      try {
        const notes = [300, 450, 600, 900];
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.05);

          gain.gain.setValueAtTime(0.15, this.ctx.currentTime + idx * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.05 + 0.08);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(this.ctx.currentTime + idx * 0.05);
          osc.stop(this.ctx.currentTime + idx * 0.05 + 0.08);
        });
      } catch (e) {}
    }

    playGameOver() {
      if (this.muted || !this.ctx) return;
      try {
        const notes = [400, 350, 300, 200];
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.15);

          gain.gain.setValueAtTime(0.25, this.ctx.currentTime + idx * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.15 + 0.2);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(this.ctx.currentTime + idx * 0.15);
          osc.stop(this.ctx.currentTime + idx * 0.15 + 0.2);
        });
      } catch (e) {}
    }

    startBGM() {
      if (this.bgmTimer) clearInterval(this.bgmTimer);
      const bassNotes = [110, 110, 130, 98, 110, 110, 146, 130];
      this.step = 0;

      this.bgmTimer = setInterval(() => {
        if (this.muted || !this.ctx || game.state !== 'PLAYING') return;
        try {
          const freq = bassNotes[this.step % bassNotes.length];
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.15);

          gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start();
          osc.stop(this.ctx.currentTime + 0.15);

          this.step++;
        } catch (e) {}
      }, 200);
    }

    stopBGM() {
      if (this.bgmTimer) {
        clearInterval(this.bgmTimer);
        this.bgmTimer = null;
      }
    }
  }

  const audio = new SoundEngine();

  // --- Main Game State & Configuration ---
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const game = {
    state: 'START', // 'START', 'PLAYING', 'PAUSED', 'GAMEOVER'
    score: 0,
    highScore: parseInt(localStorage.getItem('maya_high_score') || '0', 10),
    multiplier: 1,
    combo: 0,
    comboTimer: 0,
    wave: 1,
    shakeTime: 0,
    shakeMagnitude: 0,
    lastTime: 0,
    spawnTimer: 0,
    powerupTimer: 0,
    dpr: 1
  };

  function resizeCanvas() {
    game.dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * game.dpr;
    canvas.height = height * game.dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(game.dpr, game.dpr);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function triggerShake(magnitude = 10, duration = 0.25) {
    game.shakeMagnitude = magnitude;
    game.shakeTime = duration;
  }

  // --- Input Handling ---
  const keys = {};
  const touchState = {
    active: false,
    x: 0,
    y: 0,
    left: false,
    right: false,
    fire: false
  };

  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyP' || e.code === 'Escape') {
      togglePause();
    }
  });

  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  // Touch control elements
  const btnLeft = document.getElementById('btnLeft');
  const btnRight = document.getElementById('btnRight');
  const btnFire = document.getElementById('btnFire');

  function bindTouchBtn(btn, keyProp) {
    if (!btn) return;
    const start = (e) => { e.preventDefault(); touchState[keyProp] = true; };
    const end = (e) => { e.preventDefault(); touchState[keyProp] = false; };
    btn.addEventListener('touchstart', start, { passive: false });
    btn.addEventListener('touchend', end, { passive: false });
    btn.addEventListener('mousedown', start);
    btn.addEventListener('mouseup', end);
    btn.addEventListener('mouseleave', end);
  }

  bindTouchBtn(btnLeft, 'left');
  bindTouchBtn(btnRight, 'right');
  bindTouchBtn(btnFire, 'fire');

  // Direct canvas drag for touch screen space ship control
  canvas.addEventListener('touchstart', (e) => {
    if (game.state === 'PLAYING' && e.touches.length > 0) {
      touchState.active = true;
      touchState.x = e.touches[0].clientX;
      touchState.y = e.touches[0].clientY;
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (game.state === 'PLAYING' && e.touches.length > 0) {
      touchState.x = e.touches[0].clientX;
      touchState.y = e.touches[0].clientY;
    }
  }, { passive: true });

  canvas.addEventListener('touchend', () => {
    touchState.active = false;
  });

  // --- Game Entities ---
  let player;
  let bullets = [];
  let enemies = [];
  let particles = [];
  let powerups = [];
  let stars = [];
  let floatingTexts = [];

  class Star {
    constructor() {
      this.reset(true);
    }
    reset(randomY = false) {
      this.x = Math.random() * window.innerWidth;
      this.y = randomY ? Math.random() * window.innerHeight : -10;
      this.size = Math.random() * 2.2 + 0.8;
      this.speed = Math.random() * 2 + 0.5;
      this.alpha = Math.random() * 0.7 + 0.3;
    }
    update() {
      this.y += this.speed * (1 + (game.wave * 0.05));
      if (this.y > window.innerHeight) this.reset(false);
    }
    draw() {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Initialize Starfield
  for (let i = 0; i < 70; i++) {
    stars.push(new Star());
  }

  class Player {
    constructor() {
      this.width = 44;
      this.height = 44;
      this.x = window.innerWidth / 2;
      this.y = window.innerHeight - 90;
      this.speed = 7;
      this.hp = 100;
      this.maxHp = 100;
      this.shield = 0; // Shield points
      this.maxShield = 50;
      this.weaponType = 'single'; // 'single', 'double', 'triple', 'spread'
      this.weaponTimer = 0;
      this.fireCooldown = 0;
      this.invulnerableTimer = 0;
    }

    update(dt) {
      // Movement controls
      let moveX = 0;
      if (keys['ArrowLeft'] || keys['KeyA'] || touchState.left) moveX -= 1;
      if (keys['ArrowRight'] || keys['KeyD'] || touchState.right) moveX += 1;

      // Direct touch follow
      if (touchState.active) {
        const dx = touchState.x - this.x;
        if (Math.abs(dx) > 5) {
          moveX = Math.sign(dx) * Math.min(1, Math.abs(dx) / 30);
        }
      }

      this.x += moveX * this.speed * (dt * 60);

      // Clamp bounds
      const halfW = this.width / 2;
      if (this.x < halfW) this.x = halfW;
      if (this.x > window.innerWidth - halfW) this.x = window.innerWidth - halfW;

      // Auto fire or manual fire
      if (this.fireCooldown > 0) this.fireCooldown -= dt;

      const isFiring = keys['Space'] || keys['KeyW'] || keys['ArrowUp'] || touchState.fire || touchState.active;
      if (isFiring && this.fireCooldown <= 0) {
        this.shoot();
        this.fireCooldown = this.weaponType === 'spread' ? 0.22 : 0.14;
      }

      // Weapon timer countdown
      if (this.weaponTimer > 0) {
        this.weaponTimer -= dt;
        if (this.weaponTimer <= 0) {
          this.weaponType = 'single';
        }
      }

      if (this.invulnerableTimer > 0) {
        this.invulnerableTimer -= dt;
      }

      // Thruster trail particles
      if (Math.random() < 0.7) {
        particles.push(new Particle(
          this.x + (Math.random() * 12 - 6),
          this.y + 20,
          Math.random() * 2 - 1,
          Math.random() * 3 + 2,
          '#00f3ff',
          Math.random() * 3 + 2,
          0.3
        ));
      }
    }

    shoot() {
      audio.playLaser();
      const pY = this.y - 20;

      if (this.weaponType === 'single') {
        bullets.push(new Bullet(this.x, pY, 0, -14, '#00f3ff'));
      } else if (this.weaponType === 'double') {
        bullets.push(new Bullet(this.x - 12, pY, 0, -14, '#00f3ff'));
        bullets.push(new Bullet(this.x + 12, pY, 0, -14, '#00f3ff'));
      } else if (this.weaponType === 'triple') {
        bullets.push(new Bullet(this.x - 15, pY, -2, -14, '#ff007f'));
        bullets.push(new Bullet(this.x, pY, 0, -15, '#00f3ff'));
        bullets.push(new Bullet(this.x + 15, pY, 2, -14, '#ff007f'));
      } else if (this.weaponType === 'spread') {
        bullets.push(new Bullet(this.x - 15, pY, -4, -13, '#ffaa00'));
        bullets.push(new Bullet(this.x - 5, pY, -1.5, -14, '#ffaa00'));
        bullets.push(new Bullet(this.x + 5, pY, 1.5, -14, '#ffaa00'));
        bullets.push(new Bullet(this.x + 15, pY, 4, -13, '#ffaa00'));
      }
    }

    damage(amount) {
      if (this.invulnerableTimer > 0) return;

      audio.playExplosion(false);
      triggerShake(8, 0.2);

      if (this.shield > 0) {
        if (this.shield >= amount) {
          this.shield -= amount;
          amount = 0;
        } else {
          amount -= this.shield;
          this.shield = 0;
        }
      }

      if (amount > 0) {
        this.hp -= amount;
        if (this.hp <= 0) {
          this.hp = 0;
          gameOver();
        }
      }
      this.invulnerableTimer = 0.5;
    }

    draw() {
      if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 60) % 2 === 0) {
        return; // Blink on invulnerability
      }

      ctx.save();
      ctx.translate(this.x, this.y);

      // Draw Shield Aura if active
      if (this.shield > 0) {
        ctx.strokeStyle = `rgba(0, 243, 255, ${0.4 + (this.shield / this.maxShield) * 0.5})`;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00f3ff';
        ctx.beginPath();
        ctx.arc(0, 0, 28, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Ship body - Neon Cyber Fighter
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00f3ff';
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(20, 18);
      ctx.lineTo(10, 14);
      ctx.lineTo(0, 20);
      ctx.lineTo(-10, 14);
      ctx.lineTo(-20, 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cockpit glow
      ctx.fillStyle = '#ff007f';
      ctx.shadowColor = '#ff007f';
      ctx.beginPath();
      ctx.ellipse(0, -2, 4, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  class Bullet {
    constructor(x, y, vx, vy, color = '#00f3ff') {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.radius = 4;
      this.color = color;
      this.markedForDeletion = false;
    }

    update(dt) {
      this.x += this.vx * (dt * 60);
      this.y += this.vy * (dt * 60);

      if (this.y < -20 || this.x < -20 || this.x > window.innerWidth + 20) {
        this.markedForDeletion = true;
      }
    }

    draw() {
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class Enemy {
    constructor(type = 'basic') {
      this.type = type; // 'basic', 'fast', 'heavy', 'zigzag'
      this.x = Math.random() * (window.innerWidth - 60) + 30;
      this.y = -40;
      this.markedForDeletion = false;

      if (type === 'basic') {
        this.radius = 18;
        this.hp = 1;
        this.speed = Math.random() * 1.5 + 2.2 + (game.wave * 0.2);
        this.color = '#ff007f';
        this.points = 100;
      } else if (type === 'fast') {
        this.radius = 14;
        this.hp = 1;
        this.speed = Math.random() * 2 + 4.5 + (game.wave * 0.3);
        this.color = '#ffaa00';
        this.points = 150;
      } else if (type === 'heavy') {
        this.radius = 28;
        this.hp = 4 + Math.floor(game.wave * 0.5);
        this.speed = Math.random() * 0.8 + 1.2;
        this.color = '#a855f7';
        this.points = 300;
      } else if (type === 'zigzag') {
        this.radius = 16;
        this.hp = 2;
        this.speed = Math.random() * 1.2 + 2.5;
        this.startX = this.x;
        this.angle = 0;
        this.color = '#00ffaa';
        this.points = 200;
      }
    }

    update(dt) {
      this.y += this.speed * (dt * 60);

      if (this.type === 'zigzag') {
        this.angle += 0.08;
        this.x = this.startX + Math.sin(this.angle) * 45;
      }

      if (this.y > window.innerHeight + 40) {
        this.markedForDeletion = true;
        // Reset combo if enemy slips past
        resetCombo();
      }
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2.5;
      ctx.fillStyle = '#0f172a';

      if (this.type === 'basic') {
        // Octagon shape
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          const px = Math.cos(a) * this.radius;
          const py = Math.sin(a) * this.radius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (this.type === 'fast') {
        // Sharp triangle downward
        ctx.beginPath();
        ctx.moveTo(0, this.radius);
        ctx.lineTo(-this.radius, -this.radius);
        ctx.lineTo(this.radius, -this.radius);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (this.type === 'heavy') {
        // Hexagon with inner core
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.type === 'zigzag') {
        // Diamond
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(this.radius, 0);
        ctx.lineTo(0, this.radius);
        ctx.lineTo(-this.radius, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  class Powerup {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.radius = 14;
      this.speed = 2;
      this.markedForDeletion = false;

      const types = ['shield', 'triple', 'spread', 'health', 'bomb'];
      this.type = types[Math.floor(Math.random() * types.length)];

      const colorMap = {
        shield: '#00f3ff',
        triple: '#ff007f',
        spread: '#ffaa00',
        health: '#10b981',
        bomb: '#ef4444'
      };
      this.color = colorMap[this.type];
    }

    update(dt) {
      this.y += this.speed * (dt * 60);
      if (this.y > window.innerHeight + 30) this.markedForDeletion = true;
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.color;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();

      // Label symbol inside powerup
      ctx.fillStyle = '#0b1020';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const labelMap = { shield: 'S', triple: '3X', spread: 'W', health: '+', bomb: 'B' };
      ctx.fillText(labelMap[this.type], 0, 1);

      ctx.restore();
    }
  }

  class Particle {
    constructor(x, y, vx, vy, color, size = 3, life = 0.5) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.color = color;
      this.size = size;
      this.maxLife = life;
      this.life = life;
      this.markedForDeletion = false;
    }

    update(dt) {
      this.x += this.vx * (dt * 60);
      this.y += this.vy * (dt * 60);
      this.life -= dt;
      if (this.life <= 0) this.markedForDeletion = true;
    }

    draw() {
      const alpha = Math.max(0, this.life / this.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 6;
      ctx.shadowColor = this.color;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class FloatingText {
    constructor(x, y, text, color = '#ffffff') {
      this.x = x;
      this.y = y;
      this.text = text;
      this.color = color;
      this.life = 0.8;
      this.maxLife = 0.8;
      this.markedForDeletion = false;
    }

    update(dt) {
      this.y -= 30 * dt;
      this.life -= dt;
      if (this.life <= 0) this.markedForDeletion = true;
    }

    draw() {
      const alpha = Math.max(0, this.life / this.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.color;
      ctx.textAlign = 'center';
      ctx.fillText(this.text, this.x, this.y);
      ctx.restore();
    }
  }

  // --- Helper Functions ---
  function createExplosion(x, y, color = '#ff007f', count = 20) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 1.5;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = Math.random() * 4 + 2;
      const life = Math.random() * 0.4 + 0.3;
      particles.push(new Particle(x, y, vx, vy, color, size, life));
    }
  }

  function addCombo() {
    game.combo++;
    game.comboTimer = 2.5; // Combo expires after 2.5s of inactivity
    game.multiplier = Math.min(8, 1 + Math.floor(game.combo / 5));

    const comboElem = document.getElementById('comboText');
    if (comboElem) {
      if (game.combo > 1) {
        comboElem.textContent = `${game.combo}x COMBO (${game.multiplier}x Multiplier)!`;
        comboElem.classList.remove('hidden', 'pop-anim');
        void comboElem.offsetWidth; // Force reflow
        comboElem.classList.add('pop-anim');
      }
    }
  }

  function resetCombo() {
    game.combo = 0;
    game.multiplier = 1;
    const comboElem = document.getElementById('comboText');
    if (comboElem) comboElem.classList.add('hidden');
  }

  function applyPowerup(type) {
    audio.playPowerup();
    if (type === 'shield') {
      player.shield = Math.min(player.maxShield, player.shield + 30);
      floatingTexts.push(new FloatingText(player.x, player.y - 30, '+SHIELD!', '#00f3ff'));
    } else if (type === 'triple') {
      player.weaponType = 'triple';
      player.weaponTimer = 8;
      floatingTexts.push(new FloatingText(player.x, player.y - 30, 'TRIPLE SHOT!', '#ff007f'));
    } else if (type === 'spread') {
      player.weaponType = 'spread';
      player.weaponTimer = 8;
      floatingTexts.push(new FloatingText(player.x, player.y - 30, 'SPREAD LASER!', '#ffaa00'));
    } else if (type === 'health') {
      player.hp = Math.min(player.maxHp, player.hp + 35);
      floatingTexts.push(new FloatingText(player.x, player.y - 30, '+HP!', '#10b981'));
    } else if (type === 'bomb') {
      // Clear all enemies on screen
      triggerShake(16, 0.4);
      audio.playExplosion(true);
      enemies.forEach((enemy) => {
        createExplosion(enemy.x, enemy.y, enemy.color, 15);
        game.score += enemy.points * game.multiplier;
      });
      enemies = [];
      floatingTexts.push(new FloatingText(player.x, player.y - 30, 'NUKE DETONATED!', '#ef4444'));
    }
  }

  // --- Game Loop Update & Render ---
  function update(dt) {
    if (game.state !== 'PLAYING') return;

    // Handle combo decay
    if (game.comboTimer > 0) {
      game.comboTimer -= dt;
      if (game.comboTimer <= 0) {
        resetCombo();
      }
    }

    // Dynamic Spawning
    game.spawnTimer += dt;
    const spawnInterval = Math.max(0.4, 1.4 - (game.wave * 0.1));
    if (game.spawnTimer >= spawnInterval) {
      game.spawnTimer = 0;
      const rand = Math.random();
      let enemyType = 'basic';
      if (rand < 0.25) enemyType = 'fast';
      else if (rand < 0.45 && game.wave >= 2) enemyType = 'zigzag';
      else if (rand < 0.65 && game.wave >= 3) enemyType = 'heavy';

      enemies.push(new Enemy(enemyType));
    }

    // Increase difficulty wave over score
    const currentWave = Math.floor(game.score / 2000) + 1;
    if (currentWave !== game.wave) {
      game.wave = currentWave;
      floatingTexts.push(new FloatingText(window.innerWidth / 2, window.innerHeight / 3, `WAVE ${game.wave}!`, '#00f3ff'));
      const levelElem = document.getElementById('levelText');
      if (levelElem) levelElem.textContent = `WAVE ${game.wave}`;
    }

    // Update Player
    player.update(dt);

    // Update Bullets
    bullets.forEach((b) => b.update(dt));

    // Update Enemies & Collision checks
    enemies.forEach((enemy) => {
      enemy.update(dt);

      // Player vs Enemy collision
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < enemy.radius + player.width * 0.4) {
        enemy.markedForDeletion = true;
        createExplosion(enemy.x, enemy.y, enemy.color, 15);
        player.damage(25);
      }

      // Bullet vs Enemy collision
      bullets.forEach((bullet) => {
        if (bullet.markedForDeletion || enemy.markedForDeletion) return;
        const bdx = bullet.x - enemy.x;
        const bdy = bullet.y - enemy.y;
        const bdist = Math.hypot(bdx, bdy);

        if (bdist < enemy.radius + bullet.radius) {
          bullet.markedForDeletion = true;
          enemy.hp -= 1;

          // Spark particle
          particles.push(new Particle(bullet.x, bullet.y, Math.random() * 4 - 2, Math.random() * 4 - 2, enemy.color, 3, 0.2));

          if (enemy.hp <= 0) {
            enemy.markedForDeletion = true;
            audio.playExplosion(false);
            createExplosion(enemy.x, enemy.y, enemy.color, 18);
            addCombo();

            const pts = enemy.points * game.multiplier;
            game.score += pts;
            floatingTexts.push(new FloatingText(enemy.x, enemy.y, `+${pts}`, enemy.color));

            // Chance to drop powerup
            if (Math.random() < 0.12) {
              powerups.push(new Powerup(enemy.x, enemy.y));
            }
          }
        }
      });
    });

    // Update Powerups
    powerups.forEach((pow) => {
      pow.update(dt);
      const dx = pow.x - player.x;
      const dy = pow.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < pow.radius + player.width * 0.4) {
        pow.markedForDeletion = true;
        applyPowerup(pow.type);
      }
    });

    // Update Particles, Stars, Floating Texts
    particles.forEach((p) => p.update(dt));
    stars.forEach((s) => s.update());
    floatingTexts.forEach((ft) => ft.update(dt));

    // Garbage collection
    bullets = bullets.filter((b) => !b.markedForDeletion);
    enemies = enemies.filter((e) => !e.markedForDeletion);
    powerups = powerups.filter((p) => !p.markedForDeletion);
    particles = particles.filter((p) => !p.markedForDeletion);
    floatingTexts = floatingTexts.filter((ft) => !ft.markedForDeletion);

    // Update HUD UI
    updateHUD();
  }

  function updateHUD() {
    const scoreElem = document.getElementById('scoreText');
    const highScoreElem = document.getElementById('highScoreText');
    const hpBar = document.getElementById('hpBar');
    const shieldBar = document.getElementById('shieldBar');

    if (scoreElem) scoreElem.textContent = game.score;
    if (highScoreElem) highScoreElem.textContent = Math.max(game.score, game.highScore);

    if (hpBar) {
      const pct = Math.max(0, (player.hp / player.maxHp) * 100);
      hpBar.style.width = pct + '%';
    }
    if (shieldBar) {
      const spct = Math.max(0, (player.shield / player.maxShield) * 100);
      shieldBar.style.width = spct + '%';
    }
  }

  function render() {
    ctx.save();

    // Clear background
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    // Handle screen shake
    if (game.shakeTime > 0) {
      const dx = (Math.random() - 0.5) * game.shakeMagnitude;
      const dy = (Math.random() - 0.5) * game.shakeMagnitude;
      ctx.translate(dx, dy);
    }

    // Render background starfield
    stars.forEach((s) => s.draw());

    if (game.state === 'PLAYING' || game.state === 'PAUSED' || game.state === 'GAMEOVER') {
      // Render Game Objects
      powerups.forEach((pow) => pow.draw());
      bullets.forEach((b) => b.draw());
      enemies.forEach((e) => e.draw());
      if (game.state !== 'GAMEOVER') player.draw();
      particles.forEach((p) => p.draw());
      floatingTexts.forEach((ft) => ft.draw());
    }

    ctx.restore();
  }

  let lastTimestamp = performance.now();
  function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
    lastTimestamp = timestamp;

    if (game.shakeTime > 0) {
      game.shakeTime -= dt;
    }

    update(dt);
    render();

    requestAnimationFrame(gameLoop);
  }

  // --- Game Flow Control ---
  function startGame() {
    audio.init();
    audio.startBGM();

    player = new Player();
    bullets = [];
    enemies = [];
    particles = [];
    powerups = [];
    floatingTexts = [];

    game.score = 0;
    game.wave = 1;
    game.multiplier = 1;
    game.combo = 0;
    game.state = 'PLAYING';

    document.getElementById('startScreen')?.classList.add('hidden');
    document.getElementById('gameOverScreen')?.classList.add('hidden');
    document.getElementById('pauseScreen')?.classList.add('hidden');
    document.getElementById('hudOverlay')?.classList.remove('hidden');

    resetCombo();
    updateHUD();
  }

  function gameOver() {
    game.state = 'GAMEOVER';
    audio.stopBGM();
    audio.playGameOver();

    if (game.score > game.highScore) {
      game.highScore = game.score;
      localStorage.setItem('maya_high_score', game.highScore.toString());
    }

    const finalScoreElem = document.getElementById('finalScoreText');
    if (finalScoreElem) finalScoreElem.textContent = game.score;

    document.getElementById('hudOverlay')?.classList.add('hidden');
    document.getElementById('gameOverScreen')?.classList.remove('hidden');

    loadLeaderboard();
  }

  function togglePause() {
    if (game.state === 'PLAYING') {
      game.state = 'PAUSED';
      audio.stopBGM();
      document.getElementById('pauseScreen')?.classList.remove('hidden');
    } else if (game.state === 'PAUSED') {
      game.state = 'PLAYING';
      audio.startBGM();
      document.getElementById('pauseScreen')?.classList.add('hidden');
    }
  }

  // --- MayaDB Leaderboard Functions ---
  async function loadLeaderboard() {
    const listElem = document.getElementById('leaderboardList');
    if (!listElem) return;

    listElem.innerHTML = '<li class="loading">Loading scores...</li>';

    if (typeof window.MayaDB === 'undefined') {
      listElem.innerHTML = '<li><span>Scores available online</span></li>';
      return;
    }

    try {
      const records = await window.MayaDB.list('game_scores', { limit: 10 });
      if (!records || records.length === 0) {
        listElem.innerHTML = '<li><span>No high scores yet! Be the first!</span></li>';
        return;
      }

      listElem.innerHTML = '';
      records.forEach((item, index) => {
        const li = document.createElement('li');
        const nameSpan = document.createElement('span');
        nameSpan.className = 'player-name';
        nameSpan.textContent = `${index + 1}. ${item.data.name || 'Anonymous'}`;

        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'player-score';
        scoreSpan.textContent = item.data.score || 0;

        li.appendChild(nameSpan);
        li.appendChild(scoreSpan);
        listElem.appendChild(li);
      });
    } catch (err) {
      listElem.innerHTML = '<li><span>Unable to load leaderboard</span></li>';
    }
  }

  async function saveScore(name) {
    if (typeof window.MayaDB === 'undefined') return;

    try {
      await window.MayaDB.add('game_scores', {
        name: name.substring(0, 15),
        score: game.score,
        date: new Date().toISOString()
      });
      loadLeaderboard();
    } catch (err) {
      console.warn('Could not save score to MayaDB', err);
    }
  }

  // --- UI Event Listeners ---
  document.getElementById('startBtn')?.addEventListener('click', startGame);
  document.getElementById('restartBtn')?.addEventListener('click', startGame);
  document.getElementById('pauseBtn')?.addEventListener('click', togglePause);
  document.getElementById('resumeBtn')?.addEventListener('click', togglePause);

  const muteBtn = document.getElementById('muteBtn');
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      audio.muted = !audio.muted;
      muteBtn.textContent = audio.muted ? '🔇' : '🔊';
      if (audio.muted) audio.stopBGM();
      else if (game.state === 'PLAYING') audio.startBGM();
    });
  }

  const scoreForm = document.getElementById('saveScoreForm');
  if (scoreForm) {
    scoreForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('playerNameInput');
      if (input && input.value.trim()) {
        saveScore(input.value.trim());
        input.value = '';
        const submitBtn = scoreForm.querySelector('button');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Saved!';
        }
      }
    });
  }

  // Start animation loop
  requestAnimationFrame(gameLoop);
})();
