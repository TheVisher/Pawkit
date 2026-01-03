/**
 * Subscription Supertag
 * For tracking recurring subscriptions and accounts
 */

import type { SupertagDefinition, TemplateSection } from './types';

// =============================================================================
// SECTIONS
// =============================================================================

export const SUBSCRIPTION_SECTIONS: Record<string, TemplateSection> = {
  billing: {
    id: 'billing',
    name: 'Billing',
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
// INFO EXTRACTION (for quick actions)
// =============================================================================

export function extractSubscriptionInfo(content: string): { websiteUrl?: string; accountEmail?: string } {
  const result: { websiteUrl?: string; accountEmail?: string } = {};

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

  return result;
}

// =============================================================================
// TEMPLATE BUILDER
// =============================================================================

function buildSubscriptionTemplate(): string {
  return [
    SUBSCRIPTION_SECTIONS.billing.listHtml,
    SUBSCRIPTION_SECTIONS.account.listHtml,
    SUBSCRIPTION_SECTIONS.notes.listHtml,
  ].join('\n');
}

// =============================================================================
// DEFINITION
// =============================================================================

export const subscriptionSupertag: SupertagDefinition = {
  tag: 'subscription',
  displayName: 'Subscription',
  icon: 'credit-card',
  description: 'Recurring payment or subscription service',
  suggestedFields: ['service', 'amount', 'renewalDay', 'accountEmail', 'website'],
  template: buildSubscriptionTemplate(),
  uiHints: {
    calendarFields: ['renewalDay'],
    showInWidget: 'bills-widget',
  },
  sections: SUBSCRIPTION_SECTIONS,
};
