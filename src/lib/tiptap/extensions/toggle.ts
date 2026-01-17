/**
 * Toggle Extension
 *
 * Creates collapsible/expandable toggle blocks with editable summary/header.
 * Content is hidden when collapsed, shown when expanded.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ToggleNodeView } from './toggle-node-view';

export interface ToggleOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    toggle: {
      /**
       * Insert a toggle block
       */
      setToggle: (options?: { summary?: string; open?: boolean }) => ReturnType;
      /**
       * Toggle the open state
       */
      toggleOpen: () => ReturnType;
    };
  }
}

export const Toggle = Node.create<ToggleOptions>({
  name: 'toggle',

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
      open: {
        default: true,
        parseHTML: (element) => {
          const open = element.getAttribute('data-open');
          return open === 'true' || open === null; // Default to true if not specified
        },
        renderHTML: (attributes) => ({
          'data-open': attributes.open ? 'true' : 'false',
        }),
      },
      summary: {
        default: 'Toggle',
        parseHTML: (element) => element.getAttribute('data-summary') || 'Toggle',
        renderHTML: (attributes) => ({
          'data-summary': attributes.summary,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-toggle]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        {
          'data-toggle': '',
          class: 'toggle',
        },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      0, // Content goes here
    ];
  },

  addCommands() {
    return {
      setToggle:
        (options = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              summary: options.summary || 'Toggle',
              open: options.open !== undefined ? options.open : true,
            },
            content: [
              {
                type: 'paragraph',
              },
            ],
          });
        },
      toggleOpen:
        () =>
        ({ commands, state }) => {
          const { $from } = state.selection;
          // Find the toggle node
          for (let d = $from.depth; d > 0; d--) {
            if ($from.node(d).type.name === this.name) {
              const currentOpen = $from.node(d).attrs.open;
              return commands.updateAttributes(this.name, { open: !currentOpen });
            }
          }
          return false;
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleNodeView);
  },

  addKeyboardShortcuts() {
    return {
      // Exit toggle on Mod+Enter
      'Mod-Enter': () => {
        const { $from } = this.editor.state.selection;
        // Check if we're inside a toggle
        for (let d = $from.depth; d > 0; d--) {
          if ($from.node(d).type.name === this.name) {
            // Insert a paragraph after the toggle
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

export default Toggle;
