/**
 * HTML to Plate Conversion Utilities
 *
 * Handles migration from HTML content (Tiptap) to Plate JSON format.
 * Detects content type and converts on load.
 */

import type { Descendant, Value } from 'platejs';

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
export function serializePlateContent(content: Descendant[]): string {
  return JSON.stringify(content);
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

      // Mentions
      case 'mention':
        return `<span class="mention">@${escapeHtml(element.value || '')}</span>`;

      // Date
      case 'date':
        return `<span class="date">${escapeHtml(element.date || '')}</span>`;

      // Horizontal rule
      case 'hr':
        return '<hr />';

      // Callout
      case 'callout':
        return `<div class="callout callout-${element.variant || 'info'}">${children}</div>`;

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

      // Task list
      case 'action_item':
        const checked = element.checked ? 'checked' : '';
        return `<li class="task-item"><input type="checkbox" ${checked} disabled />${children}</li>`;

      // Default: just render children
      default:
        return children;
    }
  }

  return content.map(node => renderNode(node)).join('');
}
