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
const readyOverlay = document.getElementById("ready-overlay");
const readyModeLabel = document.getElementById("ready-mode-label");
const btnReadyStart = document.getElementById("btn-ready-start");
const btnReadyBack = document.getElementById("btn-ready-back");
let pendingMode = null;

// Auth UI elements
const authCard = document.getElementById('auth-card');
const authUsername = document.getElementById('auth-username');
const authPassword = document.getElementById('auth-password');
const btnAuthRegister = document.getElementById('btn-auth-register');
const btnAuthLogin = document.getElementById('btn-auth-login');
const btnAuthLogout = document.getElementById('btn-auth-logout');
const authStatus = document.getElementById('auth-status');
const leaderboardEl = document.getElementById('leaderboard');
const btnShowMyScores = document.getElementById('btn-show-my-scores');
const btnRefreshLeaderboard = document.getElementById('btn-refresh-leaderboard');
const myScoresEl = document.getElementById('my-scores');
function setFullscreenClass(active) {
  document.body.classList.toggle("fs-game", !!active);
}

function showMenu() {
  if (menuOverlay) menuOverlay.style.display = "flex";
}

function updatePortraitFlag() {
  const isPortrait = window.matchMedia("(orientation: portrait)").matches;
  document.body.classList.toggle("fs-portrait", !!document.fullscreenElement && isPortrait);
}

function hideMenu() {
  if (menuOverlay) menuOverlay.style.display = "none";
}

function wireMenu() {
  console.log('[wireMenu] elements found', { btnStartEndless: !!btnStartEndless, btnStartRogue: !!btnStartRogue, btnStartRogueEasy: !!btnStartRogueEasy, btnStartRogueHard: !!btnStartRogueHard });
  if (btnStartEndless) btnStartEndless.addEventListener("click", () => { console.log('[wireMenu] select endless clicked'); showReady("endless", {}, "无尽模式"); });
  if (btnStartRogue) btnStartRogue.addEventListener("click", () => { console.log('[wireMenu] select rogue clicked'); showReady("rogue", {}, "试炼模式 · 标准"); });
  if (btnStartRogueEasy) btnStartRogueEasy.addEventListener("click", () => { console.log('[wireMenu] select rogue easy clicked'); showReady("rogue", { difficulty: "easy" }, "试炼模式 · 简单"); });
  if (btnStartRogueHard) btnStartRogueHard.addEventListener("click", () => { console.log('[wireMenu] select rogue hard clicked'); showReady("rogue", { difficulty: "hard" }, "试炼模式 · 艰难"); });
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
  initGame(canvas);
  wireMenu();
  wireAuth();
  wireInput();
  showMenu();
  if (readyOverlay) readyOverlay.style.display = "none";
  startLoop();
}

function showReady(mode, options = {}, label = "") {
  pendingMode = { mode, options };
  hideMenu();
  if (readyModeLabel) readyModeLabel.textContent = label || mode;
  if (readyOverlay) readyOverlay.style.display = "flex";
}

function hideReady() {
  if (readyOverlay) readyOverlay.style.display = "none";
}

function startPendingMode() {
  if (!pendingMode) return;
  startMode(pendingMode.mode, pendingMode.options);
  pendingMode = null;
  hideReady();
  hideMenu();
}

// ---------- Auth + leaderboard logic ----------
function getStoredToken() {
  return localStorage.getItem('nhw_token');
}

function getStoredUsername() {
  return localStorage.getItem('nhw_username');
}

function setStoredAuth(token, username) {
  localStorage.setItem('nhw_token', token);
  if (username) localStorage.setItem('nhw_username', username);
}

function clearStoredAuth() {
  localStorage.removeItem('nhw_token');
  localStorage.removeItem('nhw_username');
}

function updateAuthUI() {
  const token = getStoredToken();
  const username = getStoredUsername();
  if (token && username) {
    authStatus.textContent = `已登录：${username}`;
    btnAuthRegister.style.display = 'none';
    btnAuthLogin.style.display = 'none';
    btnAuthLogout.style.display = '';
  } else {
    authStatus.textContent = '匿名模式运行游戏（或登录以保存分数）。';
    btnAuthRegister.style.display = '';
    btnAuthLogin.style.display = '';
    btnAuthLogout.style.display = 'none';
  }
}

async function registerUser(username, password) {
  // Basic client-side validation
  if (!username || username.length < 3 || username.length > 30) throw new Error('用户名必须为 3-30 个字符（字母/数字）');
  if (!/^[a-zA-Z0-9]+$/.test(username)) throw new Error('用户名只能包含字母和数字');
  if (!password || password.length < 6) throw new Error('密码长度至少为 6 字符');
  const resp = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
  if (!resp.ok) {
    let err = '注册失败';
    try { const data = await resp.json(); err = data.error || err; } catch (e) {}
    throw new Error(err);
  }
  return resp.json();
}

async function loginUser(username, password) {
  if (!username || !password) throw new Error('请输入用户名和密码');
  const resp = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
  if (!resp.ok) {
    let err = '登录失败';
    try { const data = await resp.json(); err = data.error || err; } catch (e) {}
    throw new Error(err);
  }
  const { token } = await resp.json();
  setStoredAuth(token, username);
  updateAuthUI();
  return token;
}

async function logoutUser() {
  clearStoredAuth();
  updateAuthUI();
}

async function submitScoreToServer(score, mode, metadata = {}) {
  try {
    const token = getStoredToken();
    const body = { score, mode, metadata };
    // If not logged in, include a playerName if set in UI
    if (!token) {
      const username = getStoredUsername() || null;
      if (username) body.playerName = username;
    }
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const resp = await fetch('/api/scores', { method: 'POST', headers, body: JSON.stringify(body) });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit score');
    }
    // refresh leaderboard
    fetchLeaderboard();
    return resp.json();
  } catch (err) {
    console.error('submitScoreToServer', err);
    return null;
  }
}

async function fetchLeaderboard() {
  try {
    const resp = await fetch('/api/scores?limit=10');
    if (!resp.ok) throw new Error('Failed to fetch leaderboard');
    const { scores } = await resp.json();
    renderLeaderboard(scores);
  } catch (err) {
    console.error(err);
    leaderboardEl.textContent = '排行榜加载失败';
  }
}

function renderLeaderboard(scores) {
  if (!scores?.length) {
    leaderboardEl.textContent = '没有榜单';
    return;
  }
  const rows = scores.map(s => `#${s.id.slice(0,6)} ${s.playerName ?? '匿名'} — ${s.score}`);
  leaderboardEl.innerHTML = '<ul style="padding-left: 1rem; margin: 0; color: #c8d0ff">' + rows.map(r => `<li style="margin-bottom: 0.15rem">${r}</li>`).join('') + '</ul>';
}

function wireAuth() {
  if (!btnAuthLogin || !btnAuthRegister || !btnAuthLogout || !authStatus) return;
  // Wire auth buttons
  btnAuthLogin.addEventListener('click', async () => {
    try {
      const username = authUsername.value.trim();
      const password = authPassword.value;
      if (!username || !password) return alert('请输入用户名和密码');
      await loginUser(username, password);
      alert('登录成功');
    } catch (err) {
      alert(err.message);
    }
  });
  btnAuthRegister.addEventListener('click', async () => {
    try {
      const username = authUsername.value.trim();
      const password = authPassword.value;
      if (!username || !password) return alert('请输入用户名和密码');
      await registerUser(username, password);
      // auto-login
      await loginUser(username, password);
      alert('注册并登录成功');
    } catch (err) {
      alert(err.message);
    }
  });
  btnAuthLogout.addEventListener('click', async () => {
    logoutUser();
  });

  // Listen for game-over event to auto-submit
  window.addEventListener('nhw:game-over', async (e) => {
    const { score, mode, createdAt } = e.detail || {};
    try {
      await submitScoreToServer(score, mode, { createdAt });
      // We could display a small notification, but keep minimal for now
      console.log('Score submitted', score);
    } catch (err) {
      console.error(err);
    }
  });

  // init UI
  updateAuthUI();
  fetchLeaderboard();
  if (btnRefreshLeaderboard) btnRefreshLeaderboard.addEventListener('click', fetchLeaderboard);
  if (btnShowMyScores) btnShowMyScores.addEventListener('click', async () => {
    const token = getStoredToken();
    if (!token) return alert('请先登录');
    try {
      const resp = await fetch('/api/me/scores', { headers: { 'Authorization': 'Bearer ' + token } });
      if (!resp.ok) throw new Error('获取失败');
      const { scores } = await resp.json();
      myScoresEl.innerHTML = '<ul style="padding-left: 1rem; margin: 0; color: #c8d0ff">' + scores.map(s => `<li>#${s.score} ${s.mode} ${new Date(s.createdAt).toLocaleString()}</li>`).join('') + '</ul>';
    } catch (err) {
      myScoresEl.textContent = '获取我的分数失败';
    }
  });
}

bootstrap();

if (btnReadyStart) btnReadyStart.addEventListener('click', startPendingMode);
if (btnReadyBack) btnReadyBack.addEventListener('click', () => { hideReady(); showMenu(); });
