/**
 * Markdown Export Utilities
 *
 * Converts HTML content to Markdown format.
 * Supports Pawkit-specific nodes like callouts, mentions, and toggle blocks.
 *
 * Uses Turndown for HTML to Markdown conversion with custom rules for:
 * - Callouts -> Obsidian-style `> [!type]` format
 * - Code blocks -> fenced with language
 * - Mentions -> plain text or [[wiki-link]] format
 * - Toggle blocks -> collapsible sections
 */

import TurndownService from 'turndown';

// Create a configured Turndown instance
function createTurndownService(): TurndownService {
  const turndownService = new TurndownService({
    headingStyle: 'atx', // Use # for headings
    codeBlockStyle: 'fenced', // Use ``` for code blocks
    bulletListMarker: '-', // Use - for bullet lists
    emDelimiter: '*', // Use * for emphasis
    strongDelimiter: '**', // Use ** for bold
    hr: '---', // Use --- for horizontal rules
  });

  // Custom rule for callouts -> Obsidian-style format
  // <div data-callout data-type="info">content</div>
  // -> > [!info]
  //    > content
  turndownService.addRule('callout', {
    filter: (node) => {
      return (
        node.nodeName === 'DIV' &&
        node.hasAttribute('data-callout')
      );
    },
    replacement: (content, node) => {
      const element = node as HTMLElement;
      const type = element.getAttribute('data-type') || 'note';
      // Trim content and indent each line with >
      const trimmedContent = content.trim();
      const indentedContent = trimmedContent
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
      return `\n> [!${type}]\n${indentedContent}\n\n`;
    },
  });

  // Custom rule for code blocks with language
  // <pre><code class="language-javascript">code</code></pre>
  // -> ```javascript
  //    code
  //    ```
  turndownService.addRule('codeBlockWithLanguage', {
    filter: (node) => {
      return (
        node.nodeName === 'PRE' &&
        node.firstChild !== null &&
        node.firstChild.nodeName === 'CODE'
      );
    },
    replacement: (content, node) => {
      const element = node as HTMLElement;
      const codeElement = element.querySelector('code');
      if (!codeElement) return `\n\`\`\`\n${content}\n\`\`\`\n`;

      // Extract language from class name (e.g., "language-javascript" or "hljs language-typescript")
      const className = codeElement.className || '';
      const languageMatch = className.match(/(?:language-|hljs\s+language-)(\w+)/);
      const language = languageMatch ? languageMatch[1] : '';

      // Get the actual text content, preserving whitespace
      const codeContent = codeElement.textContent || '';

      return `\n\`\`\`${language}\n${codeContent}\n\`\`\`\n`;
    },
  });

  // Custom rule for mentions -> plain text or [[wiki-link]] format
  // <span data-pawkit-mention data-type="card" data-label="My Card">@My Card</span>
  // -> @My Card (plain text) or [[My Card]] (wiki-link)
  turndownService.addRule('mention', {
    filter: (node) => {
      return (
        node.nodeName === 'SPAN' &&
        node.hasAttribute('data-pawkit-mention')
      );
    },
    replacement: (content, node) => {
      const element = node as HTMLElement;
      const label = element.getAttribute('data-label') || content;
      const type = element.getAttribute('data-type') || 'card';

      // For cards and pawkits, use wiki-link format
      // For dates, just use plain text
      if (type === 'date') {
        return label;
      }
      return `[[${label}]]`;
    },
  });

  // Custom rule for toggle/collapsible sections
  // <details><summary>Title</summary>content</details>
  // -> <details>
  //    <summary>Title</summary>
  //    content
  //    </details>
  // Note: Keep HTML for toggles since Markdown doesn't have native collapsible support
  turndownService.addRule('toggle', {
    filter: 'details',
    replacement: (content, node) => {
      const element = node as HTMLElement;
      const summary = element.querySelector('summary');
      const summaryText = summary ? summary.textContent || 'Toggle' : 'Toggle';

      // Remove the summary from content since we handle it separately
      const contentWithoutSummary = content.replace(summaryText, '').trim();

      return `\n<details>\n<summary>${summaryText}</summary>\n\n${contentWithoutSummary}\n\n</details>\n`;
    },
  });

  // Custom rule for task list items
  // <li data-checked="true">content</li>
  // -> - [x] content
  turndownService.addRule('taskListItem', {
    filter: (node) => {
      return (
        node.nodeName === 'LI' &&
        node.hasAttribute('data-checked')
      );
    },
    replacement: (content, node) => {
      const element = node as HTMLElement;
      const isChecked = element.getAttribute('data-checked') === 'true';
      const checkbox = isChecked ? '[x]' : '[ ]';
      return `- ${checkbox} ${content.trim()}\n`;
    },
  });

  // Custom rule for highlight marks
  // <mark>highlighted text</mark>
  // -> ==highlighted text== (some Markdown flavors support this)
  turndownService.addRule('highlight', {
    filter: 'mark',
    replacement: (content) => {
      return `==${content}==`;
    },
  });

  // Custom rule for images
  turndownService.addRule('image', {
    filter: 'img',
    replacement: (content, node) => {
      const element = node as HTMLImageElement;
      const alt = element.alt || '';
      const src = element.src || '';
      const title = element.title ? ` "${element.title}"` : '';
      return `![${alt}](${src}${title})`;
    },
  });

  // Custom rule for tables
  turndownService.addRule('table', {
    filter: 'table',
    replacement: (content, node) => {
      const element = node as HTMLTableElement;
      const rows = element.querySelectorAll('tr');
      if (rows.length === 0) return content;

      let markdown = '\n';
      let headerProcessed = false;

      rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('th, td');
        const cellContents: string[] = [];

        cells.forEach((cell) => {
          // Get text content, replacing newlines with spaces
          const text = (cell.textContent || '').replace(/\n/g, ' ').trim();
          cellContents.push(text);
        });

        markdown += `| ${cellContents.join(' | ')} |\n`;

        // Add separator after first row (header)
        if (rowIndex === 0 && !headerProcessed) {
          const separator = cellContents.map(() => '---').join(' | ');
          markdown += `| ${separator} |\n`;
          headerProcessed = true;
        }
      });

      return markdown + '\n';
    },
  });

  return turndownService;
}

// Singleton instance
let turndownInstance: TurndownService | null = null;

function getTurndownService(): TurndownService {
  if (!turndownInstance) {
    turndownInstance = createTurndownService();
  }
  return turndownInstance;
}

/**
 * Convert HTML content to Markdown
 * @param html - HTML string
 * @returns Markdown formatted string
 */
export function htmlToMarkdown(html: string): string {
  const turndown = getTurndownService();
  return turndown.turndown(html);
}

/**
 * Copy HTML content as Markdown to clipboard
 * @param html - HTML string
 * @returns Promise that resolves when copy is complete
 */
export async function copyHtmlAsMarkdown(html: string): Promise<void> {
  const markdown = htmlToMarkdown(html);
  await navigator.clipboard.writeText(markdown);
}

/**
 * Download HTML content as a Markdown file
 * @param html - HTML string
 * @param filename - Filename without extension
 */
export function downloadHtmlAsMarkdown(html: string, filename: string): void {
  const markdown = htmlToMarkdown(html);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  // Sanitize filename - remove invalid characters
  const sanitizedFilename = filename
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 200); // Limit length
  link.download = `${sanitizedFilename || 'export'}.md`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
