'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  hue: number;
}

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const huePalette = [200, 220, 260, 300, 35];

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    const createParticle = (x?: number, y?: number): Particle => ({
      x: x ?? Math.random() * window.innerWidth,
      y: y ?? window.innerHeight + Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      speedY: -(Math.random() * 0.5 + 0.2),
      speedX: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.6 + 0.2,
      hue: huePalette[Math.floor(Math.random() * huePalette.length)] + (Math.random() * 16 - 8),
    });

    const initParticles = () => {
      const count = Math.min(80, Math.floor(window.innerWidth / 15));
      particlesRef.current = Array.from({ length: count }, () =>
        createParticle(undefined, Math.random() * window.innerHeight)
      );
    };

    const drawParticle = (p: Particle) => {
      if (!ctx) return;

      // Glow effect
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
      gradient.addColorStop(0, `hsla(${p.hue}, 70%, 70%, ${p.opacity})`);
      gradient.addColorStop(0.4, `hsla(${p.hue}, 60%, 60%, ${p.opacity * 0.5})`);
      gradient.addColorStop(1, `hsla(${p.hue}, 50%, 50%, 0)`);

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 80%, 80%, ${p.opacity})`;
      ctx.fill();
    };

    const drawConnections = () => {
      particlesRef.current.forEach((p1, i) => {
        particlesRef.current.slice(i + 1).forEach(p2 => {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const blendHue = (p1.hue + p2.hue) / 2;
            ctx.strokeStyle = `hsla(${blendHue}, 70%, 70%, 0.12)`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.globalAlpha = (1 - dist / 120) * 0.3;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        });
      });
    };

    const renderFrame = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      particlesRef.current.forEach((p) => {
        drawParticle(p);
      });

      drawConnections();
    };

    const animate = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      particlesRef.current.forEach((p, i) => {
        // Mouse interaction - subtle attraction
        const dx = mouseRef.current.x - p.x;
        const dy = mouseRef.current.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
          const force = (200 - dist) / 200 * 0.02;
          p.speedX += dx * force * 0.01;
          p.speedY += dy * force * 0.01;
        }

        // Apply movement
        p.x += p.speedX;
        p.y += p.speedY;

        // Dampen horizontal movement
        p.speedX *= 0.99;

        // Reset particles that go off screen
        if (p.y < -50 || p.x < -50 || p.x > window.innerWidth + 50) {
          particlesRef.current[i] = createParticle();
        }

        drawParticle(p);
      });
      drawConnections();

      animationRef.current = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleResize = () => {
      resizeCanvas();
      initParticles();
      if (prefersReducedMotion) {
        renderFrame();
      }
    };

    resizeCanvas();
    initParticles();
    if (prefersReducedMotion) {
      renderFrame();
    } else {
      animate();
      window.addEventListener('mousemove', handleMouseMove);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
