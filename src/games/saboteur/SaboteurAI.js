// Saboteur AI Engine: Smart Heuristics for Miners & Saboteurs
import { CARD_TYPES, ROLES, TOOLS } from './SaboteurCards.js';

export class SaboteurAI {
  static executeTurn(gameState, playerIndex) {
    const player = gameState.players[playerIndex];
    if (!player || !player.isAI || gameState.roundOver) return;

    const isMiner = player.role === ROLES.MINER;
    const hand = [...player.hand];

    // 1. If tools are broken, try to fix self
    if (gameState.isPlayerBroken(player)) {
      const fixCard = hand.find((c) => {
        if (c.type !== CARD_TYPES.ACTION || c.actionType !== 'fix') return false;
        return c.tools.some((t) => player.brokenTools.has(t));
      });

      if (fixCard) {
        const brokenTool = Array.from(player.brokenTools).find((t) => fixCard.tools.includes(t));
        gameState.playActionCard(playerIndex, fixCard.uid, {
          targetPlayerId: player.id,
          chosenTool: brokenTool
        });
        return;
      }

      // If cannot fix self, try to use action cards (map, rockfall, break)
      if (this.tryPlayActionCard(gameState, playerIndex, player, hand, isMiner)) {
        return;
      }

      // Otherwise discard least useful card
      this.discardWorstCard(gameState, playerIndex, player, hand, isMiner);
      return;
    }

    // 2. Try Map Card (Inspect unseen goal)
    const mapCard = hand.find((c) => c.type === CARD_TYPES.ACTION && c.actionType === 'map');
    if (mapCard) {
      const unrevealedIdx = gameState.goalCards.findIndex((g, idx) => !g.revealed && !player.knownGoals.has(idx));
      if (unrevealedIdx !== -1) {
        gameState.playActionCard(playerIndex, mapCard.uid, { goalIndex: unrevealedIdx });
        return;
      }
    }

    // 3. Role-based Path Building or Sabotage
    if (isMiner) {
      // Miner strategy: Build open path toward gold
      if (this.tryMinerPathPlacement(gameState, playerIndex, player, hand)) {
        return;
      }
    } else {
      // Saboteur strategy: Block, detour, or sabotage
      if (this.trySaboteurStrategy(gameState, playerIndex, player, hand)) {
        return;
      }
    }

    // 4. Try Action Cards (Break opponents / Fix allies / Rockfall)
    if (this.tryPlayActionCard(gameState, playerIndex, player, hand, isMiner)) {
      return;
    }

    // 5. Fallback: Discard worst card
    this.discardWorstCard(gameState, playerIndex, player, hand, isMiner);
  }

  // Miner: Try to place an open path advancing toward goal
  static tryMinerPathPlacement(gameState, playerIndex, player, hand) {
    const pathCards = hand.filter((c) => c.type === CARD_TYPES.PATH && c.connected);
    if (pathCards.length === 0) return false;

    // Find best goal target (known gold or closest unrevealed goal)
    let targetGoal = gameState.goalCards.find((g) => !g.revealed && player.knownGoals.get(gameState.goalCards.indexOf(g)) === true);
    if (!targetGoal) {
      targetGoal = gameState.goalCards.find((g) => !g.revealed);
    }
    if (!targetGoal) return false;

    // Candidate positions: adjacent to existing connected grid cells
    const candidates = this.getCandidatePositions(gameState);

    // Sort candidate positions by proximity to target goal (higher X and closer Y)
    candidates.sort((a, b) => {
      const distA = Math.abs(a.x - targetGoal.x) + Math.abs(a.y - targetGoal.y);
      const distB = Math.abs(b.x - targetGoal.x) + Math.abs(b.y - targetGoal.y);
      return distA - distB;
    });

    for (const pos of candidates) {
      for (const card of pathCards) {
        // Try original rotation (0)
        let val = gameState.isValidPathPlacement(card, pos.x, pos.y);
        if (val.valid) {
          gameState.playPathCard(playerIndex, card.uid, pos.x, pos.y, 0);
          return true;
        }

        // Try 180 degree rotation
        const rotatedCard = { ...card, edges: [card.edges[2], card.edges[3], card.edges[0], card.edges[1]] };
        val = gameState.isValidPathPlacement(rotatedCard, pos.x, pos.y);
        if (val.valid) {
          gameState.playPathCard(playerIndex, card.uid, pos.x, pos.y, 180);
          return true;
        }
      }
    }

    return false;
  }

  // Saboteur: Place dead-ends or curves leading away
  static trySaboteurStrategy(gameState, playerIndex, player, hand) {
    // Check furthest advanced X coordinate
    let maxX = 0;
    gameState.grid.forEach((card) => {
      if (card && !card.isGoal && card.x > maxX) maxX = card.x;
    });

    // If early game (X < 3), pretend to help to avoid early break!
    if (maxX < 3) {
      const normalPath = this.tryMinerPathPlacement(gameState, playerIndex, player, hand);
      if (normalPath) return true;
    }

    // Mid/Late game: Try dead-end card
    const deadEndCards = hand.filter((c) => c.type === CARD_TYPES.PATH && !c.connected);
    const candidates = this.getCandidatePositions(gameState);
    // Sort to place dead-end directly in front of the leading miners!
    candidates.sort((a, b) => b.x - a.x);

    for (const card of deadEndCards) {
      for (const pos of candidates) {
        const val = gameState.isValidPathPlacement(card, pos.x, pos.y);
        if (val.valid) {
          gameState.playPathCard(playerIndex, card.uid, pos.x, pos.y, 0);
          return true;
        }
      }
    }

    return false;
  }

  // Try Action Cards (Break / Fix / Rockfall)
  static tryPlayActionCard(gameState, playerIndex, player, hand, isMiner) {
    // 1. Rockfall: Saboteur destroys leading miner path; Miner destroys dead end!
    const rockfall = hand.find((c) => c.type === CARD_TYPES.ACTION && c.actionType === 'rockfall');
    if (rockfall) {
      if (isMiner) {
        // Destroy dead-ends
        for (const [key, card] of gameState.grid.entries()) {
          if (!card.isStart && !card.isGoal && !card.connected) {
            gameState.playActionCard(playerIndex, rockfall.uid, { x: card.x, y: card.y });
            return true;
          }
        }
      } else {
        // Saboteur destroys furthest open path!
        let bestTarget = null;
        let highestX = -1;
        gameState.grid.forEach((card) => {
          if (!card.isStart && !card.isGoal && card.connected && card.x > highestX) {
            highestX = card.x;
            bestTarget = card;
          }
        });
        if (bestTarget && highestX >= 3) {
          gameState.playActionCard(playerIndex, rockfall.uid, { x: bestTarget.x, y: bestTarget.y });
          return true;
        }
      }
    }

    // 2. Break tool on suspicious/opposing players
    const breakCard = hand.find((c) => c.type === CARD_TYPES.ACTION && c.actionType === 'break');
    if (breakCard) {
      const opponents = gameState.players.filter((p) => p.id !== player.id && !p.brokenTools.has(breakCard.tool));
      if (opponents.length > 0) {
        // Miners target players who placed dead ends or broke someone
        // Saboteurs target active human or leading miner
        const target = isMiner
          ? opponents.find((p) => p.role === ROLES.SABOTEUR || p.isAI === false) || opponents[0]
          : opponents.find((p) => p.id === 'p1') || opponents[0];

        if (target) {
          gameState.playActionCard(playerIndex, breakCard.uid, { targetPlayerId: target.id });
          return true;
        }
      }
    }

    // 3. Fix teammate (if Miner)
    if (isMiner) {
      const fixCard = hand.find((c) => c.type === CARD_TYPES.ACTION && c.actionType === 'fix');
      if (fixCard) {
        const brokenTeammate = gameState.players.find((p) => p.id !== player.id && fixCard.tools.some((t) => p.brokenTools.has(t)));
        if (brokenTeammate) {
          const brokenTool = Array.from(brokenTeammate.brokenTools).find((t) => fixCard.tools.includes(t));
          gameState.playActionCard(playerIndex, fixCard.uid, {
            targetPlayerId: brokenTeammate.id,
            chosenTool: brokenTool
          });
          return true;
        }
      }
    }

    return false;
  }

  // Discard least useful card
  static discardWorstCard(gameState, playerIndex, player, hand, isMiner) {
    if (hand.length === 0) return;

    let discardCandidate = hand[0];

    if (isMiner) {
      // Miner prefers to discard dead-end cards or duplicate fix cards
      const deadEnd = hand.find((c) => c.type === CARD_TYPES.PATH && !c.connected);
      if (deadEnd) discardCandidate = deadEnd;
    } else {
      // Saboteur prefers to discard open path cards so miners cannot draw them!
      const openPath = hand.find((c) => c.type === CARD_TYPES.PATH && c.connected);
      if (openPath) discardCandidate = openPath;
    }

    gameState.discardCard(playerIndex, discardCandidate.uid);
  }

  // Find all coordinates adjacent to existing connected path cells
  static getCandidatePositions(gameState) {
    const candidates = new Map();

    gameState.grid.forEach((card) => {
      if (!card || card.isGoal || !card.connected) return;

      const adj = [
        { x: card.x, y: card.y - 1 },
        { x: card.x + 1, y: card.y },
        { x: card.x, y: card.y + 1 },
        { x: card.x - 1, y: card.y }
      ];

      adj.forEach((pos) => {
        const key = `${pos.x},${pos.y}`;
        // Boundaries: 0 <= X <= 8, -4 <= Y <= 4
        if (pos.x >= 0 && pos.x <= 8 && pos.y >= -4 && pos.y <= 4) {
          if (!gameState.grid.has(key)) {
            candidates.set(key, pos);
          }
        }
      });
    });

    return Array.from(candidates.values());
  }
}
