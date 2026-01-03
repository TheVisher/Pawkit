/**
 * Recipe Supertag
 * For cooking recipes with ingredients and instructions
 */

import type { SupertagDefinition, TemplateSection } from './types';

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
// TEMPLATE BUILDER
// =============================================================================

function buildRecipeTemplate(): string {
  return [
    RECIPE_SECTIONS.info.listHtml,
    RECIPE_SECTIONS.ingredients.listHtml,
    RECIPE_SECTIONS.instructions.listHtml,
    RECIPE_SECTIONS.notes.listHtml,
  ].join('\n');
}

// =============================================================================
// DEFINITION
// =============================================================================

export const recipeSupertag: SupertagDefinition = {
  tag: 'recipe',
  displayName: 'Recipe',
  icon: 'utensils',
  description: 'Cooking recipe with ingredients and steps',
  suggestedFields: ['ingredients', 'steps', 'prepTime', 'cookTime', 'servings'],
  template: buildRecipeTemplate(),
  sections: RECIPE_SECTIONS,
};
