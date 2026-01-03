/**
 * Wishlist Supertag
 * For tracking items you want to buy or receive
 */

import type { SupertagDefinition, TemplateSection, TemplateType, TemplateFormat } from './types';

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

export function extractWishlistInfo(content: string): {
  storeUrl?: string;
} {
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

export function getWishlistTemplate(type: string = 'simple', format: TemplateFormat = 'list'): string {
  const templateType = WISHLIST_TEMPLATE_TYPES[type];
  if (!templateType) return buildWishlistTemplate(['item-info', 'notes'], format);
  return buildWishlistTemplate(templateType.defaultSections, format);
}

export function getWishlistSection(sectionId: string, format: TemplateFormat = 'list'): string | null {
  const section = WISHLIST_SECTIONS[sectionId];
  if (!section) return null;
  return format === 'list' ? section.listHtml : section.tableHtml;
}

// =============================================================================
// DEFINITION
// =============================================================================

const DEFAULT_TEMPLATE = getWishlistTemplate('simple', 'list');

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
