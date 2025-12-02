"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { CloudFileExplorer } from "@/components/cloud-drives";
import { GlowButton } from "@/components/ui/glow-button";
import { useConnectorStore } from "@/lib/stores/connector-store";
import type { CloudProviderId } from "@/lib/services/cloud-storage/types";

interface ProviderConfig {
  id: CloudProviderId;
  name: string;
}

const PROVIDER_MAP: Record<string, ProviderConfig> = {
  filen: { id: "filen", name: "Filen" },
  gdrive: { id: "google-drive", name: "Google Drive" },
  dropbox: { id: "dropbox", name: "Dropbox" },
  onedrive: { id: "onedrive", name: "OneDrive" },
};

export default function CloudDriveExplorerPage() {
  const params = useParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const providerSlug = params.provider as string;
  const providerConfig = PROVIDER_MAP[providerSlug];

  const filenState = useConnectorStore((state) => state.filen);
  const gdriveState = useConnectorStore((state) => state.googleDrive);
  const dropboxState = useConnectorStore((state) => state.dropbox);
  const onedriveState = useConnectorStore((state) => state.onedrive);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isConnected = () => {
    if (!providerConfig) return false;
    switch (providerConfig.id) {
      case "filen":
        return filenState.connected;
      case "google-drive":
        return gdriveState.connected;
      case "dropbox":
        return dropboxState.connected;
      case "onedrive":
        return onedriveState.connected;
      default:
        return false;
    }
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Invalid provider
  if (!providerConfig) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <h2 className="text-xl font-medium text-white mb-2">Provider Not Found</h2>
        <p className="text-gray-400 mb-6">
          The cloud provider &quot;{providerSlug}&quot; is not recognized.
        </p>
        <GlowButton onClick={() => router.push("/cloud-drives")} variant="primary">
          Back to Cloud Drives
        </GlowButton>
      </div>
    );
  }

  // Not connected
  if (!isConnected()) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <AlertCircle className="h-12 w-12 text-yellow-400 mb-4" />
        <h2 className="text-xl font-medium text-white mb-2">Not Connected</h2>
        <p className="text-gray-400 mb-6">
          You need to connect to {providerConfig.name} before browsing files.
        </p>
        <div className="flex gap-3">
          <GlowButton onClick={() => router.push("/cloud-drives")} variant="primary">
            Back to Cloud Drives
          </GlowButton>
          <GlowButton onClick={() => router.push("/settings")} variant="primary">
            Connect Provider
          </GlowButton>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-6">
      <CloudFileExplorer
        providerId={providerConfig.id}
        providerName={providerConfig.name}
      />
    </div>
  );
}
