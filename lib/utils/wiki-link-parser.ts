/**
 * Parser for wiki-style links in markdown content
 * Supports:
 * - Note links: [[Note Title]]
 * - Card/bookmark links: [[card:Card Title]] or [[https://example.com]]
 */

export type WikiLink = {
  type: 'note' | 'card';
  target: string; // Note title or card ID/URL
  text: string;   // The full link text including brackets
  start: number;  // Position in content
  end: number;
};

const WIKI_LINK_REGEX = /\[\[([^\]]+)\]\]/g;
const CARD_PREFIX_REGEX = /^card:(.+)$/;
const URL_REGEX = /^https?:\/\/.+$/;

/**
 * Parse all wiki links from markdown content
 */
export function parseWikiLinks(content: string): WikiLink[] {
  const links: WikiLink[] = [];
  let match;

  // Reset regex state
  WIKI_LINK_REGEX.lastIndex = 0;

  while ((match = WIKI_LINK_REGEX.exec(content)) !== null) {
    const fullText = match[0];
    const innerText = match[1].trim();
    const start = match.index;
    const end = start + fullText.length;

    // Determine link type
    let type: 'note' | 'card';
    let target: string;

    if (CARD_PREFIX_REGEX.test(innerText)) {
      // [[card:Title]] format
      type = 'card';
      target = innerText.replace(CARD_PREFIX_REGEX, '$1').trim();
    } else if (URL_REGEX.test(innerText)) {
      // [[https://...]] format
      type = 'card';
      target = innerText;
    } else {
      // [[Note Title]] format
      type = 'note';
      target = innerText;
    }

    links.push({
      type,
      target,
      text: fullText,
      start,
      end
    });
  }

  return links;
}

/**
 * Find all note titles referenced in content
 */
export function extractNoteReferences(content: string): string[] {
  const links = parseWikiLinks(content);
  return links
    .filter(link => link.type === 'note')
    .map(link => link.target);
}

/**
 * Find all card references in content
 */
export function extractCardReferences(content: string): string[] {
  const links = parseWikiLinks(content);
  return links
    .filter(link => link.type === 'card')
    .map(link => link.target);
}

/**
 * Replace wiki links with HTML/React components
 */
export function replaceWikiLinks(
  content: string,
  noteResolver: (title: string) => { exists: boolean; id?: string; url?: string },
  cardResolver: (titleOrUrl: string) => { exists: boolean; id?: string; url?: string }
): string {
  const links = parseWikiLinks(content);

  // Sort in reverse order to replace from end to start (preserves indices)
  links.sort((a, b) => b.start - a.start);

  let result = content;

  for (const link of links) {
    const resolver = link.type === 'note' ? noteResolver : cardResolver;
    const resolved = resolver(link.target);

    let replacement: string;

    if (resolved.exists && resolved.url) {
      // Link exists - create clickable link
      replacement = `[${link.target}](${resolved.url})`;
    } else {
      // Link doesn't exist - show as broken link or create link
      replacement = `[${link.target}](javascript:void(0))`;
    }

    result = result.substring(0, link.start) + replacement + result.substring(link.end);
  }

  return result;
}

/**
 * Get autocomplete suggestions for wiki links
 */
export function getWikiLinkSuggestions(
  input: string,
  noteList: { id: string; title: string }[],
  cardList: { id: string; title: string; url: string }[]
): Array<{ type: 'note' | 'card'; id: string; title: string; url?: string }> {
  const normalized = input.toLowerCase().trim();

  // Check if it's a card reference
  const isCardRef = normalized.startsWith('card:') || normalized.startsWith('http');

  if (isCardRef) {
    const searchTerm = normalized.replace(/^card:/, '');
    return cardList
      .filter(card =>
        card.title.toLowerCase().includes(searchTerm) ||
        card.url.toLowerCase().includes(searchTerm)
      )
      .slice(0, 10)
      .map(card => ({
        type: 'card',
        id: card.id,
        title: card.title,
        url: card.url
      }));
  }

  // Note reference
  return noteList
    .filter(note => note.title.toLowerCase().includes(normalized))
    .slice(0, 10)
    .map(note => ({
      type: 'note',
      id: note.id,
      title: note.title
    }));
}
