/**
 * Project Supertag
 * For projects with goals and resources
 */

import type { SupertagDefinition, TemplateSection, TemplateType, TemplateFormat } from './types';

// =============================================================================
// TYPES
// =============================================================================

export type ProjectTemplateType = 'personal' | 'work' | 'creative' | 'software';

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
  timeline: {
    id: 'timeline',
    name: 'Timeline',
    // CRITICAL: Deadline field is parsed by calendar sync - do not change field name
    listHtml: `<h2>Timeline</h2>
<ul>
<li><strong>Status:</strong>&nbsp;Planning / In Progress / On Hold / Completed</li>
<li><strong>Start Date:</strong>&nbsp;</li>
<li><strong>Deadline:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Timeline</h2>
<table><tbody>
<tr><td><strong>Status</strong></td><td>Planning / In Progress / On Hold / Completed</td></tr>
<tr><td><strong>Start Date</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Deadline</strong></td><td>&nbsp;</td></tr>
</tbody></table>`,
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
  milestones: {
    id: 'milestones',
    name: 'Milestones',
    listHtml: `<h2>Milestones</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>Milestone 1</p></div></li>
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>Milestone 2</p></div></li>
</ul>`,
    tableHtml: `<h2>Milestones</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>Milestone 1</p></div></li>
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>Milestone 2</p></div></li>
</ul>`,
  },
  team: {
    id: 'team',
    name: 'Team',
    listHtml: `<h2>Team</h2>
<ul>
<li><strong>Lead:</strong>&nbsp;</li>
<li><strong>Members:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Team</h2>
<table><tbody>
<tr><td><strong>Lead</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Members</strong></td><td>&nbsp;</td></tr>
</tbody></table>`,
  },
  budget: {
    id: 'budget',
    name: 'Budget',
    listHtml: `<h2>Budget</h2>
<ul>
<li><strong>Total Budget:</strong>&nbsp;$</li>
<li><strong>Spent:</strong>&nbsp;$</li>
<li><strong>Remaining:</strong>&nbsp;$</li>
</ul>`,
    tableHtml: `<h2>Budget</h2>
<table><tbody>
<tr><td><strong>Total Budget</strong></td><td>$</td></tr>
<tr><td><strong>Spent</strong></td><td>$</td></tr>
<tr><td><strong>Remaining</strong></td><td>$</td></tr>
</tbody></table>`,
  },
  tools: {
    id: 'tools',
    name: 'Tools',
    listHtml: `<h2>Tools</h2>
<ul>
<li></li>
</ul>`,
    tableHtml: `<h2>Tools</h2>
<ul>
<li></li>
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
// TEMPLATE TYPES
// =============================================================================

export const PROJECT_TEMPLATE_TYPES: Record<string, TemplateType> = {
  personal: {
    name: 'Personal',
    description: 'Side projects, hobbies',
    defaultSections: ['overview', 'timeline', 'goals', 'resources', 'notes'],
  },
  work: {
    name: 'Work',
    description: 'Professional projects',
    defaultSections: ['overview', 'timeline', 'goals', 'milestones', 'team', 'budget', 'notes'],
  },
  creative: {
    name: 'Creative',
    description: 'Art, writing, music',
    defaultSections: ['overview', 'timeline', 'goals', 'resources', 'notes'],
  },
  software: {
    name: 'Software',
    description: 'Development projects',
    defaultSections: ['overview', 'timeline', 'goals', 'milestones', 'tools', 'resources', 'notes'],
  },
};

// =============================================================================
// TEMPLATE BUILDERS
// =============================================================================

export function buildProjectTemplate(sectionIds: string[], format: TemplateFormat = 'list'): string {
  return sectionIds
    .map((id) => {
      const section = PROJECT_SECTIONS[id];
      if (!section) return '';
      return format === 'list' ? section.listHtml : section.tableHtml;
    })
    .filter(Boolean)
    .join('\n');
}

export function getProjectTemplate(type: string = 'personal', format: TemplateFormat = 'list'): string {
  const templateType = PROJECT_TEMPLATE_TYPES[type];
  if (!templateType) return buildProjectTemplate(['overview', 'goals', 'resources', 'notes'], format);
  return buildProjectTemplate(templateType.defaultSections, format);
}

export function getProjectSection(sectionId: string, format: TemplateFormat = 'list'): string | null {
  const section = PROJECT_SECTIONS[sectionId];
  if (!section) return null;
  return format === 'list' ? section.listHtml : section.tableHtml;
}

// =============================================================================
// DEFINITION
// =============================================================================

const DEFAULT_TEMPLATE = getProjectTemplate('personal', 'list');

export const projectSupertag: SupertagDefinition = {
  tag: 'project',
  displayName: 'Project',
  icon: 'clipboard-list',
  description: 'Project with goals and resources',
  suggestedFields: ['goals', 'deadline', 'resources'],
  template: DEFAULT_TEMPLATE,
  uiHints: {
    showCheckboxes: true,
    calendarFields: ['deadline'],
  },
  sections: PROJECT_SECTIONS,
  templateTypes: PROJECT_TEMPLATE_TYPES,
};
