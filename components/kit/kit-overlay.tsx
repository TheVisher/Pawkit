'use client';

import { useEffect, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { useKitStore } from '@/lib/hooks/use-kit-store';
import { usePanelStore } from '@/lib/hooks/use-panel-store';
import { KitHeader } from './kit-header';
import { KitChatPanelOverlay } from './kit-chat-panel-overlay';
import { KitContextIndicator } from './kit-context-indicator';
import { cn } from '@/lib/utils';

const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 500;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 400;
const MAX_WIDTH = 800;
const ANCHORED_WIDTH = 325; // Same width as right sidebar

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

  // Get panel store to close right panel when Kit anchors
  const closeRightPanel = usePanelStore((state) => state.close);
  const isRightPanelOpen = usePanelStore((state) => state.isOpen);
  const rightPanelMode = usePanelStore((state) => state.mode);

  // Handle anchor toggle - close right panel when Kit anchors
  const handleAnchorToggle = useCallback(() => {
    if (!isAnchored) {
      // About to anchor - close right panel first
      closeRightPanel();
    }
    toggleAnchored();
  }, [isAnchored, closeRightPanel, toggleAnchored]);

  // Set initial position if not yet set (0,0)
  useEffect(() => {
    if (position.x === 0 && position.y === 0 && typeof window !== 'undefined' && !isAnchored) {
      setPosition({
        x: window.innerWidth - size.width - 80,
        y: window.innerHeight - size.height - 100,
      });
    }
  }, [position.x, position.y, size.width, size.height, setPosition, isAnchored]);

  if (!isOpen) return null;

  // When anchored, Kit becomes a sidebar-like panel on the right
  if (isAnchored) {
    return (
      <div
        className={cn(
          "fixed top-0 right-0 bottom-0 z-[9998]",
          "flex flex-col",
          "bg-black/70 backdrop-blur-xl",
          "border-l border-white/10",
          "shadow-2xl shadow-black/50",
          "animate-slide-in-right"
        )}
        style={{
          width: ANCHORED_WIDTH,
          background: 'var(--bg-surface-1)',
          boxShadow: 'var(--shadow-4)',
          borderLeft: '1px solid var(--border-subtle)',
        }}
      >
        {/* Header */}
        <KitHeader
          onClose={close}
          onMinimize={toggleMinimized}
          onAnchor={handleAnchorToggle}
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
      </div>
    );
  }

  // Floating mode - draggable/resizable
  return (
    <Rnd
      position={{ x: position.x, y: position.y }}
      size={{ width: size.width, height: isMinimized ? 48 : size.height }}
      minWidth={MIN_WIDTH}
      minHeight={isMinimized ? 48 : MIN_HEIGHT}
      maxWidth={MAX_WIDTH}
      maxHeight={typeof window !== 'undefined' ? window.innerHeight - 100 : 800}
      bounds="window"
      dragHandleClassName="kit-drag-handle"
      enableResizing={!isMinimized}
      onDragStop={(_e, d) => {
        setPosition({ x: d.x, y: d.y });
      }}
      onResizeStop={(_e, _direction, ref, _delta, newPosition) => {
        setSize({
          width: parseInt(ref.style.width),
          height: parseInt(ref.style.height),
        });
        setPosition(newPosition);
      }}
      className={cn(
        "z-[9998] flex flex-col",
        "bg-black/70 backdrop-blur-xl",
        "border border-white/10 rounded-xl",
        "shadow-2xl shadow-black/50",
        "overflow-hidden"
      )}
    >
      {/* Header - always visible, draggable */}
      <KitHeader
        onClose={close}
        onMinimize={toggleMinimized}
        onAnchor={handleAnchorToggle}
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
