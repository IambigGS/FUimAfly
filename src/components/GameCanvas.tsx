import React, { useEffect, useRef, useState } from 'react';
import { Fly, FlyType, Particle, GameStats, ChopstickConfig } from '../types';
import { audio } from '../utils/audio';
import { CHOPSTICK_STYLES } from './SettingsModal';

interface GameCanvasProps {
  isPlaying: boolean;
  gameMode: 'arcade' | 'zen' | 'training';
  difficulty: 'easy' | 'normal' | 'hard';
  chopstickStyleId: string;
  showHelper: boolean;
  soundEnabled: boolean;
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
  onGameEnd,
  onStatsUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Core gameplay states in refs to bypass closures in animation loop
  const mouseRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2, isPinching: false });
  const chopstickTipRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2, separation: 24 });
  const fliesRef = useRef<Fly[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<{ id: string; x: number; y: number; text: string; color: string; life: number; maxLife: number }[]>([]);
  
  // Game Stats Tracking
  const statsRef = useRef<GameStats>({
    score: 0,
    fliesCaught: 0,
    totalAttempts: 0,
    accuracy: 100,
    combo: 0,
    maxCombo: 0,
    gameTimeRemaining: 60,
    fliesTypeCount: { housefly: 0, bluebottle: 0, fruitfly: 0, golden: 0 },
  });

  // Plate state for Feast Guard
  const plateRef = useRef({
    x: window.innerWidth / 2,
    y: window.innerHeight * 0.7,
    hp: 100,
    active: false,
    radius: 70,
  });

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
    
    // Low chance to spawn rare Golden fly based on time or randomness
    let flyType: FlyType = type || types[Math.floor(Math.random() * types.length)];
    if (!type && Math.random() < 0.08) {
      flyType = 'golden';
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
    }

    return {
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
    };
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

    // Trigger Sounds
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
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
      
      // Update plate center in Training mode
      plateRef.current.x = canvas.width / 2;
      plateRef.current.y = canvas.height * 0.72;

      // Update release window center
      releaseWindowRef.current.x = canvas.width / 2;
      releaseWindowRef.current.y = 80;
    };

    window.addEventListener('resize', handleResize);
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

      // 1. Draw Plate (Dojo Dumpling Feast) in Training mode
      if (gameMode === 'training') {
        const p = plateRef.current;
        p.active = true;

        ctx.save();
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 15, p.radius, p.radius * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Plate base (Ceramic white)
        ctx.fillStyle = '#faf8f5';
        ctx.strokeStyle = '#d8cbb0';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.radius, p.radius * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Plate inner rim (Classic blue pattern)
        ctx.strokeStyle = 'rgba(29, 78, 216, 0.18)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.radius * 0.8, p.radius * 0.32, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Draw 3 plump dumplings in a pile
        ctx.fillStyle = '#fff9eb';
        ctx.strokeStyle = '#ebdcb9';
        ctx.lineWidth = 1.5;

        // Dumpling 1 (Left)
        ctx.beginPath();
        ctx.arc(p.x - 20, p.y - 8, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Dumpling 2 (Right)
        ctx.beginPath();
        ctx.arc(p.x + 20, p.y - 8, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Dumpling 3 (Center Top)
        ctx.beginPath();
        ctx.arc(p.x, p.y - 18, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Steam rising
        ctx.strokeStyle = 'rgba(180, 160, 140, 0.15)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const steamTime = Date.now() * 0.003;
        ctx.moveTo(p.x - 10, p.y - 35);
        ctx.quadraticCurveTo(p.x - 15 + Math.sin(steamTime) * 5, p.y - 50, p.x - 10, p.y - 65);
        ctx.moveTo(p.x + 10, p.y - 35);
        ctx.quadraticCurveTo(p.x + 5 + Math.sin(steamTime + 1) * 5, p.y - 50, p.x + 10, p.y - 65);
        ctx.stroke();

        // HP Ring
        ctx.strokeStyle = 'rgba(100, 100, 100, 0.1)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 15, 0, Math.PI * 2);
        ctx.stroke();

        const hpColor = p.hp > 50 ? '#10b981' : p.hp > 25 ? '#f59e0b' : '#ef4444';
        ctx.strokeStyle = hpColor;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 15, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * (p.hp / 100)));
        ctx.stroke();

        // Text "MASTER'S FEAST"
        ctx.fillStyle = '#6e5d4a';
        ctx.font = 'bold 11px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`MASTER'S FEAST: ${p.hp}%`, p.x, p.y + 35);

        ctx.restore();
      } else {
        plateRef.current.active = false;
      }

      // 2. Interpolate Chopsticks position (smooth trailing physics)
      const mouse = mouseRef.current;
      const cTip = chopstickTipRef.current;

      cTip.x += (mouse.x - cTip.x) * 0.45;
      cTip.y += (mouse.y - cTip.y) * 0.45;

      // Animate clamp separation gap
      const targetSep = mouse.isPinching ? 1.5 : 24;
      cTip.separation += (targetSep - cTip.separation) * 0.55;

      // 3. Update & Draw Fly entities
      const flies = fliesRef.current;

      fliesRef.current = flies.map((fly) => {
        const rw = releaseWindowRef.current;

        if (fly.state === 'releasing') {
          // Animate fly flying away into the window
          fly.x += (rw.x - fly.x) * 0.15;
          fly.y += (rw.y - fly.y) * 0.15;
          fly.vx = 0;
          fly.vy = 0;
          fly.size *= 0.88; // shrink as it recedes
          fly.wingAngle += 1.2; // buzz wings frantically to fly away!
          
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

            // Damage the feast
            plateRef.current.hp = Math.max(0, plateRef.current.hp - 0.05);

            // Chomp particle text occasionally
            if (Math.random() < 0.008) {
              addFloatingText(fly.x, fly.y - 12, 'Chomp!', '#b45309');
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
        fly.x += fly.vx;
        fly.y += fly.vy;

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

        // Fly wings flap oscillation
        fly.wingAngle += fly.wingSpeed;
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
          if (fly.state === 'releasing' || fly.isCaught) {
            audio.stopFlyBuzz(fly.id);
            return;
          }

          const dist = getDistance(fly.x, fly.y, cTip.x, cTip.y);
          activeFlyIds.add(fly.id);

          // Volume scale is intense when right under chopsticks, fades to zero by 320px
          const maxHearingRadius = 320;
          let volumeScale = 0;
          if (dist < maxHearingRadius) {
            volumeScale = 1.0 - (dist / maxHearingRadius);
            // Modulate volume if escaping or flying
            if (fly.state === 'escaping') {
              volumeScale *= 1.35;
            }
          }

          const screenPanX = (fly.x - canvas.width / 2) / (canvas.width / 2);

          audio.updateFlyBuzz(fly.id, {
            pitch: fly.state === 'escaping' ? fly.buzzPitch * 1.2 : fly.buzzPitch,
            volumeMultiplier: volumeScale,
            panX: screenPanX,
            isActive: true,
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
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
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
        ft.life++;
        ft.y -= 0.6; // float up gently
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

      // 8. Draw Aiming Helper Guides (Glowing target reticle)
      if (showHelper) {
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

      animFrameId = requestAnimationFrame(renderLoop);
    };

    if (isPlaying) {
      renderLoop();
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrameId);
    };
  }, [isPlaying, gameMode, difficulty, chopstickStyleId, showHelper, soundEnabled, frenzyActive]);

  // Handle Game Input Interactions (Clicks / Touches to PINCH)
  const performPinchStrike = (clientX: number, clientY: number) => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const hitX = clientX - rect.left;
    const hitY = clientY - rect.top;

    // Update coordinates immediately to align strike location
    mouseRef.current.x = hitX;
    mouseRef.current.y = hitY;
    mouseRef.current.isPinching = true;

    const diffSettings = getDifficultySettings();
    const flies = fliesRef.current;
    const stats = statsRef.current;

    // Strike Hitbox verification
    const strikeRadius = diffSettings.hitRadius;
    let caughtFlyIndex = -1;

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

  // Tracking Coordinates
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPlaying) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    mouseRef.current.x = e.clientX - rect.left;
    mouseRef.current.y = e.clientY - rect.top;
  };

  // Touch handlers for mobile players
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isPlaying || e.touches.length === 0) return;
    const touch = e.touches[0];
    performPinchStrike(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPlaying || e.touches.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    mouseRef.current.x = touch.clientX - rect.left;
    mouseRef.current.y = touch.clientY - rect.top;
  };

  // Active Timers and fly counts manager
  useEffect(() => {
    if (!isPlaying) {
      // Clear timers on pause
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
      if (secondTimerRef.current) clearInterval(secondTimerRef.current);
      return;
    }

    // Reset initial specs on start
    statsRef.current = {
      score: 0,
      fliesCaught: 0,
      totalAttempts: 0,
      accuracy: 100,
      combo: 0,
      maxCombo: 0,
      gameTimeRemaining: gameMode === 'arcade' ? 60 : 0,
      fliesTypeCount: { housefly: 0, bluebottle: 0, fruitfly: 0, golden: 0 },
    };
    plateRef.current.hp = 100;
    onStatsUpdate({ ...statsRef.current });

    // Spawn ticker to keep fly count consistent or increase in difficulty
    spawnTimerRef.current = window.setInterval(() => {
      const activeFlies = fliesRef.current.filter(f => !f.isCaught).length;
      const cap = frenzyActive ? 8 : 4;
      
      if (activeFlies < cap) {
        fliesRef.current.push(createFly());
      }
    }, 3800);

    // Second Ticker for Arcade Mode or Feast Guard
    secondTimerRef.current = window.setInterval(() => {
      const stats = statsRef.current;
      
      if (gameMode === 'arcade') {
        stats.gameTimeRemaining--;

        // Low time warning beep
        if (stats.gameTimeRemaining <= 10 && stats.gameTimeRemaining > 0 && soundEnabled) {
          audio.playSfx('time-warning');
        }

        if (stats.gameTimeRemaining <= 0) {
          // Time Over!
          if (soundEnabled) {
            audio.playSfx('game-over');
          }
          onGameEnd({ ...stats });
        }
      } else if (gameMode === 'training') {
        // Feast Guard mode
        if (plateRef.current.hp <= 0) {
          if (soundEnabled) {
            audio.playSfx('game-over');
          }
          onGameEnd({ ...stats });
        }
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
      onMouseDown={(e) => performPinchStrike(e.clientX, e.clientY)}
      onMouseUp={handleReleasePinch}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleReleasePinch}
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
