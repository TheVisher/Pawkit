/**
 * Subscription Info Parsing Utilities
 * Extract billing information from subscription supertag cards
 * Supports both HTML (legacy) and Plate JSON content formats
 */

import type { Card } from '@/lib/types/convex';
import { isSameDay, addDays, setDate, isBefore, isAfter } from 'date-fns';
import { isPlateJson, parseJsonContent } from '@/lib/plate/html-to-plate';

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
 * Extract all text content from a Plate JSON node recursively
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTextFromPlateNode(node: any): string {
  if ('text' in node && typeof node.text === 'string') {
    return node.text;
  }
  if ('children' in node && Array.isArray(node.children)) {
    return node.children.map(extractTextFromPlateNode).join('');
  }
  return '';
}

/**
 * Extract all text from Plate JSON content
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTextFromPlateContent(content: any[]): string {
  return content.map(extractTextFromPlateNode).join('\n');
}

/**
 * Parse subscription info from a card's content (HTML or JSON)
 */
export function parseSubscriptionInfo(card: Card): SubscriptionInfo | null {
  if (!card.content) return null;
  if (!card.tags?.includes('subscription')) return null;

  let textContent: string;

  // Check if content is Plate JSON
  if (isPlateJson(card.content)) {
    const parsed = parseJsonContent(card.content);
    if (!parsed) return null;
    textContent = extractTextFromPlateContent(parsed);
  } else {
    if (typeof card.content !== 'string') return null;
    // Fall back to HTML parsing
    const parser = new DOMParser();
    const doc = parser.parseFromString(card.content, 'text/html');
    textContent = doc.body.textContent || '';
  }

  // Extract amount: look for "Amount: $X/month" or "$X/month"
  const amount = extractAmountFromText(textContent);
  if (amount === null) return null;

  // Extract renewal day: look for "Renews: X" or "(day of month)"
  const renewalDay = extractRenewalDayFromText(textContent);
  if (renewalDay === null) return null;

  // Calculate due date for current month
  const today = new Date();
  const dueDate = getDueDateForMonth(renewalDay, today);
  const twoDaysFromNow = addDays(today, 2);

  return {
    cardId: card._id,
    cardTitle: card.title || 'Untitled Subscription',
    amount,
    renewalDay,
    dueDate,
    isDueSoon: !isBefore(dueDate, today) && !isAfter(dueDate, twoDaysFromNow),
    isPastDue: isBefore(dueDate, today) && !isSameDay(dueDate, today),
  };
}

/**
 * Extract dollar amount from text content
 */
function extractAmountFromText(text: string): number | null {
  // Match patterns like "$16/month", "$16.99/month", "Amount: $16"
  const patterns = [
    /\$(\d+(?:\.\d{2})?)\s*\/\s*month/i,
    /Amount:?\s*\$(\d+(?:\.\d{2})?)/i,
    /\$(\d+(?:\.\d{2})?)\s*(?:per|\/)\s*mo/i,
    // Also match "$ 15" pattern (with space after dollar sign)
    /Amount:?\s*\$\s*(\d+(?:\.\d{2})?)/i,
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
 * Extract renewal day from text content
 */
function extractRenewalDayFromText(text: string): number | null {
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
export function getSubscriptionsFromCards(cards: Card[]): SubscriptionInfo[] {
  const subscriptions: SubscriptionInfo[] = [];

  for (const card of cards) {
    if (card.deleted) continue;
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
