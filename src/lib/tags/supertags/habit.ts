/**
 * Habit Supertag
 * For tracking daily habits and building streaks
 */

import type { SupertagDefinition, TemplateSection, TemplateType, TemplateFormat } from './types';

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
// TEMPLATE BUILDERS
// =============================================================================

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

export function getHabitTemplate(type: string = 'simple', format: TemplateFormat = 'list'): string {
  const templateType = HABIT_TEMPLATE_TYPES[type];
  if (!templateType) return buildHabitTemplate(['habit-info', 'streak', 'notes'], format);
  return buildHabitTemplate(templateType.defaultSections, format);
}

export function getHabitSection(sectionId: string, format: TemplateFormat = 'list'): string | null {
  const section = HABIT_SECTIONS[sectionId];
  if (!section) return null;
  return format === 'list' ? section.listHtml : section.tableHtml;
}

// =============================================================================
// DEFINITION
// =============================================================================

const DEFAULT_TEMPLATE = getHabitTemplate('simple', 'list');

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
