export function randRange(min, max) {
  return Math.random() * (max - min) + min;
}

export function chooseWeighted(options, weightKey = "weight") {
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

export function normalize(vec) {
  const len = Math.hypot(vec.x, vec.y);
  if (!len) return { x: 0, y: 0 };
  return { x: vec.x / len, y: vec.y / len };
}

export function rotateVector(vec, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: vec.x * cos - vec.y * sin,
    y: vec.x * sin + vec.y * cos,
  };
}
