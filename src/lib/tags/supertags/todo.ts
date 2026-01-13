/**
 * Todo Supertag
 * For task lists and actionable items
 *
 * Note: The todo-widget parses task lists from content.
 * Tasks section must use Tiptap task list format.
 */

import type { SupertagDefinition, TemplateSection, TemplateType, TemplateFormat } from './types';

// =============================================================================
// TYPES
// =============================================================================

export type TodoTemplateType = 'daily' | 'shopping' | 'checklist' | 'deadline';

// =============================================================================
// SECTIONS
// =============================================================================

export const TODO_SECTIONS: Record<string, TemplateSection> = {
  tasks: {
    id: 'tasks',
    name: 'Tasks',
    // CRITICAL: Uses Tiptap taskList format for todo-widget integration
    listHtml: `<h2>Tasks</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p></p></div></li>
</ul>`,
    tableHtml: `<h2>Tasks</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p></p></div></li>
</ul>`,
  },
  context: {
    id: 'context',
    name: 'Context',
    listHtml: `<h2>Context</h2>
<ul>
<li><strong>Project:</strong>&nbsp;</li>
<li><strong>Priority:</strong>&nbsp;Low / Medium / High</li>
<li><strong>Category:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Context</h2>
<table><tbody>
<tr><td><strong>Project</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Priority</strong></td><td>Low / Medium / High</td></tr>
<tr><td><strong>Category</strong></td><td>&nbsp;</td></tr>
</tbody></table>`,
  },
  deadline: {
    id: 'deadline',
    name: 'Deadline',
    // CRITICAL: Due field is parsed by calendar sync - do not change field name
    listHtml: `<h2>Deadline</h2>
<ul>
<li><strong>Due:</strong>&nbsp;</li>
<li><strong>Reminder:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Deadline</h2>
<table><tbody>
<tr><td><strong>Due</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Reminder</strong></td><td>&nbsp;</td></tr>
</tbody></table>`,
  },
  shopping: {
    id: 'shopping',
    name: 'Shopping',
    listHtml: `<h2>Shopping List</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p></p></div></li>
</ul>`,
    tableHtml: `<h2>Shopping List</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p></p></div></li>
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

export const TODO_TEMPLATE_TYPES: Record<string, TemplateType> = {
  daily: {
    name: 'Daily',
    description: "Today's to-do list",
    defaultSections: ['tasks', 'notes'],
  },
  shopping: {
    name: 'Shopping',
    description: 'Items to buy',
    defaultSections: ['shopping', 'notes'],
  },
  checklist: {
    name: 'Checklist',
    description: 'Generic checklist with context',
    defaultSections: ['tasks', 'context', 'notes'],
  },
  deadline: {
    name: 'Deadline',
    description: 'Tasks with due dates',
    defaultSections: ['tasks', 'deadline', 'notes'],
  },
};

// =============================================================================
// TEMPLATE BUILDERS
// =============================================================================

export function buildTodoTemplate(sectionIds: string[], format: TemplateFormat = 'list'): string {
  return sectionIds
    .map((id) => {
      const section = TODO_SECTIONS[id];
      if (!section) return '';
      return format === 'list' ? section.listHtml : section.tableHtml;
    })
    .filter(Boolean)
    .join('\n');
}

export function getTodoTemplate(type: string = 'daily', format: TemplateFormat = 'list'): string {
  const templateType = TODO_TEMPLATE_TYPES[type];
  if (!templateType) return buildTodoTemplate(['tasks', 'notes'], format);
  return buildTodoTemplate(templateType.defaultSections, format);
}

export function getTodoSection(sectionId: string, format: TemplateFormat = 'list'): string | null {
  const section = TODO_SECTIONS[sectionId];
  if (!section) return null;
  return format === 'list' ? section.listHtml : section.tableHtml;
}

// =============================================================================
// DEFINITION
// =============================================================================

const DEFAULT_TEMPLATE = getTodoTemplate('daily', 'list');

export const todoSupertag: SupertagDefinition = {
  tag: 'todo',
  displayName: 'To-Do',
  icon: 'check',
  description: 'Task list or actionable items',
  template: DEFAULT_TEMPLATE,
  uiHints: {
    showCheckboxes: true,
    showInWidget: 'todo-widget',
    calendarFields: ['due'],
  },
  sections: TODO_SECTIONS,
  templateTypes: TODO_TEMPLATE_TYPES,
};
