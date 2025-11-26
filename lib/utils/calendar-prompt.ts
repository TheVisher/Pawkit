/**
 * Calendar Prompt Utility
 *
 * Shows a toast prompt when a card has extracted dates,
 * allowing users to add the date to their calendar.
 */

import { CardDTO } from '@/lib/server/cards';
import { ExtractedDate } from '@/lib/types';
import { extractDatesFromMetadata, getMostRelevantDate } from '@/lib/utils/extract-dates';
import { useToastStore } from '@/lib/stores/toast-store';
import { useEventStore } from '@/lib/hooks/use-event-store';
import { format } from 'date-fns';

/**
 * Process a card's metadata for dates and show calendar prompt if found
 * Returns the extracted dates (for storing on the card)
 */
export function processCardForDates(card: CardDTO): ExtractedDate[] {
  if (!card.metadata || card.type !== 'url') {
    return [];
  }

  // Extract dates from metadata
  const extractedDates = extractDatesFromMetadata(card.metadata as Record<string, unknown>);

  if (extractedDates.length === 0) {
    return [];
  }

  // Get the most relevant date to show in the prompt
  const relevantDate = getMostRelevantDate(extractedDates);

  if (relevantDate) {
    // Show the calendar prompt toast
    showCalendarPrompt(card, relevantDate);
  }

  return extractedDates;
}

/**
 * Show a toast prompting the user to add a date to their calendar
 */
function showCalendarPrompt(card: CardDTO, date: ExtractedDate) {
  const formattedDate = formatDateForDisplay(date.date);
  const label = date.label || 'Date found';

  const message = `${label}: ${formattedDate}`;

  useToastStore.getState().withAction(
    message,
    {
      label: 'Add to Calendar',
      onClick: () => addToCalendar(card, date),
    },
    'calendar',
    10000 // 10 seconds to give user time to decide
  );
}

/**
 * Add the extracted date to the calendar as an event
 */
async function addToCalendar(card: CardDTO, date: ExtractedDate) {
  try {
    const eventStore = useEventStore.getState();

    // Create the calendar event
    await eventStore.addEvent({
      title: card.title || card.domain || 'Saved Link',
      date: date.date,
      endDate: date.endDate || null,
      isAllDay: true,
      description: card.description || undefined,
      url: card.url || undefined,
      color: getColorForDateType(date.type),
      source: {
        type: 'card',
        cardId: card.id,
      },
    });

    // Show success toast
    useToastStore.getState().success('Added to calendar!');
  } catch (error) {
    console.error('Failed to add to calendar:', error);
    useToastStore.getState().error('Failed to add to calendar');
  }
}

/**
 * Format date for display in toast
 */
function formatDateForDisplay(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return format(date, 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

/**
 * Get a color for the event based on date type
 */
function getColorForDateType(type: ExtractedDate['type']): string {
  switch (type) {
    case 'release':
      return '#f97316'; // Orange for releases
    case 'event':
      return '#8b5cf6'; // Purple for events
    case 'deadline':
      return '#ef4444'; // Red for deadlines
    case 'published':
      return '#3b82f6'; // Blue for published
    default:
      return '#8b5cf6'; // Default purple
  }
}
