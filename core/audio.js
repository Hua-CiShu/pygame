export function createAudioPool(src, size = 4, volume = 0.55) {
  const pool = Array.from({ length: size }, () => {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = volume;
    return audio;
  });
  let idx = 0;

  return {
    play() {
      if (!pool.length) return;
      const audio = pool[idx];
      idx = (idx + 1) % pool.length;
      try {
        audio.currentTime = 0;
        audio.play?.().catch(() => {});
      } catch (err) {
        console.warn("[sfx] play failed", err);
      }
    },
  };
}
