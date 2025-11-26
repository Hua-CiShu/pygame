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
} from "./game.js";

const canvas = document.getElementById("game");
const menuOverlay = document.getElementById("menu-overlay");
const btnStartEndless = document.getElementById("btn-start-endless");
const btnStartRogue = document.getElementById("btn-start-rogue");
const btnStartRogueEasy = document.getElementById("btn-start-rogue-easy");
const btnStartRogueHard = document.getElementById("btn-start-rogue-hard");
const btnTouchPause = document.getElementById("btn-touch-pause");
const btnTouchBlink = document.getElementById("btn-touch-blink");
const btnTouchFullscreen = document.getElementById("btn-touch-fullscreen");

function setFullscreenClass(active) {
  document.body.classList.toggle("fs-game", !!active);
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
  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("mouseup", handleMouseUp);
  canvas.addEventListener("mouseleave", handleMouseLeave);
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
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
      } else {
        const target = canvas || document.documentElement;
        const req =
          target.requestFullscreen ||
          target.webkitRequestFullscreen ||
          target.msRequestFullscreen ||
          target.mozRequestFullScreen;
        if (req) req.call(target).catch?.(() => setFullscreenClass(true));
        else setFullscreenClass(true);
      }
    };
    btnTouchFullscreen.addEventListener("click", requestFull);
    btnTouchFullscreen.addEventListener("touchstart", (e) => { e.preventDefault(); requestFull(); }, { passive: false });
  }

  document.addEventListener("fullscreenchange", () => setFullscreenClass(!!document.fullscreenElement));
}

function bootstrap() {
  initGame(canvas);
  wireMenu();
  wireInput();
  startLoop();
}

bootstrap();
