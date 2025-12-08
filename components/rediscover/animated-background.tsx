"use client";

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base dark layer */}
      <div className="absolute inset-0 bg-[#0A0A0F]" />

      {/* Flowing Gradient Layer 1 - uses CSS variable for accent color */}
      <div
        className="absolute inset-0 opacity-60 animated-bg-layer-1"
        style={{
          backgroundSize: '400% 400%',
          animation: 'gradient-flow-1 20s ease infinite',
          filter: 'blur(60px)',
        }}
      />

      {/* Flowing Gradient Layer 2 */}
      <div
        className="absolute inset-0 opacity-40 animated-bg-layer-2"
        style={{
          backgroundSize: '400% 400%',
          animation: 'gradient-flow-2 25s ease infinite',
          filter: 'blur(80px)',
        }}
      />

      {/* Flowing Gradient Layer 3 */}
      <div
        className="absolute inset-0 opacity-30 animated-bg-layer-3"
        style={{
          backgroundSize: '400% 400%',
          animation: 'gradient-flow-3 30s ease infinite',
          filter: 'blur(100px)',
        }}
      />

      {/* Subtle radial glow overlay */}
      <div
        className="absolute inset-0 opacity-20 animated-bg-glow"
      />

      {/* Global animation keyframes */}
      <style jsx>{`
        .animated-bg-layer-1 {
          background: linear-gradient(45deg, hsl(var(--accent-h) var(--accent-s) 45%), #1A1A2E, hsl(var(--accent-h) var(--accent-s) 55%), #0A0A0F);
        }
        .animated-bg-layer-2 {
          background: linear-gradient(135deg, hsl(var(--accent-h) var(--accent-s) 55%), #0A0A0F, hsl(var(--accent-h) var(--accent-s) 45%), #1A1A2E);
        }
        .animated-bg-layer-3 {
          background: linear-gradient(225deg, #1A1A2E, hsl(var(--accent-h) var(--accent-s) 45%), #0A0A0F, hsl(var(--accent-h) var(--accent-s) 55%));
        }
        .animated-bg-glow {
          background: radial-gradient(ellipse at center, hsl(var(--accent-h) var(--accent-s) 45% / 0.3) 0%, transparent 70%);
        }
        @keyframes gradient-flow-1 {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes gradient-flow-2 {
          0%, 100% { background-position: 100% 50%; }
          50% { background-position: 0% 50%; }
        }

        @keyframes gradient-flow-3 {
          0%, 100% { background-position: 50% 0%; }
          50% { background-position: 50% 100%; }
        }
      `}</style>
    </div>
  );
}
