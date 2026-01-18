/**
 * Warranty Supertag
 * For tracking product warranties and receipts
 */

import type { SupertagDefinition, TemplateSection, TemplateType, TemplateFormat } from './types';
import { isPlateJson, parseJsonContent } from '@/lib/plate/html-to-plate';

// =============================================================================
// TYPES
// =============================================================================

export type WarrantyTemplateType = 'electronics' | 'appliance' | 'simple';

// =============================================================================
// SECTIONS
// =============================================================================

export const WARRANTY_SECTIONS: Record<string, TemplateSection> = {
  'product-info': {
    id: 'product-info',
    name: 'Product Info',
    listHtml: `<h2>Product Info</h2>
<ul>
<li><strong>Product:</strong>&nbsp;</li>
<li><strong>Brand:</strong>&nbsp;</li>
<li><strong>Model:</strong>&nbsp;</li>
<li><strong>Serial Number:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Product Info</h2>
<table><tbody>
<tr><td><strong>Product</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Brand</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Model</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Serial Number</strong></td><td>&nbsp;</td></tr>
</tbody></table>`,
  },
  'purchase-info': {
    id: 'purchase-info',
    name: 'Purchase Info',
    listHtml: `<h2>Purchase Info</h2>
<ul>
<li><strong>Purchase Date:</strong>&nbsp;</li>
<li><strong>Purchase Price:</strong>&nbsp;$</li>
<li><strong>Store:</strong>&nbsp;</li>
<li><strong>Receipt URL:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Purchase Info</h2>
<table><tbody>
<tr><td><strong>Purchase Date</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Purchase Price</strong></td><td>$</td></tr>
<tr><td><strong>Store</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Receipt URL</strong></td><td>&nbsp;</td></tr>
</tbody></table>`,
  },
  'warranty-info': {
    id: 'warranty-info',
    name: 'Warranty Info',
    // CRITICAL: Expiry Date field is parsed by calendar sync - do not change field name
    listHtml: `<h2>Warranty Info</h2>
<ul>
<li><strong>Warranty Length:</strong>&nbsp;</li>
<li><strong>Expiry Date:</strong>&nbsp;</li>
<li><strong>Warranty Type:</strong>&nbsp;Manufacturer / Extended / Store</li>
<li><strong>Coverage:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Warranty Info</h2>
<table><tbody>
<tr><td><strong>Warranty Length</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Expiry Date</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Warranty Type</strong></td><td>Manufacturer / Extended / Store</td></tr>
<tr><td><strong>Coverage</strong></td><td>&nbsp;</td></tr>
</tbody></table>`,
  },
  support: {
    id: 'support',
    name: 'Support',
    listHtml: `<h2>Support</h2>
<ul>
<li><strong>Support URL:</strong>&nbsp;</li>
<li><strong>Support Phone:</strong>&nbsp;</li>
<li><strong>Support Email:</strong>&nbsp;</li>
<li><strong>Claim Number:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Support</h2>
<table><tbody>
<tr><td><strong>Support URL</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Support Phone</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Support Email</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Claim Number</strong></td><td>&nbsp;</td></tr>
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

export const WARRANTY_TEMPLATE_TYPES: Record<string, TemplateType> = {
  electronics: {
    name: 'Electronics',
    description: 'Phones, computers, TVs',
    defaultSections: ['product-info', 'purchase-info', 'warranty-info', 'support', 'notes'],
  },
  appliance: {
    name: 'Appliance',
    description: 'Home appliances',
    defaultSections: ['product-info', 'purchase-info', 'warranty-info', 'support', 'notes'],
  },
  simple: {
    name: 'Simple',
    description: 'Basic warranty tracking',
    defaultSections: ['product-info', 'warranty-info', 'notes'],
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
function extractLinksFromPlateJson(content: any[]): { url: string; text: string; context: string }[] {
  const links: { url: string; text: string; context: string }[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function traverse(node: any, parentText: string = ''): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'a' && node.url) {
      links.push({
        url: node.url,
        text: extractTextFromPlateNode(node),
        context: parentText,
      });
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
 * Extract warranty info from Plate JSON content
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractWarrantyInfoFromPlateJson(content: any[]): {
  supportUrl?: string;
  supportPhone?: string;
  supportEmail?: string;
} {
  const result: { supportUrl?: string; supportPhone?: string; supportEmail?: string } = {};

  // Extract links
  const links = extractLinksFromPlateJson(content);

  // Look for specific links
  for (const link of links) {
    const contextLower = link.context.toLowerCase();

    if (!result.supportUrl && contextLower.includes('support url')) {
      if (link.url.startsWith('http') || link.url.includes('.')) {
        result.supportUrl = link.url.startsWith('http') ? link.url : `https://${link.url}`;
      }
    }

    if (!result.supportPhone && link.url.startsWith('tel:')) {
      result.supportPhone = link.url.replace('tel:', '').replace(/[^\d+]/g, '');
    }

    if (!result.supportEmail && link.url.startsWith('mailto:')) {
      const email = link.text || link.url.replace('mailto:', '');
      if (email.includes('@') && email.split('@')[1]?.includes('.')) {
        result.supportEmail = email;
      }
    }
  }

  // Fall back to field value extraction
  const fieldValues = extractFieldValuesFromPlateJson(content);

  if (!result.supportUrl && fieldValues['Support URL']) {
    const url = fieldValues['Support URL'];
    if (url.startsWith('http') || url.includes('.')) {
      result.supportUrl = url.startsWith('http') ? url : `https://${url}`;
    }
  }

  if (!result.supportPhone && fieldValues['Support Phone']) {
    const phone = fieldValues['Support Phone'].replace(/[^\d+]/g, '');
    if (phone) result.supportPhone = phone;
  }

  if (!result.supportEmail && fieldValues['Support Email']) {
    const email = fieldValues['Support Email'];
    if (email.includes('@') && email.split('@')[1]?.includes('.')) {
      result.supportEmail = email;
    }
  }

  return result;
}

export function extractWarrantyInfo(content: string): {
  supportUrl?: string;
  supportPhone?: string;
  supportEmail?: string;
} {
  // Check if content is Plate JSON
  if (isPlateJson(content)) {
    const parsed = parseJsonContent(content);
    if (parsed) {
      return extractWarrantyInfoFromPlateJson(parsed);
    }
  }

  // Fall back to HTML parsing
  const result: { supportUrl?: string; supportPhone?: string; supportEmail?: string } = {};

  // Extract support URL
  const urlMatch = content.match(/<strong>Support URL:?<\/strong>(?:&nbsp;|\s)*(?:<a[^>]*href="([^"]+)"[^>]*>|([^\s<]+))/i);
  if (urlMatch) {
    const url = urlMatch[1] || urlMatch[2];
    if (url && url !== '&nbsp;' && (url.startsWith('http') || url.includes('.'))) {
      result.supportUrl = url.startsWith('http') ? url : `https://${url}`;
    }
  }

  // Extract support phone
  const phoneMatch = content.match(/<strong>Support Phone:?<\/strong>(?:&nbsp;|\s)*(?:<a[^>]*href="tel:([^"]+)"[^>]*>|([^<\s]+))/i);
  if (phoneMatch) {
    const phone = phoneMatch[1] || phoneMatch[2];
    if (phone && phone !== '&nbsp;') {
      result.supportPhone = phone.replace(/[^\d+]/g, '');
    }
  }

  // Extract support email
  const emailMatch = content.match(/<strong>Support Email:?<\/strong>(?:&nbsp;|\s)*(?:<a[^>]*href="mailto:([^"]+)"[^>]*>([^<]*)<\/a>|([^<\s]+@[^<\s]+))/i);
  if (emailMatch) {
    const email = emailMatch[2]?.trim() || emailMatch[1] || emailMatch[3];
    if (email && email !== '&nbsp;' && email.includes('@') && email.split('@')[1]?.includes('.')) {
      result.supportEmail = email;
    }
  }

  return result;
}

// =============================================================================
// TEMPLATE BUILDERS
// =============================================================================

export function buildWarrantyTemplate(sectionIds: string[], format: TemplateFormat = 'list'): string {
  return sectionIds
    .map((id) => {
      const section = WARRANTY_SECTIONS[id];
      if (!section) return '';
      return format === 'list' ? section.listHtml : section.tableHtml;
    })
    .filter(Boolean)
    .join('\n');
}

export function getWarrantyTemplate(type: string = 'simple', format: TemplateFormat = 'list'): string {
  const templateType = WARRANTY_TEMPLATE_TYPES[type];
  if (!templateType) return buildWarrantyTemplate(['product-info', 'warranty-info', 'notes'], format);
  return buildWarrantyTemplate(templateType.defaultSections, format);
}

export function getWarrantySection(sectionId: string, format: TemplateFormat = 'list'): string | null {
  const section = WARRANTY_SECTIONS[sectionId];
  if (!section) return null;
  return format === 'list' ? section.listHtml : section.tableHtml;
}

// =============================================================================
// DEFINITION
// =============================================================================

const DEFAULT_TEMPLATE = getWarrantyTemplate('simple', 'list');

export const warrantySupertag: SupertagDefinition = {
  tag: 'warranty',
  displayName: 'Warranty',
  icon: 'shield',
  description: 'Product warranty or receipt for tracking',
  suggestedFields: ['purchaseDate', 'expiryDate', 'serialNumber', 'receiptUrl'],
  template: DEFAULT_TEMPLATE,
  uiHints: {
    calendarFields: ['expiry date'],
  },
  actions: [
    { id: 'open-support', label: 'Support', icon: 'external-link', field: 'supportUrl' },
    { id: 'call-support', label: 'Call', icon: 'phone', protocol: 'tel:', field: 'supportPhone' },
    { id: 'email-support', label: 'Email', icon: 'mail', protocol: 'mailto:', field: 'supportEmail' },
  ],
  sections: WARRANTY_SECTIONS,
  templateTypes: WARRANTY_TEMPLATE_TYPES,
};
