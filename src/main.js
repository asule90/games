import { gamesRegistry, getGameById } from './data/gamesRegistry.js';
import { BackgroundEffect } from './components/BackgroundEffect.js';
import { sounds } from './audio/SoundManager.js';
import confetti from 'canvas-confetti';

// State
let currentGameInstance = null;
let activeGameMeta = null;

// DOM Elements
const portalView = document.getElementById('portal-view');
const gameView = document.getElementById('game-view');
const gamesGrid = document.getElementById('games-grid');
const canvasContainer = document.getElementById('game-canvas-container');
const bgCanvas = document.getElementById('bg-canvas');

const navHomeBtn = document.getElementById('nav-home-btn');
const audioToggleBtn = document.getElementById('audio-toggle-btn');
const audioIconOn = document.getElementById('audio-icon-on');
const audioIconOff = document.getElementById('audio-icon-off');
const fullscreenBtn = document.getElementById('fullscreen-btn');

const btnBackHub = document.getElementById('btn-back-hub');
const currentGameTitle = document.getElementById('current-game-title');
const hudScoreText = document.getElementById('hud-score-text');
const btnPauseGame = document.getElementById('btn-pause-game');

const pauseModal = document.getElementById('pause-modal');
const btnResume = document.getElementById('btn-resume');
const btnRestartPaused = document.getElementById('btn-restart-paused');
const btnQuitPaused = document.getElementById('btn-quit-paused');

const gameoverModal = document.getElementById('gameover-modal');
const gameoverScore = document.getElementById('gameover-score');
const newRecordFlag = document.getElementById('new-record-flag');
const btnRestartGameover = document.getElementById('btn-restart-gameover');
const btnQuitGameover = document.getElementById('btn-quit-gameover');

// Office HUD elements
const officeHud = document.getElementById('office-hud');
const officeClock = document.getElementById('office-clock');
const officeCash = document.getElementById('office-cash');
const coffeeCount = document.getElementById('coffee-count');
const dispatchCount = document.getElementById('dispatch-count');
const projectsTray = document.getElementById('projects-tray');
const officeCoffeeBtn = document.getElementById('office-coffee-btn');
const officeDispatchBtn = document.getElementById('office-dispatch-btn');
const floatingNotification = document.getElementById('floating-notification');

// Mobile controls
const mobileControls = document.getElementById('mobile-controls');
const mBtnLeft = document.getElementById('m-btn-left');
const mBtnRight = document.getElementById('m-btn-right');
const mBtnAction = document.getElementById('m-btn-action');

// Safe Background 2D Canvas Initialization
try {
  if (bgCanvas) {
    new BackgroundEffect(bgCanvas);
  }
} catch (err) {
  console.warn('Background effect initialization skipped:', err);
}

// 2. Audio button update
function updateAudioIcons() {
  const isMuted = sounds.isMuted();
  if (isMuted) {
    audioIconOn.style.display = 'none';
    audioIconOff.style.display = 'block';
  } else {
    audioIconOn.style.display = 'block';
    audioIconOff.style.display = 'none';
  }
}
updateAudioIcons();

audioToggleBtn.addEventListener('click', () => {
  sounds.toggleMute();
  updateAudioIcons();
  if (!sounds.isMuted()) {
    sounds.playClick();
  }
});

// Fullscreen Toggle
fullscreenBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
});

// 3. Render Game Cards in Portal Grid
function renderGameGrid() {
  gamesGrid.innerHTML = '';

  gamesRegistry.forEach((game) => {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.dataset.gameId = game.id;

    const highScore = localStorage.getItem(`highscore_${game.id}`) || '0';

    let iconSvg = '';
    if (game.id === 'miss-management') {
      iconSvg = `<span style="font-size: 2.2rem;">💼</span>`;
    } else if (game.id === 'cyber-runner') {
      iconSvg = `<span style="font-size: 2.2rem;">🚀</span>`;
    } else if (game.id === 'tower-stacker') {
      iconSvg = `<span style="font-size: 2.2rem;">🧱</span>`;
    } else if (game.id === 'cosmic-marble') {
      iconSvg = `<span style="font-size: 2.2rem;">🔮</span>`;
    } else if (game.id === 'neon-pong') {
      iconSvg = `<span style="font-size: 2.2rem;">🏓</span>`;
    } else {
      iconSvg = `<span style="font-size: 2.2rem;">🎮</span>`;
    }

    card.style.setProperty('--card-accent', game.color);

    card.innerHTML = `
      <div class="card-banner">
        <div class="card-banner-bg" style="background: radial-gradient(circle at center, ${game.color}55, #12102b 75%);"></div>
        <div class="card-banner-overlay"></div>
        <div class="card-tag" style="color:#ffffff; background:${game.color}cc; border-color:${game.color};">${game.badge}</div>
        <div class="card-icon-badge" style="background: linear-gradient(135deg, ${game.color}44, #1f1b40);">
          ${iconSvg}
        </div>
      </div>
      <div class="card-body">
        <div class="card-category" style="color:${game.color};">${game.category}</div>
        <h3 class="card-title">${game.title}</h3>
        <p class="card-desc">${game.description}</p>
        <div class="card-footer">
          <div class="high-score-tag">
            <span class="high-score-label">BEST RECORD ⭐</span>
            <span class="high-score-val">${highScore}</span>
          </div>
          <button class="btn-play">
            <span>PLAY NOW</span>
            <span>🎮</span>
          </button>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      sounds.playClick();
      window.location.hash = `#/game/${game.id}`;
    });

    gamesGrid.appendChild(card);
  });
}

// 4. Game Lifecycle & Screen Switching
function launchGame(gameId) {
  const gameMeta = getGameById(gameId);
  if (!gameMeta) {
    exitToHub();
    return;
  }

  // Teardown previous game if active
  if (currentGameInstance) {
    currentGameInstance.destroy();
    currentGameInstance = null;
  }

  activeGameMeta = gameMeta;
  currentGameTitle.textContent = gameMeta.title;
  hudScoreText.textContent = '0';

  // Toggle views
  portalView.style.display = 'none';
  gameView.style.display = 'flex';
  pauseModal.style.display = 'none';
  gameoverModal.style.display = 'none';
  canvasContainer.innerHTML = '';

  // Instantiate Game
  const GameClass = gameMeta.GameClass;

  if (gameId === 'miss-management') {
    officeHud.style.display = 'flex';
  } else {
    officeHud.style.display = 'none';
  }

  currentGameInstance = new GameClass({
    onScoreUpdate: (score) => {
      hudScoreText.textContent = score.toLocaleString();
    },
    onStatsUpdate: (stats) => {
      if (gameId === 'miss-management' && stats) {
        if (stats.timeFormatted) officeClock.textContent = stats.timeFormatted;
        if (stats.cash !== undefined) officeCash.textContent = `$${stats.cash.toLocaleString()}`;
        if (stats.coffeeCupsReady !== undefined) coffeeCount.textContent = stats.coffeeCupsReady;
        if (stats.completedBatchesCount !== undefined) dispatchCount.textContent = stats.completedBatchesCount;

        // Render projects tray
        if (stats.queue) {
          renderProjectsTray(stats.queue);
        }
      }
    },
    onFloatingMessage: (msg) => {
      if (floatingNotification) {
        floatingNotification.textContent = msg.text;
        floatingNotification.style.borderColor = msg.color || 'var(--accent-cyan)';
        floatingNotification.style.display = 'block';
        setTimeout(() => {
          if (floatingNotification) floatingNotification.style.display = 'none';
        }, 2200);
      }
    },
    onGameOver: (score, isNewHighScore) => {
      gameoverScore.textContent = score.toLocaleString();
      newRecordFlag.style.display = isNewHighScore ? 'inline-block' : 'none';
      gameoverModal.style.display = 'flex';
      if (isNewHighScore) {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      }
    }
  });

  const ok = currentGameInstance.init(canvasContainer);
  if (ok && currentGameInstance.isInitialized) {
    currentGameInstance.start();
  } else {
    if (officeHud) officeHud.style.display = 'none';
  }

  // Custom mobile controls visibility/labeling
  setupMobileControls(gameId);
}

function renderProjectsTray(queue) {
  if (!projectsTray) return;
  projectsTray.innerHTML = '';

  queue.forEach((proj) => {
    const card = document.createElement('div');
    card.className = 'project-card-mini';

    const progressPct = Math.round(proj.progress);
    const deadlinePct = Math.max(0, Math.round((proj.remainingTime / proj.totalTime) * 100));
    const isAssigned = !!proj.assignedTo;

    card.innerHTML = `
      <div class="proj-title" title="${proj.title}">${proj.title}</div>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="proj-skill" style="color:var(--accent-cyan);">${proj.skill}</span>
        <span style="font-size:0.7rem; color:#10b981; font-weight:700;">+$${proj.reward}</span>
      </div>
      <div class="proj-bar-bg" title="Work Progress">
        <div class="proj-bar-fill" style="width: ${progressPct}%; background: ${isAssigned ? '#10b981' : '#f59e0b'};"></div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
        <span style="font-size:0.65rem; color:#94a3b8;">${isAssigned ? 'Working...' : `⏳ ${Math.ceil(proj.remainingTime)}s`}</span>
        ${!isAssigned ? `<button class="proj-assign-btn" data-proj-id="${proj.id}">Assign</button>` : ''}
      </div>
    `;

    const assignBtn = card.querySelector('.proj-assign-btn');
    if (assignBtn) {
      assignBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentGameInstance && currentGameInstance.employees) {
          const matchingEmp = currentGameInstance.employees.find((emp) => emp.skill === proj.skill && emp.state === 'idle');
          if (matchingEmp) {
            currentGameInstance.assignProject(proj, matchingEmp);
          } else {
            // Find any idle employee or show notification
            const anyIdle = currentGameInstance.employees.find((emp) => emp.state === 'idle');
            if (anyIdle) {
              currentGameInstance.assignProject(proj, anyIdle);
            } else {
              sounds.playHit();
              if (floatingNotification) {
                floatingNotification.textContent = 'All staff busy! Cheer them up or serve coffee!';
                floatingNotification.style.borderColor = '#ef4444';
                floatingNotification.style.display = 'block';
                setTimeout(() => { if (floatingNotification) floatingNotification.style.display = 'none'; }, 2000);
              }
            }
          }
        }
      });
    }

    projectsTray.appendChild(card);
  });
}

if (officeCoffeeBtn) {
  officeCoffeeBtn.addEventListener('click', () => {
    if (currentGameInstance && currentGameInstance.interactCoffeeStation) {
      currentGameInstance.interactCoffeeStation();
    }
  });
}

if (officeDispatchBtn) {
  officeDispatchBtn.addEventListener('click', () => {
    if (currentGameInstance && currentGameInstance.interactDispatchStation) {
      currentGameInstance.interactDispatchStation();
    }
  });
}

function exitToHub() {
  if (currentGameInstance) {
    currentGameInstance.destroy();
    currentGameInstance = null;
  }
  activeGameMeta = null;
  if (officeHud) officeHud.style.display = 'none';
  pauseModal.style.display = 'none';
  gameoverModal.style.display = 'none';
  gameView.style.display = 'none';
  portalView.style.display = 'block';

  window.location.hash = '#/';
  renderGameGrid(); // refresh high scores
}

// Mobile buttons wiring
function setupMobileControls(gameId) {
  if (gameId === 'tower-stacker') {
    mBtnLeft.style.display = 'none';
    mBtnRight.style.display = 'none';
    mBtnAction.textContent = 'TAP';
  } else if (gameId === 'cyber-runner') {
    mBtnLeft.style.display = 'flex';
    mBtnRight.style.display = 'flex';
    mBtnAction.textContent = '▲';
  } else {
    mBtnLeft.style.display = 'flex';
    mBtnRight.style.display = 'flex';
    mBtnAction.textContent = '●';
  }
}

mBtnLeft.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
});
mBtnLeft.addEventListener('pointerup', (e) => {
  e.preventDefault();
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft' }));
});

mBtnRight.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
});
mBtnRight.addEventListener('pointerup', (e) => {
  e.preventDefault();
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight' }));
});

mBtnAction.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
});
mBtnAction.addEventListener('pointerup', (e) => {
  e.preventDefault();
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
});

// UI Event Listeners
navHomeBtn.addEventListener('click', () => {
  sounds.playClick();
  exitToHub();
});

btnBackHub.addEventListener('click', () => {
  sounds.playClick();
  exitToHub();
});

btnPauseGame.addEventListener('click', () => {
  if (!currentGameInstance || currentGameInstance.isGameOver) return;
  sounds.playClick();
  currentGameInstance.pause();
  pauseModal.style.display = 'flex';
});

btnResume.addEventListener('click', () => {
  if (!currentGameInstance) return;
  sounds.playClick();
  pauseModal.style.display = 'none';
  currentGameInstance.resume();
});

btnRestartPaused.addEventListener('click', () => {
  if (!currentGameInstance) return;
  sounds.playClick();
  pauseModal.style.display = 'none';
  currentGameInstance.restart();
});

btnQuitPaused.addEventListener('click', () => {
  sounds.playClick();
  exitToHub();
});

btnRestartGameover.addEventListener('click', () => {
  if (!currentGameInstance) return;
  sounds.playClick();
  gameoverModal.style.display = 'none';
  currentGameInstance.restart();
});

btnQuitGameover.addEventListener('click', () => {
  sounds.playClick();
  exitToHub();
});

// Keyboard shortcuts (Pause P / Esc, Mute M, Fullscreen F)
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (currentGameInstance && !currentGameInstance.isGameOver) {
      if (currentGameInstance.isPaused) {
        pauseModal.style.display = 'none';
        currentGameInstance.resume();
      } else {
        currentGameInstance.pause();
        pauseModal.style.display = 'flex';
      }
    }
  } else if (e.code === 'KeyM') {
    sounds.toggleMute();
    updateAudioIcons();
  }
});

// Hash routing
function handleRoute() {
  const hash = window.location.hash || '#/';
  const match = hash.match(/^#\/game\/([a-zA-Z0-9_-]+)$/);

  if (match) {
    const gameId = match[1];
    launchGame(gameId);
  } else {
    exitToHub();
  }
}

window.addEventListener('hashchange', handleRoute);

// Init on boot
renderGameGrid();
handleRoute();
