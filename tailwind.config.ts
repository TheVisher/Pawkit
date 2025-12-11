import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
  	extend: {
  		colors: {
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))',
  				muted: 'hsl(var(--accent-h) var(--accent-s) 35%)',
  				subtle: 'hsl(var(--accent-h) var(--accent-s) 20%)',
  				hover: 'hsl(var(--accent-h) var(--accent-s) calc(var(--accent-l) + 10%))',
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			'glass-surface': 'rgba(255, 255, 255, 0.05)',
  			'glass-border': 'rgba(255, 255, 255, 0.08)',
  			'success-glow': '#22c55e',
  			'danger-glow': '#ef4444',
  			// Surface hierarchy - uses design system variables
  			surface: {
  				1: 'var(--bg-surface-1)',
  				2: 'var(--bg-surface-2)',
  				3: 'var(--bg-surface-3)',
  				4: 'var(--bg-surface-4)',
  			},
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			'3xl': '24px',
  		},
  		boxShadow: {
  			'glow-accent': '0 0 25px rgba(124, 58, 237, 0.45)',
  			'glow-success': '0 0 25px rgba(34, 197, 94, 0.45)',
  			'glow-danger': '0 0 25px rgba(239, 68, 68, 0.45)',
  			// Elevation system - uses design system shadow variables
  			'elevation-1': 'var(--shadow-1)',
  			'elevation-2': 'var(--shadow-2)',
  			'elevation-3': 'var(--shadow-3)',
  			'elevation-4': 'var(--shadow-4)',
  		},
  		keyframes: {
  			'slide-in-right': {
  				'0%': { transform: 'translateX(100%)', opacity: '0' },
  				'100%': { transform: 'translateX(0)', opacity: '1' }
  			},
  			'slide-in-left': {
  				'0%': { transform: 'translateX(-100%)', opacity: '0' },
  				'100%': { transform: 'translateX(0)', opacity: '1' }
  			},
  			'slide-down': {
  				'0%': { transform: 'translateY(-100%)', opacity: '0' },
  				'100%': { transform: 'translateY(0)', opacity: '1' }
  			},
  			'fade-in': {
  				'0%': { opacity: '0' },
  				'100%': { opacity: '1' }
  			},
  			'ping-once': {
  				'0%': { transform: 'scale(1)', opacity: '1' },
  				'50%': { transform: 'scale(2)', opacity: '0.5' },
  				'100%': { transform: 'scale(2.5)', opacity: '0' }
  			},
  			'expand-contract-fade': {
  				'0%': { transform: 'scale(1)', opacity: '1' },
  				'35%': { transform: 'scale(2.5)', opacity: '0.6' },
  				'50%': { transform: 'scale(1)', opacity: '0.8' },
  				'75%': { transform: 'scale(1)', opacity: '0.8' },
  				'100%': { transform: 'scale(0.8)', opacity: '0' }
  			},
  			'wave-slow': {
  				'0%, 100%': { transform: 'translate(0%, 0%) scale(1)' },
  				'50%': { transform: 'translate(-10%, 5%) scale(1.1)' }
  			},
  			'wave-medium': {
  				'0%, 100%': { transform: 'translate(0%, 0%) rotate(0deg)' },
  				'50%': { transform: 'translate(15%, -10%) rotate(3deg)' }
  			},
  			'wave-fast': {
  				'0%, 100%': { transform: 'translate(0%, 0%) scale(1)' },
  				'33%': { transform: 'translate(-15%, 10%) scale(1.05)' },
  				'66%': { transform: 'translate(10%, -5%) scale(0.95)' }
  			},
  			'aurora-top': {
  				'0%, 100%': { opacity: '0.2', transform: 'translateY(0%)' },
  				'50%': { opacity: '0.3', transform: 'translateY(10%)' }
  			},
  			'aurora-bottom': {
  				'0%, 100%': { opacity: '0.25', transform: 'translateY(0%)' },
  				'50%': { opacity: '0.35', transform: 'translateY(-10%)' }
  			},
  			'mesh-rotate': {
  				'0%': { transform: 'rotate(0deg)' },
  				'100%': { transform: 'rotate(360deg)' }
  			}
  		},
  		animation: {
  			'slide-in-right': 'slide-in-right 0.3s ease-out',
  			'slide-in-left': 'slide-in-left 0.3s ease-out',
  			'slide-down': 'slide-down 0.3s ease-out',
  			'fade-in': 'fade-in 0.3s ease-out',
  			'ping-once': 'ping-once 0.5s ease-out',
  			'expand-contract-fade': 'expand-contract-fade 1.5s ease-in-out forwards',
  			'wave-slow': 'wave-slow 30s ease-in-out infinite',
  			'wave-medium': 'wave-medium 20s ease-in-out infinite',
  			'wave-fast': 'wave-fast 15s ease-in-out infinite',
  			'aurora-top': 'aurora-top 25s ease-in-out infinite',
  			'aurora-bottom': 'aurora-bottom 25s ease-in-out infinite reverse',
  			'mesh-rotate': 'mesh-rotate 60s linear infinite'
  		}
  	}
  },
  plugins: [
    require("@tailwindcss/typography"),
      require("tailwindcss-animate")
]
};

export default config;
