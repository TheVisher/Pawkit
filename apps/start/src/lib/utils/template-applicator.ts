/**
 * Template Applicator
 * Handles applying supertag templates to cards
 * Updated to convert HTML templates to Plate JSON before applying
 */

import { getSupertagDefinition, getSupertagTemplate, isSupertag } from '@/lib/tags/supertags';
import {
  htmlToPlateJson,
  isPlateJson,
  parseJsonContent,
  hasPlateContent,
  createEmptyPlateContent,
} from '@/lib/plate/html-to-plate';
import type { Value } from 'platejs';

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
  currentContent: unknown
): TemplateApplicationResult {
  // Find newly added tags
  const addedTags = newTags.filter((tag) => !oldTags.includes(tag));

  // Check if any added tag is a supertag with a template
  for (const tag of addedTags) {
    if (isSupertag(tag)) {
      const definition = getSupertagDefinition(tag);
      if (definition?.template) {
        const template = getSupertagTemplate(tag) || '';
        const hasContent = hasPlateContent(currentContent);

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
 * Convert HTML template to JSON string
 * If already JSON, return as-is
 */
export function convertTemplateToJson(template: string): Value {
  if (!template || !template.trim()) {
    return createEmptyPlateContent();
  }

  // If already JSON, return as-is
  if (isPlateJson(template)) {
    const parsed = parseJsonContent(template);
    if (parsed) {
      return parsed;
    }
  }

  // Convert HTML to Plate JSON
  const plateContent = htmlToPlateJson(template);
  return plateContent as Value;
}

/**
 * Apply a supertag template to content
 * Converts HTML templates to JSON before applying
 * @param existingContent Current content (if any)
 * @param template Template to apply (HTML or JSON)
 * @param mode How to apply the template
 * @returns New content as JSON string
 */
export function applyTemplate(
  existingContent: unknown,
  template: string,
  mode: 'replace' | 'prepend' | 'append' = 'replace'
): Value {
  // Convert template to JSON
  const jsonTemplate = convertTemplateToJson(template);

  if (!hasPlateContent(existingContent)) {
    return jsonTemplate;
  }

  const existingJson = normalizeExistingContent(existingContent);
  if (!existingJson) {
    return jsonTemplate;
  }

  switch (mode) {
    case 'prepend':
      return [...jsonTemplate, ...existingJson] as Value;
    case 'append':
      return [...existingJson, ...jsonTemplate] as Value;
    case 'replace':
    default:
      return jsonTemplate;
  }
}

function normalizeExistingContent(content: unknown): Value | null {
  if (!content) return null;

  if (Array.isArray(content)) {
    return content as Value;
  }

  if (typeof content === 'string') {
    if (isPlateJson(content)) {
      return parseJsonContent(content);
    }
    if (content.trim()) {
      return htmlToPlateJson(content);
    }
  }

  return null;
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
