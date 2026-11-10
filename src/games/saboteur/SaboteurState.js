// Saboteur Core Game State & BFS Pathfinding Engine
import {
  CARD_TYPES,
  ROLES,
  TOOLS,
  PLAYER_CONFIGS,
  buildDrawDeck,
  setupGoalCards,
  getStartCard,
  rotateEdges
} from './SaboteurCards.js';

export class SaboteurState {
  constructor(options = {}) {
    this.playerCount = Math.max(3, Math.min(10, options.playerCount || 4));
    this.players = [];
    this.currentTurnIndex = 0;
    this.round = 1;
    this.maxRounds = 3;
    this.deck = [];
    this.discardPile = [];
    this.grid = new Map(); // key: "x,y" => card
    this.goalCards = [];
    this.roundOver = false;
    this.gameOver = false;
    this.winnerRole = null;
    this.roundLogs = [];
    this.consecutivePasses = 0;

    this.initRound();
  }

  // Initialize a new round
  initRound() {
    this.roundOver = false;
    this.winnerRole = null;
    this.consecutivePasses = 0;
    this.grid.clear();

    // 1. Setup Grid Start & Goals
    const startCard = getStartCard();
    this.grid.set('0,0', startCard);

    this.goalCards = setupGoalCards();
    this.goalCards.forEach((g) => {
      this.grid.set(`${g.x},${g.y}`, g);
    });

    // 2. Setup Draw Deck
    this.deck = buildDrawDeck();
    this.discardPile = [];

    // 3. Setup Roles according to player count
    const cfg = PLAYER_CONFIGS[this.playerCount] || PLAYER_CONFIGS[4];
    const rolePool = [];
    for (let i = 0; i < cfg.miners; i++) rolePool.push(ROLES.MINER);
    for (let i = 0; i < cfg.saboteurs; i++) rolePool.push(ROLES.SABOTEUR);

    // Shuffle role pool
    for (let i = rolePool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rolePool[i], rolePool[j]] = [rolePool[j], rolePool[i]];
    }

    // 1 role card is set aside face down!
    rolePool.pop();

    // Setup or preserve existing players
    if (this.players.length !== this.playerCount) {
      this.players = [];
      const dwarfNames = ['Thorin', 'Balin', 'Gloin', 'Dwalin', 'Bifur', 'Bofur', 'Bombur', 'Fili', 'Kili', 'Gimli'];
      const dwarfAvatars = ['🧔', '🧙‍♂️', '🧝', '⛏️', '🤠', '🤴', '💪', '🕵️', '🎩', '🐻'];

      for (let i = 0; i < this.playerCount; i++) {
        this.players.push({
          id: `p${i + 1}`,
          name: optionsPlayerName(i, dwarfNames[i]),
          avatar: dwarfAvatars[i],
          isAI: i > 0, // Player 1 is human by default
          role: rolePool[i],
          hand: [],
          brokenTools: new Set(),
          goldNuggets: 0,
          knownGoals: new Map() // goalIndex -> isGold
        });
      }
    } else {
      // Keep existing players & cumulative gold nuggets, reset round state
      for (let i = 0; i < this.playerCount; i++) {
        this.players[i].role = rolePool[i];
        this.players[i].hand = [];
        this.players[i].brokenTools = new Set();
        this.players[i].knownGoals = new Map();
      }
    }

    // 4. Deal initial cards to players
    for (let c = 0; c < cfg.handSize; c++) {
      for (let p = 0; p < this.playerCount; p++) {
        if (this.deck.length > 0) {
          this.players[p].hand.push(this.deck.pop());
        }
      }
    }

    this.addLog(`Ronde ${this.round} dimulai! Dek dibagikan (${cfg.handSize} kartu per pemain).`);
  }

  addLog(msg) {
    this.roundLogs.unshift({
      id: Math.random().toString(36).substring(2, 9),
      time: new Date().toLocaleTimeString(),
      text: msg
    });
    if (this.roundLogs.length > 30) this.roundLogs.pop();
  }

  getCurrentPlayer() {
    return this.players[this.currentTurnIndex];
  }

  // Check if player has any broken tools
  isPlayerBroken(player) {
    return player.brokenTools && player.brokenTools.size > 0;
  }

  // Validate Path Card Placement
  isValidPathPlacement(card, x, y) {
    const key = `${x},${y}`;

    // Cannot place over existing card (except unrevealed goals are handled separately)
    const existing = this.grid.get(key);
    if (existing && (!existing.isGoal || existing.revealed)) {
      return { valid: false, reason: 'Petak sudah terisi kartu jalur!' };
    }

    // Neighbors: top (y-1), right (x+1), bottom (y+1), left (x-1)
    const top = this.grid.get(`${x},${y - 1}`);
    const right = this.grid.get(`${x + 1},${y}`);
    const bottom = this.grid.get(`${x},${y + 1}`);
    const left = this.grid.get(`${x - 1},${y}`);

    const hasNeighbor = (top && (!top.isGoal || top.revealed)) ||
                        (right && (!right.isGoal || right.revealed)) ||
                        (bottom && (!bottom.isGoal || bottom.revealed)) ||
                        (left && (!left.isGoal || left.revealed));

    if (!hasNeighbor) {
      return { valid: false, reason: 'Kartu harus bersebelahan dengan jalur yang sudah ada!' };
    }

    const [t, r, b, l] = card.edges;

    // Check edge match with Top neighbor
    if (top && (!top.isGoal || top.revealed)) {
      const topBottomEdge = top.edges[2]; // bottom of top card
      if (topBottomEdge !== t) return { valid: false, reason: 'Jalur tidak cocok dengan sisi Atas!' };
    }

    // Check edge match with Right neighbor
    if (right && (!right.isGoal || right.revealed)) {
      const rightLeftEdge = right.edges[3]; // left of right card
      if (rightLeftEdge !== r) return { valid: false, reason: 'Jalur tidak cocok dengan sisi Kanan!' };
    }

    // Check edge match with Bottom neighbor
    if (bottom && (!bottom.isGoal || bottom.revealed)) {
      const bottomTopEdge = bottom.edges[0]; // top of bottom card
      if (bottomTopEdge !== b) return { valid: false, reason: 'Jalur tidak cocok dengan sisi Bawah!' };
    }

    // Check edge match with Left neighbor
    if (left && (!left.isGoal || left.revealed)) {
      const leftRightEdge = left.edges[1]; // right of left card
      if (leftRightEdge !== l) return { valid: false, reason: 'Jalur tidak cocok dengan sisi Kiri!' };
    }

    // Must be reachable via continuous open path from Start (0,0)
    // We simulate adding the card and test reachability
    const tempCard = { ...card, x, y };
    this.grid.set(key, tempCard);
    const reachable = this.isReachableFromStart(x, y);
    if (!existing) {
      this.grid.delete(key);
    } else {
      this.grid.set(key, existing);
    }

    if (!reachable) {
      return { valid: false, reason: 'Jalur harus tersambung secara terbuka ke Tangga Start!' };
    }

    return { valid: true };
  }

  // BFS check: Is (targetX, targetY) reachable from start (0, 0) through open connections?
  isReachableFromStart(targetX, targetY) {
    const queue = [{ x: 0, y: 0 }];
    const visited = new Set(['0,0']);

    while (queue.length > 0) {
      const curr = queue.shift();
      if (curr.x === targetX && curr.y === targetY) {
        return true;
      }

      const card = this.grid.get(`${curr.x},${curr.y}`);
      if (!card || (!card.connected && !card.isStart)) {
        // Dead ends cannot pass path through to neighbors!
        continue;
      }

      const [topEdge, rightEdge, bottomEdge, leftEdge] = card.edges;

      // Directions: [dx, dy, outEdge, inEdgeIndex]
      const dirs = [
        [0, -1, topEdge, 2],    // Top: my top, their bottom
        [1, 0, rightEdge, 3],   // Right: my right, their left
        [0, 1, bottomEdge, 0],  // Bottom: my bottom, their top
        [-1, 0, leftEdge, 1]    // Left: my left, their right
      ];

      for (const [dx, dy, outOpen, neighborInIndex] of dirs) {
        if (!outOpen) continue; // no opening on this side

        const nx = curr.x + dx;
        const ny = curr.y + dy;
        const nKey = `${nx},${ny}`;

        if (visited.has(nKey)) continue;

        const neighbor = this.grid.get(nKey);
        if (neighbor && (!neighbor.isGoal || neighbor.revealed || (nx === targetX && ny === targetY))) {
          if (neighbor.edges && neighbor.edges[neighborInIndex]) {
            visited.add(nKey);
            queue.push({ x: nx, y: ny });
          }
        }
      }
    }

    return false;
  }

  // Play a Path Card
  playPathCard(playerIndex, cardUid, x, y, rotation = 0) {
    if (this.roundOver) return { success: false, error: 'Ronde telah selesai!' };
    if (this.currentTurnIndex !== playerIndex) return { success: false, error: 'Bukan giliran Anda!' };

    const player = this.players[playerIndex];
    if (this.isPlayerBroken(player)) {
      return { success: false, error: 'Alat Anda rusak! Anda tidak bisa memasang jalur tambang.' };
    }

    const cardIndex = player.hand.findIndex((c) => c.uid === cardUid);
    if (cardIndex === -1) return { success: false, error: 'Kartu tidak ada di tangan!' };

    const card = { ...player.hand[cardIndex] };
    if (rotation === 180) {
      card.edges = rotateEdges(card.edges);
      card.rotation = 180;
    }

    const val = this.isValidPathPlacement(card, x, y);
    if (!val.valid) return { success: false, error: val.reason };

    // Place card
    card.x = x;
    card.y = y;
    this.grid.set(`${x},${y}`, card);
    player.hand.splice(cardIndex, 1);
    this.consecutivePasses = 0;

    this.addLog(`${player.name} memasang jalur di (${x}, ${y})`);

    // Check if any Goal cards are now reached!
    this.checkGoalConnections(player);

    this.endTurn(player);
    return { success: true };
  }

  // Check if any goal card is connected to the start ladder
  checkGoalConnections(lastPlayer) {
    for (const goal of this.goalCards) {
      if (goal.revealed) continue;

      // Check if reachable from start
      if (this.isGoalConnected(goal)) {
        goal.revealed = true;
        this.grid.set(`${goal.x},${goal.y}`, goal);

        if (goal.isGold) {
          this.addLog(`🎉 EMAS DITEMUKAN oleh ${lastPlayer.name}! Penambang Menang! 🏆`);
          this.finishRound(ROLES.MINER, lastPlayer);
          return;
        } else {
          this.addLog(`🪨 ${lastPlayer.name} membuka kartu tujuan: Hanya batu arang! Lanjut mencari emas.`);
        }
      }
    }
  }

  // Is goal connected to an open tunnel?
  isGoalConnected(goal) {
    const dirs = [
      [0, -1, 2, 0], // Top neighbor's bottom edge (2) to goal's top (0)
      [1, 0, 3, 1],  // Right neighbor's left edge (3) to goal's right (1)
      [0, 1, 0, 2],  // Bottom neighbor's top edge (0) to goal's bottom (2)
      [-1, 0, 1, 3]  // Left neighbor's right edge (1) to goal's left (3)
    ];

    for (const [dx, dy, neighborEdgeIdx, goalEdgeIdx] of dirs) {
      const neighbor = this.grid.get(`${goal.x + dx},${goal.y + dy}`);
      if (neighbor && neighbor.connected && neighbor.edges[neighborEdgeIdx] && goal.edges[goalEdgeIdx]) {
        if (this.isReachableFromStart(goal.x + dx, goal.y + dy)) {
          return true;
        }
      }
    }
    return false;
  }

  // Play an Action Card
  playActionCard(playerIndex, cardUid, targetInfo = {}) {
    if (this.roundOver) return { success: false, error: 'Ronde telah selesai!' };
    if (this.currentTurnIndex !== playerIndex) return { success: false, error: 'Bukan giliran Anda!' };

    const player = this.players[playerIndex];
    const cardIndex = player.hand.findIndex((c) => c.uid === cardUid);
    if (cardIndex === -1) return { success: false, error: 'Kartu tidak ada di tangan!' };

    const card = player.hand[cardIndex];
    if (card.type !== CARD_TYPES.ACTION) return { success: false, error: 'Bukan kartu aksi!' };

    // 1. Tool Break
    if (card.actionType === 'break') {
      const targetPlayer = this.players.find((p) => p.id === targetInfo.targetPlayerId);
      if (!targetPlayer) return { success: false, error: 'Target pemain tidak valid!' };
      if (targetPlayer.brokenTools.has(card.tool)) {
        return { success: false, error: `Alat tersebut pada ${targetPlayer.name} sudah rusak!` };
      }

      targetPlayer.brokenTools.add(card.tool);
      this.addLog(`💥 ${player.name} merusak ${card.name} milik ${targetPlayer.name}!`);
    }

    // 2. Tool Fix
    else if (card.actionType === 'fix') {
      const targetPlayer = this.players.find((p) => p.id === targetInfo.targetPlayerId);
      if (!targetPlayer) return { success: false, error: 'Target pemain tidak valid!' };

      // Tool to fix (if dual card, targetInfo.chosenTool specifies which)
      const toolToFix = targetInfo.chosenTool || card.tools[0];
      if (!targetPlayer.brokenTools.has(toolToFix)) {
        return { success: false, error: `Pemain ${targetPlayer.name} tidak memiliki alat tersebut yang rusak!` };
      }

      targetPlayer.brokenTools.delete(toolToFix);
      this.addLog(`🔧 ${player.name} memperbaiki alat ${toolToFix} milik ${targetPlayer.name}!`);
    }

    // 3. Rockfall (Cave-in)
    else if (card.actionType === 'rockfall') {
      const { x, y } = targetInfo;
      const targetCard = this.grid.get(`${x},${y}`);
      if (!targetCard) return { success: false, error: 'Tidak ada kartu jalur di koordinat tersebut!' };
      if (targetCard.isStart) return { success: false, error: 'Tangga start tidak bisa dihancurkan!' };
      if (targetCard.isGoal) return { success: false, error: 'Kartu tujuan tidak bisa dihancurkan!' };

      this.grid.delete(`${x},${y}`);
      this.addLog(`💣 ${player.name} menggunakan Guguran Batu di (${x}, ${y})! Jalur hancur.`);
    }

    // 4. Map (Inspection)
    else if (card.actionType === 'map') {
      const { goalIndex } = targetInfo;
      const goal = this.goalCards[goalIndex];
      if (!goal) return { success: false, error: 'Kartu tujuan tidak valid!' };
      if (goal.revealed) return { success: false, error: 'Kartu tujuan sudah terbuka!' };

      player.knownGoals.set(goalIndex, goal.isGold);
      this.addLog(`🗺️ ${player.name} memeriksa salah satu kartu tujuan secara rahasia.`);
    }

    // Remove action card from hand & put in discard
    player.hand.splice(cardIndex, 1);
    this.discardPile.push(card);
    this.consecutivePasses = 0;

    this.endTurn(player);
    return { success: true };
  }

  // Discard / Pass Turn
  discardCard(playerIndex, cardUid) {
    if (this.roundOver) return { success: false, error: 'Ronde telah selesai!' };
    if (this.currentTurnIndex !== playerIndex) return { success: false, error: 'Bukan giliran Anda!' };

    const player = this.players[playerIndex];
    const cardIndex = player.hand.findIndex((c) => c.uid === cardUid);
    if (cardIndex === -1) return { success: false, error: 'Kartu tidak ada di tangan!' };

    const card = player.hand.splice(cardIndex, 1)[0];
    this.discardPile.push(card);
    this.consecutivePasses++;

    this.addLog(`${player.name} membuang 1 kartu (Pass).`);

    // Check if all players passed and deck is empty -> Saboteurs win
    if (this.deck.length === 0) {
      const allHandsEmpty = this.players.every((p) => p.hand.length === 0);
      if (allHandsEmpty || this.consecutivePasses >= this.playerCount) {
        this.addLog('⛏️ Tumpukan kartu habis dan tidak ada jalur yang bisa dibuat! Penyabot Menang! 💣');
        this.finishRound(ROLES.SABOTEUR);
        return { success: true };
      }
    }

    this.endTurn(player);
    return { success: true };
  }

  // End Turn & Draw Replacement Card
  endTurn(player) {
    if (this.deck.length > 0) {
      player.hand.push(this.deck.pop());
    }

    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.playerCount;
  }

  // Round Finish & Gold Distribution
  finishRound(winningRole, lastMiner = null) {
    this.roundOver = true;
    this.winnerRole = winningRole;

    // Reveal all goal cards
    this.goalCards.forEach((g) => {
      g.revealed = true;
      this.grid.set(`${g.x},${g.y}`, g);
    });

    if (winningRole === ROLES.MINER) {
      // Miners receive 2-3 nuggets each
      this.players.forEach((p) => {
        if (p.role === ROLES.MINER) {
          const nuggets = Math.floor(Math.random() * 2) + 2; // 2 or 3
          p.goldNuggets += nuggets;
        }
      });
    } else {
      // Saboteurs receive nuggets based on count
      const saboteurs = this.players.filter((p) => p.role === ROLES.SABOTEUR);
      let rewardPerSaboteur = 3;
      if (saboteurs.length === 1) rewardPerSaboteur = 4;
      else if (saboteurs.length >= 4) rewardPerSaboteur = 2;

      saboteurs.forEach((s) => {
        s.goldNuggets += rewardPerSaboteur;
      });
    }

    if (this.round >= this.maxRounds) {
      this.gameOver = true;
      this.addLog(`🏆 PERMAINAN SELESAI! Total 3 Ronde Berakhir.`);
    }
  }

  // Start next round
  nextRound() {
    if (this.round < this.maxRounds) {
      this.round++;
      this.initRound();
    }
  }

  // Export Sanitized Public State for Clients (Hides private role & hands of opponents)
  getPublicStateForPlayer(sessionIdOrPlayerIndex) {
    let pIdx = typeof sessionIdOrPlayerIndex === 'number'
      ? sessionIdOrPlayerIndex
      : this.players.findIndex((p) => p.sessionId === sessionIdOrPlayerIndex || p.id === sessionIdOrPlayerIndex);

    if (pIdx < 0) pIdx = 0;

    const me = this.players[pIdx];

    return {
      round: this.round,
      maxRounds: this.maxRounds,
      roundOver: this.roundOver,
      gameOver: this.gameOver,
      winnerRole: this.winnerRole,
      deckCount: this.deck.length,
      discardCount: this.discardPile.length,
      currentTurnIndex: this.currentTurnIndex,
      myPlayerIndex: pIdx,
      myRole: me ? me.role : null, // Private role only
      myHand: me ? me.hand : [],   // Private hand only
      knownGoals: me ? Array.from(me.knownGoals.entries()) : [],
      grid: Array.from(this.grid.entries()).map(([key, card]) => ({
        key,
        x: card.x,
        y: card.y,
        isStart: card.isStart || false,
        isGoal: card.isGoal || false,
        revealed: card.revealed || false,
        isGold: card.revealed ? card.isGold : null,
        edges: card.edges,
        connected: card.connected,
        templateId: card.templateId || null,
        rotation: card.rotation || 0,
        name: card.name
      })),
      players: this.players.map((p, idx) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isAI: p.isAI,
        cardCount: p.hand.length,
        brokenTools: Array.from(p.brokenTools),
        goldNuggets: p.goldNuggets,
        // Role is only revealed if round is over or it's me
        role: (this.roundOver || idx === pIdx) ? p.role : null
      })),
      logs: this.roundLogs.slice(0, 15)
    };
  }
}

function optionsPlayerName(index, defaultName) {
  if (index === 0) return 'Anda (P1)';
  return `Bot ${defaultName}`;
}
