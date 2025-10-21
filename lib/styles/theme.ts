/**
 * Design tokens for Pawkit unified UI
 * Frosted glass aesthetic with purple glow accents
 */

export const COLORS = {
  background: '#0d0b16',      // dark gradient base
  surface: 'rgba(255,255,255,0.05)', // frosted glass base
  border: 'rgba(255,255,255,0.08)',
  accent: '#7c3aed',          // primary purple
  success: '#22c55e',         // green
  danger: '#ef4444',          // red
  textPrimary: '#f5f5f7',
  textSecondary: '#a3a3b0',
} as const;

export const SHADOWS = {
  accent: '0 0 25px rgba(124,58,237,0.45)',
  success: '0 0 25px rgba(34,197,94,0.45)',
  danger: '0 0 25px rgba(239,68,68,0.45)',
} as const;

export const RADII = {
  card: '24px',      // rounded-2xl for cards, panels, modals
  button: '9999px',  // rounded-full for pill buttons
} as const;
