/**
 * HTML to Plate Conversion Utilities
 *
 * Handles migration from HTML content to Plate JSON format.
 * Detects content type and converts on load.
 */

import type { Descendant, Value } from 'platejs';

/**
 * Plate element type for building content
 */
type PlateElement = {
  type: string;
  children: Descendant[];
  [key: string]: unknown;
};

type PlateText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
};

/**
 * Check if content is already Plate JSON format
 */
export function isPlateJson(content: unknown): content is Descendant[] {
  if (!content) return false;

  // If it's already an array with Plate node structure
  if (Array.isArray(content)) {
    return content.length > 0 && typeof content[0] === 'object' && 'type' in content[0];
  }

  // If it's a string, try to parse as JSON
  if (typeof content === 'string') {
    // Empty or whitespace-only string is not JSON
    if (!content.trim()) return false;

    // Check if it looks like JSON (starts with [ or {)
    const trimmed = content.trim();
    if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return false;

    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && 'type' in parsed[0];
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Parse content that might be JSON string into Value
 */
export function parseJsonContent(content: string | Descendant[]): Value | null {
  if (Array.isArray(content)) {
    return content as Value;
  }

  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0 && 'type' in parsed[0]) {
        return parsed as Value;
      }
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Check if content appears to be HTML
 */
export function isHtmlContent(content: string): boolean {
  if (!content || typeof content !== 'string') return false;

  const trimmed = content.trim();

  // Empty string is not HTML
  if (!trimmed) return false;

  // If it starts with < and contains closing tags, it's likely HTML
  if (trimmed.startsWith('<')) return true;

  // Check for common HTML tags
  return /<\/?[a-z][\s\S]*>/i.test(trimmed);
}

/**
 * Create empty Plate content (single paragraph with empty text)
 */
export function createEmptyPlateContent(): Value {
  return [
    {
      type: 'p',
      children: [{ text: '' }],
    },
  ] as Value;
}

/**
 * Serialize Plate content to JSON string for storage
 */
export function serializePlateContent(content: Descendant[]): Value {
  return content as Value;
}

export function stringifyPlateContent(content: Descendant[]): string {
  return JSON.stringify(content);
}

/**
 * Check if content has any meaningful value
 */
export function hasPlateContent(content: unknown): boolean {
  if (!content) return false;
  if (Array.isArray(content)) return content.length > 0;
  if (typeof content === 'string') return content.trim().length > 0;
  return false;
}

/**
 * Get plain text from Plate JSON, JSON string, or HTML string
 */
export function getContentText(content: unknown): string {
  if (!content) return '';
  if (Array.isArray(content)) {
    return extractPlateText(content as Value);
  }
  if (typeof content === 'string') {
    if (isPlateJson(content)) {
      const parsed = parseJsonContent(content);
      if (parsed) return extractPlateText(parsed);
    }
    return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return '';
}

/**
 * Extract plain text from Plate content for stats calculation
 */
export function extractPlateText(content: Value): string {
  const textParts: string[] = [];

  function traverse(node: Descendant) {
    // Text node
    if ('text' in node && typeof node.text === 'string') {
      textParts.push(node.text);
      return;
    }

    // Element node with children
    if ('children' in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        traverse(child as Descendant);
      }
    }
  }

  for (const node of content) {
    traverse(node);
  }

  return textParts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Count links in Plate content
 */
export function countPlateLinks(content: Value): number {
  let linkCount = 0;

  function traverse(node: Descendant) {
    // Check if this is a link element
    if ('type' in node && node.type === 'a') {
      linkCount++;
    }

    // Recurse into children
    if ('children' in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        traverse(child as Descendant);
      }
    }
  }

  for (const node of content) {
    traverse(node);
  }

  return linkCount;
}

/**
 * Get content stats from Plate JSON
 */
export function getPlateContentStats(content: Value): { words: number; chars: number; links: number } {
  if (!content || content.length === 0) {
    return { words: 0, chars: 0, links: 0 };
  }

  const text = extractPlateText(content);
  const words = text ? text.split(/\s+/).filter(w => w.length > 0).length : 0;
  const chars = text.length;
  const links = countPlateLinks(content);

  return { words, chars, links };
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Convert Plate JSON to HTML for preview rendering
 */
export function plateToHtml(content: Value): string {
  if (!content || content.length === 0) {
    return '';
  }

  function renderNode(node: Descendant): string {
    // Text node with marks
    if ('text' in node && typeof node.text === 'string') {
      let text = escapeHtml(node.text);
      if (!text) return '';

      // Apply marks
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const marks = node as any;
      if (marks.bold) text = `<strong>${text}</strong>`;
      if (marks.italic) text = `<em>${text}</em>`;
      if (marks.underline) text = `<u>${text}</u>`;
      if (marks.strikethrough) text = `<s>${text}</s>`;
      if (marks.code) text = `<code>${text}</code>`;
      if (marks.kbd) text = `<kbd>${text}</kbd>`;

      return text;
    }

    // Element node
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = node as any;
    const children = element.children
      ? element.children.map((child: Descendant) => renderNode(child)).join('')
      : '';

    switch (element.type) {
      // Headings
      case 'h1':
        return `<h1>${children}</h1>`;
      case 'h2':
        return `<h2>${children}</h2>`;
      case 'h3':
        return `<h3>${children}</h3>`;
      case 'h4':
        return `<h4>${children}</h4>`;
      case 'h5':
        return `<h5>${children}</h5>`;
      case 'h6':
        return `<h6>${children}</h6>`;

      // Paragraphs and basic blocks
      case 'p':
        // Check if this is a todo item (has listStyleType: 'todo')
        if (element.listStyleType === 'todo') {
          const isChecked = !!element.checked;
          const checkedAttr = isChecked ? 'checked' : '';
          const strikeStyle = isChecked ? ' style="text-decoration: line-through; opacity: 0.6;"' : '';
          return `<div data-type="taskItem" data-checked="${isChecked}"><input type="checkbox" ${checkedAttr} disabled /><span${strikeStyle}>${children}</span></div>`;
        }
        return `<p>${children}</p>`;
      case 'blockquote':
        return `<blockquote>${children}</blockquote>`;

      // Lists
      case 'ul':
        return `<ul>${children}</ul>`;
      case 'ol':
        return `<ol>${children}</ol>`;
      case 'li':
        return `<li>${children}</li>`;
      case 'lic':
        return children; // List item content, just return children

      // Code blocks
      case 'code_block':
        return `<pre><code>${children}</code></pre>`;
      case 'code_line':
        return `${children}\n`;

      // Links
      case 'a':
        return `<a href="${escapeHtml(element.url || '')}">${children}</a>`;

      // Mentions - include data attributes for Turndown rules
      case 'mention':
        const mentionType = element.mentionType || 'card';
        const mentionLabel = escapeHtml(element.value || '');
        return `<span data-pawkit-mention data-type="${mentionType}" data-label="${mentionLabel}">@${mentionLabel}</span>`;

      // Date - include data attribute for Turndown rules
      case 'date':
        const dateValue = escapeHtml(element.date || '');
        return `<span data-pawkit-mention data-type="date" data-label="${dateValue}">${dateValue}</span>`;

      // Horizontal rule
      case 'hr':
        return '<hr />';

      // Callout - include data attributes for Turndown rules
      case 'callout':
        const calloutType = element.variant || 'info';
        return `<div data-callout data-type="${calloutType}" class="callout callout-${calloutType}">${children}</div>`;

      // Toggle/collapsible
      case 'toggle':
        return `<details><summary>Toggle</summary>${children}</details>`;

      // Table elements
      case 'table':
        return `<table>${children}</table>`;
      case 'tr':
        return `<tr>${children}</tr>`;
      case 'th':
        return `<th>${children}</th>`;
      case 'td':
        return `<td>${children}</td>`;

      // Images
      case 'img':
        return `<img src="${escapeHtml(element.url || '')}" alt="${escapeHtml(element.alt || '')}" />`;

      // Task list - include data attributes for Turndown rules
      case 'action_item':
        const isChecked = !!element.checked;
        const checkedAttr = isChecked ? 'checked' : '';
        return `<li data-type="taskItem" data-checked="${isChecked}"><input type="checkbox" ${checkedAttr} disabled />${children}</li>`;

      // Default: just render children
      default:
        return children;
    }
  }

  return content.map(node => renderNode(node)).join('');
}

/**
 * Convert HTML string to Plate JSON format
 * Standalone function that doesn't require editor instance
 * Used for converting templates before they're stored
 */
export function htmlToPlateJson(html: string): Value {
  if (!html || !html.trim()) {
    return createEmptyPlateContent();
  }

  // If already JSON, return as-is
  if (isPlateJson(html)) {
    return parseJsonContent(html) || createEmptyPlateContent();
  }

  // Parse HTML using DOMParser
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const result: Descendant[] = [];

  // Process body children
  const children = doc.body.childNodes;
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    const converted = convertNode(node);
    if (converted) {
      if (Array.isArray(converted)) {
        result.push(...converted);
      } else {
        result.push(converted);
      }
    }
  }

  // Ensure we have at least one element
  if (result.length === 0) {
    return createEmptyPlateContent();
  }

  // Plate requires block elements at root level - wrap orphan text nodes in paragraphs
  const normalizedResult: Descendant[] = [];
  let currentTextNodes: Descendant[] = [];

  for (const node of result) {
    // Check if this is a text node (no 'type' property means it's a text node)
    if (!('type' in node) && 'text' in node) {
      currentTextNodes.push(node);
    } else {
      // If we have accumulated text nodes, wrap them in a paragraph first
      if (currentTextNodes.length > 0) {
        normalizedResult.push({
          type: 'p',
          children: currentTextNodes,
        });
        currentTextNodes = [];
      }
      normalizedResult.push(node);
    }
  }

  // Don't forget any trailing text nodes
  if (currentTextNodes.length > 0) {
    normalizedResult.push({
      type: 'p',
      children: currentTextNodes,
    });
  }

  // Final check - ensure we have at least one block
  if (normalizedResult.length === 0) {
    return createEmptyPlateContent();
  }

  return normalizedResult as Value;
}

/**
 * Convert a DOM node to Plate node(s)
 */
function convertNode(node: Node): Descendant | Descendant[] | null {
  // Text node
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    // Skip whitespace-only text nodes between elements
    if (!text.trim()) return null;
    return { text };
  }

  // Element node
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();

  switch (tagName) {
    // Headings
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return {
        type: tagName,
        children: convertChildren(element),
      };

    // Paragraph
    case 'p':
      return {
        type: 'p',
        children: convertChildren(element),
      };

    // Lists
    case 'ul':
      return convertList(element, 'ul');
    case 'ol':
      return convertList(element, 'ol');
    case 'li':
      return convertListItem(element);

    // Table elements
    case 'table':
      return convertTable(element);

    // Inline elements - return children with marks
    case 'strong':
    case 'b':
      return convertInlineWithMark(element, 'bold');
    case 'em':
    case 'i':
      return convertInlineWithMark(element, 'italic');
    case 'u':
      return convertInlineWithMark(element, 'underline');
    case 's':
    case 'strike':
    case 'del':
      return convertInlineWithMark(element, 'strikethrough');
    case 'code':
      return convertInlineWithMark(element, 'code');

    // Links
    case 'a':
      return {
        type: 'a',
        url: element.getAttribute('href') || '',
        children: convertChildren(element),
      };

    // Blockquote
    case 'blockquote':
      return {
        type: 'blockquote',
        children: convertChildren(element),
      };

    // Pre/code blocks
    case 'pre':
      return convertCodeBlock(element);

    // HR
    case 'hr':
      return {
        type: 'hr',
        children: [{ text: '' }],
      };

    // Div, span, tbody, thead - just process children
    case 'div':
    case 'span':
    case 'tbody':
    case 'thead':
    case 'tfoot':
      return convertChildrenAsNodes(element);

    // BR - return empty text with newline effect
    case 'br':
      return { text: '\n' };

    // Skip these wrapper elements but process children
    default:
      // Try to process children for unknown elements
      const childNodes = convertChildrenAsNodes(element);
      return childNodes.length > 0 ? childNodes : null;
  }
}

/**
 * Convert element children to Plate children array
 */
function convertChildren(element: Element): Descendant[] {
  const children: Descendant[] = [];

  for (let i = 0; i < element.childNodes.length; i++) {
    const child = element.childNodes[i];

    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || '';
      // Normalize whitespace but preserve some structure
      const normalized = text.replace(/\s+/g, ' ');
      if (normalized) {
        children.push({ text: normalized });
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const childElement = child as Element;
      const converted = convertInlineElement(childElement);
      if (converted) {
        if (Array.isArray(converted)) {
          children.push(...converted);
        } else {
          children.push(converted);
        }
      }
    }
  }

  // Ensure at least one child
  if (children.length === 0) {
    children.push({ text: '' });
  }

  return children;
}

/**
 * Convert inline elements (strong, em, a, etc.)
 */
function convertInlineElement(element: Element): Descendant | Descendant[] | null {
  const tagName = element.tagName.toLowerCase();

  switch (tagName) {
    case 'strong':
    case 'b':
      return applyMarkToChildren(element, 'bold');
    case 'em':
    case 'i':
      return applyMarkToChildren(element, 'italic');
    case 'u':
      return applyMarkToChildren(element, 'underline');
    case 's':
    case 'strike':
    case 'del':
      return applyMarkToChildren(element, 'strikethrough');
    case 'code':
      return applyMarkToChildren(element, 'code');
    case 'a':
      return {
        type: 'a',
        url: element.getAttribute('href') || '',
        children: convertChildren(element),
      };
    case 'br':
      return { text: '\n' };
    case 'span':
      // Just pass through children
      return convertChildrenFlat(element);
    default:
      // Unknown inline element, try to get text content
      const text = element.textContent || '';
      return text ? { text } : null;
  }
}

/**
 * Apply a mark to all text children of an element
 */
function applyMarkToChildren(element: Element, mark: string): Descendant[] {
  const result: Descendant[] = [];

  for (let i = 0; i < element.childNodes.length; i++) {
    const child = element.childNodes[i];

    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || '';
      if (text) {
        result.push({ text, [mark]: true } as PlateText);
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const converted = convertInlineElement(child as Element);
      if (converted) {
        // Apply mark to nested text nodes
        const nodes = Array.isArray(converted) ? converted : [converted];
        for (const node of nodes) {
          if ('text' in node) {
            result.push({ ...node, [mark]: true } as PlateText);
          } else {
            result.push(node);
          }
        }
      }
    }
  }

  return result.length > 0 ? result : [{ text: '', [mark]: true } as PlateText];
}

/**
 * Convert children to flat array of Descendant
 */
function convertChildrenFlat(element: Element): Descendant[] {
  const result: Descendant[] = [];

  for (let i = 0; i < element.childNodes.length; i++) {
    const child = element.childNodes[i];

    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || '';
      if (text) {
        result.push({ text });
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const converted = convertInlineElement(child as Element);
      if (converted) {
        if (Array.isArray(converted)) {
          result.push(...converted);
        } else {
          result.push(converted);
        }
      }
    }
  }

  return result;
}

/**
 * Convert children to block-level nodes
 */
function convertChildrenAsNodes(element: Element): Descendant[] {
  const result: Descendant[] = [];

  for (let i = 0; i < element.childNodes.length; i++) {
    const converted = convertNode(element.childNodes[i]);
    if (converted) {
      if (Array.isArray(converted)) {
        result.push(...converted);
      } else {
        result.push(converted);
      }
    }
  }

  return result;
}

/**
 * Convert inline element with a specific mark
 */
function convertInlineWithMark(element: Element, mark: string): Descendant[] {
  return applyMarkToChildren(element, mark);
}

/**
 * Convert UL/OL list
 */
function convertList(element: Element, listType: 'ul' | 'ol'): Descendant[] {
  const items: Descendant[] = [];

  for (let i = 0; i < element.children.length; i++) {
    const child = element.children[i];
    if (child.tagName.toLowerCase() === 'li') {
      const converted = convertListItem(child);
      if (converted) {
        if (Array.isArray(converted)) {
          items.push(...converted);
        } else {
          items.push(converted);
        }
      }
    }
  }

  return items;
}

/**
 * Convert LI element
 */
function convertListItem(element: Element): PlateElement | null {
  // Check if this is a task item
  const dataType = element.getAttribute('data-type');
  if (dataType === 'taskItem') {
    const checked = element.getAttribute('data-checked') === 'true';
    return {
      type: 'action_item',
      checked,
      children: convertChildren(element),
    };
  }

  // Regular list item
  return {
    type: 'li',
    children: [
      {
        type: 'lic',
        children: convertChildren(element),
      },
    ],
  };
}

/**
 * Convert table element
 */
function convertTable(element: Element): PlateElement {
  const rows: Descendant[] = [];

  // Find tbody or direct tr children
  const tbody = element.querySelector('tbody') || element;
  const trElements = tbody.querySelectorAll('tr');

  trElements.forEach((tr) => {
    const cells: Descendant[] = [];

    tr.querySelectorAll('td, th').forEach((cell) => {
      cells.push({
        type: cell.tagName.toLowerCase() === 'th' ? 'th' : 'td',
        children: convertChildren(cell),
      });
    });

    if (cells.length > 0) {
      rows.push({
        type: 'tr',
        children: cells,
      });
    }
  });

  return {
    type: 'table',
    children: rows.length > 0 ? rows : [{ type: 'tr', children: [{ type: 'td', children: [{ text: '' }] }] }],
  };
}

/**
 * Convert pre/code block
 */
function convertCodeBlock(element: Element): PlateElement {
  const code = element.querySelector('code');
  const text = code ? code.textContent || '' : element.textContent || '';

  const lines = text.split('\n').map((line) => ({
    type: 'code_line',
    children: [{ text: line }],
  }));

  return {
    type: 'code_block',
    children: lines.length > 0 ? lines : [{ type: 'code_line', children: [{ text: '' }] }],
  };
}
