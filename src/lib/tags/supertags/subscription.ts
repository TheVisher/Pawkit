/**
 * Subscription Supertag
 * For tracking recurring subscriptions and accounts
 */

import type { SupertagDefinition, TemplateSection, TemplateType, TemplateFormat } from './types';

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

export function extractSubscriptionInfo(content: string): {
  websiteUrl?: string;
  accountEmail?: string;
  cancelUrl?: string;
} {
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

export function getSubscriptionTemplate(type: string = 'streaming', format: TemplateFormat = 'list'): string {
  const templateType = SUBSCRIPTION_TEMPLATE_TYPES[type];
  if (!templateType) return buildSubscriptionTemplate(['billing', 'account', 'notes'], format);
  return buildSubscriptionTemplate(templateType.defaultSections, format);
}

export function getSubscriptionSection(sectionId: string, format: TemplateFormat = 'list'): string | null {
  const section = SUBSCRIPTION_SECTIONS[sectionId];
  if (!section) return null;
  return format === 'list' ? section.listHtml : section.tableHtml;
}

// =============================================================================
// DEFINITION
// =============================================================================

const DEFAULT_TEMPLATE = getSubscriptionTemplate('streaming', 'list');

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
