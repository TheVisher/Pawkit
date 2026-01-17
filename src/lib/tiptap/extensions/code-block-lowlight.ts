/**
 * Code Block with Syntax Highlighting Extension
 *
 * Extends Tiptap's code block with syntax highlighting using lowlight (highlight.js).
 * Supports common programming languages with automatic language detection.
 */

import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';

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
 * Usage:
 * ```typescript
 * PawkitCodeBlock.configure({
 *   lowlight,
 *   defaultLanguage: 'javascript',
 * })
 * ```
 */
export const PawkitCodeBlock = CodeBlockLowlight.configure({
  lowlight,
  defaultLanguage: 'plaintext',
  HTMLAttributes: {
    class: 'hljs',
  },
});

export default PawkitCodeBlock;
