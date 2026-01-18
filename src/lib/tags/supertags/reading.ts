/**
 * Reading Supertag
 * For tracking books and reading progress
 */

import type { SupertagDefinition, TemplateSection, TemplateType, TemplateFormat } from './types';
import { isPlateJson, parseJsonContent } from '@/lib/plate/html-to-plate';

// =============================================================================
// TYPES
// =============================================================================

export type ReadingTemplateType = 'fiction' | 'nonfiction' | 'textbook' | 'audiobook';

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
<li><strong>Genre:</strong>&nbsp;</li>
<li><strong>ISBN:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Book Info</h2>
<table><tbody>
<tr><td><strong>Author</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Pages</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Genre</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>ISBN</strong></td><td>&nbsp;</td></tr>
</tbody></table>`,
  },
  progress: {
    id: 'progress',
    name: 'Progress',
    listHtml: `<h2>Progress</h2>
<ul>
<li><strong>Status:</strong>&nbsp;Not Started / Reading / Finished</li>
<li><strong>Current Page:</strong>&nbsp;</li>
<li><strong>Started:</strong>&nbsp;</li>
<li><strong>Finished:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Progress</h2>
<table><tbody>
<tr><td><strong>Status</strong></td><td>Not Started / Reading / Finished</td></tr>
<tr><td><strong>Current Page</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Started</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Finished</strong></td><td>&nbsp;</td></tr>
</tbody></table>`,
  },
  quotes: {
    id: 'quotes',
    name: 'Quotes',
    listHtml: `<h2>Quotes</h2>
<blockquote><p></p></blockquote>`,
    tableHtml: `<h2>Quotes</h2>
<blockquote><p></p></blockquote>`,
  },
  review: {
    id: 'review',
    name: 'Review',
    listHtml: `<h2>Review</h2>
<ul>
<li><strong>Rating:</strong>&nbsp;/5</li>
<li><strong>Would Recommend:</strong>&nbsp;Yes / No</li>
</ul>
<p></p>`,
    tableHtml: `<h2>Review</h2>
<table><tbody>
<tr><td><strong>Rating</strong></td><td>/5</td></tr>
<tr><td><strong>Would Recommend</strong></td><td>Yes / No</td></tr>
</tbody></table>
<p></p>`,
  },
  academic: {
    id: 'academic',
    name: 'Academic',
    // CRITICAL: Due Date field is parsed by calendar sync - do not change field name
    listHtml: `<h2>Academic</h2>
<ul>
<li><strong>Course:</strong>&nbsp;</li>
<li><strong>Professor:</strong>&nbsp;</li>
<li><strong>Due Date:</strong>&nbsp;</li>
<li><strong>Chapters Assigned:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Academic</h2>
<table><tbody>
<tr><td><strong>Course</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Professor</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Due Date</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Chapters Assigned</strong></td><td>&nbsp;</td></tr>
</tbody></table>`,
  },
  purchase: {
    id: 'purchase',
    name: 'Purchase',
    listHtml: `<h2>Purchase</h2>
<ul>
<li><strong>Store URL:</strong>&nbsp;</li>
<li><strong>Price:</strong>&nbsp;</li>
<li><strong>Format:</strong>&nbsp;Paperback / Hardcover / eBook / Audiobook</li>
</ul>`,
    tableHtml: `<h2>Purchase</h2>
<table><tbody>
<tr><td><strong>Store URL</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Price</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Format</strong></td><td>Paperback / Hardcover / eBook / Audiobook</td></tr>
</tbody></table>`,
  },
  audiobook: {
    id: 'audiobook',
    name: 'Audiobook',
    listHtml: `<h2>Audiobook</h2>
<ul>
<li><strong>Narrator:</strong>&nbsp;</li>
<li><strong>Length:</strong>&nbsp;hours</li>
<li><strong>Speed:</strong>&nbsp;1x</li>
<li><strong>Current Position:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Audiobook</h2>
<table><tbody>
<tr><td><strong>Narrator</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Length</strong></td><td>hours</td></tr>
<tr><td><strong>Speed</strong></td><td>1x</td></tr>
<tr><td><strong>Current Position</strong></td><td>&nbsp;</td></tr>
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
// TEMPLATE TYPES
// =============================================================================

export const READING_TEMPLATE_TYPES: Record<string, TemplateType> = {
  fiction: {
    name: 'Fiction',
    description: 'Novels, short stories',
    defaultSections: ['book-info', 'progress', 'quotes', 'review', 'notes'],
  },
  nonfiction: {
    name: 'Non-Fiction',
    description: 'Self-help, biography, history',
    defaultSections: ['book-info', 'progress', 'review', 'notes'],
  },
  textbook: {
    name: 'Textbook',
    description: 'Academic, study material',
    defaultSections: ['book-info', 'academic', 'progress', 'notes'],
  },
  audiobook: {
    name: 'Audiobook',
    description: 'Audio format books',
    defaultSections: ['book-info', 'audiobook', 'progress', 'review', 'notes'],
  },
};

// =============================================================================
// INFO EXTRACTION (for quick actions)
// =============================================================================

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
 * Extract links from Plate JSON content with context
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractLinksFromPlateJson(content: any[]): { url: string; context: string }[] {
  const links: { url: string; context: string }[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function traverse(node: any, parentText: string = ''): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'a' && node.url) {
      links.push({ url: node.url, context: parentText });
    }

    if (node.children && Array.isArray(node.children)) {
      const nodeText = extractTextFromPlateNode(node);
      for (const child of node.children) {
        traverse(child, nodeText);
      }
    }
  }

  for (const node of content) {
    traverse(node, '');
  }

  return links;
}

/**
 * Extract field values from Plate JSON content
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractFieldValuesFromPlateJson(content: any[]): Record<string, string> {
  const values: Record<string, string> = {};

  for (const node of content) {
    if ('type' in node && (node.type === 'ul' || node.type === 'ol' || node.type === 'li')) {
      const text = extractTextFromPlateNode(node);
      const lines = text.split(/\n/);
      for (const line of lines) {
        const colonMatch = line.match(/^([^:]+):\s*(.*)$/);
        if (colonMatch) {
          const label = colonMatch[1].trim();
          const value = colonMatch[2].trim();
          if (value && value !== '&nbsp;') {
            values[label] = value;
          }
        }
      }
    }

    if ('children' in node && Array.isArray(node.children)) {
      const childValues = extractFieldValuesFromPlateJson(node.children);
      Object.assign(values, childValues);
    }
  }

  return values;
}

/**
 * Extract reading info from Plate JSON content
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractReadingInfoFromPlateJson(content: any[]): { storeUrl?: string } {
  const result: { storeUrl?: string } = {};

  // Extract links
  const links = extractLinksFromPlateJson(content);

  // Look for store URL link
  for (const link of links) {
    if (!result.storeUrl && link.context.toLowerCase().includes('store url')) {
      if (link.url.startsWith('http') || link.url.includes('.')) {
        result.storeUrl = link.url.startsWith('http') ? link.url : `https://${link.url}`;
      }
    }
  }

  // Fall back to field value extraction
  if (!result.storeUrl) {
    const fieldValues = extractFieldValuesFromPlateJson(content);
    if (fieldValues['Store URL']) {
      const url = fieldValues['Store URL'];
      if (url.startsWith('http') || url.includes('.')) {
        result.storeUrl = url.startsWith('http') ? url : `https://${url}`;
      }
    }
  }

  return result;
}

export function extractReadingInfo(content: string): {
  storeUrl?: string;
} {
  // Check if content is Plate JSON
  if (isPlateJson(content)) {
    const parsed = parseJsonContent(content);
    if (parsed) {
      return extractReadingInfoFromPlateJson(parsed);
    }
  }

  // Fall back to HTML parsing
  const result: { storeUrl?: string } = {};

  // Extract store URL
  const urlMatch = content.match(/<strong>Store URL:?<\/strong>(?:&nbsp;|\s)*(?:<a[^>]*href="([^"]+)"[^>]*>|([^\s<]+))/i);
  if (urlMatch) {
    const url = urlMatch[1] || urlMatch[2];
    if (url && url !== '&nbsp;' && (url.startsWith('http') || url.includes('.'))) {
      result.storeUrl = url.startsWith('http') ? url : `https://${url}`;
    }
  }

  return result;
}

// =============================================================================
// TEMPLATE BUILDERS
// =============================================================================

export function buildReadingTemplate(sectionIds: string[], format: TemplateFormat = 'list'): string {
  return sectionIds
    .map((id) => {
      const section = READING_SECTIONS[id];
      if (!section) return '';
      return format === 'list' ? section.listHtml : section.tableHtml;
    })
    .filter(Boolean)
    .join('\n');
}

export function getReadingTemplate(type: string = 'fiction', format: TemplateFormat = 'list'): string {
  const templateType = READING_TEMPLATE_TYPES[type];
  if (!templateType) return buildReadingTemplate(['book-info', 'progress', 'notes'], format);
  return buildReadingTemplate(templateType.defaultSections, format);
}

export function getReadingSection(sectionId: string, format: TemplateFormat = 'list'): string | null {
  const section = READING_SECTIONS[sectionId];
  if (!section) return null;
  return format === 'list' ? section.listHtml : section.tableHtml;
}

// =============================================================================
// DEFINITION
// =============================================================================

const DEFAULT_TEMPLATE = getReadingTemplate('fiction', 'list');

export const readingSupertag: SupertagDefinition = {
  tag: 'reading',
  displayName: 'Reading',
  icon: 'book-open',
  description: 'Book or long-form reading material',
  suggestedFields: ['author', 'pages', 'currentPage', 'rating'],
  template: DEFAULT_TEMPLATE,
  uiHints: {
    showInWidget: 'reading-widget',
    calendarFields: ['due date'],
  },
  actions: [
    { id: 'open-store', label: 'Buy Book', icon: 'shopping-cart', field: 'storeUrl' },
  ],
  sections: READING_SECTIONS,
  templateTypes: READING_TEMPLATE_TYPES,
};
