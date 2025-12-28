'use client';

import { useMemo } from 'react';
import { Flame } from 'lucide-react';
import { useCards } from '@/lib/stores/data-store';
import type { LocalCard } from '@/lib/db';

/**
 * Calculate activity streak from card creation dates
 * A streak is consecutive days with at least one card created
 */
function calculateStreak(cards: LocalCard[]): number {
  if (cards.length === 0) return 0;

  // Get unique dates when cards were created (excluding deleted)
  const creationDates = new Set<string>();
  for (const card of cards) {
    if (card._deleted) continue;
    const date = new Date(card.createdAt);
    creationDates.add(date.toISOString().split('T')[0]);
  }

  if (creationDates.size === 0) return 0;

  // Sort dates descending
  const sortedDates = Array.from(creationDates).sort().reverse();

  // Check if today or yesterday has activity (streak must be current)
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
    return 0; // No recent activity, streak broken
  }

  // Count consecutive days
  let streak = 1;
  let currentDate = new Date(sortedDates[0]);

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];

    if (sortedDates[i] === prevDateStr) {
      streak++;
      currentDate = prevDate;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Hook to get stats data - used by both inline and banner versions
 */
export function useHomeStats() {
  const cards = useCards();

  return useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let unread = 0;
    let inProgress = 0;
    let addedThisWeek = 0;

    for (const card of cards) {
      if (card._deleted) continue;

      // Unread: URL cards that haven't been read
      if (card.type === 'url' && !card.isRead) {
        unread++;
      }

      // In Progress: cards with reading progress between 0 and 100
      if (card.readProgress && card.readProgress > 0 && card.readProgress < 100) {
        inProgress++;
      }

      // Added this week
      if (new Date(card.createdAt) >= weekAgo) {
        addedThisWeek++;
      }
    }

    const streak = calculateStreak(cards);

    return { streak, unread, inProgress, addedThisWeek };
  }, [cards]);
}

/**
 * Inline Stats - Compact version for header row
 * Shows stats inline with the greeting on desktop, hidden on mobile
 */
export function InlineStats() {
  const stats = useHomeStats();

  return (
    <div className="hidden md:flex items-center gap-3 text-xs text-text-muted whitespace-nowrap">
      {/* Streak */}
      <div className="flex items-center gap-1">
        <Flame
          className="h-3.5 w-3.5"
          style={{ color: stats.streak > 0 ? 'var(--color-accent)' : 'currentColor' }}
        />
        <span className="font-medium text-text-secondary">{stats.streak}</span>
      </div>

      <span>•</span>

      {/* Unread */}
      <span>
        <span className="font-medium text-text-secondary">{stats.unread}</span> unread
      </span>

      <span>•</span>

      {/* In Progress */}
      <span>
        <span className="font-medium text-text-secondary">{stats.inProgress}</span> in progress
      </span>

      <span>•</span>

      {/* Added This Week */}
      <span>
        <span className="font-medium text-text-secondary">{stats.addedThisWeek}</span> this week
      </span>
    </div>
  );
}

/**
 * Mobile Stats Row - Compact row for mobile view
 * Shows below the header greeting on mobile only
 */
export function MobileStatsRow() {
  const stats = useHomeStats();

  return (
    <div className="flex md:hidden items-center gap-3 text-xs text-text-muted px-4 pb-2">
      <div className="flex items-center gap-1">
        <Flame
          className="h-3.5 w-3.5"
          style={{ color: stats.streak > 0 ? 'var(--color-accent)' : 'currentColor' }}
        />
        <span className="font-medium text-text-secondary">{stats.streak}</span>
      </div>
      <span>•</span>
      <span><span className="font-medium text-text-secondary">{stats.unread}</span> unread</span>
      <span>•</span>
      <span><span className="font-medium text-text-secondary">{stats.inProgress}</span> in progress</span>
      <span>•</span>
      <span><span className="font-medium text-text-secondary">{stats.addedThisWeek}</span> this week</span>
    </div>
  );
}

/**
 * Stats Banner - Full-width version (legacy, kept for compatibility)
 */
export function StatsBanner() {
  const stats = useHomeStats();

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-bg-surface-2 rounded-lg text-sm text-text-secondary">
      {/* Streak */}
      <div className="flex items-center gap-1.5">
        <Flame
          className="h-4 w-4"
          style={{ color: stats.streak > 0 ? 'var(--color-accent)' : 'currentColor' }}
        />
        <span>
          <span className="font-medium text-text-primary">{stats.streak}</span> day streak
        </span>
      </div>

      <span className="text-text-muted">•</span>

      {/* Unread */}
      <span>
        <span className="font-medium text-text-primary">{stats.unread}</span> unread
      </span>

      <span className="text-text-muted">•</span>

      {/* In Progress */}
      <span>
        <span className="font-medium text-text-primary">{stats.inProgress}</span> in progress
      </span>

      <span className="text-text-muted">•</span>

      {/* Added This Week */}
      <span>
        <span className="font-medium text-text-primary">{stats.addedThisWeek}</span> added this week
      </span>
    </div>
  );
}
