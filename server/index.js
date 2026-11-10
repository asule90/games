// Saboteur Real-time Server-Authoritative WebSocket Backend
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';
import { SaboteurState } from '../src/games/saboteur/SaboteurState.js';
import { SaboteurAI } from '../src/games/saboteur/SaboteurAI.js';

const PORT = process.env.PORT || 4000;

// Rooms Map: roomCode => GameRoom
const rooms = new Map();
// Sessions Map: sessionToken => { roomCode, socket, playerInfo }
const sessions = new Map();

class GameRoom {
  constructor(roomCode, hostSessionToken, hostName = 'Host', hostAvatar = '🧔') {
    this.roomCode = roomCode;
    this.hostSessionToken = hostSessionToken;
    this.maxPlayers = 10;
    this.minPlayers = 3;
    this.status = 'LOBBY'; // 'LOBBY' | 'PLAYING' | 'FINISHED'
    this.players = [];
    this.gameState = null;
    this.lastActivity = Date.now();
    this.aiTimer = null;

    // Add Host as Player 1
    this.addPlayer(hostSessionToken, hostName, hostAvatar);
  }

  touch() {
    this.lastActivity = Date.now();
  }

  addPlayer(sessionToken, name, avatar = '🧔') {
    this.touch();
    if (this.players.length >= this.maxPlayers) {
      return { success: false, error: 'Ruangan sudah penuh (maksimal 10 pemain)!' };
    }
    if (this.status !== 'LOBBY') {
      return { success: false, error: 'Permainan di ruangan ini sudah berlangsung!' };
    }

    const existing = this.players.find((p) => p.sessionToken === sessionToken);
    if (existing) {
      existing.name = name;
      existing.avatar = avatar;
      existing.connected = true;
      return { success: true, player: existing };
    }

    const player = {
      id: `p${this.players.length + 1}`,
      sessionToken,
      name: name || `Pemain ${this.players.length + 1}`,
      avatar: avatar || '⛏️',
      isAI: false,
      connected: true
    };

    this.players.push(player);
    return { success: true, player };
  }

  addBot() {
    this.touch();
    if (this.players.length >= this.maxPlayers) {
      return { success: false, error: 'Ruangan sudah penuh!' };
    }
    if (this.status !== 'LOBBY') {
      return { success: false, error: 'Tidak bisa menambah bot saat permainan berjalan!' };
    }

    const dwarfNames = ['Thorin', 'Balin', 'Gloin', 'Dwalin', 'Bifur', 'Bofur', 'Bombur', 'Fili', 'Kili', 'Gimli'];
    const botIdx = this.players.filter((p) => p.isAI).length;
    const botName = `Bot ${dwarfNames[botIdx % dwarfNames.length]}`;
    const botAvatars = ['🧙‍♂️', '🧝', '🤠', '🤴', '💪', '🕵️', '🎩', '🐻'];

    const bot = {
      id: `p${this.players.length + 1}`,
      sessionToken: `bot_${crypto.randomUUID()}`,
      name: botName,
      avatar: botAvatars[botIdx % botAvatars.length],
      isAI: true,
      connected: true
    };

    this.players.push(bot);
    return { success: true, player: bot };
  }

  removeBot(botId) {
    this.touch();
    if (this.status !== 'LOBBY') return { success: false, error: 'Hanya bisa menghapus bot di lobby!' };
    const idx = this.players.findIndex((p) => p.id === botId && p.isAI);
    if (idx !== -1) {
      this.players.splice(idx, 1);
      return { success: true };
    }
    return { success: false, error: 'Bot tidak ditemukan!' };
  }

  startGame(sessionToken) {
    this.touch();
    if (this.hostSessionToken !== sessionToken) {
      return { success: false, error: 'Hanya Host yang dapat memulai permainan!' };
    }
    if (this.players.length < this.minPlayers) {
      return { success: false, error: `Dibutuhkan minimal ${this.minPlayers} pemain! Tambahkan bot jika pemain kurang.` };
    }

    this.status = 'PLAYING';
    this.gameState = new SaboteurState({ playerCount: this.players.length });

    // Sync player names & avatars to SaboteurState
    for (let i = 0; i < this.players.length; i++) {
      this.gameState.players[i].id = this.players[i].id;
      this.gameState.players[i].name = this.players[i].name;
      this.gameState.players[i].avatar = this.players[i].avatar;
      this.gameState.players[i].isAI = this.players[i].isAI;
      this.gameState.players[i].sessionId = this.players[i].sessionToken;
    }

    this.broadcastState();
    this.checkTriggerAI();
    return { success: true };
  }

  handleAction(sessionToken, action, payload) {
    this.touch();
    if (this.status !== 'PLAYING' || !this.gameState) {
      return { success: false, error: 'Permainan belum dimulai!' };
    }

    const playerIndex = this.players.findIndex((p) => p.sessionToken === sessionToken);
    if (playerIndex === -1) return { success: false, error: 'Pemain tidak terdaftar di room ini!' };

    let res = { success: false, error: 'Aksi tidak dikenal!' };

    if (action === 'play_path') {
      res = this.gameState.playPathCard(playerIndex, payload.cardUid, payload.x, payload.y, payload.rotation || 0);
    } else if (action === 'play_action') {
      res = this.gameState.playActionCard(playerIndex, payload.cardUid, payload.targetInfo || {});
    } else if (action === 'discard') {
      res = this.gameState.discardCard(playerIndex, payload.cardUid);
    } else if (action === 'next_round') {
      if (this.gameState.roundOver && !this.gameState.gameOver) {
        this.gameState.nextRound();
        res = { success: true };
      }
    }

    if (res.success) {
      this.broadcastState();
      this.checkTriggerAI();
    }
    return res;
  }

  // Check if next turn belongs to an AI Bot
  checkTriggerAI() {
    if (this.status !== 'PLAYING' || !this.gameState || this.gameState.roundOver) return;

    const currPlayer = this.gameState.getCurrentPlayer();
    if (currPlayer && currPlayer.isAI) {
      clearTimeout(this.aiTimer);
      this.aiTimer = setTimeout(() => {
        if (this.status === 'PLAYING' && !this.gameState.roundOver) {
          SaboteurAI.executeTurn(this.gameState, this.gameState.currentTurnIndex);
          this.broadcastState();
          this.checkTriggerAI();
        }
      }, 1100);
    }
  }

  // Broadcast sanitized private states to all players
  broadcastState() {
    this.players.forEach((player, pIdx) => {
      if (player.isAI) return;

      const session = sessions.get(player.sessionToken);
      if (session && session.socket && session.socket.readyState === WebSocket.OPEN) {
        let payload = null;

        if (this.status === 'LOBBY') {
          payload = {
            type: 'lobby_state',
            roomCode: this.roomCode,
            isHost: player.sessionToken === this.hostSessionToken,
            players: this.players.map((p) => ({
              id: p.id,
              name: p.name,
              avatar: p.avatar,
              isAI: p.isAI,
              connected: p.connected
            }))
          };
        } else {
          // Playing or Game Over
          const sanitizedGame = this.gameState.getPublicStateForPlayer(pIdx);
          payload = {
            type: 'game_state',
            roomCode: this.roomCode,
            isHost: player.sessionToken === this.hostSessionToken,
            gameState: sanitizedGame
          };
        }

        session.socket.send(JSON.stringify(payload));
      }
    });
  }
}

// Create HTTP and WebSocket Server
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', rooms: rooms.size }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Saboteur WebSocket Game Server is active.\n');
  }
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  let currentSessionToken = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const { type, payload } = data;

      // 1. Create Room
      if (type === 'create_room') {
        const sessionToken = crypto.randomUUID();
        const code = generateRoomCode();
        const room = new GameRoom(code, sessionToken, payload.name, payload.avatar);
        rooms.set(code, room);
        sessions.set(sessionToken, { roomCode: code, socket: ws });
        currentSessionToken = sessionToken;

        ws.send(JSON.stringify({
          type: 'room_created',
          roomCode: code,
          sessionToken,
          isHost: true
        }));
        room.broadcastState();
      }

      // 2. Join Room
      else if (type === 'join_room') {
        const code = (payload.roomCode || '').toUpperCase().trim();
        const room = rooms.get(code);
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: `Ruangan dengan kode "${code}" tidak ditemukan!` }));
          return;
        }

        const sessionToken = payload.sessionToken || crypto.randomUUID();
        const joinRes = room.addPlayer(sessionToken, payload.name, payload.avatar);
        if (!joinRes.success) {
          ws.send(JSON.stringify({ type: 'error', message: joinRes.error }));
          return;
        }

        sessions.set(sessionToken, { roomCode: code, socket: ws });
        currentSessionToken = sessionToken;

        ws.send(JSON.stringify({
          type: 'room_joined',
          roomCode: code,
          sessionToken,
          isHost: room.hostSessionToken === sessionToken
        }));
        room.broadcastState();
      }

      // 3. Reconnect Existing Session
      else if (type === 'reconnect') {
        const { roomCode, sessionToken } = payload;
        const code = (roomCode || '').toUpperCase().trim();
        const room = rooms.get(code);

        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: 'Sesi kedaluwarsa atau ruangan sudah ditutup.' }));
          return;
        }

        const player = room.players.find((p) => p.sessionToken === sessionToken);
        if (!player) {
          ws.send(JSON.stringify({ type: 'error', message: 'Pemain tidak ditemukan di ruangan ini!' }));
          return;
        }

        player.connected = true;
        sessions.set(sessionToken, { roomCode: code, socket: ws });
        currentSessionToken = sessionToken;

        ws.send(JSON.stringify({
          type: 'reconnected',
          roomCode: code,
          sessionToken,
          isHost: room.hostSessionToken === sessionToken
        }));
        room.broadcastState();
      }

      // 4. Lobby Controls: Add / Remove Bot
      else if (type === 'add_bot') {
        const session = sessions.get(currentSessionToken);
        if (session) {
          const room = rooms.get(session.roomCode);
          if (room) {
            const res = room.addBot();
            if (!res.success) ws.send(JSON.stringify({ type: 'error', message: res.error }));
            else room.broadcastState();
          }
        }
      } else if (type === 'remove_bot') {
        const session = sessions.get(currentSessionToken);
        if (session) {
          const room = rooms.get(session.roomCode);
          if (room) {
            const res = room.removeBot(payload.botId);
            if (!res.success) ws.send(JSON.stringify({ type: 'error', message: res.error }));
            else room.broadcastState();
          }
        }
      }

      // 5. Start Game
      else if (type === 'start_game') {
        const session = sessions.get(currentSessionToken);
        if (session) {
          const room = rooms.get(session.roomCode);
          if (room) {
            const res = room.startGame(currentSessionToken);
            if (!res.success) ws.send(JSON.stringify({ type: 'error', message: res.error }));
          }
        }
      }

      // 6. In-game Actions (Path placement, Action cards, Discard)
      else if (['play_path', 'play_action', 'discard', 'next_round'].includes(type)) {
        const session = sessions.get(currentSessionToken);
        if (session) {
          const room = rooms.get(session.roomCode);
          if (room) {
            const res = room.handleAction(currentSessionToken, type, payload || {});
            if (!res.success) ws.send(JSON.stringify({ type: 'error', message: res.error }));
          }
        }
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err);
    }
  });

  ws.on('close', () => {
    if (currentSessionToken) {
      const session = sessions.get(currentSessionToken);
      if (session) {
        const room = rooms.get(session.roomCode);
        if (room) {
          const p = room.players.find((pl) => pl.sessionToken === currentSessionToken);
          if (p) p.connected = false;
          room.broadcastState();
        }
      }
    }
  });
});

// Helper: 4-6 char random room code
function generateRoomCode() {
  const words = ['MINE', 'GOLD', 'ROCK', 'PICK', 'COAL', 'GEM'];
  const prefix = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(10 + Math.random() * 90);
  const code = `${prefix}-${num}`;
  if (rooms.has(code)) return generateRoomCode();
  return code;
}

// Garbage Collector: Remove idle rooms older than 30 mins
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.lastActivity > 30 * 60 * 1000) {
      rooms.delete(code);
    }
  }
}, 5 * 60 * 1000);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Saboteur Multiplayer WebSocket Server running on port ${PORT}`);
});
