import { useState, useEffect, useMemo, useCallback } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { Library, ChevronRight, Maximize2, Minimize2, Plus } from 'lucide-react';

// Portal-specific stores (avoid importing from main app to prevent React conflicts)
import {
  usePortalSettingsStore,
  usePortalDataStore,
  usePortalWorkspaceStore,
  type LocalCard,
} from './stores/portal-stores';

// Portal-specific components
import { PortalPawkitsTree } from './components/PortalPawkitsTree';
import { PortalCardItem } from './components/PortalCardItem';

/**
 * Pawkit Portal - Mini browser for bidirectional drag-and-drop
 *
 * Uses the same design system and stores as the main app.
 * Accent colors, theme, and data all sync automatically.
 */
export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [selectedPawkit, setSelectedPawkit] = useState<string | null>(null);
  const [sidebarAnchored, setSidebarAnchored] = useState(true);
  const [activeDragCard, setActiveDragCard] = useState<LocalCard | null>(null);

  // External drag state (dragging from outside into portal)
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dropTargetPawkit, setDropTargetPawkit] = useState<string | null>(null);

  // Portal-specific stores
  const theme = usePortalSettingsStore((s) => s.theme);
  const accentHue = usePortalSettingsStore((s) => s.accentHue);
  const accentSaturation = usePortalSettingsStore((s) => s.accentSaturation);
  const accentLightness = usePortalSettingsStore((s) => s.accentLightness);
  const hydrateSettings = usePortalSettingsStore((s) => s.hydrate);

  const collections = usePortalDataStore((s) => s.collections);
  const cards = usePortalDataStore((s) => s.cards);
  const isLoading = usePortalDataStore((s) => s.isLoading);
  const loadFromIndexedDB = usePortalDataStore((s) => s.loadFromIndexedDB);

  const currentWorkspace = usePortalWorkspaceStore((s) => s.currentWorkspace);
  const hydrateWorkspace = usePortalWorkspaceStore((s) => s.hydrate);

  // Apply theme class to html element
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('light', 'dark');

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      html.classList.add(theme);
    }
  }, [theme]);

  // Apply accent color CSS variables
  useEffect(() => {
    document.documentElement.style.setProperty('--hue-accent', String(accentHue));
    document.documentElement.style.setProperty('--sat-accent', `${accentSaturation}%`);
    document.documentElement.style.setProperty('--light-accent', `${accentLightness}%`);
  }, [accentHue, accentSaturation, accentLightness]);

  // Initialize - hydrate from IndexedDB
  useEffect(() => {
    async function init() {
      console.log('[Portal] Initializing...');

      // Hydrate settings from localStorage
      hydrateSettings();

      // Hydrate workspace from IndexedDB (async)
      await hydrateWorkspace();

      // Get fresh workspace state
      const workspace = usePortalWorkspaceStore.getState().currentWorkspace;
      console.log('[Portal] Workspace:', workspace);

      // Load data from IndexedDB if we have a workspace
      if (workspace) {
        await loadFromIndexedDB(workspace.id);
      } else {
        console.warn('[Portal] No workspace found - make sure main app has been opened first');
      }

      setIsReady(true);
    }
    init();
  }, [hydrateSettings, hydrateWorkspace, loadFromIndexedDB]);

  // Handle URL drop from external source
  const handleUrlDrop = useCallback(async (url: string) => {
    console.log('[Portal] URL dropped:', url, 'target:', dropTargetPawkit || selectedPawkit || 'Library');

    // Invoke Tauri command to add URL via main app
    // The collection slug is passed; if null, it goes to Library
    const targetCollection = dropTargetPawkit || selectedPawkit;

    try {
      await invoke('add_url_from_portal', {
        url,
        collectionSlug: targetCollection,
      });
      console.log('[Portal] URL sent to main app');
    } catch (e) {
      console.error('[Portal] Failed to add URL:', e);
    }

    // Reset drag state
    setIsDraggingOver(false);
    setDropTargetPawkit(null);
  }, [dropTargetPawkit, selectedPawkit]);

  // Listen for Tauri drag/drop events
  useEffect(() => {
    console.log('[Portal] Setting up Tauri event listeners...');
    const unlisteners: (() => void)[] = [];

    async function setupListeners() {
      try {
        console.log('[Portal] Registering tauri-drag-enter listener...');
        // Drag enters portal window
        const unlistenEnter = await listen('tauri-drag-enter', (event) => {
          console.log('[Portal] 🟢 DRAG ENTER EVENT RECEIVED:', event);
          setIsDraggingOver(true);
        });
        unlisteners.push(unlistenEnter);
        console.log('[Portal] ✓ tauri-drag-enter registered');

        console.log('[Portal] Registering tauri-drag-leave listener...');
        // Drag leaves portal window
        const unlistenLeave = await listen('tauri-drag-leave', (event) => {
          console.log('[Portal] 🔴 DRAG LEAVE EVENT RECEIVED:', event);
          setIsDraggingOver(false);
          setDropTargetPawkit(null);
        });
        unlisteners.push(unlistenLeave);
        console.log('[Portal] ✓ tauri-drag-leave registered');

        console.log('[Portal] Registering tauri-drop-url listener...');
        // URL dropped
        const unlistenDropUrl = await listen<string>('tauri-drop-url', (event) => {
          console.log('[Portal] 🎯 URL DROP EVENT RECEIVED:', event.payload);
          handleUrlDrop(event.payload);
        });
        unlisteners.push(unlistenDropUrl);
        console.log('[Portal] ✓ tauri-drop-url registered');

        console.log('[Portal] Registering tauri-drop listener...');
        // File dropped (non-URL) - could handle later
        const unlistenDrop = await listen('tauri-drop', (event) => {
          console.log('[Portal] 📁 FILE DROP EVENT RECEIVED:', event.payload);
          setIsDraggingOver(false);
          setDropTargetPawkit(null);
        });
        unlisteners.push(unlistenDrop);
        console.log('[Portal] ✓ tauri-drop registered');

        console.log('[Portal] ✅ All Tauri event listeners registered successfully!');
      } catch (error) {
        console.error('[Portal] ❌ Failed to setup Tauri listeners:', error);
      }
    }

    setupListeners();

    return () => {
      console.log('[Portal] Cleaning up Tauri event listeners...');
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, [handleUrlDrop]);

  // Auto-expand sidebar when external drag is active
  useEffect(() => {
    if (isDraggingOver && !sidebarAnchored) {
      // Sidebar will show via CSS when dragging over (see portal-sidebar-floating)
      // We just need to ensure it's visible during drag
    }
  }, [isDraggingOver, sidebarAnchored]);

  // Handle pawkit hover during external drag
  const handleExternalDragHover = useCallback((slug: string | null) => {
    console.log('[Portal] Hover target changed:', slug);
    setDropTargetPawkit(slug);
  }, []);

  // Filter cards based on selection
  const visibleCards = useMemo(() => {
    const nonDeletedCards = cards.filter((c) => !c._deleted);

    if (selectedPawkit) {
      // Show cards in selected pawkit
      return nonDeletedCards.filter((c) => c.collections?.includes(selectedPawkit));
    }

    // Show all cards (Library view)
    return nonDeletedCards;
  }, [cards, selectedPawkit]);

  // Get current location name for breadcrumb
  const currentLocationName = useMemo(() => {
    if (!selectedPawkit) return 'Library';
    const collection = collections.find((c) => c.slug === selectedPawkit);
    return collection?.name || 'Library';
  }, [selectedPawkit, collections]);

  // Window control handlers
  const handleClose = async () => {
    const appWindow = getCurrentWindow();
    await appWindow.hide();
  };

  const handleMinimize = async () => {
    const appWindow = getCurrentWindow();
    await appWindow.minimize();
  };

  // Start window drag on mousedown (Tauri 2 approach)
  const handleStartDrag = async (e: React.MouseEvent) => {
    // Only drag on left mouse button and not on buttons
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;

    const appWindow = getCurrentWindow();
    await appWindow.startDragging();
  };

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    const card = cards.find((c) => c.id === event.active.id);
    setActiveDragCard(card || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragCard(null);
    // TODO: Handle drop logic
  };

  if (!isReady) {
    return (
      <div className="portal-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="portal-container">
        {/* Header with drag region and window controls */}
        <header className="portal-header" onMouseDown={handleStartDrag}>
          <div className="drag-region">
            <span className="portal-title">Pawkit Portal</span>
          </div>
          <div className="window-controls">
            <button className="control-btn minimize" title="Minimize" onClick={handleMinimize}>
              <span>−</span>
            </button>
            <button className="control-btn close" title="Close" onClick={handleClose}>
              <span>×</span>
            </button>
          </div>
        </header>

        {/* Main content area */}
        <main className="portal-content relative">
          {/* Sidebar - anchored mode */}
          {sidebarAnchored && (
            <div className="portal-sidebar">
              <div className="sidebar-header">
                <span>Pawkits</span>
                <button
                  onClick={() => setSidebarAnchored(false)}
                  className="h-5 w-5 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-[var(--glass-bg)] transition-colors"
                  title="Float sidebar"
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="sidebar-list">
                <button
                  onClick={() => setSelectedPawkit(null)}
                  onMouseEnter={() => isDraggingOver && setDropTargetPawkit(null)}
                  className={`flex items-center gap-2 w-full px-2 py-2 rounded-xl text-sm text-left transition-colors ${
                    selectedPawkit === null
                      ? 'text-text-primary font-medium bg-black/5 dark:bg-white/5'
                      : 'text-text-secondary hover:text-text-primary hover:bg-[var(--glass-bg-hover)]'
                  } ${isDraggingOver && dropTargetPawkit === null ? 'ring-2 ring-inset ring-[var(--color-accent)] bg-[var(--color-accent)]/20' : ''}`}
                >
                  <Library className={`h-4 w-4 shrink-0 ${selectedPawkit === null ? 'text-[var(--color-accent)]' : ''}`} />
                  <span>Library</span>
                </button>
                <div className="mt-2">
                  <PortalPawkitsTree
                    selectedSlug={selectedPawkit}
                    onSelectPawkit={setSelectedPawkit}
                    isExternalDragActive={isDraggingOver}
                    dropTargetSlug={dropTargetPawkit}
                    onExternalDragHover={handleExternalDragHover}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Sidebar - floating mode (hover to show) */}
          {!sidebarAnchored && (
            <div className={`portal-sidebar-floating group ${isDraggingOver ? 'drag-active' : ''}`}>
              {/* Hover trigger */}
              <div className="sidebar-trigger">
                <Maximize2 className="h-4 w-4" />
              </div>
              {/* Sidebar panel */}
              <div className="sidebar-panel">
                <div className="sidebar-header">
                  <span>Pawkits</span>
                  <button
                    onClick={() => setSidebarAnchored(true)}
                    className="h-5 w-5 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-[var(--glass-bg)] transition-colors"
                    title="Anchor sidebar"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="sidebar-list">
                  <button
                    onClick={() => setSelectedPawkit(null)}
                    onMouseEnter={() => isDraggingOver && setDropTargetPawkit(null)}
                    className={`flex items-center gap-2 w-full px-2 py-2 rounded-xl text-sm text-left transition-colors ${
                      selectedPawkit === null
                        ? 'text-text-primary font-medium bg-black/5 dark:bg-white/5'
                        : 'text-text-secondary hover:text-text-primary hover:bg-[var(--glass-bg-hover)]'
                    } ${isDraggingOver && dropTargetPawkit === null ? 'ring-2 ring-inset ring-[var(--color-accent)] bg-[var(--color-accent)]/20' : ''}`}
                  >
                    <Library className={`h-4 w-4 shrink-0 ${selectedPawkit === null ? 'text-[var(--color-accent)]' : ''}`} />
                    <span>Library</span>
                  </button>
                  <div className="mt-2">
                    <PortalPawkitsTree
                      selectedSlug={selectedPawkit}
                      onSelectPawkit={setSelectedPawkit}
                      isExternalDragActive={isDraggingOver}
                      dropTargetSlug={dropTargetPawkit}
                      onExternalDragHover={handleExternalDragHover}
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
                  {selectedPawkit ? 'No cards in this pawkit' : 'No cards yet. Drag URLs here to add them.'}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {visibleCards.slice(0, 50).map((card) => (
                    <div key={card.id} className="aspect-[4/5]">
                      <PortalCardItem card={card} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Drop overlay when dragging external content - only covers cards area */}
            {isDraggingOver && (
              <div className="absolute inset-0 bg-[var(--color-accent)]/10 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg pointer-events-none">
                <div className="drop-zone">
                  <Plus className="h-6 w-6 mb-2" />
                  <span>
                    Drop to add to{' '}
                    <strong>{dropTargetPawkit ? collections.find(c => c.slug === dropTargetPawkit)?.name : (selectedPawkit ? currentLocationName : 'Library')}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Drag overlay for visual feedback */}
      <DragOverlay>
        {activeDragCard && (
          <div
            style={{
              width: 150,
              height: 180,
              opacity: 0.9,
              transform: 'rotate(-2deg)',
              pointerEvents: 'none',
            }}
          >
            <PortalCardItem card={activeDragCard} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
