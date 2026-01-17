/**
 * Custom TipTap Image Extension
 *
 * Extends the base TipTap Image extension with:
 * - Drag-and-drop image uploads
 * - Paste image uploads from clipboard
 * - Automatic compression using browser-image-compression
 * - Upload to Supabase Storage
 * - Loading placeholder while uploading
 * - Resizable images with drag handles
 */

// Type declarations are in image-types.d.ts (auto-included by TypeScript)
import Image from '@tiptap/extension-image';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { ReactNodeViewRenderer } from '@tiptap/react';
import imageCompression from 'browser-image-compression';
import { uploadToSupabase } from '@/lib/metadata/image-persistence';
import { nanoid } from 'nanoid';
import { ImageNodeView } from './image-node-view';

// Image compression options - reusing the same settings as card photo picker
const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5, // Max 500KB
  maxWidthOrHeight: 1920, // Max dimension
  useWebWorker: true,
};

// Plugin key for image upload
const uploadImagePluginKey = new PluginKey('uploadImage');

/**
 * Upload an image file and return the Supabase URL
 */
async function uploadImage(file: File): Promise<string | null> {
  try {
    console.log(`[ImageExtension] Uploading image: ${file.name} (${(file.size / 1024).toFixed(0)}KB)`);

    // Compress the image
    const compressedFile = await imageCompression(file, COMPRESSION_OPTIONS);
    console.log(`[ImageExtension] Compressed to ${(compressedFile.size / 1024).toFixed(0)}KB`);

    // Generate a unique ID for this image
    const imageId = `editor-image-${nanoid()}`;

    // Upload to Supabase Storage
    const supabaseUrl = await uploadToSupabase(
      imageId,
      compressedFile,
      compressedFile.type || 'image/jpeg'
    );

    if (supabaseUrl) {
      console.log('[ImageExtension] Upload successful:', supabaseUrl);
      return supabaseUrl;
    } else {
      console.error('[ImageExtension] Upload failed - no URL returned');
      return null;
    }
  } catch (error) {
    console.error('[ImageExtension] Upload error:', error);
    return null;
  }
}

/**
 * Handle image drop/paste by inserting a placeholder, uploading, then replacing with real URL
 */
function handleImageFile(file: File, view: EditorView, pos: number) {
  const { schema } = view.state;

  // Create a placeholder image node with a data URL
  const reader = new FileReader();
  reader.onload = (readerEvent) => {
    const dataUrl = readerEvent.target?.result as string;

    // Insert placeholder image immediately
    const node = schema.nodes.image.create({
      src: dataUrl,
      alt: file.name,
      'data-uploading': 'true', // Mark as uploading for CSS styling
    });

    const transaction = view.state.tr.insert(pos, node);
    view.dispatch(transaction);

    // Upload in background and replace when done
    uploadImage(file).then((url) => {
      if (url) {
        // Find the placeholder node and replace it
        const { state } = view;
        let placeholderPos: number | null = null;

        state.doc.descendants((node: ProseMirrorNode, nodePos: number) => {
          if (
            node.type.name === 'image' &&
            node.attrs.src === dataUrl &&
            node.attrs['data-uploading'] === 'true'
          ) {
            placeholderPos = nodePos;
            return false; // Stop iterating
          }
        });

        if (placeholderPos !== null) {
          // Replace placeholder with real image
          const newNode = schema.nodes.image.create({
            src: url,
            alt: file.name,
          });

          const tr = view.state.tr.replaceWith(
            placeholderPos,
            placeholderPos + 1,
            newNode
          );

          view.dispatch(tr);
          console.log('[ImageExtension] Replaced placeholder with uploaded image');
        }
      } else {
        // Upload failed - remove the placeholder
        console.error('[ImageExtension] Upload failed, removing placeholder');
        const { state } = view;
        let placeholderPos: number | null = null;

        state.doc.descendants((node: ProseMirrorNode, nodePos: number) => {
          if (
            node.type.name === 'image' &&
            node.attrs.src === dataUrl &&
            node.attrs['data-uploading'] === 'true'
          ) {
            placeholderPos = nodePos;
            return false;
          }
        });

        if (placeholderPos !== null) {
          const tr = view.state.tr.delete(placeholderPos, placeholderPos + 1);
          view.dispatch(tr);
        }
      }
    });
  };

  reader.readAsDataURL(file);
}

/**
 * Create ProseMirror plugin for handling image drag/drop and paste
 */
function createImageUploadPlugin() {
  return new Plugin({
    key: uploadImagePluginKey,
    props: {
      handleDOMEvents: {
        // Handle paste
        paste(view, event) {
          const items = event.clipboardData?.items;
          if (!items) return false;

          for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file) {
                const { selection } = view.state;
                handleImageFile(file, view, selection.from);
              }
              return true;
            }
          }

          return false;
        },

        // Handle drop
        drop(view, event) {
          const hasFiles = event.dataTransfer?.files?.length;
          if (!hasFiles) return false;

          const images = Array.from(event.dataTransfer.files).filter((file) =>
            file.type.startsWith('image/')
          );

          if (images.length === 0) return false;

          event.preventDefault();

          // Get the position where the image was dropped
          const coordinates = view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
          });

          if (!coordinates) return false;

          // Insert images at drop position
          images.forEach((file, index) => {
            handleImageFile(file, view, coordinates.pos + index);
          });

          return true;
        },

        // Prevent default drag behavior
        dragover(view, event) {
          const hasFiles = event.dataTransfer?.types.includes('Files');
          if (hasFiles) {
            event.preventDefault();
            return true;
          }
          return false;
        },
      },
    },
  });
}

/**
 * Custom Image Extension
 * Extends base Image with upload capabilities
 */
export const PawkitImage = Image.extend({
  name: 'image',

  addAttributes() {
    return {
      ...this.parent?.(),
      'data-uploading': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-uploading'),
        renderHTML: (attributes) => {
          if (!attributes['data-uploading']) {
            return {};
          }
          return {
            'data-uploading': attributes['data-uploading'],
          };
        },
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const width = element.getAttribute('width') || element.style.width;
          if (width) {
            // Parse numeric value from "400px" or "400"
            const numericWidth = parseInt(width, 10);
            return isNaN(numericWidth) ? null : numericWidth;
          }
          return null;
        },
        renderHTML: (attributes) => {
          if (!attributes.width) {
            return {};
          }
          return {
            width: attributes.width,
            style: `width: ${attributes.width}px`,
          };
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [createImageUploadPlugin()];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },

  addCommands() {
    return {
      ...this.parent?.(),
      insertImageFromFile:
        () =>
        ({ view }: { view: EditorView }) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file && view) {
              const { selection } = view.state;
              handleImageFile(file, view, selection.from);
            }
          };
          input.click();
          return true;
        },
    };
  },
});
