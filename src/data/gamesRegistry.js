import { CyberRunnerGame } from '../games/cyber-runner/CyberRunnerGame.js';
import { TowerStackerGame } from '../games/tower-stacker/TowerStackerGame.js';
import { CosmicMarbleGame } from '../games/cosmic-marble/CosmicMarbleGame.js';
import { CyberPongGame } from '../games/neon-pong/CyberPongGame.js';

export const gamesRegistry = [
  {
    id: 'cyber-runner',
    title: 'Cyber Runner 3D',
    subtitle: 'Endless Hyperspace Speedway',
    category: 'Endless Runner',
    badge: 'Popular',
    color: '#00f0ff',
    gradient: 'from-cyan-500/20 to-blue-600/20',
    description: 'Pilot your high-speed neon speeder through an infinite hyperspace tunnel. Dodge laser barriers and spikes while collecting glowing power crystals.',
    controls: {
      desktop: ['A / D or ← / → to change lanes', 'Space or ↑ to Jump over barriers', 'P or Esc to Pause'],
      mobile: ['Swipe Left / Right to steer', 'Swipe Up to Jump']
    },
    GameClass: CyberRunnerGame
  },
  {
    id: 'tower-stacker',
    title: 'Neon Tower Stacker',
    subtitle: 'Isometric Precision Stacking',
    category: 'Arcade / Puzzle',
    badge: 'Addictive',
    color: '#a855f7',
    gradient: 'from-purple-500/20 to-pink-600/20',
    description: 'Stack shifting 3D blocks as high as you can into the stratosphere. Slice off overhanging edges with realistic physics, score perfect combos to expand your platform!',
    controls: {
      desktop: ['Space or Click anywhere to drop block', 'P or Esc to Pause'],
      mobile: ['Tap anywhere on screen to drop block']
    },
    GameClass: TowerStackerGame
  },
  {
    id: 'cosmic-marble',
    title: 'Cosmic Marble 3D',
    subtitle: 'Sky Platform Physics Maze',
    category: 'Physics / Skill',
    badge: '3D Physics',
    color: '#eab308',
    gradient: 'from-amber-500/20 to-orange-600/20',
    description: 'Roll a high-momentum cosmic sphere across floating sky labyrinths. Collect all sacred golden relics to awaken the warp portal before you plummet into the void.',
    controls: {
      desktop: ['W A S D or Arrow Keys to roll marble', 'Hold & Drag mouse to steer', 'P or Esc to Pause'],
      mobile: ['Drag finger to steer and roll marble']
    },
    GameClass: CosmicMarbleGame
  },
  {
    id: 'neon-pong',
    title: 'Cyber Pong 3D',
    subtitle: 'High-Velocity Neon Air Hockey',
    category: 'Sports / Action',
    badge: 'AI Battle',
    color: '#ec4899',
    gradient: 'from-pink-500/20 to-rose-600/20',
    description: 'Engage in intense fast-paced 3D Pong against an adaptive AI opponent. Deflect high-speed curve balls, build up rally multipliers, and dominate the table.',
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
