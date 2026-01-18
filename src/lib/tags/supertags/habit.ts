/**
 * Habit Supertag
 * For tracking daily habits and building streaks
 */

import type { SupertagDefinition, TemplateSection, TemplateType, TemplateFormat } from './types';
import { serializePlateContent } from '@/lib/plate/html-to-plate';
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

export type HabitTemplateType = 'simple' | 'detailed';

// =============================================================================
// SECTIONS
// =============================================================================

export const HABIT_SECTIONS: Record<string, TemplateSection> = {
  'habit-info': {
    id: 'habit-info',
    name: 'Habit Info',
    listHtml: `<h2>Habit Info</h2>
<ul>
<li><strong>Habit:</strong>&nbsp;</li>
<li><strong>Frequency:</strong>&nbsp;Daily / Weekly / Monthly</li>
<li><strong>Time of Day:</strong>&nbsp;Morning / Afternoon / Evening</li>
<li><strong>Started:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Habit Info</h2>
<table><tbody>
<tr><td><strong>Habit</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Frequency</strong></td><td>Daily / Weekly / Monthly</td></tr>
<tr><td><strong>Time of Day</strong></td><td>Morning / Afternoon / Evening</td></tr>
<tr><td><strong>Started</strong></td><td>&nbsp;</td></tr>
</tbody></table>`,
    listJson: [
      h2('Habit Info'),
      fieldItem('Habit'),
      fieldItem('Frequency', 'Daily / Weekly / Monthly'),
      fieldItem('Time of Day', 'Morning / Afternoon / Evening'),
      fieldItem('Started'),
    ],
    tableJson: [
      h2('Habit Info'),
      table(
        tableFieldRow('Habit', ''),
        tableFieldRow('Frequency', 'Daily / Weekly / Monthly'),
        tableFieldRow('Time of Day', 'Morning / Afternoon / Evening'),
        tableFieldRow('Started', ''),
      ),
    ],
  },
  streak: {
    id: 'streak',
    name: 'Streak',
    listHtml: `<h2>Streak</h2>
<ul>
<li><strong>Current Streak:</strong>&nbsp;0 days</li>
<li><strong>Best Streak:</strong>&nbsp;0 days</li>
<li><strong>Total Completions:</strong>&nbsp;0</li>
</ul>`,
    tableHtml: `<h2>Streak</h2>
<table><tbody>
<tr><td><strong>Current Streak</strong></td><td>0 days</td></tr>
<tr><td><strong>Best Streak</strong></td><td>0 days</td></tr>
<tr><td><strong>Total Completions</strong></td><td>0</td></tr>
</tbody></table>`,
    listJson: [
      h2('Streak'),
      fieldItem('Current Streak', '0 days'),
      fieldItem('Best Streak', '0 days'),
      fieldItem('Total Completions', '0'),
    ],
    tableJson: [
      h2('Streak'),
      table(
        tableFieldRow('Current Streak', '0 days'),
        tableFieldRow('Best Streak', '0 days'),
        tableFieldRow('Total Completions', '0'),
      ),
    ],
  },
  triggers: {
    id: 'triggers',
    name: 'Triggers & Cues',
    listHtml: `<h2>Triggers & Cues</h2>
<ul>
<li><strong>Cue:</strong>&nbsp;What triggers this habit?</li>
<li><strong>Reward:</strong>&nbsp;What reward do I get?</li>
<li><strong>Obstacle:</strong>&nbsp;What might stop me?</li>
<li><strong>Solution:</strong>&nbsp;How do I overcome it?</li>
</ul>`,
    tableHtml: `<h2>Triggers & Cues</h2>
<table><tbody>
<tr><td><strong>Cue</strong></td><td>What triggers this habit?</td></tr>
<tr><td><strong>Reward</strong></td><td>What reward do I get?</td></tr>
<tr><td><strong>Obstacle</strong></td><td>What might stop me?</td></tr>
<tr><td><strong>Solution</strong></td><td>How do I overcome it?</td></tr>
</tbody></table>`,
    listJson: [
      h2('Triggers & Cues'),
      fieldItem('Cue', 'What triggers this habit?'),
      fieldItem('Reward', 'What reward do I get?'),
      fieldItem('Obstacle', 'What might stop me?'),
      fieldItem('Solution', 'How do I overcome it?'),
    ],
    tableJson: [
      h2('Triggers & Cues'),
      table(
        tableFieldRow('Cue', 'What triggers this habit?'),
        tableFieldRow('Reward', 'What reward do I get?'),
        tableFieldRow('Obstacle', 'What might stop me?'),
        tableFieldRow('Solution', 'How do I overcome it?'),
      ),
    ],
  },
  progress: {
    id: 'progress',
    name: 'Weekly Progress',
    listHtml: `<h2>Weekly Progress</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>Mon</p></div></li>
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>Tue</p></div></li>
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>Wed</p></div></li>
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>Thu</p></div></li>
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>Fri</p></div></li>
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>Sat</p></div></li>
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>Sun</p></div></li>
</ul>`,
    tableHtml: `<h2>Weekly Progress</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>Mon</p></div></li>
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>Tue</p></div></li>
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>Wed</p></div></li>
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>Thu</p></div></li>
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>Fri</p></div></li>
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>Sat</p></div></li>
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>Sun</p></div></li>
</ul>`,
    listJson: [
      h2('Weekly Progress'),
      taskItem(false, 'Mon'),
      taskItem(false, 'Tue'),
      taskItem(false, 'Wed'),
      taskItem(false, 'Thu'),
      taskItem(false, 'Fri'),
      taskItem(false, 'Sat'),
      taskItem(false, 'Sun'),
    ],
    tableJson: [
      h2('Weekly Progress'),
      taskItem(false, 'Mon'),
      taskItem(false, 'Tue'),
      taskItem(false, 'Wed'),
      taskItem(false, 'Thu'),
      taskItem(false, 'Fri'),
      taskItem(false, 'Sat'),
      taskItem(false, 'Sun'),
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

export const HABIT_TEMPLATE_TYPES: Record<string, TemplateType> = {
  simple: {
    name: 'Simple',
    description: 'Basic habit tracking',
    defaultSections: ['habit-info', 'streak', 'notes'],
  },
  detailed: {
    name: 'Detailed',
    description: 'With triggers and weekly tracking',
    defaultSections: ['habit-info', 'streak', 'triggers', 'progress', 'notes'],
  },
};

// =============================================================================
// TEMPLATE BUILDERS (JSON)
// =============================================================================

/**
 * Build a habit template as Plate JSON
 */
export function buildHabitTemplateJson(sectionIds: string[], format: TemplateFormat = 'list'): Value {
  const nodes: Descendant[] = [];
  for (const id of sectionIds) {
    const section = HABIT_SECTIONS[id];
    if (!section) continue;
    const sectionNodes = format === 'list' ? section.listJson : section.tableJson;
    if (sectionNodes) {
      nodes.push(...sectionNodes);
    }
  }
  return nodes.length > 0 ? nodes as Value : [{ type: 'p', children: [{ text: '' }] }] as Value;
}

/**
 * Get habit template as JSON string (serialized Plate JSON)
 */
export function getHabitTemplateJson(type: string = 'simple', format: TemplateFormat = 'list'): string {
  const templateType = HABIT_TEMPLATE_TYPES[type];
  const sectionIds = templateType?.defaultSections || ['habit-info', 'streak', 'notes'];
  const nodes = buildHabitTemplateJson(sectionIds, format);
  return serializePlateContent(nodes);
}

/**
 * Get a single section as Plate JSON nodes
 */
export function getHabitSectionJson(sectionId: string, format: TemplateFormat = 'list'): Descendant[] | null {
  const section = HABIT_SECTIONS[sectionId];
  if (!section) return null;
  return format === 'list' ? (section.listJson || null) : (section.tableJson || null);
}

// =============================================================================
// TEMPLATE BUILDERS (HTML - DEPRECATED)
// =============================================================================

/**
 * @deprecated Use buildHabitTemplateJson instead - returns HTML string
 */
export function buildHabitTemplate(sectionIds: string[], format: TemplateFormat = 'list'): string {
  return sectionIds
    .map((id) => {
      const section = HABIT_SECTIONS[id];
      if (!section) return '';
      return format === 'list' ? section.listHtml : section.tableHtml;
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * @deprecated Use getHabitTemplateJson instead - returns HTML string
 */
export function getHabitTemplate(type: string = 'simple', format: TemplateFormat = 'list'): string {
  const templateType = HABIT_TEMPLATE_TYPES[type];
  if (!templateType) return buildHabitTemplate(['habit-info', 'streak', 'notes'], format);
  return buildHabitTemplate(templateType.defaultSections, format);
}

/**
 * @deprecated Use getHabitSectionJson instead - returns HTML string
 */
export function getHabitSection(sectionId: string, format: TemplateFormat = 'list'): string | null {
  const section = HABIT_SECTIONS[sectionId];
  if (!section) return null;
  return format === 'list' ? section.listHtml : section.tableHtml;
}

// =============================================================================
// DEFINITION
// =============================================================================

// Use native JSON template (no HTML conversion needed)
const DEFAULT_TEMPLATE = getHabitTemplateJson('simple', 'list');

export const habitSupertag: SupertagDefinition = {
  tag: 'habit',
  displayName: 'Habit',
  icon: 'repeat',
  description: 'Habit to track daily',
  suggestedFields: ['frequency', 'streak'],
  template: DEFAULT_TEMPLATE,
  uiHints: {
    showCheckboxes: true,
  },
  sections: HABIT_SECTIONS,
  templateTypes: HABIT_TEMPLATE_TYPES,
};
