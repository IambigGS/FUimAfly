/// <reference types="vite/client" />

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
  landingTargetId?: string;
  landingType?: 'dumpling' | 'tea' | 'none';
  landedTime?: number;
  buzzLoopTimer?: number;
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

export interface Dumpling {
  id: string;
  x: number;
  y: number;
  isEaten: boolean;
  isBlockedByFly: boolean;
  flyId?: string;
}

export interface TeaCup {
  x: number;
  y: number;
  isBlockedByFly: boolean;
  flyId?: string;
  sipRequired: boolean;
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
  level: number;
  dumplingsLeft: number;
  dumplingsEatenThisLevel: number;
  sipNeeded: boolean;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        requestFullscreen?: () => void;
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        onEvent?: (eventType: string, callback: () => void) => void;
        viewportHeight?: number;
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

