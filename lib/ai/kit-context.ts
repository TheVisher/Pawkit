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
  
  // Check if query mentions "pawkit" or "collection"
  const mentionsPawkit = queryLower.includes('pawkit') || queryLower.includes('collection');
  
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
 * This fetches relevant data from Supabase to give Kit context about:
 * - The specific card being discussed (if any)
 * - User's Pawkits (collections)
 * - Cards in a specific Pawkit (if mentioned)
 * - Cards that might be relevant to the query
 * - Recently saved items
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

  // 1. Add specific card context if provided
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
      .limit(30);

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
    // User asked about a specific Pawkit - fetch ONLY cards in that collection
    try {
      const { data: pawkitCards, error: pawkitCardsError } = await supabase
        .from('Card')
        .select('id, title, description, url, domain, tags, collections, deleted')
        .eq('userId', userId)
        .eq('deleted', false)
        .ilike('collections', `%${targetPawkit.slug}%`)
        .limit(50);

      if (pawkitCardsError) {
        console.error('[Kit] Error fetching pawkit cards:', pawkitCardsError);
      }

      console.log('[Kit] Cards in pawkit "' + targetPawkit.name + '":', pawkitCards?.length || 0);
      if (pawkitCards?.length) {
        pawkitCards.forEach((card, i) => {
          console.log(`[Kit]   ${i + 1}. "${card.title}" (id: ${card.id}, deleted: ${card.deleted}, collections: ${card.collections})`);
        });
      }

      if (pawkitCards?.length) {
        let pawkitCardsSection = `## Cards in "${targetPawkit.name}" Pawkit (${pawkitCards.length} items)\n`;
        for (const card of pawkitCards) {
          pawkitCardsSection += `- **${card.title || 'Untitled'}**`;
          if (card.domain) pawkitCardsSection += ` (${card.domain})`;
          const tagArray = parseCommaSeparated(card.tags);
          if (tagArray.length) pawkitCardsSection += ` [${tagArray.slice(0, 3).join(', ')}]`;
          pawkitCardsSection += '\n';
          if (card.description) {
            pawkitCardsSection += `  ${card.description.slice(0, 150)}${card.description.length > 150 ? '...' : ''}\n`;
          }
        }

        const sectionTokens = estimateTokens(pawkitCardsSection);
        if (totalTokens + sectionTokens < maxContextTokens) {
          contextParts.push(pawkitCardsSection);
          totalTokens += sectionTokens;
        }
      } else {
        contextParts.push(`## Cards in "${targetPawkit.name}" Pawkit\nThis pawkit is empty or has no matching cards.`);
      }
    } catch (err) {
      console.error('[Kit] Exception fetching pawkit cards:', err);
    }
  } else {
    // 4. No specific pawkit - search for relevant cards based on keywords
    const keywords = extractKeywords(query);
    console.log('[Kit] Extracted keywords:', keywords);
    
    if (keywords.length > 0 && totalTokens < maxContextTokens - 1000) {
      try {
        const searchPattern = keywords.map(k => `%${k}%`).join('%');

        const { data: relevantCards, error: relevantError } = await supabase
          .from('Card')
          .select('id, title, description, url, domain, tags, collections, deleted')
          .eq('userId', userId)
          .eq('deleted', false)
          .or(`title.ilike.${searchPattern},description.ilike.${searchPattern}`)
          .limit(10);

        if (relevantError) {
          console.error('[Kit] Error fetching relevant cards:', relevantError);
        }

        console.log('[Kit] Relevant cards found:', relevantCards?.length || 0);
        if (relevantCards?.length) {
          relevantCards.forEach((card, i) => {
            console.log(`[Kit]   ${i + 1}. "${card.title}" (id: ${card.id}, deleted: ${card.deleted}, collections: ${card.collections})`);
          });
        }

        if (relevantCards?.length) {
          let relevantSection = `## Potentially Relevant Saved Items\n`;
          for (const card of relevantCards) {
            relevantSection += `- **${card.title || 'Untitled'}**`;
            if (card.domain) relevantSection += ` (${card.domain})`;
            const tagArray = parseCommaSeparated(card.tags);
            if (tagArray.length) relevantSection += ` [${tagArray.slice(0, 3).join(', ')}]`;
            relevantSection += '\n';
            if (card.description) {
              relevantSection += `  ${card.description.slice(0, 100)}${card.description.length > 100 ? '...' : ''}\n`;
            }
          }

          const sectionTokens = estimateTokens(relevantSection);
          if (totalTokens + sectionTokens < maxContextTokens) {
            contextParts.push(relevantSection);
            totalTokens += sectionTokens;
          }
        }
      } catch (err) {
        console.error('[Kit] Exception fetching relevant cards:', err);
      }
    }

    // 5. Add recent cards for general context (only if no specific pawkit)
    if (totalTokens < maxContextTokens - 500) {
      try {
        const { data: recentCards, error: recentError } = await supabase
          .from('Card')
          .select('title, domain, tags')
          .eq('userId', userId)
          .eq('deleted', false)
          .order('createdAt', { ascending: false })
          .limit(15);

        if (recentError) {
          console.error('[Kit] Error fetching recent cards:', recentError);
        }

        console.log('[Kit] Recent cards found:', recentCards?.length || 0);

        if (recentCards?.length) {
          let recentSection = `## Recently Saved (${recentCards.length} items)\n`;
          for (const card of recentCards) {
            recentSection += `- ${card.title || 'Untitled'}`;
            if (card.domain) recentSection += ` (${card.domain})`;
            const tagArray = parseCommaSeparated(card.tags);
            if (tagArray.length) recentSection += ` [${tagArray.slice(0, 2).join(', ')}]`;
            recentSection += '\n';
          }

          const sectionTokens = estimateTokens(recentSection);
          if (totalTokens + sectionTokens < maxContextTokens) {
            contextParts.push(recentSection);
          }
        }
      } catch (err) {
        console.error('[Kit] Exception fetching recent cards:', err);
      }
    }
  }

  const result = contextParts.length > 0
    ? contextParts.join('\n\n')
    : 'User has no saved items yet.';
  
  console.log('[Kit] Built context with', contextParts.length, 'sections, ~', totalTokens, 'tokens');
  
  return result;
}

/**
 * Extract meaningful keywords from a query
 * Filters out common words and short words
 */
function extractKeywords(query: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these',
    'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which',
    'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both',
    'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'about',
    'find', 'show', 'get', 'give', 'tell', 'help', 'want', 'need', 'please',
    'my', 'me', 'any', 'saved', 'bookmark', 'bookmarks', 'card', 'cards',
    'whats', 'what\'s', 'pawkit', 'pawkits', 'collection', 'collections'
  ]);

  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 5);
}
