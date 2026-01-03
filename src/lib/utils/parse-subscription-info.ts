/**
 * Subscription Info Parsing Utilities
 * Extract billing information from subscription supertag cards
 */

import type { LocalCard } from '@/lib/db';
import { format, isSameDay, addDays, setDate, isBefore, isAfter } from 'date-fns';

export interface SubscriptionInfo {
  cardId: string;
  cardTitle: string;
  amount: number;          // Monthly cost in dollars
  renewalDay: number;      // Day of month (1-31)
  dueDate: Date;           // Due date this month
  isDueSoon: boolean;      // Due within 2 days
  isPastDue: boolean;      // Due date has passed (and not paid)
}

/**
 * Parse subscription info from a card's HTML content
 */
export function parseSubscriptionInfo(card: LocalCard): SubscriptionInfo | null {
  if (!card.content) return null;
  if (!card.tags?.includes('subscription')) return null;

  const parser = new DOMParser();
  const doc = parser.parseFromString(card.content, 'text/html');

  // Extract amount: look for "Amount: $X/month" or "$X/month"
  const amount = extractAmount(doc);
  if (amount === null) return null;

  // Extract renewal day: look for "Renews: X" or "(day of month)"
  const renewalDay = extractRenewalDay(doc);
  if (renewalDay === null) return null;

  // Calculate due date for current month
  const today = new Date();
  const dueDate = getDueDateForMonth(renewalDay, today);
  const twoDaysFromNow = addDays(today, 2);

  return {
    cardId: card.id,
    cardTitle: card.title || 'Untitled Subscription',
    amount,
    renewalDay,
    dueDate,
    isDueSoon: !isBefore(dueDate, today) && !isAfter(dueDate, twoDaysFromNow),
    isPastDue: isBefore(dueDate, today) && !isSameDay(dueDate, today),
  };
}

/**
 * Extract dollar amount from HTML content
 */
function extractAmount(doc: Document): number | null {
  const text = doc.body.textContent || '';

  // Match patterns like "$16/month", "$16.99/month", "Amount: $16"
  const patterns = [
    /\$(\d+(?:\.\d{2})?)\s*\/\s*month/i,
    /Amount:?\s*\$(\d+(?:\.\d{2})?)/i,
    /\$(\d+(?:\.\d{2})?)\s*(?:per|\/)\s*mo/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseFloat(match[1]);
    }
  }

  return null;
}

/**
 * Extract renewal day from HTML content
 */
function extractRenewalDay(doc: Document): number | null {
  const text = doc.body.textContent || '';

  // Match patterns like "Renews: 15", "Renews: 15th", "(day of month) 15"
  const patterns = [
    /Renews:?\s*(\d{1,2})(?:st|nd|rd|th)?/i,
    /(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s+(?:the\s+)?month|of\s+each\s+month)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const day = parseInt(match[1], 10);
      if (day >= 1 && day <= 31) {
        return day;
      }
    }
  }

  return null;
}

/**
 * Get the due date for a given day in the current month
 * If the day has already passed, returns this month's date (for past due calculation)
 */
function getDueDateForMonth(day: number, referenceDate: Date): Date {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  // Handle months with fewer days (e.g., Feb 30 -> Feb 28)
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const adjustedDay = Math.min(day, lastDayOfMonth);

  return setDate(new Date(year, month, 1), adjustedDay);
}

/**
 * Get all subscription info from cards
 */
export function getSubscriptionsFromCards(cards: LocalCard[]): SubscriptionInfo[] {
  const subscriptions: SubscriptionInfo[] = [];

  for (const card of cards) {
    if (card._deleted) continue;
    const info = parseSubscriptionInfo(card);
    if (info) {
      subscriptions.push(info);
    }
  }

  // Sort by due date
  return subscriptions.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

/**
 * Calculate total monthly spend
 */
export function calculateMonthlyTotal(subscriptions: SubscriptionInfo[]): number {
  return subscriptions.reduce((sum, sub) => sum + sub.amount, 0);
}

/**
 * Group subscriptions by status
 */
export function groupSubscriptions(
  subscriptions: SubscriptionInfo[],
  paidCardIds: string[]
): {
  dueThisWeek: SubscriptionInfo[];
  laterThisMonth: SubscriptionInfo[];
  paid: SubscriptionInfo[];
} {
  const today = new Date();
  const weekFromNow = addDays(today, 7);

  const dueThisWeek: SubscriptionInfo[] = [];
  const laterThisMonth: SubscriptionInfo[] = [];
  const paid: SubscriptionInfo[] = [];

  for (const sub of subscriptions) {
    if (paidCardIds.includes(sub.cardId)) {
      paid.push(sub);
    } else if (sub.isPastDue || (!isAfter(sub.dueDate, weekFromNow))) {
      // Past due or due within the week
      dueThisWeek.push(sub);
    } else {
      laterThisMonth.push(sub);
    }
  }

  return { dueThisWeek, laterThisMonth, paid };
}

/**
 * Format day with ordinal suffix (1st, 2nd, 3rd, etc.)
 */
export function formatDayWithOrdinal(day: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const relevantDigits = day % 100;
  const suffix = (relevantDigits >= 11 && relevantDigits <= 13)
    ? 'th'
    : suffixes[relevantDigits % 10] || 'th';
  return `${day}${suffix}`;
}

/**
 * Format amount as currency
 */
export function formatAmount(amount: number): string {
  return `$${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
}
