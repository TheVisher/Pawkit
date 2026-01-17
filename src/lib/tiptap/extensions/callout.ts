/**
 * Callout Extension
 *
 * Creates admonition/callout blocks with different types (info, warning, tip, danger, note).
 * Supports editable content and type switching via NodeView.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CalloutNodeView } from './callout-node-view';

export type CalloutType = 'info' | 'warning' | 'tip' | 'danger' | 'note';

export interface CalloutOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      /**
       * Insert a callout block
       */
      setCallout: (type?: CalloutType) => ReturnType;
      /**
       * Toggle callout type
       */
      toggleCalloutType: (type: CalloutType) => ReturnType;
    };
  }
}

export const Callout = Node.create<CalloutOptions>({
  name: 'callout',

  group: 'block',

  content: 'block+',

  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: (element) => element.getAttribute('data-type') || 'info',
        renderHTML: (attributes) => ({
          'data-type': attributes.type,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-callout]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const type = node.attrs.type as CalloutType;

    return [
      'div',
      mergeAttributes(
        {
          'data-callout': '',
          class: `callout callout-${type}`,
        },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      0, // Content goes here
    ];
  },

  addCommands() {
    return {
      setCallout:
        (type: CalloutType = 'info') =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { type },
            content: [
              {
                type: 'paragraph',
              },
            ],
          });
        },
      toggleCalloutType:
        (type: CalloutType) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { type });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeView);
  },

  addKeyboardShortcuts() {
    return {
      // Exit callout on Mod+Enter
      'Mod-Enter': () => {
        const { $from } = this.editor.state.selection;
        // Check if we're inside a callout
        for (let d = $from.depth; d > 0; d--) {
          if ($from.node(d).type.name === this.name) {
            // Insert a paragraph after the callout
            return this.editor
              .chain()
              .focus()
              .insertContentAt($from.end(d) + 1, { type: 'paragraph' })
              .run();
          }
        }
        return false;
      },
    };
  },
});

export default Callout;
