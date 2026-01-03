/**
 * Reading Supertag
 * For tracking books and reading progress
 */

import type { SupertagDefinition, TemplateSection } from './types';

// =============================================================================
// SECTIONS
// =============================================================================

export const READING_SECTIONS: Record<string, TemplateSection> = {
  'book-info': {
    id: 'book-info',
    name: 'Book Info',
    listHtml: `<h2>Book Info</h2>
<ul>
<li><strong>Author:</strong>&nbsp;</li>
<li><strong>Pages:</strong>&nbsp;</li>
<li><strong>Current Page:</strong>&nbsp;</li>
<li><strong>Rating:</strong>&nbsp;/5</li>
</ul>`,
    tableHtml: `<h2>Book Info</h2>
<table><tbody>
<tr><td><strong>Author</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Pages</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Current Page</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Rating</strong></td><td>/5</td></tr>
</tbody></table>`,
  },
  notes: {
    id: 'notes',
    name: 'Notes',
    listHtml: `<h2>Notes</h2>
<p></p>`,
    tableHtml: `<h2>Notes</h2>
<p></p>`,
  },
};

// =============================================================================
// TEMPLATE BUILDER
// =============================================================================

function buildReadingTemplate(): string {
  return [
    READING_SECTIONS['book-info'].listHtml,
    READING_SECTIONS.notes.listHtml,
  ].join('\n');
}

// =============================================================================
// DEFINITION
// =============================================================================

export const readingSupertag: SupertagDefinition = {
  tag: 'reading',
  displayName: 'Reading',
  icon: 'book-open',
  description: 'Book or long-form reading material',
  suggestedFields: ['author', 'pages', 'currentPage', 'rating'],
  template: buildReadingTemplate(),
  uiHints: {
    showInWidget: 'reading-widget',
  },
  sections: READING_SECTIONS,
};
