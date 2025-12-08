"use client";

import { Cloud, HardDrive, Loader2 } from "lucide-react";
import { GlowButton } from "@/components/ui/glow-button";
import type { CloudProviderId } from "@/lib/services/cloud-storage/types";

interface CloudDriveCardProps {
  providerId: CloudProviderId;
  name: string;
  connected: boolean;
  email?: string | null;
  lastSync?: Date | null;
  status?: "idle" | "connecting" | "syncing" | "error";
  onBrowse?: () => void;
  onConnect?: () => void;
}

const PROVIDER_ICONS: Record<CloudProviderId, { icon: typeof Cloud; color: string }> = {
  filen: { icon: Cloud, color: "text-accent" },
  "google-drive": { icon: HardDrive, color: "text-green-400" },
  dropbox: { icon: Cloud, color: "text-blue-500" },
  onedrive: { icon: Cloud, color: "text-sky-400" },
};

export function CloudDriveCard({
  providerId,
  name,
  connected,
  email,
  lastSync,
  status = "idle",
  onBrowse,
  onConnect,
}: CloudDriveCardProps) {
  const { icon: Icon, color } = PROVIDER_ICONS[providerId] || { icon: Cloud, color: "text-gray-400" };

  const formatLastSync = (date: Date | null | undefined) => {
    if (!date) return "Never";
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(date).toLocaleDateString();
  };

  const isSyncing = status === "syncing" || status === "connecting";

  return (
    <div className={`p-6 rounded-2xl border ${connected ? "border-white/10 bg-white/5" : "border-gray-800/50 bg-gray-900/30"}`}>
      <div className="flex items-start gap-4">
        <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${connected ? "bg-accent/20 border border-accent/30" : "bg-gray-800/50 border border-gray-700/50"}`}>
          <Icon className={`h-7 w-7 ${connected ? color : "text-gray-500"}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-medium text-white">{name}</h3>
            {connected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-500" />
                Not connected
              </span>
            )}
          </div>

          {connected && email && (
            <p className="text-sm text-gray-400 mb-2">{email}</p>
          )}

          {connected && (
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>Last sync: {formatLastSync(lastSync)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {connected ? (
            <GlowButton
              onClick={onBrowse}
              variant="primary"
              size="md"
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Syncing...
                </>
              ) : (
                "Browse"
              )}
            </GlowButton>
          ) : (
            <GlowButton onClick={onConnect} variant="primary" size="md">
              Connect
            </GlowButton>
          )}
        </div>
      </div>
    </div>
  );
}
