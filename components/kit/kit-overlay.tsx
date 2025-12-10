'use client';

import { useEffect, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { useKitStore } from '@/lib/hooks/use-kit-store';
import { KitHeader } from './kit-header';
import { KitChatPanelOverlay } from './kit-chat-panel-overlay';
import { KitContextIndicator } from './kit-context-indicator';
import { cn } from '@/lib/utils';

const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 500;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 400;
const MAX_WIDTH = 800;

export function KitOverlay() {
  const {
    isOpen,
    isMinimized,
    isAnchored,
    position,
    size,
    setPosition,
    setSize,
    toggleMinimized,
    toggleAnchored,
    close,
  } = useKitStore();

  // Calculate anchored position (right side, full height minus FAB space)
  const getAnchoredBounds = useCallback(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0, width: DEFAULT_WIDTH, height: 500 };
    return {
      x: window.innerWidth - DEFAULT_WIDTH - 24,
      y: 80,
      width: DEFAULT_WIDTH,
      height: window.innerHeight - 160,
    };
  }, []);

  // Set initial position if not yet set (0,0)
  useEffect(() => {
    if (position.x === 0 && position.y === 0 && typeof window !== 'undefined') {
      setPosition({
        x: window.innerWidth - size.width - 80,
        y: window.innerHeight - size.height - 100,
      });
    }
  }, [position.x, position.y, size.width, size.height, setPosition]);

  // Handle anchor toggle
  useEffect(() => {
    if (isAnchored) {
      const bounds = getAnchoredBounds();
      setPosition({ x: bounds.x, y: bounds.y });
      setSize({ width: bounds.width, height: bounds.height });
    }
  }, [isAnchored, getAnchoredBounds, setPosition, setSize]);

  if (!isOpen) return null;

  const currentPosition = isAnchored ? getAnchoredBounds() : position;
  const currentSize = isAnchored ? getAnchoredBounds() : size;

  return (
    <Rnd
      position={{ x: currentPosition.x, y: currentPosition.y }}
      size={{ width: currentSize.width, height: isMinimized ? 48 : currentSize.height }}
      minWidth={MIN_WIDTH}
      minHeight={isMinimized ? 48 : MIN_HEIGHT}
      maxWidth={MAX_WIDTH}
      maxHeight={typeof window !== 'undefined' ? window.innerHeight - 100 : 800}
      bounds="window"
      dragHandleClassName="kit-drag-handle"
      disableDragging={isAnchored}
      enableResizing={!isAnchored && !isMinimized}
      onDragStop={(_e, d) => {
        if (!isAnchored) {
          setPosition({ x: d.x, y: d.y });
        }
      }}
      onResizeStop={(_e, _direction, ref, _delta, position) => {
        if (!isAnchored) {
          setSize({
            width: parseInt(ref.style.width),
            height: parseInt(ref.style.height),
          });
          setPosition(position);
        }
      }}
      className={cn(
        "z-[100] flex flex-col",
        "bg-black/70 backdrop-blur-xl",
        "border border-white/10 rounded-xl",
        "shadow-2xl shadow-black/50",
        "overflow-hidden",
        isAnchored && "rounded-l-xl rounded-r-none border-r-0"
      )}
    >
      {/* Header - always visible, draggable */}
      <KitHeader
        onClose={close}
        onMinimize={toggleMinimized}
        onAnchor={toggleAnchored}
        isMinimized={isMinimized}
        isAnchored={isAnchored}
      />

      {/* Context indicator */}
      {!isMinimized && <KitContextIndicator />}

      {/* Chat panel */}
      {!isMinimized && (
        <div className="flex-1 overflow-hidden">
          <KitChatPanelOverlay />
        </div>
      )}
    </Rnd>
  );
}
