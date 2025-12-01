"use client";

import { useState, useEffect } from "react";
import { ConnectorCard, ConnectorStatus } from "./connector-card";
import { FilenConnectModal } from "./filen-connect-modal";
import { FilenIcon, GoogleCalendarIcon, GoogleDriveIcon, DropboxIcon } from "./connector-icons";
import { useConnectorStore } from "@/lib/stores/connector-store";
import { filenService } from "@/lib/services/filen-service";
import { useToastStore } from "@/lib/stores/toast-store";
import { gdriveProvider } from "@/lib/services/google-drive/gdrive-provider";
import { dropboxProvider } from "@/lib/services/dropbox/dropbox-provider";

export function ConnectorsSection() {
  const [showFilenModal, setShowFilenModal] = useState(false);
  const [gdriveLoading, setGdriveLoading] = useState(false);
  const [dropboxLoading, setDropboxLoading] = useState(false);

  const filenState = useConnectorStore((state) => state.filen);
  const gdriveState = useConnectorStore((state) => state.googleDrive);
  const dropboxState = useConnectorStore((state) => state.dropbox);
  const setFilenDisconnected = useConnectorStore((state) => state.setFilenDisconnected);
  const setGDriveConnected = useConnectorStore((state) => state.setGDriveConnected);
  const setGDriveDisconnected = useConnectorStore((state) => state.setGDriveDisconnected);
  const setDropboxConnected = useConnectorStore((state) => state.setDropboxConnected);
  const setDropboxDisconnected = useConnectorStore((state) => state.setDropboxDisconnected);

  // Check Google Drive connection status on mount and after OAuth callback
  useEffect(() => {
    const checkGDriveStatus = async () => {
      try {
        const status = await gdriveProvider.checkConnection();
        if (status.connected && status.email) {
          setGDriveConnected(status.email);
          // Initialize folder structure in background
          gdriveProvider.initializeFolders().catch(console.error);
        }
      } catch {
        // Ignore - not connected
      }
    };

    // Check on mount
    checkGDriveStatus();

    // Also check if we just came back from OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const gdriveResult = urlParams.get("gdrive");
    if (gdriveResult === "connected") {
      const email = urlParams.get("email");
      if (email) {
        setGDriveConnected(decodeURIComponent(email));
        useToastStore.getState().success("Connected to Google Drive!");
        // Initialize folder structure after OAuth
        useToastStore.getState().info("Setting up folder structure...");
        gdriveProvider.initializeFolders().then(() => {
          useToastStore.getState().success("Google Drive folders ready!");
        }).catch((err) => {
          console.error("[GDrive] Failed to initialize folders:", err);
        });
      }
      // Clear the URL params
      window.history.replaceState({}, "", window.location.pathname);
    } else if (gdriveResult === "error") {
      const message = urlParams.get("message") || "Connection failed";
      useToastStore.getState().error(`Google Drive: ${message}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [setGDriveConnected]);

  // Check Dropbox connection status on mount and after OAuth callback
  useEffect(() => {
    const checkDropboxStatus = async () => {
      try {
        const status = await dropboxProvider.checkConnection();
        if (status.connected && status.email) {
          setDropboxConnected(status.email);
          // Initialize folder structure in background
          dropboxProvider.initializeFolders().catch(console.error);
        }
      } catch {
        // Ignore - not connected
      }
    };

    // Check on mount
    checkDropboxStatus();

    // Also check if we just came back from OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const dropboxResult = urlParams.get("dropbox");
    if (dropboxResult === "connected") {
      const email = urlParams.get("email");
      if (email) {
        setDropboxConnected(decodeURIComponent(email));
        useToastStore.getState().success("Connected to Dropbox!");
        // Initialize folder structure after OAuth
        useToastStore.getState().info("Setting up folder structure...");
        dropboxProvider.initializeFolders().then(() => {
          useToastStore.getState().success("Dropbox folders ready!");
        }).catch((err) => {
          console.error("[Dropbox] Failed to initialize folders:", err);
        });
      }
      // Clear the URL params
      window.history.replaceState({}, "", window.location.pathname);
    } else if (dropboxResult === "error") {
      const message = urlParams.get("message") || "Connection failed";
      useToastStore.getState().error(`Dropbox: ${message}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [setDropboxConnected]);

  // Determine Filen connector status
  const getFilenStatus = (): ConnectorStatus => {
    if (filenState.status === "connecting" || filenState.status === "syncing") {
      return "syncing";
    }
    if (filenState.status === "error") {
      return "error";
    }
    if (filenState.connected) {
      return "connected";
    }
    return "disconnected";
  };

  const handleFilenDisconnect = async () => {
    try {
      // Logout from server (clears HTTP-only cookie)
      await filenService.logout();
      setFilenDisconnected();
      useToastStore.getState().success("Disconnected from Filen");
    } catch {
      useToastStore.getState().error("Failed to disconnect");
    }
  };

  const handleFilenSettings = () => {
    // TODO: Open Filen settings modal (sync folder selection, etc.)
    useToastStore.getState().info("Filen settings coming soon");
  };

  // Determine Google Drive connector status
  const getGDriveStatus = (): ConnectorStatus => {
    if (gdriveLoading || gdriveState.status === "connecting" || gdriveState.status === "syncing") {
      return "syncing";
    }
    if (gdriveState.status === "error") {
      return "error";
    }
    if (gdriveState.connected) {
      return "connected";
    }
    return "disconnected";
  };

  const handleGDriveConnect = () => {
    setGdriveLoading(true);
    // Redirect to OAuth flow
    window.location.href = "/api/auth/gdrive";
  };

  const handleGDriveDisconnect = async () => {
    try {
      setGdriveLoading(true);
      await gdriveProvider.disconnect();
      setGDriveDisconnected();
      useToastStore.getState().success("Disconnected from Google Drive");
    } catch {
      useToastStore.getState().error("Failed to disconnect");
    } finally {
      setGdriveLoading(false);
    }
  };

  const handleGDriveSettings = () => {
    useToastStore.getState().info("Google Drive settings coming soon");
  };

  // Determine Dropbox connector status
  const getDropboxStatus = (): ConnectorStatus => {
    if (dropboxLoading || dropboxState.status === "connecting" || dropboxState.status === "syncing") {
      return "syncing";
    }
    if (dropboxState.status === "error") {
      return "error";
    }
    if (dropboxState.connected) {
      return "connected";
    }
    return "disconnected";
  };

  const handleDropboxConnect = () => {
    setDropboxLoading(true);
    // Redirect to OAuth flow
    window.location.href = "/api/auth/dropbox";
  };

  const handleDropboxDisconnect = async () => {
    try {
      setDropboxLoading(true);
      await dropboxProvider.disconnect();
      setDropboxDisconnected();
      useToastStore.getState().success("Disconnected from Dropbox");
    } catch {
      useToastStore.getState().error("Failed to disconnect");
    } finally {
      setDropboxLoading(false);
    }
  };

  const handleDropboxSettings = () => {
    useToastStore.getState().info("Dropbox settings coming soon");
  };

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-100">Connectors</h2>
      <p className="text-sm text-gray-400 mb-4">
        Connect external services to sync your data across devices.
      </p>

      <div className="space-y-4">
        {/* Filen Connector */}
        <ConnectorCard
          name="Filen"
          description="End-to-end encrypted cloud storage for file sync"
          icon={<FilenIcon />}
          status={getFilenStatus()}
          category="Storage"
          lastSync={filenState.lastSync}
          onConnect={() => setShowFilenModal(true)}
          onDisconnect={handleFilenDisconnect}
          onSettings={handleFilenSettings}
        />

        {/* Google Calendar - Coming Soon */}
        <ConnectorCard
          name="Google Calendar"
          description="Sync events with Google Calendar"
          icon={<GoogleCalendarIcon />}
          status="coming_soon"
          category="Calendar"
        />

        {/* Google Drive Connector */}
        <ConnectorCard
          name="Google Drive"
          description="Sync files with Google Drive"
          icon={<GoogleDriveIcon />}
          status={getGDriveStatus()}
          category="Storage"
          lastSync={gdriveState.lastSync}
          onConnect={handleGDriveConnect}
          onDisconnect={handleGDriveDisconnect}
          onSettings={handleGDriveSettings}
        />

        {/* Dropbox Connector */}
        <ConnectorCard
          name="Dropbox"
          description="Sync files with Dropbox"
          icon={<DropboxIcon />}
          status={getDropboxStatus()}
          category="Storage"
          lastSync={dropboxState.lastSync}
          onConnect={handleDropboxConnect}
          onDisconnect={handleDropboxDisconnect}
          onSettings={handleDropboxSettings}
        />
      </div>

      {/* Filen Connect Modal */}
      <FilenConnectModal
        open={showFilenModal}
        onClose={() => setShowFilenModal(false)}
      />
    </section>
  );
}
