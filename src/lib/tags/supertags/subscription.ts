/**
 * Subscription Supertag
 * For tracking recurring subscriptions and accounts
 */

import type { SupertagDefinition, TemplateSection, TemplateType, TemplateFormat } from './types';
import { isPlateJson, parseJsonContent, serializePlateContent } from '@/lib/plate/html-to-plate';
import {
  h2,
  fieldItem,
  p,
  tableFieldRow,
  table,
} from './plate-builders';
import type { Descendant, Value } from 'platejs';

// =============================================================================
// TYPES
// =============================================================================

export type SubscriptionTemplateType = 'streaming' | 'software' | 'membership';

// =============================================================================
// SECTIONS
// =============================================================================

export const SUBSCRIPTION_SECTIONS: Record<string, TemplateSection> = {
  billing: {
    id: 'billing',
    name: 'Billing',
    // CRITICAL: Amount and Renews fields are parsed by bills widget - do not change field names
    listHtml: `<h2>Billing</h2>
<ul>
<li><strong>Amount:</strong>&nbsp;$/month</li>
<li><strong>Renews:</strong>&nbsp;(day of month)</li>
<li><strong>Started:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Billing</h2>
<table><tbody>
<tr><td><strong>Amount</strong></td><td>$/month</td></tr>
<tr><td><strong>Renews</strong></td><td>(day of month)</td></tr>
<tr><td><strong>Started</strong></td><td>&nbsp;</td></tr>
</tbody></table>`,
    listJson: [
      h2('Billing'),
      fieldItem('Amount', '$/month'),
      fieldItem('Renews', '(day of month)'),
      fieldItem('Started'),
    ],
    tableJson: [
      h2('Billing'),
      table(
        tableFieldRow('Amount', '$/month'),
        tableFieldRow('Renews', '(day of month)'),
        tableFieldRow('Started', ''),
      ),
    ],
  },
  'payment-method': {
    id: 'payment-method',
    name: 'Payment Method',
    listHtml: `<h2>Payment Method</h2>
<ul>
<li><strong>Card:</strong>&nbsp;(last 4 digits)</li>
<li><strong>Expiry:</strong>&nbsp;</li>
<li><strong>Billing Email:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Payment Method</h2>
<table><tbody>
<tr><td><strong>Card</strong></td><td>(last 4 digits)</td></tr>
<tr><td><strong>Expiry</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Billing Email</strong></td><td>&nbsp;</td></tr>
</tbody></table>`,
    listJson: [
      h2('Payment Method'),
      fieldItem('Card', '(last 4 digits)'),
      fieldItem('Expiry'),
      fieldItem('Billing Email'),
    ],
    tableJson: [
      h2('Payment Method'),
      table(
        tableFieldRow('Card', '(last 4 digits)'),
        tableFieldRow('Expiry', ''),
        tableFieldRow('Billing Email', ''),
      ),
    ],
  },
  account: {
    id: 'account',
    name: 'Account',
    listHtml: `<h2>Account</h2>
<ul>
<li><strong>Website:</strong>&nbsp;</li>
<li><strong>Email:</strong>&nbsp;</li>
<li><strong>Username:</strong>&nbsp;</li>
<li><strong>Password:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Account</h2>
<table><tbody>
<tr><td><strong>Website</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Email</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Username</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Password</strong></td><td>&nbsp;</td></tr>
</tbody></table>`,
    listJson: [
      h2('Account'),
      fieldItem('Website'),
      fieldItem('Email'),
      fieldItem('Username'),
      fieldItem('Password'),
    ],
    tableJson: [
      h2('Account'),
      table(
        tableFieldRow('Website', ''),
        tableFieldRow('Email', ''),
        tableFieldRow('Username', ''),
        tableFieldRow('Password', ''),
      ),
    ],
  },
  cancellation: {
    id: 'cancellation',
    name: 'Cancellation',
    listHtml: `<h2>Cancellation</h2>
<ul>
<li><strong>Cancel URL:</strong>&nbsp;</li>
<li><strong>Notice Period:</strong>&nbsp;</li>
<li><strong>How to Cancel:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Cancellation</h2>
<table><tbody>
<tr><td><strong>Cancel URL</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Notice Period</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>How to Cancel</strong></td><td>&nbsp;</td></tr>
</tbody></table>`,
    listJson: [
      h2('Cancellation'),
      fieldItem('Cancel URL'),
      fieldItem('Notice Period'),
      fieldItem('How to Cancel'),
    ],
    tableJson: [
      h2('Cancellation'),
      table(
        tableFieldRow('Cancel URL', ''),
        tableFieldRow('Notice Period', ''),
        tableFieldRow('How to Cancel', ''),
      ),
    ],
  },
  license: {
    id: 'license',
    name: 'License & API',
    listHtml: `<h2>License & API</h2>
<ul>
<li><strong>License Key:</strong>&nbsp;</li>
<li><strong>API Key:</strong>&nbsp;</li>
<li><strong>Tier:</strong>&nbsp;Free / Pro / Team / Enterprise</li>
<li><strong>Seats:</strong>&nbsp;</li>
<li><strong>Usage Limit:</strong>&nbsp;</li>
<li><strong>Rate Limit:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>License & API</h2>
<table><tbody>
<tr><td><strong>License Key</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>API Key</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Tier</strong></td><td>Free / Pro / Team / Enterprise</td></tr>
<tr><td><strong>Seats</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Usage Limit</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Rate Limit</strong></td><td>&nbsp;</td></tr>
</tbody></table>`,
    listJson: [
      h2('License & API'),
      fieldItem('License Key'),
      fieldItem('API Key'),
      fieldItem('Tier', 'Free / Pro / Team / Enterprise'),
      fieldItem('Seats'),
      fieldItem('Usage Limit'),
      fieldItem('Rate Limit'),
    ],
    tableJson: [
      h2('License & API'),
      table(
        tableFieldRow('License Key', ''),
        tableFieldRow('API Key', ''),
        tableFieldRow('Tier', 'Free / Pro / Team / Enterprise'),
        tableFieldRow('Seats', ''),
        tableFieldRow('Usage Limit', ''),
        tableFieldRow('Rate Limit', ''),
      ),
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

export const SUBSCRIPTION_TEMPLATE_TYPES: Record<string, TemplateType> = {
  streaming: {
    name: 'Streaming',
    description: 'Netflix, Spotify, Disney+, etc.',
    defaultSections: ['billing', 'account', 'notes'],
  },
  software: {
    name: 'Software',
    description: 'Apps, tools, SaaS subscriptions',
    defaultSections: ['billing', 'license', 'account', 'notes'],
  },
  membership: {
    name: 'Membership',
    description: 'Gym, clubs, organizations',
    defaultSections: ['billing', 'payment-method', 'cancellation', 'notes'],
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
 * Extract links from Plate JSON content
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
    // Handle list items
    if ('type' in node && (node.type === 'ul' || node.type === 'ol' || node.type === 'li')) {
      const text = extractTextFromPlateNode(node);
      const lines = text.split(/\n/);
      for (const line of lines) {
        const colonMatch = line.match(/^([^:]+):\s*(.*)$/);
        if (colonMatch) {
          const label = colonMatch[1].trim();
          const value = colonMatch[2].trim();
          if (value && value !== '$/month' && value !== '(day of month)' && value !== '&nbsp;') {
            values[label] = value;
          }
        }
      }
    }

    // Recurse into children
    if ('children' in node && Array.isArray(node.children)) {
      const childValues = extractFieldValuesFromPlateJson(node.children);
      Object.assign(values, childValues);
    }
  }

  return values;
}

/**
 * Extract subscription info from Plate JSON content
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractSubscriptionInfoFromPlateJson(content: any[]): {
  websiteUrl?: string;
  accountEmail?: string;
  cancelUrl?: string;
} {
  const result: { websiteUrl?: string; accountEmail?: string; cancelUrl?: string } = {};

  // Extract links
  const links = extractLinksFromPlateJson(content);

  // Look for specific field links
  for (const link of links) {
    const contextLower = link.context.toLowerCase();

    if (!result.websiteUrl && contextLower.includes('website')) {
      if (link.url.startsWith('http') || link.url.includes('.')) {
        result.websiteUrl = link.url.startsWith('http') ? link.url : `https://${link.url}`;
      }
    }

    if (!result.cancelUrl && contextLower.includes('cancel')) {
      if (link.url.startsWith('http') || link.url.includes('.')) {
        result.cancelUrl = link.url.startsWith('http') ? link.url : `https://${link.url}`;
      }
    }

    if (!result.accountEmail && link.url.startsWith('mailto:')) {
      const email = link.text || link.url.replace('mailto:', '');
      if (email.includes('@') && email.split('@')[1]?.includes('.')) {
        result.accountEmail = email;
      }
    }
  }

  // Fall back to field value extraction
  const fieldValues = extractFieldValuesFromPlateJson(content);

  if (!result.websiteUrl && fieldValues['Website']) {
    const url = fieldValues['Website'];
    if (url.startsWith('http') || url.includes('.')) {
      result.websiteUrl = url.startsWith('http') ? url : `https://${url}`;
    }
  }

  if (!result.accountEmail && fieldValues['Email']) {
    const email = fieldValues['Email'];
    if (email.includes('@') && email.split('@')[1]?.includes('.')) {
      result.accountEmail = email;
    }
  }

  if (!result.cancelUrl && fieldValues['Cancel URL']) {
    const url = fieldValues['Cancel URL'];
    if (url.startsWith('http') || url.includes('.')) {
      result.cancelUrl = url.startsWith('http') ? url : `https://${url}`;
    }
  }

  return result;
}

export function extractSubscriptionInfo(content: string): {
  websiteUrl?: string;
  accountEmail?: string;
  cancelUrl?: string;
} {
  // Check if content is Plate JSON
  if (isPlateJson(content)) {
    const parsed = parseJsonContent(content);
    if (parsed) {
      return extractSubscriptionInfoFromPlateJson(parsed);
    }
  }

  // Fall back to HTML parsing
  const result: { websiteUrl?: string; accountEmail?: string; cancelUrl?: string } = {};

  // Extract website URL
  const websiteMatch = content.match(/<strong>Website:?<\/strong>(?:&nbsp;|\s)*(?:<a[^>]*href="([^"]+)"[^>]*>|([^\s<]+))/i);
  if (websiteMatch) {
    const url = websiteMatch[1] || websiteMatch[2];
    if (url && url !== '&nbsp;' && (url.startsWith('http') || url.includes('.'))) {
      result.websiteUrl = url.startsWith('http') ? url : `https://${url}`;
    }
  }

  // Extract account email
  const emailMatch = content.match(/<strong>Email:?<\/strong>(?:&nbsp;|\s)*(?:<a[^>]*href="mailto:([^"]+)"[^>]*>([^<]*)<\/a>|([^<\s]+@[^<\s]+))/i);
  if (emailMatch) {
    const email = emailMatch[2]?.trim() || emailMatch[1] || emailMatch[3];
    if (email && email !== '&nbsp;' && email.includes('@') && email.split('@')[1]?.includes('.')) {
      result.accountEmail = email;
    }
  }

  // Extract cancel URL
  const cancelMatch = content.match(/<strong>Cancel URL:?<\/strong>(?:&nbsp;|\s)*(?:<a[^>]*href="([^"]+)"[^>]*>|([^\s<]+))/i);
  if (cancelMatch) {
    const url = cancelMatch[1] || cancelMatch[2];
    if (url && url !== '&nbsp;' && (url.startsWith('http') || url.includes('.'))) {
      result.cancelUrl = url.startsWith('http') ? url : `https://${url}`;
    }
  }

  return result;
}

// =============================================================================
// TEMPLATE BUILDERS
// =============================================================================

/**
 * Build a subscription template as Plate JSON
 */
export function buildSubscriptionTemplateJson(sectionIds: string[], format: TemplateFormat = 'list'): Value {
  const nodes: Descendant[] = [];
  for (const id of sectionIds) {
    const section = SUBSCRIPTION_SECTIONS[id];
    if (!section) continue;
    const sectionNodes = format === 'list' ? section.listJson : section.tableJson;
    if (sectionNodes) {
      nodes.push(...sectionNodes);
    }
  }
  return nodes.length > 0 ? nodes as Value : [{ type: 'p', children: [{ text: '' }] }] as Value;
}

/**
 * Get subscription template as JSON string (serialized Plate JSON)
 */
export function getSubscriptionTemplateJson(type: string = 'streaming', format: TemplateFormat = 'list'): string {
  const templateType = SUBSCRIPTION_TEMPLATE_TYPES[type];
  const sectionIds = templateType?.defaultSections || ['billing', 'account', 'notes'];
  const nodes = buildSubscriptionTemplateJson(sectionIds, format);
  return serializePlateContent(nodes);
}

/**
 * Get a single section as Plate JSON nodes
 */
export function getSubscriptionSectionJson(sectionId: string, format: TemplateFormat = 'list'): Descendant[] | null {
  const section = SUBSCRIPTION_SECTIONS[sectionId];
  if (!section) return null;
  return format === 'list' ? (section.listJson || null) : (section.tableJson || null);
}

/**
 * @deprecated Use buildSubscriptionTemplateJson instead - returns HTML string
 */
export function buildSubscriptionTemplate(sectionIds: string[], format: TemplateFormat = 'list'): string {
  return sectionIds
    .map((id) => {
      const section = SUBSCRIPTION_SECTIONS[id];
      if (!section) return '';
      return format === 'list' ? section.listHtml : section.tableHtml;
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * @deprecated Use getSubscriptionTemplateJson instead - returns HTML string
 */
export function getSubscriptionTemplate(type: string = 'streaming', format: TemplateFormat = 'list'): string {
  const templateType = SUBSCRIPTION_TEMPLATE_TYPES[type];
  if (!templateType) return buildSubscriptionTemplate(['billing', 'account', 'notes'], format);
  return buildSubscriptionTemplate(templateType.defaultSections, format);
}

/**
 * @deprecated Use getSubscriptionSectionJson instead - returns HTML string
 */
export function getSubscriptionSection(sectionId: string, format: TemplateFormat = 'list'): string | null {
  const section = SUBSCRIPTION_SECTIONS[sectionId];
  if (!section) return null;
  return format === 'list' ? section.listHtml : section.tableHtml;
}

// =============================================================================
// DEFINITION
// =============================================================================

// Use native JSON template (no HTML conversion needed)
const DEFAULT_TEMPLATE = getSubscriptionTemplateJson('streaming', 'list');

export const subscriptionSupertag: SupertagDefinition = {
  tag: 'subscription',
  displayName: 'Subscription',
  icon: 'credit-card',
  description: 'Recurring payment or subscription service',
  suggestedFields: ['service', 'amount', 'renewalDay', 'accountEmail', 'website'],
  template: DEFAULT_TEMPLATE,
  uiHints: {
    calendarFields: ['renews'],
    showInWidget: 'bills-widget',
    hasProtocolLinks: true,
  },
  actions: [
    { id: 'open-billing', label: 'Open Website', icon: 'external-link', field: 'websiteUrl' },
    { id: 'email-support', label: 'Email', icon: 'mail', protocol: 'mailto:', field: 'accountEmail' },
  ],
  sections: SUBSCRIPTION_SECTIONS,
  templateTypes: SUBSCRIPTION_TEMPLATE_TYPES,
};
