/**
 * Wishlist Supertag
 * For tracking items you want to buy or receive
 */

import type { SupertagDefinition, TemplateSection, TemplateType, TemplateFormat } from './types';
import { isPlateJson, parseJsonContent, stringifyPlateContent } from '@/lib/plate/html-to-plate';
import {
  h2,
  fieldItem,
  emptyItem,
  p,
  tableFieldRow,
  table,
} from './plate-builders';
import type { Descendant, Value } from 'platejs';

// =============================================================================
// TYPES
// =============================================================================

export type WishlistTemplateType = 'simple' | 'detailed' | 'gift';

// =============================================================================
// SECTIONS
// =============================================================================

export const WISHLIST_SECTIONS: Record<string, TemplateSection> = {
  'item-info': {
    id: 'item-info',
    name: 'Item Info',
    listHtml: `<h2>Item Info</h2>
<ul>
<li><strong>Item:</strong>&nbsp;</li>
<li><strong>Category:</strong>&nbsp;</li>
<li><strong>Store URL:</strong>&nbsp;</li>
<li><strong>Price:</strong>&nbsp;$</li>
</ul>`,
    tableHtml: `<h2>Item Info</h2>
<table><tbody>
<tr><td><strong>Item</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Category</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Store URL</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Price</strong></td><td>$</td></tr>
</tbody></table>`,
    listJson: [
      h2('Item Info'),
      fieldItem('Item'),
      fieldItem('Category'),
      fieldItem('Store URL'),
      fieldItem('Price', '$'),
    ],
    tableJson: [
      h2('Item Info'),
      table(
        tableFieldRow('Item', ''),
        tableFieldRow('Category', ''),
        tableFieldRow('Store URL', ''),
        tableFieldRow('Price', '$'),
      ),
    ],
  },
  priority: {
    id: 'priority',
    name: 'Priority',
    listHtml: `<h2>Priority</h2>
<ul>
<li><strong>Priority:</strong>&nbsp;Low / Medium / High / Must Have</li>
<li><strong>Need By:</strong>&nbsp;</li>
<li><strong>Reason:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Priority</h2>
<table><tbody>
<tr><td><strong>Priority</strong></td><td>Low / Medium / High / Must Have</td></tr>
<tr><td><strong>Need By</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Reason</strong></td><td>&nbsp;</td></tr>
</tbody></table>`,
    listJson: [
      h2('Priority'),
      fieldItem('Priority', 'Low / Medium / High / Must Have'),
      fieldItem('Need By'),
      fieldItem('Reason'),
    ],
    tableJson: [
      h2('Priority'),
      table(
        tableFieldRow('Priority', 'Low / Medium / High / Must Have'),
        tableFieldRow('Need By', ''),
        tableFieldRow('Reason', ''),
      ),
    ],
  },
  'price-tracking': {
    id: 'price-tracking',
    name: 'Price Tracking',
    listHtml: `<h2>Price Tracking</h2>
<ul>
<li><strong>Current Price:</strong>&nbsp;$</li>
<li><strong>Target Price:</strong>&nbsp;$</li>
<li><strong>Lowest Seen:</strong>&nbsp;$</li>
<li><strong>Last Checked:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Price Tracking</h2>
<table><tbody>
<tr><td><strong>Current Price</strong></td><td>$</td></tr>
<tr><td><strong>Target Price</strong></td><td>$</td></tr>
<tr><td><strong>Lowest Seen</strong></td><td>$</td></tr>
<tr><td><strong>Last Checked</strong></td><td>&nbsp;</td></tr>
</tbody></table>`,
    listJson: [
      h2('Price Tracking'),
      fieldItem('Current Price', '$'),
      fieldItem('Target Price', '$'),
      fieldItem('Lowest Seen', '$'),
      fieldItem('Last Checked'),
    ],
    tableJson: [
      h2('Price Tracking'),
      table(
        tableFieldRow('Current Price', '$'),
        tableFieldRow('Target Price', '$'),
        tableFieldRow('Lowest Seen', '$'),
        tableFieldRow('Last Checked', ''),
      ),
    ],
  },
  gift: {
    id: 'gift',
    name: 'Gift Details',
    listHtml: `<h2>Gift Details</h2>
<ul>
<li><strong>For:</strong>&nbsp;</li>
<li><strong>Occasion:</strong>&nbsp;</li>
<li><strong>Status:</strong>&nbsp;Idea / Purchased / Wrapped / Given</li>
</ul>`,
    tableHtml: `<h2>Gift Details</h2>
<table><tbody>
<tr><td><strong>For</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Occasion</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Status</strong></td><td>Idea / Purchased / Wrapped / Given</td></tr>
</tbody></table>`,
    listJson: [
      h2('Gift Details'),
      fieldItem('For'),
      fieldItem('Occasion'),
      fieldItem('Status', 'Idea / Purchased / Wrapped / Given'),
    ],
    tableJson: [
      h2('Gift Details'),
      table(
        tableFieldRow('For', ''),
        tableFieldRow('Occasion', ''),
        tableFieldRow('Status', 'Idea / Purchased / Wrapped / Given'),
      ),
    ],
  },
  alternatives: {
    id: 'alternatives',
    name: 'Alternatives',
    listHtml: `<h2>Alternatives</h2>
<ul>
<li></li>
</ul>`,
    tableHtml: `<h2>Alternatives</h2>
<ul>
<li></li>
</ul>`,
    listJson: [
      h2('Alternatives'),
      emptyItem(),
    ],
    tableJson: [
      h2('Alternatives'),
      emptyItem(),
    ],
  },
  notes: {
    id: 'notes',
    name: 'Notes',
    listHtml: `<h2>Notes</h2>
<p></p>`,
    tableHtml: `<h2>Notes</h2>
<p></p>`,
    listJson: [
      h2('Notes'),
      p(),
    ],
    tableJson: [
      h2('Notes'),
      p(),
    ],
  },
};

// =============================================================================
// TEMPLATE TYPES
// =============================================================================

export const WISHLIST_TEMPLATE_TYPES: Record<string, TemplateType> = {
  simple: {
    name: 'Simple',
    description: 'Basic wish list item',
    defaultSections: ['item-info', 'notes'],
  },
  detailed: {
    name: 'Detailed',
    description: 'With priority and price tracking',
    defaultSections: ['item-info', 'priority', 'price-tracking', 'alternatives', 'notes'],
  },
  gift: {
    name: 'Gift',
    description: 'Gift for someone else',
    defaultSections: ['item-info', 'gift', 'notes'],
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
 * Extract wishlist info from Plate JSON content
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractWishlistInfoFromPlateJson(content: any[]): { storeUrl?: string } {
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

export function extractWishlistInfo(content: unknown): {
  storeUrl?: string;
} {
  // Check if content is Plate JSON
  if (isPlateJson(content)) {
    const parsed = parseJsonContent(content);
    if (parsed) {
      return extractWishlistInfoFromPlateJson(parsed);
    }
  }

  if (typeof content !== 'string') {
    return {};
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

/**
 * Build a wishlist template as Plate JSON
 */
export function buildWishlistTemplateJson(sectionIds: string[], format: TemplateFormat = 'list'): Value {
  const nodes: Descendant[] = [];
  for (const id of sectionIds) {
    const section = WISHLIST_SECTIONS[id];
    if (!section) continue;
    const sectionNodes = format === 'list' ? section.listJson : section.tableJson;
    if (sectionNodes) {
      nodes.push(...sectionNodes);
    }
  }
  return nodes.length > 0 ? nodes as Value : [{ type: 'p', children: [{ text: '' }] }] as Value;
}

/**
 * Get wishlist template as JSON string (serialized Plate JSON)
 */
export function getWishlistTemplateJson(type: string = 'simple', format: TemplateFormat = 'list'): string {
  const templateType = WISHLIST_TEMPLATE_TYPES[type];
  const sectionIds = templateType?.defaultSections || ['item-info', 'notes'];
  const nodes = buildWishlistTemplateJson(sectionIds, format);
  return stringifyPlateContent(nodes);
}

/**
 * Get a single section as Plate JSON nodes
 */
export function getWishlistSectionJson(sectionId: string, format: TemplateFormat = 'list'): Descendant[] | null {
  const section = WISHLIST_SECTIONS[sectionId];
  if (!section) return null;
  return format === 'list' ? (section.listJson || null) : (section.tableJson || null);
}

/**
 * @deprecated Use buildWishlistTemplateJson instead - returns HTML string
 */
export function buildWishlistTemplate(sectionIds: string[], format: TemplateFormat = 'list'): string {
  return sectionIds
    .map((id) => {
      const section = WISHLIST_SECTIONS[id];
      if (!section) return '';
      return format === 'list' ? section.listHtml : section.tableHtml;
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * @deprecated Use getWishlistTemplateJson instead - returns HTML string
 */
export function getWishlistTemplate(type: string = 'simple', format: TemplateFormat = 'list'): string {
  const templateType = WISHLIST_TEMPLATE_TYPES[type];
  if (!templateType) return buildWishlistTemplate(['item-info', 'notes'], format);
  return buildWishlistTemplate(templateType.defaultSections, format);
}

/**
 * @deprecated Use getWishlistSectionJson instead - returns HTML string
 */
export function getWishlistSection(sectionId: string, format: TemplateFormat = 'list'): string | null {
  const section = WISHLIST_SECTIONS[sectionId];
  if (!section) return null;
  return format === 'list' ? section.listHtml : section.tableHtml;
}

// =============================================================================
// DEFINITION
// =============================================================================

// Use native JSON template (no HTML conversion needed)
const DEFAULT_TEMPLATE = getWishlistTemplateJson('simple', 'list');

export const wishlistSupertag: SupertagDefinition = {
  tag: 'wishlist',
  displayName: 'Wishlist',
  icon: 'gift',
  description: 'Items you want to buy or receive',
  suggestedFields: ['price', 'priority', 'link'],
  template: DEFAULT_TEMPLATE,
  actions: [
    { id: 'open-store', label: 'View Item', icon: 'shopping-cart', field: 'storeUrl' },
  ],
  sections: WISHLIST_SECTIONS,
  templateTypes: WISHLIST_TEMPLATE_TYPES,
};
