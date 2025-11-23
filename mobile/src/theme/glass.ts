/**
 * Glass Morphism Design System
 * Matches Pawkit web app design language
 */

export const GlassTheme = {
  colors: {
    // Background
    background: '#0a0814',

    // Glass surfaces
    glass: {
      base: 'rgba(255, 255, 255, 0.05)',
      soft: 'rgba(255, 255, 255, 0.03)',
      strong: 'rgba(17, 24, 39, 0.9)',
    },

    // Borders
    border: {
      subtle: 'rgba(255, 255, 255, 0.1)',
      medium: 'rgba(255, 255, 255, 0.2)',
    },

    // Purple accent (primary interaction)
    purple: {
      glow: 'rgba(168, 85, 247, 0.4)',
      accent: 'rgb(168, 85, 247)',
      subtle: 'rgba(168, 85, 247, 0.2)',
      bg: 'rgba(168, 85, 247, 0.1)',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
    },

    // Text
    text: {
      primary: '#f5f5f7',
      secondary: '#a3a3b0',
      muted: '#666',
    },

    // Status colors
    green: '#10b981',
    red: '#ef4444',
    yellow: '#f59e0b',
  },

  shadows: {
    // Purple glow for interactions
    purpleGlow: {
      shadowColor: '#a855f7',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 0,
    },

    // Subtle shadow for glass cards
    glass: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 5,
    },

    // Medium shadow for floating elements
    floating: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 15,
      elevation: 8,
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },

  // Glass morphism blur values
  blur: {
    sm: 10,
    md: 15,
    lg: 20,
  },
};

export type GlassThemeType = typeof GlassTheme;
