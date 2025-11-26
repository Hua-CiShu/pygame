import {
  initGame,
  startMode,
  togglePause,
  handleKeyDown,
  handleKeyUp,
  handleMouseDown,
  handleMouseUp,
  handleMouseLeave,
  handleMouseMove,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  startLoop,
  triggerBlink,
  restartGame,
} from "./game.js";
import { initAudio, unlockAudio, loadSound } from "./core/sound.js";

const canvas = document.getElementById("game");
const gameFrame = document.getElementById("game-frame");
const menuOverlay = document.getElementById("menu-overlay");
const btnStartEndless = document.getElementById("btn-start-endless");
const btnStartRogue = document.getElementById("btn-start-rogue");
const btnStartRogueEasy = document.getElementById("btn-start-rogue-easy");
const btnStartRogueHard = document.getElementById("btn-start-rogue-hard");
const btnTouchPause = document.getElementById("btn-touch-pause");
const btnTouchBlink = document.getElementById("btn-touch-blink");
const btnTouchFullscreen = document.getElementById("btn-touch-fullscreen");
const btnTouchRestart = document.getElementById("btn-touch-restart");

function setFullscreenClass(active) {
  document.body.classList.toggle("fs-game", !!active);
}

function updatePortraitFlag() {
  const isPortrait = window.matchMedia("(orientation: portrait)").matches;
  document.body.classList.toggle("fs-portrait", !!document.fullscreenElement && isPortrait);
}

function hideMenu() {
  if (menuOverlay) menuOverlay.style.display = "none";
}

function wireMenu() {
  if (btnStartEndless) btnStartEndless.addEventListener("click", () => { startMode("endless"); hideMenu(); });
  if (btnStartRogue) btnStartRogue.addEventListener("click", () => { startMode("rogue"); hideMenu(); });
  if (btnStartRogueEasy) btnStartRogueEasy.addEventListener("click", () => { startMode("rogue", { difficulty: "easy" }); hideMenu(); });
  if (btnStartRogueHard) btnStartRogueHard.addEventListener("click", () => { startMode("rogue", { difficulty: "hard" }); hideMenu(); });
}

function wireInput() {
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  canvas.addEventListener("mousedown", (e) => { unlockAudio(); handleMouseDown(e); });
  canvas.addEventListener("mouseup", handleMouseUp);
  canvas.addEventListener("mouseleave", handleMouseLeave);
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("touchstart", (e) => { unlockAudio(); handleTouchStart(e); }, { passive: false });
  canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
  canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
  canvas.addEventListener("touchcancel", handleTouchEnd, { passive: false });
  if (btnTouchPause) {
    btnTouchPause.addEventListener("click", () => togglePause());
    btnTouchPause.addEventListener("touchstart", (e) => { e.preventDefault(); togglePause(); }, { passive: false });
  }
  if (btnTouchBlink) {
    btnTouchBlink.addEventListener("click", () => triggerBlink());
    btnTouchBlink.addEventListener("touchstart", (e) => { e.preventDefault(); triggerBlink(); }, { passive: false });
  }
  if (btnTouchFullscreen) {
    const requestFull = () => {
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
        setFullscreenClass(false);
        updatePortraitFlag();
      } else {
        const target = gameFrame || canvas || document.documentElement;
        const req =
          target.requestFullscreen ||
          target.webkitRequestFullscreen ||
          target.msRequestFullscreen ||
          target.mozRequestFullScreen;
        if (req) req.call(target).then?.(() => {
          screen.orientation?.lock?.("landscape").catch(() => {});
        }).catch?.(() => setFullscreenClass(true));
        else setFullscreenClass(true);
        updatePortraitFlag();
      }
    };
    btnTouchFullscreen.addEventListener("click", requestFull);
    btnTouchFullscreen.addEventListener("touchstart", (e) => { e.preventDefault(); requestFull(); }, { passive: false });
  }

  document.addEventListener("fullscreenchange", () => {
    setFullscreenClass(!!document.fullscreenElement);
    updatePortraitFlag();
  });
  window.addEventListener("resize", updatePortraitFlag);
  window.addEventListener("orientationchange", updatePortraitFlag);

  if (btnTouchRestart) {
    btnTouchRestart.addEventListener("click", () => restartGame());
    btnTouchRestart.addEventListener("touchstart", (e) => { e.preventDefault(); restartGame(); }, { passive: false });
  }
}

function bootstrap() {
  initAudio();
  loadSound("shoot", "./assets/sfx/shoot1.wav");
  initGame(canvas);
  wireMenu();
  wireInput();
  startLoop();
}

bootstrap();
