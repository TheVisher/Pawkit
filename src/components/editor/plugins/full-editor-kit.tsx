'use client';

// Base plugins (functionality without UI)
import { BaseEditorKit } from '../editor-base-kit';

// UI Kits (plugins with components)
import { BasicBlocksKit } from './basic-blocks-kit';
import { BasicMarksKit } from './basic-marks-kit';
import { BlockMenuKit } from './block-menu-kit';
import { CalloutKit } from './callout-kit';
import { CodeBlockKit } from './code-block-kit';
import { DndKit } from './dnd-kit';
import { FixedToolbarKit } from './fixed-toolbar-kit';
import { FloatingToolbarKit } from './floating-toolbar-kit';
import { IndentKit } from './indent-kit';
import { LinkKit } from './link-kit';
import { ListKit } from './list-kit';
import { MediaKit } from './media-kit';
import { TableKit } from './table-kit';
import { ToggleKit } from './toggle-kit';

export const FullEditorKit = [
  // Core functionality
  ...BasicBlocksKit,
  ...BasicMarksKit,

  // Block types
  ...CodeBlockKit,
  ...TableKit,
  ...ToggleKit,
  ...CalloutKit,
  ...MediaKit,

  // Inline elements
  ...LinkKit,

  // Lists and indentation
  ...ListKit,
  ...IndentKit,

  // Drag and drop
  ...DndKit,

  // Block selection and context menu
  ...BlockMenuKit,

  // Toolbars
  ...FixedToolbarKit,
  ...FloatingToolbarKit,
];
