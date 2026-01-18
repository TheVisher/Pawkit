/**
 * Project Supertag
 * For projects with goals and resources
 */

import type { SupertagDefinition, TemplateSection, TemplateType, TemplateFormat } from './types';
import { serializePlateContent } from '@/lib/plate/html-to-plate';
import {
  h2,
  fieldItem,
  emptyItem,
  taskItem,
  p,
  tableFieldRow,
  table,
} from './plate-builders';
import type { Descendant, Value } from 'platejs';

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
    listJson: [
      h2('Overview'),
      p(),
    ],
    tableJson: [
      h2('Overview'),
      p(),
    ],
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
    listJson: [
      h2('Timeline'),
      fieldItem('Status', 'Planning / In Progress / On Hold / Completed'),
      fieldItem('Start Date'),
      fieldItem('Deadline'),
    ],
    tableJson: [
      h2('Timeline'),
      table(
        tableFieldRow('Status', 'Planning / In Progress / On Hold / Completed'),
        tableFieldRow('Start Date', ''),
        tableFieldRow('Deadline', ''),
      ),
    ],
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
    listJson: [
      h2('Goals'),
      taskItem(false, ''),
    ],
    tableJson: [
      h2('Goals'),
      taskItem(false, ''),
    ],
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
    listJson: [
      h2('Milestones'),
      taskItem(false, 'Milestone 1'),
      taskItem(false, 'Milestone 2'),
    ],
    tableJson: [
      h2('Milestones'),
      taskItem(false, 'Milestone 1'),
      taskItem(false, 'Milestone 2'),
    ],
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
    listJson: [
      h2('Team'),
      fieldItem('Lead'),
      fieldItem('Members'),
    ],
    tableJson: [
      h2('Team'),
      table(
        tableFieldRow('Lead', ''),
        tableFieldRow('Members', ''),
      ),
    ],
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
    listJson: [
      h2('Budget'),
      fieldItem('Total Budget', '$'),
      fieldItem('Spent', '$'),
      fieldItem('Remaining', '$'),
    ],
    tableJson: [
      h2('Budget'),
      table(
        tableFieldRow('Total Budget', '$'),
        tableFieldRow('Spent', '$'),
        tableFieldRow('Remaining', '$'),
      ),
    ],
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
    listJson: [
      h2('Tools'),
      emptyItem(),
    ],
    tableJson: [
      h2('Tools'),
      emptyItem(),
    ],
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
    listJson: [
      h2('Resources'),
      emptyItem(),
    ],
    tableJson: [
      h2('Resources'),
      emptyItem(),
    ],
  },
  notes: {
    id: 'notes',
    name: 'Notes',
    listHtml: `<h2>Notes</h2>
<p></p>`,
    tableHtml: `<h2>Notes</h2>
<p></p>`,
    listJson: [
      h2('Notes'),
      p(),
    ],
    tableJson: [
      h2('Notes'),
      p(),
    ],
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

/**
 * Build a project template as Plate JSON
 */
export function buildProjectTemplateJson(sectionIds: string[], format: TemplateFormat = 'list'): Value {
  const nodes: Descendant[] = [];
  for (const id of sectionIds) {
    const section = PROJECT_SECTIONS[id];
    if (!section) continue;
    const sectionNodes = format === 'list' ? section.listJson : section.tableJson;
    if (sectionNodes) {
      nodes.push(...sectionNodes);
    }
  }
  return nodes.length > 0 ? nodes as Value : [{ type: 'p', children: [{ text: '' }] }] as Value;
}

/**
 * Get project template as JSON string (serialized Plate JSON)
 */
export function getProjectTemplateJson(type: string = 'personal', format: TemplateFormat = 'list'): string {
  const templateType = PROJECT_TEMPLATE_TYPES[type];
  const sectionIds = templateType?.defaultSections || ['overview', 'goals', 'resources', 'notes'];
  const nodes = buildProjectTemplateJson(sectionIds, format);
  return serializePlateContent(nodes);
}

/**
 * Get a single section as Plate JSON nodes
 */
export function getProjectSectionJson(sectionId: string, format: TemplateFormat = 'list'): Descendant[] | null {
  const section = PROJECT_SECTIONS[sectionId];
  if (!section) return null;
  return format === 'list' ? (section.listJson || null) : (section.tableJson || null);
}

/**
 * @deprecated Use buildProjectTemplateJson instead - returns HTML string
 */
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

/**
 * @deprecated Use getProjectTemplateJson instead - returns HTML string
 */
export function getProjectTemplate(type: string = 'personal', format: TemplateFormat = 'list'): string {
  const templateType = PROJECT_TEMPLATE_TYPES[type];
  if (!templateType) return buildProjectTemplate(['overview', 'goals', 'resources', 'notes'], format);
  return buildProjectTemplate(templateType.defaultSections, format);
}

/**
 * @deprecated Use getProjectSectionJson instead - returns HTML string
 */
export function getProjectSection(sectionId: string, format: TemplateFormat = 'list'): string | null {
  const section = PROJECT_SECTIONS[sectionId];
  if (!section) return null;
  return format === 'list' ? section.listHtml : section.tableHtml;
}

// =============================================================================
// DEFINITION
// =============================================================================

// Use native JSON template (no HTML conversion needed)
const DEFAULT_TEMPLATE = getProjectTemplateJson('personal', 'list');

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
