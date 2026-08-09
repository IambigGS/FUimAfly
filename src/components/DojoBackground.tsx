import React, { useEffect, useRef } from 'react';
import { CherryBlossom } from '../types';

interface DojoBackgroundProps {
  showBlossoms?: boolean;
  windSpeed?: number;
  targetFps?: number;
}

export const DojoBackground: React.FC<DojoBackgroundProps> = ({
  showBlossoms = true,
  windSpeed = 1.0,
  targetFps = 60,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blossomsRef = useRef<CherryBlossom[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  const targetFpsRef = useRef<number>(targetFps);
  useEffect(() => {
    targetFpsRef.current = targetFps;
  }, [targetFps]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawBackground();
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Initialize Cherry Blossoms
    const createBlossom = (initYRandom = true): CherryBlossom => {
      return {
        id: Math.random().toString(),
        x: Math.random() * window.innerWidth,
        y: initYRandom ? Math.random() * window.innerHeight : -20,
        size: 6 + Math.random() * 12,
        speedX: (0.5 + Math.random() * 1.5) * windSpeed,
        speedY: 1.0 + Math.random() * 2.0,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.03,
        opacity: 0.4 + Math.random() * 0.5,
      };
    };

    // Populate initial petals
    const petalCount = Math.min(25, Math.floor(window.innerWidth / 45));
    blossomsRef.current = Array.from({ length: petalCount }, () => createBlossom(true));

    const drawBackground = () => {
      if (!ctx || !canvas) return;

      // Clear with elegant linen/parchment soft cream gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#f9f6f0'); // Very soft antique ivory
      gradient.addColorStop(0.5, '#f5efe4');
      gradient.addColorStop(1, '#ebe1cd'); // Warm parchment paper
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw subtle Zen circle (Ensō) in the center background
      ctx.save();
      ctx.strokeStyle = 'rgba(107, 98, 86, 0.05)';
      ctx.lineWidth = 16;
      ctx.beginPath();
      const radius = Math.min(canvas.width, canvas.height) * 0.22;
      ctx.arc(canvas.width / 2, canvas.height / 2, radius, 0.1 * Math.PI, 1.8 * Math.PI);
      ctx.stroke();
      ctx.restore();

      // Draw Shoji lattice screen lines
      ctx.save();
      ctx.strokeStyle = 'rgba(78, 68, 55, 0.06)';
      ctx.lineWidth = 4;
      
      const gridSize = 140;
      // Vertical lattice
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      // Horizontal lattice
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      ctx.restore();

      // Draw subtle silhouettes of bamboo leaves in corners
      ctx.save();
      ctx.fillStyle = 'rgba(110, 118, 97, 0.05)';
      // Top left bamboo
      ctx.beginPath();
      ctx.ellipse(80, 100, 30, 120, Math.PI / 4, 0, Math.PI * 2);
      ctx.ellipse(140, 150, 20, 90, Math.PI / 3, 0, Math.PI * 2);
      ctx.ellipse(50, 180, 15, 60, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();

      // Top right bamboo
      ctx.beginPath();
      ctx.ellipse(canvas.width - 100, 120, 25, 110, -Math.PI / 4, 0, Math.PI * 2);
      ctx.ellipse(canvas.width - 160, 160, 18, 80, -Math.PI / 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    let lastFrameTime = performance.now();

    const animate = (currentTime: number = performance.now()) => {
      animationFrameRef.current = requestAnimationFrame(animate);

      if (typeof document !== 'undefined' && document.hidden) return;

      const FRAME_INTERVAL = 1000 / (targetFpsRef.current || 60);
      const elapsed = currentTime - lastFrameTime;
      if (elapsed < FRAME_INTERVAL - 1) return; // Skip extra frames on high refresh displays
      lastFrameTime = currentTime - (elapsed % FRAME_INTERVAL);

      drawBackground();

      if (showBlossoms) {
        // Draw & Update Blossoms
        ctx.save();
        blossomsRef.current.forEach((petal) => {
          // Update position
          petal.y += petal.speedY;
          petal.x += petal.speedX;
          petal.angle += petal.spin;

          // Wrap around screen boundaries
          if (petal.y > canvas.height + 20 || petal.x > canvas.width + 20) {
            Object.assign(petal, createBlossom(false));
          }

          // Draw realistic 5-petaled cherry blossom vector shape
          ctx.beginPath();
          ctx.fillStyle = `rgba(244, 180, 194, ${petal.opacity})`; // Soft sakura pink
          ctx.save();
          ctx.translate(petal.x, petal.y);
          ctx.rotate(petal.angle);

          // Draw an elegant petal shape (ellipse with a notch or heart shape)
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(-petal.size / 2, -petal.size / 2, -petal.size, 0, 0, petal.size);
          ctx.bezierCurveTo(petal.size, 0, petal.size / 2, -petal.size / 2, 0, 0);
          ctx.fill();

          ctx.restore();
        });
        ctx.restore();
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [showBlossoms, windSpeed]);

  return (
    <canvas
      ref={canvasRef}
      id="dojo-background-canvas"
      className="absolute inset-0 w-full h-full pointer-events-none select-none z-0 block"
    />
  );
};
