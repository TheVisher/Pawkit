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

export interface DropboxConfig {
  email: string;
  name?: string;
}

export interface DropboxState {
  connected: boolean;
  lastSync: Date | null;
  config: DropboxConfig | null;
  status: "idle" | "connecting" | "syncing" | "error";
  errorMessage: string | null;
}

export interface OneDriveConfig {
  email: string;
  name?: string;
}

export interface OneDriveState {
  connected: boolean;
  lastSync: Date | null;
  config: OneDriveConfig | null;
  status: "idle" | "connecting" | "syncing" | "error";
  errorMessage: string | null;
}

export interface ConnectorState {
  filen: FilenState;
  googleDrive: GoogleDriveState;
  dropbox: DropboxState;
  onedrive: OneDriveState;
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

  // Dropbox actions
  setDropboxConnecting: () => void;
  setDropboxConnected: (email: string, name?: string) => void;
  setDropboxDisconnected: () => void;
  setDropboxError: (message: string) => void;
  setDropboxSyncing: () => void;
  setDropboxSynced: () => void;

  // OneDrive actions
  setOneDriveConnecting: () => void;
  setOneDriveConnected: (email: string, name?: string) => void;
  setOneDriveDisconnected: () => void;
  setOneDriveError: (message: string) => void;
  setOneDriveSyncing: () => void;
  setOneDriveSynced: () => void;

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

const initialDropboxState: DropboxState = {
  connected: false,
  lastSync: null,
  config: null,
  status: "idle",
  errorMessage: null,
};

const initialOneDriveState: OneDriveState = {
  connected: false,
  lastSync: null,
  config: null,
  status: "idle",
  errorMessage: null,
};

const initialState: ConnectorState = {
  filen: initialFilenState,
  googleDrive: initialGDriveState,
  dropbox: initialDropboxState,
  onedrive: initialOneDriveState,
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

      // Dropbox actions
      setDropboxConnecting: () =>
        set((state) => ({
          dropbox: {
            ...state.dropbox,
            status: "connecting",
            errorMessage: null,
          },
        })),

      setDropboxConnected: (email: string, name?: string) =>
        set((state) => ({
          dropbox: {
            ...state.dropbox,
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

      setDropboxDisconnected: () =>
        set({
          dropbox: initialDropboxState,
        }),

      setDropboxError: (message: string) =>
        set((state) => ({
          dropbox: {
            ...state.dropbox,
            status: "error",
            errorMessage: message,
          },
        })),

      setDropboxSyncing: () =>
        set((state) => ({
          dropbox: {
            ...state.dropbox,
            status: "syncing",
          },
        })),

      setDropboxSynced: () =>
        set((state) => ({
          dropbox: {
            ...state.dropbox,
            status: "idle",
            lastSync: new Date(),
          },
        })),

      // OneDrive actions
      setOneDriveConnecting: () =>
        set((state) => ({
          onedrive: {
            ...state.onedrive,
            status: "connecting",
            errorMessage: null,
          },
        })),

      setOneDriveConnected: (email: string, name?: string) =>
        set((state) => ({
          onedrive: {
            ...state.onedrive,
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

      setOneDriveDisconnected: () =>
        set({
          onedrive: initialOneDriveState,
        }),

      setOneDriveError: (message: string) =>
        set((state) => ({
          onedrive: {
            ...state.onedrive,
            status: "error",
            errorMessage: message,
          },
        })),

      setOneDriveSyncing: () =>
        set((state) => ({
          onedrive: {
            ...state.onedrive,
            status: "syncing",
          },
        })),

      setOneDriveSynced: () =>
        set((state) => ({
          onedrive: {
            ...state.onedrive,
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
        dropbox: {
          connected: state.dropbox.connected,
          lastSync: state.dropbox.lastSync,
          config: state.dropbox.config
            ? {
                email: state.dropbox.config.email,
                name: state.dropbox.config.name,
              }
            : null,
        },
        onedrive: {
          connected: state.onedrive.connected,
          lastSync: state.onedrive.lastSync,
          config: state.onedrive.config
            ? {
                email: state.onedrive.config.email,
                name: state.onedrive.config.name,
              }
            : null,
        },
        googleCalendar: state.googleCalendar,
      }),
    }
  )
);
