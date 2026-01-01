'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Library, ChevronRight, Maximize2, Minimize2, Plus } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, createSyncMetadata } from '@/lib/db';
import type { LocalCard } from '@/lib/db/types';
import { PortalPawkitsTree } from './components/portal-pawkits-tree';
import { PortalCardItem } from './components/portal-card-item';

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

    // Sort by newest first
    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [cards, selectedPawkit]);

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

  // Handle URL drop - create card directly via Dexie
  const handleUrlDrop = useCallback(
    async (payload: { url: string; x: number; y: number }) => {
      const { url, x, y } = payload;
      const targetAtDrop = detectPawkitAtPosition(x, y);
      const targetCollection =
        targetAtDrop !== undefined ? targetAtDrop : dropTargetPawkit || selectedPawkit;

      console.log('[Portal] URL dropped:', url, 'target:', targetCollection || 'Library');

      if (!currentWorkspace) {
        console.warn('[Portal] No workspace');
        return;
      }

      try {
        // Create card directly in Dexie
        const card: LocalCard = {
          id: crypto.randomUUID(),
          type: 'url',
          url: url,
          title: url,
          content: '',
          workspaceId: currentWorkspace.id,
          collections: targetCollection ? [targetCollection] : [],
          tags: [],
          pinned: false,
          status: 'PENDING', // Triggers metadata fetching
          isFileCard: false,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...createSyncMetadata(),
        };

        await db.cards.add(card);

        // Queue sync
        await db.syncQueue.add({
          entityType: 'card',
          entityId: card.id,
          operation: 'create',
          payload: card as unknown as Record<string, unknown>,
          retryCount: 0,
          createdAt: new Date(),
        });

        console.log('[Portal] Card created - metadata will be fetched automatically');
      } catch (error) {
        console.error('[Portal] Failed to create card:', error);
      }

      setIsDraggingOver(false);
      setDropTargetPawkit(null);
    },
    [currentWorkspace, dropTargetPawkit, selectedPawkit, detectPawkitAtPosition]
  );

  // Tauri drag/drop events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const tauri = (window as { __TAURI__?: { event: { listen: Function } } }).__TAURI__;
    if (!tauri) return;

    const unlisteners: (() => void)[] = [];

    async function setupListeners() {
      try {
        const { listen } = await import('@tauri-apps/api/event');

        const u1 = await listen<{ x: number; y: number }>('tauri-drag-enter', () => {
          setIsDraggingOver(true);
        });
        unlisteners.push(u1);

        const u2 = await listen<{ x: number; y: number }>('tauri-drag-over', (event) => {
          const { x, y } = event.payload;
          const target = detectPawkitAtPosition(x, y);
          if (target !== undefined) {
            setDropTargetPawkit(target);
          }
        });
        unlisteners.push(u2);

        const u3 = await listen('tauri-drag-leave', () => {
          setIsDraggingOver(false);
          setDropTargetPawkit(null);
        });
        unlisteners.push(u3);

        const u4 = await listen<{ url: string; x: number; y: number }>('tauri-drop-url', (event) => {
          handleUrlDrop(event.payload);
        });
        unlisteners.push(u4);

        const u5 = await listen('tauri-drop', () => {
          setIsDraggingOver(false);
          setDropTargetPawkit(null);
        });
        unlisteners.push(u5);

        console.log('[Portal] Tauri listeners registered');
      } catch (error) {
        console.error('[Portal] Failed to setup listeners:', error);
      }
    }

    setupListeners();

    return () => {
      unlisteners.forEach((u) => u());
    };
  }, [handleUrlDrop, detectPawkitAtPosition]);

  // Window controls (Tauri)
  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      await appWindow.hide();
    } catch (e) {
      console.error('Failed to hide window:', e);
    }
  };

  const handleMinimize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
    } catch (e) {
      console.error('Failed to minimize window:', e);
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
        console.log('[Portal] Native rounded corners enabled');
      } catch (e) {
        console.log('[Portal] Not in Tauri context or rounded corners failed:', e);
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
        <div className="portal-cards relative">
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
              <div className="portal-masonry">
                {visibleCards.slice(0, 50).map((card) => (
                  <PortalCardItem key={card.id} card={card} />
                ))}
              </div>
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
