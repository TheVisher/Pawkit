/**
 * Project Supertag
 * For projects with goals and resources
 */

import type { SupertagDefinition, TemplateSection } from './types';

// =============================================================================
// SECTIONS
// =============================================================================

export const PROJECT_SECTIONS: Record<string, TemplateSection> = {
  overview: {
    id: 'overview',
    name: 'Overview',
    listHtml: `<h2>Overview</h2>
<p></p>`,
    tableHtml: `<h2>Overview</h2>
<p></p>`,
  },
  goals: {
    id: 'goals',
    name: 'Goals',
    listHtml: `<h2>Goals</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p></p></div></li>
</ul>`,
    tableHtml: `<h2>Goals</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p></p></div></li>
</ul>`,
  },
  resources: {
    id: 'resources',
    name: 'Resources',
    listHtml: `<h2>Resources</h2>
<ul>
<li></li>
</ul>`,
    tableHtml: `<h2>Resources</h2>
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
// TEMPLATE BUILDER
// =============================================================================

function buildProjectTemplate(): string {
  return [
    PROJECT_SECTIONS.overview.listHtml,
    PROJECT_SECTIONS.goals.listHtml,
    PROJECT_SECTIONS.resources.listHtml,
    PROJECT_SECTIONS.notes.listHtml,
  ].join('\n');
}

// =============================================================================
// DEFINITION
// =============================================================================

export const projectSupertag: SupertagDefinition = {
  tag: 'project',
  displayName: 'Project',
  icon: 'clipboard-list',
  description: 'Project with goals and resources',
  suggestedFields: ['goals', 'deadline', 'resources'],
  template: buildProjectTemplate(),
  uiHints: {
    showCheckboxes: true,
  },
  sections: PROJECT_SECTIONS,
};
