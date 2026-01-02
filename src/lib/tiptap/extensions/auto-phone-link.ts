/**
 * Auto Link Extension
 *
 * Automatically converts phone numbers and emails to clickable links
 * More aggressive than Tiptap's built-in autolink
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

// Phone number patterns
const PHONE_PATTERNS = [
  /\b(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})\b/g,           // 555-123-4567, 555.123.4567, 555 123 4567
  /\b(\(\d{3}\)\s?\d{3}[-.\s]?\d{4})\b/g,           // (555) 123-4567
  /\b(\+1[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4})\b/g, // +1-555-123-4567
];

// Email pattern - matches as soon as there's something after @
// e.g., user@domain (links immediately, doesn't wait for .com)
const EMAIL_PATTERN = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;

// More aggressive email - links after @domain (at least 2 chars after @)
const EMAIL_PATTERN_AGGRESSIVE = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]{2,}(?:\.[a-zA-Z]{2,})?)\b/g;

interface LinkMatch {
  match: string;
  index: number;
  type: 'phone' | 'email';
}

/**
 * Extract phone number and normalize it for tel: protocol
 */
function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Find all linkable patterns in text
 */
function findLinkablePatterns(text: string): LinkMatch[] {
  const results: LinkMatch[] = [];

  // Find phone numbers
  for (const pattern of PHONE_PATTERNS) {
    const matches = text.matchAll(new RegExp(pattern.source, 'g'));
    for (const match of matches) {
      if (match[1] && match.index !== undefined) {
        results.push({
          match: match[1],
          index: match.index,
          type: 'phone',
        });
      }
    }
  }

  // Find emails (aggressive - links after @domain)
  const emailMatches = text.matchAll(new RegExp(EMAIL_PATTERN_AGGRESSIVE.source, 'g'));
  for (const match of emailMatches) {
    if (match[1] && match.index !== undefined) {
      results.push({
        match: match[1],
        index: match.index,
        type: 'email',
      });
    }
  }

  return results;
}

export const AutoPhoneLink = Extension.create({
  name: 'autoPhoneLink',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('autoPhoneLink'),

        // Handle input after typing
        appendTransaction(transactions, oldState, newState) {
          // Only process if there was a text change
          const docChanged = transactions.some(tr => tr.docChanged);
          if (!docChanged) return null;

          const { tr } = newState;
          let modified = false;

          // Scan the document for unlinked phone numbers and emails
          newState.doc.descendants((node, pos) => {
            if (node.isText && node.text) {
              const patterns = findLinkablePatterns(node.text);

              for (const pattern of patterns) {
                const from = pos + pattern.index;
                const to = from + pattern.match.length;

                // Check if already inside a link
                const $from = newState.doc.resolve(from);
                const marks = $from.marks();
                const hasLink = marks.some(mark => mark.type.name === 'link');

                if (!hasLink) {
                  // Determine href based on type
                  const href = pattern.type === 'phone'
                    ? `tel:${normalizePhone(pattern.match)}`
                    : `mailto:${pattern.match}`;

                  // Add link mark
                  const linkMark = newState.schema.marks.link?.create({ href });

                  if (linkMark) {
                    tr.addMark(from, to, linkMark);
                    modified = true;
                  }
                }
              }
            }
          });

          return modified ? tr : null;
        },
      }),
    ];
  },
});

export default AutoPhoneLink;
