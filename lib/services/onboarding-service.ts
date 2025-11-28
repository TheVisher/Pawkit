/**
 * Onboarding Service
 *
 * Seeds new accounts with sample data to help users understand Pawkit's features.
 * All seeded items are tagged with '_onboarding' for easy identification and bulk deletion.
 *
 * Architecture:
 * - Uses the existing data store methods (addCard, addCollection)
 * - Stores onboardingSeeded flag in UserSettings (server-synced)
 * - Runs once per account lifetime
 */

import { useDataStore } from '@/lib/stores/data-store';
import { useEventStore } from '@/lib/hooks/use-event-store';
import { CalendarEvent } from '@/lib/types/calendar';

// Special tag to identify onboarding items
export const ONBOARDING_TAG = '_onboarding';

// Sample Pawkit (collection) data
const SAMPLE_PAWKITS = [
  { name: 'Welcome to Pawkit', slug: 'welcome-to-pawkit', parentSlug: null },
  { name: 'Read Later', slug: 'read-later', parentSlug: null },
  { name: 'Articles', slug: 'articles', parentSlug: 'read-later' },
] as const;

// Sample bookmark data
const SAMPLE_BOOKMARKS = [
  { title: 'The Shawshank Redemption', url: 'https://www.imdb.com/title/tt0111161/', pawkitSlug: 'welcome-to-pawkit' },
  { title: 'Pawkit - Your Visual Bookmark Manager', url: 'https://getpawkit.com', pawkitSlug: 'welcome-to-pawkit' },
  { title: 'Anthropic Cookbook', url: 'https://github.com/anthropics/anthropic-cookbook', pawkitSlug: 'welcome-to-pawkit' },
  { title: 'Welcome to YouTube', url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw', pawkitSlug: 'welcome-to-pawkit' },
  { title: 'The Verge', url: 'https://www.theverge.com', pawkitSlug: 'read-later' },
  { title: 'A Brief History of Time Zones', url: 'https://www.texasmonthly.com/news-politics/time-zones-history/', pawkitSlug: 'read-later' },
  { title: 'The AI Revolution: Part 1', url: 'https://waitbutwhy.com/2015/01/artificial-intelligence-revolution-1.html', pawkitSlug: 'articles' },
  { title: 'The AI Revolution: Part 2', url: 'https://waitbutwhy.com/2015/01/artificial-intelligence-revolution-2.html', pawkitSlug: 'articles' },
] as const;

// Sample notes content
const WELCOME_NOTE_CONTENT = `# Welcome to Pawkit Notes

This is a **markdown note**. You can write anything here!

## Try These Features:
- **Bold**, *italic*, and ~~strikethrough~~
- Lists and checkboxes
- Links to other notes using [[My First Reading List]]

Click the link above to see how wiki-links connect your notes!`;

const READING_LIST_NOTE_CONTENT = `# My First Reading List

This note was linked from [[Welcome to Pawkit Notes]].

When you link notes together, you can see **backlinks** in the panel below. This creates a personal knowledge graph!

## Articles to Read:
- [ ] Check out the articles in your "Read Later" pawkit
- [ ] Try Reader Mode on a long article
- [ ] Add your own notes here`;

// Daily note content template
const getDailyNoteContent = () => `# Welcome to Pawkit!

This is your **Daily Note** for today. Every day gets its own note!

## Getting Started:
- [ ] Browse your sample bookmarks in the Library
- [ ] Try the Reader Mode on an article
- [ ] Create your first bookmark with the + button
- [ ] Check out the [[Welcome to Pawkit Notes]] note

## Pro Tips:
- Press \`⌘K\` (or \`Ctrl+K\`) to quickly search anything
- Drag bookmarks between Pawkits to organize
- Use \`[[double brackets]]\` to link notes together

Happy organizing!`;

/**
 * Check if user has completed onboarding (has seeded data or dismissed onboarding)
 * Returns: { completed: boolean, authError: boolean }
 * - completed: true if onboarding was already done
 * - authError: true if we couldn't check due to auth issues (caller should retry)
 */
export async function hasCompletedOnboarding(): Promise<{ completed: boolean; authError: boolean }> {
  console.log('[Onboarding] hasCompletedOnboarding called');
  try {
    const response = await fetch('/api/user/settings');
    console.log('[Onboarding] /api/user/settings response status:', response.status);

    // If we get a 401, it means auth isn't ready yet - signal to retry
    if (response.status === 401) {
      console.warn('[Onboarding] Auth not ready (401), signaling retry');
      return { completed: false, authError: true };
    }

    if (!response.ok) {
      console.warn('[Onboarding] Failed to fetch user settings, status:', response.status);
      return { completed: true, authError: false }; // Assume completed on other errors to prevent re-seeding
    }

    const settings = await response.json();
    console.log('[Onboarding] Settings received:', {
      onboardingSeeded: settings.onboardingSeeded,
      onboardingBannerDismissed: settings.onboardingBannerDismissed,
      onboardingTourCompleted: settings.onboardingTourCompleted,
    });
    return { completed: settings.onboardingSeeded === true, authError: false };
  } catch (error) {
    console.error('[Onboarding] Error checking onboarding status:', error);
    return { completed: true, authError: false }; // Assume completed on error
  }
}

/**
 * Mark onboarding as complete (prevents re-seeding)
 */
export async function markOnboardingComplete(): Promise<void> {
  try {
    await fetch('/api/user/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboardingSeeded: true }),
    });
    console.log('[Onboarding] Marked as complete');
  } catch (error) {
    console.error('[Onboarding] Failed to mark onboarding complete:', error);
  }
}

/**
 * Seed the account with sample data
 * Creates pawkits, bookmarks, notes, and a calendar event
 */
export async function seedOnboardingData(): Promise<void> {
  console.log('[Onboarding] Starting to seed onboarding data...');

  const { addCard, addCollection, collections } = useDataStore.getState();

  try {
    // Step 1: Create Pawkits (collections)
    // We need to create parent pawkits first, then children
    const createdPawkitIds: Record<string, string> = {};

    for (const pawkit of SAMPLE_PAWKITS) {
      // Skip if this pawkit already exists (by slug)
      const existing = collections.find(c => c.slug === pawkit.slug);
      if (existing) {
        console.log(`[Onboarding] Pawkit "${pawkit.name}" already exists, skipping`);
        createdPawkitIds[pawkit.slug] = existing.id;
        continue;
      }

      // Find parent ID if this is a child pawkit
      let parentId: string | null = null;
      if (pawkit.parentSlug) {
        // Wait for parent to be created first
        const parent = collections.find(c => c.slug === pawkit.parentSlug) ||
          { id: createdPawkitIds[pawkit.parentSlug] };
        if (parent?.id) {
          parentId = parent.id;
        }
      }

      console.log(`[Onboarding] Creating pawkit: ${pawkit.name}`);
      await addCollection({
        name: pawkit.name,
        parentId,
        // Note: The addCollection method doesn't support tags, but pawkits
        // can be identified by having only onboarding-tagged cards
      });

      // Get the newly created collection to store its ID
      // We need to re-fetch because addCollection updates the store
      const freshCollections = useDataStore.getState().collections;
      const created = freshCollections.find(c => c.slug === pawkit.slug);
      if (created) {
        createdPawkitIds[pawkit.slug] = created.id;
      }
    }

    // Small delay to ensure collections are synced
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 2: Create Bookmarks
    for (const bookmark of SAMPLE_BOOKMARKS) {
      console.log(`[Onboarding] Creating bookmark: ${bookmark.title}`);
      await addCard({
        type: 'url',
        url: bookmark.url,
        title: bookmark.title,
        tags: [ONBOARDING_TAG],
        collections: [bookmark.pawkitSlug],
      });

      // Small delay between cards to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Step 3: Create Notes
    console.log('[Onboarding] Creating welcome note');
    await addCard({
      type: 'md-note',
      url: '', // Notes don't have URLs
      title: 'Welcome to Pawkit Notes',
      content: WELCOME_NOTE_CONTENT,
      tags: [ONBOARDING_TAG],
    });

    console.log('[Onboarding] Creating reading list note');
    await addCard({
      type: 'md-note',
      url: '',
      title: 'My First Reading List',
      content: READING_LIST_NOTE_CONTENT,
      tags: [ONBOARDING_TAG],
    });

    // Step 4: Create Daily Note for today
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dailyNoteTitle = `${dayNames[today.getDay()]}, ${monthNames[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;

    console.log('[Onboarding] Creating daily note for today');
    await addCard({
      type: 'md-note',
      url: '',
      title: dailyNoteTitle,
      content: getDailyNoteContent(),
      tags: ['daily', ONBOARDING_TAG],
    });

    // Step 5: Create Calendar Event for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    console.log('[Onboarding] Creating calendar event for tomorrow');

    // Ensure event store is initialized before adding event
    const eventStore = useEventStore.getState();
    if (!eventStore.isInitialized) {
      await eventStore.initialize();
    }

    const calendarEvent: Omit<CalendarEvent, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
      title: 'Explore your new Pawkit!',
      date: tomorrowStr,
      isAllDay: true,
      description: 'Take some time to explore all the features of Pawkit. Try creating bookmarks, organizing with Pawkits, and writing notes!',
      color: '#a855f7', // Purple accent
      source: { type: 'manual' },
    };

    // Add onboarding tag via description since events don't have tags
    // We'll identify onboarding events by checking if they have this specific title
    await eventStore.addEvent(calendarEvent as CalendarEvent);

    console.log('[Onboarding] Seeding complete!');

    // Mark onboarding as complete
    await markOnboardingComplete();

  } catch (error) {
    console.error('[Onboarding] Error seeding data:', error);
    // Don't mark as complete if seeding failed - allow retry on next load
    throw error;
  }
}

/**
 * Delete all onboarding data
 * Removes all items tagged with '_onboarding'
 */
export async function deleteOnboardingData(): Promise<{ deletedCards: number; deletedPawkits: number; deletedEvent: boolean }> {
  console.log('[Onboarding] Deleting onboarding data...');

  const { cards, deleteCard, collections, deleteCollection } = useDataStore.getState();

  // Ensure event store is initialized before accessing events
  const eventStore = useEventStore.getState();
  if (!eventStore.isInitialized) {
    await eventStore.initialize();
  }

  const { events, deleteEvent } = useEventStore.getState();

  let deletedCards = 0;
  let deletedPawkits = 0;
  let deletedEvent = false;

  try {
    // Delete onboarding cards (bookmarks and notes)
    const onboardingCards = cards.filter(card =>
      card.tags?.includes(ONBOARDING_TAG)
    );

    for (const card of onboardingCards) {
      try {
        console.log(`[Onboarding] Deleting card: ${card.title}`);
        await deleteCard(card.id);
        deletedCards++;
      } catch (err) {
        console.warn(`[Onboarding] Failed to delete card ${card.id}:`, err);
        // Continue with other cards even if one fails
      }
    }

    // Delete onboarding pawkits (collections)
    // We identify them by their slugs from SAMPLE_PAWKITS
    const onboardingSlugs: string[] = SAMPLE_PAWKITS.map(p => p.slug);
    const onboardingCollections = collections.filter(c =>
      onboardingSlugs.includes(c.slug)
    );

    // Delete children first, then parents
    const sortedCollections = [...onboardingCollections].sort((a, b) => {
      // Children (those with parentId) come first
      if (a.parentId && !b.parentId) return -1;
      if (!a.parentId && b.parentId) return 1;
      return 0;
    });

    for (const collection of sortedCollections) {
      try {
        console.log(`[Onboarding] Deleting pawkit: ${collection.name}`);
        await deleteCollection(collection.id, false, false);
        deletedPawkits++;
      } catch (err) {
        console.warn(`[Onboarding] Failed to delete pawkit ${collection.id}:`, err);
        // Continue with other pawkits even if one fails
      }
    }

    // Delete onboarding calendar event
    // We identify it by its title since events don't have tags
    const onboardingEvent = events.find(e =>
      e.title === 'Explore your new Pawkit!'
    );

    if (onboardingEvent) {
      try {
        console.log('[Onboarding] Deleting calendar event');
        await deleteEvent(onboardingEvent.id);
        deletedEvent = true;
      } catch (err) {
        console.warn('[Onboarding] Failed to delete calendar event:', err);
      }
    }

    console.log(`[Onboarding] Deletion complete! Deleted ${deletedCards} cards, ${deletedPawkits} pawkits, event: ${deletedEvent}`);
    return { deletedCards, deletedPawkits, deletedEvent };

  } catch (error) {
    console.error('[Onboarding] Error deleting data:', error);
    throw error;
  }
}

/**
 * Check if onboarding should run
 * Returns true if this appears to be a new user with no data
 */
export function shouldRunOnboarding(cards: any[], collections: any[]): boolean {
  // If user has any non-deleted cards or collections, don't seed
  const hasCards = cards.length > 0;
  const nonSystemCollections = collections.filter(c => !c.isSystem);
  const hasCollections = nonSystemCollections.length > 0;

  console.log('[Onboarding] shouldRunOnboarding check:', {
    cardsLength: cards.length,
    hasCards,
    collectionsLength: collections.length,
    nonSystemCollectionsLength: nonSystemCollections.length,
    hasCollections,
    result: !hasCards && !hasCollections,
  });

  return !hasCards && !hasCollections;
}

// Export slugs for external use
export const ONBOARDING_PAWKIT_SLUGS: string[] = SAMPLE_PAWKITS.map(p => p.slug);

/**
 * Check if any onboarding data still exists
 * Returns true if there are any onboarding-tagged cards, onboarding pawkits, or the onboarding calendar event
 */
export function hasOnboardingData(): boolean {
  const { cards, collections } = useDataStore.getState();
  const { events, isInitialized: eventsInitialized } = useEventStore.getState();

  // Check for cards/notes with _onboarding tag
  const hasOnboardingCards = cards.some(card =>
    card.tags?.includes(ONBOARDING_TAG)
  );

  // Check for onboarding pawkits by slug
  const hasOnboardingPawkits = collections.some(c =>
    ONBOARDING_PAWKIT_SLUGS.includes(c.slug)
  );

  // Check for onboarding calendar event (only if events store is initialized)
  const hasOnboardingEvent = eventsInitialized && events.some(e =>
    e.title === 'Explore your new Pawkit!'
  );

  return hasOnboardingCards || hasOnboardingPawkits || hasOnboardingEvent;
}

/**
 * Get counts of onboarding items for display
 */
export function getOnboardingDataCounts(): { cards: number; pawkits: number; hasEvent: boolean } {
  const { cards, collections } = useDataStore.getState();
  const { events, isInitialized: eventsInitialized } = useEventStore.getState();

  const onboardingCards = cards.filter(card =>
    card.tags?.includes(ONBOARDING_TAG)
  );

  const onboardingPawkits = collections.filter(c =>
    ONBOARDING_PAWKIT_SLUGS.includes(c.slug)
  );

  const hasOnboardingEvent = eventsInitialized && events.some(e =>
    e.title === 'Explore your new Pawkit!'
  );

  return {
    cards: onboardingCards.length,
    pawkits: onboardingPawkits.length,
    hasEvent: hasOnboardingEvent,
  };
}
