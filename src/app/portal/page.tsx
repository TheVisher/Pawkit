'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Library, ChevronRight, Maximize2, Minimize2, Plus } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { createUrlCard } from '@/lib/services/metadata-service';
import { PortalPawkitsTree } from './components/portal-pawkits-tree';
import { PortalMasonryGrid } from './components/portal-masonry-grid';
import { isInternalDragActive, isDraggedUrl, normalizeUrlForComparison } from './utils/drag-state';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('Portal');

/**
 * Pawkit Portal - Mini browser for quick access
 *
 * Uses Dexie liveQuery for everything - no Zustand stores needed.
 * The portal is a separate webview with its own JS runtime,
 * so we query IndexedDB directly for automatic reactivity.
 */
// Responsive breakpoints for Portal window
const BREAKPOINTS = {
  // Below this width, sidebar auto-floats
  SIDEBAR_FLOAT: 500,
  // Minimum window width (enforced in Tauri, but also in CSS)
  MIN_WIDTH: 320,
};

export default function PortalPage() {
  const [selectedPawkit, setSelectedPawkit] = useState<string | null>(null);
  const cardsGridRef = useRef<HTMLDivElement>(null);
  const prevCardIdsRef = useRef<Set<string> | null>(null);

  // Sidebar state - tracks both user preference and auto state
  const [userPrefersAnchored, setUserPrefersAnchored] = useState(true);
  const [autoFloatedByResize, setAutoFloatedByResize] = useState(false);

  // Computed sidebar anchored state
  const sidebarAnchored = userPrefersAnchored && !autoFloatedByResize;

  // External drag state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dropTargetPawkit, setDropTargetPawkit] = useState<string | null>(null);

  // Track window width for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;

      // Auto-float sidebar when window is too narrow
      if (width < BREAKPOINTS.SIDEBAR_FLOAT) {
        setAutoFloatedByResize(true);
      } else {
        setAutoFloatedByResize(false);
      }
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handler for manual sidebar toggle (user preference)
  const handleToggleSidebarAnchored = (anchored: boolean) => {
    setUserPrefersAnchored(anchored);
  };

  // Get the default workspace directly from Dexie
  const currentWorkspace = useLiveQuery(
    async () => {
      // Get the first workspace (default) - portal doesn't need workspace switching
      const workspaces = await db.workspaces.filter((w) => !w._deleted).toArray();
      return workspaces.find((w) => w.isDefault) || workspaces[0] || null;
    },
    [],
    null
  );

  // Use Dexie liveQuery for automatic reactivity
  // This automatically updates when ANY window modifies IndexedDB
  const cards = useLiveQuery(
    async () => {
      if (!currentWorkspace) return [];
      return db.cards.where('workspaceId').equals(currentWorkspace.id).toArray();
    },
    [currentWorkspace?.id],
    []
  );

  const collections = useLiveQuery(
    async () => {
      if (!currentWorkspace) return [];
      return db.collections.where('workspaceId').equals(currentWorkspace.id).toArray();
    },
    [currentWorkspace?.id],
    []
  );

  // Filter and sort cards
  const visibleCards = useMemo(() => {
    if (!cards) return [];

    const nonDeleted = cards.filter((c) => !c._deleted);
    const filtered = selectedPawkit
      ? nonDeleted.filter((c) => c.collections?.includes(selectedPawkit))
      : nonDeleted;

    // Sort by newest first (handle Date objects or ISO strings)
    const sorted = [...filtered].sort((a, b) => {
      const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
      const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

    return sorted;
  }, [cards, selectedPawkit]);

  // Scroll to top when a new card is added (track by IDs, not count)
  useEffect(() => {
    if (!visibleCards.length || !cardsGridRef.current) return;

    const currentIds = new Set(visibleCards.map(c => c.id));
    const prevIds = prevCardIdsRef.current;

    // Skip if this is the initial load
    if (!prevIds) {
      prevCardIdsRef.current = currentIds;
      return;
    }

    // Check for new cards (IDs in current but not in previous)
    const hasNewCard = [...currentIds].some(id => !prevIds.has(id));

    if (hasNewCard) {
      cardsGridRef.current.scrollTop = 0;
    }

    prevCardIdsRef.current = currentIds;
  }, [visibleCards]);

  // Get current location name
  const currentLocationName = useMemo(() => {
    if (!selectedPawkit) return 'Library';
    const collection = collections?.find((c) => c.slug === selectedPawkit);
    return collection?.name || 'Library';
  }, [selectedPawkit, collections]);

  // Detect pawkit under cursor
  const detectPawkitAtPosition = useCallback((x: number, y: number) => {
    const element = document.elementFromPoint(x, y);
    if (!element) return null;

    const pawkitItem = element.closest('[data-pawkit-slug]');
    if (pawkitItem) {
      return pawkitItem.getAttribute('data-pawkit-slug');
    }

    const libraryItem = element.closest('[data-library-drop]');
    if (libraryItem) {
      return null;
    }

    return undefined;
  }, []);

  // Handle URL drop - create card and fetch metadata directly
  // No round-trip to main app needed - uses shared Dexie and metadata service
  const handleUrlDrop = useCallback(
    async (payload: { url: string; x: number; y: number }) => {
      const { url, x, y } = payload;
      const targetAtDrop = detectPawkitAtPosition(x, y);
      const targetCollection =
        targetAtDrop !== undefined ? targetAtDrop : dropTargetPawkit || selectedPawkit;

      log.info('URL dropped:', url, 'target:', targetCollection || 'Library');

      if (!currentWorkspace) {
        log.warn('No workspace yet, waiting...');
        setIsDraggingOver(false);
        setDropTargetPawkit(null);
        return;
      }

      try {
        // Safety net 1: Check if this URL was just being dragged from within the portal
        // (handles edge case where user drags off and back on)
        if (isDraggedUrl(url)) {
          log.info('URL is being dragged from portal, ignoring drop:', url);
          setIsDraggingOver(false);
          setDropTargetPawkit(null);
          return;
        }

        // Safety net 2: Check if this URL already exists in the workspace (prevent duplicates)
        // Uses normalized comparison to catch URLs with different tracking params
        const normalizedDroppedUrl = normalizeUrlForComparison(url);
        const existingCard = await db.cards
          .where('workspaceId')
          .equals(currentWorkspace.id)
          .filter((card) => {
            if (!card.url || card._deleted) return false;
            return normalizeUrlForComparison(card.url) === normalizedDroppedUrl;
          })
          .first();

        if (existingCard) {
          log.info('Card with this URL already exists, skipping duplicate:', existingCard.id);
          setIsDraggingOver(false);
          setDropTargetPawkit(null);
          return;
        }

        // Create card and fetch metadata - all in one call
        // Uses shared Dexie, portal sees update via liveQuery
        await createUrlCard({
          url: url,
          workspaceId: currentWorkspace.id,
          collections: targetCollection ? [targetCollection] : [],
        });
        log.info('Card created, metadata fetching...');
      } catch (error) {
        log.error('Failed to create card:', error);
      }

      setIsDraggingOver(false);
      setDropTargetPawkit(null);
    },
    [currentWorkspace, dropTargetPawkit, selectedPawkit, detectPawkitAtPosition]
  );

  // Use refs to access current values in listeners without re-registering
  const handleUrlDropRef = useRef(handleUrlDrop);
  const detectPawkitRef = useRef(detectPawkitAtPosition);

  // Keep refs updated
  useEffect(() => {
    handleUrlDropRef.current = handleUrlDrop;
  }, [handleUrlDrop]);

  useEffect(() => {
    detectPawkitRef.current = detectPawkitAtPosition;
  }, [detectPawkitAtPosition]);

  // Tauri drag/drop events - registered ONCE, uses refs for current values
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const tauri = (window as { __TAURI__?: { event: { listen: Function } } }).__TAURI__;
    if (!tauri) return;

    let cancelled = false;
    const unlisteners: (() => void)[] = [];

    async function setupListeners() {
      try {
        const { listen } = await import('@tauri-apps/api/event');

        if (cancelled) return;

        const u1 = await listen<{ x: number; y: number }>('tauri-drag-enter', () => {
          // Ignore if this is an internal drag (card being dragged out of portal)
          if (isInternalDragActive()) return;
          setIsDraggingOver(true);
        });
        if (cancelled) { u1(); return; }
        unlisteners.push(u1);

        const u2 = await listen<{ x: number; y: number }>('tauri-drag-over', (event) => {
          // Ignore if this is an internal drag (card being dragged out of portal)
          if (isInternalDragActive()) return;
          const { x, y } = event.payload;
          const target = detectPawkitRef.current(x, y);
          if (target !== undefined) {
            setDropTargetPawkit(target);
          }
        });
        if (cancelled) { u2(); return; }
        unlisteners.push(u2);

        const u3 = await listen('tauri-drag-leave', () => {
          setIsDraggingOver(false);
          setDropTargetPawkit(null);
        });
        if (cancelled) { u3(); return; }
        unlisteners.push(u3);

        const u4 = await listen<{ url: string; x: number; y: number }>('tauri-drop-url', (event) => {
          // Ignore if this is an internal drag (card being dragged out of portal)
          if (isInternalDragActive()) return;
          handleUrlDropRef.current(event.payload);
        });
        if (cancelled) { u4(); return; }
        unlisteners.push(u4);

        const u5 = await listen('tauri-drop', () => {
          setIsDraggingOver(false);
          setDropTargetPawkit(null);
        });
        if (cancelled) { u5(); return; }
        unlisteners.push(u5);

        log.info('Tauri listeners registered');
      } catch (error) {
        log.error('Failed to setup listeners:', error);
      }
    }

    setupListeners();

    return () => {
      cancelled = true;
      unlisteners.forEach((u) => u());
    };
  }, []); // Empty deps - register only ONCE, use refs for current values

  // Window controls (Tauri)
  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      await appWindow.hide();
    } catch (e) {
      log.error('Failed to hide window:', e);
    }
  };

  const handleMinimize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
    } catch (e) {
      log.error('Failed to minimize window:', e);
    }
  };

  // Window drag (Tauri)
  const handleStartDrag = async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;

    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      await appWindow.startDragging();
    } catch (e) {
      // Not in Tauri context, ignore
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        await handleClose();
        return;
      }

      if (e.key === 'Backspace' && selectedPawkit && !(e.target as HTMLElement).closest('input')) {
        e.preventDefault();
        setSelectedPawkit(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPawkit]);

  // Enable native macOS rounded corners
  useEffect(() => {
    async function enableRoundedCorners() {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const window = getCurrentWebviewWindow();

        await invoke('enable_modern_window_style', {
          window,
          cornerRadius: 12.0,
          offsetX: 0.0,
          offsetY: 0.0,
        });
        log.info('Native rounded corners enabled');
      } catch (e) {
        log.debug('Not in Tauri context or rounded corners failed:', e);
      }
    }

    enableRoundedCorners();
  }, []);

  if (!currentWorkspace) {
    return (
      <div className="portal-container portal-loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="portal-container">
      {/* Header with drag region - native traffic lights are used now */}
      <header className="portal-header" onMouseDown={handleStartDrag}>
        <div className="drag-region">
          {/* Spacer for traffic lights */}
          <div className="w-16" />
          <span className="portal-title">Pawkit Portal</span>
        </div>
      </header>

      {/* Main content */}
      <main className="portal-content relative">
        {/* Anchored sidebar */}
        {sidebarAnchored && (
          <div className="portal-sidebar">
            <div className="sidebar-header">
              <span>Pawkits</span>
              <button
                onClick={() => handleToggleSidebarAnchored(false)}
                className="h-5 w-5 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-glass-bg transition-colors"
                title="Float sidebar"
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="sidebar-list">
              <button
                data-library-drop
                onClick={() => setSelectedPawkit(null)}
                className={`flex items-center gap-2 w-full px-2 py-2 rounded-xl text-sm text-left transition-colors ${
                  selectedPawkit === null
                    ? 'text-text-primary font-medium bg-black/5 dark:bg-white/5'
                    : 'text-text-secondary hover:text-text-primary hover:bg-glass-bg'
                } ${isDraggingOver && dropTargetPawkit === null ? 'ring-2 ring-inset ring-accent bg-accent/20' : ''}`}
              >
                <Library
                  className={`h-4 w-4 shrink-0 ${selectedPawkit === null ? 'text-accent' : ''}`}
                />
                <span>Library</span>
              </button>
              <div className="mt-2">
                <PortalPawkitsTree
                  collections={collections || []}
                  selectedSlug={selectedPawkit}
                  onSelectPawkit={setSelectedPawkit}
                  isExternalDragActive={isDraggingOver}
                  dropTargetSlug={dropTargetPawkit}
                />
              </div>
            </div>
          </div>
        )}

        {/* Floating sidebar */}
        {!sidebarAnchored && (
          <div className={`portal-sidebar-floating group ${isDraggingOver ? 'drag-active' : ''}`}>
            <div className="sidebar-trigger">
              <Maximize2 className="h-4 w-4" />
            </div>
            <div className="sidebar-panel">
              <div className="sidebar-header">
                <span>Pawkits</span>
                <button
                  onClick={() => handleToggleSidebarAnchored(true)}
                  className="h-5 w-5 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-glass-bg transition-colors"
                  title="Anchor sidebar"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="sidebar-list">
                <button
                  data-library-drop
                  onClick={() => setSelectedPawkit(null)}
                  className={`flex items-center gap-2 w-full px-2 py-2 rounded-xl text-sm text-left transition-colors ${
                    selectedPawkit === null
                      ? 'text-text-primary font-medium bg-black/5 dark:bg-white/5'
                      : 'text-text-secondary hover:text-text-primary hover:bg-glass-bg'
                  } ${isDraggingOver && dropTargetPawkit === null ? 'ring-2 ring-inset ring-accent bg-accent/20' : ''}`}
                >
                  <Library
                    className={`h-4 w-4 shrink-0 ${selectedPawkit === null ? 'text-accent' : ''}`}
                  />
                  <span>Library</span>
                </button>
                <div className="mt-2">
                  <PortalPawkitsTree
                    collections={collections || []}
                    selectedSlug={selectedPawkit}
                    onSelectPawkit={setSelectedPawkit}
                    isExternalDragActive={isDraggingOver}
                    dropTargetSlug={dropTargetPawkit}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cards area */}
        <div ref={cardsGridRef} className="portal-cards relative">
          <div className="cards-header">
            <div className="flex items-center gap-1.5">
              {selectedPawkit && (
                <>
                  <button
                    onClick={() => setSelectedPawkit(null)}
                    className="text-text-muted hover:text-text-primary transition-colors"
                  >
                    Library
                  </button>
                  <ChevronRight className="h-3.5 w-3.5 text-text-muted" />
                </>
              )}
              <span className="breadcrumb">{currentLocationName}</span>
            </div>
            <span className="text-text-muted text-xs">{visibleCards.length} cards</span>
          </div>

          <div className="cards-grid">
            {visibleCards.length === 0 ? (
              <div className="text-text-muted text-sm text-center py-8">
                {selectedPawkit ? 'No cards in this pawkit' : 'No cards yet. Drag URLs here!'}
              </div>
            ) : (
              <PortalMasonryGrid cards={visibleCards.slice(0, 50)} />
            )}
          </div>

          {/* Drop overlay */}
          {isDraggingOver && (
            <div className="absolute inset-0 bg-accent/10 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl pointer-events-none">
              <div className="drop-zone">
                <Plus className="h-6 w-6 mb-2" />
                <span>
                  Drop to add to{' '}
                  <strong>
                    {dropTargetPawkit
                      ? collections?.find((c) => c.slug === dropTargetPawkit)?.name
                      : selectedPawkit
                        ? currentLocationName
                        : 'Library'}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
