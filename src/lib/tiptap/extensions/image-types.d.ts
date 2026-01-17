/**
 * Type declarations for custom TipTap image commands
 */

import '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pawkitImage: {
      /**
       * Open a file picker to insert an image
       */
      insertImageFromFile: () => ReturnType;
    };
  }
}
