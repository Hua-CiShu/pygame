const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const menuOverlay = document.getElementById("menu-overlay");
const btnStartEndless = document.getElementById("btn-start-endless");
const btnStartRogue = document.getElementById("btn-start-rogue");
const btnStartRogueEasy = document.getElementById("btn-start-rogue-easy");
const btnStartRogueHard = document.getElementById("btn-start-rogue-hard");
let lastTime = performance.now();
let delta = 1;
let deltaMs = 16.67;

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const COLORS = {
  white: "#FFFFFF",
  black: "#05060F",
  blue: "#468CFF",
  green: "#50FF8C",
  red: "#F05A5A",
  gold: "#FFD278",
  cyan: "#78F7FF",
  orange: "#FFA755",
  purple: "#C684FF",
};

const WEAPON_STAGES = {
  1: { name: "Pulse Shot", angles: [0], color: COLORS.white, radius: 4, pierce: 0, cost: 14, cooldown: 10, speedBonus: 0 },
  2: { name: "Twin Fangs", angles: [-10, 10], color: COLORS.cyan, radius: 4, pierce: 0, cost: 18, cooldown: 12, speedBonus: 0.5 },
  3: { name: "Tri Nova", angles: [-18, 0, 18], color: COLORS.orange, radius: 5, pierce: 1, cost: 22, cooldown: 14, speedBonus: 0.8 },
  4: { name: "Vortex Lance", angles: [-25, -8, 8, 25], color: COLORS.purple, radius: 5, pierce: 1, cost: 26, cooldown: 16, speedBonus: 1.1 },
};
const MAX_WEAPON_STAGE = Math.max(...Object.keys(WEAPON_STAGES).map(Number));

const PLAYER_STAGE_STYLE = {
  1: { shape: "square", color: COLORS.blue, outline: COLORS.white },
  2: { shape: "diamond", color: COLORS.cyan, outline: COLORS.white },
  3: { shape: "hex", color: COLORS.orange, outline: COLORS.cyan },
  4: { shape: "oct", color: COLORS.purple, outline: COLORS.cyan },
};

const COLLECTIBLE_TYPES = [
  { name: "coin", color: COLORS.gold, radius: 13, weight: 4, value: 12 },
  { name: "energy", color: COLORS.cyan, radius: 13, weight: 3, energy: 30 },
  { name: "shield", color: COLORS.white, radius: 14, weight: 2, shield: 240 },
  { name: "multiplier", color: COLORS.orange, radius: 14, weight: 1, multiplier: 2, duration: 420 },
];

const ENEMY_TYPES = [
  { name: "slow", behavior: "slow", color: COLORS.red, speed: 1.6, radius: 22, weight: 4 },
  { name: "sneaky", behavior: "sneak", color: "#FF8C5A", speed: 2.5, radius: 16, weight: 3 },
  { name: "zigzag", behavior: "zigzag", color: "#FF78D2", speed: 2.2, radius: 18, weight: 2 },
  { name: "shooter", behavior: "shooter", color: "#FFD890", speed: 1.8, radius: 20, weight: 2 },
  { name: "charger", behavior: "charger", color: "#78FFAA", speed: 2.0, radius: 18, weight: 2 },
];

// 试炼模式：更小体型与血量成长
const ROGUE_ENEMY_TYPES = [
  { name: "dash", behavior: "charger", color: "#FF8B8B", speed: 2.6, radius: 14, weight: 3, baseHp: 2 },
  { name: "skirmish", behavior: "sneak", color: "#6EE4FF", speed: 2.8, radius: 13, weight: 3, baseHp: 2 },
  { name: "zig", behavior: "zigzag", color: "#FF9BE6", speed: 2.4, radius: 13, weight: 2, baseHp: 3 },
  { name: "gunner", behavior: "shooter", color: "#FFC97A", speed: 2.0, radius: 15, weight: 2, baseHp: 3 },
  { name: "brute", behavior: "slow", color: "#7CFFB0", speed: 1.4, radius: 16, weight: 1, baseHp: 4 },
];

const ROGUE_ITEMS = [
  { code: "rampage", label: "猛袭无敌", color: "#FF6B6B", glow: "#FFD1D1", icon: "burst", duration: 300, weight: 2 },
  { code: "spread", label: "散射+1", color: "#75F3FF", glow: "#D7FFFF", icon: "arrow", weight: 2 },
  { code: "life", label: "增命", color: "#7DFF86", glow: "#CFFFD2", icon: "heart", weight: 2 },
  { code: "orbital", label: "环绕子弹", color: "#C586FF", glow: "#F1DEFF", icon: "orbit", weight: 2 },
  { code: "ricochet", label: "反弹", color: "#FFB86B", glow: "#FFE5BE", icon: "bounce", duration: 600, weight: 2 },
  { code: "blink", label: "闪现充能", color: "#6FB5FF", glow: "#D5E8FF", icon: "blink", weight: 1.5 },
  { code: "timestop", label: "时间暂停", color: "#FFD278", glow: "#FFECCC", icon: "hourglass", duration: 360, weight: 1.5 },
  { code: "power", label: "攻击+1", color: "#FFFFFF", glow: "#E1F1FF", icon: "power", weight: 2 },
];

const ROGUE_DIFFICULTIES = {
  easy: { key: "easy", label: "简单", itemInterval: 200 },
  normal: { key: "normal", label: "标准", itemInterval: 260 },
  hard: { key: "hard", label: "艰难", itemInterval: 320 },
};

const LEVEL_BONUSES = [
  { label: "Move speed +0.4", code: "speed" },
  { label: "Max enemies +1", code: "enemy_cap" },
  { label: "Energy max +15", code: "energy" },
  { label: "Bullet speed +1", code: "bullet" },
  { label: "Gain 1 extra life", code: "life" },
];

const BASE_SPEED = 5;
const BASE_ENERGY_MAX = 100;
const ENERGY_REGEN = 0.35;
const ENEMY_BULLET_SPEED = 4.2;
const LEVEL_SCORE_STEP = 140;
const BASE_BULLET_SPEED = 8.5;

const state = {
  player: { x: WIDTH / 2, y: HEIGHT / 2, size: 32, speed: BASE_SPEED },
  energy: BASE_ENERGY_MAX,
  energyMax: BASE_ENERGY_MAX,
  bullets: [],
  enemyBullets: [],
  particles: [],
  backgroundStars: [],
  bulletCooldown: 0,
  collectibles: [],
  collectiblesTimer: 0,
  collectiblesInterval: 70,
  enemies: [],
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
  nextLevelScore: LEVEL_SCORE_STEP,
  bonusIndex: 0,
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
  mode: null,
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
};

function resetGame() {
  const isRogue = state.mode === "rogue";
  state.player = { x: WIDTH / 2, y: HEIGHT / 2, size: isRogue ? 26 : 32, speed: BASE_SPEED - (isRogue ? 0.4 : 0) };
  state.energyMax = BASE_ENERGY_MAX;
  state.energy = state.energyMax;
  state.bullets = [];
  state.enemyBullets = [];
  state.particles = [];
  state.bulletCooldown = 0;
  state.collectibles = [];
  state.collectiblesTimer = 0;
  state.enemies = [];
  state.enemySpawnTimer = 0;
  state.enemySpawnInterval = isRogue ? 170 : 210;
  state.maxEnemies = isRogue ? 8 : 6;
  state.score = 0;
  state.lives = isRogue ? 3 : 4;
  state.invincibleTimer = 0;
  state.shieldTimer = 0;
  state.multiplier = 1;
  state.multiplierTimer = 0;
  state.level = 1;
  state.nextLevelScore = LEVEL_SCORE_STEP;
  state.bonusIndex = 0;
  state.bonusMessage = "";
  state.bonusMessageTimer = 0;
  state.weaponStage = 1;
  state.bulletSpeed = BASE_BULLET_SPEED;
  state.gameOver = false;
  state.paused = false;
  state.isMouseDown = false;
  state.modeShots = 1;
  state.playerDamage = 1;
  state.orbitals = [];
  state.rampageTimer = 0;
  state.ricochetTimer = 0;
  state.timeStopTimer = 0;
  state.pendingFrozenKills = [];
  state.blinkCharges = isRogue ? 1 : 0;
  state.modeElapsed = 0;
  state.itemSpawnTimer = 0;
  const diff = isRogue ? ROGUE_DIFFICULTIES[state.modeDifficulty] ?? ROGUE_DIFFICULTIES.normal : null;
  state.itemSpawnInterval = diff ? diff.itemInterval : 160;
  state.effectBanner = { text: "", color: COLORS.white, timer: 0 };
  state.dt = 1;
  state.dtMs = 16.67;
  state.shakeTimer = 0;
  state.shakeMag = 0;
  if (!isRogue) {
    for (let i = 0; i < 4; i += 1) {
      spawnCollectible(true);
    }
  }
}

function togglePause() {
  if (state.gameOver || state.scene !== "game") return;
  state.paused = !state.paused;
  state.isMouseDown = false;
  state.keys[" "] = false;
}

function startMode(mode, options = {}) {
  state.mode = mode;
  if (mode === "rogue") {
    state.modeDifficulty = options.difficulty ?? "normal";
  }
  state.scene = "game";
  resetGame();
  if (menuOverlay) menuOverlay.style.display = "none";
}

if (btnStartEndless) {
  btnStartEndless.addEventListener("click", () => startMode("endless"));
}
if (btnStartRogue) {
  btnStartRogue.addEventListener("click", () => startMode("rogue"));
}
if (btnStartRogueEasy) {
  btnStartRogueEasy.addEventListener("click", () => startMode("rogue", { difficulty: "easy" }));
}
if (btnStartRogueHard) {
  btnStartRogueHard.addEventListener("click", () => startMode("rogue", { difficulty: "hard" }));
}

function blinkToCursor() {
  if (state.mode !== "rogue" || state.paused || state.gameOver) return;
  if (state.blinkCharges <= 0) return;
  const half = state.player.size / 2;
  state.player.x = Math.min(Math.max(state.mousePos.x, half), WIDTH - half);
  state.player.y = Math.min(Math.max(state.mousePos.y, half), HEIGHT - half);
  state.blinkCharges -= 1;
  spawnParticles({
    x: state.player.x,
    y: state.player.y,
    color: COLORS.cyan,
    count: 18,
    speed: [1.2, 3.0],
    size: [2, 4],
    life: [14, 24],
  });
}

function setEffectBanner(text, color = COLORS.white, duration = 120) {
  state.effectBanner = { text, color, timer: duration };
}

function triggerShake(duration = 18, magnitude = 5) {
  state.shakeTimer = duration;
  state.shakeMag = magnitude;
}

function randRange(min, max) {
  return Math.random() * (max - min) + min;
}

function chooseWeighted(options, weightKey = "weight") {
  const total = options.reduce((sum, opt) => sum + (opt[weightKey] ?? 1), 0);
  let pick = Math.random() * total;
  for (const opt of options) {
    pick -= opt[weightKey] ?? 1;
    if (pick <= 0) {
      return opt;
    }
  }
  return options[options.length - 1];
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

function spawnParticles({
  x,
  y,
  color = COLORS.white,
  count = 12,
  speed = [1, 3],
  size = [2, 4],
  life = [15, 35],
  spread = Math.PI * 2,
}) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * spread;
    const magnitude = randRange(speed[0], speed[1]);
    state.particles.push({
      pos: { x, y },
      vel: { x: Math.cos(angle) * magnitude, y: Math.sin(angle) * magnitude },
      radius: randRange(size[0], size[1]),
      life: randRange(life[0], life[1]),
      alpha: 1,
      color,
      decay: randRange(0.02, 0.05),
    });
  }
}

function updateParticles() {
  state.particles = state.particles.filter((p) => {
    p.pos.x += p.vel.x * delta;
    p.pos.y += p.vel.y * delta;
    p.vel.x *= 1 - (1 - 0.96) * delta;
    p.vel.y *= 1 - (1 - 0.96) * delta;
    p.radius *= 1 - (1 - 0.985) * delta;
    p.life -= 1 * delta;
    p.alpha -= p.decay * delta;
    return p.life > 0 && p.alpha > 0 && p.radius > 0.1;
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

function spawnCollectible(initial = false) {
  if (state.mode === "rogue") return;
  if (!initial && state.collectibles.length >= 6) return;
  const padding = 50;
  const x = randRange(padding, WIDTH - padding);
  const y = randRange(padding, HEIGHT - padding);
  const template = chooseWeighted(COLLECTIBLE_TYPES);
  state.collectibles.push({
    ...template,
    pos: { x, y },
  });
}

function spawnRogueItem() {
  if (state.collectibles.length >= 6) return;
  const padding = 45;
  const x = randRange(padding, WIDTH - padding);
  const y = randRange(padding, HEIGHT - padding);
  const template = chooseWeighted(ROGUE_ITEMS);
  state.collectibles.push({
    ...template,
    pos: { x, y },
    radius: 14,
  });
}

function spawnEnemy() {
  if (state.enemies.length >= state.maxEnemies) return;
  const side = chooseWeighted(
    [
      { val: "top", weight: 1 },
      { val: "bottom", weight: 1 },
      { val: "left", weight: 1 },
      { val: "right", weight: 1 },
    ],
    "weight"
  ).val;

  let pos;
  if (side === "top") pos = { x: randRange(0, WIDTH), y: -25 };
  else if (side === "bottom") pos = { x: randRange(0, WIDTH), y: HEIGHT + 25 };
  else if (side === "left") pos = { x: -25, y: randRange(0, HEIGHT) };
  else pos = { x: WIDTH + 25, y: randRange(0, HEIGHT) };

  const template = state.mode === "rogue" ? chooseWeighted(ROGUE_ENEMY_TYPES) : chooseWeighted(ENEMY_TYPES);
  const hpScale = state.mode === "rogue" ? Math.max(1, 1 + Math.floor(state.modeElapsed / 900)) : 1;
  state.enemies.push({
    ...template,
    pos,
    baseSpeed: template.speed,
    hp: (template.baseHp ?? 1) * hpScale,
    zigzagDir: Math.random() < 0.5 ? -1 : 1,
    zigzagTimer: 0,
    shootCooldown: randRange(90, 140),
    dashCooldown: randRange(120, 160),
    state: "chase",
    stateTimer: 0,
    dashDir: { x: 0, y: 0 },
    hitFlashTimer: 0,
    slowTimer: 0,
  });
}

function normalize(vec) {
  const len = Math.hypot(vec.x, vec.y);
  if (!len) return { x: 0, y: 0 };
  return { x: vec.x / len, y: vec.y / len };
}

function rotateVector(vec, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: vec.x * cos - vec.y * sin,
    y: vec.x * sin + vec.y * cos,
  };
}

function movePlayer() {
  let dx = 0;
  let dy = 0;
  if (state.keys["a"] || state.keys["ArrowLeft"]) dx -= state.player.speed * delta;
  if (state.keys["d"] || state.keys["ArrowRight"]) dx += state.player.speed * delta;
  if (state.keys["w"] || state.keys["ArrowUp"]) dy -= state.player.speed * delta;
  if (state.keys["s"] || state.keys["ArrowDown"]) dy += state.player.speed * delta;

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

function fireWeapon() {
  if (state.mode === "rogue") {
    fireRogueWeapon();
    return;
  }
  if (state.paused || state.scene !== "game") return;
  const profile = WEAPON_STAGES[state.weaponStage];
  if (!profile) return;
  if (state.bulletCooldown > 0 || state.energy < profile.cost) return;

  const direction = normalize({ x: state.mousePos.x - state.player.x, y: state.mousePos.y - state.player.y });
  const baseDir = direction.x || direction.y ? direction : { x: 0, y: -1 };

  for (const angle of profile.angles) {
    const shotDir = rotateVector(baseDir, angle);
    state.bullets.push({
      pos: { x: state.player.x, y: state.player.y },
      vel: { x: shotDir.x * (state.bulletSpeed + profile.speedBonus), y: shotDir.y * (state.bulletSpeed + profile.speedBonus) },
      radius: profile.radius,
      color: profile.color,
      glow: profile.color,
      pierce: profile.pierce,
    });
  }

  spawnParticles({
    x: state.player.x,
    y: state.player.y,
    color: profile.color,
    count: 4 + profile.angles.length * 2,
    speed: [0.5, 1.6],
    size: [1, 2.5],
    life: [8, 16],
    spread: Math.PI / 2,
  });

  state.bulletCooldown = profile.cooldown;
  state.energy -= profile.cost;
}

function fireRogueWeapon() {
  if (state.paused || state.scene !== "game" || state.gameOver) return;
  if (state.bulletCooldown > 0) return;
  const direction = normalize({ x: state.mousePos.x - state.player.x, y: state.mousePos.y - state.player.y });
  const baseDir = direction.x || direction.y ? direction : { x: 0, y: -1 };
  const count = Math.max(1, state.modeShots);
  const spread = count === 1 ? 0 : Math.min(55, 12 + count * 5);
  const step = count === 1 ? 0 : spread / (count - 1);
  const speed = state.bulletSpeed + 0.5;
  for (let i = 0; i < count; i += 1) {
    const offset = -spread / 2 + step * i;
    const shotDir = rotateVector(baseDir, offset);
    state.bullets.push({
      pos: { x: state.player.x, y: state.player.y },
      vel: { x: shotDir.x * speed, y: shotDir.y * speed },
      radius: 4,
      color: COLORS.cyan,
      glow: COLORS.purple,
      pierce: 0,
      damage: state.playerDamage,
      ricochet: state.ricochetTimer > 0,
      bounced: false,
    });
  }
  spawnParticles({
    x: state.player.x,
    y: state.player.y,
    color: COLORS.cyan,
    count: 6 + count,
    speed: [0.6, 1.6],
    size: [1, 2],
    life: [8, 14],
    spread: Math.PI / 2,
  });
  state.bulletCooldown = 10;
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

function handleEnemyHits() {
  if (state.mode === "rogue") return handleRogueEnemyHits();
  const survivors = [];
  for (const enemy of state.enemies) {
    let hit = false;
    for (const bullet of state.bullets) {
      const dist = Math.hypot(enemy.pos.x - bullet.pos.x, enemy.pos.y - bullet.pos.y);
      if (dist < enemy.radius) {
        state.score += Math.round(18 * state.multiplier);
        if (bullet.pierce > 0) bullet.pierce -= 1;
        else bullet.pos.x = -9999;
        hit = true;
        enemy.hitFlashTimer = 12;
        enemy.slowTimer = 18;
        spawnParticles({
          x: enemy.pos.x,
          y: enemy.pos.y,
          color: enemy.color,
          count: 18,
          speed: [1.2, 3.8],
          size: [2, 5],
          life: [18, 32],
        });
        if (enemy.behavior === "shooter") {
          state.collectibles.push({
            name: "energy",
            color: COLORS.cyan,
            radius: 12,
            pos: { x: enemy.pos.x, y: enemy.pos.y },
            energy: 30,
          });
        }
        break;
      }
    }
    if (!hit) survivors.push(enemy);
  }
  state.enemies = survivors;
  state.bullets = state.bullets.filter((b) => b.pos.x > -1000);
}

function handleRogueEnemyHits() {
  const deadIds = new Set();
  for (const enemy of state.enemies) {
    const collidable = enemy.pendingDeath || enemy.hp > 0;
    if (!collidable) continue;
    // 环绕子弹伤害
    for (const orb of state.orbitals) {
      if (!orb.pos) continue;
      const dist = Math.hypot(enemy.pos.x - orb.pos.x, enemy.pos.y - orb.pos.y);
      if (dist < enemy.radius + 6) {
        if (!enemy.pendingDeath && enemy.hp > 0) {
          enemy.hp -= state.playerDamage;
          enemy.hitFlashTimer = 12;
          enemy.slowTimer = 18;
          if (enemy.hp <= 0) {
            if (state.timeStopTimer > 0) {
              if (!enemy.pendingDeath) state.pendingFrozenKills.push(enemy);
              enemy.pendingDeath = true;
            } else deadIds.add(enemy);
            break;
          }
        }
      }
    }
  }

  for (const bullet of state.bullets) {
    if (deadIds.size === state.enemies.length) break;
    for (const enemy of state.enemies) {
      const collidable = enemy.pendingDeath || enemy.hp > 0;
      if (!collidable) continue;
      const dist = Math.hypot(enemy.pos.x - bullet.pos.x, enemy.pos.y - bullet.pos.y);
      if (dist < enemy.radius + (bullet.radius ?? 4)) {
        if (!enemy.pendingDeath && enemy.hp > 0) {
          enemy.hp -= bullet.damage ?? state.playerDamage;
          enemy.hitFlashTimer = 12;
          enemy.slowTimer = 18;
        }
        if (bullet.pierce > 0) bullet.pierce -= 1;
        else bullet.pos.x = -9999;
        if (enemy.hp <= 0) {
          if (state.timeStopTimer > 0) {
            if (!enemy.pendingDeath) state.pendingFrozenKills.push(enemy);
            enemy.pendingDeath = true;
          } else deadIds.add(enemy);
          break;
        }
      }
    }
  }

  let survivors = [];
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0 && !enemy.pendingDeath) {
      spawnParticles({
        x: enemy.pos.x,
        y: enemy.pos.y,
        color: enemy.color,
        count: 14,
        speed: [1.2, 3.4],
        size: [2, 4],
        life: [16, 28],
      });
      state.score += 12;
    } else survivors.push(enemy);
  }

  state.enemies = survivors;
  state.bullets = state.bullets.filter((b) => b.pos.x > -1000);
}

function handleCollectibles() {
  if (state.mode === "rogue") return handleRogueItems();
  const { x, y, size } = state.player;
  const playerRadius = size / 2;
  const remain = [];
  for (const item of state.collectibles) {
    const dist = Math.hypot(item.pos.x - x, item.pos.y - y);
    if (dist < item.radius + playerRadius) {
      spawnParticles({
        x: item.pos.x,
        y: item.pos.y,
        color: item.color,
        count: 10,
        speed: [0.8, 2.2],
        size: [1.5, 3.5],
        life: [14, 26],
      });
      if (item.value) state.score += Math.round(item.value * state.multiplier);
      if (item.energy) state.energy = Math.min(state.energyMax, state.energy + item.energy);
      if (item.shield) state.shieldTimer = Math.max(state.shieldTimer, item.shield);
      if (item.multiplier) {
        state.multiplier = item.multiplier;
        state.multiplierTimer = item.duration ?? 360;
      }
    } else remain.push(item);
  }
  state.collectibles = remain;
}

function handleRogueItems() {
  const { x, y, size } = state.player;
  const playerRadius = size / 2;
  const remain = [];
  for (const item of state.collectibles) {
    const dist = Math.hypot(item.pos.x - x, item.pos.y - y);
    if (dist < item.radius + playerRadius) {
      spawnParticles({
        x: item.pos.x,
        y: item.pos.y,
        color: item.color,
        count: 12,
        speed: [0.9, 2.4],
        size: [2, 4],
        life: [16, 28],
      });
      switch (item.code) {
        case "rampage":
          state.rampageTimer = Math.max(state.rampageTimer, item.duration ?? 300);
          state.invincibleTimer = Math.max(state.invincibleTimer, item.duration ?? 300);
          setEffectBanner("猛袭无敌！", item.color, 140);
          break;
        case "spread":
          state.modeShots = Math.min(state.modeShots + 1, 10);
          break;
        case "life":
          state.lives += 1;
          setEffectBanner("生命 +1", item.color, 120);
          break;
        case "orbital":
          if (state.orbitals.length < 5) {
            state.orbitals.push({ angle: Math.random() * Math.PI * 2, speed: 0.05 + state.orbitals.length * 0.01 });
          } else {
            state.orbitals.forEach((o) => (o.speed = (o.speed ?? 0.05) + 0.01));
          }
          setEffectBanner("环绕子弹 增强", item.color, 120);
          break;
        case "ricochet":
          state.ricochetTimer = Math.max(state.ricochetTimer, item.duration ?? 600);
          setEffectBanner("反弹 10s", item.color, 140);
          break;
        case "blink":
          state.blinkCharges = Math.min(state.maxBlinkCharges, state.blinkCharges + 1);
          setEffectBanner("闪现充能 +1", item.color, 120);
          break;
        case "timestop":
          state.timeStopTimer = Math.max(state.timeStopTimer, item.duration ?? 180);
          setEffectBanner("时间暂停 6s", item.color, 160);
          break;
        case "power":
          state.playerDamage += 1;
          setEffectBanner("攻击 +1", item.color, 120);
          break;
      }
    } else remain.push(item);
  }
  state.collectibles = remain;
}

function handlePlayerDamage() {
  if (state.shieldTimer > 0) {
    state.shieldTimer = Math.max(0, state.shieldTimer - 120);
    state.invincibleTimer = 30;
    spawnParticles({
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
  spawnParticles({
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
  for (const enemy of state.enemies) {
    const dist = Math.hypot(state.player.x - enemy.pos.x, state.player.y - enemy.pos.y);
    if (dist < playerRadius + enemy.radius) {
      if (state.mode === "rogue" && state.rampageTimer > 0) {
        enemy.hp = 0;
        enemy.pendingDeath = state.timeStopTimer > 0;
        if (enemy.pendingDeath) state.pendingFrozenKills.push(enemy);
        else spawnParticles({
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

function gainLevel() {
  const bonus = LEVEL_BONUSES[state.bonusIndex];
  state.bonusIndex = (state.bonusIndex + 1) % LEVEL_BONUSES.length;
  switch (bonus.code) {
    case "speed":
      state.player.speed += 0.4;
      break;
    case "enemy_cap":
      state.maxEnemies += 1;
      break;
    case "energy":
      state.energyMax += 15;
      state.energy = Math.min(state.energyMax, state.energy + 15);
      break;
    case "bullet":
      state.bulletSpeed += 1;
      break;
    case "life":
      state.lives += 1;
      break;
  }
  state.level += 1;
  state.nextLevelScore += LEVEL_SCORE_STEP + state.level * 25;
  state.bonusMessage = `Level ${state.level}: ${bonus.label}`;
  state.bonusMessageTimer = 240;
  updateWeaponStage();
}

function updateLevelProgress() {
  while (state.score >= state.nextLevelScore && !state.gameOver) {
    gainLevel();
  }
}

function updateWeaponStage() {
  const target = Math.min(MAX_WEAPON_STAGE, 1 + Math.floor(state.level / 3));
  if (target > state.weaponStage) {
    state.weaponStage = target;
    state.bonusMessage = `Weapon upgraded: ${WEAPON_STAGES[target].name}`;
    state.bonusMessageTimer = 300;
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

function drawEnemyShape(enemy) {
  const gradient = ctx.createRadialGradient(
    enemy.pos.x,
    enemy.pos.y,
    enemy.radius * 0.2,
    enemy.pos.x,
    enemy.pos.y,
    enemy.radius
  );
  gradient.addColorStop(0, "rgba(255,255,255,0.85)");
  gradient.addColorStop(1, enemy.color);
  ctx.fillStyle = gradient;
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 2;

  switch (enemy.behavior) {
    case "slow":
      ctx.beginPath();
      ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (enemy.hitFlashTimer > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.6, 0.25 + enemy.hitFlashTimer / 20);
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    case "sneak":
      ctx.beginPath();
      ctx.moveTo(enemy.pos.x, enemy.pos.y - enemy.radius);
      ctx.lineTo(enemy.pos.x - enemy.radius, enemy.pos.y + enemy.radius);
      ctx.lineTo(enemy.pos.x + enemy.radius, enemy.pos.y + enemy.radius);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (enemy.hitFlashTimer > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.6, 0.25 + enemy.hitFlashTimer / 20);
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.moveTo(enemy.pos.x, enemy.pos.y - enemy.radius);
        ctx.lineTo(enemy.pos.x - enemy.radius, enemy.pos.y + enemy.radius);
        ctx.lineTo(enemy.pos.x + enemy.radius, enemy.pos.y + enemy.radius);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      break;
    case "zigzag": {
      const points = [
        { x: enemy.pos.x, y: enemy.pos.y - enemy.radius },
        { x: enemy.pos.x + enemy.radius, y: enemy.pos.y },
        { x: enemy.pos.x, y: enemy.pos.y + enemy.radius },
        { x: enemy.pos.x - enemy.radius, y: enemy.pos.y },
      ];
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (enemy.hitFlashTimer > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.6, 0.25 + enemy.hitFlashTimer / 20);
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      break;
    }
    case "shooter": {
      const points = regularPolygonPoints(enemy.pos.x, enemy.pos.y, enemy.radius, 6, 30);
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = COLORS.cyan;
      ctx.stroke();
      if (enemy.hitFlashTimer > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.6, 0.25 + enemy.hitFlashTimer / 20);
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      break;
    }
    case "charger": {
      const size = enemy.radius * 2;
      ctx.fillRect(enemy.pos.x - enemy.radius, enemy.pos.y - enemy.radius, size, size);
      ctx.strokeRect(enemy.pos.x - enemy.radius, enemy.pos.y - enemy.radius, size, size);
      ctx.beginPath();
      ctx.moveTo(enemy.pos.x, enemy.pos.y - enemy.radius);
      ctx.lineTo(enemy.pos.x, enemy.pos.y + enemy.radius);
      ctx.strokeStyle = COLORS.white;
      ctx.stroke();
      if (enemy.hitFlashTimer > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.6, 0.25 + enemy.hitFlashTimer / 20);
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.pos.x - enemy.radius, enemy.pos.y - enemy.radius, size, size);
        ctx.restore();
      }
      break;
    }
    default:
      ctx.beginPath();
      ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      if (enemy.hitFlashTimer > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.6, 0.25 + enemy.hitFlashTimer / 20);
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
  }
}

function drawPlayerAvatar() {
  const stage = Math.min(state.weaponStage, Math.max(...Object.keys(PLAYER_STAGE_STYLE).map(Number)));
  const style = PLAYER_STAGE_STYLE[stage] ?? PLAYER_STAGE_STYLE[4];
  const { x, y, size } = state.player;
  const half = size / 2;
  const gradient = ctx.createRadialGradient(x, y, half * 0.2, x, y, half);
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(1, style.color);
  ctx.fillStyle = gradient;
  ctx.strokeStyle = style.outline;
  ctx.lineWidth = 2;

  if (style.shape === "square") {
    ctx.fillRect(x - half, y - half, size, size);
    ctx.strokeRect(x - half, y - half, size, size);
  } else if (style.shape === "diamond") {
    ctx.beginPath();
    ctx.moveTo(x, y - half);
    ctx.lineTo(x + half, y);
    ctx.lineTo(x, y + half);
    ctx.lineTo(x - half, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (style.shape === "hex") {
    const points = regularPolygonPoints(x, y, half, 6, 30);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    const points = regularPolygonPoints(x, y, half, 8, 22.5);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  if (state.shieldTimer > 0) {
    ctx.strokeStyle = "rgba(200,255,255,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, half * 1.3, 0, Math.PI * 2);
    ctx.stroke();
  } else if (state.invincibleTimer > 0) {
    ctx.strokeStyle = "rgba(150,255,150,0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, half * 1.1, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawCollectibles() {
  for (const item of state.collectibles) {
    ctx.save();
    ctx.shadowColor = item.glow ?? item.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = item.color;
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 1.5;
    if (item.icon === "hourglass") {
      ctx.beginPath();
      ctx.moveTo(item.pos.x - item.radius, item.pos.y - item.radius);
      ctx.lineTo(item.pos.x + item.radius, item.pos.y - item.radius);
      ctx.lineTo(item.pos.x - item.radius, item.pos.y + item.radius);
      ctx.lineTo(item.pos.x + item.radius, item.pos.y + item.radius);
      ctx.moveTo(item.pos.x - item.radius, item.pos.y - item.radius);
      ctx.lineTo(item.pos.x + item.radius, item.pos.y + item.radius);
      ctx.moveTo(item.pos.x + item.radius, item.pos.y - item.radius);
      ctx.lineTo(item.pos.x - item.radius, item.pos.y + item.radius);
      ctx.stroke();
    } else if (item.icon === "heart") {
      ctx.beginPath();
      ctx.moveTo(item.pos.x, item.pos.y + item.radius * 0.7);
      ctx.bezierCurveTo(
        item.pos.x + item.radius,
        item.pos.y,
        item.pos.x + item.radius * 0.9,
        item.pos.y - item.radius * 0.8,
        item.pos.x,
        item.pos.y - item.radius * 0.2
      );
      ctx.bezierCurveTo(
        item.pos.x - item.radius * 0.9,
        item.pos.y - item.radius * 0.8,
        item.pos.x - item.radius,
        item.pos.y,
        item.pos.x,
        item.pos.y + item.radius * 0.7
      );
      ctx.fill();
      ctx.stroke();
    } else if (item.icon === "orbit") {
      ctx.beginPath();
      ctx.arc(item.pos.x, item.pos.y, item.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(item.pos.x, item.pos.y, item.radius, item.radius * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (item.icon === "bounce") {
      ctx.beginPath();
      ctx.arc(item.pos.x, item.pos.y, item.radius, Math.PI, Math.PI * 1.5);
      ctx.arc(item.pos.x, item.pos.y, item.radius, Math.PI * 1.5, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(item.pos.x, item.pos.y, item.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.icon === "burst") {
      ctx.beginPath();
      for (let i = 0; i < 8; i += 1) {
        const ang = (Math.PI * 2 * i) / 8;
        const r = item.radius * (i % 2 === 0 ? 1 : 0.55);
        ctx.lineTo(item.pos.x + Math.cos(ang) * r, item.pos.y + Math.sin(ang) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (item.icon === "arrow") {
      ctx.beginPath();
      ctx.moveTo(item.pos.x - item.radius * 0.9, item.pos.y + item.radius * 0.6);
      ctx.lineTo(item.pos.x, item.pos.y - item.radius);
      ctx.lineTo(item.pos.x + item.radius * 0.9, item.pos.y + item.radius * 0.6);
      ctx.lineTo(item.pos.x, item.pos.y + item.radius * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (item.icon === "blink") {
      ctx.beginPath();
      ctx.moveTo(item.pos.x - item.radius, item.pos.y);
      ctx.lineTo(item.pos.x, item.pos.y - item.radius * 0.8);
      ctx.lineTo(item.pos.x + item.radius, item.pos.y);
      ctx.lineTo(item.pos.x, item.pos.y + item.radius * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (item.icon === "power") {
      ctx.beginPath();
      ctx.moveTo(item.pos.x - item.radius * 0.3, item.pos.y - item.radius);
      ctx.lineTo(item.pos.x + item.radius * 0.2, item.pos.y - item.radius * 0.2);
      ctx.lineTo(item.pos.x - item.radius * 0.1, item.pos.y - item.radius * 0.2);
      ctx.lineTo(item.pos.x + item.radius * 0.3, item.pos.y + item.radius);
      ctx.lineTo(item.pos.x - item.radius * 0.2, item.pos.y + item.radius * 0.2);
      ctx.lineTo(item.pos.x + item.radius * 0.1, item.pos.y + item.radius * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(item.pos.x, item.pos.y, item.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
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

function drawHUD() {
  ctx.fillStyle = COLORS.white;
  ctx.font = "24px Segoe UI";
  ctx.fillText(`Score: ${state.score}`, 15, 30);
  const modeLabel =
    state.mode === "rogue"
      ? `试炼（${ROGUE_DIFFICULTIES[state.modeDifficulty]?.label ?? "标准"}）`
      : "无尽";
  ctx.fillText(`Mode: ${modeLabel}`, 15, 60);
  ctx.fillText(`Lives: ${state.lives}`, 15, 90);
  ctx.font = "18px Segoe UI";
  if (state.mode === "rogue") {
    ctx.fillText(`伤害: ${state.playerDamage}`, 15, 120);
    ctx.fillText(`散射数量: ${state.modeShots}`, 15, 144);
    ctx.fillText(`环绕子弹: ${state.orbitals.length}/5`, 15, 168);
    ctx.fillText(`闪现(F): ${state.blinkCharges}/${state.maxBlinkCharges}`, 15, 192);
    if (state.ricochetTimer > 0) ctx.fillText(`反弹剩余: ${(state.ricochetTimer / 60).toFixed(1)}s`, 15, 216);
    if (state.timeStopTimer > 0) ctx.fillText(`时间暂停: ${(state.timeStopTimer / 60).toFixed(1)}s`, 15, 240);
    if (state.rampageTimer > 0) ctx.fillText(`猛袭: ${(state.rampageTimer / 60).toFixed(1)}s`, 15, 264);
  } else {
    ctx.fillText(`Level: ${state.level}`, 15, 120);
    ctx.fillText(`Weapon: ${WEAPON_STAGES[state.weaponStage].name}`, 15, 144);
    if (state.multiplier > 1) {
      ctx.fillStyle = COLORS.orange;
      ctx.fillText(`x${state.multiplier.toFixed(1)} multiplier`, 15, 168);
    }
    if (state.bonusMessageTimer > 0 && state.bonusMessage) {
      ctx.fillStyle = COLORS.cyan;
      ctx.fillText(state.bonusMessage, 15, 192);
    }
    ctx.fillStyle = COLORS.white;
    drawEnergyBar();
  }

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
  const duration = ROGUE_ITEMS.find((i) => i.code === "timestop")?.duration ?? 360;
  const progress = 1 - state.timeStopTimer / duration;
  const angle = Math.PI * progress; // 0 -> 180 度翻转
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
  });
}

function flushFrozenDeaths() {
  if (!state.pendingFrozenKills.length) return;
  const killSet = new Set(state.pendingFrozenKills);
  const survivors = [];
  for (const enemy of state.enemies) {
    if (killSet.has(enemy)) {
      spawnParticles({
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

function updateGame() {
  updateStarfield();
  if (state.scene !== "game") {
    updateParticles();
    return;
  }
  if (state.paused) return;
  updateParticles();
  if (state.shakeTimer > 0) state.shakeTimer -= 1 * delta;
  if (!state.gameOver) {
    if (state.keys[" "] || state.isMouseDown) fireWeapon();

    movePlayer();
    moveEnemies();
    updateOrbitals();
    updateBullets();

    if (state.mode === "rogue") {
      state.modeElapsed += delta;
      state.itemSpawnTimer += delta;
      if (state.itemSpawnTimer >= state.itemSpawnInterval) {
        spawnRogueItem();
        state.itemSpawnTimer = 0;
      }

      state.enemySpawnTimer += delta;
      state.enemySpawnInterval = Math.max(90, 170 - Math.floor(state.modeElapsed / 600) * 10);
      state.maxEnemies = Math.min(14, 8 + Math.floor(state.modeElapsed / 900));
      if (state.enemySpawnTimer >= state.enemySpawnInterval) {
        spawnEnemy();
        state.enemySpawnTimer = 0;
      }
    } else {
      state.collectiblesTimer += delta;
      if (state.collectiblesTimer >= state.collectiblesInterval) {
        spawnCollectible();
        state.collectiblesTimer = 0;
      }

      state.enemySpawnTimer += delta;
      if (state.enemySpawnTimer >= state.enemySpawnInterval) {
        spawnEnemy();
        state.enemySpawnTimer = 0;
      }
    }

    handleCollectibles();
    handleEnemyHits();
    checkCollisions();
    updateTimers();
    if (state.mode !== "rogue") updateLevelProgress();
  } else {
    updateBullets();
  }
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
    drawPlayerAvatar();
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

function gameLoop() {
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

// Input handling --------------------------------------------------------------
window.addEventListener("keydown", (e) => {
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
});

window.addEventListener("keyup", (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  state.keys[key] = false;
});

canvas.addEventListener("mousedown", (e) => {
  if (e.button === 0 && state.scene === "game" && !state.gameOver && !state.paused) {
    state.isMouseDown = true;
    fireWeapon();
  }
});

canvas.addEventListener("mouseup", (e) => {
  if (e.button === 0) state.isMouseDown = false;
});

canvas.addEventListener("mouseleave", () => {
  state.isMouseDown = false;
});

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  state.mousePos = {
    x: ((e.clientX - rect.left) / rect.width) * WIDTH,
    y: ((e.clientY - rect.top) / rect.height) * HEIGHT,
  };
});

initStarfield();
resetGame();
gameLoop();

