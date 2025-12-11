// lib/ai/kit-context.ts

import { SupabaseClient } from '@supabase/supabase-js';
import { estimateTokens, KIT_CONFIG } from './kit-config';

/**
 * Context for Kit to understand what the user is asking about
 */
interface CardContext {
  id: string;
  title: string;
  url?: string;
  description?: string;
  content?: string;  // Extracted article content
  notes?: string;    // User's notes
  tags?: string[];
}

interface PawkitInfo {
  name: string;
  slug: string;
}

type ViewContext = 'library' | 'notes' | 'calendar' | 'pawkit' | 'home';

/**
 * Parse tags/collections from comma-separated string to array
 */
function parseCommaSeparated(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.split(',').map(t => t.trim()).filter(Boolean);
}

/**
 * Detect if user is asking about a specific Pawkit
 * Returns the matching pawkit slug if found
 */
function detectPawkitInQuery(query: string, pawkits: PawkitInfo[]): PawkitInfo | null {
  const queryLower = query.toLowerCase();

  for (const pawkit of pawkits) {
    const nameLower = pawkit.name.toLowerCase();
    // Check if the pawkit name appears in the query
    if (queryLower.includes(nameLower)) {
      console.log(`[Kit] Detected pawkit reference: "${pawkit.name}" (${pawkit.slug})`);
      return pawkit;
    }
  }

  return null;
}

/**
 * Build context from user's Pawkit data for Kit to reference
 *
 * Strategy: Give Kit access to the user's data based on current view context
 * - library/home: Full library of cards
 * - notes: User's notes
 * - calendar: Future - calendar events
 * - pawkit: Cards in the specific pawkit
 */
export async function buildKitContext(
  userId: string,
  query: string,
  supabase: SupabaseClient,
  cardContext?: CardContext,
  viewContext?: ViewContext,
  pawkitSlug?: string
): Promise<string> {
  const contextParts: string[] = [];
  let totalTokens = 0;
  const maxContextTokens = KIT_CONFIG.limits.maxInputTokens - 2000;

  console.log('[Kit] Building context for query:', query);
  console.log('[Kit] User ID:', userId);
  console.log('[Kit] View context:', viewContext || 'default');
  if (pawkitSlug) console.log('[Kit] Pawkit slug:', pawkitSlug);

  // Add view context hint for Kit
  if (viewContext) {
    const viewHints: Record<ViewContext, string> = {
      library: 'User is browsing their Library (all saved bookmarks and content).',
      notes: 'User is in the Notes section. Focus on their notes and markdown documents.',
      calendar: 'User is viewing their Calendar.',
      pawkit: pawkitSlug
        ? `User is viewing the "${pawkitSlug}" Pawkit (collection). Focus on items in this collection.`
        : 'User is browsing their Pawkits (collections).',
      home: 'User is on the Home dashboard.',
    };
    contextParts.push(`## Current View\n${viewHints[viewContext]}`);
    totalTokens += estimateTokens(viewHints[viewContext]);
  }

  // 1. Add specific card context if provided (e.g., user is viewing a specific card)
  if (cardContext) {
    let cardSection = `## Current Card\n`;
    cardSection += `**Title**: ${cardContext.title}\n`;
    if (cardContext.url) cardSection += `**URL**: ${cardContext.url}\n`;
    if (cardContext.description) cardSection += `**Description**: ${cardContext.description}\n`;
    if (cardContext.tags?.length) cardSection += `**Tags**: ${cardContext.tags.join(', ')}\n`;
    if (cardContext.notes) cardSection += `**User Notes**: ${cardContext.notes}\n`;
    if (cardContext.content) {
      const contentLimit = 4000;
      const truncatedContent = cardContext.content.length > contentLimit
        ? cardContext.content.slice(0, contentLimit) + '...[truncated]'
        : cardContext.content;
      cardSection += `**Content**:\n${truncatedContent}\n`;
    }

    const sectionTokens = estimateTokens(cardSection);
    if (totalTokens + sectionTokens < maxContextTokens) {
      contextParts.push(cardSection);
      totalTokens += sectionTokens;
    }
  }

  // Handle different view contexts
  if (viewContext === 'notes') {
    // Fetch user's notes
    await buildNotesContext(userId, supabase, contextParts, totalTokens, maxContextTokens);
  } else if (viewContext === 'pawkit' && pawkitSlug) {
    // Fetch cards in the specific pawkit
    await buildPawkitContext(userId, pawkitSlug, supabase, contextParts, totalTokens, maxContextTokens);
  } else {
    // Default: library/home - fetch full library
    await buildLibraryContext(userId, query, supabase, contextParts, totalTokens, maxContextTokens);
  }

  const result = contextParts.length > 0
    ? contextParts.join('\n\n')
    : 'User has no saved items yet.';

  console.log('[Kit] Built context with', contextParts.length, 'sections');

  return result;
}

/**
 * Build context for Notes view
 */
async function buildNotesContext(
  userId: string,
  supabase: SupabaseClient,
  contextParts: string[],
  totalTokens: number,
  maxContextTokens: number
): Promise<void> {
  try {
    // Fetch notes (cards with type 'md-note')
    const { data: notes, error } = await supabase
      .from('Card')
      .select('id, title, description, content, tags, createdAt, updatedAt')
      .eq('userId', userId)
      .eq('deleted', false)
      .eq('type', 'md-note')
      .order('updatedAt', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[Kit] Error fetching notes:', error);
      return;
    }

    console.log('[Kit] Found', notes?.length || 0, 'notes');

    if (notes?.length) {
      let notesSection = `## User's Notes (${notes.length} notes)\n`;
      notesSection += `These are the user's markdown notes:\n\n`;

      for (const note of notes) {
        notesSection += `### ${note.title || 'Untitled Note'}\n`;
        if (note.description) notesSection += `${note.description}\n`;
        if (note.content) {
          // Include first 500 chars of content for context
          const preview = note.content.length > 500
            ? note.content.slice(0, 500) + '...'
            : note.content;
          notesSection += `\`\`\`\n${preview}\n\`\`\`\n`;
        }
        notesSection += '\n';
      }

      const sectionTokens = estimateTokens(notesSection);
      if (totalTokens + sectionTokens < maxContextTokens) {
        contextParts.push(notesSection);
      } else {
        // Truncate to fit
        const availableTokens = maxContextTokens - totalTokens - 100;
        const charsAvailable = availableTokens * 4;
        notesSection = notesSection.slice(0, charsAvailable) + '\n...[truncated]';
        contextParts.push(notesSection);
      }
    }
  } catch (err) {
    console.error('[Kit] Exception fetching notes:', err);
  }
}

/**
 * Build context for a specific Pawkit
 */
async function buildPawkitContext(
  userId: string,
  pawkitSlug: string,
  supabase: SupabaseClient,
  contextParts: string[],
  totalTokens: number,
  maxContextTokens: number
): Promise<void> {
  try {
    // Get pawkit info
    const { data: pawkit } = await supabase
      .from('Collection')
      .select('name, slug, description')
      .eq('userId', userId)
      .eq('slug', pawkitSlug)
      .single();

    const pawkitName = pawkit?.name || pawkitSlug;

    // Fetch cards in this pawkit
    const { data: cards, error } = await supabase
      .from('Card')
      .select('id, title, description, url, domain, tags, type')
      .eq('userId', userId)
      .eq('deleted', false)
      .ilike('collections', `%${pawkitSlug}%`)
      .order('createdAt', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[Kit] Error fetching pawkit cards:', error);
      return;
    }

    console.log('[Kit] Cards in pawkit "' + pawkitName + '":', cards?.length || 0);

    if (cards?.length) {
      let pawkitSection = `## "${pawkitName}" Pawkit (${cards.length} items)\n`;
      if (pawkit?.description) pawkitSection += `${pawkit.description}\n\n`;

      for (const card of cards) {
        pawkitSection += `- **${card.title || 'Untitled'}**`;
        if (card.domain) pawkitSection += ` (${card.domain})`;
        if (card.type === 'md-note') pawkitSection += ` [Note]`;
        const tagArray = parseCommaSeparated(card.tags);
        if (tagArray.length) pawkitSection += ` [${tagArray.slice(0, 3).join(', ')}]`;
        pawkitSection += '\n';
      }

      const sectionTokens = estimateTokens(pawkitSection);
      if (totalTokens + sectionTokens < maxContextTokens) {
        contextParts.push(pawkitSection);
      }
    } else {
      contextParts.push(`## "${pawkitName}" Pawkit\nThis pawkit is empty.`);
    }
  } catch (err) {
    console.error('[Kit] Exception fetching pawkit:', err);
  }
}

/**
 * Build context for Library view (default)
 */
async function buildLibraryContext(
  userId: string,
  query: string,
  supabase: SupabaseClient,
  contextParts: string[],
  totalTokens: number,
  maxContextTokens: number
): Promise<void> {
  // Get user's Pawkits for context and query detection
  let pawkits: PawkitInfo[] = [];
  try {
    const { data: pawkitsData, error: pawkitsError } = await supabase
      .from('Collection')
      .select('name, slug')
      .eq('userId', userId)
      .eq('deleted', false)
      .order('name')
      .limit(50);

    if (pawkitsError) {
      console.error('[Kit] Error fetching pawkits:', pawkitsError);
    } else {
      pawkits = pawkitsData || [];
      console.log('[Kit] Found', pawkits.length, 'pawkits');
    }

    if (pawkits.length) {
      let pawkitSection = `## User's Pawkits (${pawkits.length} collections)\n`;
      pawkitSection += pawkits.map(p => `- ${p.name}`).join('\n');

      const sectionTokens = estimateTokens(pawkitSection);
      if (totalTokens + sectionTokens < maxContextTokens) {
        contextParts.push(pawkitSection);
        totalTokens += sectionTokens;
      }
    }
  } catch (err) {
    console.error('[Kit] Exception fetching pawkits:', err);
  }

  // Check if user is asking about a specific Pawkit
  const targetPawkit = detectPawkitInQuery(query, pawkits);

  if (targetPawkit) {
    // User asked about a specific Pawkit - fetch cards in that collection
    try {
      const { data: pawkitCards, error: pawkitCardsError } = await supabase
        .from('Card')
        .select('id, title, description, url, domain, tags, collections')
        .eq('userId', userId)
        .eq('deleted', false)
        .ilike('collections', `%${targetPawkit.slug}%`)
        .limit(100);

      if (pawkitCardsError) {
        console.error('[Kit] Error fetching pawkit cards:', pawkitCardsError);
      }

      console.log('[Kit] Cards in pawkit "' + targetPawkit.name + '":', pawkitCards?.length || 0);

      if (pawkitCards?.length) {
        let pawkitCardsSection = `## Cards in "${targetPawkit.name}" Pawkit (${pawkitCards.length} items)\n`;
        for (const card of pawkitCards) {
          pawkitCardsSection += `- **${card.title || 'Untitled'}**`;
          if (card.domain) pawkitCardsSection += ` (${card.domain})`;
          const tagArray = parseCommaSeparated(card.tags);
          if (tagArray.length) pawkitCardsSection += ` [${tagArray.slice(0, 3).join(', ')}]`;
          pawkitCardsSection += '\n';
        }

        const sectionTokens = estimateTokens(pawkitCardsSection);
        if (totalTokens + sectionTokens < maxContextTokens) {
          contextParts.push(pawkitCardsSection);
          totalTokens += sectionTokens;
        }
      } else {
        contextParts.push(`## Cards in "${targetPawkit.name}" Pawkit\nThis pawkit is empty.`);
      }
    } catch (err) {
      console.error('[Kit] Exception fetching pawkit cards:', err);
    }
  } else {
    // Fetch the user's FULL library
    try {
      const { data: allCards, error: cardsError } = await supabase
        .from('Card')
        .select('title, domain, tags, collections, type')
        .eq('userId', userId)
        .eq('deleted', false)
        .order('createdAt', { ascending: false })
        .limit(200);

      if (cardsError) {
        console.error('[Kit] Error fetching cards:', cardsError);
      }

      console.log('[Kit] Total cards found:', allCards?.length || 0);

      if (allCards?.length) {
        let librarySection = `## User's Library (${allCards.length} saved items)\n`;
        librarySection += `Use this list to answer questions about the user's saved content.\n\n`;

        for (const card of allCards) {
          librarySection += `- ${card.title || 'Untitled'}`;
          if (card.domain) librarySection += ` (${card.domain})`;
          if (card.type === 'md-note') librarySection += ` [Note]`;
          const tagArray = parseCommaSeparated(card.tags);
          if (tagArray.length) librarySection += ` [${tagArray.slice(0, 2).join(', ')}]`;
          const collections = parseCommaSeparated(card.collections);
          if (collections.length) librarySection += ` {${collections.slice(0, 2).join(', ')}}`;
          librarySection += '\n';
        }

        const sectionTokens = estimateTokens(librarySection);

        if (totalTokens + sectionTokens < maxContextTokens) {
          contextParts.push(librarySection);
        } else {
          // Too many cards - truncate to fit
          const availableTokens = maxContextTokens - totalTokens - 100;
          const charsAvailable = availableTokens * 4;
          librarySection = librarySection.slice(0, charsAvailable) + '\n...[truncated]';
          contextParts.push(librarySection);
        }
      }
    } catch (err) {
      console.error('[Kit] Exception fetching cards:', err);
    }
  }
}
