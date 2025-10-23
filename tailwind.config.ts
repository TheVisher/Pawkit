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
  				foreground: 'hsl(var(--accent-foreground))'
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
  			}
  		},
  		animation: {
  			'slide-in-right': 'slide-in-right 0.3s ease-out',
  			'slide-in-left': 'slide-in-left 0.3s ease-out',
  			'fade-in': 'fade-in 0.3s ease-out',
  			'ping-once': 'ping-once 0.5s ease-out',
  			'expand-contract-fade': 'expand-contract-fade 1.5s ease-in-out'
  		}
  	}
  },
  plugins: [
    require("@tailwindcss/typography"),
      require("tailwindcss-animate")
]
};

export default config;
