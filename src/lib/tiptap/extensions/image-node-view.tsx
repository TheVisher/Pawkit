'use client';

/**
 * Image NodeView Component
 *
 * Renders images with resize handles that appear on selection.
 * Allows users to resize images by dragging corner handles.
 * Width is stored as an attribute and persists with the document.
 */

import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

// Minimum and maximum widths for resizing
const MIN_WIDTH = 100;
const MAX_WIDTH = 1200;

export function ImageNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const { src, alt, width, 'data-uploading': uploading } = node.attrs;
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [currentWidth, setCurrentWidth] = useState<number | null>(width || null);
  const [isHovered, setIsHovered] = useState(false);

  // Track natural width when image loads
  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      // If no width is set, use natural width (capped at MAX_WIDTH)
      if (!currentWidth) {
        const initialWidth = Math.min(imageRef.current.naturalWidth, MAX_WIDTH);
        setCurrentWidth(initialWidth);
      }
    }
  }, [currentWidth]);

  // Handle resize start
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setIsResizing(true);
      setResizeStartX(e.clientX);
      setResizeStartWidth(currentWidth || (imageRef.current?.offsetWidth ?? 300));
    },
    [currentWidth]
  );

  // Handle resize move
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStartX;
      // For right-side handles, positive delta increases width
      // For left-side handles, negative delta increases width
      let newWidth = resizeStartWidth + deltaX;

      // Clamp to min/max
      newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
      setCurrentWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Persist the width to the node attributes
      if (currentWidth) {
        updateAttributes({ width: currentWidth });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStartX, resizeStartWidth, currentWidth, updateAttributes]);

  // Show handles on hover or selection
  const showHandles = (selected || isHovered) && !uploading;

  return (
    <NodeViewWrapper className="image-node-wrapper">
      <div
        ref={containerRef}
        className={cn(
          'image-node-container relative inline-block',
          selected && 'ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-bg-base)]',
          uploading && 'opacity-50',
          isResizing && 'select-none'
        )}
        style={{ width: currentWidth ? `${currentWidth}px` : 'auto' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-drag-handle=""
      >
        {/* Loading overlay for uploads */}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg z-10">
            <div className="flex items-center gap-2 text-white text-sm">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Uploading...</span>
            </div>
          </div>
        )}

        {/* The actual image - using img because TipTap needs to render dynamic sources including data URLs */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={src}
          alt={alt || ''}
          className={cn(
            'max-w-full h-auto rounded-lg',
            'transition-shadow duration-150',
            showHandles && 'shadow-lg'
          )}
          style={{ width: '100%', display: 'block' }}
          onLoad={handleImageLoad}
          draggable={false}
        />

        {/* Resize handles - only show when selected/hovered and not uploading */}
        {showHandles && (
          <>
            {/* Corner handles */}
            <ResizeHandle
              position="nw"
              onMouseDown={handleResizeStart}
              isResizing={isResizing}
            />
            <ResizeHandle
              position="ne"
              onMouseDown={handleResizeStart}
              isResizing={isResizing}
            />
            <ResizeHandle
              position="sw"
              onMouseDown={handleResizeStart}
              isResizing={isResizing}
            />
            <ResizeHandle
              position="se"
              onMouseDown={handleResizeStart}
              isResizing={isResizing}
            />

            {/* Width indicator */}
            {isResizing && currentWidth && (
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/80 text-white text-xs font-mono">
                {Math.round(currentWidth)}px
              </div>
            )}
          </>
        )}
      </div>

      {/* Styles for image node */}
      <style jsx global>{`
        .image-node-wrapper {
          display: block;
          margin: 0.75rem 0;
        }

        .image-node-container {
          max-width: 100%;
        }

        /* Ensure images don't overflow their container */
        .image-node-container img {
          max-width: 100%;
          height: auto;
        }

        /* Uploading state animation */
        .image-node-container[data-uploading="true"] {
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </NodeViewWrapper>
  );
}

// Resize handle component
interface ResizeHandleProps {
  position: 'nw' | 'ne' | 'sw' | 'se';
  onMouseDown: (e: React.MouseEvent) => void;
  isResizing: boolean;
}

function ResizeHandle({ position, onMouseDown, isResizing }: ResizeHandleProps) {
  const positionClasses = {
    nw: 'top-0 left-0 cursor-nw-resize',
    ne: 'top-0 right-0 cursor-ne-resize',
    sw: 'bottom-0 left-0 cursor-sw-resize',
    se: 'bottom-0 right-0 cursor-se-resize',
  };

  return (
    <div
      className={cn(
        'absolute w-3 h-3 rounded-full',
        'bg-[var(--color-accent)] border-2 border-white',
        'shadow-md',
        'transition-transform duration-100',
        'hover:scale-125',
        isResizing && 'scale-125',
        positionClasses[position],
        // Offset to center on corner
        position.includes('n') ? '-translate-y-1/2' : 'translate-y-1/2',
        position.includes('w') ? '-translate-x-1/2' : 'translate-x-1/2'
      )}
      onMouseDown={onMouseDown}
      aria-label={`Resize from ${position} corner`}
    />
  );
}

export default ImageNodeView;
