import { COLORS, BASE_SPEED, BASE_ENERGY_MAX, ENEMY_BULLET_SPEED, BASE_BULLET_SPEED } from "../core/constants.js";
import { spawnParticles } from "../core/particles.js";
import { randRange, chooseWeighted, normalize, rotateVector } from "../core/utils.js";

// 试炼模式也刷新无尽模式怪物，血量翻倍
const ROGUE_ENEMY_TYPES = [
  { name: "slow", behavior: "slow", color: COLORS.red, speed: 1.8, radius: 18, weight: 3.5, baseHp: 2 },
  { name: "sneaky", behavior: "sneak", color: "#FF8C5A", speed: 2.6, radius: 15, weight: 3, baseHp: 2 },
  { name: "zigzag", behavior: "zigzag", color: "#FF78D2", speed: 2.3, radius: 16, weight: 2.2, baseHp: 2 },
  { name: "shooter", behavior: "shooter", color: "#FFD890", speed: 1.9, radius: 18, weight: 2, baseHp: 2 },
  { name: "charger", behavior: "charger", color: "#78FFAA", speed: 2.1, radius: 16, weight: 2, baseHp: 2 },
  { name: "splitter", behavior: "splitter", color: "#FFB2A6", speed: 1.8, radius: 18, weight: 2.4, baseHp: 2.4 },
  { name: "brute", behavior: "brute", color: "#5CE0A5", speed: 1.4, radius: 20, weight: 1.6, baseHp: 6 },
  { name: "commander", behavior: "commander", color: "#8BE7FF", speed: 1.3, radius: 20, weight: 1.8, baseHp: 4.4 },
  { name: "toxic", behavior: "toxic", color: "#8CFF95", speed: 1.9, radius: 16, weight: 2.6, baseHp: 2.8 },
  { name: "assassin", behavior: "assassin", color: "#A8B7FF", speed: 2.5, radius: 15, weight: 2.2, baseHp: 3 },
  { name: "riftcaller", behavior: "rift", color: "#C07BFF", speed: 1.3, radius: 19, weight: 1.8, baseHp: 5 },
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
  easy: { key: "easy", label: "简单", itemInterval: 200, hpMult: 1 },
  normal: { key: "normal", label: "标准", itemInterval: 260, hpMult: 1.5 },
  hard: { key: "hard", label: "艰难", itemInterval: 320, hpMult: 2 },
};

export function initState(state, difficulty = "normal") {
  state.mode = "rogue";
  state.modeDifficulty = difficulty;
  state.player = { x: state.width / 2, y: state.height / 2, size: 26, speed: BASE_SPEED - 0.4 };
  state.energyMax = BASE_ENERGY_MAX;
  state.energy = state.energyMax;
  state.bullets = [];
  state.enemyBullets = [];
  state.collectibles = [];
  state.enemies = [];
  state.poisonZones = [];
  state.rifts = [];
  state.enemySpawnTimer = 0;
  state.enemySpawnInterval = 170;
  state.maxEnemies = 8;
  state.score = 0;
  state.lives = 3;
  state.multiplier = 1;
  state.multiplierTimer = 0;
  state.level = 1;
  state.weaponStage = 1;
  state.bulletSpeed = BASE_BULLET_SPEED;
  state.modeShots = 1;
  state.playerDamage = 1;
  state.orbitals = [];
  state.rampageTimer = 0;
  state.ricochetTimer = 0;
  state.timeStopTimer = 0;
  state.pendingFrozenKills = [];
  state.blinkCharges = 1;
  state.modeElapsed = 0;
  state.itemSpawnTimer = 0;
  state.bossTimer = 0;
  state.bossActive = false;
  state.bossDefeated = 0;
  const diff = ROGUE_DIFFICULTIES[difficulty] ?? ROGUE_DIFFICULTIES.normal;
  state.itemSpawnInterval = diff.itemInterval;
  state.diffHpMult = diff.hpMult ?? 1;
}

export function resetState(state) {
  initState(state, state.modeDifficulty ?? "normal");
}

export function update(state, delta) {
  state.modeElapsed += delta;
  state.bossActive = state.enemies.some((e) => e.isBoss && e.hp > 0);
  if (state.ultimateIncoming || state.ultimateActive) state.bossActive = true;
  if (!state.bossActive) state.bossTimer += delta;
  const bossCooldown = 1000 + (state.bossDefeated ?? 0) * 320;
  if (!state.bossActive && state.modeElapsed >= 900 && state.bossTimer >= bossCooldown) {
    spawnBoss(state);
  }
  state.itemSpawnTimer += delta;
  if (state.itemSpawnTimer >= state.itemSpawnInterval) {
    spawnRogueItem(state);
    state.itemSpawnTimer = 0;
  }

  if (!state.bossActive && !state.ultimateIncoming && !state.ultimateActive) {
    state.enemySpawnTimer += delta;
    state.enemySpawnInterval = Math.max(90, 170 - Math.floor(state.modeElapsed / 600) * 10);
    state.maxEnemies = Math.min(14, 8 + Math.floor(state.modeElapsed / 900));
    if (state.enemySpawnTimer >= state.enemySpawnInterval) {
      spawnEnemy(state);
      state.enemySpawnTimer = 0;
    }
  } else {
    state.enemySpawnTimer = 0;
  }

  updatePoisonZones(state, delta);
  updateRifts(state, delta);

  if (state.keys[" "] || state.isMouseDown) fireWeapon(state);
  handleCollectibles(state);
  handleEnemyHits(state);
}

function fireWeapon(state) {
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
  spawnParticles(state, {
    x: state.player.x,
    y: state.player.y,
    color: COLORS.cyan,
    count: 6 + count,
    speed: [0.6, 1.6],
    size: [1, 2],
    life: [8, 14],
    spread: Math.PI / 2,
  });
  state.playShoot?.();
  state.bulletCooldown = 10;
}

function spawnRogueItem(state) {
  if (state.collectibles.length >= 6) return;
  const padding = 45;
  const x = randRange(padding, state.width - padding);
  const y = randRange(padding, state.height - padding);
  const template = chooseWeighted(ROGUE_ITEMS);
  state.collectibles.push({
    ...template,
    pos: { x, y },
    radius: 14,
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

  const template = chooseWeighted(ROGUE_ENEMY_TYPES);
  const hpScale = Math.max(1, 1 + Math.floor(state.modeElapsed / 900));
  const diffMult = state.diffHpMult ?? 1;
  state.enemies.push({
    ...template,
    pos,
    baseSpeed: template.speed,
    hp: (template.baseHp ?? 1) * hpScale * diffMult,
    zigzagDir: Math.random() < 0.5 ? -1 : 1,
    zigzagTimer: 0,
    shootCooldown: randRange(90, 140),
    dashCooldown: randRange(120, 160),
    state: "chase",
    stateTimer: 0,
    dashDir: { x: 0, y: 0 },
    hitFlashTimer: 0,
    slowTimer: 0,
    shieldHp: template.behavior === "commander" ? 4 : 0,
    shieldCooldown: 200,
    toxinTimer: 0,
    phaseCooldown: template.behavior === "assassin" ? 220 : 0,
    invisibleTimer: 0,
    riftCooldown: template.behavior === "rift" ? randRange(140, 200) : 0,
    childSplit: false,
  });
}

function spawnBoss(state) {
  const diffMult = state.diffHpMult ?? 1;
  const hp = 110 * diffMult + Math.floor(state.modeElapsed / 600) * 20;
  state.enemies.push({
    name: "void_matriarch",
    behavior: "boss",
    isBoss: true,
    color: "#FF9CF4",
    speed: 1.0,
    baseSpeed: 1.0,
    radius: 46,
    pos: { x: state.width / 2 + randRange(-90, 90), y: -50 },
    hp,
    maxHp: hp,
    preferDist: 240,
    shootCooldown: 70,
    waveCooldown: 160,
    spawnCooldown: 210,
    hitFlashTimer: 0,
    slowTimer: 0,
    zigzagDir: Math.random() < 0.5 ? -1 : 1,
    zigzagTimer: 0,
  });
  state.bossActive = true;
  state.bossTimer = 0;
  state.effectBanner = { text: "Boss 入场", color: COLORS.purple, timer: 240 };
  state.shakeTimer = 14;
  state.shakeMag = 6;
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
        count: 12,
        speed: [0.9, 2.4],
        size: [2, 4],
        life: [16, 28],
      });
      switch (item.code) {
        case "rampage":
          state.rampageTimer = Math.max(state.rampageTimer, item.duration ?? 300);
          state.invincibleTimer = Math.max(state.invincibleTimer, item.duration ?? 300);
          state.effectBanner = { text: "猛袭无敌！", color: item.color, timer: 140 };
          break;
        case "spread":
          state.modeShots = Math.min(state.modeShots + 1, 10);
          break;
        case "life":
          state.lives += 1;
          state.effectBanner = { text: "生命 +1", color: item.color, timer: 120 };
          break;
        case "orbital":
          if (state.orbitals.length < 5) {
            state.orbitals.push({ angle: Math.random() * Math.PI * 2, speed: 0.05 + state.orbitals.length * 0.01 });
          } else {
            state.orbitals.forEach((o) => (o.speed = (o.speed ?? 0.05) + 0.01));
          }
          state.effectBanner = { text: "环绕子弹 增强", color: item.color, timer: 120 };
          break;
        case "ricochet":
          state.ricochetTimer = Math.max(state.ricochetTimer, item.duration ?? 600);
          state.effectBanner = { text: "反弹 10s", color: item.color, timer: 140 };
          break;
        case "blink":
          state.blinkCharges = Math.min(state.maxBlinkCharges, state.blinkCharges + 1);
          state.effectBanner = { text: "闪现充能 +1", color: item.color, timer: 120 };
          break;
        case "timestop":
          state.timeStopTimer = Math.max(state.timeStopTimer, item.duration ?? 180);
          state.effectBanner = { text: "时间暂停 6s", color: item.color, timer: 160 };
          break;
        case "power":
          state.playerDamage += 1;
          state.effectBanner = { text: "攻击 +1", color: item.color, timer: 120 };
          break;
      }
    } else remain.push(item);
  }
  state.collectibles = remain;
}

function handleRogueDeath(state, enemy, deadIds) {
  enemy.hp = 0;
  if (state.timeStopTimer > 0) {
    if (!enemy.pendingDeath) state.pendingFrozenKills.push(enemy);
    enemy.pendingDeath = true;
  } else deadIds.add(enemy);
  if (enemy.isBoss) handleBossDefeat(state, enemy);
}

function handleBossDefeat(state, enemy) {
  if (enemy._bossProcessed) return;
  enemy._bossProcessed = true;
  state.bossActive = false;
  state.bossTimer = 0;
  state.bossDefeated = (state.bossDefeated ?? 0) + 1;
  state.score += 380;
  state.effectBanner = { text: "Boss 击败!", color: COLORS.purple, timer: 260 };
  state.shakeTimer = 18;
  state.shakeMag = 7;
  state.lives += 1;
  state.blinkCharges = Math.min(state.maxBlinkCharges ?? 3, (state.blinkCharges ?? 0) + 1);
  state.collectibles.push(
    { name: "energy", color: COLORS.cyan, radius: 14, pos: { x: enemy.pos.x - 14, y: enemy.pos.y }, energy: 50 },
    { name: "shield", color: COLORS.white, radius: 14, pos: { x: enemy.pos.x + 14, y: enemy.pos.y }, shield: 360 }
  );
  if (enemy.isUltimate) {
    state.ultimateActive = false;
    state.ultimateBoss = null;
    state.ultimateScale = 1;
    state.ultimateCamOffsetY = 0;
  }
}

function handleEnemyHits(state) {
  const deadIds = new Set();
  for (const enemy of state.enemies) {
    const collidable = enemy.pendingDeath || enemy.hp > 0;
    if (!collidable) continue;
    for (const orb of state.orbitals) {
      if (!orb.pos) continue;
      const dist = Math.hypot(enemy.pos.x - orb.pos.x, enemy.pos.y - orb.pos.y);
      if (dist < enemy.radius + 6) {
        if (!enemy.pendingDeath && enemy.hp > 0) {
          let dmg = state.playerDamage;
          if (enemy.shieldHp && enemy.shieldHp > 0) {
            enemy.shieldHp -= dmg;
            dmg = enemy.shieldHp < 0 ? -enemy.shieldHp : 0;
            enemy.shieldHp = Math.max(0, enemy.shieldHp);
          }
          if (dmg > 0) enemy.hp -= dmg;
          enemy.hitFlashTimer = 12;
          enemy.slowTimer = 18;
          if (enemy.hp <= 0) {
            handleRogueDeath(state, enemy, deadIds);
            if (enemy.behavior === "splitter" && !enemy.childSplit) {
              spawnSplitChildren(state, enemy);
            }
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
          let dmg = bullet.damage ?? state.playerDamage;
          if (enemy.shieldHp && enemy.shieldHp > 0) {
            enemy.shieldHp -= dmg;
            dmg = enemy.shieldHp < 0 ? -enemy.shieldHp : 0;
            enemy.shieldHp = Math.max(0, enemy.shieldHp);
          }
          if (dmg > 0) enemy.hp -= dmg;
          enemy.hitFlashTimer = 12;
          enemy.slowTimer = 18;
        }
        if (bullet.pierce > 0) bullet.pierce -= 1;
        else bullet.pos.x = -9999;
        if (enemy.hp <= 0) {
          handleRogueDeath(state, enemy, deadIds);
          if (enemy.behavior === "splitter" && !enemy.childSplit) {
            spawnSplitChildren(state, enemy);
          }
          break;
        }
      }
    }
  }

  const survivors = [];
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0 && !enemy.pendingDeath) {
      spawnParticles(state, {
        x: enemy.pos.x,
        y: enemy.pos.y,
        color: enemy.color,
        count: 14,
        speed: [1.2, 3.4],
        size: [2, 4],
        life: [16, 28],
      });
      if (!enemy.isBoss) state.score += 12;
    } else survivors.push(enemy);
  }
  state.enemies = survivors;
  state.bullets = state.bullets.filter((b) => b.pos.x > -1000);
}

function spawnSplitChildren(state, enemy) {
  const count = 2;
  for (let i = 0; i < count; i += 1) {
    state.enemies.push({
      name: "splitling",
      behavior: "splitter",
      color: enemy.color,
      speed: enemy.baseSpeed * 1.2,
      baseSpeed: enemy.baseSpeed * 1.2,
      radius: Math.max(10, enemy.radius * 0.65),
      pos: { x: enemy.pos.x + randRange(-10, 10), y: enemy.pos.y + randRange(-10, 10) },
      hp: Math.max(1, (enemy.baseHp ?? 1) * 0.8 * (state.diffHpMult ?? 1)),
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

function updatePoisonZones(state, delta) {
  if (!state.poisonZones) state.poisonZones = [];
  state.poisonZones = state.poisonZones.filter((z) => {
    z.timer -= delta;
    z.radius = Math.max(6, z.radius * (1 - 0.0005 * delta));
    return z.timer > 0;
  });
}

function updateRifts(state, delta) {
  if (!state.rifts) state.rifts = [];
  state.rifts = state.rifts.filter((r) => {
    r.timer -= delta;
    r.spawnTimer += delta;
    if (r.spawnTimer >= 90) {
      spawnRiftMinion(state, r);
      r.spawnTimer = 0;
    }
    return r.timer > 0;
  });
}

function spawnRiftMinion(state, rift) {
  state.enemies.push({
    name: "riftling",
    behavior: "zigzag",
    color: "#C07BFF",
    speed: 2.0,
    baseSpeed: 2.0,
    radius: 12,
    pos: { x: rift.x + randRange(-8, 8), y: rift.y + randRange(-8, 8) },
    hp: 2 * (state.diffHpMult ?? 1),
    zigzagDir: Math.random() < 0.5 ? -1 : 1,
    zigzagTimer: 0,
    shootCooldown: randRange(130, 180),
    dashCooldown: randRange(130, 170),
    state: "chase",
    stateTimer: 0,
    dashDir: { x: 0, y: 0 },
    hitFlashTimer: 0,
    slowTimer: 0,
    childSplit: true,
  });
}

export function drawHUD(state, ctx) {
  ctx.fillStyle = COLORS.white;
  ctx.font = "24px Segoe UI";
  ctx.fillText(`Score: ${state.score}`, 15, 30);
  const modeLabel = `试炼（${state.modeDifficulty ?? "标准"}）`;
  ctx.fillText(`Mode: ${modeLabel}`, 15, 60);
  drawLives(ctx, 15, 90, state.lives);
  ctx.font = "18px Segoe UI";
  ctx.fillText(`伤害: ${state.playerDamage}`, 15, 120);
  ctx.fillText(`散射数量: ${state.modeShots}`, 15, 144);
  ctx.fillText(`环绕子弹: ${state.orbitals.length}/5`, 15, 168);
  ctx.fillText(`闪现(F): ${state.blinkCharges}/${state.maxBlinkCharges ?? 3}`, 15, 192);
  if (state.ricochetTimer > 0) ctx.fillText(`反弹剩余: ${(state.ricochetTimer / 60).toFixed(1)}s`, 15, 216);
  if (state.timeStopTimer > 0) ctx.fillText(`时间暂停: ${(state.timeStopTimer / 60).toFixed(1)}s`, 15, 240);
  if (state.rampageTimer > 0) ctx.fillText(`猛袭: ${(state.rampageTimer / 60).toFixed(1)}s`, 15, 264);
}

export function drawPlayerAvatar(state, ctx) {
  const { x, y, size } = state.player;
  const half = size / 2;
  const gradient = ctx.createRadialGradient(x, y, half * 0.2, x, y, half);
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(1, COLORS.blue);
  ctx.fillStyle = gradient;
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - half);
  ctx.lineTo(x + half, y);
  ctx.lineTo(x, y + half);
  ctx.lineTo(x - half, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawLives(ctx, x, y, lives) {
  const heart = (px, py) => {
    ctx.beginPath();
    ctx.moveTo(px, py + 6);
    ctx.bezierCurveTo(px, py, px - 8, py, px - 8, py + 6);
    ctx.bezierCurveTo(px - 8, py + 12, px, py + 16, px, py + 20);
    ctx.bezierCurveTo(px, py + 16, px + 8, py + 12, px + 8, py + 6);
    ctx.bezierCurveTo(px + 8, py, px, py, px, py + 6);
    ctx.fill();
    ctx.stroke();
  };
  ctx.save();
  ctx.fillStyle = "#ff6b6b";
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.5;
  const gap = 18;
  for (let i = 0; i < lives; i += 1) {
    heart(x + i * gap, y);
  }
  ctx.restore();
  ctx.fillStyle = COLORS.white;
  ctx.font = "16px Segoe UI";
  ctx.fillText(`x${lives}`, x + lives * gap + 6, y + 18);
}
