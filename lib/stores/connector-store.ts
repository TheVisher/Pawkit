import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PawkitFolderKey } from "@/lib/services/cloud-storage/folder-config";

// Folder UUIDs mapped by folder key (stored in localStorage, not cookie)
export type PawkitFolderUUIDs = Partial<Record<PawkitFolderKey, string>>;

export interface FilenConfig {
  email: string;
  syncFolder?: string;
  folderUUIDs?: PawkitFolderUUIDs; // Stored locally, not in session cookie
}

export interface FilenState {
  connected: boolean;
  lastSync: Date | null;
  config: FilenConfig | null;
  status: "idle" | "connecting" | "syncing" | "error";
  errorMessage: string | null;
}

export interface ConnectorState {
  filen: FilenState;
  // Future connectors
  googleCalendar: { connected: boolean; lastSync: Date | null };
  googleDrive: { connected: boolean; lastSync: Date | null };
}

interface ConnectorActions {
  // Filen actions
  setFilenConnecting: () => void;
  setFilenConnected: (email: string) => void;
  setFilenDisconnected: () => void;
  setFilenError: (message: string) => void;
  setFilenSyncing: () => void;
  setFilenSynced: () => void;
  setFilenConfig: (config: Partial<FilenConfig>) => void;

  // General
  reset: () => void;
}

const initialFilenState: FilenState = {
  connected: false,
  lastSync: null,
  config: null,
  status: "idle",
  errorMessage: null,
};

const initialState: ConnectorState = {
  filen: initialFilenState,
  googleCalendar: { connected: false, lastSync: null },
  googleDrive: { connected: false, lastSync: null },
};

export const useConnectorStore = create<ConnectorState & ConnectorActions>()(
  persist(
    (set) => ({
      ...initialState,

      setFilenConnecting: () =>
        set((state) => ({
          filen: {
            ...state.filen,
            status: "connecting",
            errorMessage: null,
          },
        })),

      setFilenConnected: (email: string) =>
        set((state) => ({
          filen: {
            ...state.filen,
            connected: true,
            status: "idle",
            errorMessage: null,
            config: {
              ...state.filen.config,
              email,
            },
            lastSync: new Date(),
          },
        })),

      setFilenDisconnected: () =>
        set({
          filen: initialFilenState,
        }),

      setFilenError: (message: string) =>
        set((state) => ({
          filen: {
            ...state.filen,
            status: "error",
            errorMessage: message,
          },
        })),

      setFilenSyncing: () =>
        set((state) => ({
          filen: {
            ...state.filen,
            status: "syncing",
          },
        })),

      setFilenSynced: () =>
        set((state) => ({
          filen: {
            ...state.filen,
            status: "idle",
            lastSync: new Date(),
          },
        })),

      setFilenConfig: (config: Partial<FilenConfig>) =>
        set((state) => ({
          filen: {
            ...state.filen,
            config: state.filen.config
              ? { ...state.filen.config, ...config }
              : { email: "", ...config },
          },
        })),

      reset: () => set(initialState),
    }),
    {
      name: "pawkit-connectors",
      // Only persist non-sensitive data
      partialize: (state) => ({
        filen: {
          connected: state.filen.connected,
          lastSync: state.filen.lastSync,
          config: state.filen.config
            ? {
                email: state.filen.config.email,
                syncFolder: state.filen.config.syncFolder,
                folderUUIDs: state.filen.config.folderUUIDs, // Persist folder UUIDs locally
              }
            : null,
        },
        googleCalendar: state.googleCalendar,
        googleDrive: state.googleDrive,
      }),
    }
  )
);
