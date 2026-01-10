'use client';

/**
 * Mention Suggestion Renderer
 *
 * Manages the lifecycle of the mention dropdown for Tiptap's suggestion system.
 */

import { ReactRenderer } from '@tiptap/react';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import { MentionDropdown, type MentionDropdownRef } from './mention-dropdown';
import type { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import type { MentionItem } from '@/lib/hooks/use-mention-search';

export interface MentionSuggestionOptions {
  workspaceId: string | undefined;
}

/**
 * Create a suggestion renderer for the mention extension
 */
export function createMentionSuggestion(
  options: MentionSuggestionOptions
): Partial<SuggestionOptions<MentionItem>> {
  return {
    char: '@',
    allowSpaces: true, // Allow spaces for natural language date parsing

    items: ({ query }) => {
      // Return empty array - actual items are fetched in the dropdown component
      // This is just to trigger the suggestion system
      return [];
    },

    // Custom command to ensure all attributes (including type) are passed to the node
    command: ({ editor, range, props }) => {
      // Delete the @ trigger and insert the mention node with all attributes
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent([
          {
            type: 'pawkitMention',
            attrs: {
              id: props.id,
              label: props.label,
              type: props.type,
            },
          },
          {
            type: 'text',
            text: ' ',
          },
        ])
        .run();
    },

    render: () => {
      let component: ReactRenderer<MentionDropdownRef> | null = null;
      let popup: TippyInstance | null = null;

      return {
        onStart: (props: SuggestionProps<MentionItem>) => {
          component = new ReactRenderer(MentionDropdown, {
            props: {
              query: props.query,
              workspaceId: options.workspaceId,
              onSelect: (item: MentionItem) => {
                props.command({
                  id: item.id,
                  label: item.label,
                  type: item.type,
                });
              },
              clientRect: props.clientRect,
            },
            editor: props.editor,
          });

          if (!props.clientRect) return;

          // Create a wrapper that handles null from clientRect
          const getRect = () => props.clientRect?.() ?? new DOMRect();

          popup = tippy(document.body, {
            getReferenceClientRect: getRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
            // Flip to top if not enough space below
            popperOptions: {
              modifiers: [
                {
                  name: 'flip',
                  options: {
                    fallbackPlacements: ['top-start', 'bottom-end', 'top-end'],
                  },
                },
                {
                  name: 'preventOverflow',
                  options: {
                    boundary: 'viewport',
                    padding: 8,
                  },
                },
              ],
            },
            maxWidth: 'none',
            offset: [0, 8],
            zIndex: 50,
            // Style the tippy container to be invisible (we style the dropdown)
            arrow: false,
            theme: 'transparent',
          });
        },

        onUpdate: (props: SuggestionProps<MentionItem>) => {
          component?.updateProps({
            query: props.query,
            workspaceId: options.workspaceId,
            onSelect: (item: MentionItem) => {
              props.command({
                id: item.id,
                label: item.label,
                type: item.type,
              });
            },
            clientRect: props.clientRect,
          });

          if (!props.clientRect || !popup) return;

          // Create a wrapper that handles null from clientRect
          const getRect = () => props.clientRect?.() ?? new DOMRect();

          popup.setProps({
            getReferenceClientRect: getRect,
          });
        },

        onKeyDown: (props: { event: KeyboardEvent }) => {
          if (props.event.key === 'Escape') {
            popup?.hide();
            return true;
          }

          return component?.ref?.onKeyDown(props.event) ?? false;
        },

        onExit: () => {
          popup?.destroy();
          component?.destroy();
        },
      };
    },
  };
}

export default createMentionSuggestion;
