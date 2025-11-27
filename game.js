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
import { createAudioPool } from "./core/audio.js";
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
  sfx: {},
  playShoot: null,
  bossActive: false,
  bossTimer: 0,
  bossDefeated: 0,
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
  initAudio();
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
  state.bossActive = false;
  state.bossTimer = 0;
  state.bossDefeated = 0;
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

function initAudio() {
  try {
    state.sfx.shoot = createAudioPool("assets/sfx/shoot1.wav", 6, 0.6);
    state.playShoot = () => state.sfx.shoot?.play?.();
  } catch (err) {
    console.warn("[sfx] init failed", err);
    state.playShoot = null;
  }
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
      case "boss":
        updateBossBehavior(enemy);
        break;
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

function updateBossBehavior(enemy) {
  if (enemy.name === "void_matriarch") {
    updateQueenBoss(enemy);
  } else {
    updateWardenBoss(enemy);
  }
}

function updateQueenBoss(enemy) {
  const desired = enemy.preferDist ?? 260;
  enemy.orbitAngle = enemy.orbitAngle ?? Math.atan2(enemy.pos.y - state.player.y, enemy.pos.x - state.player.x);
  enemy.orbitDir = enemy.orbitDir ?? (Math.random() < 0.5 ? -1 : 1);
  enemy.orbitAngle += 0.006 * enemy.orbitDir * delta;
  const target = {
    x: state.player.x + Math.cos(enemy.orbitAngle) * desired,
    y: state.player.y + Math.sin(enemy.orbitAngle) * desired,
  };
  enemy.pos.x += (target.x - enemy.pos.x) * 0.04 * delta;
  enemy.pos.y += (target.y - enemy.pos.y) * 0.04 * delta;

  enemy.shootCooldown = (enemy.shootCooldown ?? 90) - 1 * delta;
  if (enemy.shootCooldown <= 0) {
    shootBossSpread(enemy, 10, ENEMY_BULLET_SPEED * 1.2);
    enemy.shootCooldown = 90;
  }
  enemy.waveCooldown = (enemy.waveCooldown ?? 220) - 1 * delta;
  if (enemy.waveCooldown <= 0) {
    spawnBossRing(enemy, 14, ENEMY_BULLET_SPEED * 0.9);
    enemy.waveCooldown = randRange(200, 260);
  }
  enemy.spawnCooldown = (enemy.spawnCooldown ?? 260) - 1 * delta;
  if (enemy.spawnCooldown <= 0) {
    spawnBossMinions(state, enemy);
    enemy.spawnCooldown = randRange(240, 320);
  }
}

function updateWardenBoss(enemy) {
  const desired = enemy.preferDist ?? 300;
  enemy.orbitAngle = enemy.orbitAngle ?? Math.atan2(enemy.pos.y - state.player.y, enemy.pos.x - state.player.x);
  enemy.orbitDir = enemy.orbitDir ?? (Math.random() < 0.5 ? -1 : 1);
  enemy.orbitAngle += 0.005 * enemy.orbitDir * delta;
  const target = {
    x: state.player.x + Math.cos(enemy.orbitAngle) * desired,
    y: state.player.y + Math.sin(enemy.orbitAngle) * desired,
  };
  enemy.pos.x += (target.x - enemy.pos.x) * 0.035 * delta;
  enemy.pos.y += (target.y - enemy.pos.y) * 0.035 * delta;

  enemy.fanCooldown = (enemy.fanCooldown ?? 80) - 1 * delta;
  if (enemy.fanCooldown <= 0) {
    shootWardenFan(enemy, 7, ENEMY_BULLET_SPEED * 1.5, 0.55);
    enemy.fanCooldown = randRange(85, 110);
  }
  enemy.beamCooldown = (enemy.beamCooldown ?? 190) - 1 * delta;
  if (enemy.beamCooldown <= 0) {
    shootWardenCross(enemy, 8, ENEMY_BULLET_SPEED * 1.1);
    enemy.beamCooldown = randRange(190, 240);
  }
  enemy.spiralCooldown = (enemy.spiralCooldown ?? 220) - 1 * delta;
  if (enemy.spiralCooldown <= 0) {
    spawnWardenSpiral(enemy, 18, ENEMY_BULLET_SPEED * 1.05);
    enemy.spiralCooldown = randRange(220, 260);
  }
}

function shootBossSpread(enemy, count = 10, speed = ENEMY_BULLET_SPEED * 1.2) {
  const offset = enemy.volleyOffset ?? 0;
  for (let i = 0; i < count; i += 1) {
    const ang = (Math.PI * 2 * i) / count + offset;
    state.enemyBullets.push({
      pos: { x: enemy.pos.x, y: enemy.pos.y },
      vel: { x: Math.cos(ang) * speed, y: Math.sin(ang) * speed },
      radius: 7,
      color: enemy.color,
    });
  }
  enemy.volleyOffset = offset + 0.35;
}

function spawnBossRing(enemy, count = 14, speed = ENEMY_BULLET_SPEED * 0.9) {
  for (let i = 0; i < count; i += 1) {
    const ang = (Math.PI * 2 * i) / count;
    state.enemyBullets.push({
      pos: { x: enemy.pos.x, y: enemy.pos.y },
      vel: { x: Math.cos(ang) * speed, y: Math.sin(ang) * speed },
      radius: 9,
      color: "#FFD278",
    });
  }
}

function spawnBossMinions(state, enemy) {
  if (state.enemies.length >= state.maxEnemies + 4) return;
  const count = 2;
  for (let i = 0; i < count; i += 1) {
    state.enemies.push({
      name: "voidling",
      behavior: "zigzag",
      color: "#9CF4FF",
      speed: 2.2,
      baseSpeed: 2.2,
      radius: 18,
      pos: { x: enemy.pos.x + randRange(-40, 40), y: enemy.pos.y + randRange(-40, 40) },
      hp: 4,
      zigzagDir: Math.random() < 0.5 ? -1 : 1,
      zigzagTimer: 0,
      shootCooldown: randRange(120, 160),
      dashCooldown: randRange(140, 180),
      state: "chase",
      stateTimer: 0,
      dashDir: { x: 0, y: 0 },
      hitFlashTimer: 0,
      slowTimer: 0,
      childSplit: true,
    });
  }
}

function shootWardenFan(enemy, count = 7, speed = ENEMY_BULLET_SPEED * 1.4, spread = 0.5) {
  const dir = Math.atan2(state.player.y - enemy.pos.y, state.player.x - enemy.pos.x);
  const half = spread;
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0 : -half + (i / (count - 1)) * (2 * half);
    const ang = dir + t;
    state.enemyBullets.push({
      pos: { x: enemy.pos.x, y: enemy.pos.y },
      vel: { x: Math.cos(ang) * speed, y: Math.sin(ang) * speed },
      radius: 7,
      color: enemy.color,
    });
  }
}

function shootWardenCross(enemy, count = 8, speed = ENEMY_BULLET_SPEED * 1.1) {
  const offset = enemy.crossOffset ?? 0;
  const step = (Math.PI * 2) / count;
  for (let i = 0; i < count; i += 1) {
    const ang = i * step + offset;
    state.enemyBullets.push({
      pos: { x: enemy.pos.x, y: enemy.pos.y },
      vel: { x: Math.cos(ang) * speed, y: Math.sin(ang) * speed },
      radius: 10,
      color: "#FFD278",
    });
  }
  enemy.crossOffset = offset + 0.28;
}

function spawnWardenSpiral(enemy, count = 18, speed = ENEMY_BULLET_SPEED * 1.05) {
  const offset = enemy.spiralOffset ?? 0;
  for (let i = 0; i < count; i += 1) {
    const ang = (Math.PI * 2 * i) / count + offset;
    state.enemyBullets.push({
      pos: { x: enemy.pos.x, y: enemy.pos.y },
      vel: { x: Math.cos(ang) * speed, y: Math.sin(ang) * speed },
      radius: 6,
      color: "#7CE0FF",
    });
  }
  enemy.spiralOffset = offset + 0.18;
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
    if (enemy.hp <= 0 || enemy.pendingDeath) continue;
    const dist = Math.hypot(state.player.x - enemy.pos.x, state.player.y - enemy.pos.y);
    if (dist < playerRadius + enemy.radius) {
      if (state.mode === "rogue" && state.rampageTimer > 0) {
        if (!enemy.isBoss) {
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
        } else {
          // Boss is immune to rampage one-hit; just flash/slow briefly.
          enemy.hitFlashTimer = 10;
          enemy.slowTimer = Math.max(enemy.slowTimer ?? 0, 14);
        }
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

  // Dispatch a custom event the first time the game becomes game over
  if (state.gameOver && !state._gameOverNotified) {
    try {
      window.dispatchEvent(new CustomEvent('nhw:game-over', { detail: { score: state.score, mode: state.mode, createdAt: new Date().toISOString() } }));
    } catch (e) {
      // Some environments (non-browser) may not support CustomEvent constructor
      const ev = document.createEvent && document.createEvent('CustomEvent');
      if (ev) ev.initCustomEvent('nhw:game-over', true, true, { score: state.score, mode: state.mode });
      window.dispatchEvent(ev);
    }
    state._gameOverNotified = true;
  }
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
    case "boss": {
      if (enemy.name === "void_matriarch") drawQueenBoss(enemy);
      else drawWardenBoss(enemy);
      break;
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

function drawQueenBoss(enemy) {
  ctx.save();
  const t = performance.now() * 0.0015;
  const pulse = 1 + 0.08 * Math.sin(performance.now() * 0.003);
  ctx.shadowColor = enemy.color;
  ctx.shadowBlur = 28;
  // Core orb
  ctx.beginPath(); ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius * 0.55, 0, Math.PI * 2); ctx.fill();
  // Outer ring
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius * 1.3 * pulse, 0, Math.PI * 2); ctx.stroke();
  // Rotating hex
  const hex = regularPolygonPoints(enemy.pos.x, enemy.pos.y, enemy.radius * 0.9, 6, (t * 90) % 360);
  ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.moveTo(hex[0].x, hex[0].y); for (let i = 1; i < hex.length; i += 1) ctx.lineTo(hex[i].x, hex[i].y);
  ctx.closePath(); ctx.stroke();
  // Counter-rotating spikes
  const spikes = 8;
  for (let i = 0; i < spikes; i += 1) {
    const ang = (Math.PI * 2 * i) / spikes + t * 1.8;
    const r1 = enemy.radius * 0.7;
    const r2 = enemy.radius * 1.35;
    ctx.beginPath();
    ctx.moveTo(enemy.pos.x + Math.cos(ang) * r1, enemy.pos.y + Math.sin(ang) * r1);
    ctx.lineTo(enemy.pos.x + Math.cos(ang) * r2, enemy.pos.y + Math.sin(ang) * r2);
    ctx.stroke();
  }
  // Crown
  const hpRatio = Math.max(0, Math.min(1, enemy.hp / (enemy.maxHp || enemy.hp || 1)));
  const crownColor = hpRatio < 0.3 ? "#FF3B6E" : "#FFD278";
  ctx.fillStyle = crownColor;
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 2;
  const cx = enemy.pos.x, cy = enemy.pos.y - enemy.radius * 1.25;
  ctx.beginPath();
  ctx.moveTo(cx - 18, cy + 12);
  ctx.lineTo(cx - 6, cy - 6);
  ctx.lineTo(cx, cy + 6);
  ctx.lineTo(cx + 6, cy - 8);
  ctx.lineTo(cx + 18, cy + 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Small orbiting shards
  ctx.fillStyle = COLORS.white;
  const shards = 4;
  for (let i = 0; i < shards; i += 1) {
    const ang = (Math.PI * 2 * i) / shards + t * -2.2;
    const r = enemy.radius * 1.6;
    const sx = enemy.pos.x + Math.cos(ang) * r;
    const sy = enemy.pos.y + Math.sin(ang) * r;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 6);
    ctx.lineTo(sx + 6, sy + 6);
    ctx.lineTo(sx - 6, sy + 6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawWardenBoss(enemy) {
  ctx.save();
  const t = performance.now() * 0.0018;
  const pulse = 1 + 0.06 * Math.sin(performance.now() * 0.004);
  ctx.shadowColor = enemy.color;
  ctx.shadowBlur = 26;
  // Inner eclipse core
  const grad = ctx.createRadialGradient(enemy.pos.x, enemy.pos.y, 0, enemy.pos.x, enemy.pos.y, enemy.radius * 1.2);
  grad.addColorStop(0, "rgba(20,10,35,0.8)");
  grad.addColorStop(0.4, enemy.color);
  grad.addColorStop(1, "rgba(0,0,0,0.85)");
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius * 0.9, 0, Math.PI * 2); ctx.fill();
  // Crescent mask
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = "#FFB84D";
  ctx.beginPath();
  ctx.arc(enemy.pos.x + enemy.radius * 0.3, enemy.pos.y, enemy.radius * 0.8, -Math.PI / 2, Math.PI / 2, false);
  ctx.arc(enemy.pos.x + enemy.radius * 0.15, enemy.pos.y, enemy.radius * 0.65, Math.PI / 2, -Math.PI / 2, true);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Rotating blades
  ctx.strokeStyle = "#FFD278";
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.8;
  const blades = 6;
  for (let i = 0; i < blades; i += 1) {
    const ang = (Math.PI * 2 * i) / blades + t * 1.6;
    const r1 = enemy.radius * 0.6;
    const r2 = enemy.radius * 1.35 * pulse;
    ctx.beginPath();
    ctx.moveTo(enemy.pos.x + Math.cos(ang) * r1, enemy.pos.y + Math.sin(ang) * r1);
    ctx.lineTo(enemy.pos.x + Math.cos(ang) * r2, enemy.pos.y + Math.sin(ang) * r2);
    ctx.stroke();
  }
  // Outer ring
  ctx.globalAlpha = 0.5;
  ctx.beginPath(); ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius * 1.4 * pulse, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
function drawBullets() {
  for (const bullet of state.bullets) {
    ctx.save();
    const r = bullet.radius ?? 4;
    const grad = ctx.createRadialGradient(bullet.pos.x, bullet.pos.y, r * 0.2, bullet.pos.x, bullet.pos.y, r * 1.1);
    grad.addColorStop(0, "rgba(255,255,255,0.9)");
    grad.addColorStop(1, bullet.color ?? COLORS.cyan);
    ctx.shadowColor = bullet.glow ?? bullet.color ?? COLORS.cyan;
    ctx.shadowBlur = 12;
    ctx.fillStyle = grad;
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(bullet.pos.x, bullet.pos.y, r, 0, Math.PI * 2);
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

function drawBossHealth(boss) {
  if (!boss) return;
  const w = 420;
  const h = 16;
  const barX = WIDTH / 2 - w / 2;
  const barY = 18;
  const pct = Math.max(0, Math.min(1, boss.hp / (boss.maxHp || boss.hp || 1)));
  ctx.save();
  ctx.fillStyle = "rgba(35, 20, 60, 0.85)";
  ctx.fillRect(barX, barY, w, h);
  ctx.fillStyle = boss.color ?? COLORS.purple;
  ctx.fillRect(barX + 3, barY + 3, (w - 6) * pct, h - 6);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, w, h);
  ctx.fillStyle = COLORS.white;
  ctx.font = "14px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText(`Boss HP ${Math.ceil(pct * 100)}%`, barX + w / 2, barY + 12);
  ctx.textAlign = "start";
  ctx.restore();
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
  const boss = state.enemies.find((e) => e.isBoss && e.hp > 0);
  if (boss) drawBossHealth(boss);

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
