"use client";

import { useState } from "react";
import { ConnectorCard, ConnectorStatus } from "./connector-card";
import { FilenConnectModal } from "./filen-connect-modal";
import { FilenIcon, GoogleCalendarIcon, GoogleDriveIcon } from "./connector-icons";
import { useConnectorStore } from "@/lib/stores/connector-store";
import { filenService } from "@/lib/services/filen-service";
import { useToastStore } from "@/lib/stores/toast-store";

export function ConnectorsSection() {
  const [showFilenModal, setShowFilenModal] = useState(false);

  const filenState = useConnectorStore((state) => state.filen);
  const setFilenDisconnected = useConnectorStore((state) => state.setFilenDisconnected);

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

        {/* Google Drive - Coming Soon */}
        <ConnectorCard
          name="Google Drive"
          description="Access and sync files from Google Drive"
          icon={<GoogleDriveIcon />}
          status="coming_soon"
          category="Storage"
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
