"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Cloud, RefreshCw, SplitSquareHorizontal, FileText, Image as ImageIcon, Music, Film, File, Loader2, ShieldCheck, Triangle, Box } from "lucide-react";
import { GlowButton } from "@/components/ui/glow-button";
import { CloudDrivesSplitView } from "@/components/cloud-drives";
import { useConnectorStore } from "@/lib/stores/connector-store";
import { useDataStore } from "@/lib/stores/data-store";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { useCloudDrivesStore } from "@/lib/stores/cloud-drives-store";
import { formatFileSize } from "@/lib/utils/file-utils";
import type { CloudProviderId } from "@/lib/services/cloud-storage/types";

interface ProviderInfo {
  id: CloudProviderId;
  name: string;
  slug: string;
  icon: typeof Cloud;
  color: string;
}

const PROVIDERS: ProviderInfo[] = [
  { id: "filen", name: "Filen", slug: "filen", icon: ShieldCheck, color: "text-emerald-400" },
  { id: "google-drive", name: "Google Drive", slug: "gdrive", icon: Triangle, color: "text-yellow-400" },
  { id: "dropbox", name: "Dropbox", slug: "dropbox", icon: Box, color: "text-blue-400" },
  { id: "onedrive", name: "OneDrive", slug: "onedrive", icon: Cloud, color: "text-sky-400" },
];

function getFileIcon(type: string) {
  switch (type) {
    case "md-note":
    case "text-note":
      return <FileText className="h-4 w-4 text-purple-400" />;
    case "image":
      return <ImageIcon className="h-4 w-4 text-pink-400" />;
    case "audio":
      return <Music className="h-4 w-4 text-green-400" />;
    case "video":
      return <Film className="h-4 w-4 text-blue-400" />;
    default:
      return <File className="h-4 w-4 text-gray-400" />;
  }
}

function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "Never";
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return "Never";

  const now = new Date();
  const diff = now.getTime() - dateObj.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return dateObj.toLocaleDateString();
}

export default function CloudDrivesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [showSplitView, setShowSplitView] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Check for split view query param
  useEffect(() => {
    if (searchParams.get("split") === "true") {
      setShowSplitView(true);
    }
  }, [searchParams]);

  const filenState = useConnectorStore((state) => state.filen);
  const gdriveState = useConnectorStore((state) => state.googleDrive);
  const dropboxState = useConnectorStore((state) => state.dropbox);
  const onedriveState = useConnectorStore((state) => state.onedrive);

  const openCloudDrivesControls = usePanelStore((state) => state.openCloudDrivesControls);
  const setSelectedFile = useCloudDrivesStore((state) => state.setSelectedFile);

  const cards = useDataStore((state) => state.cards);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Open the cloud drives sidebar when this page loads
  useEffect(() => {
    openCloudDrivesControls();
  }, [openCloudDrivesControls]);

  const getProviderState = (id: string) => {
    switch (id) {
      case "filen":
        return filenState;
      case "google-drive":
        return gdriveState;
      case "dropbox":
        return dropboxState;
      case "onedrive":
        return onedriveState;
      default:
        return { connected: false, lastSync: null, config: null, status: "idle" as const };
    }
  };

  const connectedProviders = PROVIDERS.filter((p) => getProviderState(p.id).connected);

  // Get recent synced files - cards that have cloudId (synced to at least one provider)
  const recentSyncedFiles = useMemo(() => {
    if (!cards) return [];

    return cards
      .filter((card) => card.cloudId && card.cloudProvider && !card.deleted)
      .sort((a, b) => {
        const aDate = a.cloudSyncedAt ? new Date(a.cloudSyncedAt).getTime() : 0;
        const bDate = b.cloudSyncedAt ? new Date(b.cloudSyncedAt).getTime() : 0;
        return bDate - aDate;
      })
      .slice(0, 20);
  }, [cards]);

  const handleSyncAll = async () => {
    setIsSyncing(true);
    // Trigger sync by dispatching event (the useCloudSync hook will handle it)
    window.dispatchEvent(new CustomEvent("pawkit:trigger-sync"));
    // Show syncing for a bit
    setTimeout(() => setIsSyncing(false), 3000);
  };

  const handleOpenSplitView = () => {
    setShowSplitView(true);
    router.push("/cloud-drives?split=true", { scroll: false });
  };

  const handleCloseSplitView = () => {
    setShowSplitView(false);
    router.push("/cloud-drives", { scroll: false });
  };

  const handleFileClick = (card: typeof recentSyncedFiles[0]) => {
    // Convert card to CloudFile format for the sidebar
    const cloudFile = {
      cloudId: card.cloudId!,
      name: card.title || "Untitled",
      path: `/${card.cloudProvider}/${card.title || "Untitled"}`,
      size: card.content?.length || 0,
      mimeType: card.type === "md-note" ? "text/markdown" : "text/plain",
      modifiedAt: new Date(card.updatedAt),
      provider: card.cloudProvider as CloudProviderId,
      isFolder: false,
    };
    setSelectedFile(cloudFile);
  };

  const getProviderInfo = (providerId: string) => {
    return PROVIDERS.find((p) => p.id === providerId);
  };

  if (!mounted) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-800 rounded w-48 mb-6" />
          <div className="h-64 bg-gray-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Show split view if enabled
  if (showSplitView) {
    return <CloudDrivesSplitView onClose={handleCloseSplitView} />;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20 border border-purple-500/30">
            <Cloud className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Cloud Drives</h1>
            <p className="text-sm text-gray-400">
              {connectedProviders.length} of {PROVIDERS.length} providers connected
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {connectedProviders.length >= 2 && (
            <GlowButton onClick={handleOpenSplitView} variant="primary" size="md">
              <SplitSquareHorizontal className="h-4 w-4 mr-2" />
              Split View
            </GlowButton>
          )}
          <GlowButton
            onClick={handleSyncAll}
            variant="primary"
            size="md"
            disabled={isSyncing || connectedProviders.length === 0}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync All"}
          </GlowButton>
        </div>
      </div>

      {/* Recent Files Section */}
      {connectedProviders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Recent Files
          </h2>

          {recentSyncedFiles.length > 0 ? (
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden overflow-x-auto">
              {/* Table Header - dynamic columns based on connected providers */}
              <div
                className="grid gap-4 px-4 py-3 border-b border-white/10 text-xs font-medium text-gray-400 uppercase tracking-wider min-w-fit"
                style={{
                  gridTemplateColumns: `1fr 80px 80px ${connectedProviders.map(() => '60px').join(' ')} 90px`
                }}
              >
                <div>Name</div>
                <div>Type</div>
                <div>Size</div>
                {connectedProviders.map((provider) => {
                  const ProviderIcon = provider.icon;
                  return (
                    <div key={provider.id} className="flex items-center justify-center" title={provider.name}>
                      <ProviderIcon className={`h-4 w-4 ${provider.color}`} />
                    </div>
                  );
                })}
                <div>Synced</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-white/5">
                {recentSyncedFiles.map((file) => {
                  return (
                    <div
                      key={file.id}
                      onClick={() => handleFileClick(file)}
                      className="grid gap-4 px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors min-w-fit"
                      style={{
                        gridTemplateColumns: `1fr 80px 80px ${connectedProviders.map(() => '60px').join(' ')} 90px`
                      }}
                    >
                      {/* Name */}
                      <div className="flex items-center gap-3 min-w-0">
                        {getFileIcon(file.type)}
                        <span className="text-sm text-foreground truncate">
                          {file.title || "Untitled"}
                        </span>
                      </div>

                      {/* Type */}
                      <div className="text-sm text-muted-foreground capitalize">
                        {file.type === "md-note" ? "Note" : file.type.replace("-", " ")}
                      </div>

                      {/* Size */}
                      <div className="text-sm text-muted-foreground">
                        {formatFileSize(file.content?.length || 0)}
                      </div>

                      {/* Per-provider sync status */}
                      {connectedProviders.map((provider) => {
                        const isSynced = file.cloudProvider === provider.id;
                        return (
                          <div key={provider.id} className="flex items-center justify-center">
                            {isSynced ? (
                              <span className={`text-lg ${provider.color}`} title={`Synced to ${provider.name}`}>●</span>
                            ) : (
                              <span className="text-lg text-white/20" title={`Not synced to ${provider.name}`}>○</span>
                            )}
                          </div>
                        );
                      })}

                      {/* Synced */}
                      <div className="text-sm text-muted-foreground">
                        {formatRelativeTime(file.cloudSyncedAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-12 text-center">
              <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No synced files yet</h3>
              <p className="text-gray-400 max-w-md mx-auto">
                Files you upload or create will appear here with their sync status.
                Notes are automatically synced to your connected cloud providers.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty state - no providers connected */}
      {connectedProviders.length === 0 && (
        <div className="text-center py-16">
          <Cloud className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No cloud drives connected</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Connect a cloud storage provider to browse and sync your files.
            Your notes will be automatically backed up to the cloud.
          </p>
          <GlowButton onClick={() => router.push("/settings")} variant="primary" size="lg">
            Connect Provider
          </GlowButton>
        </div>
      )}

      {/* Tip */}
      {connectedProviders.length >= 2 && (
        <div className="mt-8 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
          <p className="text-sm text-purple-300">
            <span className="font-medium">Tip:</span> Use Split View to copy files between providers by dragging and dropping.
          </p>
        </div>
      )}
    </div>
  );
}
