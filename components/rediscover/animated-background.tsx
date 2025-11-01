"use client";

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base dark layer */}
      <div className="absolute inset-0 bg-[#0A0A0F]" />

      {/* Flowing Gradient Layer 1 */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background: 'linear-gradient(45deg, #7C3AED, #1A1A2E, #9333EA, #0A0A0F)',
          backgroundSize: '400% 400%',
          animation: 'gradient-flow-1 20s ease infinite',
          filter: 'blur(60px)',
        }}
      />

      {/* Flowing Gradient Layer 2 */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: 'linear-gradient(135deg, #9333EA, #0A0A0F, #7C3AED, #1A1A2E)',
          backgroundSize: '400% 400%',
          animation: 'gradient-flow-2 25s ease infinite',
          filter: 'blur(80px)',
        }}
      />

      {/* Flowing Gradient Layer 3 */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: 'linear-gradient(225deg, #1A1A2E, #7C3AED, #0A0A0F, #9333EA)',
          backgroundSize: '400% 400%',
          animation: 'gradient-flow-3 30s ease infinite',
          filter: 'blur(100px)',
        }}
      />

      {/* Subtle radial glow overlay */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(124, 58, 237, 0.3) 0%, transparent 70%)',
        }}
      />

      {/* Global animation keyframes */}
      <style jsx>{`
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
