"use client";

import { useState, useRef, useEffect, ChangeEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import {
  Settings,
  Palette,
  Sliders,
  Cloud,
  Database,
  Code,
  Check,
  Sun,
  Moon,
  SunMoon,
  Calendar,
  HardDrive,
  Cloudy,
  Loader2,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { GlowButton } from "@/components/ui/glow-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettingsStore, type Theme, type AccentColor, type SurfaceTint } from "@/lib/hooks/settings-store";
import { useConnectorStore } from "@/lib/stores/connector-store";
import { filenService } from "@/lib/services/filen-service";
import { gdriveProvider } from "@/lib/services/google-drive/gdrive-provider";
import { dropboxProvider } from "@/lib/services/dropbox/dropbox-provider";
import { onedriveProvider } from "@/lib/services/onedrive/onedrive-provider";
import { useToastStore } from "@/lib/stores/toast-store";
import { useDataStore } from "@/lib/stores/data-store";
import {
  deleteOnboardingData,
  ONBOARDING_TAG,
  ONBOARDING_PAWKIT_SLUGS,
} from "@/lib/services/onboarding-service";
import { StorageCleanupSection } from "@/components/settings/storage-cleanup-section";
import { StorageStrategySettings } from "@/components/settings/storage-strategy-settings";

const ACCENT_COLORS: { name: AccentColor; label: string; value: string }[] = [
  { name: "purple", label: "Purple", value: "bg-purple-500" },
  { name: "blue", label: "Blue", value: "bg-blue-500" },
  { name: "green", label: "Green", value: "bg-green-500" },
  { name: "red", label: "Red", value: "bg-red-500" },
  { name: "orange", label: "Orange", value: "bg-orange-500" },
];

// Section wrapper component with neumorphic styling
function SettingsSection({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-2xl p-6"
      style={{
        background: 'var(--bg-surface-2)',
        boxShadow: 'var(--shadow-2)',
        border: '1px solid var(--border-subtle)',
        borderTopColor: 'var(--border-highlight-top)',
      }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: 'var(--ds-accent-muted)' }}
        >
          <Icon className="h-5 w-5" style={{ color: 'var(--ds-accent)' }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

// Toggle switch component
function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <div
      className="flex items-center justify-between p-4 rounded-xl"
      style={{
        background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
        boxShadow: 'var(--raised-shadow-sm)',
        border: '1px solid var(--border-subtle)',
        borderTopColor: 'var(--raised-border-top)',
      }}
    >
      <div className="flex-1">
        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className="relative w-11 h-6 rounded-full transition-colors"
        style={{
          background: checked ? 'var(--ds-accent)' : 'var(--bg-surface-1)',
          boxShadow: checked ? 'none' : 'var(--inset-shadow)',
        }}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
          style={{
            background: 'var(--bg-surface-3)',
            boxShadow: 'var(--raised-shadow-sm)',
          }}
        />
      </button>
    </div>
  );
}

// Connector status type
type ConnectorStatus = "connected" | "disconnected" | "coming_soon" | "syncing" | "error";

// Connector Card component
function ConnectorCard({
  name,
  description,
  icon,
  status,
  category,
  lastSync,
  onConnect,
  onDisconnect,
}: {
  name: string;
  description: string;
  icon: React.ReactNode;
  status: ConnectorStatus;
  category: string;
  lastSync?: Date | null;
  onConnect?: () => void;
  onDisconnect?: () => void;
}) {
  const getStatusBadge = () => {
    switch (status) {
      case "connected":
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              background: 'rgba(34, 197, 94, 0.2)',
              color: 'rgb(134, 239, 172)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            Connected
          </span>
        );
      case "syncing":
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              background: 'var(--ds-accent-muted)',
              color: 'var(--ds-accent)',
              border: '1px solid var(--ds-accent)',
            }}
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            Syncing
          </span>
        );
      case "error":
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              color: 'rgb(252, 165, 165)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            Error
          </span>
        );
      case "coming_soon":
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              background: 'var(--bg-surface-1)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            Coming Soon
          </span>
        );
      default:
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              background: 'var(--bg-surface-1)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            Not Connected
          </span>
        );
    }
  };

  const isDisabled = status === "coming_soon";

  return (
    <div
      className={`p-4 rounded-xl ${isDisabled ? 'opacity-50' : ''}`}
      style={{
        background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
        boxShadow: 'var(--raised-shadow-sm)',
        border: '1px solid var(--border-subtle)',
        borderTopColor: 'var(--raised-border-top)',
      }}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {name}
            </h3>
            {getStatusBadge()}
          </div>
          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
            {description}
          </p>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span
              className="px-1.5 py-0.5 rounded"
              style={{ background: 'var(--bg-surface-1)' }}
            >
              {category}
            </span>
            {lastSync && status === "connected" && (
              <span>Last sync: {new Date(lastSync).toLocaleDateString()}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {status === "connected" ? (
            <GlowButton onClick={onDisconnect} variant="danger" size="sm">
              Disconnect
            </GlowButton>
          ) : status !== "coming_soon" ? (
            <GlowButton onClick={onConnect} variant="primary" size="sm">
              Connect
            </GlowButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Filen Connect Modal
function FilenConnectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactor, setTwoFactor] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needs2FA, setNeeds2FA] = useState(false);

  const setFilenConnecting = useConnectorStore((state) => state.setFilenConnecting);
  const setFilenConnected = useConnectorStore((state) => state.setFilenConnected);
  const setFilenError = useConnectorStore((state) => state.setFilenError);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setFilenConnecting();

    try {
      const result = await filenService.login({
        email,
        password,
        twoFactorCode: twoFactor || undefined,
      });

      if (result.success) {
        setFilenConnected(email);
        useToastStore.getState().success("Connected to Filen");
        handleClose();
      } else {
        if (result.needs2FA) {
          setNeeds2FA(true);
          setError(null);
        } else {
          setError(result.error || "Failed to connect");
          setFilenError(result.error || "Failed to connect");
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      setFilenError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setPassword("");
    setTwoFactor("");
    setError(null);
    setNeeds2FA(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="rounded-2xl w-full max-w-md p-6"
        style={{
          background: 'var(--bg-surface-2)',
          boxShadow: 'var(--shadow-2)',
          border: '1px solid var(--border-subtle)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: 'var(--ds-accent-muted)' }}
          >
            <Cloud className="h-5 w-5" style={{ color: 'var(--ds-accent)' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Connect to Filen
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              End-to-end encrypted cloud storage
            </p>
          </div>
        </div>

        <form onSubmit={handleConnect} className="space-y-4">
          <div>
            <Label htmlFor="filen-email" className="mb-1.5 block text-sm" style={{ color: 'var(--text-secondary)' }}>
              Email
            </Label>
            <Input
              id="filen-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="filen-password" className="mb-1.5 block text-sm" style={{ color: 'var(--text-secondary)' }}>
              Password
            </Label>
            <Input
              id="filen-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your Filen password"
              required
            />
          </div>

          {needs2FA && (
            <div>
              <Label htmlFor="filen-2fa" className="mb-1.5 block text-sm" style={{ color: 'var(--text-secondary)' }}>
                2FA Code
              </Label>
              <Input
                id="filen-2fa"
                type="text"
                inputMode="numeric"
                value={twoFactor}
                onChange={(e) => setTwoFactor(e.target.value)}
                placeholder="Enter 6-digit code"
              />
            </div>
          )}

          {error && (
            <div
              className="px-4 py-3 rounded-xl"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              <p className="text-sm" style={{ color: 'rgb(252, 165, 165)' }}>{error}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <GlowButton
              type="submit"
              disabled={isLoading || !email || !password}
              variant="primary"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </GlowButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const pathname = usePathname();
  const setLibraryControls = usePanelStore((state) => state.setLibraryControls);
  const [showFilenModal, setShowFilenModal] = useState(false);
  const [gdriveLoading, setGdriveLoading] = useState(false);
  const [dropboxLoading, setDropboxLoading] = useState(false);
  const [onedriveLoading, setOnedriveLoading] = useState(false);
  const [dataMessage, setDataMessage] = useState<string | null>(null);
  const [includeDenInExport, setIncludeDenInExport] = useState(false);
  const [deletingSampleData, setDeletingSampleData] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  // Set sidebar content type when this page loads
  useEffect(() => {
    setLibraryControls();
  }, [setLibraryControls, pathname]);

  // Connector states
  const filenState = useConnectorStore((state) => state.filen);
  const gdriveState = useConnectorStore((state) => state.googleDrive);
  const dropboxState = useConnectorStore((state) => state.dropbox);
  const onedriveState = useConnectorStore((state) => state.onedrive);
  const setFilenDisconnected = useConnectorStore((state) => state.setFilenDisconnected);
  const setGDriveConnected = useConnectorStore((state) => state.setGDriveConnected);
  const setGDriveDisconnected = useConnectorStore((state) => state.setGDriveDisconnected);
  const setDropboxConnected = useConnectorStore((state) => state.setDropboxConnected);
  const setDropboxDisconnected = useConnectorStore((state) => state.setDropboxDisconnected);
  const setOneDriveConnected = useConnectorStore((state) => state.setOneDriveConnected);
  const setOneDriveDisconnected = useConnectorStore((state) => state.setOneDriveDisconnected);

  // Check for onboarding data
  const cards = useDataStore((state) => state.cards);
  const collections = useDataStore((state) => state.collections);
  const hasSampleData = cards.some(c => c.tags?.includes(ONBOARDING_TAG)) ||
    collections.some(c => ONBOARDING_PAWKIT_SLUGS.includes(c.slug));

  // Settings from store
  const theme = useSettingsStore((state) => state.theme);
  const accentColor = useSettingsStore((state) => state.accentColor);
  const uiStyle = useSettingsStore((state) => state.uiStyle);
  const surfaceTint = useSettingsStore((state) => state.surfaceTint);
  const setUiStyle = useSettingsStore((state) => state.setUiStyle);
  const setSurfaceTint = useSettingsStore((state) => state.setSurfaceTint);
  const notifications = useSettingsStore((state) => state.notifications);
  const autoSave = useSettingsStore((state) => state.autoSave);
  const autoFetchMetadata = useSettingsStore((state) => state.autoFetchMetadata);
  const showThumbnails = useSettingsStore((state) => state.showThumbnails);
  const previewServiceUrl = useSettingsStore((state) => state.previewServiceUrl);
  const serverSync = useSettingsStore((state) => state.serverSync);
  const autoSyncOnReconnect = useSettingsStore((state) => state.autoSyncOnReconnect);
  const showSyncStatusInSidebar = useSettingsStore((state) => state.showSyncStatusInSidebar);
  const showKeyboardShortcutsInSidebar = useSettingsStore((state) => state.showKeyboardShortcutsInSidebar);
  const defaultView = useSettingsStore((state) => state.defaultView);
  const defaultSort = useSettingsStore((state) => state.defaultSort);

  const setTheme = useSettingsStore((state) => state.setTheme);
  const setAccentColor = useSettingsStore((state) => state.setAccentColor);
  const setNotifications = useSettingsStore((state) => state.setNotifications);
  const setAutoSave = useSettingsStore((state) => state.setAutoSave);
  const setAutoFetchMetadata = useSettingsStore((state) => state.setAutoFetchMetadata);
  const setShowThumbnails = useSettingsStore((state) => state.setShowThumbnails);
  const setPreviewServiceUrl = useSettingsStore((state) => state.setPreviewServiceUrl);
  const setServerSync = useSettingsStore((state) => state.setServerSync);
  const setAutoSyncOnReconnect = useSettingsStore((state) => state.setAutoSyncOnReconnect);
  const setShowSyncStatusInSidebar = useSettingsStore((state) => state.setShowSyncStatusInSidebar);
  const setShowKeyboardShortcutsInSidebar = useSettingsStore((state) => state.setShowKeyboardShortcutsInSidebar);
  const setDefaultView = useSettingsStore((state) => state.setDefaultView);
  const setDefaultSort = useSettingsStore((state) => state.setDefaultSort);

  // Check connector statuses on mount
  useEffect(() => {
    const checkGDriveStatus = async () => {
      try {
        const status = await gdriveProvider.checkConnection();
        if (status.connected && status.email) {
          setGDriveConnected(status.email);
        }
      } catch (error) {
        console.error('[Settings] Failed to check Google Drive status:', error);
      }
    };

    const checkDropboxStatus = async () => {
      try {
        const status = await dropboxProvider.checkConnection();
        if (status.connected && status.email) {
          setDropboxConnected(status.email);
        }
      } catch (error) {
        console.error('[Settings] Failed to check Dropbox status:', error);
      }
    };

    const checkOneDriveStatus = async () => {
      try {
        const status = await onedriveProvider.checkConnection();
        if (status.connected && status.email) {
          setOneDriveConnected(status.email);
        }
      } catch (error) {
        console.error('[Settings] Failed to check OneDrive status:', error);
      }
    };

    checkGDriveStatus();
    checkDropboxStatus();
    checkOneDriveStatus();

    // Handle OAuth callbacks
    const urlParams = new URLSearchParams(window.location.search);

    const gdriveResult = urlParams.get("gdrive");
    if (gdriveResult === "connected") {
      const email = urlParams.get("email");
      if (email) {
        setGDriveConnected(decodeURIComponent(email));
        useToastStore.getState().success("Connected to Google Drive!");
        gdriveProvider.initializeFolders().catch(console.error);
      }
      window.history.replaceState({}, "", window.location.pathname);
    }

    const dropboxResult = urlParams.get("dropbox");
    if (dropboxResult === "connected") {
      const email = urlParams.get("email");
      if (email) {
        setDropboxConnected(decodeURIComponent(email));
        useToastStore.getState().success("Connected to Dropbox!");
        dropboxProvider.initializeFolders().catch(console.error);
      }
      window.history.replaceState({}, "", window.location.pathname);
    }

    const onedriveResult = urlParams.get("onedrive");
    if (onedriveResult === "connected") {
      const email = urlParams.get("email");
      if (email) {
        setOneDriveConnected(decodeURIComponent(email));
        useToastStore.getState().success("Connected to OneDrive!");
        onedriveProvider.initializeFolders().catch(console.error);
      }
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [setGDriveConnected, setDropboxConnected, setOneDriveConnected]);

  // Connector status helpers
  const getFilenStatus = (): ConnectorStatus => {
    if (filenState.status === "connecting" || filenState.status === "syncing") return "syncing";
    if (filenState.status === "error") return "error";
    if (filenState.connected) return "connected";
    return "disconnected";
  };

  const getGDriveStatus = (): ConnectorStatus => {
    if (gdriveLoading || gdriveState.status === "connecting" || gdriveState.status === "syncing") return "syncing";
    if (gdriveState.status === "error") return "error";
    if (gdriveState.connected) return "connected";
    return "disconnected";
  };

  const getDropboxStatus = (): ConnectorStatus => {
    if (dropboxLoading || dropboxState.status === "connecting" || dropboxState.status === "syncing") return "syncing";
    if (dropboxState.status === "error") return "error";
    if (dropboxState.connected) return "connected";
    return "disconnected";
  };

  const getOneDriveStatus = (): ConnectorStatus => {
    if (onedriveLoading || onedriveState.status === "connecting" || onedriveState.status === "syncing") return "syncing";
    if (onedriveState.status === "error") return "error";
    if (onedriveState.connected) return "connected";
    return "disconnected";
  };

  // Connector handlers
  const handleFilenDisconnect = async () => {
    try {
      await filenService.logout();
      setFilenDisconnected();
      useToastStore.getState().success("Disconnected from Filen");
    } catch {
      useToastStore.getState().error("Failed to disconnect");
    }
  };

  const handleGDriveConnect = () => {
    setGdriveLoading(true);
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

  const handleDropboxConnect = () => {
    setDropboxLoading(true);
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

  const handleOneDriveConnect = () => {
    setOnedriveLoading(true);
    window.location.href = "/api/auth/onedrive";
  };

  const handleOneDriveDisconnect = async () => {
    try {
      setOnedriveLoading(true);
      await onedriveProvider.disconnect();
      setOneDriveDisconnected();
      useToastStore.getState().success("Disconnected from OneDrive");
    } catch {
      useToastStore.getState().error("Failed to disconnect");
    } finally {
      setOnedriveLoading(false);
    }
  };

  // Data handlers
  const handleExport = async () => {
    const url = includeDenInExport ? "/api/import?includeDen=true" : "/api/import";
    const response = await fetch(url);
    if (!response.ok) {
      setDataMessage("Failed to export data");
      return;
    }
    const data = await response.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `bookmark-export-${new Date().toISOString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
    setDataMessage(`Exported data${includeDenInExport ? " (including Den)" : ""}`);
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const payload = JSON.parse(text);
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setDataMessage(body.message || "Failed to import data");
        return;
      }
      const result = await response.json();
      setDataMessage(
        `Import complete — ${result.createdCards} created, ${result.updatedCards} updated, ${result.createdCollections} collections created, ${result.updatedCollections} collections updated.`
      );
    } catch {
      setDataMessage("Invalid JSON file");
    } finally {
      if (importFileInputRef.current) {
        importFileInputRef.current.value = "";
      }
    }
  };

  const handleClear = async () => {
    const confirmed = window.confirm("Delete all cards and collections?");
    if (!confirmed) return;
    const response = await fetch("/api/admin/clear", { method: "POST" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setDataMessage(body.message || "Failed to clear data");
      return;
    }
    setDataMessage("All data cleared");
  };

  const handleDeleteSampleData = async () => {
    setDeletingSampleData(true);
    setShowDeleteConfirm(false);
    try {
      const result = await deleteOnboardingData();
      useToastStore.getState().success(`Sample data deleted! Removed ${result.deletedCards} items and ${result.deletedPawkits} pawkits.`);
      setDataMessage(`Deleted ${result.deletedCards} sample items and ${result.deletedPawkits} sample pawkits`);
    } catch {
      useToastStore.getState().error("Failed to delete sample data");
      setDataMessage("Failed to delete sample data");
    } finally {
      setDeletingSampleData(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{
            background: 'var(--ds-accent-muted)',
            boxShadow: 'var(--raised-shadow)',
          }}
        >
          <Settings className="h-7 w-7" style={{ color: 'var(--ds-accent)' }} />
        </div>
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Settings
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Customize Pawkit to your liking
          </p>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left Column - Appearance & Preferences */}
        <div className="xl:w-[55%] flex flex-col gap-6">
          {/* Combined Appearance & Preferences Section */}
          <div
            className="rounded-2xl p-6"
            style={{
              background: 'var(--bg-surface-2)',
              boxShadow: 'var(--shadow-2)',
              border: '1px solid var(--border-subtle)',
              borderTopColor: 'var(--border-highlight-top)',
            }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: 'var(--ds-accent-muted)' }}
              >
                <Palette className="h-5 w-5" style={{ color: 'var(--ds-accent)' }} />
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Look & Feel
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Customize appearance and behavior
                </p>
              </div>
            </div>

            {/* Appearance, Accent, UI Style, Theme in a grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Appearance (Dark/Light/Auto) */}
              <div>
                <Label className="text-sm mb-3 block" style={{ color: 'var(--text-secondary)' }}>
                  Appearance
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'dark' as Theme, label: 'Dark', icon: Moon },
                    { value: 'light' as Theme, label: 'Light', icon: Sun },
                    { value: 'auto' as Theme, label: 'Auto', icon: SunMoon },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      className="p-3 rounded-xl transition-all relative"
                      style={{
                        background: theme === value
                          ? 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)'
                          : 'var(--bg-surface-1)',
                        boxShadow: theme === value ? 'var(--raised-shadow)' : 'var(--inset-shadow)',
                        border: theme === value ? '1px solid var(--ds-accent)' : 'var(--inset-border)',
                      }}
                    >
                      <Icon className="h-4 w-4 mx-auto mb-1" style={{ color: theme === value ? 'var(--ds-accent)' : 'var(--text-muted)' }} />
                      <div className="text-xs font-medium" style={{ color: theme === value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {label}
                      </div>
                      {theme === value && (
                        <Check className="absolute top-1.5 right-1.5 h-3 w-3" style={{ color: 'var(--ds-accent)' }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <Label className="text-sm mb-3 block" style={{ color: 'var(--text-secondary)' }}>
                  Accent Color
                </Label>
                <div className="flex gap-2 flex-wrap">
                  {ACCENT_COLORS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setAccentColor(color.name)}
                      className={`h-9 w-9 rounded-full ${color.value} transition-all relative`}
                      style={{
                        boxShadow: accentColor === color.name ? '0 0 0 2px var(--bg-surface-2), 0 0 0 4px var(--ds-accent)' : 'var(--raised-shadow-sm)',
                      }}
                      title={color.label}
                    >
                      {accentColor === color.name && (
                        <Check className="absolute inset-0 m-auto h-4 w-4 text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* UI Style */}
              <div>
                <Label className="text-sm mb-3 block" style={{ color: 'var(--text-secondary)' }}>
                  UI Style
                </Label>
                <div className="flex gap-2">
                  {[
                    { value: "modern" as const, label: "Modern", desc: "Solid surfaces" },
                    { value: "glass" as const, label: "Glass", desc: "Transparent + blur" },
                  ].map((style) => (
                    <button
                      key={style.value}
                      onClick={() => setUiStyle(style.value)}
                      className="px-4 py-2 rounded-lg text-sm transition-all"
                      style={{
                        background: uiStyle === style.value ? 'var(--ds-accent)' : 'var(--bg-surface-2)',
                        color: uiStyle === style.value ? 'white' : 'var(--text-secondary)',
                        boxShadow: uiStyle === style.value ? 'var(--glow-hover)' : 'var(--raised-shadow-sm)',
                      }}
                    >
                      <span className="font-medium">{style.label}</span>
                      <span className="block text-xs opacity-70">{style.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme (Surface Tint) */}
              <div>
                <Label className="text-sm mb-3 block" style={{ color: 'var(--text-secondary)' }}>
                  Theme
                </Label>
                <div className="flex gap-2">
                  {[
                    { value: "none" as SurfaceTint, label: "None", desc: "Neutral" },
                    { value: "purple" as SurfaceTint, label: "Purple", desc: "Purple tint" },
                  ].map((tint) => (
                    <button
                      key={tint.value}
                      onClick={() => setSurfaceTint(tint.value)}
                      className="px-4 py-2 rounded-lg text-sm transition-all"
                      style={{
                        background: surfaceTint === tint.value ? 'var(--ds-accent)' : 'var(--bg-surface-2)',
                        color: surfaceTint === tint.value ? 'white' : 'var(--text-secondary)',
                        boxShadow: surfaceTint === tint.value ? 'var(--glow-hover)' : 'var(--raised-shadow-sm)',
                      }}
                    >
                      <span className="font-medium">{tint.label}</span>
                      <span className="block text-xs opacity-70">{tint.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preferences - Grid of toggles */}
            <div
              className="rounded-xl p-4"
              style={{
                background: 'var(--bg-surface-1)',
                boxShadow: 'var(--inset-shadow)',
                border: 'var(--inset-border)',
                borderBottomColor: 'var(--inset-border-bottom)',
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { checked: notifications, onChange: setNotifications, label: "Notifications", desc: "Important updates" },
                  { checked: autoSave, onChange: setAutoSave, label: "Auto-save", desc: "Save as you type" },
                  { checked: autoFetchMetadata, onChange: setAutoFetchMetadata, label: "Auto-fetch Metadata", desc: "Fetch link previews" },
                  { checked: showThumbnails, onChange: setShowThumbnails, label: "Show Thumbnails", desc: "Card images" },
                  { checked: showSyncStatusInSidebar, onChange: setShowSyncStatusInSidebar, label: "Sync Status", desc: "In right sidebar" },
                  { checked: showKeyboardShortcutsInSidebar, onChange: setShowKeyboardShortcutsInSidebar, label: "Shortcuts Panel", desc: "In left sidebar" },
                ].map(({ checked, onChange, label, desc }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{
                      background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                      boxShadow: 'var(--raised-shadow-sm)',
                      border: '1px solid var(--border-subtle)',
                      borderTopColor: 'var(--raised-border-top)',
                    }}
                  >
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                    </div>
                    <button
                      onClick={() => onChange(!checked)}
                      className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
                      style={{
                        background: checked ? 'var(--ds-accent)' : 'var(--bg-surface-1)',
                        boxShadow: checked ? 'none' : 'var(--inset-shadow)',
                      }}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
                        style={{ background: 'var(--bg-surface-3)', boxShadow: 'var(--raised-shadow-sm)' }}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Default View & Sort */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label className="text-xs mb-2 block" style={{ color: 'var(--text-muted)' }}>Default View</Label>
                <select
                  value={defaultView}
                  onChange={(e) => setDefaultView(e.target.value as "grid" | "masonry" | "list")}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: 'var(--bg-surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                >
                  <option value="grid">Grid</option>
                  <option value="masonry">Masonry</option>
                  <option value="list">List</option>
                </select>
              </div>
              <div>
                <Label className="text-xs mb-2 block" style={{ color: 'var(--text-muted)' }}>Default Sort</Label>
                <select
                  value={defaultSort}
                  onChange={(e) => setDefaultSort(e.target.value as "dateAdded" | "recentlyModified" | "title" | "domain")}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: 'var(--bg-surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                >
                  <option value="dateAdded">Date Added</option>
                  <option value="recentlyModified">Recently Modified</option>
                  <option value="title">Title</option>
                  <option value="domain">Domain</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sync & Data Section */}
          <SettingsSection id="sync-data" icon={Database} title="Sync & Data" description="Manage your data and sync settings">
            <StorageStrategySettings />

            <div className="mt-5 space-y-3">
              <ToggleSwitch checked={serverSync} onChange={setServerSync} label="Server Sync" description="Keep data local-only or sync with server" />
              {!serverSync && (
                <ToggleSwitch checked={autoSyncOnReconnect} onChange={setAutoSyncOnReconnect} label="Auto-sync when re-enabled" description="Sync pending local changes when you turn server sync back on" />
              )}
            </div>

            {/* Import/Export - Compact */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <GlowButton onClick={handleExport} variant="primary" size="sm">
                <Download className="h-4 w-4 mr-1" /> Export
              </GlowButton>
              <GlowButton variant="primary" size="sm" onClick={() => importFileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" /> Import
              </GlowButton>
              <input ref={importFileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImport} />
              <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <input type="checkbox" checked={includeDenInExport} onChange={(e) => setIncludeDenInExport(e.target.checked)} className="rounded" />
                Include Private
              </label>
            </div>
            {dataMessage && (
              <p className="text-xs mt-3 p-2 rounded-lg" style={{ background: 'var(--bg-surface-1)', color: 'var(--text-muted)' }}>{dataMessage}</p>
            )}

            {/* Storage Cleanup */}
            <div className="mt-5">
              <StorageCleanupSection />
            </div>
          </SettingsSection>
        </div>

        {/* Right Column - Connectors, Advanced, Danger Zone */}
        <div className="xl:w-[45%] flex flex-col gap-6">
          {/* Connectors Section */}
          <SettingsSection id="connectors" icon={Cloud} title="Connectors" description="Connect external services for sync and backup">
            <div className="space-y-3">
              <ConnectorCard
                name="Filen"
                description="End-to-end encrypted cloud storage"
                icon={<Cloud className="h-6 w-6" style={{ color: 'var(--ds-accent)' }} />}
                status={getFilenStatus()}
                category="Storage"
                lastSync={filenState.lastSync}
                onConnect={() => setShowFilenModal(true)}
                onDisconnect={handleFilenDisconnect}
              />
              <ConnectorCard
                name="Google Drive"
                description="Sync with Google Drive"
                icon={<HardDrive className="h-6 w-6" style={{ color: 'rgb(34, 197, 94)' }} />}
                status={getGDriveStatus()}
                category="Storage"
                lastSync={gdriveState.lastSync}
                onConnect={handleGDriveConnect}
                onDisconnect={handleGDriveDisconnect}
              />
              <ConnectorCard
                name="Dropbox"
                description="Sync with Dropbox"
                icon={<Cloudy className="h-6 w-6" style={{ color: 'rgb(59, 130, 246)' }} />}
                status={getDropboxStatus()}
                category="Storage"
                lastSync={dropboxState.lastSync}
                onConnect={handleDropboxConnect}
                onDisconnect={handleDropboxDisconnect}
              />
              <ConnectorCard
                name="OneDrive"
                description="Sync with Microsoft OneDrive"
                icon={<Cloud className="h-6 w-6" style={{ color: 'rgb(14, 165, 233)' }} />}
                status={getOneDriveStatus()}
                category="Storage"
                lastSync={onedriveState.lastSync}
                onConnect={handleOneDriveConnect}
                onDisconnect={handleOneDriveDisconnect}
              />
              <ConnectorCard
                name="Google Calendar"
                description="Sync events with Google Calendar"
                icon={<Calendar className="h-6 w-6" style={{ color: 'rgb(59, 130, 246)' }} />}
                status="coming_soon"
                category="Calendar"
              />
            </div>
          </SettingsSection>

          {/* Advanced Section - Compact */}
          <SettingsSection id="advanced" icon={Code} title="Advanced" description="Developer options">
            <div>
              <Label className="text-xs mb-2 block" style={{ color: 'var(--text-muted)' }}>
                Preview Service URL (must contain {`{{url}}`})
              </Label>
              <Input
                value={previewServiceUrl}
                onChange={(e) => setPreviewServiceUrl(e.target.value)}
                placeholder="https://example.com/preview?url={{url}}"
              />
            </div>
          </SettingsSection>

          {/* Sample Data & Danger Zone - Combined */}
          <div
            className="rounded-2xl p-6"
            style={{
              background: 'var(--bg-surface-2)',
              boxShadow: 'var(--shadow-2)',
              border: '1px solid var(--border-subtle)',
              borderTopColor: 'var(--border-highlight-top)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-5 w-5" style={{ color: 'rgb(248, 113, 113)' }} />
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Danger Zone</h2>
            </div>

            {/* Sample Data */}
            {hasSampleData && (
              <div
                className="p-4 rounded-xl mb-4"
                style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)' }}
              >
                {showDeleteConfirm ? (
                  <div className="space-y-3">
                    <p className="text-sm" style={{ color: 'rgb(253, 224, 71)' }}>Delete all sample content?</p>
                    <div className="flex gap-2">
                      <GlowButton variant="danger" size="sm" onClick={handleDeleteSampleData} disabled={deletingSampleData}>
                        {deletingSampleData ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Deleting...</> : "Yes, Delete"}
                      </GlowButton>
                      <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Trash2 className="h-4 w-4" style={{ color: 'rgb(245, 158, 11)' }} />
                        Delete Sample Data
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Remove onboarding content</p>
                    </div>
                    <GlowButton variant="primary" size="sm" onClick={() => setShowDeleteConfirm(true)}>Delete</GlowButton>
                  </div>
                )}
              </div>
            )}

            {/* Clear All Data */}
            <div
              className="p-4 rounded-xl"
              style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Clear All Data</div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Delete all cards and collections</p>
                </div>
                <GlowButton variant="danger" size="sm" onClick={handleClear}>Clear Data</GlowButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="py-6 px-8 rounded-2xl"
        style={{
          background: 'var(--bg-surface-1)',
          boxShadow: 'var(--inset-shadow)',
          border: 'var(--inset-border)',
        }}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Need to update your account info? Click your avatar in the top right.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/changelog"
              className="text-sm transition-colors hover:underline"
              style={{ color: 'var(--ds-accent)' }}
            >
              Changelog
            </Link>
            <Link
              href="/help"
              className="text-sm transition-colors hover:underline"
              style={{ color: 'var(--ds-accent)' }}
            >
              Help Center
            </Link>
          </div>
        </div>
      </div>

      {/* Filen Modal */}
      <FilenConnectModal open={showFilenModal} onClose={() => setShowFilenModal(false)} />
    </div>
  );
}
