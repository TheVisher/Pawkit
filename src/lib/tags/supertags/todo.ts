/**
 * Todo Supertag
 * For task lists and actionable items
 */

import type { SupertagDefinition } from './types';

const TODO_TEMPLATE = `<h2>Tasks</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p></p></div></li>
</ul>
<h2>Notes</h2>
<p></p>`;

export const todoSupertag: SupertagDefinition = {
  tag: 'todo',
  displayName: 'To-Do',
  icon: 'check',
  description: 'Task list or actionable items',
  template: TODO_TEMPLATE,
  uiHints: {
    showCheckboxes: true,
    showInWidget: 'todo-widget',
  },
};
