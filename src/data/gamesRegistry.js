import { MissManagementGame } from '../games/miss-management/MissManagementGame.js';
import { TetrisGame } from '../games/tetris/TetrisGame.js';
import { CyberRunnerGame } from '../games/cyber-runner/CyberRunnerGame.js';
import { TowerStackerGame } from '../games/tower-stacker/TowerStackerGame.js';
import { CyberPongGame } from '../games/neon-pong/CyberPongGame.js';
import { SaboteurGame } from '../games/saboteur/SaboteurGame.js';

export const gamesRegistry = [
  {
    id: 'saboteur',
    title: 'Saboteur 3D Gold Rush',
    subtitle: 'Hidden Role Dwarf Board Game (3-10 Players)',
    category: 'Board Game / Social Deduction',
    badge: '💎 3-10 Players Multi',
    color: '#fbbf24',
    gradient: 'from-amber-500/20 to-yellow-600/20',
    description: 'The legendary hidden-role mining card game in 3D! Dig tunnels to discover precious Gold as loyal Miners, or secretly sabotage the expedition with cave-ins and broken tools as the Saboteur. Supports 3 to 10 players online or solo vs smart AI!',
    controls: {
      desktop: [
        'Click Card in Hand Tray to select',
        'Click Board Grid to place Path or target Action',
        'Rotate Card (180°) button to flip orientation',
        'Click & Drag to pan 3D mine camera, Scroll to Zoom'
      ],
      mobile: [
        'Tap Card in Hand to select, tap Mine Grid to place',
        'Drag finger to pan around the 3D cavern'
      ]
    },
    GameClass: SaboteurGame
  },
  {
    id: 'miss-management',
    title: 'Miss Management 3D',
    subtitle: 'Quirky Office Time Management',
    category: 'Time Management / Simulation',
    badge: '⭐ Office Favorite!',
    color: '#ff6b8b',
    gradient: 'from-pink-500/20 to-orange-500/20',
    description: "Step into Denise's shoes! Keep your friendly office buddies (Tim, Tara, Winston & Luke) happy and stress-free. Brew delicious coffee, deliver projects on time, and earn shining stars!",
    controls: {
      desktop: ['Click Desks to assign projects or give pep talks', 'Click Coffee Bar to brew/serve espresso', 'Click Dispatch Table to deliver files & collect coins'],
      mobile: ['Tap Desks, Coffee Machine, or Dispatch Table to interact']
    },
    GameClass: MissManagementGame
  },
  {
    id: 'tetris-3d',
    title: 'Tetris 3D Classic',
    subtitle: 'Neon Pastel Block Rush',
    category: 'Puzzle / Arcade',
    badge: '🕹️ Classic Retro',
    color: '#00f0ff',
    gradient: 'from-cyan-400/20 to-blue-500/20',
    description: 'The world-famous block puzzle in gorgeous 3D! Rotate and drop neon pastel tetrominoes, clear lines for satisfying point bonuses, use Hold (C) and Ghost Piece to set high scores!',
    controls: {
      desktop: ['← / → or A / D to Move', '↑ or W to Rotate', '↓ or S to Soft Drop', 'Space to Hard Drop', 'C or Shift to Hold Piece'],
      mobile: ['D-pad Left / Right to Move', 'Tap Rotate to Spin', 'Tap Drop to Hard Drop']
    },
    GameClass: TetrisGame
  },
  {
    id: 'cyber-runner',
    title: 'Star Runner 3D',
    subtitle: 'Whimsical Space Flight',
    category: 'Casual / Endless Runner',
    badge: '🚀 Star Flight',
    color: '#48dbfb',
    gradient: 'from-sky-400/20 to-indigo-500/20',
    description: 'Glide your shiny space cruiser along a colorful galaxy track. Dodge bouncy barriers and collect sparkling star crystals to set a high score record with your family!',
    controls: {
      desktop: ['A / D or ← / → to change lanes', 'Space or ↑ to Jump over barriers', 'P or Esc to Pause'],
      mobile: ['Swipe Left / Right to steer', 'Swipe Up to Jump']
    },
    GameClass: CyberRunnerGame
  },
  {
    id: 'tower-stacker',
    title: 'Pastel Tower Stacker',
    subtitle: 'Satisfying 3D Block Stacking',
    category: 'Arcade / Relaxing',
    badge: '🧩 Super Relaxing',
    color: '#a55eea',
    gradient: 'from-purple-500/20 to-pink-500/20',
    description: 'Tap to stack charming pastel blocks higher and higher into the clouds. Match edges cleanly to unlock sweet musical chime streaks and build the ultimate tower!',
    controls: {
      desktop: ['Space or Click anywhere to drop block', 'P or Esc to Pause'],
      mobile: ['Tap anywhere on screen to drop block']
    },
    GameClass: TowerStackerGame
  },
  {
    id: 'neon-pong',
    title: 'Neon Air Hockey 3D',
    subtitle: 'Fun Table Tennis with AI',
    category: 'Sports / Casual',
    badge: '🏓 Friendly Match',
    color: '#1dd1a1',
    gradient: 'from-emerald-400/20 to-teal-500/20',
    description: 'Enjoy a friendly game of 3D table hockey against an adorable computer buddy. Curve your shots, bounce off colorful side rails, and celebrate every goal with confetti!',
    controls: {
      desktop: ['Move Mouse or A / D / Arrow keys to glide mallet', 'Space for Power Smash ⚡', 'P or Esc to Pause'],
      mobile: ['Drag finger anywhere on screen or use ◀ / ▶ buttons', 'Tap ⚡ for Power Smash']
    },
    GameClass: CyberPongGame
  }
];

export function getGameById(id) {
  return gamesRegistry.find((g) => g.id === id);
}
