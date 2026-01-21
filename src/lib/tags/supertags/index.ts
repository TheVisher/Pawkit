/**
 * Supertags Registry
 *
 * Supertags are special tags that imply behavior, structure, or UI treatment.
 * When a card has a supertag, the system can:
 * - Suggest a template for the note content
 * - Show specialized UI (checkboxes for #todo, etc.)
 * - Extract calendar events (birthdays from #contact)
 * - Display in specialized widgets
 */

// Types
export type { SupertagDefinition, TemplateSection, TemplateType, TemplateFormat } from './types';

// Individual supertag imports
import { contactSupertag } from './contact';
import { subscriptionSupertag } from './subscription';
import { todoSupertag } from './todo';
import { recipeSupertag } from './recipe';
import { readingSupertag } from './reading';
import { projectSupertag } from './project';
import { meetingSupertag } from './meeting';
import { habitSupertag } from './habit';
import { wishlistSupertag } from './wishlist';
import { warrantySupertag } from './warranty';
import { getContentText } from '@/lib/plate/html-to-plate';

// Re-export contact utilities (used by SupertagPanel and grid-card)
export {
  CONTACT_SECTIONS,
  CONTACT_TEMPLATE_TYPES,
  buildContactTemplate,
  getContactTemplate,
  getContactSection,
  detectSectionsInContent,
  removeSectionFromContent,
  extractSectionFromContent,
  reorderSections,
  extractContactInfo,
  extractFieldValues,
  convertFormat,
  type ContactTemplateType,
} from './contact';

// Re-export subscription utilities
export {
  SUBSCRIPTION_SECTIONS,
  SUBSCRIPTION_TEMPLATE_TYPES,
  buildSubscriptionTemplate,
  getSubscriptionTemplate,
  getSubscriptionSection,
  extractSubscriptionInfo,
  type SubscriptionTemplateType,
} from './subscription';

// Re-export recipe utilities
export {
  RECIPE_SECTIONS,
  RECIPE_TEMPLATE_TYPES,
  buildRecipeTemplate,
  getRecipeTemplate,
  getRecipeSection,
  extractRecipeInfo,
  type RecipeTemplateType,
} from './recipe';

// Re-export reading utilities
export {
  READING_SECTIONS,
  READING_TEMPLATE_TYPES,
  buildReadingTemplate,
  getReadingTemplate,
  getReadingSection,
  extractReadingInfo,
  type ReadingTemplateType,
} from './reading';

// Re-export project utilities
export {
  PROJECT_SECTIONS,
  PROJECT_TEMPLATE_TYPES,
  buildProjectTemplate,
  getProjectTemplate,
  getProjectSection,
  type ProjectTemplateType,
} from './project';

// Re-export todo utilities
export {
  TODO_SECTIONS,
  TODO_TEMPLATE_TYPES,
  buildTodoTemplate,
  getTodoTemplate,
  getTodoSection,
  type TodoTemplateType,
} from './todo';

// Re-export meeting utilities
export {
  MEETING_SECTIONS,
  MEETING_TEMPLATE_TYPES,
  buildMeetingTemplate,
  getMeetingTemplate,
  getMeetingSection,
  extractMeetingInfo,
  type MeetingTemplateType,
} from './meeting';

// Re-export habit utilities
export {
  HABIT_SECTIONS,
  HABIT_TEMPLATE_TYPES,
  buildHabitTemplate,
  getHabitTemplate,
  getHabitSection,
  type HabitTemplateType,
} from './habit';

// Re-export wishlist utilities
export {
  WISHLIST_SECTIONS,
  WISHLIST_TEMPLATE_TYPES,
  buildWishlistTemplate,
  getWishlistTemplate,
  getWishlistSection,
  extractWishlistInfo,
  type WishlistTemplateType,
} from './wishlist';

// Re-export warranty utilities
export {
  WARRANTY_SECTIONS,
  WARRANTY_TEMPLATE_TYPES,
  buildWarrantyTemplate,
  getWarrantyTemplate,
  getWarrantySection,
  extractWarrantyInfo,
  type WarrantyTemplateType,
} from './warranty';

// =============================================================================
// REGISTRY
// =============================================================================

import type { SupertagDefinition } from './types';

export const SUPERTAG_REGISTRY: Record<string, SupertagDefinition> = {
  contact: contactSupertag,
  subscription: subscriptionSupertag,
  todo: todoSupertag,
  recipe: recipeSupertag,
  reading: readingSupertag,
  project: projectSupertag,
  meeting: meetingSupertag,
  habit: habitSupertag,
  wishlist: wishlistSupertag,
  warranty: warrantySupertag,
};

// =============================================================================
// HELPER FUNCTIONS
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
 * Replace placeholders in a Plate JSON node tree
 * Handles special characters safely by operating at the JSON level
 */
function replacePlaceholdersInNodes(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nodes: any[],
  placeholders: Record<string, string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  const placeholderPattern = /\{\{([^}]+)\}\}/g;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function processNode(node: any): any {
    if (!node || typeof node !== 'object') return node;

    // Handle text nodes
    if ('text' in node && typeof node.text === 'string') {
      let text = node.text;
      // Replace known placeholders
      for (const [key, value] of Object.entries(placeholders)) {
        text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      }
      // Remove any remaining placeholders
      text = text.replace(placeholderPattern, '');
      return { ...node, text };
    }

    // Handle elements with children
    if ('children' in node && Array.isArray(node.children)) {
      return {
        ...node,
        children: node.children.map(processNode),
      };
    }

    return node;
  }

  return nodes.map(processNode);
}

/**
 * Get the template for a supertag, with placeholders replaced
 * Operates at the JSON level to safely handle special characters in placeholder values
 */
export function getSupertagTemplate(
  tag: string,
  placeholders: Record<string, string> = {}
): string | null {
  const def = getSupertagDefinition(tag);
  if (!def?.template) return null;

  // If no placeholders, return template as-is
  if (Object.keys(placeholders).length === 0) {
    return def.template;
  }

  try {
    // Parse the JSON template
    const nodes = JSON.parse(def.template);
    // Replace placeholders at the JSON level (safe for special chars)
    const processed = replacePlaceholdersInNodes(nodes, placeholders);
    return JSON.stringify(processed);
  } catch {
    // Fallback to string replacement if parsing fails (legacy HTML templates)
    let template = def.template;
    for (const [key, value] of Object.entries(placeholders)) {
      template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    template = template.replace(/\{\{[^}]+\}\}/g, '');
    return template;
  }
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
export function getActionsForTags(tags: string[]): NonNullable<SupertagDefinition['actions']> {
  const supertags = findSupertagsInTags(tags);
  const actions: NonNullable<SupertagDefinition['actions']> = [];

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
 */
export function suggestSupertagsFromContent(content: unknown): SupertagDefinition[] {
  const suggestions: SupertagDefinition[] = [];
  const plainText = getContentText(content);
  if (!plainText) return suggestions;
  const lower = plainText.toLowerCase();

  // Contact patterns
  if (
    lower.includes('phone:') ||
    lower.includes('email:') ||
    lower.includes('birthday:') ||
    lower.includes('@') ||
    /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(plainText)
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
