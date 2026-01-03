/**
 * Task Item Parsing Utilities
 * Extract and manipulate task items from Tiptap HTML content
 */

import type { LocalCard } from '@/lib/db';
import { format } from 'date-fns';

export interface TaskItem {
  id: string;           // Unique identifier (cardId-index)
  text: string;         // Task text content
  checked: boolean;     // Completion status
  cardId: string;       // Parent card ID
  cardTitle: string;    // Parent card title for context
  dateHeader?: string;  // Date header if task is under one
}

/**
 * Parse task items from a card's HTML content
 */
export function parseTaskItemsFromCard(card: LocalCard): TaskItem[] {
  if (!card.content) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(card.content, 'text/html');
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
          id: `${card.id}-${items.length}`,
          text,
          checked: el.getAttribute('data-checked') === 'true',
          cardId: card.id,
          cardTitle: card.title || 'Untitled Todo',
          dateHeader: currentDateHeader,
        });
      }
    }
  });

  return items;
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
function isDateHeader(text: string): boolean {
  // Match common date formats or "Someday"
  if (text.toLowerCase() === 'someday') return true;
  // Match "Month Day, Year" format
  const datePattern = /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}$/i;
  return datePattern.test(text);
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
 * Toggle a task item's checked state in HTML content
 * Returns the updated HTML string
 */
export function toggleTaskInContent(
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
 * Add a new task item to content under today's date header
 * Creates the date header if it doesn't exist
 */
export function addTaskToContent(content: string, taskText: string): string {
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
 * Get all incomplete tasks from multiple cards
 */
export function getIncompleteTasksFromCards(cards: LocalCard[]): TaskItem[] {
  const allTasks: TaskItem[] = [];

  for (const card of cards) {
    if (card._deleted) continue;
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
 */
export function createInitialTodoContent(): string {
  const today = format(new Date(), 'MMMM d, yyyy');
  // Create using DOM for safety
  const doc = new DOMParser().parseFromString('<body></body>', 'text/html');

  const header = doc.createElement('h2');
  header.textContent = today;

  const taskList = doc.createElement('ul');
  taskList.setAttribute('data-type', 'taskList');

  const emptyTask = createTaskItemElement(doc, '', false);
  taskList.appendChild(emptyTask);

  doc.body.appendChild(header);
  doc.body.appendChild(taskList);

  const serializer = new XMLSerializer();
  return serializer.serializeToString(doc.body).replace(/^<body[^>]*>|<\/body>$/g, '');
}
