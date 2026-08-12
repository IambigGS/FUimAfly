import React, { useEffect, useRef, useState } from 'react';
import { audio } from '../utils/audio';

interface BeTheFlyCanvasProps {
  soundEnabled: boolean;
  targetFps: number;
  onComplete: (stats: { score: number; timeSurvived: number; dumplingsEaten: number; won?: boolean }) => void;
  onExit: () => void;
}

interface Strike {
  id: number;
  targetX: number; // 0 to 1 canvas width ratio
  targetY: number; // 0 to 1 canvas height ratio
  phase: 'telegraph' | 'striking' | 'retracting';
  progress: number; // 0 to 1
  radius: number;
}

export const BeTheFlyCanvas: React.FC<BeTheFlyCanvasProps> = ({
  soundEnabled,
  targetFps,
  onComplete,
  onExit
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Game State
  const [gameState, setGameState] = useState<'onboarding' | 'playing' | 'swatted' | 'victory'>('onboarding');
  const [score, setScore] = useState(0);
  const [stamina, setStamina] = useState(100);
  const [dumplingProgress, setDumplingProgress] = useState(0); // 0 to 100%
  const [timeSurvived, setTimeSurvived] = useState(0);
  const [nearMissCount, setNearMissCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Player Fly Physics State (3D world coordinates inside virtual room)
  const flyState = useRef({
    x: 0, // -1 (left) to 1 (right)
    y: 0, // -1 (far back/table edge) to 1 (near foreground)
    altitude: 0.5, // 0 (landed on table/dumpling) to 1 (high in air)
    vx: 0,
    vy: 0,
    valtitude: 0,
    isLanded: false,
    dashTimer: 0,
    stamina: 100,
  });

  // Dumplings on the steamer plate (Positions in world coordinates x, y)
  const dumplingsRef = useRef([
    { id: 1, x: -0.3, y: 0.2, eaten: 0 },
    { id: 2, x: 0.3, y: 0.2, eaten: 0 },
    { id: 3, x: 0, y: 0.0, eaten: 0 },
    { id: 4, x: -0.25, y: -0.2, eaten: 0 },
    { id: 5, x: 0.25, y: -0.2, eaten: 0 },
  ]);

  // Touch / Joystick state
  const joystickTouchId = useRef<number | null>(null);
  const joystickStart = useRef<{ x: number; y: number } | null>(null);
  const joystickCurrent = useRef<{ x: number; y: number } | null>(null);

  // Key state for Keyboard (WASD / Arrows / Space)
  const keysPressed = useRef<Record<string, boolean>>({});

  // Mouse Target Control
  const mouseTargetRef = useRef<{ x: number; y: number } | null>(null);

  // Chopstick Strike State
  const strikesRef = useRef<Strike[]>([]);
  const strikeTimer = useRef(0);
  const nextStrikeId = useRef(1);

  // Action states
  const isFeastingRef = useRef(false);

  // Screen Shake effect
  const screenShakeRef = useRef(0);

  // Buzz audio oscillator state reference
  const buzzAudioRef = useRef<{
    audioCtx: AudioContext | null;
    osc: OscillatorNode | null;
    gain: GainNode | null;
  }>({ audioCtx: null, osc: null, gain: null });

  // Web Audio Procedural Buzz Setup & Cleanup (Only active during gameplay, muted on onboarding)
  useEffect(() => {
    if (!soundEnabled || gameState !== 'playing') return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      buzzAudioRef.current = { audioCtx: ctx, osc, gain };
    } catch (e) {
      console.warn('Procedural fly buzz AudioContext error:', e);
    }

    return () => {
      if (buzzAudioRef.current.osc) {
        try {
          buzzAudioRef.current.osc.stop();
          buzzAudioRef.current.osc.disconnect();
        } catch (e) {}
      }
      if (buzzAudioRef.current.audioCtx) {
        try {
          buzzAudioRef.current.audioCtx.close();
        } catch (e) {}
      }
    };
  }, [soundEnabled, gameState]);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;
      if (e.code === 'KeyE' || e.code === 'Space') {
        isFeastingRef.current = true;
      }
      if (e.code === 'ShiftLeft' || e.code === 'KeyK') {
        triggerDash();
      }
      if (e.code === 'KeyJ' || e.code === 'ArrowUp') {
        triggerAscend();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
      if (e.code === 'KeyE' || e.code === 'Space') {
        isFeastingRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Timer for survival and stamina regen
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      setTimeSurvived((prev) => prev + 1);

      // Regenerate stamina
      flyState.current.stamina = Math.min(100, flyState.current.stamina + 8);
      setStamina(flyState.current.stamina);
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState]);

  // Evasive Dash Action
  const triggerDash = () => {
    const fly = flyState.current;
    if (fly.stamina < 25 || fly.dashTimer > 0) return;

    fly.stamina -= 25;
    setStamina(fly.stamina);
    fly.dashTimer = 15; // frames of dash boost
    fly.altitude = Math.max(0.2, fly.altitude); // lift up slightly
    fly.isLanded = false;

    if (soundEnabled) audio.playSfx('escape');
    showToast('EVASIVE DASH! ⚡');
  };

  // Vertical Ascend Action
  const triggerAscend = () => {
    const fly = flyState.current;
    if (fly.stamina < 15) return;

    fly.stamina -= 15;
    setStamina(fly.stamina);
    fly.valtitude = 0.08;
    fly.isLanded = false;

    if (soundEnabled) audio.playSfx('escape');
    showToast('ASCENDED! ⬆️');
  };

  // Toast message helper
  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 1200);
  };

  // Handle Touch Inputs for Virtual Joystick and Action Buttons
  const handleTouchStart = (e: React.TouchEvent) => {
    if (gameState === 'onboarding') {
      setGameState('playing');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      // Left half of screen = Virtual Joystick
      if (x < rect.width * 0.5 && joystickTouchId.current === null) {
        joystickTouchId.current = touch.identifier;
        joystickStart.current = { x, y };
        joystickCurrent.current = { x, y };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (joystickTouchId.current === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchId.current) {
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        joystickCurrent.current = { x, y };
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchId.current) {
        joystickTouchId.current = null;
        joystickStart.current = null;
        joystickCurrent.current = null;
      }
    }
  };

  // Handle Mouse Movement for Direct Cursor Flying
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const normX = Math.max(-0.85, Math.min(0.85, (mouseX / rect.width) * 2 - 1));
    const normY = Math.max(-0.85, Math.min(0.85, (mouseY / rect.height) * 2 - 1));
    mouseTargetRef.current = { x: normX, y: normY };
  };

  // Main Render & Physics Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();
    const frameInterval = 1000 / targetFps;

    const renderLoop = (now: number) => {
      const delta = now - lastTime;

      if (delta >= frameInterval) {
        lastTime = now - (delta % frameInterval);

        const width = canvas.width;
        const height = canvas.height;
        const fly = flyState.current;

        // 1. UPDATE FLY MOVEMENT PHYSICS
        let moveX = 0;
        let moveY = 0;

        // Keyboard Controls (WASD / Arrows)
        if (keysPressed.current['KeyA'] || keysPressed.current['ArrowLeft']) moveX -= 1;
        if (keysPressed.current['KeyD'] || keysPressed.current['ArrowRight']) moveX += 1;
        if (keysPressed.current['KeyW'] || keysPressed.current['ArrowUp']) moveY -= 1;
        if (keysPressed.current['KeyS'] || keysPressed.current['ArrowDown']) moveY += 1;

        // Joystick Controls
        if (joystickStart.current && joystickCurrent.current) {
          const dx = joystickCurrent.current.x - joystickStart.current.x;
          const dy = joystickCurrent.current.y - joystickStart.current.y;
          const maxDist = 50;
          moveX = Math.max(-1, Math.min(1, dx / maxDist));
          moveY = Math.max(-1, Math.min(1, dy / maxDist));
        }

        // Mouse Steering Controls
        if (mouseTargetRef.current) {
          const dx = mouseTargetRef.current.x - fly.x;
          const dy = mouseTargetRef.current.y - fly.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0.02) {
            moveX += (dx / dist) * Math.min(1, dist * 3);
            moveY += (dy / dist) * Math.min(1, dist * 3);
          }
        }

        const moveSpeed = fly.dashTimer > 0 ? 0.05 : 0.02;
        if (fly.dashTimer > 0) fly.dashTimer -= 1;

        // Velocity damping
        fly.vx = fly.vx * 0.8 + moveX * moveSpeed * 0.2;
        fly.vy = fly.vy * 0.8 + moveY * moveSpeed * 0.2;

        fly.x += fly.vx;
        fly.y += fly.vy;

        // Boundaries (-0.9 to 0.9)
        fly.x = Math.max(-0.85, Math.min(0.85, fly.x));
        fly.y = Math.max(-0.85, Math.min(0.85, fly.y));

        // Altitude Physics
        fly.altitude += fly.valtitude;
        fly.valtitude -= 0.003; // gravity

        // Land check on dumplings or table
        if (fly.altitude <= 0.05) {
          fly.altitude = 0.05;
          fly.valtitude = 0;
          fly.isLanded = true;
        } else {
          fly.isLanded = false;
        }

        // 2. FEASTING / EATING DUMPLINGS LOGIC
        let closestDumplingIndex = -1;
        let minDist = 0.20; // Must be landed directly over dumpling zone

        dumplingsRef.current.forEach((d, idx) => {
          const dist = Math.sqrt(Math.pow(fly.x - d.x, 2) + Math.pow(fly.y - d.y, 2));
          if (dist < minDist) {
            minDist = dist;
            closestDumplingIndex = idx;
          }
        });

        const isCurrentlyMunching = isFeastingRef.current && fly.isLanded && closestDumplingIndex !== -1;

        // Buzz sound control: Mute buzz when landed and munching; resume buzz when flying in air
        if (buzzAudioRef.current.gain && soundEnabled) {
          const targetGain = isCurrentlyMunching ? 0 : 0.04;
          buzzAudioRef.current.gain.gain.setTargetAtTime(targetGain, buzzAudioRef.current.audioCtx!.currentTime, 0.05);

          if (!isCurrentlyMunching && buzzAudioRef.current.osc) {
            const speedMag = Math.sqrt(fly.vx * fly.vx + fly.vy * fly.vy);
            const targetFreq = 180 + speedMag * 1200 + (fly.dashTimer > 0 ? 150 : 0);
            buzzAudioRef.current.osc.frequency.setTargetAtTime(targetFreq, buzzAudioRef.current.audioCtx!.currentTime, 0.05);
          }
        }

        if (isCurrentlyMunching) {
          const targetDumpling = dumplingsRef.current[closestDumplingIndex];
          targetDumpling.eaten = Math.min(100, targetDumpling.eaten + 0.4);

          // Play fly dumpling munching sound (single clean sound per dumpling, non-overlapping)
          if (soundEnabled) audio.playDumplingMunch(targetDumpling.id);

          setScore((s) => s + 5);

          // Calculate total progress
          const totalEaten = dumplingsRef.current.reduce((acc, d) => acc + d.eaten, 0) / 5;
          setDumplingProgress(Math.round(totalEaten));

          if (totalEaten >= 100) {
            setGameState('victory');
            if (soundEnabled) audio.playSfx('levelup');
            onComplete({ score: score + 1000, timeSurvived, dumplingsEaten: 5, won: true });
          }
        } else {
          // Stop active munch audio if fly moves off dumpling zone
          if (soundEnabled) audio.stopDumplingMunch();
        }

        // 3. MASTER CHOPSTICK STRIKE AI LOGIC
        strikeTimer.current += 1;
        // Spawn strike every ~120 frames (frequency scales with score)
        const spawnInterval = Math.max(60, 140 - Math.floor(score / 500) * 10);
        if (strikeTimer.current >= spawnInterval) {
          strikeTimer.current = 0;
          // Target near fly's current or predicted position
          const strikeTargetX = fly.x + (Math.random() - 0.5) * 0.4;
          const strikeTargetY = fly.y + (Math.random() - 0.5) * 0.4;

          strikesRef.current.push({
            id: nextStrikeId.current++,
            targetX: (strikeTargetX + 1) / 2, // normalized 0 to 1
            targetY: (strikeTargetY + 1) / 2,
            phase: 'telegraph',
            progress: 0,
            radius: 45
          });

          if (soundEnabled) audio.playSfx('escape');
        }

        // Update Strikes
        const currentStrikes = strikesRef.current;
        for (let i = currentStrikes.length - 1; i >= 0; i--) {
          const strike = currentStrikes[i];

          if (strike.phase === 'telegraph') {
            strike.progress += 0.025; // ~0.6s telegraph shadow
            if (strike.progress >= 1) {
              strike.phase = 'striking';
              strike.progress = 0;

              // STRIKE IMPACT CHECK!
              const strikeNormX = strike.targetX * 2 - 1;
              const strikeNormY = strike.targetY * 2 - 1;
              const distToFly = Math.sqrt(Math.pow(fly.x - strikeNormX, 2) + Math.pow(fly.y - strikeNormY, 2));

              // If fly is low and within impact radius
              if (distToFly < 0.22 && fly.altitude < 0.2) {
                // SQUATTED / GAME OVER
                setGameState('swatted');
                screenShakeRef.current = 20;
                if (soundEnabled) audio.playSfx('game-over');
                setTimeout(() => {
                  onComplete({ score, timeSurvived, dumplingsEaten: Math.floor(dumplingProgress / 20), won: false });
                }, 1800);
              } else if (distToFly < 0.4) {
                // NEAR MISS!
                setNearMissCount((c) => c + 1);
                setScore((s) => s + 250);
                screenShakeRef.current = 10;
                if (soundEnabled) audio.playClack();
                showToast('NEAR MISS! +250 💨');
              }
            }
          } else if (strike.phase === 'striking') {
            strike.progress += 0.1;
            if (strike.progress >= 1) {
              strike.phase = 'retracting';
              strike.progress = 0;
            }
          } else if (strike.phase === 'retracting') {
            strike.progress += 0.08;
            if (strike.progress >= 1) {
              currentStrikes.splice(i, 1);
            }
          }
        }

        // 4. DRAWING CANVAS (FIRST-PERSON FLY VIEWPORT)
        ctx.save();

        // Apply Screen Shake
        if (screenShakeRef.current > 0) {
          const shakeX = (Math.random() - 0.5) * screenShakeRef.current;
          const shakeY = (Math.random() - 0.5) * screenShakeRef.current;
          ctx.translate(shakeX, shakeY);
          screenShakeRef.current = Math.max(0, screenShakeRef.current - 1);
        }

        // Clear Background (Tatami Table Texture Colors)
        ctx.fillStyle = '#261C14'; // Dark wooden table background
        ctx.fillRect(0, 0, width, height);

        // Draw Steamer Plate in Center
        const centerX = width / 2;
        const centerY = height / 2 + 30;
        const plateRadius = Math.min(width, height) * 0.38;

        // Steamer Plate Rim
        ctx.fillStyle = '#8C6D4A';
        ctx.beginPath();
        ctx.arc(centerX, centerY, plateRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#543D27';
        ctx.lineWidth = 6;
        ctx.stroke();

        // Bamboo Steamer Interior
        ctx.fillStyle = '#D9C5A0';
        ctx.beginPath();
        ctx.arc(centerX, centerY, plateRadius * 0.9, 0, Math.PI * 2);
        ctx.fill();

        // Draw Dumplings on Steamer
        dumplingsRef.current.forEach((d) => {
          const dx = centerX + d.x * (plateRadius * 1.5);
          const dy = centerY + d.y * (plateRadius * 1.5);
          const size = 32;

          // Dumpling Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.beginPath();
          ctx.ellipse(dx, dy + size * 0.4, size, size * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();

          // Dumpling Body
          ctx.fillStyle = d.eaten >= 100 ? '#A39B8B' : '#FFF9EB';
          ctx.beginPath();
          ctx.ellipse(dx, dy, size, size * 0.75, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#D4C4A8';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Steam Particles if not fully eaten
          if (d.eaten < 100) {
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath();
            ctx.arc(dx + Math.sin(now * 0.005) * 6, dy - 20 - (now % 30) * 0.5, 4, 0, Math.PI * 2);
            ctx.fill();
          }

          // Eating Progress Bar
          if (d.eaten > 0 && d.eaten < 100) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(dx - 20, dy - size - 8, 40, 6);
            ctx.fillStyle = '#EAB308'; // Yellow fill
            ctx.fillRect(dx - 20, dy - size - 8, (d.eaten / 100) * 40, 6);
          }
        });

        // Draw Chopstick Strike Shadows & Giant Chopsticks
        currentStrikes.forEach((s) => {
          const sx = s.targetX * width;
          const sy = s.targetY * height;

          if (s.phase === 'telegraph') {
            // Growing Dynamic Shadow
            const shadowRadius = s.radius * s.progress;
            ctx.fillStyle = 'rgba(180, 20, 20, 0.45)';
            ctx.beginPath();
            ctx.ellipse(sx, sy, shadowRadius, shadowRadius * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#EF4444';
            ctx.lineWidth = 2;
            ctx.stroke();
          } else if (s.phase === 'striking' || s.phase === 'retracting') {
            // GIANT CHOPSTICKS CRASHING DOWN FROM FLY POV
            ctx.fillStyle = '#5A3E2B'; // Wood color
            ctx.strokeStyle = '#3A2619';
            ctx.lineWidth = 4;

            // Chopstick Tip 1
            ctx.beginPath();
            ctx.moveTo(sx - 12, sy);
            ctx.lineTo(sx - 35, sy - height * 0.8);
            ctx.lineTo(sx - 15, sy - height * 0.8);
            ctx.lineTo(sx - 2, sy);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Chopstick Tip 2
            ctx.beginPath();
            ctx.moveTo(sx + 2, sy);
            ctx.lineTo(sx + 15, sy - height * 0.8);
            ctx.lineTo(sx + 35, sy - height * 0.8);
            ctx.lineTo(sx + 12, sy);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Impact Dust Wave
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(sx, sy, s.radius * 1.2, s.radius * 0.6, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        });

        // Draw Player Fly POV Target/Reticle & Wings
        const flyCanvasX = ((fly.x + 1) / 2) * width;
        const flyCanvasY = ((fly.y + 1) / 2) * height;

        // Fly Shadow under altitude
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(flyCanvasX, flyCanvasY + (1 - fly.altitude) * 20, 10 * (1 - fly.altitude * 0.5), 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Translucent Wing Visuals at screen periphery (Fly POV)
        const wingFlapOffset = Math.sin(now * 0.08) * 8;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.5;

        // Left Wing
        ctx.beginPath();
        ctx.ellipse(flyCanvasX - 22, flyCanvasY - fly.altitude * 30, 20, 8, -0.4 + wingFlapOffset * 0.02, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Right Wing
        ctx.beginPath();
        ctx.ellipse(flyCanvasX + 22, flyCanvasY - fly.altitude * 30, 20, 8, 0.4 - wingFlapOffset * 0.02, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Fly Body Focus Dot
        ctx.fillStyle = '#1A1A1A';
        ctx.beginPath();
        ctx.arc(flyCanvasX, flyCanvasY - fly.altitude * 30, 6, 0, Math.PI * 2);
        ctx.fill();

        // Speed Lines Shader / Peripheral effect (Mobile Optimized)
        if (fly.dashTimer > 0) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 2;
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(flyCanvasX + Math.cos(angle) * 40, flyCanvasY + Math.sin(angle) * 40);
            ctx.lineTo(flyCanvasX + Math.cos(angle) * 160, flyCanvasY + Math.sin(angle) * 160);
            ctx.stroke();
          }
        }

        // FLY COMPOUND EYE VIGNETTE OVERLAY (Fly POV Lens Effect)
        const vignetteGrad = ctx.createRadialGradient(
          centerX, centerY, Math.min(width, height) * 0.3,
          centerX, centerY, Math.max(width, height) * 0.7
        );
        vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignetteGrad.addColorStop(0.7, 'rgba(15, 20, 10, 0.35)');
        vignetteGrad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
        ctx.fillStyle = vignetteGrad;
        ctx.fillRect(0, 0, width, height);

        // Subtle peripheral compound eye hexagonal grid lines
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.05)';
        ctx.lineWidth = 1;
        const hexR = 28;
        for (let hx = 0; hx < width + hexR; hx += hexR * 1.5) {
          for (let hy = 0; hy < height + hexR; hy += hexR * 1.732) {
            const dCenter = Math.hypot(hx - centerX, hy - centerY);
            if (dCenter > Math.min(width, height) * 0.32) {
              ctx.beginPath();
              for (let a = 0; a < 6; a++) {
                const ang = (a * Math.PI) / 3;
                const px = hx + hexR * 0.5 * Math.cos(ang);
                const py = hy + hexR * 0.5 * Math.sin(ang);
                if (a === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              }
              ctx.closePath();
              ctx.stroke();
            }
          }
        }

        // Virtual Joystick Overlay on canvas (if active)
        if (joystickStart.current && joystickCurrent.current) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(joystickStart.current.x, joystickStart.current.y, 40, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
          ctx.beginPath();
          ctx.arc(joystickCurrent.current.x, joystickCurrent.current.y, 18, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, targetFps, soundEnabled, score, dumplingProgress, timeSurvived]);

  return (
    <div className="relative w-full h-full bg-brand-charcoal overflow-hidden select-none">
      {/* 2D Canvas */}
      <canvas
        ref={canvasRef}
        width={window.innerWidth || 800}
        height={window.innerHeight || 600}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseMove={handleMouseMove}
        className="w-full h-full block cursor-crosshair"
      />

      {/* Minimalist Top HUD Header */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Mode Badge */}
          <div className="bg-amber-400 text-brand-charcoal font-serif font-black px-3 py-1 text-xs border-2 border-brand-charcoal shadow-[2px_2px_0px_0px_#1A1A1A] flex items-center gap-1.5">
            <span>🪰 BE THE FLY MODE</span>
          </div>

          {/* Greed / Dumpling Progress */}
          <div className="bg-white/95 border-2 border-brand-charcoal px-3 py-1 text-xs font-mono font-bold text-brand-charcoal shadow-[2px_2px_0px_0px_#1A1A1A]">
            Feast: <span className="text-brand-red font-black">{dumplingProgress}%</span>
          </div>

          {/* Score */}
          <div className="bg-white/95 border-2 border-brand-charcoal px-3 py-1 text-xs font-mono font-bold text-brand-charcoal shadow-[2px_2px_0px_0px_#1A1A1A]">
            Score: <span className="text-amber-600 font-black">{score}</span>
          </div>

          {/* Stamina Bar */}
          <div className="bg-white/95 border-2 border-brand-charcoal px-2.5 py-1 text-xs font-mono font-bold text-brand-charcoal shadow-[2px_2px_0px_0px_#1A1A1A] flex items-center gap-1.5">
            <span>⚡</span>
            <div className="w-14 h-2.5 bg-gray-200 border border-brand-charcoal overflow-hidden rounded-xs">
              <div
                className={`h-full transition-all duration-200 ${stamina < 30 ? 'bg-red-500' : stamina < 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${stamina}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onExit}
            className="px-3 py-1 bg-white hover:bg-brand-linen border-2 border-brand-charcoal text-brand-charcoal font-serif font-bold text-xs shadow-[2px_2px_0px_0px_#1A1A1A] cursor-pointer"
          >
            Exit Dojo
          </button>
        </div>
      </div>

      {/* Floating Status Toast Toast */}
      {statusMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-brand-red text-white border-2 border-brand-charcoal px-4 py-1.5 font-serif font-black text-xs uppercase tracking-widest shadow-[3px_3px_0px_0px_#1A1A1A] animate-bounce">
          {statusMessage}
        </div>
      )}

      {/* Controls Overlay (Right Side Action Buttons) */}
      {gameState === 'playing' && (
        <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-3 pointer-events-auto">
          {/* Ascend / Eject Button */}
          <button
            onClick={triggerAscend}
            className="w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-serif font-black text-xs border-3 border-brand-charcoal shadow-[4px_4px_0px_0px_#1A1A1A] flex flex-col items-center justify-center cursor-pointer"
          >
            <span>⬆️</span>
            <span className="text-[9px]">ASCEND</span>
          </button>

          {/* Evasive Dash Button */}
          <button
            onClick={triggerDash}
            className="w-16 h-16 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-brand-charcoal font-serif font-black text-xs border-3 border-brand-charcoal shadow-[4px_4px_0px_0px_#1A1A1A] flex flex-col items-center justify-center cursor-pointer"
          >
            <span>⚡</span>
            <span className="text-[9px]">DASH</span>
          </button>

          {/* Land & Feast Button (Hold to Eat) */}
          <button
            onMouseDown={() => (isFeastingRef.current = true)}
            onMouseUp={() => (isFeastingRef.current = false)}
            onTouchStart={() => (isFeastingRef.current = true)}
            onTouchEnd={() => (isFeastingRef.current = false)}
            className="w-20 h-20 rounded-full bg-brand-red hover:bg-red-700 active:scale-95 text-white font-serif font-black text-xs border-3 border-brand-charcoal shadow-[4px_4px_0px_0px_#1A1A1A] flex flex-col items-center justify-center cursor-pointer select-none"
          >
            <span className="text-lg">🥟</span>
            <span className="text-[10px] leading-tight">FEAST</span>
          </button>
        </div>
      )}

      {/* Left side Joystick / Mouse Hint */}
      {gameState === 'playing' && (
        <div className="absolute bottom-6 left-6 z-10 pointer-events-none opacity-60 font-mono text-[10px] text-white bg-black/60 px-3 py-1.5 border border-white/30 rounded-xs shadow-md">
          🖱️ Move Mouse / WASD to fly | ⌨️ Hold Spacebar to FEAST
        </div>
      )}

      {/* Onboarding Modal Overlay */}
      {gameState === 'onboarding' && (
        <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-brand-ivory border-3 border-brand-charcoal p-6 shadow-[8px_8px_0px_0px_#1A1A1A] text-center space-y-4">
            <div className="inline-block px-3 py-1 bg-brand-red text-white font-serif font-black text-xs uppercase tracking-widest border border-brand-charcoal">
              🪰 Perspective Shift
            </div>

            <h2 className="text-2xl font-serif font-black text-brand-charcoal">
              You Are The Hum In The Silence!
            </h2>

            <p className="text-xs font-serif text-brand-charcoal/80 italic leading-relaxed">
              "The Dojo looks different from down here, little one. You are the chaos in the calm. Seek the sacred Dumplings of Enlightenment, but beware the Master's giant Pillars of Discipline!"
            </p>

            <div className="bg-white border-2 border-brand-charcoal p-3 text-left space-y-2 text-xs font-sans">
              <div className="flex items-center gap-2">
                <span className="font-bold text-brand-red">🕹️ Steering:</span> Drag on the left side (or WASD / Arrow keys).
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-brand-red">🥟 Feast:</span> Hold the FEAST button (or Spacebar) to eat dumplings.
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-brand-red">⚡ Dodge:</span> Tap DASH or ASCEND when chopstick strike shadows appear below!
              </div>
            </div>

            <button
              onClick={() => setGameState('playing')}
              className="w-full py-3 bg-brand-red hover:bg-brand-charcoal text-white font-serif font-black text-sm uppercase tracking-wider border-2 border-brand-charcoal shadow-[3px_3px_0px_0px_#1A1A1A] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            >
              Start Evasion Now 🪰
            </button>
          </div>
        </div>
      )}

      {/* Swatted / Defeated Modal */}
      {gameState === 'swatted' && (
        <div className="absolute inset-0 z-40 bg-red-950/90 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-brand-ivory border-3 border-brand-charcoal p-6 shadow-[8px_8px_0px_0px_#1A1A1A] text-center space-y-4 animate-shake">
            <span className="text-4xl">💥</span>
            <h2 className="text-3xl font-serif font-black text-brand-red">
              SWATTED!
            </h2>
            <p className="text-sm font-serif italic text-brand-charcoal/90">
              "Stillness has found you, little one. The Master's focus remains unbroken."
            </p>
            <div className="bg-white border-2 border-brand-charcoal p-3 font-mono text-xs">
              <div>Time Survived: {timeSurvived}s</div>
              <div>Dumplings Feast: {dumplingProgress}%</div>
              <div>Near Misses: {nearMissCount}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
