const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('bestScore');
const livesEl = document.getElementById('lives');
const overlay = document.getElementById('overlay');
const overlayText = document.getElementById('overlayText');
const startButton = document.getElementById('startButton');

const STORE_KEY = 'starShooterBest';
const width = canvas.width;
const height = canvas.height;

const state = {
  running: false,
  gameOver: false,
  score: 0,
  best: Number(localStorage.getItem(STORE_KEY) || 0),
  lives: 5,
  lastTime: 0,
  spawnTimer: 0,
  stars: [],
  bullets: [],
  enemyBullets: [],
  enemies: [],
  particles: [],
  pointerX: width / 2,
  keys: {
    left: false,
    right: false,
  },
};

const player = {
  x: width / 2,
  y: height - 38,
  width: 34,
  height: 28,
  speed: 440,
  cooldown: 0,
};

function resetStars() {
  state.stars = Array.from({ length: 120 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: Math.random() * 2.2 + 0.7,
    speed: Math.random() * 50 + 20,
  }));
}

function initGame() {
  state.running = true;
  state.gameOver = false;
  state.score = 0;
  state.lives = 5;
  state.spawnTimer = 0;
  state.bullets = [];
  state.enemyBullets = [];
  state.enemies = [];
  state.particles = [];
  player.x = width / 2;
  player.y = height - 38;
  player.cooldown = 0;
  updateHud();
  overlay.classList.add('hidden');
}

function endGame() {
  state.running = false;
  state.gameOver = true;
  state.best = Math.max(state.best, state.score);
  localStorage.setItem(STORE_KEY, String(state.best));
  bestScoreEl.textContent = String(state.best);
  overlayText.textContent = `游戏结束，最终分数：${state.score}`;
  overlay.classList.remove('hidden');
}

function updateHud() {
  scoreEl.textContent = String(state.score);
  bestScoreEl.textContent = String(state.best);
  livesEl.textContent = String(state.lives);
}

function firePlayerBullet() {
  if (!state.running || player.cooldown > 0) return;

  state.bullets.push({
    x: player.x,
    y: player.y - 18,
    radius: 5,
    speed: 540,
    color: '#7ef9ff',
  });

  player.cooldown = 0.18;
}

function spawnEnemy() {
  const size = 18 + Math.random() * 18;
  const enemy = {
    x: 20 + Math.random() * (width - 40),
    y: -size,
    radius: size,
    speedY: 70 + state.score * 0.8,
    speedX: (Math.random() - 0.5) * 80,
    color: `hsl(${Math.random() * 50 + 185}deg 90% 65%)`,
    shootCooldown: 1 + Math.random() * 2,
  };

  state.enemies.push(enemy);
}

function spawnEnemyBullet(enemy) {
  state.enemyBullets.push({
    x: enemy.x,
    y: enemy.y + enemy.radius,
    radius: 6,
    speed: 180 + state.score * 0.9,
    color: '#ff9f5f',
  });
}

function createBurst(x, y, color, count = 16) {
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count;
    const speed = 30 + Math.random() * 90;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.7 + Math.random() * 0.5,
      radius: 2 + Math.random() * 3,
      color,
    });
  }
}

function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
    }
  }
}

function updateStars(dt) {
  state.stars.forEach((star) => {
    star.y += star.speed * dt;
    if (star.y > height) {
      star.y = -5;
      star.x = Math.random() * width;
    }
  });
}

function updatePlayer(dt) {
  let direction = 0;

  if (state.keys.left) direction -= 1;
  if (state.keys.right) direction += 1;

  if (player.x < state.pointerX) {
    direction += 0.7;
  } else if (player.x > state.pointerX) {
    direction -= 0.7;
  }

  player.x += direction * player.speed * dt;
  player.x = Math.max(player.width / 2, Math.min(width - player.width / 2, player.x));
  player.cooldown = Math.max(0, player.cooldown - dt);
}

function intersects(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distance = Math.hypot(dx, dy);
  return distance < a.radius + b.radius;
}

function updateBullets(dt) {
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const bullet = state.bullets[i];
    bullet.y -= bullet.speed * dt;
    if (bullet.y < -20) {
      state.bullets.splice(i, 1);
      continue;
    }

    for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
      const enemy = state.enemies[j];
      if (intersects({ x: bullet.x, y: bullet.y, radius: bullet.radius }, { x: enemy.x, y: enemy.y, radius: enemy.radius })) {
        state.bullets.splice(i, 1);
        state.enemies.splice(j, 1);
        state.score += 10;
        createBurst(enemy.x, enemy.y, enemy.color, 18);
        updateHud();
        break;
      }
    }
  }
}

function updateEnemyBullets(dt) {
  for (let i = state.enemyBullets.length - 1; i >= 0; i -= 1) {
    const bullet = state.enemyBullets[i];
    bullet.y += bullet.speed * dt;

    if (bullet.y > height + 20) {
      state.enemyBullets.splice(i, 1);
      continue;
    }

    if (intersects({ x: bullet.x, y: bullet.y, radius: bullet.radius }, { x: player.x, y: player.y, radius: player.width / 2 })) {
      state.enemyBullets.splice(i, 1);
      state.lives -= 1;
      createBurst(player.x, player.y, '#ff5d73', 20);
      updateHud();

      if (state.lives <= 0) {
        endGame();
      }
    }
  }
}

function updateEnemies(dt) {
  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = state.enemies[i];
    enemy.x += enemy.speedX * dt;
    enemy.y += enemy.speedY * dt;
    enemy.shootCooldown -= dt;

    if (enemy.x < enemy.radius || enemy.x > width - enemy.radius) {
      enemy.speedX *= -1;
    }

    if (enemy.shootCooldown <= 0) {
      spawnEnemyBullet(enemy);
      enemy.shootCooldown = 1.1 + Math.random() * 1.5;
    }

    if (enemy.y > height + enemy.radius) {
      state.enemies.splice(i, 1);
      state.lives -= 1;
      createBurst(enemy.x, enemy.y, '#ff5d73', 14);
      updateHud();
      if (state.lives <= 0) {
        endGame();
      }
    }
  }
}

function updateGame(dt) {
  if (!state.running) return;

  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnEnemy();
    state.spawnTimer = Math.max(0.3, 1.1 - state.score * 0.0025);
  }

  updateStars(dt);
  updatePlayer(dt);
  updateBullets(dt);
  updateEnemies(dt);
  updateEnemyBullets(dt);
  updateParticles(dt);
}

function drawBackground() {
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = '#06131d';
  ctx.fillRect(0, 0, width, height);

  state.stars.forEach((star) => {
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);

  ctx.fillStyle = '#7ef9ff';
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(14, 18);
  ctx.lineTo(0, 12);
  ctx.lineTo(-14, 18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#dff9ff';
  ctx.fillRect(-4, 14, 8, 10);
  ctx.restore();
}

function drawBullets() {
  state.bullets.forEach((bullet) => {
    ctx.beginPath();
    ctx.fillStyle = bullet.color;
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  state.enemyBullets.forEach((bullet) => {
    ctx.beginPath();
    ctx.fillStyle = bullet.color;
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawEnemies() {
  state.enemies.forEach((enemy) => {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.moveTo(0, -enemy.radius);
    ctx.lineTo(enemy.radius, 0);
    ctx.lineTo(0, enemy.radius);
    ctx.lineTo(-enemy.radius, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
}

function drawParticles() {
  state.particles.forEach((particle) => {
    ctx.beginPath();
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function draw() {
  drawBackground();
  drawParticles();
  drawBullets();
  drawEnemies();
  drawPlayer();
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - state.lastTime) / 1000 || 0.016, 0.032);
  state.lastTime = timestamp;

  updateGame(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
    state.keys.left = true;
  }

  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
    state.keys.right = true;
  }

  if (event.code === 'Space') {
    event.preventDefault();
    if (!state.running) {
      initGame();
    }
    firePlayerBullet();
  }

  if (event.key === 'Enter' && !state.running) {
    initGame();
  }
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
    state.keys.left = false;
  }

  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
    state.keys.right = false;
  }
});

canvas.addEventListener('pointermove', (event) => {
  const rect = canvas.getBoundingClientRect();
  state.pointerX = ((event.clientX - rect.left) / rect.width) * width;
});

canvas.addEventListener('pointerdown', () => {
  if (!state.running) {
    initGame();
  }
  firePlayerBullet();
});

startButton.addEventListener('click', () => {
  initGame();
});

resetStars();
updateHud();
state.lastTime = performance.now();
requestAnimationFrame(gameLoop);
