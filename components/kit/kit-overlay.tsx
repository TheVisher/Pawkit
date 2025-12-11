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
    isEmbeddedInSidebar,
    position,
    size,
    sidebarWasOpenBeforeAnchor,
    setPosition,
    setSize,
    toggleMinimized,
    toggleAnchored,
    close,
    setSidebarWasOpen,
  } = useKitStore();

  // Get panel store to close/open right panel when Kit anchors and get left mode
  const closeRightPanel = usePanelStore((state) => state.close);
  const openRightPanel = usePanelStore((state) => state.open);
  const isRightPanelOpen = usePanelStore((state) => state.isOpen);
  const leftMode = usePanelStore((state) => state.leftMode);

  // Determine if content panel is floating (left panel is floating)
  const isContentFloating = leftMode === "floating";

  // Close right panel when Kit opens while anchored
  useEffect(() => {
    if (isOpen && isAnchored && isRightPanelOpen) {
      closeRightPanel();
    }
  }, [isOpen, isAnchored, isRightPanelOpen, closeRightPanel]);

  // Handle anchor toggle - track sidebar state and restore when unanchoring
  const handleAnchorToggle = useCallback(() => {
    if (!isAnchored) {
      // About to anchor - remember if sidebar was open, then close it
      setSidebarWasOpen(isRightPanelOpen);
      closeRightPanel();
    } else {
      // Unanchoring - restore sidebar if it was open before
      if (sidebarWasOpenBeforeAnchor) {
        openRightPanel();
      }
    }
    toggleAnchored();
  }, [isAnchored, isRightPanelOpen, sidebarWasOpenBeforeAnchor, closeRightPanel, openRightPanel, setSidebarWasOpen, toggleAnchored]);

  // Handle close - restore sidebar if needed
  const handleClose = useCallback(() => {
    // If Kit was anchored and sidebar was open before, restore it
    if (isAnchored && sidebarWasOpenBeforeAnchor) {
      openRightPanel();
    }
    close();
  }, [isAnchored, sidebarWasOpenBeforeAnchor, openRightPanel, close]);

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

  // When Kit is embedded in sidebar (card is open), don't render overlay
  if (isEmbeddedInSidebar) return null;

  // When anchored, Kit becomes a sidebar-like panel on the right
  // Style depends on whether left panel is floating or anchored
  if (isAnchored) {
    // When left is floating: Kit has rounded corners, margin, attaches to content panel
    // When left is anchored: Kit is edge-to-edge, no rounding
    const isEmbedded = isContentFloating;

    return (
      <div
        data-panel="kit"
        className={cn(
          "fixed z-[9998]",
          "flex flex-col",
          "animate-slide-in-right",
          // Positioning based on left panel mode
          isEmbedded
            ? "top-4 right-4 bottom-4 rounded-r-2xl"
            : "top-0 right-0 bottom-0 rounded-none"
        )}
        style={{
          width: ANCHORED_WIDTH,
          background: 'var(--bg-surface-1)',
          boxShadow: isEmbedded ? 'var(--shadow-4)' : 'var(--shadow-2)',
          border: '1px solid var(--border-subtle)',
          borderTopColor: 'var(--border-highlight-top)',
          borderLeftColor: 'var(--border-highlight-left)',
          // When embedded, remove right border to blend with edge
          borderRightColor: isEmbedded ? 'var(--border-subtle)' : 'transparent',
        }}
      >
        {/* Header */}
        <KitHeader
          onClose={handleClose}
          onMinimize={toggleMinimized}
          onAnchor={handleAnchorToggle}
          isMinimized={isMinimized}
          isAnchored={isAnchored}
        />

        {/* Context indicator */}
        {!isMinimized && <KitContextIndicator />}

        {/* Chat panel */}
        {!isMinimized && (
          <div className="flex-1 min-h-0 overflow-hidden">
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
      className="z-[9998]"
    >
      {/* Inner flex container - contains all visual styling */}
      <div
        data-panel="kit"
        className="flex flex-col w-full h-full rounded-xl overflow-hidden"
        style={{
          background: 'var(--bg-surface-1)',
          boxShadow: 'var(--shadow-4)',
          border: '1px solid var(--border-subtle)',
          borderTopColor: 'var(--border-highlight-top)',
          borderLeftColor: 'var(--border-highlight-left)',
        }}
      >
        {/* Header - always visible, draggable */}
        <KitHeader
          onClose={handleClose}
          onMinimize={toggleMinimized}
          onAnchor={handleAnchorToggle}
          isMinimized={isMinimized}
          isAnchored={isAnchored}
        />

        {/* Context indicator */}
        {!isMinimized && <KitContextIndicator />}

        {/* Chat panel */}
        {!isMinimized && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <KitChatPanelOverlay />
          </div>
        )}
      </div>
    </Rnd>
  );
}
