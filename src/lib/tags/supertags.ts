/**
 * Supertags Registry
 *
 * Supertags are special tags that imply behavior, structure, or UI treatment.
 * When a card has a supertag, the system can:
 * - Suggest a template for the note content
 * - Show specialized UI (checkboxes for #todo, etc.)
 * - Extract calendar events (birthdays from #contact)
 * - Display in specialized widgets
 *
 * See: .claude/skills/pawkit-tag-architecture/SKILL.md
 */

// =============================================================================
// TYPES
// =============================================================================

export interface SupertagDefinition {
  /** The tag string (lowercase, no hash) */
  tag: string;

  /** Human-readable display name */
  displayName: string;

  /** Icon to show for this supertag */
  icon: string;

  /** Description of what this supertag is for */
  description: string;

  /** Suggested fields for the note template */
  suggestedFields?: string[];

  /** Markdown template for new notes with this tag */
  template?: string;

  /** UI behavior hints */
  uiHints?: {
    /** Show checkboxes for markdown task lists */
    showCheckboxes?: boolean;

    /** Which home widget should display these cards */
    showInWidget?: 'todo-widget' | 'bills-widget' | 'reading-widget' | 'birthdays-widget';

    /** Fields to parse for calendar event creation */
    calendarFields?: string[];

    /** Whether this supertag implies clickable protocol links */
    hasProtocolLinks?: boolean;
  };

  /** Available quick actions for cards with this supertag */
  actions?: Array<{
    id: string;
    label: string;
    icon?: string;
    /** URL protocol to use (e.g., 'tel:', 'mailto:') */
    protocol?: string;
    /** Field to extract the value from */
    field?: string;
  }>;
}

// =============================================================================
// CONTACT TEMPLATE SYSTEM
// =============================================================================

export type ContactTemplateType = 'personal' | 'work' | 'gaming' | 'family' | 'service';
export type TemplateFormat = 'list' | 'table';

export interface TemplateSection {
  id: string;
  name: string;
  listHtml: string;
  tableHtml: string;
}

// Define all available sections for contacts
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

// Define which sections each template type includes by default
export const CONTACT_TEMPLATE_TYPES: Record<ContactTemplateType, {
  name: string;
  description: string;
  defaultSections: string[];
}> = {
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

/**
 * Build a contact template from sections
 */
export function buildContactTemplate(
  sectionIds: string[],
  format: TemplateFormat = 'list'
): string {
  return sectionIds
    .map((id) => {
      const section = CONTACT_SECTIONS[id];
      if (!section) return '';
      return format === 'list' ? section.listHtml : section.tableHtml;
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Get the default template for a contact type
 */
export function getContactTemplate(
  type: ContactTemplateType = 'personal',
  format: TemplateFormat = 'list'
): string {
  const templateType = CONTACT_TEMPLATE_TYPES[type];
  return buildContactTemplate(templateType.defaultSections, format);
}

/**
 * Get a single section's HTML
 */
export function getContactSection(
  sectionId: string,
  format: TemplateFormat = 'list'
): string | null {
  const section = CONTACT_SECTIONS[sectionId];
  if (!section) return null;
  return format === 'list' ? section.listHtml : section.tableHtml;
}

/**
 * Get all available sections
 */
export function getAllContactSections(): TemplateSection[] {
  return Object.values(CONTACT_SECTIONS);
}

/**
 * Detect which sections are present in content (in order they appear)
 */
export function detectSectionsInContent(content: string): string[] {
  const detected: { id: string; index: number }[] = [];
  const lower = content.toLowerCase();

  // Find each section and its position
  const contactInfoIdx = lower.indexOf('contact info');
  if (contactInfoIdx > -1) detected.push({ id: 'contact-info', index: contactInfoIdx });

  const socialIdx = lower.indexOf('social');
  const gamingIdx = lower.indexOf('gaming');
  const socialGamingIdx = Math.min(
    socialIdx > -1 ? socialIdx : Infinity,
    gamingIdx > -1 ? gamingIdx : Infinity
  );
  if (socialGamingIdx < Infinity) detected.push({ id: 'social-gaming', index: socialGamingIdx });

  // Check for Personal section header specifically
  const personalHeaderIdx = lower.indexOf('>personal<');
  if (personalHeaderIdx > -1) detected.push({ id: 'personal', index: personalHeaderIdx });

  const workHeaderIdx = lower.indexOf('>work<');
  if (workHeaderIdx > -1) detected.push({ id: 'work', index: workHeaderIdx });

  const familyHeaderIdx = lower.indexOf('>family<');
  if (familyHeaderIdx > -1) detected.push({ id: 'family', index: familyHeaderIdx });

  const notesIdx = lower.indexOf('>notes<');
  if (notesIdx > -1) detected.push({ id: 'notes', index: notesIdx });

  // Business/Service sections
  const businessInfoIdx = lower.indexOf('business info');
  if (businessInfoIdx > -1) detected.push({ id: 'business-info', index: businessInfoIdx });

  const serviceDetailsIdx = lower.indexOf('service details');
  if (serviceDetailsIdx > -1) detected.push({ id: 'service-details', index: serviceDetailsIdx });

  // ICE section
  const iceIdx = lower.indexOf('emergency contact');
  if (iceIdx > -1) detected.push({ id: 'ice', index: iceIdx });

  // Sort by position and return just the IDs
  return detected.sort((a, b) => a.index - b.index).map((d) => d.id);
}

/**
 * Remove a section from content
 */
export function removeSectionFromContent(content: string, sectionId: string): string {
  const section = CONTACT_SECTIONS[sectionId];
  if (!section) return content;

  // Find the h2 header for this section
  const sectionName = section.name;
  const headerRegex = new RegExp(`<h2>${sectionName}</h2>`, 'i');
  const match = content.match(headerRegex);

  if (!match || match.index === undefined) return content;

  const startIndex = match.index;

  // Find the next h2 or end of content
  const afterHeader = content.slice(startIndex + match[0].length);
  const nextH2Match = afterHeader.match(/<h2>/i);

  let endIndex: number;
  if (nextH2Match && nextH2Match.index !== undefined) {
    endIndex = startIndex + match[0].length + nextH2Match.index;
  } else {
    endIndex = content.length;
  }

  // Remove the section
  const before = content.slice(0, startIndex);
  const after = content.slice(endIndex);

  return (before + after).trim();
}

/**
 * Extract a section from content (returns the HTML for that section)
 */
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

/**
 * Reorder sections in content
 */
export function reorderSections(content: string, newOrder: string[]): string {
  // Extract all sections
  const sections: { id: string; html: string }[] = [];

  for (const sectionId of newOrder) {
    const html = extractSectionFromContent(content, sectionId);
    if (html) {
      sections.push({ id: sectionId, html });
    }
  }

  // Rebuild content in new order
  return sections.map((s) => s.html).join('\n');
}

// =============================================================================
// CONTACT INFO EXTRACTION (for quick actions)
// =============================================================================

/**
 * Extract phone and email from card content for quick actions
 */
export function extractContactInfo(content: string): { phone?: string; email?: string } {
  const result: { phone?: string; email?: string } = {};

  // Extract phone - look for tel: links first (most reliable)
  const telMatch = content.match(/href="tel:([^"]+)"/i);
  if (telMatch && telMatch[1]) {
    result.phone = telMatch[1].replace(/[^\d+]/g, '');
  }

  // Fallback: look for Phone: field with plain text
  if (!result.phone) {
    const phoneFieldMatch = content.match(/<strong>Phone:?<\/strong>(?:&nbsp;|\s)*([^<]+)/i);
    if (phoneFieldMatch && phoneFieldMatch[1]) {
      const phone = phoneFieldMatch[1].trim();
      if (phone && phone !== '&nbsp;') {
        result.phone = phone.replace(/[^\d+]/g, '');
      }
    }
  }

  // Extract email - look for mailto: links, preferring the displayed text over href
  // The href might have partial email from aggressive auto-linking, but text is complete
  const mailtoLinkMatch = content.match(/<a[^>]*href="mailto:[^"]*"[^>]*>([^<]+)<\/a>/i);
  if (mailtoLinkMatch && mailtoLinkMatch[1]) {
    const email = mailtoLinkMatch[1].trim();
    // Only use if it looks like a complete email
    if (email.includes('@') && email.split('@')[1]?.includes('.')) {
      result.email = email;
    }
  }

  // Fallback: check the mailto href itself
  if (!result.email) {
    const mailtoMatch = content.match(/href="mailto:([^"]+)"/i);
    if (mailtoMatch && mailtoMatch[1]) {
      const email = mailtoMatch[1];
      if (email.includes('@') && email.split('@')[1]?.includes('.')) {
        result.email = email;
      }
    }
  }

  // Fallback: look for Email: field with plain text
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
// FORMAT CONVERSION (preserves field values)
// =============================================================================

/**
 * Extract field values from content (works with both list and table formats)
 * Returns a map of field label -> value
 */
export function extractFieldValues(content: string): Record<string, string> {
  const values: Record<string, string> = {};

  // Extract from list format - flexible pattern that handles:
  // - <li><strong>Label:</strong>&nbsp;Value</li>
  // - <li><p><strong>Label:</strong> Value</p></li>
  // - Values with links, spans, etc.
  const listPattern = /<li[^>]*>(?:<p>)?<strong>([^<]+):?<\/strong>(?:&nbsp;|\s)*(.+?)(?:<\/p>)?<\/li>/gi;
  const listMatches = content.matchAll(listPattern);
  for (const match of listMatches) {
    const label = match[1].replace(/:$/, '').trim();
    // Strip HTML tags from value but preserve text content
    let value = match[2].replace(/<[^>]+>/g, '').trim();
    if (value && value !== '&nbsp;' && value !== ' ') {
      values[label] = value;
    }
  }

  // Extract from table format - flexible pattern that handles:
  // - <tr><td><strong>Label</strong></td><td>Value</td></tr>
  // - <tr><td><p><strong>Label</strong></p></td><td><p>Value</p></td></tr>
  // - Values with links, spans, etc.
  const tablePattern = /<tr[^>]*>\s*<td[^>]*>(?:<p>)?<strong>([^<]+)<\/strong>(?:<\/p>)?\s*<\/td>\s*<td[^>]*>(?:<p>)?(.+?)(?:<\/p>)?\s*<\/td>\s*<\/tr>/gi;
  const tableMatches = content.matchAll(tablePattern);
  for (const match of tableMatches) {
    const label = match[1].trim();
    // Strip HTML tags from value but preserve text content
    let value = match[2].replace(/<[^>]+>/g, '').trim();
    if (value && value !== '&nbsp;' && value !== ' ') {
      values[label] = value;
    }
  }

  return values;
}

/**
 * Inject field values into a section's HTML
 */
function injectValuesIntoSection(sectionHtml: string, values: Record<string, string>): string {
  let result = sectionHtml;

  for (const [label, value] of Object.entries(values)) {
    // Replace in list format: <strong>Label:</strong>&nbsp; -> <strong>Label:</strong>&nbsp;Value
    const listPattern = new RegExp(
      `(<strong>${label}:?</strong>&nbsp;)([^<]*)`,
      'gi'
    );
    result = result.replace(listPattern, `$1${value}`);

    // Replace in table format: <td><strong>Label</strong></td><td>&nbsp;</td> -> <td><strong>Label</strong></td><td>Value</td>
    const tablePattern = new RegExp(
      `(<td><strong>${label}</strong></td><td>)([^<]*)(</td>)`,
      'gi'
    );
    result = result.replace(tablePattern, `$1${value}$3`);
  }

  return result;
}

/**
 * Convert content from one format to another while preserving values
 */
export function convertFormat(
  content: string,
  targetFormat: TemplateFormat,
  sectionIds: string[]
): string {
  // Extract all current values
  const values = extractFieldValues(content);

  // Build new content in target format
  const newContent = sectionIds
    .map((id) => {
      const sectionHtml = getContactSection(id, targetFormat);
      if (!sectionHtml) return '';
      // Inject extracted values into the new format
      return injectValuesIntoSection(sectionHtml, values);
    })
    .filter(Boolean)
    .join('\n');

  return newContent;
}

// =============================================================================
// LEGACY TEMPLATES (for backward compatibility)
// =============================================================================

const CONTACT_TEMPLATE = getContactTemplate('personal', 'list');

const TODO_TEMPLATE = `<h2>Tasks</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p></p></div></li>
</ul>
<h2>Notes</h2>
<p></p>`;

const SUBSCRIPTION_TEMPLATE = `<h2>Details</h2>
<ul>
<li><strong>Amount:</strong>&nbsp;/month</li>
<li><strong>Renews:</strong>&nbsp;of each month</li>
<li><strong>Manage:</strong>&nbsp;</li>
<li><strong>Account:</strong>&nbsp;</li>
</ul>
<h2>Notes</h2>
<p></p>`;

const RECIPE_TEMPLATE = `<h2>Info</h2>
<ul>
<li><strong>Prep Time:</strong>&nbsp;</li>
<li><strong>Cook Time:</strong>&nbsp;</li>
<li><strong>Servings:</strong>&nbsp;</li>
</ul>
<h2>Ingredients</h2>
<p></p>
<h2>Instructions</h2>
<p></p>
<h2>Notes</h2>
<p></p>`;

const READING_TEMPLATE = `<h2>Book Info</h2>
<ul>
<li><strong>Author:</strong>&nbsp;</li>
<li><strong>Pages:</strong>&nbsp;</li>
<li><strong>Current Page:</strong>&nbsp;</li>
<li><strong>Rating:</strong>&nbsp;/5</li>
</ul>
<h2>Notes</h2>
<p></p>`;

const PROJECT_TEMPLATE = `<h2>Overview</h2>
<p></p>
<h2>Goals</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p></p></div></li>
</ul>
<h2>Resources</h2>
<p></p>
<h2>Notes</h2>
<p></p>`;

// =============================================================================
// REGISTRY
// =============================================================================

export const SUPERTAG_REGISTRY: Record<string, SupertagDefinition> = {
  todo: {
    tag: 'todo',
    displayName: 'To-Do',
    icon: 'check',
    description: 'Task list or actionable items',
    template: TODO_TEMPLATE,
    uiHints: {
      showCheckboxes: true,
      showInWidget: 'todo-widget',
    },
  },

  contact: {
    tag: 'contact',
    displayName: 'Contact',
    icon: 'user',
    description: 'Person with contact information',
    suggestedFields: ['phone', 'email', 'birthday', 'address', 'discord', 'notes'],
    template: CONTACT_TEMPLATE,
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
  },

  subscription: {
    tag: 'subscription',
    displayName: 'Subscription',
    icon: 'credit-card',
    description: 'Recurring payment or subscription service',
    suggestedFields: ['service', 'amount', 'renewalDay', 'accountEmail', 'manageUrl'],
    template: SUBSCRIPTION_TEMPLATE,
    uiHints: {
      calendarFields: ['renewalDay'],
      showInWidget: 'bills-widget',
    },
  },

  recipe: {
    tag: 'recipe',
    displayName: 'Recipe',
    icon: 'utensils',
    description: 'Cooking recipe with ingredients and steps',
    suggestedFields: ['ingredients', 'steps', 'prepTime', 'cookTime', 'servings'],
    template: RECIPE_TEMPLATE,
  },

  reading: {
    tag: 'reading',
    displayName: 'Reading',
    icon: 'book-open',
    description: 'Book or long-form reading material',
    suggestedFields: ['author', 'pages', 'currentPage', 'rating'],
    template: READING_TEMPLATE,
    uiHints: {
      showInWidget: 'reading-widget',
    },
  },

  project: {
    tag: 'project',
    displayName: 'Project',
    icon: 'clipboard-list',
    description: 'Project with goals and resources',
    suggestedFields: ['goals', 'deadline', 'resources'],
    template: PROJECT_TEMPLATE,
    uiHints: {
      showCheckboxes: true,
    },
  },

  meeting: {
    tag: 'meeting',
    displayName: 'Meeting',
    icon: 'calendar',
    description: 'Meeting notes with attendees and action items',
    suggestedFields: ['date', 'attendees', 'agenda', 'actionItems'],
    uiHints: {
      showCheckboxes: true,
      calendarFields: ['date'],
    },
  },

  habit: {
    tag: 'habit',
    displayName: 'Habit',
    icon: 'repeat',
    description: 'Habit to track daily',
    suggestedFields: ['frequency', 'streak'],
  },

  wishlist: {
    tag: 'wishlist',
    displayName: 'Wishlist',
    icon: 'gift',
    description: 'Items you want to buy or receive',
    suggestedFields: ['price', 'priority', 'link'],
  },

  warranty: {
    tag: 'warranty',
    displayName: 'Warranty',
    icon: 'shield',
    description: 'Product warranty or receipt for tracking',
    suggestedFields: ['purchaseDate', 'expiryDate', 'serialNumber', 'receiptUrl'],
    uiHints: {
      calendarFields: ['expiryDate'],
    },
  },
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get a supertag definition by tag name
 */
export function getSupertagDefinition(tag: string): SupertagDefinition | null {
  const normalized = tag.toLowerCase().replace(/^#/, '');
  return SUPERTAG_REGISTRY[normalized] || null;
}

/**
 * Check if a tag is a supertag
 */
export function isSupertag(tag: string): boolean {
  const normalized = tag.toLowerCase().replace(/^#/, '');
  return normalized in SUPERTAG_REGISTRY;
}

/**
 * Get all registered supertags
 */
export function getAllSupertags(): SupertagDefinition[] {
  return Object.values(SUPERTAG_REGISTRY);
}

/**
 * Get supertags that show in a specific widget
 */
export function getSupertagsForWidget(
  widgetId: 'todo-widget' | 'bills-widget' | 'reading-widget' | 'birthdays-widget'
): SupertagDefinition[] {
  return getAllSupertags().filter((st) => st.uiHints?.showInWidget === widgetId);
}

/**
 * Get the template for a supertag, with placeholders replaced
 */
export function getSupertagTemplate(
  tag: string,
  placeholders: Record<string, string> = {}
): string | null {
  const def = getSupertagDefinition(tag);
  if (!def?.template) return null;

  let template = def.template;
  for (const [key, value] of Object.entries(placeholders)) {
    template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }

  // Remove any remaining placeholders
  template = template.replace(/{{[^}]+}}/g, '');

  return template;
}

/**
 * Find supertags in a list of tags
 */
export function findSupertagsInTags(tags: string[]): SupertagDefinition[] {
  return tags
    .map((t) => getSupertagDefinition(t))
    .filter((def): def is SupertagDefinition => def !== null);
}

/**
 * Get calendar fields from supertags in a tag list
 * Used to know which fields to parse for calendar event creation
 */
export function getCalendarFieldsFromTags(tags: string[]): string[] {
  const supertags = findSupertagsInTags(tags);
  const fields: string[] = [];

  for (const st of supertags) {
    if (st.uiHints?.calendarFields) {
      fields.push(...st.uiHints.calendarFields);
    }
  }

  return [...new Set(fields)];
}

/**
 * Get available actions for a card based on its supertags
 */
export function getActionsForTags(
  tags: string[]
): Array<SupertagDefinition['actions']>[number][] {
  const supertags = findSupertagsInTags(tags);
  const actions: Array<SupertagDefinition['actions']>[number][] = [];

  for (const st of supertags) {
    if (st.actions) {
      actions.push(...st.actions);
    }
  }

  return actions;
}

// =============================================================================
// SUPERTAG SUGGESTIONS
// =============================================================================

/**
 * Suggest supertags based on note content
 * Used by Kit AI to recommend tags
 */
export function suggestSupertagsFromContent(content: string): SupertagDefinition[] {
  const suggestions: SupertagDefinition[] = [];
  const lower = content.toLowerCase();

  // Contact patterns
  if (
    lower.includes('phone:') ||
    lower.includes('email:') ||
    lower.includes('birthday:') ||
    lower.includes('@') ||
    /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(content)
  ) {
    const def = getSupertagDefinition('contact');
    if (def) suggestions.push(def);
  }

  // Todo patterns
  if (lower.includes('- [ ]') || lower.includes('- [x]') || lower.includes('task')) {
    const def = getSupertagDefinition('todo');
    if (def) suggestions.push(def);
  }

  // Recipe patterns
  if (
    lower.includes('ingredients') ||
    lower.includes('instructions') ||
    lower.includes('prep time') ||
    lower.includes('servings')
  ) {
    const def = getSupertagDefinition('recipe');
    if (def) suggestions.push(def);
  }

  // Subscription patterns
  if (
    lower.includes('/month') ||
    lower.includes('/year') ||
    lower.includes('subscription') ||
    lower.includes('renews')
  ) {
    const def = getSupertagDefinition('subscription');
    if (def) suggestions.push(def);
  }

  // Reading patterns
  if (
    lower.includes('author:') ||
    lower.includes('pages:') ||
    lower.includes('currently reading')
  ) {
    const def = getSupertagDefinition('reading');
    if (def) suggestions.push(def);
  }

  return suggestions;
}
