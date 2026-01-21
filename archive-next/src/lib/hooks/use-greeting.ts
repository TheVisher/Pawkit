import { useState, useEffect, useMemo } from 'react';

// Time-based greetings (always used for the first message)
function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

// Get time-appropriate icon
// Coffee for morning, Sun for afternoon, Sunset for evening, Moon for night
export function getTimeIcon(): 'coffee' | 'sun' | 'sunset' | 'moon' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'coffee'; // Morning coffee time
  if (hour >= 12 && hour < 17) return 'sun'; // Afternoon
  if (hour >= 17 && hour < 21) return 'sunset'; // Evening
  return 'moon'; // Night
}

// Random messages that rotate after the initial greeting
const randomMessages = [
  'Welcome back',
  'Nice to see you',
  'Ready to organize',
  'Saving any good links lately',
  'Found anything interesting',
  'Back for more',
  'What are we saving today',
  'Time to get organized',
  'Let\'s find something good',
  'Your knowledge awaits',
  'Ready to explore',
  'What\'s on your mind',
  'Discover something new',
  'Your digital space awaits',
  'Let\'s get things done',
];

// Storage key for persisting greeting state
const GREETING_STORAGE_KEY = 'pawkit-greeting-state';
const ROTATION_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

interface GreetingState {
  message: string;
  timestamp: number;
  isInitial: boolean;
}

function getStoredState(): GreetingState | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(GREETING_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore localStorage errors
  }
  return null;
}

function saveState(state: GreetingState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(GREETING_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore localStorage errors
  }
}

function getRandomMessage(excludeCurrent?: string): string {
  const available = randomMessages.filter(m => m !== excludeCurrent);
  return available[Math.floor(Math.random() * available.length)];
}

export function useGreeting(username?: string) {
  const [mounted, setMounted] = useState(false);
  const [greetingState, setGreetingState] = useState<GreetingState | null>(null);

  // Initialize on mount
  useEffect(() => {
    setMounted(true);

    const stored = getStoredState();
    const now = Date.now();

    if (stored && (now - stored.timestamp) < ROTATION_INTERVAL_MS) {
      // Use stored greeting if within rotation interval
      setGreetingState(stored);
    } else {
      // Generate new greeting
      const isInitial = !stored; // First time ever = use time greeting
      const message = isInitial ? getTimeGreeting() : getRandomMessage(stored?.message);
      const newState: GreetingState = {
        message,
        timestamp: now,
        isInitial: false, // After this, it's no longer initial
      };
      saveState(newState);
      setGreetingState(newState);
    }
  }, []);

  // Format the display name
  const displayName = useMemo(() => {
    if (!username) return '';
    // If it's an email, just use the part before @
    if (username.includes('@')) {
      return username.split('@')[0];
    }
    return username;
  }, [username]);

  // Get current date formatted
  const formattedDate = useMemo(() => {
    if (!mounted) return '';
    const now = new Date();
    return now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }, [mounted]);

  // Get time-appropriate icon
  const timeIcon = useMemo(() => {
    if (!mounted) return 'coffee';
    return getTimeIcon();
  }, [mounted]);

  return {
    message: greetingState?.message ?? getTimeGreeting(),
    displayName,
    formattedDate,
    timeIcon,
    mounted,
  };
}
