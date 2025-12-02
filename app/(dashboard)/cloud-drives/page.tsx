"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Cloud, Plus } from "lucide-react";
import { GlowButton } from "@/components/ui/glow-button";
import { CloudDriveCard } from "@/components/cloud-drives";
import { useConnectorStore } from "@/lib/stores/connector-store";
import { usePanelStore } from "@/lib/hooks/use-panel-store";

interface ProviderInfo {
  id: "filen" | "google-drive" | "dropbox" | "onedrive";
  name: string;
  slug: string;
}

const PROVIDERS: ProviderInfo[] = [
  { id: "filen", name: "Filen", slug: "filen" },
  { id: "google-drive", name: "Google Drive", slug: "gdrive" },
  { id: "dropbox", name: "Dropbox", slug: "dropbox" },
  { id: "onedrive", name: "OneDrive", slug: "onedrive" },
];

export default function CloudDrivesPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const filenState = useConnectorStore((state) => state.filen);
  const gdriveState = useConnectorStore((state) => state.googleDrive);
  const dropboxState = useConnectorStore((state) => state.dropbox);
  const onedriveState = useConnectorStore((state) => state.onedrive);

  const openCloudDrivesControls = usePanelStore((state) => state.openCloudDrivesControls);

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

  const handleBrowse = (slug: string) => {
    router.push(`/cloud-drives/${slug}`);
  };

  const handleConnect = () => {
    // Open profile modal to connectors tab
    // For now, navigate to settings or show a message
    router.push("/settings");
  };

  const connectedProviders = PROVIDERS.filter((p) => getProviderState(p.id).connected);
  const disconnectedProviders = PROVIDERS.filter((p) => !getProviderState(p.id).connected);

  if (!mounted) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-800 rounded w-48 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-800 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
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
        <GlowButton onClick={handleConnect} variant="primary" size="md">
          <Plus className="h-4 w-4 mr-2" />
          Connect Provider
        </GlowButton>
      </div>

      {/* Connected Providers */}
      {connectedProviders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
            Connected
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {connectedProviders.map((provider) => {
              const state = getProviderState(provider.id);
              return (
                <CloudDriveCard
                  key={provider.id}
                  providerId={provider.id}
                  name={provider.name}
                  connected={true}
                  email={state.config?.email}
                  lastSync={state.lastSync}
                  status={state.status}
                  onBrowse={() => handleBrowse(provider.slug)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Disconnected Providers */}
      {disconnectedProviders.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
            Not Connected
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {disconnectedProviders.map((provider) => (
              <CloudDriveCard
                key={provider.id}
                providerId={provider.id}
                name={provider.name}
                connected={false}
                onConnect={handleConnect}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {connectedProviders.length === 0 && (
        <div className="text-center py-16">
          <Cloud className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No cloud drives connected</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Connect a cloud storage provider to browse and manage your files synced from Pawkit.
          </p>
          <GlowButton onClick={handleConnect} variant="primary" size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Connect Your First Provider
          </GlowButton>
        </div>
      )}
    </div>
  );
}
