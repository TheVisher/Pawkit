"use client";

import { FileSyncStatus } from "@/lib/types";
import { Cloud, CloudOff, Upload, Download, AlertCircle, Check } from "lucide-react";

interface SyncStatusBadgeProps {
  status: FileSyncStatus;
  size?: "sm" | "md";
  showLabel?: boolean;
}

const statusConfig: Record<
  FileSyncStatus,
  { icon: React.ElementType; label: string; color: string; bgColor: string }
> = {
  local: {
    icon: CloudOff,
    label: "Local only",
    color: "text-gray-400",
    bgColor: "bg-gray-500/20",
  },
  synced: {
    icon: Check,
    label: "Synced",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
  },
  uploading: {
    icon: Upload,
    label: "Uploading",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
  },
  downloading: {
    icon: Download,
    label: "Downloading",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
  },
  "cloud-only": {
    icon: Cloud,
    label: "Cloud only",
    color: "text-accent",
    bgColor: "bg-accent/20",
  },
  error: {
    icon: AlertCircle,
    label: "Sync error",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
  },
};

export function SyncStatusBadge({
  status,
  size = "sm",
  showLabel = false,
}: SyncStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const isAnimated = status === "uploading" || status === "downloading";

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 ${config.bgColor}`}
      title={config.label}
    >
      <Icon
        className={`${iconSize} ${config.color} ${
          isAnimated ? "animate-pulse" : ""
        }`}
      />
      {showLabel && (
        <span className={`text-xs ${config.color}`}>{config.label}</span>
      )}
    </div>
  );
}

// Compact inline indicator for list views
export function SyncStatusIcon({
  status,
  className = "",
}: {
  status: FileSyncStatus;
  className?: string;
}) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const isAnimated = status === "uploading" || status === "downloading";

  return (
    <Icon
      className={`h-3.5 w-3.5 ${config.color} ${
        isAnimated ? "animate-pulse" : ""
      } ${className}`}
      title={config.label}
    />
  );
}
