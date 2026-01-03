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
import { meetingSupertag, habitSupertag, wishlistSupertag, warrantySupertag } from './others';

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
export { extractSubscriptionInfo, SUBSCRIPTION_SECTIONS } from './subscription';

// Re-export other section definitions
export { RECIPE_SECTIONS } from './recipe';
export { READING_SECTIONS } from './reading';
export { PROJECT_SECTIONS } from './project';

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
