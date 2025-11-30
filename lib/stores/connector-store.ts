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

export interface GoogleDriveConfig {
  email: string;
  name?: string;
}

export interface GoogleDriveState {
  connected: boolean;
  lastSync: Date | null;
  config: GoogleDriveConfig | null;
  status: "idle" | "connecting" | "syncing" | "error";
  errorMessage: string | null;
}

export interface ConnectorState {
  filen: FilenState;
  googleDrive: GoogleDriveState;
  // Future connectors
  googleCalendar: { connected: boolean; lastSync: Date | null };
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

  // Google Drive actions
  setGDriveConnecting: () => void;
  setGDriveConnected: (email: string, name?: string) => void;
  setGDriveDisconnected: () => void;
  setGDriveError: (message: string) => void;
  setGDriveSyncing: () => void;
  setGDriveSynced: () => void;

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

const initialGDriveState: GoogleDriveState = {
  connected: false,
  lastSync: null,
  config: null,
  status: "idle",
  errorMessage: null,
};

const initialState: ConnectorState = {
  filen: initialFilenState,
  googleDrive: initialGDriveState,
  googleCalendar: { connected: false, lastSync: null },
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

      // Google Drive actions
      setGDriveConnecting: () =>
        set((state) => ({
          googleDrive: {
            ...state.googleDrive,
            status: "connecting",
            errorMessage: null,
          },
        })),

      setGDriveConnected: (email: string, name?: string) =>
        set((state) => ({
          googleDrive: {
            ...state.googleDrive,
            connected: true,
            status: "idle",
            errorMessage: null,
            config: {
              email,
              name,
            },
            lastSync: new Date(),
          },
        })),

      setGDriveDisconnected: () =>
        set({
          googleDrive: initialGDriveState,
        }),

      setGDriveError: (message: string) =>
        set((state) => ({
          googleDrive: {
            ...state.googleDrive,
            status: "error",
            errorMessage: message,
          },
        })),

      setGDriveSyncing: () =>
        set((state) => ({
          googleDrive: {
            ...state.googleDrive,
            status: "syncing",
          },
        })),

      setGDriveSynced: () =>
        set((state) => ({
          googleDrive: {
            ...state.googleDrive,
            status: "idle",
            lastSync: new Date(),
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
        googleDrive: {
          connected: state.googleDrive.connected,
          lastSync: state.googleDrive.lastSync,
          config: state.googleDrive.config
            ? {
                email: state.googleDrive.config.email,
                name: state.googleDrive.config.name,
              }
            : null,
        },
        googleCalendar: state.googleCalendar,
      }),
    }
  )
);
