import { MissManagementGame } from '../games/miss-management/MissManagementGame.js';
import { CyberRunnerGame } from '../games/cyber-runner/CyberRunnerGame.js';
import { TowerStackerGame } from '../games/tower-stacker/TowerStackerGame.js';
import { CosmicMarbleGame } from '../games/cosmic-marble/CosmicMarbleGame.js';
import { CyberPongGame } from '../games/neon-pong/CyberPongGame.js';

export const gamesRegistry = [
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
    id: 'cosmic-marble',
    title: 'Cosmic Marble 3D',
    subtitle: 'Sky Maze & Relic Hunt',
    category: 'Physics / Skill',
    badge: '✨ Magic Marble',
    color: '#feca57',
    gradient: 'from-amber-400/20 to-orange-500/20',
    description: 'Gently roll a magical sphere across floating puzzle islands in the sky. Collect all the golden star relics to open the warp portal to the next level!',
    controls: {
      desktop: ['W A S D or Arrow Keys to roll marble', 'Hold & Drag mouse to steer', 'P or Esc to Pause'],
      mobile: ['Drag finger to steer and roll marble']
    },
    GameClass: CosmicMarbleGame
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
      desktop: ['Move Mouse or A / D keys to glide paddle', 'P or Esc to Pause'],
      mobile: ['Drag finger along bottom to glide paddle']
    },
    GameClass: CyberPongGame
  }
];

export function getGameById(id) {
  return gamesRegistry.find((g) => g.id === id);
}
