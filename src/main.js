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

// Mobile controls
const mobileControls = document.getElementById('mobile-controls');
const mBtnLeft = document.getElementById('m-btn-left');
const mBtnRight = document.getElementById('m-btn-right');
const mBtnAction = document.getElementById('m-btn-action');

// 1. Initialize Background 3D Effect
if (bgCanvas) {
  new BackgroundEffect(bgCanvas);
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

    card.innerHTML = `
      <div class="card-banner">
        <div class="card-banner-bg" style="background: linear-gradient(135deg, ${game.color}33, #080c1e);"></div>
        <div class="card-banner-overlay"></div>
        <div class="card-tag" style="color:${game.color}; border-color:${game.color}66;">${game.badge}</div>
        <div class="card-icon-badge" style="background: radial-gradient(circle at top, ${game.color}44, #12182b);">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="${game.color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </div>
      </div>
      <div class="card-body">
        <div class="card-category">${game.category}</div>
        <h3 class="card-title">${game.title}</h3>
        <p class="card-desc">${game.description}</p>
        <div class="card-footer">
          <div class="high-score-tag">
            <span class="high-score-label">BEST RECORD</span>
            <span class="high-score-val">${highScore}</span>
          </div>
          <button class="btn-play">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            PLAY NOW
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
  currentGameInstance = new GameClass({
    onScoreUpdate: (score) => {
      hudScoreText.textContent = score.toLocaleString();
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

  currentGameInstance.init(canvasContainer);
  currentGameInstance.start();

  // Custom mobile controls visibility/labeling
  setupMobileControls(gameId);
}

function exitToHub() {
  if (currentGameInstance) {
    currentGameInstance.destroy();
    currentGameInstance = null;
  }
  activeGameMeta = null;
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
