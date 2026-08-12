import React, { useEffect, useRef, useState } from 'react';
import { audio } from '../utils/audio';

interface WaspAttackCanvasProps {
  onComplete: (success: boolean) => void;
  soundEnabled: boolean;
}

interface Wasp3D {
  id: number;
  x: number; // offset from center (-1 to 1)
  y: number; // offset from center (-1 to 1)
  z: number; // scale / depth (0.05 = far away, 1.0 = right in front of face)
  speed: number;
  wobbleFreq: number;
  wobbleAmp: number;
  angle: number;
  state: 'flying' | 'hit' | 'stinging';
  hitProgress?: number;
}

export const WaspAttackCanvas: React.FC<WaspAttackCanvasProps> = ({ onComplete, soundEnabled }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [swatCount, setSwatCount] = useState(0);
  const healthRef = useRef(9);
  const [health, setHealth] = useState(9);
  const [gameState, setGameState] = useState<'playing' | 'victory' | 'defeated'>('playing');

  const waspsRef = useRef<Wasp3D[]>([]);
  const nextWaspId = useRef(1);
  const animFrameId = useRef<number | null>(null);

  const targetSwats = 8;

  // Initialize Wasp Swarm
  useEffect(() => {
    // Spawn initial wasp
    const spawnWasp = () => {
      if (waspsRef.current.length < 4) {
        waspsRef.current.push({
          id: nextWaspId.current++,
          x: (Math.random() - 0.5) * 1.2,
          y: (Math.random() - 0.5) * 1.2,
          z: 0.05,
          speed: 0.008 + Math.random() * 0.006,
          wobbleFreq: 0.05 + Math.random() * 0.05,
          wobbleAmp: 0.02 + Math.random() * 0.03,
          angle: Math.random() * Math.PI * 2,
          state: 'flying'
        });
      }
    };

    const spawnInterval = setInterval(spawnWasp, 1200);
    spawnWasp();

    return () => clearInterval(spawnInterval);
  }, []);

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 1;
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      // Clear & Draw Intense Background Grid/Speedlines
      ctx.fillStyle = '#1A1A1A';
      ctx.fillRect(0, 0, width, height);

      // Radial speed lines to accentuate first-person movement
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + time * 0.005;
        const rx = centerX + Math.cos(angle) * Math.max(width, height);
        const ry = centerY + Math.sin(angle) * Math.max(width, height);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(rx, ry);
        ctx.stroke();
      }

      // Render Wasps
      const currentWasps = waspsRef.current;
      for (let i = currentWasps.length - 1; i >= 0; i--) {
        const wasp = currentWasps[i];

        if (wasp.state === 'flying') {
          // Advance Z depth towards player
          wasp.z += wasp.speed;
          wasp.angle += 0.1;

          // Wobble trajectory
          const wx = Math.sin(time * wasp.wobbleFreq) * wasp.wobbleAmp;
          const wy = Math.cos(time * wasp.wobbleFreq) * wasp.wobbleAmp;

          const screenX = centerX + (wasp.x + wx) * (width * 0.45);
          const screenY = centerY + (wasp.y + wy) * (height * 0.45);
          const size = Math.max(15, wasp.z * 120);

          // Check if wasp reached screen / stung master
          if (wasp.z >= 0.95 && wasp.state === 'flying') {
            wasp.state = 'stinging';
            if (soundEnabled) audio.playFlyOuch();
            
            healthRef.current -= 1;
            setHealth(healthRef.current);

            if (healthRef.current <= 0) {
              setGameState('defeated');
              setTimeout(() => onComplete(false), 2000);
            }

            // Remove wasp
            currentWasps.splice(i, 1);
            continue;
          }

          // Draw Wasp (Head-on perspective sprite/vector)
          ctx.save();
          ctx.translate(screenX, screenY);

          // Shadow depth indicator
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.beginPath();
          ctx.ellipse(0, size * 0.8, size * 0.6, size * 0.2, 0, 0, Math.PI * 2);
          ctx.fill();

          // Rapid wing flap
          const wingFlap = Math.sin(time * 0.8) * 0.5;

          // Wings
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.beginPath();
          ctx.ellipse(-size * 0.4, -size * 0.3, size * 0.5, size * 0.2, -0.4 + wingFlap, 0, Math.PI * 2);
          ctx.ellipse(size * 0.4, -size * 0.3, size * 0.5, size * 0.2, 0.4 - wingFlap, 0, Math.PI * 2);
          ctx.fill();

          // Wasp Body (Striped Yellow/Black)
          ctx.fillStyle = '#EAB308'; // Yellow
          ctx.beginPath();
          ctx.ellipse(0, 0, size * 0.45, size * 0.65, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = Math.max(2, size * 0.08);
          ctx.stroke();

          // Black Stripes
          ctx.fillStyle = '#000000';
          ctx.fillRect(-size * 0.4, -size * 0.2, size * 0.8, size * 0.12);
          ctx.fillRect(-size * 0.38, size * 0.1, size * 0.76, size * 0.12);

          // Glowing Red Eyes
          ctx.fillStyle = '#EF4444';
          ctx.beginPath();
          ctx.arc(-size * 0.15, -size * 0.35, size * 0.1, 0, Math.PI * 2);
          ctx.arc(size * 0.15, -size * 0.35, size * 0.1, 0, Math.PI * 2);
          ctx.fill();

          // Stinger Tip
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.moveTo(0, size * 0.65);
          ctx.lineTo(-size * 0.1, size * 0.85);
          ctx.lineTo(size * 0.1, size * 0.85);
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        } else if (wasp.state === 'hit') {
          // Hit particle explosion effect
          wasp.hitProgress = (wasp.hitProgress || 0) + 0.08;
          const screenX = centerX + wasp.x * (width * 0.45);
          const screenY = centerY + wasp.y * (height * 0.45);
          const radius = (wasp.z * 100) * (1 + wasp.hitProgress);

          ctx.save();
          ctx.translate(screenX, screenY);
          ctx.fillStyle = `rgba(239, 68, 68, ${1 - wasp.hitProgress})`;
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#EAB308';
          ctx.font = 'bold 20px monospace';
          ctx.fillText('SPLAT!', -30, -radius - 5);
          ctx.restore();

          if (wasp.hitProgress >= 1) {
            currentWasps.splice(i, 1);
          }
        }
      }

      // First-person chopsticks at bottom screen
      ctx.fillStyle = '#C2410C'; // Chopstick wood
      ctx.save();
      // Left chopstick
      ctx.beginPath();
      ctx.moveTo(width * 0.25, height);
      ctx.lineTo(centerX - 20, height * 0.65);
      ctx.lineTo(centerX - 10, height * 0.65);
      ctx.lineTo(width * 0.32, height);
      ctx.closePath();
      ctx.fill();

      // Right chopstick
      ctx.beginPath();
      ctx.moveTo(width * 0.75, height);
      ctx.lineTo(centerX + 20, height * 0.65);
      ctx.lineTo(centerX + 10, height * 0.65);
      ctx.lineTo(width * 0.68, height);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      animFrameId.current = requestAnimationFrame(render);
    };

    // Auto-resize canvas
    const handleResize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [soundEnabled, onComplete]);

  // Click/Tap Input Handler to SWAT Wasps
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const wasps = waspsRef.current;
    let hitAny = false;

    for (let i = wasps.length - 1; i >= 0; i--) {
      const wasp = wasps[i];
      if (wasp.state !== 'flying') continue;

      const screenX = centerX + wasp.x * (canvas.width * 0.45);
      const screenY = centerY + wasp.y * (canvas.height * 0.45);
      const size = Math.max(30, wasp.z * 140);

      const dx = clickX - screenX;
      const dy = clickY - screenY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= size) {
        // Hit!
        wasp.state = 'hit';
        hitAny = true;
        if (soundEnabled) audio.playCatch('standard');

        setSwatCount((prev) => {
          const nextS = prev + 1;
          if (nextS >= targetSwats) {
            setGameState('victory');
            setTimeout(() => onComplete(true), 2000);
          }
          return nextS;
        });
        break;
      }
    }

    if (!hitAny && soundEnabled) {
      audio.playClack();
    }
  };

  return (
    <div className="relative w-full h-full bg-black flex flex-col items-center justify-center overflow-hidden font-sans select-none">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onTouchStart={handleCanvasClick}
        className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
      />

      {/* Top HUD */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center pointer-events-none">
        <div className="bg-brand-charcoal/90 border-2 border-brand-red px-4 py-2 text-white font-serif font-black text-sm md:text-base tracking-wider uppercase shadow-md flex items-center gap-2">
          <span>🐝 WASP ATTACK!</span>
          <span className="text-amber-400 font-mono">[{swatCount} / {targetSwats}]</span>
        </div>

        <div className="bg-brand-charcoal/90 border-2 border-brand-ivory px-3 py-1.5 text-white font-mono text-xs md:text-sm shadow-md flex items-center gap-1">
          <span>HEALTH ({health}/9):</span>
          <div className="flex gap-0.5 max-w-[140px] sm:max-w-none flex-wrap">
            {Array.from({ length: 9 }).map((_, idx) => (
              <span key={idx} className={idx < health ? 'text-red-500 text-xs sm:text-sm' : 'text-gray-600 text-xs sm:text-sm'}>
                ❤️
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Instructions Banner */}
      <div className="absolute bottom-6 z-20 pointer-events-none bg-black/80 text-amber-300 font-mono text-xs px-4 py-1.5 border border-amber-400/50 rounded-full animate-pulse">
        ⚡ TAP INCOMING WASPS TO SWAT THEM BEFORE THEY STING! ⚡
      </div>

      {/* Overlay Victory / Defeat Status */}
      {gameState === 'victory' && (
        <div className="absolute inset-0 bg-brand-charcoal/90 z-30 flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-4xl md:text-5xl font-serif font-black text-emerald-400 mb-2 tracking-wider uppercase animate-bounce">
            SWARM DEFEATED! 🏆
          </h2>
          <p className="text-brand-ivory font-mono text-sm">Returning to Zen Master Dojo...</p>
        </div>
      )}

      {gameState === 'defeated' && (
        <div className="absolute inset-0 bg-brand-red/90 z-30 flex flex-col items-center justify-center p-6 text-center text-white">
          <h2 className="text-4xl md:text-5xl font-serif font-black mb-2 tracking-wider uppercase">
            STUNG BY WASPS! 🐝💥
          </h2>
          <p className="font-mono text-sm opacity-90">Focus harder next time, Master!</p>
        </div>
      )}
    </div>
  );
};

export default WaspAttackCanvas;
