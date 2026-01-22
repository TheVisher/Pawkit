'use client';

import { DndPlugin } from '@platejs/dnd';
import { PlaceholderPlugin } from '@platejs/media/react';

import { BlockDraggable } from '@/components/ui/block-draggable';

/**
 * Plate DnD plugin configuration.
 *
 * NOTE: The react-dnd DndProvider is now in PlateDndProvider at the dashboard level.
 * This prevents "Cannot have two HTML5 backends" errors when editors remount.
 * We no longer wrap with DndProvider here - just use the existing one from above.
 */
export const DndKit = [
  DndPlugin.configure({
    options: {
      enableScroller: true,
      onDropFiles: ({ dragItem, editor, target }) => {
        editor
          .getTransforms(PlaceholderPlugin)
          .insert.media(dragItem.files, { at: target, nextBlock: false });
      },
    },
    render: {
      aboveNodes: BlockDraggable,
      // No aboveSlate wrapper - DndProvider is at dashboard level
    },
  }),
];
