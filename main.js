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
} from "./game.js";

const canvas = document.getElementById("game");
const menuOverlay = document.getElementById("menu-overlay");
const btnStartEndless = document.getElementById("btn-start-endless");
const btnStartRogue = document.getElementById("btn-start-rogue");
const btnStartRogueEasy = document.getElementById("btn-start-rogue-easy");
const btnStartRogueHard = document.getElementById("btn-start-rogue-hard");

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
}

function bootstrap() {
  initGame(canvas);
  wireMenu();
  wireInput();
  startLoop();
}

bootstrap();
