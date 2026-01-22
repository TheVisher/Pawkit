/**
 * Task Item Parsing Utilities
 * Extract and manipulate task items from both Plate JSON and legacy HTML content
 */

import type { Card } from '@/lib/types/convex';
import { format } from 'date-fns';
import {
  isPlateJson,
  parseJsonContent,
  serializePlateContent,
  htmlToPlateJson,
} from '@/lib/plate/html-to-plate';
import type { Descendant, Value } from 'platejs';

export interface TaskItem {
  id: string;           // Unique identifier (cardId-index)
  text: string;         // Task text content
  checked: boolean;     // Completion status
  cardId: string;       // Parent card ID
  cardTitle: string;    // Parent card title for context
  dateHeader?: string;  // Date header if task is under one
}

/**
 * Extract text content from Plate node children
 */
function extractTextFromChildren(children: Descendant[]): string {
  let text = '';
  for (const child of children) {
    if ('text' in child && typeof child.text === 'string') {
      text += child.text;
    } else if ('children' in child && Array.isArray(child.children)) {
      text += extractTextFromChildren(child.children as Descendant[]);
    }
  }
  return text;
}

/**
 * Check if a node is a todo item (supports both legacy action_item and listStyleType: 'todo')
 */
function isTodoItem(node: Descendant): boolean {
  if (!('type' in node)) return false;
  // Legacy format: type: 'action_item'
  if (node.type === 'action_item') return true;
  // Current format: type: 'p' with listStyleType: 'todo'
  if (node.type === 'p' && 'listStyleType' in node && node.listStyleType === 'todo') return true;
  return false;
}

/**
 * Parse task items from Plate JSON content
 */
function parseTaskItemsFromPlateJson(
  content: Value,
  cardId: string,
  cardTitle: string
): TaskItem[] {
  const items: TaskItem[] = [];
  let currentDateHeader: string | undefined;

  for (const node of content) {
    // Check for heading nodes (date headers)
    if ('type' in node && ['h1', 'h2', 'h3'].includes(node.type as string)) {
      if ('children' in node && Array.isArray(node.children)) {
        const text = extractTextFromChildren(node.children as Descendant[]).trim();
        if (isDateHeader(text)) {
          currentDateHeader = text;
        }
      }
    }

    // Check for todo items (both legacy action_item and listStyleType: 'todo')
    if (isTodoItem(node)) {
      const checked = Boolean((node as { checked?: boolean }).checked);
      if ('children' in node && Array.isArray(node.children)) {
        const text = extractTextFromChildren(node.children as Descendant[]).trim();
        if (text) {
          items.push({
            id: `${cardId}-${items.length}`,
            text,
            checked,
            cardId,
            cardTitle: cardTitle || 'Untitled Todo',
            dateHeader: currentDateHeader,
          });
        }
      }
    }
  }

  return items;
}

/**
 * Parse task items from HTML content (legacy format)
 */
function parseTaskItemsFromHtml(
  content: string,
  cardId: string,
  cardTitle: string
): TaskItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  const items: TaskItem[] = [];

  // Track current date header
  let currentDateHeader: string | undefined;

  // Walk through all elements to track headers
  const allElements = doc.body.querySelectorAll('h1, h2, h3, li[data-type="taskItem"]');
  allElements.forEach((el) => {
    if (el.tagName.match(/^H[123]$/)) {
      // Check if this looks like a date header
      const text = el.textContent?.trim() || '';
      if (isDateHeader(text)) {
        currentDateHeader = text;
      }
    } else if (el.getAttribute('data-type') === 'taskItem') {
      const text = getTaskItemText(el);
      if (text) {
        items.push({
          id: `${cardId}-${items.length}`,
          text,
          checked: el.getAttribute('data-checked') === 'true',
          cardId,
          cardTitle: cardTitle || 'Untitled Todo',
          dateHeader: currentDateHeader,
        });
      }
    }
  });

  return items;
}

/**
 * Parse task items from a card's content (supports both Plate JSON and HTML)
 */
export function parseTaskItemsFromCard(card: Card): TaskItem[] {
  if (!card.content) return [];

  // Try Plate JSON first
  if (isPlateJson(card.content)) {
    const parsed = parseJsonContent(card.content);
    if (parsed) {
      return parseTaskItemsFromPlateJson(parsed, card._id, card.title || 'Untitled Todo');
    }
  }

  // Fall back to HTML parsing
  return parseTaskItemsFromHtml(card.content, card._id, card.title || 'Untitled Todo');
}

/**
 * Extract text content from a taskItem element
 */
function getTaskItemText(li: Element): string {
  // Task item structure: <li><label><input></label><div><p>text</p></div></li>
  const div = li.querySelector('div');
  if (div) {
    return div.textContent?.trim() || '';
  }
  // Fallback: get all text except checkbox
  const clone = li.cloneNode(true) as Element;
  clone.querySelector('label')?.remove();
  return clone.textContent?.trim() || '';
}

/**
 * Check if text looks like a date header (e.g., "January 3, 2026" or "Someday")
 */
export function isDateHeader(text: string): boolean {
  // Match common date formats or "Someday"
  if (text.toLowerCase() === 'someday') return true;
  // Match "Month Day, Year" format
  const datePattern = /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}$/i;
  return datePattern.test(text);
}

/**
 * Parse a date header string into a Date object
 * Returns null for "Someday" or invalid formats
 */
export function parseDateFromHeader(dateHeader: string): Date | null {
  if (!dateHeader || dateHeader.toLowerCase() === 'someday') return null;

  // Parse "Month Day, Year" format
  const parsed = new Date(dateHeader);
  if (isNaN(parsed.getTime())) return null;

  // Reset to start of day for consistent comparison
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

/**
 * Get earliest unchecked task date from Plate JSON content
 */
function getEarliestUncheckedTaskDateFromPlateJson(content: Value): Date | null {
  let currentDateHeader: string | undefined;
  const datesWithUncheckedTasks: Date[] = [];

  for (const node of content) {
    // Check for heading nodes (date headers)
    if ('type' in node && ['h1', 'h2', 'h3'].includes(node.type as string)) {
      if ('children' in node && Array.isArray(node.children)) {
        const text = extractTextFromChildren(node.children as Descendant[]).trim();
        if (isDateHeader(text)) {
          currentDateHeader = text;
        }
      }
    }

    // Check for todo items (both legacy action_item and listStyleType: 'todo')
    if (isTodoItem(node)) {
      const isUnchecked = !(node as { checked?: boolean }).checked;
      if ('children' in node && Array.isArray(node.children)) {
        const hasText = extractTextFromChildren(node.children as Descendant[]).trim().length > 0;

        if (isUnchecked && hasText && currentDateHeader) {
          const date = parseDateFromHeader(currentDateHeader);
          if (date) {
            datesWithUncheckedTasks.push(date);
          }
        }
      }
    }
  }

  if (datesWithUncheckedTasks.length === 0) return null;

  return datesWithUncheckedTasks.reduce((earliest, date) =>
    date < earliest ? date : earliest
  );
}

/**
 * Get earliest unchecked task date from HTML content (legacy)
 */
function getEarliestUncheckedTaskDateFromHtml(content: string): Date | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');

  let currentDateHeader: string | undefined;
  const datesWithUncheckedTasks: Date[] = [];

  const allElements = doc.body.querySelectorAll('h1, h2, h3, li[data-type="taskItem"]');
  allElements.forEach((el) => {
    if (el.tagName.match(/^H[123]$/)) {
      const text = el.textContent?.trim() || '';
      if (isDateHeader(text)) {
        currentDateHeader = text;
      }
    } else if (el.getAttribute('data-type') === 'taskItem') {
      const isUnchecked = el.getAttribute('data-checked') !== 'true';
      const hasText = getTaskItemText(el).trim().length > 0;

      if (isUnchecked && hasText && currentDateHeader) {
        const date = parseDateFromHeader(currentDateHeader);
        if (date) {
          datesWithUncheckedTasks.push(date);
        }
      }
    }
  });

  if (datesWithUncheckedTasks.length === 0) return null;

  return datesWithUncheckedTasks.reduce((earliest, date) =>
    date < earliest ? date : earliest
  );
}

/**
 * Get the earliest date with unchecked tasks from a todo card's content
 * Used to determine the scheduledDate for overdue checking
 * Supports both Plate JSON and legacy HTML
 */
export function getEarliestUncheckedTaskDate(content: string | undefined | null): Date | null {
  if (!content) return null;

  // Try Plate JSON first
  if (isPlateJson(content)) {
    const parsed = parseJsonContent(content);
    if (parsed) {
      return getEarliestUncheckedTaskDateFromPlateJson(parsed);
    }
  }

  // Fall back to HTML parsing
  return getEarliestUncheckedTaskDateFromHtml(content);
}

/**
 * Check if a date header represents an overdue date
 */
export function isDateHeaderOverdue(dateHeader: string | undefined): boolean {
  if (!dateHeader) return false;
  const date = parseDateFromHeader(dateHeader);
  if (!date) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

/**
 * Check if a date header represents today
 */
export function isDateHeaderToday(dateHeader: string | undefined): boolean {
  if (!dateHeader) return false;
  const date = parseDateFromHeader(dateHeader);
  if (!date) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() === today.getTime();
}

/**
 * Check if a task's date header matches today's date
 */
export function isTaskFromToday(task: TaskItem): boolean {
  if (!task.dateHeader) return false;
  const today = format(new Date(), 'MMMM d, yyyy');
  return task.dateHeader === today;
}

/**
 * Create a task item element using safe DOM methods
 */
function createTaskItemElement(doc: Document, taskText: string, checked: boolean = false): Element {
  const li = doc.createElement('li');
  li.setAttribute('data-type', 'taskItem');
  li.setAttribute('data-checked', String(checked));

  const label = doc.createElement('label');
  const input = doc.createElement('input');
  input.setAttribute('type', 'checkbox');
  if (checked) {
    input.setAttribute('checked', 'true');
  }
  label.appendChild(input);

  const div = doc.createElement('div');
  const p = doc.createElement('p');
  p.textContent = taskText;
  div.appendChild(p);

  li.appendChild(label);
  li.appendChild(div);

  return li;
}

/**
 * Toggle a task item's checked state in Plate JSON content
 */
function toggleTaskInPlateJson(
  content: Value,
  taskText: string,
  newChecked: boolean
): Value {
  return content.map((node) => {
    // Handle both legacy action_item and listStyleType: 'todo' formats
    if (isTodoItem(node)) {
      if ('children' in node && Array.isArray(node.children)) {
        const text = extractTextFromChildren(node.children as Descendant[]).trim();
        if (text === taskText) {
          return { ...node, checked: newChecked };
        }
      }
    }
    return node;
  }) as Value;
}

/**
 * Toggle a task item's checked state in HTML content
 */
function toggleTaskInHtml(
  content: string,
  taskText: string,
  newChecked: boolean
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  const taskItems = doc.querySelectorAll('li[data-type="taskItem"]');

  for (const li of taskItems) {
    const text = getTaskItemText(li);
    if (text === taskText) {
      li.setAttribute('data-checked', String(newChecked));
      // Also update the checkbox input
      const input = li.querySelector('input[type="checkbox"]');
      if (input) {
        if (newChecked) {
          input.setAttribute('checked', 'true');
        } else {
          input.removeAttribute('checked');
        }
      }
      break;
    }
  }

  // Use XMLSerializer for safer serialization
  const serializer = new XMLSerializer();
  return serializer.serializeToString(doc.body).replace(/^<body[^>]*>|<\/body>$/g, '');
}

/**
 * Toggle a task item's checked state in content
 * Supports both Plate JSON and legacy HTML
 * Returns the updated content string
 */
export function toggleTaskInContent(
  content: string,
  taskText: string,
  newChecked: boolean
): string {
  // Try Plate JSON first
  if (isPlateJson(content)) {
    const parsed = parseJsonContent(content);
    if (parsed) {
      const updated = toggleTaskInPlateJson(parsed, taskText, newChecked);
      return serializePlateContent(updated);
    }
  }

  // Fall back to HTML
  return toggleTaskInHtml(content, taskText, newChecked);
}

/**
 * Plate element type for use in content arrays
 */
type PlateElement = {
  type: string;
  children: Descendant[];
  [key: string]: unknown;
};

/**
 * Create a Plate JSON todo item node
 * Uses the listStyleType: 'todo' format that Plate's list plugin renders
 * Includes indent: 1 which is required for the list plugin to render
 */
function createPlateTodoItem(text: string, checked: boolean = false): PlateElement {
  return {
    type: 'p',
    indent: 1,
    listStyleType: 'todo',
    checked,
    children: [{ text }],
  };
}

/**
 * Create a Plate JSON heading node
 */
function createPlateHeading(text: string, level: 'h1' | 'h2' | 'h3' = 'h2'): PlateElement {
  return {
    type: level,
    children: [{ text }],
  };
}

/**
 * Add a new task item to Plate JSON content under today's date header
 */
function addTaskToPlateJson(content: Value, taskText: string): Value {
  const today = format(new Date(), 'MMMM d, yyyy');
  const newTask = createPlateTodoItem(taskText, false);

  // Find today's header index
  let todayHeaderIndex = -1;
  let firstDateHeaderIndex = -1;

  for (let i = 0; i < content.length; i++) {
    const node = content[i];
    if ('type' in node && ['h1', 'h2', 'h3'].includes(node.type as string)) {
      if ('children' in node && Array.isArray(node.children)) {
        const text = extractTextFromChildren(node.children as Descendant[]).trim();
        if (text === today) {
          todayHeaderIndex = i;
          break;
        }
        if (isDateHeader(text) && firstDateHeaderIndex === -1) {
          firstDateHeaderIndex = i;
        }
      }
    }
  }

  if (todayHeaderIndex !== -1) {
    // Insert task after the header (find where tasks for this header end)
    let insertIndex = todayHeaderIndex + 1;
    while (insertIndex < content.length) {
      const node = content[insertIndex];
      // Stop if we hit another header
      if ('type' in node && ['h1', 'h2', 'h3'].includes(node.type as string)) {
        break;
      }
      insertIndex++;
    }
    // Insert at the beginning of today's section (right after header)
    return [
      ...content.slice(0, todayHeaderIndex + 1),
      newTask,
      ...content.slice(todayHeaderIndex + 1),
    ] as Value;
  } else {
    // Create today's header and insert at the beginning
    const todayHeader = createPlateHeading(today, 'h2');
    if (firstDateHeaderIndex !== -1) {
      // Insert before the first date header
      return [
        ...content.slice(0, firstDateHeaderIndex),
        todayHeader,
        newTask,
        ...content.slice(firstDateHeaderIndex),
      ] as Value;
    } else {
      // Insert at the beginning
      return [todayHeader, newTask, ...content] as Value;
    }
  }
}

/**
 * Add a new task item to HTML content under today's date header
 */
function addTaskToHtml(content: string, taskText: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content || '<p></p>', 'text/html');

  const today = format(new Date(), 'MMMM d, yyyy');

  // Find or create today's date header
  const headers = doc.querySelectorAll('h2');
  let todayHeader: Element | null = null;
  let insertBeforeElement: Element | null = null;

  for (const h2 of headers) {
    const text = h2.textContent?.trim() || '';
    if (text === today) {
      todayHeader = h2;
      break;
    }
    // Track first date header for insertion point
    if (isDateHeader(text) && !insertBeforeElement) {
      insertBeforeElement = h2;
    }
  }

  // Create the new task item using safe DOM methods
  const taskItem = createTaskItemElement(doc, taskText, false);

  if (todayHeader) {
    // Find the task list after this header, or create one
    let taskList = todayHeader.nextElementSibling;
    if (!taskList || taskList.getAttribute('data-type') !== 'taskList') {
      taskList = doc.createElement('ul');
      taskList.setAttribute('data-type', 'taskList');
      todayHeader.after(taskList);
    }
    // Insert at the beginning of the list (newest first)
    if (taskList.firstChild) {
      taskList.insertBefore(taskItem, taskList.firstChild);
    } else {
      taskList.appendChild(taskItem);
    }
  } else {
    // Create today's header and task list
    const newHeader = doc.createElement('h2');
    newHeader.textContent = today;

    const newTaskList = doc.createElement('ul');
    newTaskList.setAttribute('data-type', 'taskList');
    newTaskList.appendChild(taskItem);

    if (insertBeforeElement) {
      // Insert before the first date header (so today is at top)
      insertBeforeElement.before(newHeader, newTaskList);
    } else {
      // No existing headers, insert at beginning of body
      const firstChild = doc.body.firstChild;
      if (firstChild) {
        doc.body.insertBefore(newTaskList, firstChild);
        doc.body.insertBefore(newHeader, newTaskList);
      } else {
        doc.body.appendChild(newHeader);
        doc.body.appendChild(newTaskList);
      }
    }
  }

  // Use XMLSerializer for safer serialization
  const serializer = new XMLSerializer();
  return serializer.serializeToString(doc.body).replace(/^<body[^>]*>|<\/body>$/g, '');
}

/**
 * Add a new task item to content under today's date header
 * Creates the date header if it doesn't exist
 * Supports both Plate JSON and legacy HTML
 */
export function addTaskToContent(content: string, taskText: string): string {
  // If content is empty or not provided, create new Plate JSON content
  if (!content || !content.trim()) {
    const today = format(new Date(), 'MMMM d, yyyy');
    const initialContent: Value = [
      createPlateHeading(today, 'h2'),
      createPlateTodoItem(taskText, false),
    ];
    return serializePlateContent(initialContent);
  }

  // Try Plate JSON first
  if (isPlateJson(content)) {
    const parsed = parseJsonContent(content);
    if (parsed) {
      const updated = addTaskToPlateJson(parsed, taskText);
      return serializePlateContent(updated);
    }
  }

  // Convert HTML to Plate JSON, then add task
  // This ensures all saves are JSON format going forward
  try {
    const converted = htmlToPlateJson(content);
    if (converted && converted.length > 0) {
      const updated = addTaskToPlateJson(converted, taskText);
      return serializePlateContent(updated);
    }
  } catch (err) {
    console.warn('[parseTaskItems] Failed to convert HTML to JSON:', err);
  }

  // Last resort: use HTML fallback (should rarely happen)
  return addTaskToHtml(content, taskText);
}

/**
 * Get all incomplete tasks from multiple cards
 */
export function getIncompleteTasksFromCards(cards: Card[]): TaskItem[] {
  const allTasks: TaskItem[] = [];

  for (const card of cards) {
    if (card.deleted) continue;
    if (!card.tags?.includes('todo')) continue;

    const tasks = parseTaskItemsFromCard(card);
    const incomplete = tasks.filter((t) => !t.checked);
    allTasks.push(...incomplete);
  }

  // Sort by card update time (most recently updated first)
  return allTasks;
}

/**
 * Create initial todo note content with today's header
 * Returns Plate JSON format
 */
export function createInitialTodoContent(): string {
  const today = format(new Date(), 'MMMM d, yyyy');
  const initialContent: Value = [
    createPlateHeading(today, 'h2'),
    createPlateTodoItem('', false),
  ];
  return serializePlateContent(initialContent);
}
