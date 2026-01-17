'use client';

/**
 * Code Block NodeView Component
 *
 * Renders code blocks with syntax highlighting, a copy-to-clipboard button,
 * and a language selector dropdown.
 */

import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useState, useCallback } from 'react';
import { Copy, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Available languages in the lowlight common bundle.
 * Displayed in a curated order with the most common languages first.
 */
const AVAILABLE_LANGUAGES = [
  { value: 'plaintext', label: 'Plain Text' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'css', label: 'CSS' },
  { value: 'html', label: 'HTML' },
  { value: 'json', label: 'JSON' },
  { value: 'bash', label: 'Bash' },
  { value: 'shell', label: 'Shell' },
  { value: 'sql', label: 'SQL' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'yaml', label: 'YAML' },
  { value: 'xml', label: 'XML' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'php', label: 'PHP' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'graphql', label: 'GraphQL' },
  { value: 'scss', label: 'SCSS' },
  { value: 'less', label: 'Less' },
  { value: 'lua', label: 'Lua' },
  { value: 'perl', label: 'Perl' },
  { value: 'r', label: 'R' },
  { value: 'diff', label: 'Diff' },
  { value: 'makefile', label: 'Makefile' },
  { value: 'ini', label: 'INI' },
  { value: 'objectivec', label: 'Objective-C' },
  { value: 'arduino', label: 'Arduino' },
  { value: 'vbnet', label: 'VB.NET' },
  { value: 'wasm', label: 'WebAssembly' },
] as const;

export function CodeBlockNodeView({ node, updateAttributes }: NodeViewProps) {
  const [copied, setCopied] = useState(false);
  const language = (node.attrs.language as string | null) || 'plaintext';

  const copyToClipboard = useCallback(async () => {
    // Get the text content from the node
    const text = node.textContent;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      // Reset after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  }, [node.textContent]);

  const handleLanguageChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value;
    updateAttributes({ language: newLanguage });
  }, [updateAttributes]);

  return (
    <NodeViewWrapper className="code-block-wrapper">
      <div className="code-block-container group relative">
        {/* Language selector dropdown */}
        <div className="code-block-language-selector">
          <select
            value={language}
            onChange={handleLanguageChange}
            className="code-block-language-select"
            title="Select language"
            aria-label="Code block language"
          >
            {AVAILABLE_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
          <ChevronDown className="code-block-language-chevron" />
        </div>

        {/* Copy button - appears on hover */}
        <button
          type="button"
          onClick={copyToClipboard}
          className={cn(
            'code-block-copy-btn',
            'absolute top-2 right-2 z-10',
            'p-1.5 rounded-md',
            'transition-all duration-150',
            'opacity-0 group-hover:opacity-100',
            'focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1',
            copied
              ? 'bg-green-500/20 text-green-400'
              : 'bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
            'backdrop-blur-sm'
          )}
          title={copied ? 'Copied!' : 'Copy code'}
          aria-label={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>

        {/* Code content with syntax highlighting */}
        <pre className="hljs" data-language={language || 'plaintext'}>
          <NodeViewContent className="hljs code-content" />
        </pre>
      </div>

      {/* Styles for the code block */}
      <style jsx global>{`
        /* Code block container */
        .code-block-wrapper {
          margin: 0.5rem 0;
        }

        .code-block-container {
          position: relative;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 0.5rem;
          overflow: hidden;
        }

        .code-block-container pre {
          margin: 0;
          padding: 0.75rem 1rem;
          padding-right: 3rem; /* Space for copy button */
          overflow-x: auto;
          font-family: var(--font-mono);
          font-size: 0.875rem;
          line-height: 1.5;
          background: transparent !important;
          border: none !important;
        }

        .code-block-container pre code,
        .code-block-container pre .code-content {
          background: none !important;
          padding: 0 !important;
          border-radius: 0 !important;
          font-family: var(--font-mono);
          font-size: inherit;
          line-height: inherit;
          display: block;
          white-space: pre;
        }

        /* NodeViewContent renders as a div, style it like code */
        .code-block-container pre .code-content code {
          display: block;
          background: none !important;
          padding: 0 !important;
        }

        /* Language selector dropdown */
        .code-block-language-selector {
          position: absolute;
          top: 0.375rem;
          left: 0.5rem;
          z-index: 10;
          display: flex;
          align-items: center;
        }

        .code-block-language-select {
          appearance: none;
          background: transparent;
          border: none;
          padding: 0.125rem 1.25rem 0.125rem 0.375rem;
          font-size: 0.625rem;
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
          cursor: pointer;
          border-radius: 0.25rem;
          transition: all 0.15s ease;
          outline: none;
        }

        .code-block-language-select:hover {
          background: var(--glass-bg-hover);
          color: var(--color-text-primary);
        }

        .code-block-language-select:focus {
          background: var(--glass-bg-hover);
          color: var(--color-text-primary);
          box-shadow: 0 0 0 2px var(--color-accent);
        }

        .code-block-language-select option {
          background: var(--color-bg-primary);
          color: var(--color-text-primary);
          font-size: 0.75rem;
          padding: 0.5rem;
        }

        .code-block-language-chevron {
          position: absolute;
          right: 0.25rem;
          top: 50%;
          transform: translateY(-50%);
          width: 0.75rem;
          height: 0.75rem;
          color: var(--color-text-muted);
          pointer-events: none;
          opacity: 0.7;
        }

        .code-block-language-selector:hover .code-block-language-chevron {
          color: var(--color-text-primary);
          opacity: 1;
        }

        /* Add padding to the code to accommodate the language selector */
        .code-block-container pre {
          padding-top: 1.75rem !important;
        }

        /* Copy button base styles */
        .code-block-copy-btn {
          border: 1px solid var(--glass-border);
        }

        .code-block-copy-btn:hover {
          border-color: var(--glass-border-hover);
        }

        /* Syntax highlighting theme integration */
        .code-block-container .hljs {
          color: var(--color-text-primary);
          background: transparent;
        }

        /* Ensure placeholder works in code blocks */
        .code-block-container pre code.is-empty::before,
        .code-block-container pre .code-content code.is-empty::before {
          color: var(--color-text-muted);
          content: 'Write code...';
          float: left;
          height: 0;
          pointer-events: none;
        }

        /* Light mode adjustments */
        .light .code-block-container {
          background: hsl(0 0% 0% / 0.03);
        }

        /* High contrast mode adjustments */
        html.visual-style-high-contrast .code-block-container {
          border-width: 2px;
        }

        html.visual-style-high-contrast .code-block-copy-btn {
          opacity: 0.7;
        }

        html.visual-style-high-contrast .code-block-copy-btn:hover,
        html.visual-style-high-contrast .code-block-copy-btn:focus {
          opacity: 1;
        }
      `}</style>
    </NodeViewWrapper>
  );
}

export default CodeBlockNodeView;
