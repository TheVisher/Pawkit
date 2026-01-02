/**
 * Template Applicator
 * Handles applying supertag templates to cards
 */

import { getSupertagDefinition, getSupertagTemplate, isSupertag } from '@/lib/tags/supertags';

export interface TemplateApplicationResult {
  shouldApply: boolean;
  needsPrompt: boolean;
  template: string | null;
  supertagName: string | null;
}

/**
 * Check if a supertag was added and determine if template should be applied
 * @param oldTags Previous tags array
 * @param newTags New tags array
 * @param currentContent Current card content
 * @returns Template application decision
 */
export function checkSupertagAddition(
  oldTags: string[],
  newTags: string[],
  currentContent: string | undefined
): TemplateApplicationResult {
  // Find newly added tags
  const addedTags = newTags.filter((tag) => !oldTags.includes(tag));

  // Check if any added tag is a supertag with a template
  for (const tag of addedTags) {
    if (isSupertag(tag)) {
      const definition = getSupertagDefinition(tag);
      if (definition?.template) {
        const template = getSupertagTemplate(tag) || '';
        const hasContent = currentContent && currentContent.trim().length > 0;

        return {
          shouldApply: !hasContent, // Auto-apply if empty
          needsPrompt: !!hasContent, // Prompt if has content
          template,
          supertagName: definition.displayName,
        };
      }
    }
  }

  return {
    shouldApply: false,
    needsPrompt: false,
    template: null,
    supertagName: null,
  };
}

/**
 * Apply a supertag template to content
 * @param existingContent Current content (if any)
 * @param template Template to apply
 * @param mode How to apply the template
 * @returns New content
 */
export function applyTemplate(
  existingContent: string | undefined,
  template: string,
  mode: 'replace' | 'prepend' | 'append' = 'replace'
): string {
  if (!existingContent || existingContent.trim().length === 0) {
    return template;
  }

  switch (mode) {
    case 'prepend':
      return `${template}\n\n---\n\n${existingContent}`;
    case 'append':
      return `${existingContent}\n\n---\n\n${template}`;
    case 'replace':
    default:
      return template;
  }
}

/**
 * Get the first supertag from a list of tags that has a template
 */
export function findTemplateSupertag(tags: string[]): string | null {
  for (const tag of tags) {
    if (isSupertag(tag)) {
      const definition = getSupertagDefinition(tag);
      if (definition?.template) {
        return tag;
      }
    }
  }
  return null;
}
