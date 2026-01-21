/**
 * Plate JSON Template Builders
 *
 * Helper functions for creating Plate JSON nodes directly,
 * avoiding HTML intermediates for supertag templates.
 */

import type { Descendant, Value } from 'platejs';

// =============================================================================
// TYPES
// =============================================================================

type PlateText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
};

type PlateElement = {
  type: string;
  children: Descendant[];
  [key: string]: unknown;
};

// =============================================================================
// TEXT HELPERS
// =============================================================================

/**
 * Create a plain text node
 */
export function text(content: string): PlateText {
  return { text: content };
}

/**
 * Create a bold text node
 */
export function bold(content: string): PlateText {
  return { text: content, bold: true };
}

/**
 * Create an italic text node
 */
export function italic(content: string): PlateText {
  return { text: content, italic: true };
}

// =============================================================================
// BLOCK HELPERS
// =============================================================================

/**
 * Create a paragraph element
 */
export function p(...children: (PlateText | PlateElement)[]): PlateElement {
  return {
    type: 'p',
    children: children.length > 0 ? children : [text('')],
  };
}

/**
 * Create a blockquote element
 */
export function blockquote(...children: PlateElement[]): PlateElement {
  return {
    type: 'blockquote',
    children: children.length > 0 ? children : [p()],
  };
}

/**
 * Create an h2 heading element
 */
export function h2(content: string): PlateElement {
  return {
    type: 'h2',
    children: [text(content)],
  };
}

/**
 * Create an h3 heading element
 */
export function h3(content: string): PlateElement {
  return {
    type: 'h3',
    children: [text(content)],
  };
}

// =============================================================================
// LIST HELPERS
// =============================================================================

/**
 * Create a list item with "Label:" value format
 * @param label - The field label (will be bold)
 * @param placeholder - Optional placeholder text after the colon
 */
export function fieldItem(label: string, placeholder: string = ''): PlateElement {
  return {
    type: 'li',
    children: [
      {
        type: 'lic',
        children: [bold(`${label}:`), text(` ${placeholder}`)],
      },
    ],
  };
}

/**
 * Create an empty list item
 */
export function emptyItem(): PlateElement {
  return {
    type: 'li',
    children: [
      {
        type: 'lic',
        children: [text('')],
      },
    ],
  };
}

/**
 * Create a task/todo item with checkbox
 * Uses Plate's listStyleType: 'todo' pattern for proper checkbox rendering
 * Includes indent: 1 which is required for the list plugin to render
 * @param checked - Whether the task is checked
 * @param content - Optional text content
 */
export function taskItem(checked: boolean = false, content: string = ''): PlateElement {
  return {
    type: 'p',
    indent: 1,
    listStyleType: 'todo',
    checked,
    children: [text(content)],
  };
}

// =============================================================================
// TABLE HELPERS
// =============================================================================

/**
 * Create a table row with label and value cells
 * @param label - The field label (will be bold)
 * @param placeholder - Optional placeholder text
 */
export function tableFieldRow(label: string, placeholder: string = ''): PlateElement {
  return {
    type: 'tr',
    children: [
      {
        type: 'td',
        children: [bold(label)],
      },
      {
        type: 'td',
        children: [text(placeholder)],
      },
    ],
  };
}

/**
 * Create a table element
 */
export function table(...rows: PlateElement[]): PlateElement {
  return {
    type: 'table',
    children: rows.length > 0 ? rows : [tableFieldRow('', '')],
  };
}

// =============================================================================
// SECTION BUILDERS
// =============================================================================

/**
 * Create a section with heading and field list
 * @param heading - Section heading text
 * @param fields - Array of [label, placeholder] tuples
 */
export function listSection(heading: string, fields: [string, string][]): Descendant[] {
  const items = fields.map(([label, placeholder]) => fieldItem(label, placeholder));
  return [
    h2(heading),
    ...items,
  ];
}

/**
 * Create a section with heading and table
 * @param heading - Section heading text
 * @param fields - Array of [label, placeholder] tuples
 */
export function tableSection(heading: string, fields: [string, string][]): Descendant[] {
  const rows = fields.map(([label, placeholder]) => tableFieldRow(label, placeholder));
  return [
    h2(heading),
    table(...rows),
  ];
}

/**
 * Create a section with heading and task list
 * @param heading - Section heading text
 * @param taskCount - Number of empty task items to create
 */
export function taskSection(heading: string, taskCount: number = 1): Descendant[] {
  const items = Array.from({ length: taskCount }, () => taskItem(false, ''));
  return [
    h2(heading),
    ...items,
  ];
}

/**
 * Create a notes section (heading + empty paragraph)
 */
export function notesSection(): Descendant[] {
  return [
    h2('Notes'),
    p(),
  ];
}

// =============================================================================
// TEMPLATE COMPOSITION
// =============================================================================

/**
 * Combine multiple sections into a complete template
 */
export function buildTemplate(...sections: Descendant[][]): Value {
  return sections.flat() as Value;
}

/**
 * Serialize a template to JSON string for storage
 */
export function serializeTemplate(template: Value): string {
  return JSON.stringify(template);
}
