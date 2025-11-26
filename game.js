import {
  COLORS,
  BASE_SPEED,
  BASE_ENERGY_MAX,
  ENERGY_REGEN,
  ENEMY_BULLET_SPEED,
  BASE_BULLET_SPEED,
} from "./core/constants.js";
import { spawnParticles, updateParticles as updateParticleList } from "./core/particles.js";
import { randRange, normalize, rotateVector } from "./core/utils.js";
import * as Endless from "./modes/endless.js";
import * as Rogue from "./modes/rogue.js";

let canvas = null;
let ctx = null;
let WIDTH = 900;
let HEIGHT = 600;
let lastTime = performance.now();
let delta = 1;
let deltaMs = 16.67;

const state = {
  width: WIDTH,
  height: HEIGHT,
  player: { x: WIDTH / 2, y: HEIGHT / 2, size: 32, speed: BASE_SPEED },
  energy: BASE_ENERGY_MAX,
  energyMax: BASE_ENERGY_MAX,
  bullets: [],
  enemyBullets: [],
  particles: [],
  backgroundStars: [],
  collectibles: [],
  enemies: [],
  bulletCooldown: 0,
  collectiblesTimer: 0,
  enemySpawnTimer: 0,
  enemySpawnInterval: 210,
  maxEnemies: 6,
  score: 0,
  lives: 4,
  invincibleTimer: 0,
  shieldTimer: 0,
  multiplier: 1,
  multiplierTimer: 0,
  level: 1,
  nextLevelScore: 0,
  bonusMessage: "",
  bonusMessageTimer: 0,
  weaponStage: 1,
  bulletSpeed: BASE_BULLET_SPEED,
  mousePos: { x: WIDTH / 2, y: HEIGHT / 2 },
  keys: {},
  isMouseDown: false,
  gameOver: false,
  paused: false,
  scene: "menu",
  mode: "endless",
  modeDifficulty: "normal",
  modeShots: 1,
  playerDamage: 1,
  orbitals: [],
  rampageTimer: 0,
  ricochetTimer: 0,
  timeStopTimer: 0,
  pendingFrozenKills: [],
  blinkCharges: 0,
  maxBlinkCharges: 3,
  modeElapsed: 0,
  itemSpawnTimer: 0,
  itemSpawnInterval: 160,
  effectBanner: { text: "", color: COLORS.white, timer: 0 },
  dt: 1,
  dtMs: 16.67,
  shakeTimer: 0,
  shakeMag: 0,
  poisonZones: [],
  rifts: [],
  touchMove: { active: false, id: null, origin: null, vec: { x: 0, y: 0 } },
  touchShoot: { active: false, id: null },
};

function getModeModule() {
  return state.mode === "rogue" ? Rogue : Endless;
}

export function initGame(canvasEl) {
  canvas = canvasEl;
  ctx = canvas.getContext("2d");
  WIDTH = canvas.width;
  HEIGHT = canvas.height;
  state.width = WIDTH;
  state.height = HEIGHT;
  initStarfield();
  resetGame();
}

export function startMode(mode, options = {}) {
  state.mode = mode;
  if (mode === "rogue") state.modeDifficulty = options.difficulty ?? "normal";
  state.scene = "game";
  resetGame();
}

export function togglePause() {
  if (state.gameOver || state.scene !== "game") return;
  state.paused = !state.paused;
  state.isMouseDown = false;
  state.keys[" "] = false;
}

function resetCommonState() {
  state.bullets = [];
  state.enemyBullets = [];
  state.particles = [];
  state.collectibles = [];
  state.enemies = [];
  state.poisonZones = [];
  state.rifts = [];
  state.bulletCooldown = 0;
  state.collectiblesTimer = 0;
  state.enemySpawnTimer = 0;
  state.score = 0;
  state.invincibleTimer = 0;
  state.shieldTimer = 0;
  state.bonusMessage = "";
  state.bonusMessageTimer = 0;
  state.gameOver = false;
  state.paused = false;
  state.isMouseDown = false;
  state.pendingFrozenKills = [];
  state.effectBanner = { text: "", color: COLORS.white, timer: 0 };
  state.dt = 1;
  state.dtMs = 16.67;
  state.shakeTimer = 0;
  state.shakeMag = 0;
  state.touchMove = { active: false, id: null, origin: null, vec: { x: 0, y: 0 } };
  state.touchShoot = { active: false, id: null };
}

function resetGame() {
  resetCommonState();
  const mod = getModeModule();
  if (mod.resetState) mod.resetState(state);
}

function initStarfield() {
  state.backgroundStars = Array.from({ length: 80 }, () => ({
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    size: randRange(0.8, 2.2),
    speed: randRange(0.15, 0.55),
    offset: Math.random() * 360,
  }));
}

function updateStarfield() {
  for (const star of state.backgroundStars) {
    star.y += star.speed * delta;
    if (star.y > HEIGHT + 10) {
      star.y = -10;
      star.x = Math.random() * WIDTH;
    }
  }
}

function movePlayer() {
  let dx = 0;
  let dy = 0;
  if (state.keys["a"] || state.keys["ArrowLeft"]) dx -= state.player.speed * delta;
  if (state.keys["d"] || state.keys["ArrowRight"]) dx += state.player.speed * delta;
  if (state.keys["w"] || state.keys["ArrowUp"]) dy -= state.player.speed * delta;
  if (state.keys["s"] || state.keys["ArrowDown"]) dy += state.player.speed * delta;
  if (state.touchMove?.active) {
    dx += state.touchMove.vec.x * state.player.speed * delta;
    dy += state.touchMove.vec.y * state.player.speed * delta;
  }
  if (dx && dy) {
    dx *= Math.SQRT1_2;
    dy *= Math.SQRT1_2;
  }
  state.player.x = Math.min(Math.max(state.player.x + dx, state.player.size / 2), WIDTH - state.player.size / 2);
  state.player.y = Math.min(Math.max(state.player.y + dy, state.player.size / 2), HEIGHT - state.player.size / 2);
}

function moveEnemies() {
  if (state.mode === "rogue" && state.timeStopTimer > 0) return;
  for (const enemy of state.enemies) {
    const toPlayer = { x: state.player.x - enemy.pos.x, y: state.player.y - enemy.pos.y };
    const distance = Math.hypot(toPlayer.x, toPlayer.y) || 0.0001;
    const baseDir = { x: toPlayer.x / distance, y: toPlayer.y / distance };
    const speedFactor = enemy.slowTimer > 0 ? 0.55 : 1;
    const effSpeed = (enemy.baseSpeed ?? enemy.speed) * speedFactor;

    switch (enemy.behavior) {
      case "slow":
        enemy.pos.x += baseDir.x * effSpeed * delta;
        enemy.pos.y += baseDir.y * effSpeed * delta;
        break;
      case "sneak": {
        const perpendicular = { x: -baseDir.y, y: baseDir.x };
        enemy.pos.x += (baseDir.x * 0.7 + perpendicular.x * 0.35) * effSpeed * delta;
        enemy.pos.y += (baseDir.y * 0.7 + perpendicular.y * 0.35) * effSpeed * delta;
        break;
      }
      case "zigzag": {
        enemy.zigzagTimer += 1 * delta;
        if (enemy.zigzagTimer >= 45) {
          enemy.zigzagTimer -= 45;
          enemy.zigzagDir *= -1;
        }
        const sideways = { x: -baseDir.y * 0.6 * enemy.zigzagDir, y: baseDir.x * 0.6 * enemy.zigzagDir };
        enemy.pos.x += (baseDir.x + sideways.x) * effSpeed * delta;
        enemy.pos.y += (baseDir.y + sideways.y) * effSpeed * delta;
        break;
      }
      case "shooter": {
        const preferred = 220;
        if (distance > preferred + 20) {
          enemy.pos.x += baseDir.x * effSpeed * delta;
          enemy.pos.y += baseDir.y * effSpeed * delta;
        } else if (distance < preferred - 30) {
          enemy.pos.x -= baseDir.x * effSpeed * delta;
          enemy.pos.y -= baseDir.y * effSpeed * delta;
        }
        enemy.shootCooldown -= 1 * delta;
        if (enemy.shootCooldown <= 0) {
          shootEnemyBullet(enemy);
          enemy.shootCooldown = randRange(110, 150);
        }
        break;
      }
      case "splitter":
        enemy.pos.x += baseDir.x * effSpeed * delta;
        enemy.pos.y += baseDir.y * effSpeed * delta;
        break;
      case "brute":
        enemy.pos.x += baseDir.x * effSpeed * 0.9 * delta;
        enemy.pos.y += baseDir.y * effSpeed * 0.9 * delta;
        break;
      case "commander": {
        enemy.pos.x += baseDir.x * effSpeed * 0.85 * delta;
        enemy.pos.y += baseDir.y * effSpeed * 0.85 * delta;
        enemy.shieldCooldown -= 1 * delta;
        if (enemy.shieldCooldown <= 0) {
          for (const ally of state.enemies) {
            const d = Math.hypot(ally.pos.x - enemy.pos.x, ally.pos.y - enemy.pos.y);
            if (d <= 150) ally.shieldHp = Math.max(ally.shieldHp ?? 0, 3);
          }
          enemy.shieldCooldown = 200;
        }
        break;
      }
      case "toxic": {
        enemy.pos.x += baseDir.x * effSpeed * delta;
        enemy.pos.y += baseDir.y * effSpeed * delta;
        enemy.toxinTimer = (enemy.toxinTimer ?? 0) + delta;
        if (enemy.toxinTimer >= 40) {
          state.poisonZones.push({
            x: enemy.pos.x,
            y: enemy.pos.y,
            radius: 32,
            color: "#7CFFAA",
            timer: 420,
          });
          enemy.toxinTimer = 0;
        }
        break;
      }
      case "assassin": {
        enemy.phaseCooldown -= 1 * delta;
        if (enemy.phaseCooldown <= 0) {
          enemy.invisibleTimer = 60;
          enemy.phaseCooldown = 200;
          spawnParticles(state, {
            x: enemy.pos.x,
            y: enemy.pos.y,
            color: enemy.color,
            count: 18,
            speed: [1.2, 3.0],
            size: [2, 4],
            life: [12, 22],
          });
          enemy.pos.x = state.player.x + randRange(-120, 120);
          enemy.pos.y = state.player.y + randRange(-120, 120);
          spawnParticles(state, {
            x: enemy.pos.x,
            y: enemy.pos.y,
            color: "#E0E4FF",
            count: 16,
            speed: [1.0, 2.4],
            size: [2, 4],
            life: [12, 20],
          });
          enemy.phaseFlashTimer = 18;
        }
        if (enemy.invisibleTimer > 0) {
          enemy.invisibleTimer -= 1 * delta;
          enemy.pos.x += baseDir.x * effSpeed * 0.4 * delta;
          enemy.pos.y += baseDir.y * effSpeed * 0.4 * delta;
        } else {
          enemy.pos.x += baseDir.x * effSpeed * 1.4 * delta;
          enemy.pos.y += baseDir.y * effSpeed * 1.4 * delta;
        }
        break;
      }
      case "rift": {
        enemy.pos.x += baseDir.x * effSpeed * 0.75 * delta;
        enemy.pos.y += baseDir.y * effSpeed * 0.75 * delta;
        enemy.riftCooldown -= 1 * delta;
        if (enemy.riftCooldown <= 0) {
          if (!state.rifts) state.rifts = [];
          state.rifts.push({
            x: enemy.pos.x + randRange(-10, 10),
            y: enemy.pos.y + randRange(-10, 10),
            radius: 26,
            timer: 360,
            spawnTimer: 0,
          });
          enemy.riftCooldown = randRange(180, 240);
        }
        break;
      }
      case "charger": {
        enemy.dashCooldown -= 1 * delta;
        if (enemy.state === "chase") {
          enemy.pos.x += baseDir.x * effSpeed * delta;
          enemy.pos.y += baseDir.y * effSpeed * delta;
          if (enemy.dashCooldown <= 0) {
            enemy.state = "windup";
            enemy.stateTimer = 30;
          }
        } else if (enemy.state === "windup") {
          enemy.stateTimer -= 1 * delta;
          enemy.pos.x += randRange(-1, 1) * delta;
          enemy.pos.y += randRange(-1, 1) * delta;
          if (enemy.stateTimer <= 0) {
            enemy.state = "dash";
            enemy.stateTimer = 20;
            enemy.dashDir = { ...baseDir };
          }
        } else if (enemy.state === "dash") {
          enemy.pos.x += enemy.dashDir.x * effSpeed * 4.5 * delta;
          enemy.pos.y += enemy.dashDir.y * effSpeed * 4.5 * delta;
          enemy.stateTimer -= 1 * delta;
          if (enemy.stateTimer <= 0) {
            enemy.state = "chase";
            enemy.dashCooldown = randRange(120, 170);
          }
        }
        break;
      }
    }
  }
}

function shootEnemyBullet(enemy) {
  const direction = normalize({ x: state.player.x - enemy.pos.x, y: state.player.y - enemy.pos.y });
  state.enemyBullets.push({
    pos: { x: enemy.pos.x, y: enemy.pos.y },
    vel: { x: direction.x * ENEMY_BULLET_SPEED, y: direction.y * ENEMY_BULLET_SPEED },
    radius: 6,
    color: enemy.color,
  });
}

function updateOrbitals() {
  if (state.mode !== "rogue" || !state.orbitals.length) return;
  const baseRadius = state.player.size * 1.6;
  state.orbitals.forEach((orb, idx) => {
    const orbitRadius = baseRadius + idx * 2;
    orb.angle = (orb.angle ?? Math.random() * Math.PI * 2) + (orb.speed ?? 0.05) * delta;
    orb.pos = {
      x: state.player.x + Math.cos(orb.angle) * orbitRadius,
      y: state.player.y + Math.sin(orb.angle) * orbitRadius,
    };
  });
}

function updateBullets() {
  const arena = { x: -40, y: -40, w: WIDTH + 80, h: HEIGHT + 80 };
  state.bullets = state.bullets.filter((bullet) => {
    bullet.pos.x += bullet.vel.x * delta;
    bullet.pos.y += bullet.vel.y * delta;
    if (state.mode === "rogue" && bullet.ricochet) {
      let bounced = false;
      if ((bullet.pos.x <= 0 && bullet.vel.x < 0) || (bullet.pos.x >= WIDTH && bullet.vel.x > 0)) {
        bullet.vel.x *= -1;
        bounced = true;
      }
      if ((bullet.pos.y <= 0 && bullet.vel.y < 0) || (bullet.pos.y >= HEIGHT && bullet.vel.y > 0)) {
        bullet.vel.y *= -1;
        bounced = true;
      }
      if (bounced) {
        if (bullet.bounced) return false;
        bullet.bounced = true;
      }
    }
    return (
      bullet.pos.x >= arena.x &&
      bullet.pos.x <= arena.x + arena.w &&
      bullet.pos.y >= arena.y &&
      bullet.pos.y <= arena.y + arena.h
    );
  });

  state.enemyBullets = state.enemyBullets.filter((bullet) => {
    if (!(state.mode === "rogue" && state.timeStopTimer > 0)) {
      bullet.pos.x += bullet.vel.x * delta;
      bullet.pos.y += bullet.vel.y * delta;
    }
    return bullet.pos.x >= arena.x && bullet.pos.x <= arena.x + arena.w && bullet.pos.y >= arena.y && bullet.pos.y <= arena.y + arena.h;
  });
}

function handlePlayerDamage() {
  if (state.shieldTimer > 0) {
    state.shieldTimer = Math.max(0, state.shieldTimer - 120);
    state.invincibleTimer = 30;
    spawnParticles(state, {
      x: state.player.x,
      y: state.player.y,
      color: COLORS.cyan,
      count: 16,
      speed: [1, 3],
      size: [2, 4],
      life: [16, 28],
    });
    return;
  }
  if (state.invincibleTimer > 0) return;
  state.lives -= 1;
  state.invincibleTimer = 90;
  spawnParticles(state, {
    x: state.player.x,
    y: state.player.y,
    color: COLORS.red,
    count: 20,
    speed: [1.2, 3.5],
    size: [2, 5],
    life: [18, 30],
  });
  if (state.lives <= 0) state.gameOver = true;
}

function checkCollisions() {
  const playerRadius = state.player.size / 2;
  if (state.poisonZones?.length) {
    for (const zone of state.poisonZones) {
      const dist = Math.hypot(state.player.x - zone.x, state.player.y - zone.y);
      if (dist < zone.radius) {
        state.energy = Math.max(0, state.energy - 0.8 * delta);
        break;
      }
    }
  }
  for (const enemy of state.enemies) {
    const dist = Math.hypot(state.player.x - enemy.pos.x, state.player.y - enemy.pos.y);
    if (dist < playerRadius + enemy.radius) {
      if (state.mode === "rogue" && state.rampageTimer > 0) {
        enemy.hp = 0;
        enemy.pendingDeath = state.timeStopTimer > 0;
        if (enemy.pendingDeath) state.pendingFrozenKills.push(enemy);
        else
          spawnParticles(state, {
            x: enemy.pos.x,
            y: enemy.pos.y,
            color: enemy.color,
            count: 14,
            speed: [1.2, 3.4],
            size: [2, 4],
            life: [16, 28],
          });
      } else if (!(state.mode === "rogue" && state.timeStopTimer > 0)) {
        handlePlayerDamage();
      }
      break;
    }
  }
  if (!(state.mode === "rogue" && state.timeStopTimer > 0)) {
    for (const bullet of state.enemyBullets) {
      if (
        bullet.pos.x >= state.player.x - playerRadius &&
        bullet.pos.x <= state.player.x + playerRadius &&
        bullet.pos.y >= state.player.y - playerRadius &&
        bullet.pos.y <= state.player.y + playerRadius
      ) {
        bullet.pos.x = -9999;
        handlePlayerDamage();
      }
    }
  }
  state.enemyBullets = state.enemyBullets.filter((b) => b.pos.x > -900);
}

function flushFrozenDeaths() {
  if (!state.pendingFrozenKills.length) return;
  const killSet = new Set(state.pendingFrozenKills);
  const survivors = [];
  for (const enemy of state.enemies) {
    if (killSet.has(enemy)) {
      spawnParticles(state, {
        x: enemy.pos.x,
        y: enemy.pos.y,
        color: enemy.color,
        count: 14,
        speed: [1.2, 3.4],
        size: [2, 4],
        life: [16, 28],
      });
      state.score += 12;
    } else {
      enemy.pendingDeath = false;
      survivors.push(enemy);
    }
  }
  state.enemies = survivors;
  state.pendingFrozenKills = [];
}

function updateTimers() {
  if (state.energy < state.energyMax) {
    state.energy = Math.min(state.energyMax, state.energy + ENERGY_REGEN * delta);
  }
  if (state.multiplierTimer > 0) {
    state.multiplierTimer -= 1 * delta;
    if (state.multiplierTimer <= 0) state.multiplier = 1;
  }
  if (state.shieldTimer > 0) state.shieldTimer -= 1 * delta;
  if (state.invincibleTimer > 0) state.invincibleTimer -= 1 * delta;
  if (state.bulletCooldown > 0) state.bulletCooldown -= 1 * delta;
  if (state.bonusMessageTimer > 0) state.bonusMessageTimer -= 1 * delta;
  if (state.rampageTimer > 0) state.rampageTimer -= 1 * delta;
  if (state.ricochetTimer > 0) state.ricochetTimer -= 1 * delta;
  const wasTimeStop = state.timeStopTimer > 0;
  if (state.timeStopTimer > 0) state.timeStopTimer -= 1 * delta;
  if (state.timeStopTimer <= 0) {
    state.timeStopTimer = 0;
    if (wasTimeStop) triggerShake(16, 5);
    if (state.pendingFrozenKills.length) flushFrozenDeaths();
  }
  if (state.effectBanner?.timer > 0) state.effectBanner.timer -= 1 * delta;
  state.enemies.forEach((enemy) => {
    if (enemy.hitFlashTimer > 0) enemy.hitFlashTimer -= 1 * delta;
    if (enemy.slowTimer > 0) enemy.slowTimer -= 1 * delta;
    if (enemy.phaseFlashTimer > 0) enemy.phaseFlashTimer -= 1 * delta;
  });
}

function triggerShake(duration = 18, magnitude = 5) {
  state.shakeTimer = duration;
  state.shakeMag = magnitude;
}

function updateGame() {
  updateStarfield();
  updateParticleList(state, delta);
  if (state.scene !== "game") {
    return;
  }
  if (state.paused) return;
  if (!state.gameOver) {
    const mod = getModeModule();
    if (mod.update) mod.update(state, delta);
    movePlayer();
    moveEnemies();
    updateOrbitals();
    updateBullets();
    checkCollisions();
    updateTimers();
  } else {
    updateBullets();
  }
  if (state.shakeTimer > 0) state.shakeTimer -= 1 * delta;
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, "#181f46");
  gradient.addColorStop(0.4, "#0d1331");
  gradient.addColorStop(1, "#05060f");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  for (const star of state.backgroundStars) {
    const twinkle = (Math.sin(Date.now() * 0.002 + star.offset) + 1) * 0.3;
    ctx.globalAlpha = 0.2 + twinkle;
    ctx.fillStyle = COLORS.white;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawParticles() {
  ctx.save();
  for (const particle of state.particles) {
    ctx.globalAlpha = Math.max(0, particle.alpha);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.pos.x, particle.pos.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawCollectibles() {
  for (const item of state.collectibles) {
    ctx.save();
    ctx.shadowColor = item.glow ?? item.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = item.color;
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(item.pos.x, item.pos.y, item.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  if (state.poisonZones?.length) {
    ctx.save();
    for (const zone of state.poisonZones) {
      const g = ctx.createRadialGradient(zone.x, zone.y, 0, zone.x, zone.y, zone.radius);
      g.addColorStop(0, "rgba(140,255,170,0.3)");
      g.addColorStop(1, "rgba(80,140,100,0.05)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  if (state.rifts?.length) {
    ctx.save();
    for (const rift of state.rifts) {
      const g = ctx.createRadialGradient(rift.x, rift.y, 0, rift.x, rift.y, rift.radius);
      g.addColorStop(0, "rgba(200,120,255,0.3)");
      g.addColorStop(1, "rgba(100,60,140,0.1)");
      ctx.strokeStyle = "rgba(200,120,255,0.8)";
      ctx.fillStyle = g;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(rift.x, rift.y, rift.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawEnemyShape(enemy) {
  const gradient = ctx.createRadialGradient(enemy.pos.x, enemy.pos.y, enemy.radius * 0.2, enemy.pos.x, enemy.pos.y, enemy.radius);
  gradient.addColorStop(0, "rgba(255,255,255,0.85)");
  gradient.addColorStop(1, enemy.color);
  ctx.fillStyle = gradient;
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 2;

  switch (enemy.behavior) {
    case "slow":
      ctx.beginPath(); ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); break;
    case "sneak":
      ctx.beginPath();
      ctx.moveTo(enemy.pos.x, enemy.pos.y - enemy.radius);
      ctx.lineTo(enemy.pos.x - enemy.radius, enemy.pos.y + enemy.radius);
      ctx.lineTo(enemy.pos.x + enemy.radius, enemy.pos.y + enemy.radius);
      ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case "zigzag": {
      const pts = [
        { x: enemy.pos.x, y: enemy.pos.y - enemy.radius },
        { x: enemy.pos.x + enemy.radius, y: enemy.pos.y },
        { x: enemy.pos.x, y: enemy.pos.y + enemy.radius },
        { x: enemy.pos.x - enemy.radius, y: enemy.pos.y },
      ];
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    }
    case "shooter": {
      const pts = regularPolygonPoints(enemy.pos.x, enemy.pos.y, enemy.radius, 6, 30);
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath(); ctx.fill(); ctx.strokeStyle = COLORS.cyan; ctx.stroke(); break;
    }
    case "splitter":
      ctx.beginPath(); ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.strokeStyle = "rgba(255,180,180,0.6)"; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius * 1.2, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); break;
    case "brute": {
      const s = enemy.radius * 2;
      ctx.fillRect(enemy.pos.x - enemy.radius, enemy.pos.y - enemy.radius, s, s);
      ctx.strokeRect(enemy.pos.x - enemy.radius, enemy.pos.y - enemy.radius, s, s); break;
    }
    case "commander":
      ctx.beginPath(); ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      const pulse = 1 + 0.05 * Math.sin(performance.now() * 0.005);
      ctx.save(); ctx.strokeStyle = "#9CF4FF"; ctx.globalAlpha = 0.6; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius * 1.4 * pulse, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); break;
    case "toxic": {
      const g = ctx.createRadialGradient(enemy.pos.x, enemy.pos.y, enemy.radius * 0.2, enemy.pos.x, enemy.pos.y, enemy.radius * 1.3);
      g.addColorStop(0, "rgba(180,255,200,0.9)"); g.addColorStop(1, "rgba(80,180,120,0.6)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius, 0, Math.PI * 2); ctx.fill(); break;
    }
    case "assassin":
      ctx.save(); ctx.globalAlpha = enemy.invisibleTimer > 0 ? 0.28 : 0.95; ctx.strokeStyle = enemy.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(enemy.pos.x, enemy.pos.y - enemy.radius);
      ctx.lineTo(enemy.pos.x + enemy.radius, enemy.pos.y + enemy.radius * 0.5);
      ctx.lineTo(enemy.pos.x - enemy.radius, enemy.pos.y + enemy.radius * 0.5);
      ctx.closePath(); ctx.stroke();
      if (enemy.phaseFlashTimer > 0) {
        const flashAlpha = Math.min(0.7, 0.3 + enemy.phaseFlashTimer / 20);
        ctx.globalAlpha = flashAlpha;
        ctx.strokeStyle = "#E0E4FF";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.restore(); break;
    case "rift":
      ctx.save(); ctx.strokeStyle = "#D8B0FF"; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i < 14; i += 1) { const ang = (Math.PI * 2 * i) / 14; const r = enemy.radius * (0.8 + 0.2 * Math.sin(performance.now() * 0.005 + i));
        const px = enemy.pos.x + Math.cos(ang) * r; const py = enemy.pos.y + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
      ctx.closePath(); ctx.stroke(); ctx.restore(); break;
    case "charger": {
      const s = enemy.radius * 2;
      ctx.fillRect(enemy.pos.x - enemy.radius, enemy.pos.y - enemy.radius, s, s);
      ctx.strokeRect(enemy.pos.x - enemy.radius, enemy.pos.y - enemy.radius, s, s);
      ctx.beginPath(); ctx.moveTo(enemy.pos.x, enemy.pos.y - enemy.radius); ctx.lineTo(enemy.pos.x, enemy.pos.y + enemy.radius);
      ctx.strokeStyle = COLORS.white; ctx.stroke(); break;
    }
    default:
      ctx.beginPath(); ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius, 0, Math.PI * 2); ctx.fill(); break;
  }

  if (enemy.hitFlashTimer > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.6, 0.25 + enemy.hitFlashTimer / 20);
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}


function regularPolygonPoints(cx, cy, radius, sides, rotationDeg = 0) {
  const points = [];
  const rotation = (rotationDeg * Math.PI) / 180;
  for (let i = 0; i < sides; i += 1) {
    const angle = rotation + (i * Math.PI * 2) / sides;
    points.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
  }
  return points;
}

function drawBullets() {
  for (const bullet of state.bullets) {
    ctx.save();
    const r = bullet.radius ?? 4;
    const grad = ctx.createRadialGradient(bullet.pos.x, bullet.pos.y, r * 0.15, bullet.pos.x, bullet.pos.y, r * 1.4);
    grad.addColorStop(0, "rgba(255,255,255,0.95)");
    grad.addColorStop(0.45, (bullet.color ?? COLORS.cyan));
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.shadowColor = bullet.glow ?? bullet.color ?? COLORS.cyan;
    ctx.shadowBlur = 18;
    ctx.fillStyle = grad;
    ctx.strokeStyle = bullet.glow ?? "rgba(255,255,255,0.8)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(bullet.pos.x, bullet.pos.y, r * 1.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  for (const bullet of state.enemyBullets) {
    ctx.save();
    ctx.shadowColor = bullet.color ?? COLORS.red;
    ctx.shadowBlur = 8;
    ctx.fillStyle = bullet.color ?? COLORS.red;
    ctx.beginPath();
    ctx.arc(bullet.pos.x, bullet.pos.y, bullet.radius ?? 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  if (state.mode === "rogue") {
    ctx.save();
    ctx.shadowColor = COLORS.purple;
    ctx.shadowBlur = 8;
    ctx.fillStyle = COLORS.purple;
    for (const orb of state.orbitals) {
      if (!orb.pos) continue;
      ctx.beginPath();
      ctx.arc(orb.pos.x, orb.pos.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawEnergyBar() {
  const barX = WIDTH - 190;
  const barY = 20;
  ctx.fillStyle = "rgba(40,45,80,0.9)";
  ctx.fillRect(barX, barY, 160, 18);
  const fill = ((state.energy / state.energyMax) * 152) | 0;
  ctx.fillStyle = state.energy > state.energyMax * 0.5 ? COLORS.cyan : COLORS.orange;
  ctx.fillRect(barX + 4, barY + 4, Math.max(0, fill - 8), 10);
  ctx.fillStyle = COLORS.white;
  ctx.font = "14px Segoe UI";
  ctx.fillText("Energy", barX, barY - 4);
}

function drawEffectBanner() {
  if (!state.effectBanner || state.effectBanner.timer <= 0) return;
  const { text, color, timer } = state.effectBanner;
  const alpha = Math.min(1, timer / 30);
  const pulse = 1 + 0.06 * Math.sin(timer * 0.3);
  ctx.save();
  ctx.translate(WIDTH / 2, 70);
  ctx.scale(pulse, pulse);
  ctx.globalAlpha = alpha;
  const gradient = ctx.createLinearGradient(-220, 0, 220, 0);
  gradient.addColorStop(0, "rgba(255,255,255,0.05)");
  gradient.addColorStop(0.5, color ?? COLORS.cyan);
  gradient.addColorStop(1, "rgba(255,255,255,0.05)");
  ctx.fillStyle = gradient;
  ctx.shadowColor = color ?? COLORS.white;
  ctx.shadowBlur = 18;
  ctx.font = "32px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function drawTimeStopHourglass() {
  if (state.timeStopTimer <= 0) return;
  const duration = 360;
  const progress = 1 - state.timeStopTimer / duration;
  const angle = Math.PI * progress;
  const x = WIDTH / 2;
  const y = 120;
  const size = 28;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.shadowColor = COLORS.gold;
  ctx.shadowBlur = 16;
  ctx.fillStyle = COLORS.gold;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-size, -size);
  ctx.lineTo(size, -size);
  ctx.lineTo(-size, size);
  ctx.lineTo(size, size);
  ctx.moveTo(-size, -size);
  ctx.lineTo(size, size);
  ctx.moveTo(size, -size);
  ctx.lineTo(-size, size);
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  const mod = getModeModule();
  if (mod.drawHUD) {
    mod.drawHUD(state, ctx);
  }
  if (state.mode !== "rogue") drawEnergyBar();

  ctx.fillStyle = COLORS.white;
  ctx.font = "16px Segoe UI";
  const infoY = HEIGHT - 85;
  ctx.fillText("Move: WASD | Shoot: SPACE / LMB", 15, infoY);
  if (state.mode === "rogue") {
    ctx.fillText("拾取道具：增伤/散射/无敌/闪现/时间暂停等", 15, infoY + 20);
    ctx.fillText("闪现: F | 反弹/暂停/猛袭有时间限制", 15, infoY + 40);
  } else {
    ctx.fillText("Collect orbs for energy/shields/multipliers", 15, infoY + 20);
    ctx.fillText("Weapon evolves every 3 levels; shapes hint attacks.", 15, infoY + 40);
  }
  ctx.fillText("Pause/Resume: P", 15, infoY + 60);
}

function drawGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = COLORS.white;
  ctx.font = "48px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText("Game Over", WIDTH / 2, HEIGHT / 2 - 10);
  ctx.font = "24px Segoe UI";
  ctx.fillText("Press R to restart", WIDTH / 2, HEIGHT / 2 + 30);
  ctx.textAlign = "start";
}

function drawPauseOverlay() {
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = COLORS.white;
  ctx.font = "48px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText("Paused", WIDTH / 2, HEIGHT / 2 - 10);
  ctx.font = "24px Segoe UI";
  ctx.fillStyle = COLORS.cyan;
  ctx.fillText("Press P to resume", WIDTH / 2, HEIGHT / 2 + 30);
  ctx.textAlign = "start";
}

function renderGame() {
  ctx.save();
  if (state.shakeTimer > 0) {
    const intensity = (state.shakeMag ?? 5) * (state.shakeTimer / 20);
    const offsetX = randRange(-intensity, intensity);
    const offsetY = randRange(-intensity, intensity);
    ctx.translate(offsetX, offsetY);
  }
  drawBackground();
  if (state.scene === "game") {
    drawCollectibles();
    state.enemies.forEach(drawEnemyShape);
    drawBullets();
    drawParticles();
    const mod = getModeModule();
    if (mod.drawPlayerAvatar) mod.drawPlayerAvatar(state, ctx);
    drawHUD();
    drawEffectBanner();
    drawTimeStopHourglass();
    if (state.gameOver) drawGameOver();
    else if (state.paused) drawPauseOverlay();
  } else {
    drawParticles();
  }
  ctx.restore();
}

export function gameLoop() {
  const now = performance.now();
  deltaMs = now - lastTime;
  delta = Math.min(2, deltaMs / 16.67);
  state.dt = delta;
  state.dtMs = deltaMs;
  lastTime = now;
  updateGame();
  renderGame();
  requestAnimationFrame(gameLoop);
}

export function startLoop() {
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

export function triggerBlink() {
  blinkToCursor();
}

export function restartGame() {
  resetGame();
}

export function handleKeyDown(e) {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  state.keys[key] = true;
  if (key === "p" && state.scene === "game" && !e.repeat) togglePause();
  if (key === "f" && state.scene === "game" && state.mode === "rogue" && !e.repeat) blinkToCursor();
  if (e.key === "r" || e.key === "R") {
    if (state.gameOver) resetGame();
  }
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
    e.preventDefault();
  }
}

export function handleKeyUp(e) {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  state.keys[key] = false;
}

export function handleMouseDown(e) {
  if (!canvas) return;
  if (e.button === 0 && state.scene === "game" && !state.gameOver && !state.paused) {
    state.isMouseDown = true;
  }
}

export function handleMouseUp(e) {
  if (e.button === 0) state.isMouseDown = false;
}

export function handleMouseLeave() {
  state.isMouseDown = false;
}

export function handleMouseMove(e) {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  state.mousePos = {
    x: ((e.clientX - rect.left) / rect.width) * WIDTH,
    y: ((e.clientY - rect.top) / rect.height) * HEIGHT,
  };
}

export function handleTouchStart(e) {
  if (!canvas) return;
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  for (const touch of e.changedTouches) {
    const x = ((touch.clientX - rect.left) / rect.width) * WIDTH;
    const y = ((touch.clientY - rect.top) / rect.height) * HEIGHT;
    if (!state.touchMove.active) {
      state.touchMove = { active: true, id: touch.identifier, origin: { x, y }, vec: { x: 0, y: 0 } };
      continue;
    }
    if (!state.touchShoot.active) {
      state.touchShoot = { active: true, id: touch.identifier };
      state.isMouseDown = true;
      state.mousePos = { x, y };
    }
  }
}

export function handleTouchMove(e) {
  if (!canvas) return;
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  for (const touch of e.changedTouches) {
    const x = ((touch.clientX - rect.left) / rect.width) * WIDTH;
    const y = ((touch.clientY - rect.top) / rect.height) * HEIGHT;
    if (state.touchMove.active && state.touchMove.id === touch.identifier && state.touchMove.origin) {
      const dx = x - state.touchMove.origin.x;
      const dy = y - state.touchMove.origin.y;
      const len = Math.hypot(dx, dy) || 1;
      const clamped = Math.min(len, 80);
      state.touchMove.vec = { x: (dx / len) * (clamped / 80), y: (dy / len) * (clamped / 80) };
    } else if (state.touchShoot.active && state.touchShoot.id === touch.identifier) {
      state.mousePos = { x, y };
      state.isMouseDown = true;
    }
  }
}

export function handleTouchEnd(e) {
  if (!canvas) return;
  e.preventDefault();
  for (const touch of e.changedTouches) {
    if (state.touchMove.active && state.touchMove.id === touch.identifier) {
      state.touchMove = { active: false, id: null, origin: null, vec: { x: 0, y: 0 } };
    }
    if (state.touchShoot.active && state.touchShoot.id === touch.identifier) {
      state.touchShoot = { active: false, id: null };
      state.isMouseDown = false;
    }
  }
}

function blinkToCursor() {
  if (state.mode !== "rogue" || state.paused || state.gameOver) return;
  if (state.blinkCharges <= 0) return;
  const half = state.player.size / 2;
  state.player.x = Math.min(Math.max(state.mousePos.x, half), WIDTH - half);
  state.player.y = Math.min(Math.max(state.mousePos.y, half), HEIGHT - half);
  state.blinkCharges -= 1;
  spawnParticles(state, {
    x: state.player.x,
    y: state.player.y,
    color: COLORS.cyan,
    count: 18,
    speed: [1.2, 3.0],
    size: [2, 4],
    life: [14, 24],
  });
}
