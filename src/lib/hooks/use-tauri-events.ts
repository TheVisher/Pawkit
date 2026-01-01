'use client';

import { useEffect } from 'react';
import { db } from '@/lib/db';
import { useDataStore } from '@/lib/stores/data-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { createModuleLogger } from '@/lib/utils/logger';
import { processDroppedUrl } from '@/lib/utils/url-normalizer';

const log = createModuleLogger('TauriEvents');

/**
 * Notify the portal window that data has changed
 * Uses Tauri events since BroadcastChannel doesn't work across origins
 */
async function notifyPortalDataChanged() {
  if (typeof window === 'undefined' || !window.__TAURI__) return;

  try {
    // Use window.__TAURI__ since the main app doesn't have @tauri-apps/api installed
    const { invoke } = window.__TAURI__.core;
    await invoke('notify_portal_data_changed');
    log.info('Notified portal of data change');
  } catch (error) {
    log.error('Failed to notify portal:', error);
  }
}

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
          const { url: rawUrl, collection_slug } = event.payload;
          log.info('Received URL from portal:', rawUrl, '-> collection:', collection_slug || 'Library');

          // Process the URL - convert image/thumbnail URLs to page URLs where possible
          const { url, warning } = processDroppedUrl(rawUrl);
          if (warning) {
            log.warn(warning);
          }
          if (url !== rawUrl) {
            log.info('URL converted:', rawUrl, '→', url);
          }

          // Get fresh values at event time (not stale closure values)
          const workspace = useWorkspaceStore.getState().currentWorkspace;
          const createCard = useDataStore.getState().createCard;

          if (!workspace) {
            log.warn('No workspace available yet, ignoring drop');
            return;
          }

          // Find collection from Dexie if slug provided
          const targetCollections: string[] = [];
          if (collection_slug) {
            const collection = await db.collections
              .where('workspaceId')
              .equals(workspace.id)
              .filter((c) => c.slug === collection_slug && !c._deleted)
              .first();
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
            log.info('Card created from portal URL');

            // Notify portal to refresh its view via Tauri event
            await notifyPortalDataChanged();
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
