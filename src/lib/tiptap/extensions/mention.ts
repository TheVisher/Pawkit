/**
 * Pawkit Mention Extension
 *
 * Extends Tiptap's mention extension for @ mentions of cards, Pawkits, and dates.
 * Creates squircle-styled pills with type-specific click behavior.
 * Uses ReactNodeViewRenderer for dynamic label updates.
 */

import { Mention } from '@tiptap/extension-mention';
import { mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import type { MentionOptions } from '@tiptap/extension-mention';
import { MentionNodeView } from './mention-node-view';

export type MentionType = 'card' | 'pawkit' | 'date';

export interface MentionNodeAttrs {
  id: string;
  label: string;
  type: MentionType;
  deleted?: boolean;
}

/**
 * Extended mention options for Pawkit
 */
export interface PawkitMentionOptions extends Partial<MentionOptions> {
  // Custom options can be added here
}

/**
 * Pawkit Mention Extension
 *
 * Usage:
 * ```typescript
 * PawkitMention.configure({
 *   suggestion: {
 *     items: ({ query }) => getMentionItems(query, workspaceId),
 *     render: () => mentionDropdownRenderer,
 *   },
 * })
 * ```
 */
export const PawkitMention = Mention.extend<PawkitMentionOptions>({
  name: 'pawkitMention',

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-id'),
        renderHTML: (attributes) => ({
          'data-id': attributes.id,
        }),
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-label'),
        renderHTML: (attributes) => ({
          'data-label': attributes.label,
        }),
      },
      type: {
        default: 'card',
        parseHTML: (element) => element.getAttribute('data-type') || 'card',
        renderHTML: (attributes) => ({
          'data-type': attributes.type,
        }),
      },
      deleted: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-deleted') === 'true',
        renderHTML: (attributes) => ({
          'data-deleted': attributes.deleted ? 'true' : undefined,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-pawkit-mention]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as MentionNodeAttrs;

    return [
      'span',
      mergeAttributes(
        {
          'data-pawkit-mention': '',
          class: `mention-pill mention-pill-${attrs.type}${attrs.deleted ? ' mention-deleted' : ''}`,
        },
        HTMLAttributes
      ),
      `@${attrs.label}`,
    ];
  },

  addKeyboardShortcuts() {
    return {
      // No custom keyboard shortcuts for now
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(MentionNodeView, {
      // Render inline with text
      as: 'span',
    });
  },
});

export default PawkitMention;
