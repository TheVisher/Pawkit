/**
 * Todo Supertag
 * For task lists and actionable items
 *
 * Note: The todo-widget parses task lists from content.
 * Tasks use Plate action_item format (with HTML fallback for legacy content).
 */

import type { SupertagDefinition, TemplateSection, TemplateType, TemplateFormat } from './types';
import { stringifyPlateContent } from '@/lib/plate/html-to-plate';
import {
  h2,
  fieldItem,
  taskItem,
  p,
  tableFieldRow,
  table,
} from './plate-builders';
import type { Descendant, Value } from 'platejs';

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
    // Note: HTML template is converted to Plate JSON on save
    listHtml: `<h2>Tasks</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p></p></div></li>
</ul>`,
    tableHtml: `<h2>Tasks</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p></p></div></li>
</ul>`,
    listJson: [
      h2('Tasks'),
      taskItem(false, ''),
    ],
    tableJson: [
      h2('Tasks'),
      taskItem(false, ''),
    ],
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
    listJson: [
      h2('Context'),
      fieldItem('Project'),
      fieldItem('Priority', 'Low / Medium / High'),
      fieldItem('Category'),
    ],
    tableJson: [
      h2('Context'),
      table(
        tableFieldRow('Project', ''),
        tableFieldRow('Priority', 'Low / Medium / High'),
        tableFieldRow('Category', ''),
      ),
    ],
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
    listJson: [
      h2('Deadline'),
      fieldItem('Due'),
      fieldItem('Reminder'),
    ],
    tableJson: [
      h2('Deadline'),
      table(
        tableFieldRow('Due', ''),
        tableFieldRow('Reminder', ''),
      ),
    ],
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
    listJson: [
      h2('Shopping List'),
      taskItem(false, ''),
    ],
    tableJson: [
      h2('Shopping List'),
      taskItem(false, ''),
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

/**
 * Build a todo template as Plate JSON
 */
export function buildTodoTemplateJson(sectionIds: string[], format: TemplateFormat = 'list'): Value {
  const nodes: Descendant[] = [];
  for (const id of sectionIds) {
    const section = TODO_SECTIONS[id];
    if (!section) continue;
    const sectionNodes = format === 'list' ? section.listJson : section.tableJson;
    if (sectionNodes) {
      nodes.push(...sectionNodes);
    }
  }
  return nodes.length > 0 ? nodes as Value : [{ type: 'p', children: [{ text: '' }] }] as Value;
}

/**
 * Get todo template as JSON string (serialized Plate JSON)
 */
export function getTodoTemplateJson(type: string = 'daily', format: TemplateFormat = 'list'): string {
  const templateType = TODO_TEMPLATE_TYPES[type];
  const sectionIds = templateType?.defaultSections || ['tasks', 'notes'];
  const nodes = buildTodoTemplateJson(sectionIds, format);
  return stringifyPlateContent(nodes);
}

/**
 * Get a single section as Plate JSON nodes
 */
export function getTodoSectionJson(sectionId: string, format: TemplateFormat = 'list'): Descendant[] | null {
  const section = TODO_SECTIONS[sectionId];
  if (!section) return null;
  return format === 'list' ? (section.listJson || null) : (section.tableJson || null);
}

/**
 * @deprecated Use buildTodoTemplateJson instead - returns HTML string
 */
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

/**
 * @deprecated Use getTodoTemplateJson instead - returns HTML string
 */
export function getTodoTemplate(type: string = 'daily', format: TemplateFormat = 'list'): string {
  const templateType = TODO_TEMPLATE_TYPES[type];
  if (!templateType) return buildTodoTemplate(['tasks', 'notes'], format);
  return buildTodoTemplate(templateType.defaultSections, format);
}

/**
 * @deprecated Use getTodoSectionJson instead - returns HTML string
 */
export function getTodoSection(sectionId: string, format: TemplateFormat = 'list'): string | null {
  const section = TODO_SECTIONS[sectionId];
  if (!section) return null;
  return format === 'list' ? section.listHtml : section.tableHtml;
}

// =============================================================================
// DEFINITION
// =============================================================================

// Use native JSON template (no HTML conversion needed)
const DEFAULT_TEMPLATE = getTodoTemplateJson('daily', 'list');

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
