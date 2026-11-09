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
const officeShopBtn = document.getElementById('office-shop-btn');
const officeHelpBtn = document.getElementById('office-help-btn');
const floatingNotification = document.getElementById('floating-notification');

// Employee Inspector Sheet elements
const employeeSheet = document.getElementById('employee-sheet');
const sheetAvatar = document.getElementById('sheet-avatar');
const sheetName = document.getElementById('sheet-name');
const sheetRole = document.getElementById('sheet-role');
const sheetStressVal = document.getElementById('sheet-stress-val');
const sheetStressBar = document.getElementById('sheet-stress-bar');
const sheetStatusVal = document.getElementById('sheet-status-val');
const btnCloseSheet = document.getElementById('btn-close-sheet');
const sheetBtnCoffee = document.getElementById('sheet-btn-coffee');
const sheetBtnPeptalk = document.getElementById('sheet-btn-peptalk');
const sheetBtnBreak = document.getElementById('sheet-btn-break');

// Office Shop Modal elements
const shopModal = document.getElementById('shop-modal');
const shopModalCash = document.getElementById('shop-modal-cash');
const btnCloseShop = document.getElementById('btn-close-shop');

// Tutorial Modal elements
const tutorialModal = document.getElementById('tutorial-modal');
const btnCloseTutorial = document.getElementById('btn-close-tutorial');
const btnStartWorking = document.getElementById('btn-start-working');

let latestOfficeStats = null;
let sheetActiveEmployeeId = 'tim';
let isSheetOpen = false;

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
        latestOfficeStats = stats;
        if (stats.timeFormatted) officeClock.textContent = stats.timeFormatted;
        if (stats.cash !== undefined) officeCash.textContent = `$${stats.cash.toLocaleString()}`;
        if (stats.coffeeCupsReady !== undefined) coffeeCount.textContent = stats.coffeeCupsReady;
        if (stats.completedBatchesCount !== undefined) dispatchCount.textContent = stats.completedBatchesCount;

        if (stats.selectedEmployeeId) {
          sheetActiveEmployeeId = stats.selectedEmployeeId;
          isSheetOpen = true;
        }

        updateEmployeeSheetUI();
        updateShopModalUI();

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

function updateEmployeeSheetUI() {
  if (!employeeSheet) return;
  if (!isSheetOpen || !latestOfficeStats || !latestOfficeStats.employees) {
    employeeSheet.style.display = 'none';
    return;
  }

  const emp = latestOfficeStats.employees.find((e) => e.id === sheetActiveEmployeeId);
  if (!emp) {
    employeeSheet.style.display = 'none';
    return;
  }

  employeeSheet.style.display = 'block';
  sheetAvatar.textContent = emp.icon || '💼';
  sheetAvatar.style.borderColor = emp.colorHex || 'var(--accent-cyan)';
  sheetName.textContent = emp.name;
  sheetRole.textContent = `${emp.role} (${emp.specialty})`;

  // Stress bar & text
  const stress = emp.stress;
  let stressColor = '#10b981';
  let stressMood = 'Tenang 😊';
  if (stress >= 80) {
    stressColor = '#ef4444';
    stressMood = 'Hampir Burnout! 😰';
  } else if (stress >= 40) {
    stressColor = '#f59e0b';
    stressMood = 'Mulai Lelah 😐';
  }

  sheetStressVal.textContent = `${stress}% (${stressMood})`;
  sheetStressVal.style.color = stressColor;
  sheetStressBar.style.width = `${Math.min(100, stress)}%`;
  sheetStressBar.style.background = stressColor;

  // Status text
  let statusDesc = 'Santai / Menunggu Tugas';
  if (emp.state === 'panic') {
    statusDesc = '💥 BURNOUT! Butuh Istirahat Sofa / Donat!';
  } else if (emp.state === 'break') {
    statusDesc = `🛋️ Istirahat di Sofa (${emp.breakRemaining}s)`;
  } else if (emp.state === 'working') {
    statusDesc = emp.activeProject ? `💻 Mengerjakan "${emp.activeProject.title}"` : '💻 Bekerja';
  }
  if (emp.isCaffeinated) {
    statusDesc += ` • ⚡ Caffeine Rush (${emp.caffeineRemaining}s)`;
  }
  sheetStatusVal.textContent = statusDesc;
}

function updateShopModalUI() {
  if (!shopModal || !latestOfficeStats) return;
  if (shopModalCash) {
    shopModalCash.textContent = `$${latestOfficeStats.cash.toLocaleString()}`;
  }

  const upgrades = latestOfficeStats.upgrades || {};
  const currentCash = latestOfficeStats.cash || 0;

  const buyButtons = shopModal.querySelectorAll('.shop-buy-btn');
  buyButtons.forEach((btn) => {
    const key = btn.dataset.key;
    if (key === 'donutParty') {
      btn.disabled = currentCash < 250;
      btn.textContent = currentCash >= 250 ? 'Beli $250 🍩' : 'Butuh $250';
    } else {
      if (upgrades[key]) {
        btn.disabled = true;
        btn.textContent = 'TERPASANG ✅';
        btn.style.background = '#475569';
      } else {
        const cost = key === 'turboEspresso' ? 400 : (key === 'ergonomicChairs' ? 500 : (key === 'dualMonitors' ? 600 : 350));
        btn.disabled = currentCash < cost;
        btn.textContent = currentCash >= cost ? `Beli $${cost}` : `Butuh $${cost}`;
        btn.style.background = currentCash >= cost ? 'linear-gradient(135deg, #10b981, #059669)' : '#475569';
      }
    }
  });
}

function renderProjectsTray(queue) {
  if (!projectsTray) return;
  projectsTray.innerHTML = '';

  queue.forEach((proj) => {
    const card = document.createElement('div');
    card.className = 'project-card-mini';

    const progressPct = Math.round(proj.progress);
    const isAssigned = !!proj.assignedTo;

    // Find suggested specialist
    let targetName = 'Staff';
    let targetIcon = '💼';
    if (currentGameInstance && currentGameInstance.employees) {
      const spec = currentGameInstance.employees.find((e) => e.skill === proj.skill);
      if (spec) {
        targetName = spec.name;
        targetIcon = spec.icon;
      }
    }

    card.innerHTML = `
      <div class="proj-title" title="${proj.title}">${proj.title}</div>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="proj-skill" style="color:var(--accent-cyan);">${proj.skill.toUpperCase()}</span>
        <span style="font-size:0.75rem; color:#10b981; font-weight:800;">+$${proj.reward}</span>
      </div>
      <div class="proj-bar-bg" title="Work Progress">
        <div class="proj-bar-fill" style="width: ${progressPct}%; background: ${isAssigned ? '#10b981' : '#f59e0b'};"></div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
        <span style="font-size:0.68rem; color:#94a3b8;">${isAssigned ? 'Sedang Dikerjakan...' : `⏳ ${Math.ceil(proj.remainingTime)}s`}</span>
        ${!isAssigned ? `<button class="proj-assign-btn" data-proj-id="${proj.id}">👉 ${targetName} ${targetIcon}</button>` : ''}
      </div>
    `;

    const assignBtn = card.querySelector('.proj-assign-btn');
    if (assignBtn) {
      assignBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentGameInstance && currentGameInstance.employees) {
          // Try to assign to the specialist first
          const spec = currentGameInstance.employees.find((emp) => emp.skill === proj.skill && emp.state === 'idle');
          if (spec) {
            currentGameInstance.assignProject(proj, spec);
          } else {
            // Find any idle staff member
            const anyIdle = currentGameInstance.employees.find((emp) => emp.state === 'idle');
            if (anyIdle) {
              currentGameInstance.assignProject(proj, anyIdle);
            } else {
              sounds.playHit();
              if (floatingNotification) {
                floatingNotification.textContent = `Semua staf sibuk! Berikan kopi ☕ atau pep talk 💖!`;
                floatingNotification.style.borderColor = '#ef4444';
                floatingNotification.style.display = 'block';
                setTimeout(() => { if (floatingNotification) floatingNotification.style.display = 'none'; }, 2200);
              }
            }
          }
        }
      });
    }

    projectsTray.appendChild(card);
  });
}

// Wire Up Office HUD & Sheet Buttons
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

if (officeShopBtn) {
  officeShopBtn.addEventListener('click', () => {
    sounds.playClick();
    updateShopModalUI();
    if (shopModal) shopModal.style.display = 'flex';
  });
}

if (officeHelpBtn) {
  officeHelpBtn.addEventListener('click', () => {
    sounds.playClick();
    if (tutorialModal) tutorialModal.style.display = 'flex';
  });
}

if (btnCloseShop) {
  btnCloseShop.addEventListener('click', () => {
    sounds.playClick();
    if (shopModal) shopModal.style.display = 'none';
  });
}

if (btnCloseTutorial) {
  btnCloseTutorial.addEventListener('click', () => {
    sounds.playClick();
    if (tutorialModal) tutorialModal.style.display = 'none';
  });
}

if (btnStartWorking) {
  btnStartWorking.addEventListener('click', () => {
    sounds.playClick();
    if (tutorialModal) tutorialModal.style.display = 'none';
  });
}

if (btnCloseSheet) {
  btnCloseSheet.addEventListener('click', () => {
    sounds.playClick();
    isSheetOpen = false;
    if (employeeSheet) employeeSheet.style.display = 'none';
  });
}

if (sheetBtnCoffee) {
  sheetBtnCoffee.addEventListener('click', () => {
    if (currentGameInstance && currentGameInstance.giveCoffee) {
      currentGameInstance.giveCoffee(sheetActiveEmployeeId);
    }
  });
}

if (sheetBtnPeptalk) {
  sheetBtnPeptalk.addEventListener('click', () => {
    if (currentGameInstance && currentGameInstance.givePepTalk) {
      currentGameInstance.givePepTalk(sheetActiveEmployeeId);
    }
  });
}

if (sheetBtnBreak) {
  sheetBtnBreak.addEventListener('click', () => {
    if (currentGameInstance && currentGameInstance.sendToBreak) {
      currentGameInstance.sendToBreak(sheetActiveEmployeeId);
    }
  });
}

// Shop item buy triggers
if (shopModal) {
  const shopBuyButtons = shopModal.querySelectorAll('.shop-buy-btn');
  shopBuyButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      if (currentGameInstance && currentGameInstance.buyUpgrade) {
        const success = currentGameInstance.buyUpgrade(key);
        if (success) {
          updateShopModalUI();
        }
      }
    });
  });
}

function exitToHub() {
  if (currentGameInstance) {
    currentGameInstance.destroy();
    currentGameInstance = null;
  }
  activeGameMeta = null;
  isSheetOpen = false;
  if (officeHud) officeHud.style.display = 'none';
  if (employeeSheet) employeeSheet.style.display = 'none';
  if (shopModal) shopModal.style.display = 'none';
  if (tutorialModal) tutorialModal.style.display = 'none';
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
