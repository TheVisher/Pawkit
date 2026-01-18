/**
 * Contact Supertag
 * For storing contact information with structured templates
 */

import type { SupertagDefinition, TemplateSection, TemplateType, TemplateFormat } from './types';
import { isPlateJson, parseJsonContent } from '@/lib/plate/html-to-plate';

// =============================================================================
// TYPES
// =============================================================================

export type ContactTemplateType = 'personal' | 'work' | 'gaming' | 'family' | 'service';

// =============================================================================
// SECTIONS
// =============================================================================

export const CONTACT_SECTIONS: Record<string, TemplateSection> = {
  'contact-info': {
    id: 'contact-info',
    name: 'Contact Info',
    listHtml: `<h2>Contact Info</h2>
<ul>
<li><strong>Phone:</strong>&nbsp;</li>
<li><strong>Email:</strong>&nbsp;</li>
<li><strong>Address:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Contact Info</h2>
<table><tbody>
<tr><td><strong>Phone</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Email</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Address</strong></td><td>&nbsp;</td></tr>
</tbody></table>`,
  },
  'social-gaming': {
    id: 'social-gaming',
    name: 'Social & Gaming',
    listHtml: `<h2>Social & Gaming</h2>
<ul>
<li><strong>Discord:</strong>&nbsp;</li>
<li><strong>Steam:</strong>&nbsp;</li>
<li><strong>Xbox:</strong>&nbsp;</li>
<li><strong>PSN:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Social & Gaming</h2>
<table><tbody>
<tr><td><strong>Discord</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Steam</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Xbox</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>PSN</strong></td><td>&nbsp;</td></tr>
</tbody></table>`,
  },
  personal: {
    id: 'personal',
    name: 'Personal',
    listHtml: `<h2>Personal</h2>
<ul>
<li><strong>Birthday:</strong>&nbsp;</li>
<li><strong>How we met:</strong>&nbsp;</li>
<li><strong>Interests:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Personal</h2>
<table><tbody>
<tr><td><strong>Birthday</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>How we met</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Interests</strong></td><td>&nbsp;</td></tr>
</tbody></table>`,
  },
  work: {
    id: 'work',
    name: 'Work',
    listHtml: `<h2>Work</h2>
<ul>
<li><strong>Company:</strong>&nbsp;</li>
<li><strong>Title:</strong>&nbsp;</li>
<li><strong>LinkedIn:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Work</h2>
<table><tbody>
<tr><td><strong>Company</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Title</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>LinkedIn</strong></td><td>&nbsp;</td></tr>
</tbody></table>`,
  },
  family: {
    id: 'family',
    name: 'Family',
    listHtml: `<h2>Family</h2>
<ul>
<li><strong>Relation:</strong>&nbsp;</li>
<li><strong>Anniversary:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Family</h2>
<table><tbody>
<tr><td><strong>Relation</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Anniversary</strong></td><td>&nbsp;</td></tr>
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
  'business-info': {
    id: 'business-info',
    name: 'Business Info',
    listHtml: `<h2>Business Info</h2>
<ul>
<li><strong>Business Name:</strong>&nbsp;</li>
<li><strong>Contact Person:</strong>&nbsp;</li>
<li><strong>Phone:</strong>&nbsp;</li>
<li><strong>Email:</strong>&nbsp;</li>
<li><strong>Address:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Business Info</h2>
<table><tbody>
<tr><td><strong>Business Name</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Contact Person</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Phone</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Email</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Address</strong></td><td>&nbsp;</td></tr>
</tbody></table>`,
  },
  'service-details': {
    id: 'service-details',
    name: 'Service Details',
    listHtml: `<h2>Service Details</h2>
<ul>
<li><strong>Hours:</strong>&nbsp;</li>
<li><strong>Website:</strong>&nbsp;</li>
<li><strong>What they do:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Service Details</h2>
<table><tbody>
<tr><td><strong>Hours</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Website</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>What they do</strong></td><td>&nbsp;</td></tr>
</tbody></table>`,
  },
  ice: {
    id: 'ice',
    name: 'Emergency Contact',
    listHtml: `<h2>Emergency Contact</h2>
<ul>
<li><strong>Relation:</strong>&nbsp;</li>
<li><strong>ICE Priority:</strong>&nbsp;(1 = primary)</li>
<li><strong>Medical Notes:</strong>&nbsp;</li>
<li><strong>Alternate Phone:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Emergency Contact</h2>
<table><tbody>
<tr><td><strong>Relation</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>ICE Priority</strong></td><td>(1 = primary)</td></tr>
<tr><td><strong>Medical Notes</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Alternate Phone</strong></td><td>&nbsp;</td></tr>
</tbody></table>`,
  },
};

// =============================================================================
// TEMPLATE TYPES
// =============================================================================

export const CONTACT_TEMPLATE_TYPES: Record<string, TemplateType> = {
  personal: {
    name: 'Personal',
    description: 'Friends, acquaintances',
    defaultSections: ['contact-info', 'social-gaming', 'personal', 'notes'],
  },
  work: {
    name: 'Work',
    description: 'Colleagues, clients, professional contacts',
    defaultSections: ['contact-info', 'work', 'notes'],
  },
  gaming: {
    name: 'Gaming',
    description: 'Online friends, gaming buddies',
    defaultSections: ['social-gaming', 'personal', 'notes'],
  },
  family: {
    name: 'Family',
    description: 'Family members, relatives',
    defaultSections: ['contact-info', 'family', 'personal', 'notes'],
  },
  service: {
    name: 'Service Provider',
    description: 'Doctor, plumber, mechanic, etc.',
    defaultSections: ['business-info', 'service-details', 'notes'],
  },
};

// =============================================================================
// TEMPLATE BUILDERS
// =============================================================================

export function buildContactTemplate(sectionIds: string[], format: TemplateFormat = 'list'): string {
  return sectionIds
    .map((id) => {
      const section = CONTACT_SECTIONS[id];
      if (!section) return '';
      return format === 'list' ? section.listHtml : section.tableHtml;
    })
    .filter(Boolean)
    .join('\n');
}

export function getContactTemplate(type: string = 'personal', format: TemplateFormat = 'list'): string {
  const templateType = CONTACT_TEMPLATE_TYPES[type];
  if (!templateType) return buildContactTemplate(['contact-info', 'notes'], format);
  return buildContactTemplate(templateType.defaultSections, format);
}

export function getContactSection(sectionId: string, format: TemplateFormat = 'list'): string | null {
  const section = CONTACT_SECTIONS[sectionId];
  if (!section) return null;
  return format === 'list' ? section.listHtml : section.tableHtml;
}

// =============================================================================
// SECTION DETECTION & MANIPULATION
// =============================================================================

export function detectSectionsInContent(content: string): string[] {
  const detected: { id: string; index: number }[] = [];
  const lower = content.toLowerCase();

  const contactInfoIdx = lower.indexOf('contact info');
  if (contactInfoIdx > -1) detected.push({ id: 'contact-info', index: contactInfoIdx });

  const socialIdx = lower.indexOf('social');
  const gamingIdx = lower.indexOf('gaming');
  const socialGamingIdx = Math.min(
    socialIdx > -1 ? socialIdx : Infinity,
    gamingIdx > -1 ? gamingIdx : Infinity
  );
  if (socialGamingIdx < Infinity) detected.push({ id: 'social-gaming', index: socialGamingIdx });

  const personalHeaderIdx = lower.indexOf('>personal<');
  if (personalHeaderIdx > -1) detected.push({ id: 'personal', index: personalHeaderIdx });

  const workHeaderIdx = lower.indexOf('>work<');
  if (workHeaderIdx > -1) detected.push({ id: 'work', index: workHeaderIdx });

  const familyHeaderIdx = lower.indexOf('>family<');
  if (familyHeaderIdx > -1) detected.push({ id: 'family', index: familyHeaderIdx });

  const notesIdx = lower.indexOf('>notes<');
  if (notesIdx > -1) detected.push({ id: 'notes', index: notesIdx });

  const businessInfoIdx = lower.indexOf('business info');
  if (businessInfoIdx > -1) detected.push({ id: 'business-info', index: businessInfoIdx });

  const serviceDetailsIdx = lower.indexOf('service details');
  if (serviceDetailsIdx > -1) detected.push({ id: 'service-details', index: serviceDetailsIdx });

  const iceIdx = lower.indexOf('emergency contact');
  if (iceIdx > -1) detected.push({ id: 'ice', index: iceIdx });

  return detected.sort((a, b) => a.index - b.index).map((d) => d.id);
}

export function removeSectionFromContent(content: string, sectionId: string): string {
  const section = CONTACT_SECTIONS[sectionId];
  if (!section) return content;

  const sectionName = section.name;
  const headerRegex = new RegExp(`<h2>${sectionName}</h2>`, 'i');
  const match = content.match(headerRegex);

  if (!match || match.index === undefined) return content;

  const startIndex = match.index;
  const afterHeader = content.slice(startIndex + match[0].length);
  const nextH2Match = afterHeader.match(/<h2>/i);

  let endIndex: number;
  if (nextH2Match && nextH2Match.index !== undefined) {
    endIndex = startIndex + match[0].length + nextH2Match.index;
  } else {
    endIndex = content.length;
  }

  const before = content.slice(0, startIndex);
  const after = content.slice(endIndex);

  return (before + after).trim();
}

export function extractSectionFromContent(content: string, sectionId: string): string | null {
  const section = CONTACT_SECTIONS[sectionId];
  if (!section) return null;

  const sectionName = section.name;
  const headerRegex = new RegExp(`<h2>${sectionName}</h2>`, 'i');
  const match = content.match(headerRegex);

  if (!match || match.index === undefined) return null;

  const startIndex = match.index;
  const afterHeader = content.slice(startIndex + match[0].length);
  const nextH2Match = afterHeader.match(/<h2>/i);

  let endIndex: number;
  if (nextH2Match && nextH2Match.index !== undefined) {
    endIndex = startIndex + match[0].length + nextH2Match.index;
  } else {
    endIndex = content.length;
  }

  return content.slice(startIndex, endIndex).trim();
}

export function reorderSections(content: string, newOrder: string[]): string {
  const sections: { id: string; html: string }[] = [];

  for (const sectionId of newOrder) {
    const html = extractSectionFromContent(content, sectionId);
    if (html) {
      sections.push({ id: sectionId, html });
    }
  }

  return sections.map((s) => s.html).join('\n');
}

// =============================================================================
// INFO EXTRACTION (for quick actions)
// =============================================================================

export function extractContactInfo(content: string): { phone?: string; email?: string } {
  const result: { phone?: string; email?: string } = {};

  // Extract phone - look for tel: links first
  const telMatch = content.match(/href="tel:([^"]+)"/i);
  if (telMatch && telMatch[1]) {
    result.phone = telMatch[1].replace(/[^\d+]/g, '');
  }

  // Fallback: look for Phone: field
  if (!result.phone) {
    const phoneFieldMatch = content.match(/<strong>Phone:?<\/strong>(?:&nbsp;|\s)*([^<]+)/i);
    if (phoneFieldMatch && phoneFieldMatch[1]) {
      const phone = phoneFieldMatch[1].trim();
      if (phone && phone !== '&nbsp;') {
        result.phone = phone.replace(/[^\d+]/g, '');
      }
    }
  }

  // Extract email - prefer displayed text over href
  const mailtoLinkMatch = content.match(/<a[^>]*href="mailto:[^"]*"[^>]*>([^<]+)<\/a>/i);
  if (mailtoLinkMatch && mailtoLinkMatch[1]) {
    const email = mailtoLinkMatch[1].trim();
    if (email.includes('@') && email.split('@')[1]?.includes('.')) {
      result.email = email;
    }
  }

  // Fallback: check mailto href
  if (!result.email) {
    const mailtoMatch = content.match(/href="mailto:([^"]+)"/i);
    if (mailtoMatch && mailtoMatch[1]) {
      const email = mailtoMatch[1];
      if (email.includes('@') && email.split('@')[1]?.includes('.')) {
        result.email = email;
      }
    }
  }

  // Fallback: look for Email: field
  if (!result.email) {
    const emailFieldMatch = content.match(/<strong>Email:?<\/strong>(?:&nbsp;|\s)*([^<]+)/i);
    if (emailFieldMatch && emailFieldMatch[1]) {
      const email = emailFieldMatch[1].trim();
      if (email && email !== '&nbsp;' && email.includes('@')) {
        result.email = email;
      }
    }
  }

  return result;
}

// =============================================================================
// FORMAT CONVERSION
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
 * Extract field values from Plate JSON content
 * Handles list items with "Label: value" format
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractFieldValuesFromPlateJson(content: any[]): Record<string, string> {
  const values: Record<string, string> = {};

  for (const node of content) {
    // Handle list items (ul/ol with li children)
    if ('type' in node && (node.type === 'ul' || node.type === 'ol')) {
      const listChildren = node.children || [];
      for (const li of listChildren) {
        if ('type' in li && li.type === 'li') {
          // Check for lic (list item content) children
          const licChildren = li.children || [];
          for (const lic of licChildren) {
            if ('type' in lic && lic.type === 'lic') {
              const licText = extractTextFromPlateNode(lic);
              const colonMatch = licText.match(/^([^:]+):\s*(.*)$/);
              if (colonMatch) {
                const label = colonMatch[1].trim();
                const value = colonMatch[2].trim();
                // Skip placeholder values
                if (value && value !== '(day of month)' && value !== '$/month' && value !== '&nbsp;') {
                  values[label] = value;
                }
              }
            }
          }
          // Also try direct text extraction from li
          const liText = extractTextFromPlateNode(li);
          const colonMatch = liText.match(/^([^:]+):\s*(.*)$/);
          if (colonMatch) {
            const label = colonMatch[1].trim();
            const value = colonMatch[2].trim();
            if (value && value !== '(day of month)' && value !== '$/month' && value !== '&nbsp;' && !values[label]) {
              values[label] = value;
            }
          }
        }
      }
    }

    // Handle table rows
    if ('type' in node && node.type === 'table') {
      const tableChildren = node.children || [];
      for (const tr of tableChildren) {
        if ('type' in tr && tr.type === 'tr') {
          const cells = tr.children || [];
          if (cells.length >= 2) {
            const labelCell = cells[0];
            const valueCell = cells[1];
            const label = extractTextFromPlateNode(labelCell).trim();
            const value = extractTextFromPlateNode(valueCell).trim();
            if (label && value && value !== '&nbsp;') {
              values[label] = value;
            }
          }
        }
      }
    }

    // Handle paragraphs with "Label: value" format
    if ('type' in node && node.type === 'p') {
      const pText = extractTextFromPlateNode(node);
      const colonMatch = pText.match(/^([^:]+):\s*(.+)$/);
      if (colonMatch) {
        const label = colonMatch[1].trim();
        const value = colonMatch[2].trim();
        if (value && !values[label]) {
          values[label] = value;
        }
      }
    }
  }

  return values;
}

export function extractFieldValues(content: string): Record<string, string> {
  // Check if content is Plate JSON
  if (isPlateJson(content)) {
    const parsed = parseJsonContent(content);
    if (parsed) {
      return extractFieldValuesFromPlateJson(parsed);
    }
  }

  // Fall back to HTML parsing
  const values: Record<string, string> = {};

  // List format
  const listPattern = /<li[^>]*>(?:<p>)?<strong>([^<]+):?<\/strong>(?:&nbsp;|\s)*(.+?)(?:<\/p>)?<\/li>/gi;
  const listMatches = content.matchAll(listPattern);
  for (const match of listMatches) {
    const label = match[1].replace(/:$/, '').trim();
    let value = match[2].replace(/<[^>]+>/g, '').trim();
    if (value && value !== '&nbsp;' && value !== ' ') {
      values[label] = value;
    }
  }

  // Table format
  const tablePattern = /<tr[^>]*>\s*<td[^>]*>(?:<p>)?<strong>([^<]+)<\/strong>(?:<\/p>)?\s*<\/td>\s*<td[^>]*>(?:<p>)?(.+?)(?:<\/p>)?\s*<\/td>\s*<\/tr>/gi;
  const tableMatches = content.matchAll(tablePattern);
  for (const match of tableMatches) {
    const label = match[1].trim();
    let value = match[2].replace(/<[^>]+>/g, '').trim();
    if (value && value !== '&nbsp;' && value !== ' ') {
      values[label] = value;
    }
  }

  return values;
}

function injectValuesIntoSection(sectionHtml: string, values: Record<string, string>): string {
  let result = sectionHtml;

  for (const [label, value] of Object.entries(values)) {
    // List format
    const listPattern = new RegExp(`(<strong>${label}:?</strong>&nbsp;)([^<]*)`, 'gi');
    result = result.replace(listPattern, `$1${value}`);

    // Table format
    const tablePattern = new RegExp(`(<td><strong>${label}</strong></td><td>)([^<]*)(</td>)`, 'gi');
    result = result.replace(tablePattern, `$1${value}$3`);
  }

  return result;
}

export function convertFormat(content: string, targetFormat: TemplateFormat, sectionIds: string[]): string {
  const values = extractFieldValues(content);

  const newContent = sectionIds
    .map((id) => {
      const sectionHtml = getContactSection(id, targetFormat);
      if (!sectionHtml) return '';
      return injectValuesIntoSection(sectionHtml, values);
    })
    .filter(Boolean)
    .join('\n');

  return newContent;
}

// =============================================================================
// DEFINITION
// =============================================================================

const DEFAULT_TEMPLATE = getContactTemplate('personal', 'list');

export const contactSupertag: SupertagDefinition = {
  tag: 'contact',
  displayName: 'Contact',
  icon: 'user',
  description: 'Person with contact information',
  suggestedFields: ['phone', 'email', 'birthday', 'address', 'discord', 'notes'],
  template: DEFAULT_TEMPLATE,
  uiHints: {
    calendarFields: ['birthday', 'anniversary'],
    hasProtocolLinks: true,
    showInWidget: 'birthdays-widget',
  },
  actions: [
    { id: 'call', label: 'Call', protocol: 'tel:', field: 'phone' },
    { id: 'email', label: 'Email', protocol: 'mailto:', field: 'email' },
    { id: 'sms', label: 'Message', protocol: 'sms:', field: 'phone' },
  ],
  sections: CONTACT_SECTIONS,
  templateTypes: CONTACT_TEMPLATE_TYPES,
};
