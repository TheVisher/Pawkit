'use client';

import { useEffect } from 'react';
import { useDataStore } from '@/lib/stores/data-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('TauriEvents');

/**
 * Hook to listen for Tauri events from the desktop app
 * Handles events like URLs dropped in the Portal window
 */
export function useTauriEvents() {
  useEffect(() => {
    // Only run in Tauri context
    if (typeof window === 'undefined' || !window.__TAURI__) {
      return;
    }

    let unlisten: (() => void) | undefined;

    async function setupListener() {
      try {
        const { listen } = window.__TAURI__.event;

        // Listen for URLs dropped in the Portal window
        interface PortalDropPayload {
          url: string;
          collection_slug: string | null;
        }

        unlisten = await listen<PortalDropPayload>('add-url-from-portal', async (event) => {
          const { url, collection_slug } = event.payload;
          log.info('Received URL from portal:', url, '-> collection:', collection_slug || 'Library');

          // Get fresh values from stores at event time (not stale closure values)
          const workspace = useWorkspaceStore.getState().currentWorkspace;
          const createCard = useDataStore.getState().createCard;
          const collections = useDataStore.getState().collections;

          if (!workspace) {
            log.warn('No workspace available yet, ignoring drop');
            return;
          }

          // Find collection ID from slug if provided
          const targetCollections: string[] = [];
          if (collection_slug) {
            const collection = collections.find((c) => c.slug === collection_slug);
            if (collection) {
              targetCollections.push(collection.slug);
            }
          }

          try {
            // Create a URL card
            // Sync happens automatically after metadata is fetched (in metadata-service.ts)
            await createCard({
              type: 'url',
              url: url,
              title: url, // Will be updated by metadata fetcher
              content: '',
              workspaceId: workspace.id,
              collections: targetCollections,
              tags: [],
              pinned: false,
              status: 'PENDING', // Triggers metadata fetching
            });
            log.info('Card created from portal URL - metadata fetch will trigger sync');

            // Broadcast to portal to refresh its view
            if ('BroadcastChannel' in window) {
              const channel = new BroadcastChannel('pawkit-sync');
              channel.postMessage({ type: 'data-changed', source: 'portal-drop' });
              channel.close();
              log.info('Broadcast data-changed to portal');
            }
          } catch (error) {
            log.error('Failed to create card from portal:', error);
          }
        });

        log.info('Tauri event listeners registered');
      } catch (error) {
        log.error('Failed to setup Tauri listeners:', error);
      }
    }

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []); // No dependencies - listener is stable, gets fresh state at event time
}

// Add Tauri types to window
declare global {
  interface Window {
    __TAURI__?: {
      event: {
        listen: <T>(event: string, handler: (event: { payload: T }) => void) => Promise<() => void>;
      };
      core: {
        invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
      };
      window: {
        getCurrentWindow: () => { hide: () => Promise<void> };
      };
      clipboardManager: {
        readText: () => Promise<string>;
        writeText: (text: string) => Promise<void>;
      };
    };
  }
}
