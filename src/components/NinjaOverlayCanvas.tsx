import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';

export interface NinjaOverlayHandle {
  triggerSurprise: () => void;
}

interface NinjaParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  alpha: number;
  rotation: number;
  life: number;
  maxLife: number;
  active: boolean;
  type: 'smoke' | 'ember' | 'blossom';
}

interface NinjaOverlayCanvasProps {
  onSequenceComplete?: () => void;
}

const NinjaOverlayCanvas = forwardRef<NinjaOverlayHandle, NinjaOverlayCanvasProps>(
  ({ onSequenceComplete }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [phase, setPhase] = useState<number>(0);
    const animationFrameId = useRef<number>(0);
    const particles = useRef<NinjaParticle[]>([]);
    
    // Performance budgeting
    const lastFrameTime = useRef<number>(performance.now());
    const frameTimes = useRef<number[]>([]);
    const maxParticlesActive = useRef<number>(150);

    // Initialize particle pool (Atlas's PRD)
    useEffect(() => {
      const pool: NinjaParticle[] = [];
      for (let i = 0; i < 200; i++) {
        pool.push({
          x: 0, y: 0, vx: 0, vy: 0, scale: 1, alpha: 0, rotation: 0, life: 0, maxLife: 100, active: false, type: 'smoke'
        });
      }
      particles.current = pool;
      
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
      }
      
      const handleResize = () => {
        if (canvas) {
          const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
          canvas.width = window.innerWidth * dpr;
          canvas.height = window.innerHeight * dpr;
        }
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    const spawnParticles = (x: number, y: number, count: number) => {
      let spawned = 0;
      for (let i = 0; i < particles.current.length; i++) {
        const p = particles.current[i];
        if (!p.active) {
          p.active = true;
          p.x = x;
          p.y = y;
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 15 + 5;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed;
          p.life = 0;
          p.maxLife = Math.random() * 60 + 40;
          p.scale = Math.random() * 2 + 0.5;
          p.alpha = 1;
          p.rotation = Math.random() * 360;
          
          const rand = Math.random();
          p.type = rand > 0.8 ? 'blossom' : rand > 0.5 ? 'ember' : 'smoke';
          
          spawned++;
          if (spawned >= count || spawned >= maxParticlesActive.current) break;
        }
      }
    };

    const renderLoop = (time: number) => {
      const delta = time - lastFrameTime.current;
      lastFrameTime.current = time;
      
      frameTimes.current.push(delta);
      if (frameTimes.current.length > 5) frameTimes.current.shift();
      const avgFrameTime = frameTimes.current.reduce((a, b) => a + b, 0) / frameTimes.current.length;
      if (avgFrameTime > 14) {
        maxParticlesActive.current = Math.max(50, maxParticlesActive.current - 10);
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);

      let anyActive = false;
      for (let i = 0; i < particles.current.length; i++) {
        const p = particles.current[i];
        if (p.active) {
          anyActive = true;
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.95; // friction
          p.vy *= 0.95;
          if (p.type === 'smoke') p.vy -= 0.5; // smoke rises
          
          p.life++;
          p.alpha = Math.max(0, 1 - (p.life / p.maxLife));
          if (p.life >= p.maxLife) p.active = false;

          ctx.save();
          ctx.translate(p.x, p.y);
          if (avgFrameTime < 14) ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.scale(p.scale, p.scale);

          if (p.type === 'smoke') {
            ctx.fillStyle = `rgba(107, 33, 168, ${p.alpha * 0.7})`; // deep purple smoke
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.type === 'ember') {
            ctx.fillStyle = `rgba(234, 179, 8, ${p.alpha})`; // gold
            ctx.fillRect(-2, -2, 4, 4);
          } else {
            ctx.fillStyle = `rgba(244, 114, 182, ${p.alpha})`; // pink blossom
            ctx.beginPath();
            ctx.ellipse(0, 0, 5, 2, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }

      ctx.restore();

      if (anyActive) {
        animationFrameId.current = requestAnimationFrame(renderLoop);
      }
    };

    useImperativeHandle(ref, () => ({
      triggerSurprise: () => {
        // Phase 1: Smoke Bomb
        setPhase(1);
        spawnParticles(window.innerWidth / 2, window.innerHeight / 2, 100);
        lastFrameTime.current = performance.now();
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = requestAnimationFrame(renderLoop);

        // Phase 2: Letterbox & Banner
        setTimeout(() => setPhase(2), 300);

        // Phase 3: Modal (Handoff to parent/App)
        setTimeout(() => {
          setPhase(3);
          if (onSequenceComplete) onSequenceComplete();
        }, 1500);
      }
    }));

    useEffect(() => {
      return () => cancelAnimationFrame(animationFrameId.current);
    }, []);

    if (phase === 0) return null;

    return (
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        {/* Phase 1: Backdrop & Canvas */}
        <div className={`absolute inset-0 transition-opacity duration-300 ${phase >= 1 ? 'opacity-100 bg-purple-950/40 backdrop-blur-sm' : 'opacity-0'}`} />
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0"
          style={{ willChange: 'transform', transform: 'translate3d(0,0,0)' }}
        />
        
        {/* Phase 2: Letterbox & Banner */}
        <div className={`absolute top-0 left-0 right-0 h-16 bg-brand-charcoal transition-transform duration-300 ${phase >= 2 ? 'translate-y-0' : '-translate-y-full'}`} />
        <div className={`absolute bottom-0 left-0 right-0 h-16 bg-brand-charcoal transition-transform duration-300 ${phase >= 2 ? 'translate-y-0' : 'translate-y-full'}`} />
        
        <div className={`absolute top-1/2 left-0 right-0 -translate-y-1/2 bg-black py-4 border-y border-brand-red flex justify-center items-center overflow-hidden transition-all duration-300 ${phase === 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-y-0'}`}>
          <div className="text-amber-300 font-serif font-black text-2xl md:text-4xl tracking-widest whitespace-nowrap px-4 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]">
            🥷 SHINOBI TAKEOVER! UNTOUCHABLE NINJA FLY AWAKENED
          </div>
        </div>
      </div>
    );
  }
);

export default NinjaOverlayCanvas;
