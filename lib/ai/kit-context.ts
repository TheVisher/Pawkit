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
 * Strategy: Give Kit access to the user's FULL library (up to token limits)
 * so Claude can use its intelligence to understand semantic queries like
 * "what movies do I have" without relying on keyword matching.
 */
export async function buildKitContext(
  userId: string,
  query: string,
  supabase: SupabaseClient,
  cardContext?: CardContext
): Promise<string> {
  const contextParts: string[] = [];
  let totalTokens = 0;
  const maxContextTokens = KIT_CONFIG.limits.maxInputTokens - 2000;

  console.log('[Kit] Building context for query:', query);
  console.log('[Kit] User ID:', userId);

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

  // 2. Get user's Pawkits (collections) for context
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
      console.log('[Kit] Found', pawkits.length, 'pawkits:', pawkits.map(p => p.name).join(', '));
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

  // 3. Check if user is asking about a specific Pawkit
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
    // 4. No specific pawkit - fetch the user's FULL library
    // Let Claude's intelligence figure out what's relevant to the query
    try {
      const { data: allCards, error: cardsError } = await supabase
        .from('Card')
        .select('title, domain, tags, collections')
        .eq('userId', userId)
        .eq('deleted', false)
        .order('createdAt', { ascending: false })
        .limit(200); // Fetch up to 200 cards

      if (cardsError) {
        console.error('[Kit] Error fetching cards:', cardsError);
      }

      console.log('[Kit] Total cards found:', allCards?.length || 0);

      if (allCards?.length) {
        let librarySection = `## User's Library (${allCards.length} saved items)\n`;
        librarySection += `Use this list to answer questions about the user's saved content. You can identify movies, articles, recipes, etc. by their titles and domains.\n\n`;
        
        for (const card of allCards) {
          librarySection += `- ${card.title || 'Untitled'}`;
          if (card.domain) librarySection += ` (${card.domain})`;
          const tagArray = parseCommaSeparated(card.tags);
          if (tagArray.length) librarySection += ` [${tagArray.slice(0, 2).join(', ')}]`;
          const collections = parseCommaSeparated(card.collections);
          if (collections.length) librarySection += ` {${collections.slice(0, 2).join(', ')}}`;
          librarySection += '\n';
        }

        const sectionTokens = estimateTokens(librarySection);
        console.log('[Kit] Library section tokens:', sectionTokens);
        
        if (totalTokens + sectionTokens < maxContextTokens) {
          contextParts.push(librarySection);
          totalTokens += sectionTokens;
        } else {
          // Too many cards - truncate to fit
          const availableTokens = maxContextTokens - totalTokens - 100;
          const charsAvailable = availableTokens * 4;
          librarySection = librarySection.slice(0, charsAvailable) + '\n...[truncated]';
          contextParts.push(librarySection);
          console.log('[Kit] Library truncated to fit token limit');
        }
      }
    } catch (err) {
      console.error('[Kit] Exception fetching cards:', err);
    }
  }

  const result = contextParts.length > 0
    ? contextParts.join('\n\n')
    : 'User has no saved items yet.';
  
  console.log('[Kit] Built context with', contextParts.length, 'sections, ~', totalTokens, 'tokens');
  
  return result;
}
