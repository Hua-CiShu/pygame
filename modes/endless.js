import { COLORS, BASE_SPEED, BASE_ENERGY_MAX, ENERGY_REGEN, ENEMY_BULLET_SPEED, LEVEL_SCORE_STEP, BASE_BULLET_SPEED } from "../core/constants.js";
import { spawnParticles } from "../core/particles.js";
import { randRange, chooseWeighted, normalize, rotateVector } from "../core/utils.js";

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

const LEVEL_BONUSES = [
  { label: "Move speed +0.4", code: "speed" },
  { label: "Max enemies +1", code: "enemy_cap" },
  { label: "Energy max +15", code: "energy" },
  { label: "Bullet speed +1", code: "bullet" },
  { label: "Gain 1 extra life", code: "life" },
];

export function initState(state) {
  state.mode = "endless";
  state.player = { x: state.width / 2, y: state.height / 2, size: 32, speed: BASE_SPEED };
  state.energyMax = BASE_ENERGY_MAX;
  state.energy = state.energyMax;
  state.bullets = [];
  state.enemyBullets = [];
  state.collectibles = [];
  state.enemies = [];
  state.collectiblesTimer = 0;
  state.collectiblesInterval = 70;
  state.enemySpawnTimer = 0;
  state.enemySpawnInterval = 210;
  state.maxEnemies = 6;
  state.score = 0;
  state.lives = 4;
  state.multiplier = 1;
  state.multiplierTimer = 0;
  state.level = 1;
  state.nextLevelScore = LEVEL_SCORE_STEP;
  state.bonusIndex = 0;
  state.weaponStage = 1;
  state.bulletSpeed = BASE_BULLET_SPEED;
  for (let i = 0; i < 4; i += 1) {
    spawnCollectible(state, true);
  }
}

export function resetState(state) {
  initState(state);
}

export function update(state, delta) {
  if (state.keys[" "] || state.isMouseDown) fireWeapon(state);

  state.collectiblesTimer += delta;
  if (state.collectiblesTimer >= state.collectiblesInterval) {
    spawnCollectible(state);
    state.collectiblesTimer = 0;
  }

  state.enemySpawnTimer += delta;
  if (state.enemySpawnTimer >= state.enemySpawnInterval) {
    spawnEnemy(state);
    state.enemySpawnTimer = 0;
  }

  handleCollectibles(state);
  handleEnemyHits(state);
  updateLevelProgress(state);
}

function fireWeapon(state) {
  if (state.bulletCooldown > 0 || state.energy < WEAPON_STAGES[state.weaponStage].cost) return;
  const profile = WEAPON_STAGES[state.weaponStage];
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

  spawnParticles(state, {
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

function spawnCollectible(state, initial = false) {
  if (!initial && state.collectibles.length >= 6) return;
  const padding = 50;
  const x = randRange(padding, state.width - padding);
  const y = randRange(padding, state.height - padding);
  const template = chooseWeighted(COLLECTIBLE_TYPES);
  state.collectibles.push({
    ...template,
    pos: { x, y },
  });
}

function spawnEnemy(state) {
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
  if (side === "top") pos = { x: randRange(0, state.width), y: -25 };
  else if (side === "bottom") pos = { x: randRange(0, state.width), y: state.height + 25 };
  else if (side === "left") pos = { x: -25, y: randRange(0, state.height) };
  else pos = { x: state.width + 25, y: randRange(0, state.height) };

  const template = chooseWeighted(ENEMY_TYPES);
  state.enemies.push({
    ...template,
    pos,
    baseSpeed: template.speed,
    hp: template.baseHp ?? 1,
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

function handleCollectibles(state) {
  const { x, y, size } = state.player;
  const playerRadius = size / 2;
  const remain = [];
  for (const item of state.collectibles) {
    const dist = Math.hypot(item.pos.x - x, item.pos.y - y);
    if (dist < item.radius + playerRadius) {
      spawnParticles(state, {
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

function handleEnemyHits(state) {
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
        spawnParticles(state, {
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

function gainLevel(state) {
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
  updateWeaponStage(state);
}

function updateLevelProgress(state) {
  while (state.score >= state.nextLevelScore && !state.gameOver) {
    gainLevel(state);
  }
}

function updateWeaponStage(state) {
  const target = Math.min(MAX_WEAPON_STAGE, 1 + Math.floor(state.level / 3));
  if (target > state.weaponStage) {
    state.weaponStage = target;
    state.bonusMessage = `Weapon upgraded: ${WEAPON_STAGES[target].name}`;
    state.bonusMessageTimer = 300;
  }
}

export function drawHUD(state, ctx) {
  ctx.fillStyle = COLORS.white;
  ctx.font = "24px Segoe UI";
  ctx.fillText(`Score: ${state.score}`, 15, 30);
  ctx.fillText(`Mode: 无尽`, 15, 60);
  ctx.fillText(`Lives: ${state.lives}`, 15, 90);
  ctx.font = "18px Segoe UI";
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
}

export function drawPlayerAvatar(state, ctx) {
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
