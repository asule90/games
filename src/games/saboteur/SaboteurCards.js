// Saboteur Card Definitions and Texture Generator

export const CARD_TYPES = {
  PATH: 'path',
  ACTION: 'action',
  ROLE: 'role',
  GOAL: 'goal'
};

export const ROLES = {
  MINER: 'miner',
  SABOTEUR: 'saboteur'
};

export const TOOLS = {
  PICKAXE: 'pickaxe',
  LANTERN: 'lantern',
  CART: 'cart'
};

// Path Card Definitions: [top, right, bottom, left], connected (can pass through center)
export const PATH_TEMPLATES = [
  // Open Connected Paths
  { id: 'cross_open', name: 'Persimpangan 4 Arah', edges: [true, true, true, true], connected: true, count: 5 },
  { id: 'straight_h', name: 'Jalur Lurus Horizontal', edges: [false, true, false, true], connected: true, count: 4 },
  { id: 'straight_v', name: 'Jalur Lurus Vertikal', edges: [true, false, true, false], connected: true, count: 3 },
  { id: 't_down', name: 'Simpang T Bawah', edges: [false, true, true, true], connected: true, count: 5 },
  { id: 't_up', name: 'Simpang T Atas', edges: [true, true, false, true], connected: true, count: 5 },
  { id: 'curve_br', name: 'Belokan Bawah-Kanan', edges: [false, true, true, false], connected: true, count: 4 },
  { id: 'curve_bl', name: 'Belokan Bawah-Kiri', edges: [false, false, true, true], connected: true, count: 5 },

  // Dead End Paths (Saboteur Traps / Obstacles)
  { id: 'cross_dead', name: 'Batu Buntu 4 Sisi', edges: [true, true, true, true], connected: false, count: 1 },
  { id: 'straight_dead_h', name: 'Batu Buntu Lurus H', edges: [false, true, false, true], connected: false, count: 1 },
  { id: 'straight_dead_v', name: 'Batu Buntu Lurus V', edges: [true, false, true, false], connected: false, count: 1 },
  { id: 't_dead_down', name: 'Batu Buntu T Bawah', edges: [false, true, true, true], connected: false, count: 1 },
  { id: 't_dead_up', name: 'Batu Buntu T Atas', edges: [true, true, false, true], connected: false, count: 1 },
  { id: 'curve_dead_br', name: 'Batu Buntu Belok Kanan', edges: [false, true, true, false], connected: false, count: 1 },
  { id: 'curve_dead_bl', name: 'Batu Buntu Belok Kiri', edges: [false, false, true, true], connected: false, count: 1 },
  { id: 'dead_end_single_r', name: 'Jalan Buntu Ujung', edges: [false, true, false, false], connected: false, count: 1 }
];

export const ACTION_TEMPLATES = [
  { id: 'break_pickaxe', type: 'break', tool: TOOLS.PICKAXE, name: 'Cangkul Patah ⛏️❌', icon: '⛏️❌', count: 3 },
  { id: 'break_lantern', type: 'break', tool: TOOLS.LANTERN, name: 'Lentera Pecah 💡❌', icon: '💡❌', count: 3 },
  { id: 'break_cart', type: 'break', tool: TOOLS.CART, name: 'Kereta Rusak 🛒❌', icon: '🛒❌', count: 3 },

  { id: 'fix_pickaxe', type: 'fix', tools: [TOOLS.PICKAXE], name: 'Perbaiki Cangkul ⛏️✨', icon: '⛏️✨', count: 2 },
  { id: 'fix_lantern', type: 'fix', tools: [TOOLS.LANTERN], name: 'Perbaiki Lentera 💡✨', icon: '💡✨', count: 2 },
  { id: 'fix_cart', type: 'fix', tools: [TOOLS.CART], name: 'Perbaiki Kereta 🛒✨', icon: '🛒✨', count: 2 },

  { id: 'fix_dual_pick_lamp', type: 'fix', tools: [TOOLS.PICKAXE, TOOLS.LANTERN], name: 'Perbaiki Cangkul/Lentera', icon: '⛏️💡', count: 1 },
  { id: 'fix_dual_pick_cart', type: 'fix', tools: [TOOLS.PICKAXE, TOOLS.CART], name: 'Perbaiki Cangkul/Kereta', icon: '⛏️🛒', count: 1 },
  { id: 'fix_dual_lamp_cart', type: 'fix', tools: [TOOLS.LANTERN, TOOLS.CART], name: 'Perbaiki Lentera/Kereta', icon: '💡🛒', count: 1 },

  { id: 'rockfall', type: 'rockfall', name: 'Guguran Batu (Cave-In) 💥', icon: '💥', count: 3 },
  { id: 'map', type: 'map', name: 'Peta Rahasia Tambang 🗺️', icon: '🗺️', count: 6 }
];

// Player distribution table for 3-10 players
export const PLAYER_CONFIGS = {
  3: { miners: 3, saboteurs: 1, handSize: 6 },
  4: { miners: 4, saboteurs: 1, handSize: 6 },
  5: { miners: 4, saboteurs: 2, handSize: 6 },
  6: { miners: 5, saboteurs: 2, handSize: 5 },
  7: { miners: 5, saboteurs: 3, handSize: 5 },
  8: { miners: 6, saboteurs: 3, handSize: 4 },
  9: { miners: 7, saboteurs: 3, handSize: 4 },
  10: { miners: 7, saboteurs: 4, handSize: 4 }
};

// Rotate card edges by 180 degrees
export function rotateEdges(edges) {
  // [top, right, bottom, left] -> 180 deg -> [bottom, left, top, right]
  return [edges[2], edges[3], edges[0], edges[1]];
}

// Generate the initial Draw Deck
export function buildDrawDeck() {
  const deck = [];
  let uid = 1;

  // Add path cards
  PATH_TEMPLATES.forEach((tmpl) => {
    for (let i = 0; i < tmpl.count; i++) {
      deck.push({
        uid: `p_${uid++}`,
        type: CARD_TYPES.PATH,
        templateId: tmpl.id,
        name: tmpl.name,
        edges: [...tmpl.edges],
        originalEdges: [...tmpl.edges],
        connected: tmpl.connected,
        rotation: 0
      });
    }
  });

  // Add action cards
  ACTION_TEMPLATES.forEach((tmpl) => {
    for (let i = 0; i < tmpl.count; i++) {
      deck.push({
        uid: `a_${uid++}`,
        type: CARD_TYPES.ACTION,
        actionType: tmpl.type,
        tool: tmpl.tool || null,
        tools: tmpl.tools || (tmpl.tool ? [tmpl.tool] : []),
        name: tmpl.name,
        icon: tmpl.icon
      });
    }
  });

  // Fisher-Yates Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

// Setup Goal Cards: 1 Gold, 2 Coals (placed at columns x=8, y=-2, 0, 2)
export function setupGoalCards() {
  const goals = [
    { id: 'gold', isGold: true, name: 'Bongkahan Emas Murni! 🏆' },
    { id: 'coal_1', isGold: false, name: 'Batu Arang Hitam 🪨' },
    { id: 'coal_2', isGold: false, name: 'Batu Arang Hitam 🪨' }
  ];

  // Shuffle goals
  for (let i = goals.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [goals[i], goals[j]] = [goals[j], goals[i]];
  }

  const positions = [
    { x: 8, y: -2 },
    { x: 8, y: 0 },
    { x: 8, y: 2 }
  ];

  return positions.map((pos, idx) => ({
    uid: `goal_${idx}`,
    type: CARD_TYPES.GOAL,
    x: pos.x,
    y: pos.y,
    revealed: false,
    isGold: goals[idx].isGold,
    name: goals[idx].name,
    edges: goals[idx].isGold ? [true, true, true, true] : [true, false, false, true],
    connected: true
  }));
}

// Start ladder card at (0, 0)
export function getStartCard() {
  return {
    uid: 'start_ladder',
    type: CARD_TYPES.PATH,
    x: 0,
    y: 0,
    isStart: true,
    name: 'Tangga Masuk Tambang 🪜',
    edges: [true, true, true, true],
    connected: true,
    rotation: 0
  };
}

// Procedural Card Canvas Renderer for crisp 2D and 3D textures
export function renderCardCanvas(card, width = 256, height = 360) {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Background Stone Texture
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#2c2523');
  bgGrad.addColorStop(1, '#1a1615');
  ctx.fillStyle = bgGrad;
  ctx.roundRect ? ctx.roundRect(0, 0, width, height, 16) : ctx.rect(0, 0, width, height);
  ctx.fill();

  // Stone border
  ctx.strokeStyle = '#4a3f3b';
  ctx.lineWidth = 8;
  ctx.stroke();

  // Inner subtle border
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 12, width - 24, height - 24);

  if (!card) return canvas;

  if (card.type === CARD_TYPES.PATH || card.isStart || (card.type === CARD_TYPES.GOAL && card.revealed)) {
    renderPathCardArt(ctx, card, width, height);
  } else if (card.type === CARD_TYPES.GOAL && !card.revealed) {
    renderCardBackArt(ctx, width, height, '?', '#f59e0b');
  } else if (card.type === CARD_TYPES.ACTION) {
    renderActionCardArt(ctx, card, width, height);
  } else if (card.type === CARD_TYPES.ROLE) {
    renderRoleCardArt(ctx, card, width, height);
  }

  return canvas;
}

function renderPathCardArt(ctx, card, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  const tunnelW = width * 0.38;

  // Draw Dirt / Rock Ground
  ctx.fillStyle = '#3e342f';
  ctx.fillRect(16, 16, width - 32, height - 32);

  // Tunnel Floor Color
  ctx.fillStyle = '#6d5a43';

  const edges = card.edges || [false, false, false, false];

  // Draw center hub
  ctx.beginPath();
  ctx.arc(cx, cy, tunnelW / 2, 0, Math.PI * 2);
  ctx.fill();

  // Draw Tunnel Arms
  if (edges[0]) { // Top
    ctx.fillRect(cx - tunnelW / 2, 16, tunnelW, cy - 16);
  }
  if (edges[1]) { // Right
    ctx.fillRect(cx, cy - tunnelW / 2, width - 16 - cx, tunnelW);
  }
  if (edges[2]) { // Bottom
    ctx.fillRect(cx - tunnelW / 2, cy, tunnelW, height - 16 - cy);
  }
  if (edges[3]) { // Left
    ctx.fillRect(16, cy - tunnelW / 2, cx - 16, tunnelW);
  }

  // Draw Minecart Rails
  ctx.strokeStyle = '#8c7b64';
  ctx.lineWidth = 4;
  if (edges[1] && edges[3]) {
    // Horizontal Rail
    ctx.beginPath();
    ctx.moveTo(16, cy - 10);
    ctx.lineTo(width - 16, cy - 10);
    ctx.moveTo(16, cy + 10);
    ctx.lineTo(width - 16, cy + 10);
    ctx.stroke();

    // Sleepers (Ties)
    ctx.strokeStyle = '#4a3828';
    ctx.lineWidth = 3;
    for (let x = 28; x < width - 20; x += 22) {
      ctx.beginPath();
      ctx.moveTo(x, cy - 16);
      ctx.lineTo(x, cy + 16);
      ctx.stroke();
    }
  } else if (edges[0] && edges[2]) {
    // Vertical Rail
    ctx.beginPath();
    ctx.moveTo(cx - 10, 16);
    ctx.lineTo(cx - 10, height - 16);
    ctx.moveTo(cx + 10, 16);
    ctx.lineTo(cx + 10, height - 16);
    ctx.stroke();

    // Sleepers
    ctx.strokeStyle = '#4a3828';
    ctx.lineWidth = 3;
    for (let y = 28; y < height - 20; y += 22) {
      ctx.beginPath();
      ctx.moveTo(cx - 16, y);
      ctx.lineTo(cx + 16, y);
      ctx.stroke();
    }
  }

  // If Start Card, draw ladder
  if (card.isStart) {
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🪜', cx, cy - 8);
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('START', cx, cy + 28);
  }

  // If Revealed Goal
  if (card.isGoal) {
    if (card.isGold) {
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏆', cx, cy - 10);
      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = '#fef08a';
      ctx.fillText('EMAS!', cx, cy + 30);
    } else {
      ctx.fillStyle = '#9ca3af';
      ctx.font = 'bold 40px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🪨', cx, cy - 10);
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#d1d5db';
      ctx.fillText('BATU ARANG', cx, cy + 30);
    }
  }

  // If Dead End (Batu Penghalang di Tengah)
  if (!card.connected && !card.isStart) {
    ctx.fillStyle = '#1e1b18';
    ctx.beginPath();
    ctx.arc(cx, cy, tunnelW * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⛔', cx, cy);
  }
}

function renderActionCardArt(ctx, card, width, height) {
  const cx = width / 2;
  const cy = height / 2;

  // Header banner
  ctx.fillStyle = card.actionType === 'break' ? '#7f1d1d' : card.actionType === 'fix' ? '#14532d' : '#1e3a8a';
  ctx.fillRect(16, 16, width - 32, 44);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(card.actionType.toUpperCase(), cx, 38);

  // Big Icon Center
  ctx.font = '54px sans-serif';
  ctx.fillText(card.icon || '⚡', cx, cy - 10);

  // Title Text
  ctx.font = 'bold 17px sans-serif';
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(card.name, cx, cy + 50);

  // Description / Hint
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#d1d5db';
  if (card.actionType === 'break') {
    ctx.fillText('Kunci alat pemain lain!', cx, cy + 80);
  } else if (card.actionType === 'fix') {
    ctx.fillText('Perbaiki alat rusak', cx, cy + 80);
  } else if (card.actionType === 'rockfall') {
    ctx.fillText('Hancurkan 1 jalur di papan', cx, cy + 80);
  } else if (card.actionType === 'map') {
    ctx.fillText('Intip 1 kartu tujuan rahasia', cx, cy + 80);
  }
}

function renderRoleCardArt(ctx, card, width, height) {
  const cx = width / 2;
  const cy = height / 2;

  const isMiner = card.role === ROLES.MINER;
  ctx.fillStyle = isMiner ? '#065f46' : '#7f1d1d';
  ctx.fillRect(16, 16, width - 32, 50);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isMiner ? 'PENAMBANG EMAS' : 'PENYABOT', cx, 41);

  ctx.font = '64px sans-serif';
  ctx.fillText(isMiner ? '⛏️' : '💣', cx, cy - 15);

  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = isMiner ? '#34d399' : '#f87171';
  ctx.fillText(isMiner ? 'GOLD MINER' : 'SABOTEUR', cx, cy + 50);

  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#e5e7eb';
  if (isMiner) {
    ctx.fillText('Misi: Buat jalur ke EMAS!', cx, cy + 80);
  } else {
    ctx.fillText('Misi: Gagalkan penambang!', cx, cy + 80);
  }
}

function renderCardBackArt(ctx, width, height, label = '⛏️', accent = '#f59e0b') {
  const cx = width / 2;
  const cy = height / 2;

  // Dark pattern
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(16, 16, width - 32, height - 32);

  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, width - 48, height - 48);

  ctx.font = '48px sans-serif';
  ctx.fillStyle = accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy);

  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('SABOTEUR', cx, cy + 55);
}
