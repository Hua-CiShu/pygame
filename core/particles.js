import { randRange } from "./utils.js";
import { COLORS } from "./constants.js";

export function spawnParticles(state, {
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

export function updateParticles(state, delta) {
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
