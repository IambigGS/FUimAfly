export type GameMode = 'arcade' | 'zen' | 'training';

export type FlyType = 'housefly' | 'bluebottle' | 'fruitfly' | 'golden' | 'ninja';

export interface Fly {
  id: string;
  type: FlyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  speed: number;
  twitchiness: number;
  points: number;
  angle: number;
  wingAngle: number;
  wingSpeed: number;
  buzzPitch: number;
  color: string;
  wingColor: string;
  isCaught: boolean;
  caughtTime?: number;
  targetX?: number;
  targetY?: number;
  restTimer?: number;
  state: 'flying' | 'hovering' | 'resting' | 'escaping' | 'releasing';
  isCatchable?: boolean;
  narrativeStartTime?: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  rotation?: number;
  rotationSpeed?: number;
}

export interface CherryBlossom {
  id: string;
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  angle: number;
  spin: number;
  opacity: number;
}

export interface ChopstickConfig {
  id: string;
  name: string;
  color1: string;
  color2: string;
  length: number;
  gripWidth: number;
  hasSparkles: boolean;
  sparkleColor?: string;
  description: string;
}

export interface GameStats {
  score: number;
  fliesCaught: number;
  totalAttempts: number;
  accuracy: number;
  combo: number;
  maxCombo: number;
  gameTimeRemaining: number; // in seconds, for arcade mode
  fliesTypeCount: Record<FlyType, number>;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        platform?: string;
        colorScheme?: 'light' | 'dark';
        initDataUnsafe?: any;
        isExpanded?: boolean;
        close?: () => void;
      };
    };
  }
}

