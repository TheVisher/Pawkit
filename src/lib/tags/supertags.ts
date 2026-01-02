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
// TEMPLATES
// =============================================================================

const CONTACT_TEMPLATE = `# {{name}}

## Contact Info
- 📱 Phone:
- 📧 Email:
- 🏠 Address:

## Social & Gaming
- 💬 Discord:
- 🎮 Steam:

## Personal
- 🎂 Birthday:
- 💼 Works at:
- 🎯 How we met:

## Notes

`;

const TODO_TEMPLATE = `# {{title}}

## Tasks
- [ ]

## Notes

`;

const SUBSCRIPTION_TEMPLATE = `# {{service}}

## Details
- 💰 Amount: ${{amount}}/month
- 📅 Renews: {{day}} of each month
- 🔗 Manage:
- 📧 Account:

## Notes

`;

const RECIPE_TEMPLATE = `# {{title}}

## Info
- ⏱️ Prep Time:
- 🍳 Cook Time:
- 🍽️ Servings:

## Ingredients


## Instructions


## Notes

`;

const READING_TEMPLATE = `# {{title}}

## Book Info
- 📖 Author:
- 📚 Pages:
- 📍 Current Page:
- ⭐ Rating: /5

## Notes

`;

const PROJECT_TEMPLATE = `# {{title}}

## Overview


## Goals
- [ ]

## Resources


## Notes

`;

// =============================================================================
// REGISTRY
// =============================================================================

export const SUPERTAG_REGISTRY: Record<string, SupertagDefinition> = {
  todo: {
    tag: 'todo',
    displayName: 'To-Do',
    icon: '✓',
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
    icon: '👤',
    description: 'Person with contact information',
    suggestedFields: ['phone', 'email', 'birthday', 'address', 'discord', 'notes'],
    template: CONTACT_TEMPLATE,
    uiHints: {
      calendarFields: ['birthday', 'anniversary'],
      hasProtocolLinks: true,
      showInWidget: 'birthdays-widget',
    },
    actions: [
      { id: 'call', label: 'Call', icon: '📱', protocol: 'tel:', field: 'phone' },
      { id: 'email', label: 'Email', icon: '📧', protocol: 'mailto:', field: 'email' },
      { id: 'sms', label: 'Message', icon: '💬', protocol: 'sms:', field: 'phone' },
    ],
  },

  subscription: {
    tag: 'subscription',
    displayName: 'Subscription',
    icon: '💳',
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
    icon: '🍳',
    description: 'Cooking recipe with ingredients and steps',
    suggestedFields: ['ingredients', 'steps', 'prepTime', 'cookTime', 'servings'],
    template: RECIPE_TEMPLATE,
  },

  reading: {
    tag: 'reading',
    displayName: 'Reading',
    icon: '📚',
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
    icon: '📋',
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
    icon: '🗓️',
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
    icon: '🔄',
    description: 'Habit to track daily',
    suggestedFields: ['frequency', 'streak'],
  },

  wishlist: {
    tag: 'wishlist',
    displayName: 'Wishlist',
    icon: '🎁',
    description: 'Items you want to buy or receive',
    suggestedFields: ['price', 'priority', 'link'],
  },

  warranty: {
    tag: 'warranty',
    displayName: 'Warranty',
    icon: '🛡️',
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
