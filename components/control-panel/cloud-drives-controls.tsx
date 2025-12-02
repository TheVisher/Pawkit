"use client";

import { useRouter } from "next/navigation";
import { Cloud, RefreshCw, FileText, HardDrive, CheckCircle2, XCircle, Loader2, ExternalLink, Trash2, Copy } from "lucide-react";
import { PanelSection } from "./control-panel";
import { TodosSection } from "./todos-section";
import { useConnectorStore } from "@/lib/stores/connector-store";
import { useCloudDrivesStore } from "@/lib/stores/cloud-drives-store";
import { CloudProviderItem } from "./cloud-provider-item";
import { GlowButton } from "@/components/ui/glow-button";
import { formatFileSize } from "@/lib/utils/file-utils";
import type { CloudProviderId } from "@/lib/services/cloud-storage/types";

interface ProviderInfo {
  id: CloudProviderId;
  slug: string;
  name: string;
  connected: boolean;
  email?: string;
  status: "idle" | "connecting" | "syncing" | "error";
  lastSync: Date | null;
}

export function CloudDrivesControls() {
  const router = useRouter();
  const selectedFile = useCloudDrivesStore((state) => state.selectedFile);
  const clearSelection = useCloudDrivesStore((state) => state.clearSelection);

  // Get connector states
  const filenState = useConnectorStore((state) => state.filen);
  const gdriveState = useConnectorStore((state) => state.googleDrive);
  const dropboxState = useConnectorStore((state) => state.dropbox);
  const onedriveState = useConnectorStore((state) => state.onedrive);

  // Build provider list
  const providers: ProviderInfo[] = [
    {
      id: "filen",
      slug: "filen",
      name: "Filen",
      connected: filenState.connected,
      email: filenState.config?.email,
      status: filenState.status,
      lastSync: filenState.lastSync,
    },
    {
      id: "google-drive",
      slug: "gdrive",
      name: "Google Drive",
      connected: gdriveState.connected,
      email: gdriveState.config?.email,
      status: gdriveState.status,
      lastSync: gdriveState.lastSync,
    },
    {
      id: "dropbox",
      slug: "dropbox",
      name: "Dropbox",
      connected: dropboxState.connected,
      email: dropboxState.config?.email,
      status: dropboxState.status,
      lastSync: dropboxState.lastSync,
    },
    {
      id: "onedrive",
      slug: "onedrive",
      name: "OneDrive",
      connected: onedriveState.connected,
      email: onedriveState.config?.email,
      status: onedriveState.status,
      lastSync: onedriveState.lastSync,
    },
  ];

  const connectedProviders = providers.filter((p) => p.connected);
  const disconnectedProviders = providers.filter((p) => !p.connected);

  const handleBrowse = (slug: string) => {
    router.push(`/cloud-drives/${slug}`);
  };

  const handleConnect = () => {
    router.push("/settings");
  };

  // Get most recent sync across all providers
  const lastSyncDate = connectedProviders
    .map((p) => p.lastSync)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const isSyncing = connectedProviders.some((p) => p.status === "syncing");

  return (
    <>
      {/* Todos Section - Always at top */}
      <TodosSection />

      {/* Providers Section */}
      <PanelSection
        id="cloud-providers"
        title="Providers"
        icon={<Cloud className="h-4 w-4 text-accent" />}
        action={
          <span className="text-xs text-muted-foreground">
            {connectedProviders.length}/{providers.length}
          </span>
        }
      >
        <div className="space-y-3">
          {/* Connected Providers */}
          {connectedProviders.length > 0 && (
            <div className="space-y-2">
              {connectedProviders.map((provider) => (
                <CloudProviderItem
                  key={provider.id}
                  provider={provider}
                  onBrowse={() => handleBrowse(provider.slug)}
                />
              ))}
            </div>
          )}

          {/* Divider if both connected and disconnected */}
          {connectedProviders.length > 0 && disconnectedProviders.length > 0 && (
            <div className="border-t border-white/5 my-3" />
          )}

          {/* Disconnected Providers */}
          {disconnectedProviders.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">Available</p>
              {disconnectedProviders.map((provider) => (
                <CloudProviderItem
                  key={provider.id}
                  provider={provider}
                  onConnect={handleConnect}
                />
              ))}
            </div>
          )}

          {/* Connect More Button */}
          {disconnectedProviders.length > 0 && (
            <GlowButton
              onClick={handleConnect}
              variant="primary"
              size="sm"
              className="w-full mt-2"
            >
              Connect Provider
            </GlowButton>
          )}
        </div>
      </PanelSection>

      {/* Sync Status Section */}
      {connectedProviders.length > 0 && (
        <PanelSection
          id="cloud-sync-status"
          title="Sync Status"
          icon={<RefreshCw className={`h-4 w-4 text-accent ${isSyncing ? "animate-spin" : ""}`} />}
        >
          <div className="space-y-3">
            {/* Overall Status */}
            <div className="flex items-center gap-2 text-sm">
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  <span className="text-muted-foreground">Syncing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span className="text-muted-foreground">All synced</span>
                </>
              )}
            </div>

            {/* Last Sync Time */}
            {lastSyncDate && (
              <div className="text-xs text-muted-foreground">
                Last sync: {formatRelativeTime(lastSyncDate)}
              </div>
            )}

            {/* Sync All Button */}
            <GlowButton
              onClick={() => {
                // TODO: Implement sync all
              }}
              variant="primary"
              size="sm"
              className="w-full"
              disabled={isSyncing}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync All Now"}
            </GlowButton>
          </div>
        </PanelSection>
      )}

      {/* Selected File Section */}
      {selectedFile && (
        <PanelSection
          id="cloud-selected-file"
          title="Selected File"
          icon={<FileText className="h-4 w-4 text-accent" />}
        >
          <div className="space-y-3">
            {/* File Info */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground truncate" title={selectedFile.name}>
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground truncate" title={selectedFile.path}>
                {selectedFile.path}
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{formatFileSize(selectedFile.size)}</span>
                <span>{formatRelativeTime(selectedFile.modifiedAt)}</span>
              </div>
            </div>

            {/* File Actions */}
            <div className="flex flex-col gap-2">
              <GlowButton
                onClick={() => {
                  // TODO: Implement open/download
                }}
                variant="primary"
                size="sm"
                className="w-full"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-2" />
                Open
              </GlowButton>

              <div className="flex gap-2">
                <GlowButton
                  onClick={() => {
                    // TODO: Implement copy to another provider
                  }}
                  variant="primary"
                  size="sm"
                  className="flex-1"
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copy
                </GlowButton>
                <GlowButton
                  onClick={() => {
                    // TODO: Implement delete
                  }}
                  variant="primary"
                  size="sm"
                  className="flex-1 hover:bg-red-500/20 hover:border-red-500/50"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete
                </GlowButton>
              </div>
            </div>

            {/* Clear Selection */}
            <button
              onClick={clearSelection}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear selection
            </button>
          </div>
        </PanelSection>
      )}

      {/* Empty State - No Providers Connected */}
      {connectedProviders.length === 0 && (
        <div className="text-center py-8 space-y-4">
          <HardDrive className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
          <div>
            <p className="text-sm text-muted-foreground">No cloud drives connected</p>
            <p className="text-xs text-muted-foreground mt-1">
              Connect a provider to browse and sync files
            </p>
          </div>
          <GlowButton onClick={handleConnect} variant="primary" size="sm">
            Connect Provider
          </GlowButton>
        </div>
      )}
    </>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
