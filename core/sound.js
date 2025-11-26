let ctx = null;
const buffers = new Map();
let unlocked = false;

function ensureContext() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) ctx = new AudioCtx();
  }
  return ctx;
}

export function initAudio() {
  return ensureContext();
}

export function unlockAudio() {
  const audio = ensureContext();
  if (audio && audio.state === "suspended") {
    audio.resume().catch(() => {});
  }
  unlocked = true;
}

export async function loadSound(key, url) {
  const audio = ensureContext();
  if (!audio) return;
  try {
    const res = await fetch(url);
    const arr = await res.arrayBuffer();
    const buf = await audio.decodeAudioData(arr);
    buffers.set(key, buf);
  } catch (err) {
    console.warn("Failed to load sound", key, err);
  }
}

export function play(key, { volume = 0.5, detune = 0 } = {}) {
  const audio = ensureContext();
  if (!audio || !unlocked) return;
  const buf = buffers.get(key);
  if (!buf) return;
  const src = audio.createBufferSource();
  src.buffer = buf;
  if (src.detune) src.detune.value = detune;
  const gain = audio.createGain();
  gain.gain.value = volume;
  src.connect(gain).connect(audio.destination);
  src.start(0);
}
