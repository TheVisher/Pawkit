/**
 * Code Block with Syntax Highlighting Extension
 *
 * Extends Tiptap's code block with syntax highlighting using lowlight (highlight.js).
 * Supports common programming languages with automatic language detection.
 * Includes a copy-to-clipboard button that appears on hover.
 */

import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { createLowlight, common } from 'lowlight';
import { CodeBlockNodeView } from './code-block-node-view';

// Create a lowlight instance with common languages
const lowlight = createLowlight(common);

// Import additional languages if needed
// import typescript from 'highlight.js/lib/languages/typescript';
// import python from 'highlight.js/lib/languages/python';
// lowlight.register('typescript', typescript);
// lowlight.register('python', python);

/**
 * Pawkit Code Block Extension
 *
 * Features:
 * - Syntax highlighting via lowlight/highlight.js
 * - Copy-to-clipboard button on hover
 * - Language badge display
 * - Dark/light mode support
 *
 * Usage:
 * ```typescript
 * // Already configured, just import and add to extensions array
 * import { PawkitCodeBlock } from '@/lib/tiptap/extensions/code-block-lowlight';
 *
 * const editor = useEditor({
 *   extensions: [
 *     StarterKit.configure({ codeBlock: false }), // Disable default
 *     PawkitCodeBlock,
 *   ],
 * });
 * ```
 */
export const PawkitCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockNodeView);
  },
}).configure({
  lowlight,
  defaultLanguage: 'plaintext',
  HTMLAttributes: {
    class: 'hljs',
  },
});

export default PawkitCodeBlock;
