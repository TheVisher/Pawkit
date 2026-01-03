/**
 * Recipe Supertag
 * For cooking recipes with ingredients and instructions
 */

import type { SupertagDefinition, TemplateSection, TemplateType, TemplateFormat } from './types';

// =============================================================================
// TYPES
// =============================================================================

export type RecipeTemplateType = 'quick' | 'elaborate' | 'baking' | 'drink' | 'healthy';

// =============================================================================
// SECTIONS
// =============================================================================

export const RECIPE_SECTIONS: Record<string, TemplateSection> = {
  info: {
    id: 'info',
    name: 'Info',
    listHtml: `<h2>Info</h2>
<ul>
<li><strong>Prep Time:</strong>&nbsp;</li>
<li><strong>Cook Time:</strong>&nbsp;</li>
<li><strong>Servings:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Info</h2>
<table><tbody>
<tr><td><strong>Prep Time</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Cook Time</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Servings</strong></td><td>&nbsp;</td></tr>
</tbody></table>`,
  },
  ingredients: {
    id: 'ingredients',
    name: 'Ingredients',
    listHtml: `<h2>Ingredients</h2>
<ul>
<li></li>
</ul>`,
    tableHtml: `<h2>Ingredients</h2>
<ul>
<li></li>
</ul>`,
  },
  instructions: {
    id: 'instructions',
    name: 'Instructions',
    listHtml: `<h2>Instructions</h2>
<ol>
<li></li>
</ol>`,
    tableHtml: `<h2>Instructions</h2>
<ol>
<li></li>
</ol>`,
  },
  nutrition: {
    id: 'nutrition',
    name: 'Nutrition',
    listHtml: `<h2>Nutrition</h2>
<ul>
<li><strong>Calories:</strong>&nbsp;per serving</li>
<li><strong>Protein:</strong>&nbsp;g</li>
<li><strong>Carbs:</strong>&nbsp;g</li>
<li><strong>Fat:</strong>&nbsp;g</li>
</ul>`,
    tableHtml: `<h2>Nutrition</h2>
<table><tbody>
<tr><td><strong>Calories</strong></td><td>per serving</td></tr>
<tr><td><strong>Protein</strong></td><td>g</td></tr>
<tr><td><strong>Carbs</strong></td><td>g</td></tr>
<tr><td><strong>Fat</strong></td><td>g</td></tr>
</tbody></table>`,
  },
  source: {
    id: 'source',
    name: 'Source',
    listHtml: `<h2>Source</h2>
<ul>
<li><strong>Recipe From:</strong>&nbsp;</li>
<li><strong>URL:</strong>&nbsp;</li>
<li><strong>Original Author:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Source</h2>
<table><tbody>
<tr><td><strong>Recipe From</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>URL</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Original Author</strong></td><td>&nbsp;</td></tr>
</tbody></table>`,
  },
  equipment: {
    id: 'equipment',
    name: 'Equipment',
    listHtml: `<h2>Equipment</h2>
<ul>
<li></li>
</ul>`,
    tableHtml: `<h2>Equipment</h2>
<ul>
<li></li>
</ul>`,
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

export const RECIPE_TEMPLATE_TYPES: Record<string, TemplateType> = {
  quick: {
    name: 'Quick',
    description: '30 minutes or less',
    defaultSections: ['info', 'ingredients', 'instructions', 'notes'],
  },
  elaborate: {
    name: 'Elaborate',
    description: 'Multi-step, longer recipes',
    defaultSections: ['info', 'equipment', 'ingredients', 'instructions', 'notes'],
  },
  baking: {
    name: 'Baking',
    description: 'Cakes, breads, pastries',
    defaultSections: ['info', 'equipment', 'ingredients', 'instructions', 'notes'],
  },
  drink: {
    name: 'Drink',
    description: 'Cocktails, smoothies, beverages',
    defaultSections: ['info', 'ingredients', 'instructions', 'notes'],
  },
  healthy: {
    name: 'Healthy',
    description: 'With nutrition tracking',
    defaultSections: ['info', 'nutrition', 'ingredients', 'instructions', 'notes'],
  },
};

// =============================================================================
// INFO EXTRACTION (for quick actions)
// =============================================================================

export function extractRecipeInfo(content: string): {
  sourceUrl?: string;
} {
  const result: { sourceUrl?: string } = {};

  // Extract source URL
  const urlMatch = content.match(/<strong>URL:?<\/strong>(?:&nbsp;|\s)*(?:<a[^>]*href="([^"]+)"[^>]*>|([^\s<]+))/i);
  if (urlMatch) {
    const url = urlMatch[1] || urlMatch[2];
    if (url && url !== '&nbsp;' && (url.startsWith('http') || url.includes('.'))) {
      result.sourceUrl = url.startsWith('http') ? url : `https://${url}`;
    }
  }

  return result;
}

// =============================================================================
// TEMPLATE BUILDERS
// =============================================================================

export function buildRecipeTemplate(sectionIds: string[], format: TemplateFormat = 'list'): string {
  return sectionIds
    .map((id) => {
      const section = RECIPE_SECTIONS[id];
      if (!section) return '';
      return format === 'list' ? section.listHtml : section.tableHtml;
    })
    .filter(Boolean)
    .join('\n');
}

export function getRecipeTemplate(type: string = 'quick', format: TemplateFormat = 'list'): string {
  const templateType = RECIPE_TEMPLATE_TYPES[type];
  if (!templateType) return buildRecipeTemplate(['info', 'ingredients', 'instructions', 'notes'], format);
  return buildRecipeTemplate(templateType.defaultSections, format);
}

export function getRecipeSection(sectionId: string, format: TemplateFormat = 'list'): string | null {
  const section = RECIPE_SECTIONS[sectionId];
  if (!section) return null;
  return format === 'list' ? section.listHtml : section.tableHtml;
}

// =============================================================================
// DEFINITION
// =============================================================================

const DEFAULT_TEMPLATE = getRecipeTemplate('quick', 'list');

export const recipeSupertag: SupertagDefinition = {
  tag: 'recipe',
  displayName: 'Recipe',
  icon: 'utensils',
  description: 'Cooking recipe with ingredients and steps',
  suggestedFields: ['ingredients', 'steps', 'prepTime', 'cookTime', 'servings'],
  template: DEFAULT_TEMPLATE,
  actions: [
    { id: 'open-source', label: 'Open Source', icon: 'external-link', field: 'sourceUrl' },
  ],
  sections: RECIPE_SECTIONS,
  templateTypes: RECIPE_TEMPLATE_TYPES,
};
