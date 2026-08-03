import React, { useEffect, useRef, useState } from 'react';
import { Fly, FlyType, Particle, GameStats, ChopstickConfig } from '../types';
import { audio, getAssetUrl } from '../utils/audio';
import { CHOPSTICK_STYLES } from './SettingsModal';
import { Capacitor } from '@capacitor/core';

export const isMobileOrTouchDevice = (): boolean => {
  if (Capacitor.isNativePlatform()) return true;
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.platform) {
    const p = window.Telegram.WebApp.platform;
    if (p === 'android' || p === 'ios' || p === 'mobile') return true;
  }
  const hasTouch = typeof window !== 'undefined' && ('ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0));
  const isMobileUA = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  return hasTouch || isMobileUA;
};

interface GameCanvasProps {
  isPlaying: boolean;
  gameMode: 'arcade' | 'zen' | 'training';
  difficulty: 'easy' | 'normal' | 'hard';
  chopstickStyleId: string;
  showHelper: boolean;
  soundEnabled: boolean;
  layoutMode?: 'original' | 'triangular';
  onGameEnd: (stats: GameStats) => void;
  onStatsUpdate: (stats: GameStats) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  isPlaying,
  gameMode,
  difficulty,
  chopstickStyleId,
  showHelper,
  soundEnabled,
  layoutMode = 'original',
  onGameEnd,
  onStatsUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Core gameplay states in refs to bypass closures in animation loop
  const mouseRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2, isPinching: false });
  const chopstickTipRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2, separation: 24 });
  const fliesRef = useRef<Fly[]>([]);
  
  // Mobile virtual controls
  const joystickRef = useRef({ active: false, id: -1, baseX: 0, baseY: 0, thumbX: 0, thumbY: 0 });
  const actionButtonRef = useRef({ active: false, id: -1 });
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<{ id: string; x: number; y: number; text: string; color: string; life: number; maxLife: number }[]>([]);
  const timeScaleRef = useRef(1.0);

  const setFlyCatchable = (flyId: string, catchable: boolean) => {
    fliesRef.current = fliesRef.current.map((f) => {
      if (f.id === flyId) {
        return { ...f, isCatchable: catchable };
      }
      return f;
    });
  };

  // Cinematic Camera Zoom and Spawn Tracking
  const currentZoom = useRef(1.0);
  const currentCenterX = useRef(window.innerWidth / 2);
  const currentCenterY = useRef(window.innerHeight / 2);
  const hasZoomedThisSession = useRef(false);
  const isZoomActiveRef = useRef(false);
  const hasSpawnedNinjaThisSession = useRef(false);
  const ninjaSpawnedLevelsRef = useRef<Set<number>>(new Set());

  const autoCaptureRef = useRef<{
    active: boolean;
    phase: 'approaching' | 'grabbing' | 'carrying' | 'releasing' | 'exiting';
    flyId: string;
    startTime: number;
    startPos: { x: number; y: number };
    targetPos: { x: number; y: number };
  } | null>(null);
  
  // Game Stats Tracking
  const statsRef = useRef<GameStats>({
    score: 0,
    fliesCaught: 0,
    totalAttempts: 0,
    accuracy: 100,
    combo: 0,
    maxCombo: 0,
    gameTimeRemaining: 60,
    fliesTypeCount: { housefly: 0, bluebottle: 0, fruitfly: 0, golden: 0, ninja: 0 },
  });

  // Dumpling Feast & Tea Sip Game State Refs
  const currentLevelRef = useRef(1);
  const dumplingsEatenThisLevelRef = useRef(0);
  const dumplingsEatenSinceLastDrinkRef = useRef(0);
  const sipNeededRef = useRef(false);

  const dumplingsRef = useRef<{
    id: string;
    x: number;
    y: number;
    origX: number;
    origY: number;
    isEaten: boolean;
    isBlockedByFly: boolean;
    flyId?: string;
  }[]>([]);

  // Image Asset Refs
  const dumplingImgRef = useRef<HTMLImageElement | null>(null);
  const drinkImgRef = useRef<HTMLImageElement | null>(null);
  const mouthImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const dImg = new Image();
    dImg.src = getAssetUrl('dumpling.jpg');
    dImg.onload = () => { dumplingImgRef.current = dImg; };

    const drImg = new Image();
    drImg.src = getAssetUrl('drink.jpg');
    drImg.onload = () => { drinkImgRef.current = drImg; };

    const mImg = new Image();
    mImg.src = getAssetUrl('mouth.jpg');
    mImg.onload = () => { mouthImgRef.current = mImg; };
  }, []);

  const teaRef = useRef<{
    x: number;
    y: number;
    origX: number;
    origY: number;
    radius: number;
    isBlockedByFly: boolean;
    flyId?: string;
  }>({
    x: window.innerWidth * 0.18,
    y: window.innerHeight * 0.68,
    origX: window.innerWidth * 0.18,
    origY: window.innerHeight * 0.68,
    radius: 45,
    isBlockedByFly: false,
  });

  const mouthRef = useRef<{
    x: number;
    y: number;
    radius: number;
    isOpen: boolean;
  }>({
    x: window.innerWidth * 0.82,
    y: window.innerHeight * 0.65,
    radius: 75,
    isOpen: false,
  });

  const dragItemRef = useRef<{
    type: 'dumpling' | 'tea';
    id?: string;
    index?: number;
    startX: number;
    startY: number;
  } | null>(null);

  const zoomTargetRef = useRef<{
    type: 'dumpling' | 'tea';
    id: string;
    x: number;
    y: number;
  } | null>(null);

  // Plate state for Dumpling Feast
  const plateRef = useRef({
    x: window.innerWidth / 2,
    y: window.innerHeight * 0.70,
    hp: 100,
    active: true,
    radius: 95,
  });

  const initLevelDumplings = (level: number) => {
    const totalCount = level === 1 ? 5 : 5 + (level - 1) * 2;
    const plateX = plateRef.current.x;
    const plateY = plateRef.current.y;
    const plateRadius = plateRef.current.radius || 95;

    const list = [];
    for (let i = 0; i < totalCount; i++) {
      const angle = (i / totalCount) * Math.PI * 2;
      const dx = Math.cos(angle) * (totalCount > 6 ? plateRadius * 0.45 : plateRadius * 0.36);
      const dy = Math.sin(angle) * (totalCount > 6 ? plateRadius * 0.26 : plateRadius * 0.20);
      list.push({
        id: `dumpling_${level}_${i}`,
        x: plateX + dx,
        y: plateY + dy - 8,
        origX: plateX + dx,
        origY: plateY + dy - 8,
        isEaten: false,
        isBlockedByFly: false,
      });
    }
    dumplingsRef.current = list;
    dumplingsEatenThisLevelRef.current = 0;
    dumplingsEatenSinceLastDrinkRef.current = 0;
    sipNeededRef.current = false;
    plateRef.current.hp = 100;

    if (teaRef.current) {
      teaRef.current.x = teaRef.current.origX;
      teaRef.current.y = teaRef.current.origY;
      teaRef.current.isBlockedByFly = false;
      teaRef.current.flyId = undefined;
    }
  };

  // Release Window state
  const releaseWindowRef = useRef({
    x: window.innerWidth / 2,
    y: 80,
    radius: 55,
  });

  // State to sync with React UI occasionally
  const [frenzyActive, setFrenzyActive] = useState(false);
  const frenzyTimerRef = useRef<number | null>(null);
  const spawnTimerRef = useRef<number | null>(null);
  const secondTimerRef = useRef<number | null>(null);

  // Difficulty settings
  const getDifficultySettings = () => {
    switch (difficulty) {
      case 'easy':
        return { hitRadius: 28, flySpeedMult: 0.7, escapeDist: 90 };
      case 'hard':
        return { hitRadius: 15, flySpeedMult: 1.45, escapeDist: 160 };
      case 'normal':
      default:
        return { hitRadius: 22, flySpeedMult: 1.0, escapeDist: 125 };
    }
  };

  const selectedChopstick = CHOPSTICK_STYLES.find(s => s.id === chopstickStyleId) || CHOPSTICK_STYLES[0];

  // Helper to calculate distance
  const getDistance = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Create a new Fly
  const createFly = (type?: FlyType, customX?: number, customY?: number): Fly => {
    const types: FlyType[] = ['housefly', 'bluebottle', 'fruitfly'];
    
    // Spawn rare flies based on randomness
    let flyType: FlyType = type || types[Math.floor(Math.random() * types.length)];
    if (!type) {
      const rand = Math.random();
      if (rand < 0.05) {
        flyType = 'ninja';
      } else if (rand < 0.12) {
        flyType = 'golden';
      }
    }

    const canvas = canvasRef.current;
    const width = canvas ? canvas.width : window.innerWidth;
    const height = canvas ? canvas.height : window.innerHeight;

    // Spawn around margins
    let x = customX !== undefined ? customX : Math.random() * width;
    let y = customY !== undefined ? customY : Math.random() * height;

    if (customX === undefined && customY === undefined) {
      if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? -30 : width + 30;
        y = Math.random() * height;
      } else {
        x = Math.random() * width;
        y = Math.random() < 0.5 ? -30 : height + 30;
      }
    }

    // Config spec per fly type
    let size = 12;
    let speed = 2.4;
    let twitchiness = 0.12;
    let points = 100;
    let buzzPitch = 120;
    let color = '#404040';
    let wingColor = 'rgba(240, 240, 240, 0.7)';

    switch (flyType) {
      case 'bluebottle':
        size = 18;
        speed = 1.6;
        twitchiness = 0.08;
        points = 200;
        buzzPitch = 85;
        color = '#1e3a8a';
        wingColor = 'rgba(224, 242, 254, 0.65)';
        break;
      case 'fruitfly':
        size = 8;
        speed = 3.6;
        twitchiness = 0.25;
        points = 350;
        buzzPitch = 165;
        color = '#b45309';
        wingColor = 'rgba(254, 243, 199, 0.7)';
        break;
      case 'golden':
        size = 14;
        speed = 4.2;
        twitchiness = 0.22;
        points = 1000;
        buzzPitch = 135;
        color = '#eab308';
        wingColor = 'rgba(254, 252, 232, 0.8)';
        break;
      case 'ninja':
        size = 15;
        speed = 3.0;
        twitchiness = 0.05;
        points = 1500;
        buzzPitch = 110;
        color = '#a855f7';
        wingColor = 'rgba(232, 218, 250, 0.7)';
        break;
    }

    const newFly: Fly = {
      id: Math.random().toString(),
      type: flyType,
      x,
      y,
      vx: (Math.random() - 0.5) * speed,
      vy: (Math.random() - 0.5) * speed,
      size,
      speed,
      twitchiness,
      points,
      angle: Math.random() * Math.PI * 2,
      wingAngle: 0,
      wingSpeed: 0.5 + Math.random() * 0.4,
      buzzPitch,
      color,
      wingColor,
      isCaught: false,
      state: 'flying',
      isCatchable: true,
    };

    if (flyType === 'ninja') {
      newFly.isCatchable = false;
      newFly.narrativeStartTime = Date.now();

      // Trigger bullet time slow motion
      timeScaleRef.current = 0.35;

      const timeoutId = setTimeout(() => {
        setFlyCatchable(newFly.id, true);
        timeScaleRef.current = 1.0;
      }, 21000);

      audio.playNinjaClipForLevel(currentLevelRef.current, () => {
        clearTimeout(timeoutId);
        setFlyCatchable(newFly.id, true);
        timeScaleRef.current = 1.0;
      });
    }

    return newFly;
  };

  // Trigger high-value particles
  const createCaptureParticles = (x: number, y: number, color: string, count = 15) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      particlesRef.current.push({
        id: Math.random().toString(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 2 + Math.random() * 5,
        alpha: 1.0,
        life: 0,
        maxLife: 30 + Math.random() * 20,
      });
    }
  };

  const createSparkles = (x: number, y: number, color = '#fef08a', count = 3) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 1.0;
      particlesRef.current.push({
        id: Math.random().toString(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 1.5 + Math.random() * 2.5,
        alpha: 0.8,
        life: 0,
        maxLife: 15 + Math.random() * 15,
      });
    }
  };

  // Trigger floating numbers / letters
  const addFloatingText = (x: number, y: number, text: string, color = '#ebdcb9') => {
    floatingTextsRef.current.push({
      id: Math.random().toString(),
      x,
      y: y - 10,
      text,
      color,
      life: 0,
      maxLife: 45,
    });
  };

  // Safely release a caught fly out the garden window
  const releaseFlyToFreedom = (fly: Fly) => {
    if (!fly.isCaught || fly.state === 'releasing') return;

    fly.isCaught = false;
    fly.state = 'releasing';
    
    const stats = statsRef.current;
    
    // Increment stats
    stats.fliesCaught++;
    stats.combo++;
    stats.fliesTypeCount[fly.type]++;
    if (stats.combo > stats.maxCombo) {
      stats.maxCombo = stats.combo;
    }

    // Combo Multiplier logic
    const comboMult = Math.min(5, Math.ceil(stats.combo / 4));
    const pointEarned = fly.points * comboMult;
    stats.score += pointEarned;

    // Beautiful sparkles at the release moment!
    const rw = releaseWindowRef.current;
    createCaptureParticles(fly.x, fly.y, '#fef08a', 15); // golden sparkles
    createCaptureParticles(rw.x, rw.y, 'rgba(244, 180, 194, 0.9)', 12); // cherry blossom pink sparkles

    // Trigger Floating typography
    const comboText = comboMult > 1 ? ` (x${comboMult} Combo!)` : '';
    addFloatingText(fly.x, fly.y - 15, `Safely Released! 🌸 +${pointEarned}p${comboText}`, '#10b981');

    // Trigger Sounds & Haptics
    if (soundEnabled) {
      if (fly.type === 'golden') {
        audio.playCatch('rare');
        triggerFrenzy();
      } else if (stats.combo % 4 === 0) {
        audio.playCatch('combo');
      } else {
        audio.playCatch('standard');
      }
    }
    
    // Telegram Native Haptic Feedback
    try {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    } catch(e) {}
    
    // Refresh Scoreboards in parent
    stats.accuracy = Math.round((stats.fliesCaught / Math.max(1, stats.totalAttempts)) * 100);
    onStatsUpdate({ ...stats });
  };

  // Game core logic loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;

    const handleResize = () => {
      const w = canvas.parentElement?.clientWidth || window.innerWidth;
      const h = canvas.parentElement?.clientHeight || window.innerHeight;
      canvas.width = w;
      canvas.height = h;

      // Apply Triangular Layout logic for small screens if requested
      if (w < 500 && layoutMode === 'triangular') {
        // Master Mouth top-right
        mouthRef.current.x = w - 80;
        mouthRef.current.y = h * 0.40;
        
        // Matcha Cup top-left
        teaRef.current.x = 80;
        teaRef.current.y = h * 0.40;
        teaRef.current.origX = 80;
        teaRef.current.origY = h * 0.40;
        
        // Plate bottom-center
        plateRef.current.x = w * 0.50;
        plateRef.current.y = h * 0.75;
        
        // Release Window (keep top-center)
        releaseWindowRef.current.x = w * 0.50;
        releaseWindowRef.current.y = Math.max(65, h * 0.12);
      } else {
        // Original layout (Locked to horizontal plane)
        teaRef.current.x = Math.max(90, w * 0.18);
        teaRef.current.y = h * 0.68;
        teaRef.current.origX = Math.max(90, w * 0.18);
        teaRef.current.origY = h * 0.68;

        plateRef.current.x = w * 0.50;
        plateRef.current.y = h * 0.70;

        mouthRef.current.x = Math.min(w - 90, w * 0.82);
        mouthRef.current.y = h * 0.65;

        releaseWindowRef.current.x = w * 0.50;
        releaseWindowRef.current.y = Math.max(65, h * 0.14);
      }

      // Re-position active dumplings relative to the plate center
      if (dumplingsRef.current.length > 0) {
        const totalCount = dumplingsRef.current.length;
        const plateX = plateRef.current.x;
        const plateY = plateRef.current.y;
        const radius = Math.min(36, w * 0.08);

        dumplingsRef.current.forEach((d, i) => {
          const angle = (i / totalCount) * Math.PI * 2;
          const dx = Math.cos(angle) * (totalCount > 6 ? radius : radius * 0.7);
          const dy = Math.sin(angle) * (totalCount > 6 ? radius * 0.5 : radius * 0.35);
          d.origX = plateX + dx;
          d.origY = plateY + dy - 5;
          if (!d.isEaten) {
            d.x = d.origX;
            d.y = d.origY;
          }
        });
      }
    };

    (window as any).onResize = handleResize;
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    handleResize();

    // Spawn 3 initial flies
    fliesRef.current = [
      createFly('housefly'),
      createFly('bluebottle'),
      createFly('fruitfly'),
    ];

    // Main animation ticks
    const renderLoop = () => {
      if (!ctx || !canvas) return;

      const diffSettings = getDifficultySettings();

      // Clear main arena
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const flies = fliesRef.current;
      const cTip = chopstickTipRef.current;
      
      // Proximity zoom trigger for uncatchable Ninja fly
      const ninjaFly = flies.find(f => f.type === 'ninja' && f.isCatchable === false);
      if (ninjaFly && !ninjaFly.isCaught) {
        const dist = getDistance(cTip.x, cTip.y, ninjaFly.x, ninjaFly.y);
        if (dist < 160) {
          if (!hasZoomedThisSession.current) {
            isZoomActiveRef.current = true;
          }
        } else if (dist > 220) {
          if (isZoomActiveRef.current) {
            isZoomActiveRef.current = false;
            hasZoomedThisSession.current = true;
          }
        }
      } else {
        if (isZoomActiveRef.current) {
          isZoomActiveRef.current = false;
          hasZoomedThisSession.current = true;
        }
      }

      // Smooth camera interpolation
      const targetZoom = isZoomActiveRef.current ? 1.25 : 1.0;
      let targetCenterX = canvas.width / 2;
      let targetCenterY = canvas.height / 2;
      if (isZoomActiveRef.current && ninjaFly) {
        targetCenterX = (cTip.x + ninjaFly.x) / 2;
        targetCenterY = (cTip.y + ninjaFly.y) / 2;
      }

      currentZoom.current += (targetZoom - currentZoom.current) * 0.08;
      currentCenterX.current += (targetCenterX - currentCenterX.current) * 0.08;
      currentCenterY.current += (targetCenterY - currentCenterY.current) * 0.08;

      ctx.save();

      if (currentZoom.current > 1.005) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(currentZoom.current, currentZoom.current);
        ctx.translate(-currentCenterX.current, -currentCenterY.current);
      }

      // 1.1. Draw Garden Release Window
      const rw = releaseWindowRef.current;
      ctx.save();
      
      // Outer wooden circular frame shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
      ctx.beginPath();
      ctx.arc(rw.x, rw.y + 4, rw.radius + 6, 0, Math.PI * 2);
      ctx.fill();

      // Sky/Garden background inside the window
      const skyGrad = ctx.createLinearGradient(rw.x, rw.y - rw.radius, rw.x, rw.y + rw.radius);
      skyGrad.addColorStop(0, '#e0f2fe'); // Soft sky blue
      skyGrad.addColorStop(0.5, '#bae6fd');
      skyGrad.addColorStop(1, '#a7f3d0'); // Soft green foliage at the bottom
      ctx.fillStyle = skyGrad;
      ctx.beginPath();
      ctx.arc(rw.x, rw.y, rw.radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw a tiny silhouette of a garden branch or some leaves peeking in
      ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.beginPath();
      ctx.ellipse(rw.x + 20, rw.y + 15, 8, 25, -Math.PI / 4, 0, Math.PI * 2);
      ctx.ellipse(rw.x + 35, rw.y + 5, 6, 18, -Math.PI / 5, 0, Math.PI * 2);
      ctx.fill();

      // Wooden circular frame
      ctx.strokeStyle = '#3f3121'; // Dark wood charcoal/brown
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(rw.x, rw.y, rw.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Shoji gridlines inside window (horizontal and vertical wooden bars)
      ctx.strokeStyle = '#5c4630';
      ctx.lineWidth = 2;
      
      // Horizontal bar
      ctx.beginPath();
      ctx.moveTo(rw.x - rw.radius + 3, rw.y);
      ctx.lineTo(rw.x + rw.radius - 3, rw.y);
      ctx.stroke();

      // Vertical bar
      ctx.beginPath();
      ctx.moveTo(rw.x, rw.y - rw.radius + 3);
      ctx.lineTo(rw.x, rw.y + rw.radius - 3);
      ctx.stroke();

      // Circular inner grid frame for a traditional round window
      ctx.strokeStyle = '#5c4630';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(rw.x, rw.y, rw.radius * 0.5, 0, Math.PI * 2);
      ctx.stroke();

      // Window label text: "RELEASE WINDOW 🌸"
      ctx.fillStyle = '#8c7450';
      ctx.font = 'bold 9px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('RELEASE WINDOW 🌸', rw.x, rw.y + rw.radius + 16);

      ctx.restore();

      // 1. Draw Fizzy Carbonated Soda Tumbler (Left Side)
      const tea = teaRef.current;
      ctx.save();
      
      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.beginPath();
      ctx.ellipse(tea.x, tea.y + 36, 44, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Clear Glass Tumbler Outer Frame
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(tea.x - 30, tea.y - 35, 60, 70, 10);
      ctx.fill();
      ctx.stroke();

      // 3/4 Full Fizzy Yellow-Orange Beverage Liquid
      const drinkGrad = ctx.createLinearGradient(tea.x, tea.y - 18, tea.x, tea.y + 30);
      drinkGrad.addColorStop(0, '#f97316'); // Orange top
      drinkGrad.addColorStop(1, '#eab308'); // Yellowish bottom
      ctx.fillStyle = drinkGrad;
      ctx.beginPath();
      ctx.roundRect(tea.x - 26, tea.y - 15, 52, 48, [0, 0, 8, 8]);
      ctx.fill();

      // Ice Cubes floating
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.fillRect(tea.x - 14, tea.y - 10, 14, 14);
      ctx.strokeRect(tea.x - 14, tea.y - 10, 14, 14);
      ctx.fillRect(tea.x + 2, tea.y - 5, 12, 12);
      ctx.strokeRect(tea.x + 2, tea.y - 5, 12, 12);

      // Carbonation Bubbles rising
      const bubbleTime = Date.now() * 0.005;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      for (let b = 0; b < 6; b++) {
        const bx = tea.x - 18 + ((b * 7) % 36);
        const by = tea.y + 25 - ((bubbleTime * 20 + b * 15) % 38);
        ctx.beginPath();
        ctx.arc(bx, by, (b % 3) + 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Glass Image overlay if loaded
      if (drinkImgRef.current) {
        ctx.globalAlpha = 0.35;
        ctx.drawImage(drinkImgRef.current, tea.x - 30, tea.y - 35, 60, 70);
        ctx.globalAlpha = 1.0;
      }

      // Label
      ctx.fillStyle = '#6e5d4a';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('FIZZY SODA 🥤', tea.x, tea.y + 52);

      // Sip Needed Glowing Pulse & Speech Bubble Prompt
      if (sipNeededRef.current) {
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(tea.x, tea.y, 42 + Math.sin(Date.now() * 0.008) * 5, 48 + Math.sin(Date.now() * 0.008) * 5, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Speech Bubble
        ctx.fillStyle = '#ffedd5';
        ctx.strokeStyle = '#c2410c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(tea.x - 60, tea.y - 70, 120, 24, 6);
        } else {
          ctx.rect(tea.x - 60, tea.y - 70, 120, 24);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#7c2d12';
        ctx.font = 'bold 10px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('Take a sip! 🥤', tea.x, tea.y - 54);
      }
      ctx.restore();

      // 1.2 Draw Dumpling Steamer Plate & Feast Health Ring (Center)
      const plate = plateRef.current;
      ctx.save();

      // Bamboo Steamer Plate Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.beginPath();
      ctx.ellipse(plate.x, plate.y + 20, plate.radius, plate.radius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bamboo Steamer Plate Base
      ctx.fillStyle = '#d4a373';
      ctx.strokeStyle = '#8b5a2b';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(plate.x, plate.y, plate.radius, plate.radius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Plate Inner Rim
      ctx.strokeStyle = '#faedcd';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(plate.x, plate.y, plate.radius * 0.88, plate.radius * 0.38, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Circular Feast Integrity Gauge Ring
      const hpPercent = Math.max(0, plate.hp / 100);
      const ringRadiusX = plate.radius + 14;
      const ringRadiusY = (plate.radius + 14) * 0.45;

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(plate.x, plate.y, ringRadiusX, ringRadiusY, 0, 0, Math.PI * 2);
      ctx.stroke();

      const hpColor = plate.hp > 50 ? '#10b981' : plate.hp > 25 ? '#f59e0b' : '#ef4444';
      ctx.strokeStyle = hpColor;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(plate.x, plate.y, ringRadiusX, ringRadiusY, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpPercent);
      ctx.stroke();

      // Label
      ctx.fillStyle = '#6e5d4a';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`FEAST INTEGRITY: ${Math.ceil(plate.hp)}% 🥟`, plate.x, plate.y + 55);

      // Render Dumplings on Plate
      dumplingsRef.current.forEach((d) => {
        if (d.isEaten) return;

        ctx.save();
        // Dumpling Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.beginPath();
        ctx.ellipse(d.x, d.y + 8, 16, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Render generated Dumpling Image Asset if available
        if (dumplingImgRef.current) {
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(d.x, d.y, 18, 13, 0, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(dumplingImgRef.current, d.x - 20, d.y - 15, 40, 30);
          ctx.restore();

          ctx.strokeStyle = '#d7b99c';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(d.x, d.y, 18, 13, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Dumpling Body fallback
          ctx.fillStyle = '#fffdf5';
          ctx.strokeStyle = '#e6ccb2';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(d.x, d.y, 18, 13, -0.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        ctx.restore();
      });
      ctx.restore();

      // 1.3 Draw Master Mouth Target (Right Side)
      const mouth = mouthRef.current;
      ctx.save();

      const mouthRadius = mouth.isOpen ? mouth.radius * 1.15 : mouth.radius;

      // Outer Wooden Target Ring
      ctx.strokeStyle = mouth.isOpen ? '#eab308' : '#78350f';
      ctx.lineWidth = mouth.isOpen ? 6 : 4;
      ctx.fillStyle = mouth.isOpen ? 'rgba(254, 240, 138, 0.3)' : 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.arc(mouth.x, mouth.y, mouthRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Render generated Mouth Image Asset inside frame if available
      if (mouthImgRef.current) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(mouth.x, mouth.y, mouthRadius - 4, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(mouthImgRef.current, mouth.x - mouthRadius, mouth.y - mouthRadius, mouthRadius * 2, mouthRadius * 2);
        ctx.restore();
      } else {
        // Mouth Graphic Fallback
        ctx.fillStyle = mouth.isOpen ? '#991b1b' : '#7f1d1d';
        ctx.beginPath();
        if (mouth.isOpen) {
          ctx.ellipse(mouth.x, mouth.y, 30, 24, 0, 0, Math.PI * 2);
        } else {
          ctx.arc(mouth.x, mouth.y - 5, 25, 0.1, Math.PI - 0.1);
        }
        ctx.fill();
      }

      // Label
      ctx.fillStyle = '#6e5d4a';
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('MASTER 👄', mouth.x, mouth.y + mouthRadius + 20);

      ctx.restore();

      // Render Item Currently Being Dragged by Mouse
      if (dragItemRef.current) {
        const drag = dragItemRef.current;
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;

        ctx.save();
        if (drag.type === 'dumpling') {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
          ctx.beginPath();
          ctx.ellipse(mx, my + 10, 16, 7, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#fffdf5';
          ctx.strokeStyle = '#e6ccb2';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(mx, my, 16, 12, -0.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = '#d7b99c';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(mx - 8, my - 2);
          ctx.quadraticCurveTo(mx, my - 6, mx + 8, my - 2);
          ctx.stroke();
        } else if (drag.type === 'tea') {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
          ctx.beginPath();
          ctx.ellipse(mx, my + 16, 28, 10, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#2d4a27';
          ctx.strokeStyle = '#ebdcb9';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(mx, my, 24, 16, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#4ade80';
          ctx.beginPath();
          ctx.ellipse(mx, my - 2, 19, 11, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 2. Interpolate Chopsticks position (smooth trailing physics)
      const mouse = mouseRef.current;

      if (isMobileOrTouchDevice() && autoCaptureRef.current?.active) {
        const ac = autoCaptureRef.current;
        const now = Date.now();
        const elapsed = now - ac.startTime;
        const targetFly = fliesRef.current.find(f => f.id === ac.flyId);

        if (ac.phase === 'approaching') {
          if (targetFly) {
            ac.targetPos = { x: targetFly.x, y: targetFly.y };
          }
          const t = Math.min(1, elapsed / 300);
          const easeT = t * t * (3 - 2 * t);
          cTip.x = ac.startPos.x + (ac.targetPos.x - ac.startPos.x) * easeT;
          cTip.y = ac.startPos.y + (ac.targetPos.y - ac.startPos.y) * easeT;
          mouse.isPinching = false;

          if (elapsed >= 300) {
            ac.phase = 'grabbing';
            ac.startTime = now;
          }
        } else if (ac.phase === 'grabbing') {
          mouse.isPinching = true;
          cTip.x = ac.targetPos.x;
          cTip.y = ac.targetPos.y;

          if (targetFly && !targetFly.isCaught) {
            targetFly.isCaught = true;
            targetFly.state = 'flying';
            targetFly.caughtTime = now;
            audio.playClack();
            createCaptureParticles(targetFly.x, targetFly.y, targetFly.color);
            addFloatingText(targetFly.x, targetFly.y, "Captured! 🥢", "#10b981");

            // Unblock food if fly was landed
            if (targetFly.landingTargetId) {
              const d = dumplingsRef.current.find(item => item.id === targetFly.landingTargetId);
              if (d) d.isBlockedByFly = false;
              if (teaRef.current.flyId === targetFly.id) {
                teaRef.current.isBlockedByFly = false;
                teaRef.current.flyId = undefined;
              }
            }
          }

          if (elapsed >= 150) {
            ac.phase = 'carrying';
            ac.startTime = now;
            ac.startPos = { x: cTip.x, y: cTip.y };
            ac.targetPos = { x: releaseWindowRef.current.x, y: releaseWindowRef.current.y };
          }
        } else if (ac.phase === 'carrying') {
          const t = Math.min(1, elapsed / 400);
          const easeT = t * t * (3 - 2 * t);
          cTip.x = ac.startPos.x + (ac.targetPos.x - ac.startPos.x) * easeT;
          cTip.y = ac.startPos.y + (ac.targetPos.y - ac.startPos.y) * easeT;
          mouse.isPinching = true;

          if (targetFly) {
            targetFly.x = cTip.x;
            targetFly.y = cTip.y;
          }

          if (elapsed >= 400) {
            ac.phase = 'releasing';
            ac.startTime = now;
          }
        } else if (ac.phase === 'releasing') {
          mouse.isPinching = false;
          if (targetFly && targetFly.isCaught) {
            releaseFlyToFreedom(targetFly);
          }
          if (elapsed >= 150) {
            ac.phase = 'exiting';
            ac.startTime = now;
            ac.startPos = { x: cTip.x, y: cTip.y };
            ac.targetPos = { x: canvas.width / 2, y: canvas.height + 100 };
          }
        } else if (ac.phase === 'exiting') {
          const t = Math.min(1, elapsed / 200);
          cTip.x = ac.startPos.x + (ac.targetPos.x - ac.startPos.x) * t;
          cTip.y = ac.startPos.y + (ac.targetPos.y - ac.startPos.y) * t;

          if (elapsed >= 200) {
            autoCaptureRef.current = null;
          }
        }
      } else {
        cTip.x += (mouse.x - cTip.x) * 0.45 * timeScaleRef.current;
        cTip.y += (mouse.y - cTip.y) * 0.45 * timeScaleRef.current;
      }

      // Animate clamp separation gap
      const targetSep = mouse.isPinching ? 1.5 : 24;
      cTip.separation += (targetSep - cTip.separation) * 0.55;

      // 3. Update & Draw Fly entities

      fliesRef.current = flies.map((fly) => {
        const rw = releaseWindowRef.current;

        const isNarratingNinja = fly.type === 'ninja' && fly.isCatchable === false && fly.narrativeStartTime;

        if (fly.state === 'releasing') {
          // Animate fly flying away into the window
          fly.x += (rw.x - fly.x) * 0.15 * timeScaleRef.current;
          fly.y += (rw.y - fly.y) * 0.15 * timeScaleRef.current;
          fly.vx = 0;
          fly.vy = 0;
          fly.size *= 0.88; // shrink as it recedes
          fly.wingAngle += 1.2 * timeScaleRef.current; // buzz wings frantically to fly away!
          
          if (Math.random() < 0.25) {
            createSparkles(fly.x, fly.y, 'rgba(254, 240, 138, 0.8)', 1);
          }
        } else if (fly.isCaught) {
          // Locked to chopsticks tip
          fly.x = cTip.x;
          fly.y = cTip.y;
          fly.vx = 0;
          fly.vy = 0;

          // Check if fly has been successfully guided inside the window zone
          const distToWindow = getDistance(fly.x, fly.y, rw.x, rw.y);
          if (distToWindow <= rw.radius + 15) {
            releaseFlyToFreedom(fly);
          }
        } else if (isNarratingNinja) {
          // Scripted flight path during narration (21 seconds)
          const elapsed = Date.now() - (fly.narrativeStartTime || 0);
          
          const width = canvas.width;
          const height = canvas.height;
          const centerX = width / 2;
          const centerY = height / 2;

          if (elapsed < 2000) {
            // Phase 1 (0-2s): Entering room
            // Fly from bottom-left corner to center
            const t = elapsed / 2000;
            const targetX = centerX - width * 0.4 * (1 - t);
            const targetY = centerY + height * 0.4 * (1 - t);
            fly.vx = (targetX - fly.x) * 0.15;
            fly.vy = (targetY - fly.y) * 0.15;
          } else if (elapsed < 4000) {
            // Phase 2 (2-4s): Hovering / coming in
            // Small wiggle near the center
            const wiggleT = (elapsed - 2000) * 0.005;
            const targetX = centerX + Math.sin(wiggleT * 5) * 15;
            const targetY = centerY + Math.cos(wiggleT * 3) * 10;
            fly.vx = (targetX - fly.x) * 0.1;
            fly.vy = (targetY - fly.y) * 0.1;
          } else if (elapsed < 7000) {
            // Phase 3 (4-7s): Flying all over the place
            // Erratic zig-zagging movements
            const zigT = elapsed - 4000;
            const ampX = width * 0.35;
            const ampY = height * 0.3;
            const targetX = centerX + Math.sin(zigT * 0.008) * Math.cos(zigT * 0.003) * ampX;
            const targetY = centerY + Math.cos(zigT * 0.007) * Math.sin(zigT * 0.004) * ampY;
            fly.vx = (targetX - fly.x) * 0.2;
            fly.vy = (targetY - fly.y) * 0.2;
          } else if (elapsed < 13000) {
            // Phase 4 (7-13s): Figure of Eight
            const scaleX = width * 0.25;
            const scaleY = height * 0.2;
            const angleVal = ((elapsed - 7000) / 6000) * Math.PI * 2;
            const targetX = centerX + scaleX * Math.sin(angleVal);
            const targetY = centerY + scaleY * Math.sin(2 * angleVal) / 2;
            fly.vx = (targetX - fly.x) * 0.12;
            fly.vy = (targetY - fly.y) * 0.12;
          } else if (elapsed < 16000) {
            // Phase 5 (13-16s): Going quite straight
            const lineT = (elapsed - 13000) / 3000;
            const targetX = centerX + (width * 0.3) * lineT;
            const targetY = centerY - (height * 0.35) * lineT;
            fly.vx = (targetX - fly.x) * 0.15;
            fly.vy = (targetY - fly.y) * 0.15;
          } else if (elapsed < 19000) {
            // Phase 6 (16-19s): Doing right angles
            const rightAngleT = elapsed - 16000;
            const startX = centerX + width * 0.3;
            const startY = centerY - height * 0.35;
            let targetX = startX;
            let targetY = startY;

            if (rightAngleT < 1500) {
              const t = rightAngleT / 1500;
              targetY = startY + (height * 0.5) * t;
            } else {
              const t = (rightAngleT - 1500) / 1500;
              targetY = startY + height * 0.5;
              targetX = startX - (width * 0.65) * t;
            }
            fly.vx = (targetX - fly.x) * 0.2;
            fly.vy = (targetY - fly.y) * 0.2;
          } else {
            // Phase 7 (19-21s): Victory lap / Look at me
            const circleT = elapsed - 19000;
            const radius = Math.min(width, height) * 0.15;
            const speedScale = 0.007;
            const targetX = centerX + Math.cos(circleT * speedScale) * radius;
            const targetY = centerY + Math.sin(circleT * speedScale) * radius;
            fly.vx = (targetX - fly.x) * 0.15;
            fly.vy = (targetY - fly.y) * 0.15;
          }

          fly.x += fly.vx * timeScaleRef.current;
          fly.y += fly.vy * timeScaleRef.current;

          if (Math.abs(fly.vx) > 0.1 || Math.abs(fly.vy) > 0.1) {
            fly.angle = Math.atan2(fly.vy, fly.vx) + Math.PI / 2;
          }

          if (Math.random() < 0.3) {
            createSparkles(fly.x, fly.y, 'rgba(168, 85, 247, 0.6)', 1);
          }
        } else {
          // Proximity calculation for escape reaction
          const distToChopstick = getDistance(fly.x, fly.y, cTip.x, cTip.y);

        // State Machine Fly Behavior
        const speedMultiplier = diffSettings.flySpeedMult * (frenzyActive ? 1.35 : 1.0);

        // FEAST GUARD MODE: pull towards dumpling center
        if (gameMode === 'training' && plateRef.current.hp > 0) {
          const distToPlate = getDistance(fly.x, fly.y, plateRef.current.x, plateRef.current.y);
          if (distToPlate < plateRef.current.radius) {
            // Resting on plate, eating
            fly.state = 'resting';
            fly.vx *= 0.8;
            fly.vy *= 0.8;

            // Damage the feast integrity while landed
            plateRef.current.hp = Math.max(0, plateRef.current.hp - 0.14 * timeScaleRef.current);

            // Chomp particle text occasionally
            if (Math.random() < 0.012) {
              addFloatingText(fly.x, fly.y - 12, 'Chomp!', '#ef4444');
            }
          } else if (fly.state !== 'escaping') {
            // Gently steer towards dumpling plate
            const steerX = plateRef.current.x - fly.x;
            const steerY = plateRef.current.y - fly.y;
            const len = Math.sqrt(steerX * steerX + steerY * steerY);
            fly.vx += (steerX / len) * 0.08 * speedMultiplier;
            fly.vy += (steerY / len) * 0.08 * speedMultiplier;
          }
        }

        // ESCAPE FLIGHT behavior (if chopsticks get too close without pinching)
        if (distToChopstick < diffSettings.escapeDist && !mouse.isPinching && fly.state !== 'resting') {
          fly.state = 'escaping';
          const dx = fly.x - cTip.x;
          const dy = fly.y - cTip.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          
          // Steer dramatically in the opposite direction
          fly.vx += (dx / len) * 0.65 * speedMultiplier;
          fly.vy += (dy / len) * 0.65 * speedMultiplier;
          
          if (Math.random() < 0.1) {
            createSparkles(fly.x, fly.y, 'rgba(255, 0, 0, 0.2)', 1);
          }
        } else if (fly.state === 'escaping' && distToChopstick > diffSettings.escapeDist * 1.5) {
          // Escape complete, return to normal flight
          fly.state = 'flying';
        }

        // Landing target steering and touchdown logic
        if (fly.landingTargetId && fly.state !== 'escaping' && !fly.isCaught) {
          let targetPos: { x: number; y: number } | null = null;
          if (fly.landingTargetId === 'tea') {
            targetPos = { x: teaRef.current.x, y: teaRef.current.y - 12 };
          } else {
            const d = dumplingsRef.current.find(item => item.id === fly.landingTargetId);
            if (d && !d.isEaten) {
              targetPos = { x: d.x, y: d.y };
            }
          }

          if (targetPos) {
            const distToTarget = getDistance(fly.x, fly.y, targetPos.x, targetPos.y);
            if (distToTarget < 22) {
              // Touchdown on item
              fly.state = 'resting';
              fly.vx *= 0.5;
              fly.vy *= 0.5;
              if (fly.landingTargetId === 'tea') {
                teaRef.current.isBlockedByFly = true;
                fly.landingType = 'tea';
              } else {
                const d = dumplingsRef.current.find(item => item.id === fly.landingTargetId);
                if (d) {
                  d.isBlockedByFly = true;
                  fly.landingType = 'dumpling';
                }
              }
            } else if (fly.state !== 'resting') {
              // Gently steer towards landing spot
              const dx = targetPos.x - fly.x;
              const dy = targetPos.y - fly.y;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              fly.vx += (dx / len) * 0.14 * speedMultiplier;
              fly.vy += (dy / len) * 0.14 * speedMultiplier;
            }
          }
        }

        // If fly is escaping, unblock any item it was landed on
        if (fly.state === 'escaping' && fly.landingTargetId) {
          if (fly.landingTargetId === 'tea') {
            teaRef.current.isBlockedByFly = false;
            teaRef.current.flyId = undefined;
          } else {
            const d = dumplingsRef.current.find(item => item.id === fly.landingTargetId);
            if (d) {
              d.isBlockedByFly = false;
              d.flyId = undefined;
            }
          }
          fly.landingTargetId = undefined;
          fly.landingType = undefined;
        }

        // Buzz flight jitter mechanics
        if (fly.state === 'flying') {
          if (Math.random() < fly.twitchiness) {
            // sudden vector change
            const theta = Math.random() * Math.PI * 2;
            const impulse = 1.0 + Math.random() * 2.2;
            fly.vx += Math.cos(theta) * impulse * speedMultiplier;
            fly.vy += Math.sin(theta) * impulse * speedMultiplier;
          }
        } else if (fly.state === 'hovering') {
          // Small sinus circular dance
          const t = Date.now() * 0.015;
          fly.vx += Math.sin(t) * 0.15;
          fly.vy += Math.cos(t) * 0.15;
          
          if (Math.random() < 0.04) {
            fly.state = 'flying';
          }
        }

        // Apply friction/drag to keep velocities bounded
        const drag = fly.state === 'escaping' ? 0.94 : 0.88;
        fly.vx *= drag;
        fly.vy *= drag;

        // Clip speed maximum
        const maxSpeed = fly.state === 'escaping' ? fly.speed * 2.5 : fly.speed * 1.4;
        const currentSpeed = Math.sqrt(fly.vx * fly.vx + fly.vy * fly.vy) || 1;
        if (currentSpeed > maxSpeed) {
          fly.vx = (fly.vx / currentSpeed) * maxSpeed;
          fly.vy = (fly.vy / currentSpeed) * maxSpeed;
        }

        // Apply position update
        fly.x += fly.vx * timeScaleRef.current;
        fly.y += fly.vy * timeScaleRef.current;

        // Wall collisions / bounce mechanics
        const pad = 20;
        if (fly.x < pad) { fly.x = pad; fly.vx *= -1; }
        if (fly.x > canvas.width - pad) { fly.x = canvas.width - pad; fly.vx *= -1; }
        if (fly.y < pad) { fly.y = pad; fly.vy *= -1; }
        if (fly.y > canvas.height - pad) { fly.y = canvas.height - pad; fly.vy *= -1; }

        // Dynamic Angle matching travel direction
        if (Math.abs(fly.vx) > 0.1 || Math.abs(fly.vy) > 0.1) {
          fly.angle = Math.atan2(fly.vy, fly.vx) + Math.PI / 2;
        }

        // Golden trails
        if (fly.type === 'golden' && Math.random() < 0.45) {
          createSparkles(fly.x, fly.y, 'rgba(250, 204, 21, 0.6)', 1);
        }
        }

        // Draw Fly Body
        ctx.save();
        ctx.translate(fly.x, fly.y);
        ctx.rotate(fly.angle);

        // Draw custom aura if it is a narrating ninja fly
        if (fly.type === 'ninja' && fly.isCatchable === false) {
          ctx.save();
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.55)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.rotate(Date.now() * 0.0035);
          ctx.beginPath();
          ctx.arc(0, 0, fly.size * 1.8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Fly wings flap oscillation
        fly.wingAngle += fly.wingSpeed * timeScaleRef.current;
        const wingOffset = Math.sin(fly.wingAngle) * 0.6;

        // Draw wings
        ctx.fillStyle = fly.wingColor;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;

        // Left wing
        ctx.save();
        ctx.translate(-fly.size * 0.4, -fly.size * 0.1);
        ctx.rotate(-Math.PI / 4 + wingOffset);
        ctx.beginPath();
        ctx.ellipse(0, -fly.size * 0.7, fly.size * 0.35, fly.size * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Right wing
        ctx.save();
        ctx.translate(fly.size * 0.4, -fly.size * 0.1);
        ctx.rotate(Math.PI / 4 - wingOffset);
        ctx.beginPath();
        ctx.ellipse(0, -fly.size * 0.7, fly.size * 0.35, fly.size * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Draw Fly Legs (legs stick out slightly on larger flies)
        if (fly.size > 10) {
          ctx.strokeStyle = '#262626';
          ctx.lineWidth = 1;
          // Left legs
          ctx.beginPath();
          ctx.moveTo(-2, 0); ctx.lineTo(-fly.size * 0.7, -2);
          ctx.moveTo(-2, 2); ctx.lineTo(-fly.size * 0.7, 3);
          ctx.stroke();
          // Right legs
          ctx.beginPath();
          ctx.moveTo(2, 0); ctx.lineTo(fly.size * 0.7, -2);
          ctx.moveTo(2, 2); ctx.lineTo(fly.size * 0.7, 3);
          ctx.stroke();
        }

        // Draw Thorax / Body
        ctx.fillStyle = fly.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, fly.size * 0.5, fly.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw Abdomen (segmented lines)
        ctx.fillStyle = fly.type === 'golden' ? '#eab308' : '#262626';
        ctx.beginPath();
        ctx.ellipse(0, fly.size * 0.4, fly.size * 0.35, fly.size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw Eyes (compound glowing red eyes)
        ctx.fillStyle = fly.type === 'golden' ? '#ffffff' : fly.type === 'fruitfly' ? '#ea580c' : '#b91c1c';
        ctx.beginPath();
        ctx.arc(-fly.size * 0.25, -fly.size * 0.4, fly.size * 0.18, 0, Math.PI * 2);
        ctx.arc(fly.size * 0.25, -fly.size * 0.4, fly.size * 0.18, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        return fly;
      });

      // Filter out completed releases and spawn replacements
      let replacementsToSpawn = 0;
      fliesRef.current = fliesRef.current.filter((fly) => {
        if (fly.state === 'releasing' && fly.size < 1.5) {
          replacementsToSpawn++;
          return false;
        }
        return true;
      });

      for (let i = 0; i < replacementsToSpawn; i++) {
        fliesRef.current.push(createFly());
      }

      // 4. Update spatial buzzing sound for all flies
      if (soundEnabled && flies.length > 0) {
        const activeFlyIds = new Set<string>();

        flies.forEach((fly) => {
          if (fly.state === 'releasing') {
            audio.stopFlyBuzz(fly.id);
            return;
          }

          let soundCategory: 'flying' | 'landed_drink' | 'landed_dumpling' | 'captured' = 'flying';
          if (fly.isCaught) {
            soundCategory = 'captured';
          } else if (fly.state === 'resting') {
            if (fly.landingType === 'tea') soundCategory = 'landed_drink';
            else if (fly.landingType === 'dumpling') soundCategory = 'landed_dumpling';
          } else if (fly.state === 'flying' || fly.state === 'escaping' || fly.state === 'hovering') {
            soundCategory = 'flying';
          }

          const dist = getDistance(fly.x, fly.y, cTip.x, cTip.y);
          activeFlyIds.add(fly.id);

          let volumeScale = 0;
          if (fly.isCaught) {
            volumeScale = 0.9;
          } else if (fly.state === 'resting') {
            volumeScale = 0.8;
          } else {
            const maxHearingRadius = 320;
            if (dist < maxHearingRadius) {
              volumeScale = 1.0 - (dist / maxHearingRadius);
              if (fly.state === 'escaping') {
                volumeScale *= 1.35;
              }
            }
          }

          const screenPanX = (fly.x - canvas.width / 2) / (canvas.width / 2);

          audio.updateFlyBuzz(fly.id, {
            pitch: fly.state === 'escaping' ? fly.buzzPitch * 1.2 : fly.buzzPitch,
            volumeMultiplier: volumeScale,
            panX: screenPanX,
            isActive: true,
            soundCategory,
          });
        });

        // Clean up any buzzers for flies that no longer exist
        audio.cleanupDeadBuzzers(activeFlyIds);
      } else {
        // No flies, silence all
        audio.clearAllBuzzers();
      }

      // 5. Update & Draw Splash/Dust Particles
      ctx.save();
      particlesRef.current = particlesRef.current.filter((p) => {
        p.life += timeScaleRef.current;
        p.x += p.vx * timeScaleRef.current;
        p.y += p.vy * timeScaleRef.current;
        p.alpha = 1.0 - (p.life / p.maxLife);

        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        return p.life < p.maxLife;
      });
      ctx.restore();

      // 6. Update & Draw Floating Calligraphy Score indicators
      ctx.save();
      floatingTextsRef.current = floatingTextsRef.current.filter((ft) => {
        ft.life += timeScaleRef.current;
        ft.y -= 0.6 * timeScaleRef.current; // float up gently
        const alpha = 1.0 - (ft.life / ft.maxLife);

        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.font = 'bold 15px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);

        return ft.life < ft.maxLife;
      });
      ctx.restore();

      // 7. Draw Chopsticks
      const shouldDrawChopsticks = !isMobileOrTouchDevice() || (autoCaptureRef.current && autoCaptureRef.current.active);
      if (shouldDrawChopsticks) {
        ctx.save();
        // Draw hand-held vector chopsticks aiming down-left towards cTip
        const A1 = -Math.PI / 5.2; // -34 degrees base angle pointing top-right
        const len = selectedChopstick.length;
        
        // Pivot offset where fingers clamp
        const separationY = cTip.separation;

        // Draw shadow first
        ctx.shadowColor = 'rgba(0, 0, 0, 0.06)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = -8;
        ctx.shadowOffsetY = 12;

        // Stick 1: Fixed/Static Lower Stick
        ctx.save();
        ctx.translate(cTip.x, cTip.y);
        ctx.rotate(A1);

        // Draw stick polygon from tip (0, 0) to handle (len, 0)
        ctx.fillStyle = selectedChopstick.color1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(len, -selectedChopstick.gripWidth / 2);
        ctx.lineTo(len, selectedChopstick.gripWidth / 2);
        ctx.closePath();
        ctx.fill();

        // Golden band/Cap accent on Stick 1
        ctx.fillStyle = selectedChopstick.color2;
        ctx.fillRect(len - 45, -selectedChopstick.gripWidth / 2, 8, selectedChopstick.gripWidth);
        ctx.fillRect(len - 15, -selectedChopstick.gripWidth / 2, 15, selectedChopstick.gripWidth);
        ctx.restore();

        // Stick 2: Pivoting Upper Stick
        ctx.save();
        // Translate slightly higher up-left based on separation gap
        const offsetSeparationX = -separationY * Math.sin(A1);
        const offsetSeparationY = separationY * Math.cos(A1);

        ctx.translate(cTip.x + offsetSeparationX, cTip.y + offsetSeparationY);
        // Pivoting rotation meets at tip (separation = 0)
        const stick2Angle = A1 + (separationY * 0.0055);
        ctx.rotate(stick2Angle);

        ctx.fillStyle = selectedChopstick.color1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(len, -selectedChopstick.gripWidth / 2);
        ctx.lineTo(len, selectedChopstick.gripWidth / 2);
        ctx.closePath();
        ctx.fill();

        // Golden band/Cap accent on Stick 2
        ctx.fillStyle = selectedChopstick.color2;
        ctx.fillRect(len - 45, -selectedChopstick.gripWidth / 2, 8, selectedChopstick.gripWidth);
        ctx.fillRect(len - 15, -selectedChopstick.gripWidth / 2, 15, selectedChopstick.gripWidth);

        // Draw metallic glow if custom style supports sparkles
        if (selectedChopstick.hasSparkles && Math.random() < 0.2) {
          createSparkles(cTip.x, cTip.y, selectedChopstick.sparkleColor);
        }

        ctx.restore();
        ctx.restore(); // Shadow clear
      }

      // 8. Draw Aiming Helper Guides (Glowing target reticle)
      if (showHelper && !isMobileOrTouchDevice()) {
        ctx.save();
        ctx.strokeStyle = 'rgba(140, 116, 80, 0.28)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        
        // Inner radius indicator matches actual strike hitbox precisely
        ctx.beginPath();
        ctx.arc(cTip.x, cTip.y, diffSettings.hitRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Crosshairs
        ctx.strokeStyle = 'rgba(140, 116, 80, 0.4)';
        ctx.setLineDash([]);
        ctx.beginPath();
        // center dot
        ctx.arc(cTip.x, cTip.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#8c7450';
        ctx.fill();

        // horizontal lines
        ctx.moveTo(cTip.x - diffSettings.hitRadius - 6, cTip.y);
        ctx.lineTo(cTip.x - diffSettings.hitRadius + 2, cTip.y);
        ctx.moveTo(cTip.x + diffSettings.hitRadius - 2, cTip.y);
        ctx.lineTo(cTip.x + diffSettings.hitRadius + 6, cTip.y);

        // vertical lines
        ctx.moveTo(cTip.x, cTip.y - diffSettings.hitRadius - 6);
        ctx.lineTo(cTip.x, cTip.y - diffSettings.hitRadius + 2);
        ctx.moveTo(cTip.x, cTip.y + diffSettings.hitRadius - 2);
        ctx.lineTo(cTip.x, cTip.y + diffSettings.hitRadius + 6);
        ctx.stroke();

        ctx.restore();
      }

      ctx.restore(); // Balance the camera save
      
      // 9. Draw Mobile Virtual Joystick and Action Hint (Outside camera transform so it stays fixed to screen)
      if (isMobileOrTouchDevice()) {
        if (joystickRef.current.active) {
          ctx.beginPath();
          ctx.arc(joystickRef.current.baseX, joystickRef.current.baseY, 45, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(joystickRef.current.thumbX, joystickRef.current.thumbY, 20, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.fill();
        }

        if (actionButtonRef.current.active) {
          const gradient = ctx.createLinearGradient(canvas.width - 120, 0, canvas.width, 0);
          gradient.addColorStop(0, 'rgba(255,255,255,0)');
          gradient.addColorStop(1, 'rgba(255,255,255,0.12)');
          ctx.fillStyle = gradient;
          ctx.fillRect(canvas.width - 120, 0, 120, canvas.height);
        }
      }

      animFrameId = requestAnimationFrame(renderLoop);
    };

    if (isPlaying) {
      renderLoop();
    }

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrameId);
      audio.stopFlybyNarration();
      audio.clearAllBuzzers();
    };
  }, [isPlaying, gameMode, difficulty, chopstickStyleId, showHelper, soundEnabled, frenzyActive]);

  // Handle Game Input Interactions (Clicks / Touches to PINCH)
  const performPinchStrike = (clientX?: number, clientY?: number) => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    if (clientX !== undefined && clientY !== undefined) {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = clientX - rect.left;
      mouseRef.current.y = clientY - rect.top;
    }

    mouseRef.current.isPinching = true;

    const hitX = mouseRef.current.x;
    const hitY = mouseRef.current.y;

    const diffSettings = getDifficultySettings();
    const flies = fliesRef.current;
    const stats = statsRef.current;

    // Strike Hitbox verification
    const strikeRadius = diffSettings.hitRadius;
    let caughtFlyIndex = -1;

    // Check if player clicked near an uncatchable fly (so we ignore input completely)
    let clickedUncatchable = false;
    for (let i = 0; i < flies.length; i++) {
      const fly = flies[i];
      if (fly.isCatchable === false) {
        const dist = getDistance(hitX, hitY, fly.x, fly.y);
        if (dist <= strikeRadius * 1.5) {
          clickedUncatchable = true;
          break;
        }
      }
    }

    if (clickedUncatchable) {
      return; // Ignore the input completely!
    }

    // Find first fly within hit bounds
    for (let i = 0; i < flies.length; i++) {
      const fly = flies[i];
      if (!fly.isCaught && fly.state !== 'releasing') {
        const dist = getDistance(hitX, hitY, fly.x, fly.y);
        if (dist <= strikeRadius) {
          caughtFlyIndex = i;
          break; // Grab the first one
        }
      }
    }

    stats.totalAttempts++;

    if (caughtFlyIndex !== -1) {
      const fly = flies[caughtFlyIndex];
      fly.isCaught = true;
      fly.caughtTime = Date.now();
      fly.state = 'flying';

      // Unblock food or soda glass instantly when fly is caught!
      if (fly.landingTargetId) {
        if (fly.landingTargetId === 'tea') {
          teaRef.current.isBlockedByFly = false;
          teaRef.current.flyId = undefined;
        } else {
          const d = dumplingsRef.current.find((dum) => dum.id === fly.landingTargetId);
          if (d) {
            d.isBlockedByFly = false;
            d.flyId = undefined;
          }
        }
        fly.landingTargetId = undefined;
      }

      // Sparkle Splashes
      createCaptureParticles(fly.x, fly.y, fly.color, 10);
      createCaptureParticles(fly.x, fly.y, 'rgba(255, 255, 255, 0.8)', 5);

      // Trigger Floating typography
      addFloatingText(fly.x, fly.y - 15, 'Captured! 🥢', '#eab308');

      // Trigger crisp capture clack
      if (soundEnabled) {
        audio.playClack();
      }
    } else {
      // Strike Miss
      stats.combo = 0;
      if (soundEnabled) {
        audio.playClack();
      }
      
      // Floating miss indicator
      addFloatingText(hitX, hitY - 15, 'Clack!', '#a8a29e');
    }

    // Refresh Scoreboards in React parent
    stats.accuracy = Math.round((stats.fliesCaught / Math.max(1, stats.totalAttempts)) * 100);
    onStatsUpdate({ ...stats });
  };

  const handleReleasePinch = () => {
    mouseRef.current.isPinching = false;

    // If there is any fly currently caught, process its release state
    const rw = releaseWindowRef.current;
    const flies = fliesRef.current;

    flies.forEach((fly) => {
      if (fly.isCaught && fly.state !== 'releasing') {
        const distToWindow = getDistance(fly.x, fly.y, rw.x, rw.y);
        if (distToWindow <= rw.radius + 15) {
          // Near the garden window! Safely release out to the garden
          releaseFlyToFreedom(fly);
        } else {
          // Dropped inside the room, flies back away unharmed!
          fly.isCaught = false;
          fly.state = 'flying';
          
          // Give it some initial escape velocity so it moves away instantly
          const angle = Math.random() * Math.PI * 2;
          fly.vx = Math.cos(angle) * fly.speed * 1.5;
          fly.vy = Math.sin(angle) * fly.speed * 1.5;

          if (soundEnabled) {
            audio.playClack();
          }

          addFloatingText(fly.x, fly.y - 15, 'Let go! 💨', '#a8a29e');
        }
      }
    });
  };

  const triggerFrenzy = () => {
    setFrenzyActive(true);
    addFloatingText(window.innerWidth / 2, window.innerHeight / 3, 'GOLDEN FRENZY TIME!', '#eab308');
    
    if (soundEnabled) {
      audio.playSfx('frenzy');
    }

    // Spawn 3 extra juicy flies
    fliesRef.current.push(createFly('fruitfly'));
    fliesRef.current.push(createFly('bluebottle'));
    fliesRef.current.push(createFly('golden'));

    if (frenzyTimerRef.current) clearTimeout(frenzyTimerRef.current);
    frenzyTimerRef.current = window.setTimeout(() => {
      setFrenzyActive(false);
      // Remove excess flies
      if (fliesRef.current.length > 5) {
        fliesRef.current = fliesRef.current.slice(0, 4);
      }
    }, 10000); // 10 seconds of frenzy
  };

  // PC Mouse Handlers for Dragging Dumplings/Tea & Pinching Chopsticks
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isPlaying) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    mouseRef.current.x = mx;
    mouseRef.current.y = my;

    // 1. Check if clicking on a Dumpling
    const dumplings = dumplingsRef.current;
    for (let i = 0; i < dumplings.length; i++) {
      const d = dumplings[i];
      if (!d.isEaten && getDistance(mx, my, d.x, d.y) <= 30) {
        if (d.isBlockedByFly) {
          // Fly landed on dumpling! Snatch fly first to unblock!
          performPinchStrike(e.clientX, e.clientY);
          return;
        } else {
          // Unblocked dumpling -> pick up for drag!
          dragItemRef.current = {
            type: 'dumpling',
            id: d.id,
            index: i,
            startX: mx,
            startY: my,
          };
          return;
        }
      }
    }

    // 2. Check if clicking on Soda Tumbler
    const tea = teaRef.current;
    if (getDistance(mx, my, tea.x, tea.y) <= 45) {
      if (tea.isBlockedByFly) {
        // Fly landed on soda rim! Snatch fly first to unblock!
        performPinchStrike(e.clientX, e.clientY);
        return;
      } else {
        // Unblocked soda glass -> pick up for drag!
        dragItemRef.current = {
          type: 'tea',
          startX: mx,
          startY: my,
        };
        return;
      }
    }

    // 3. Otherwise perform Chopstick Pinch Strike to catch flies in open space!
    performPinchStrike(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPlaying) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    mouseRef.current.x = mx;
    mouseRef.current.y = my;

    // Open mouth visual feedback when dragging near mouth
    if (dragItemRef.current) {
      const mouth = mouthRef.current;
      const dist = getDistance(mx, my, mouth.x, mouth.y);
      mouth.isOpen = dist <= mouth.radius + 25;
    }
  };

  const handleDropOrRelease = () => {
    if (!isPlaying) return;

    if (dragItemRef.current) {
      const drag = dragItemRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const mouth = mouthRef.current;
      const dist = getDistance(mx, my, mouth.x, mouth.y);

      if (dist <= mouth.radius + 30) {
        // Dropped into Master's Mouth!
        if (drag.type === 'dumpling') {
          if (sipNeededRef.current) {
            // Master needs tea first!
            addFloatingText(mouth.x, mouth.y - 20, 'Master is thirsty! Take a sip 🍵', '#b45309');
            if (soundEnabled) audio.playClack();
          } else {
            // Eat dumpling!
            const d = dumplingsRef.current.find((dum) => dum.id === drag.id);
            if (d && !d.isEaten) {
              d.isEaten = true;
              dumplingsEatenThisLevelRef.current++;
              dumplingsEatenSinceLastDrinkRef.current++;

              if (soundEnabled) audio.playMunch();
              addFloatingText(mouth.x, mouth.y - 20, 'Munch! 🥟 +150p', '#10b981');
              createCaptureParticles(mouth.x, mouth.y, '#ebdcb9', 10);

              statsRef.current.score += 150;
              onStatsUpdate({ ...statsRef.current });

              // Check Tea Sip Rule (Level 1: 2 dumplings, Level 2+: 3 dumplings)
              const lvl = currentLevelRef.current;
              const threshold = lvl === 1 ? 2 : 3;
              if (dumplingsEatenSinceLastDrinkRef.current >= threshold) {
                sipNeededRef.current = true;
              }

              // Check Level Complete
              const remaining = dumplingsRef.current.filter((dum) => !dum.isEaten).length;
              if (remaining === 0) {
                if (soundEnabled) audio.playSfx('levelup');
                addFloatingText(window.innerWidth / 2, window.innerHeight / 3, `LEVEL ${lvl} COMPLETE! 🏆`, '#eab308');
                currentLevelRef.current++;
                setTimeout(() => {
                  initLevelDumplings(currentLevelRef.current);
                }, 800);
              }
            }
          }
        } else if (drag.type === 'tea') {
          if (sipNeededRef.current) {
            // Drink Matcha Tea!
            if (soundEnabled) audio.playGulp();
            sipNeededRef.current = false;
            dumplingsEatenSinceLastDrinkRef.current = 0;
            addFloatingText(mouth.x, mouth.y - 20, 'Ahhh! Refreshing 🍵🍃', '#16a34a');
            createCaptureParticles(mouth.x, mouth.y, '#4ade80', 12);
          } else {
            addFloatingText(mouth.x, mouth.y - 20, 'Not thirsty yet! 🍵', '#654321');
          }
        }
      }

      dragItemRef.current = null;
      mouth.isOpen = false;
    } else {
      handleReleasePinch();
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => handleDropOrRelease();

  // Touch handlers for mobile players (Tap-to-Catch)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isPlaying || e.touches.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;

    // Visual tap ripple particle feedback for every tap
    createSparkles(touchX, touchY, 'rgba(255, 255, 255, 0.95)', 8);

    if (isMobileOrTouchDevice()) {
      // 1. Check if touching a Dumpling
      const dumplings = dumplingsRef.current;
      for (let i = 0; i < dumplings.length; i++) {
        const d = dumplings[i];
        if (!d.isEaten && getDistance(touchX, touchY, d.x, d.y) <= 40) {
          if (!d.isBlockedByFly) {
            dragItemRef.current = { type: 'dumpling', id: d.id, index: i, startX: touchX, startY: touchY };
            mouseRef.current.x = touchX;
            mouseRef.current.y = touchY;
            return;
          }
        }
      }

      // 2. Check if touching Soda Tumbler/Tea
      const tea = teaRef.current;
      if (getDistance(touchX, touchY, tea.x, tea.y) <= 55) {
        if (!tea.isBlockedByFly) {
          dragItemRef.current = { type: 'tea', startX: touchX, startY: touchY };
          mouseRef.current.x = touchX;
          mouseRef.current.y = touchY;
          return;
        }
      }

      // 3. Otherwise try to catch a fly
      // If chopsticks are currently carrying out an auto capture sequence, block tap
      if (autoCaptureRef.current?.active) return;

      // Search for flies near tap coordinate (1.5x hit radius for finger tap)
      const hitRadius = getDifficultySettings().hitRadius * 1.5;
      const nearbyFly = fliesRef.current.find((f) => {
        if (f.state === 'releasing' || f.isCaught) return false;
        return getDistance(touchX, touchY, f.x, f.y) <= hitRadius;
      });

      if (nearbyFly) {
        if (nearbyFly.type === 'ninja' && nearbyFly.isCatchable === false) {
          audio.playClack();
          addFloatingText(touchX, touchY, "Too Fast! ⚡", "#a855f7");
        } else {
          autoCaptureRef.current = {
            active: true,
            phase: 'approaching',
            flyId: nearbyFly.id,
            startTime: Date.now(),
            startPos: { x: canvas.width / 2, y: canvas.height + 80 },
            targetPos: { x: nearbyFly.x, y: nearbyFly.y },
          };
        }
      } else {
        audio.playClack();
        addFloatingText(touchX, touchY, "Miss!", "rgba(200, 180, 140, 0.7)");
      }
    } else {
      performPinchStrike(touch.clientX, touch.clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPlaying || e.touches.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const mx = touch.clientX - rect.left;
    const my = touch.clientY - rect.top;

    if (!isMobileOrTouchDevice()) {
      mouseRef.current.x = mx;
      mouseRef.current.y = my;
    } else {
      if (dragItemRef.current) {
        mouseRef.current.x = mx;
        mouseRef.current.y = my;
        
        // Open mouth visual feedback when dragging near mouth
        const mouth = mouthRef.current;
        const dist = getDistance(mx, my, mouth.x, mouth.y);
        mouth.isOpen = dist <= mouth.radius + 25;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isPlaying) return;
    if (!isMobileOrTouchDevice()) {
      handleReleasePinch();
    } else {
      if (dragItemRef.current) {
        handleDropOrRelease();
      }
    }
  };

  // Desktop Keyboard Controls (WASD / Arrow Keys for movement, Space for pinch/strike)
  useEffect(() => {
    if (!isPlaying || isMobileOrTouchDevice()) return;

    const keysPressed: Record<string, boolean> = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      keysPressed[e.code] = true;

      if (e.code === 'Space') {
        e.preventDefault();
        performPinchStrike();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed[e.code] = false;
      if (e.code === 'Space') {
        e.preventDefault();
        handleReleasePinch();
      }
    };

    const moveSpeed = 12;
    const keyInterval = setInterval(() => {
      if (!isPlaying) return;
      let dx = 0;
      let dy = 0;
      if (keysPressed['KeyW'] || keysPressed['ArrowUp']) dy -= moveSpeed;
      if (keysPressed['KeyS'] || keysPressed['ArrowDown']) dy += moveSpeed;
      if (keysPressed['KeyA'] || keysPressed['ArrowLeft']) dx -= moveSpeed;
      if (keysPressed['KeyD'] || keysPressed['ArrowRight']) dx += moveSpeed;

      if (dx !== 0 || dy !== 0) {
        mouseRef.current.x = Math.max(0, Math.min(window.innerWidth, mouseRef.current.x + dx));
        mouseRef.current.y = Math.max(0, Math.min(window.innerHeight, mouseRef.current.y + dy));
      }
    }, 16);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      clearInterval(keyInterval);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying]);

  // Active Timers and fly counts manager
  useEffect(() => {
    if (!isPlaying) {
      // Clear timers on pause
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
      if (secondTimerRef.current) clearInterval(secondTimerRef.current);
      return;
    }

    // Reset initial specs on start
    currentLevelRef.current = 1;
    initLevelDumplings(1);

    statsRef.current = {
      score: 0,
      fliesCaught: 0,
      totalAttempts: 0,
      accuracy: 100,
      combo: 0,
      maxCombo: 0,
      gameTimeRemaining: 0,
      fliesTypeCount: { housefly: 0, bluebottle: 0, fruitfly: 0, golden: 0, ninja: 0 },
      level: 1,
      dumplingsLeft: 5,
      dumplingsEatenThisLevel: 0,
      sipNeeded: false,
    };
    plateRef.current.hp = 100;
    hasSpawnedNinjaThisSession.current = false;
    hasZoomedThisSession.current = false;
    isZoomActiveRef.current = false;
    currentZoom.current = 1.0;
    onStatsUpdate({ ...statsRef.current });

    // Spawn and landing ticker to direct flies to dumplings and soda rim
    spawnTimerRef.current = window.setInterval(() => {
      const activeFlies = fliesRef.current.filter(f => !f.isCaught && f.state !== 'releasing');
      const cap = frenzyActive ? 8 : 5;
      
      if (activeFlies.length < cap) {
        fliesRef.current.push(createFly());
      }

      // Target flies to land on unblocked Dumplings or Soda Rim
      const unlandedFlies = fliesRef.current.filter(f => !f.isCaught && f.state !== 'resting' && f.state !== 'releasing' && !f.landingTargetId);
      if (unlandedFlies.length > 0) {
        const targetFly = unlandedFlies[Math.floor(Math.random() * unlandedFlies.length)];
        
        // 40% chance to target Soda Rim, 60% chance to target Dumpling
        if (Math.random() < 0.4 && !teaRef.current.isBlockedByFly && !teaRef.current.flyId) {
          teaRef.current.flyId = targetFly.id;
          targetFly.landingTargetId = 'tea';
        } else {
          const unblockedDumplings = dumplingsRef.current.filter(d => !d.isEaten && !d.isBlockedByFly && !d.flyId);
          if (unblockedDumplings.length > 0) {
            const targetDumpling = unblockedDumplings[Math.floor(Math.random() * unblockedDumplings.length)];
            targetDumpling.flyId = targetFly.id;
            targetDumpling.landingTargetId = targetDumpling.id;
          }
        }
      }
    }, 2200);

    // Second Ticker for Feast Health Drain & Ninja Fly Spawns
    secondTimerRef.current = window.setInterval(() => {
      const stats = statsRef.current;
      
      // Spawning condition for Ninja Fly
      if (!hasSpawnedNinjaThisSession.current && stats.fliesCaught >= 4) {
        hasSpawnedNinjaThisSession.current = true;
        fliesRef.current.push(createFly('ninja'));
      }

      // Check Feast Health status
      if (plateRef.current.hp <= 0) {
        if (soundEnabled) {
          audio.playSfx('game-over');
        }
        onGameEnd({ ...stats });
      }

      onStatsUpdate({ ...stats });
    }, 1000);

    return () => {
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
      if (secondTimerRef.current) clearInterval(secondTimerRef.current);
      if (frenzyTimerRef.current) clearTimeout(frenzyTimerRef.current);
    };
  }, [isPlaying, gameMode]);

  return (
    <div
      ref={containerRef}
      id="game-arena-container"
      className="relative w-full h-full select-none overflow-hidden cursor-none z-10"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleDropOrRelease}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* High FPS Game Arena Canvas */}
      <canvas ref={canvasRef} id="arcade-game-canvas" className="block w-full h-full" />

      {/* Golden Frenzy screen flashing border indicator */}
      {frenzyActive && (
        <div className="absolute inset-0 pointer-events-none border-4 border-yellow-400/60 rounded-xl animate-pulse z-20" />
      )}
    </div>
  );
};
