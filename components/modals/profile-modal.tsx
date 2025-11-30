"use client";

import { useState, useRef, useEffect, ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { GlowButton } from "@/components/ui/glow-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettingsStore, type Theme, type AccentColor } from "@/lib/hooks/settings-store";
import { useAuth } from "@/lib/contexts/auth-context";
import { Check, LogOut, Cloud, Calendar, HardDrive, Loader2, Settings2, Trash2 } from "lucide-react";
import { useConnectorStore } from "@/lib/stores/connector-store";
import { filenService } from "@/lib/services/filen-service";
import { gdriveProvider } from "@/lib/services/google-drive/gdrive-provider";
import { useToastStore } from "@/lib/stores/toast-store";
import { useDataStore } from "@/lib/stores/data-store";
import {
  hasOnboardingData,
  deleteOnboardingData,
  ONBOARDING_TAG,
  ONBOARDING_PAWKIT_SLUGS,
} from "@/lib/services/onboarding-service";
import { StorageCleanupSection } from "@/components/settings/storage-cleanup-section";

type ProfileModalProps = {
  open: boolean;
  onClose: () => void;
  username: string;
  email?: string;
  avatarUrl?: string;
};

const ACCENT_COLORS: { name: AccentColor; value: string }[] = [
  { name: "purple", value: "bg-purple-500" },
  { name: "blue", value: "bg-blue-500" },
  { name: "green", value: "bg-green-500" },
  { name: "red", value: "bg-red-500" },
  { name: "orange", value: "bg-orange-500" },
];

// Connector status type
type ConnectorStatus = "connected" | "disconnected" | "coming_soon" | "syncing" | "error";

// Connector Card component for the Connectors tab
function ConnectorCard({
  name,
  description,
  icon,
  status,
  category,
  lastSync,
  onConnect,
  onDisconnect,
  onSettings,
}: {
  name: string;
  description: string;
  icon: React.ReactNode;
  status: ConnectorStatus;
  category: string;
  lastSync?: Date | null;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onSettings?: () => void;
}) {
  const getStatusBadge = () => {
    switch (status) {
      case "connected":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            Connected
          </span>
        );
      case "syncing":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Loader2 className="h-3 w-3 animate-spin" />
            Syncing
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
            Error
          </span>
        );
      case "coming_soon":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
            Coming Soon
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
            Not Connected
          </span>
        );
    }
  };

  const isDisabled = status === "coming_soon";

  return (
    <div className={`p-4 rounded-xl border ${isDisabled ? "border-gray-800/50 bg-gray-900/30 opacity-60" : "border-white/10 bg-white/5"}`}>
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isDisabled ? "bg-gray-800/50" : "bg-purple-500/20 border border-purple-500/30"}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-white">{name}</h3>
            {getStatusBadge()}
          </div>
          <p className="text-xs text-gray-400 mb-2">{description}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="px-1.5 py-0.5 rounded bg-gray-800/50">{category}</span>
            {lastSync && status === "connected" && (
              <span>Last sync: {new Date(lastSync).toLocaleDateString()}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === "connected" && onSettings && (
            <button
              onClick={onSettings}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Settings"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          )}
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

// Connectors Tab Content
function ConnectorsTabContent() {
  const [showFilenModal, setShowFilenModal] = useState(false);
  const [gdriveLoading, setGdriveLoading] = useState(false);

  const filenState = useConnectorStore((state) => state.filen);
  const gdriveState = useConnectorStore((state) => state.googleDrive);
  const setFilenDisconnected = useConnectorStore((state) => state.setFilenDisconnected);
  const setGDriveConnected = useConnectorStore((state) => state.setGDriveConnected);
  const setGDriveDisconnected = useConnectorStore((state) => state.setGDriveDisconnected);

  // Check Google Drive connection on mount and after OAuth callback
  useEffect(() => {
    const checkGDriveStatus = async () => {
      try {
        const status = await gdriveProvider.checkConnection();
        if (status.connected && status.email) {
          setGDriveConnected(status.email);
        }
      } catch {
        // Ignore - not connected
      }
    };

    checkGDriveStatus();

    // Check for OAuth callback results
    const urlParams = new URLSearchParams(window.location.search);
    const gdriveResult = urlParams.get("gdrive");
    if (gdriveResult === "connected") {
      const email = urlParams.get("email");
      if (email) {
        setGDriveConnected(decodeURIComponent(email));
        useToastStore.getState().success("Connected to Google Drive!");
      }
      window.history.replaceState({}, "", window.location.pathname);
    } else if (gdriveResult === "error") {
      const message = urlParams.get("message") || "Connection failed";
      useToastStore.getState().error(`Google Drive: ${message}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [setGDriveConnected]);

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

  const handleFilenDisconnect = async () => {
    try {
      await filenService.logout();
      setFilenDisconnected();
      useToastStore.getState().success("Disconnected from Filen");
    } catch {
      useToastStore.getState().error("Failed to disconnect");
    }
  };

  const handleFilenSettings = () => {
    useToastStore.getState().info("Filen settings coming soon");
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

  const handleGDriveSettings = () => {
    useToastStore.getState().info("Google Drive settings coming soon");
  };

  return (
    <>
      <div className="space-y-4">
        <div>
          <Label className="text-gray-300">External Connectors</Label>
          <p className="text-sm text-gray-500 mt-1">
            Connect external services to sync your data across devices.
          </p>
        </div>

        <div className="space-y-3">
          {/* Filen Connector */}
          <ConnectorCard
            name="Filen"
            description="End-to-end encrypted cloud storage for file sync"
            icon={<Cloud className="h-6 w-6 text-purple-400" />}
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
            icon={<Calendar className="h-6 w-6 text-blue-400" />}
            status="coming_soon"
            category="Calendar"
          />

          {/* Google Drive Connector */}
          <ConnectorCard
            name="Google Drive"
            description="Sync files with Google Drive"
            icon={<HardDrive className="h-6 w-6 text-green-400" />}
            status={getGDriveStatus()}
            category="Storage"
            lastSync={gdriveState.lastSync}
            onConnect={handleGDriveConnect}
            onDisconnect={handleGDriveDisconnect}
            onSettings={handleGDriveSettings}
          />
        </div>
      </div>

      {/* Filen Connect Modal */}
      {showFilenModal && (
        <FilenConnectModalInline
          open={showFilenModal}
          onClose={() => setShowFilenModal(false)}
        />
      )}
    </>
  );
}

// Inline Filen Connect Modal (simplified version for the profile modal)
function FilenConnectModalInline({ open, onClose }: { open: boolean; onClose: () => void }) {
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
        className="rounded-2xl border border-white/10 bg-gray-900/95 backdrop-blur-lg shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 border border-purple-500/30">
            <Cloud className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Connect to Filen</h2>
            <p className="text-sm text-gray-400">End-to-end encrypted cloud storage</p>
          </div>
        </div>

        <form onSubmit={handleConnect} className="space-y-4">
          <div>
            <Label htmlFor="filen-email" className="text-gray-300 mb-1.5 block text-sm">
              Email
            </Label>
            <Input
              id="filen-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <Label htmlFor="filen-password" className="text-gray-300 mb-1.5 block text-sm">
              Password
            </Label>
            <Input
              id="filen-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your Filen password"
              required
              autoComplete="current-password"
            />
          </div>

          {needs2FA && (
            <div>
              <Label htmlFor="filen-2fa" className="text-gray-300 mb-1.5 block text-sm">
                2FA Code
              </Label>
              <Input
                id="filen-2fa"
                type="text"
                inputMode="numeric"
                value={twoFactor}
                onChange={(e) => setTwoFactor(e.target.value)}
                placeholder="Enter 6-digit code"
                autoComplete="one-time-code"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the code from your authenticator app
              </p>
            </div>
          )}

          {error && (
            <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <p className="text-sm text-rose-400">{error}</p>
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

// Inner component that only renders when modal is open
function ProfileModalContent({ open, onClose, username, email = "", avatarUrl }: ProfileModalProps) {
  // Debug: Log when modal renders

  const [userEmail, setUserEmail] = useState(email);
  const [avatar, setAvatar] = useState(avatarUrl || "");
  const [avatarPreview, setAvatarPreview] = useState(avatarUrl || "");
  const [saving, setSaving] = useState(false);
  const [dataMessage, setDataMessage] = useState<string | null>(null);
  const [includeDenInExport, setIncludeDenInExport] = useState(false);
  const [deletingSampleData, setDeletingSampleData] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  // Check if onboarding data exists - subscribe to cards/collections changes
  const cards = useDataStore((state) => state.cards);
  const collections = useDataStore((state) => state.collections);
  const hasSampleData = cards.some(c => c.tags?.includes(ONBOARDING_TAG)) ||
    collections.some(c => ONBOARDING_PAWKIT_SLUGS.includes(c.slug));

  // Auth
  const { signOut } = useAuth();

  // Debug: Log signOut function

  // Sign Out handler - now actually calling signOut
  const handleSignOutClick = async () => {
    console.log('🚨 HANDLER: Starting sign out process');

    try {
      console.log('🚨 HANDLER: Calling signOut()...');
      await signOut();
      console.log('🚨 HANDLER: signOut() completed successfully!');
    } catch (err) {
      console.error('🚨 HANDLER: signOut() FAILED:', err);
      alert('Sign out error: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Verify handler was created
  console.log('🔍 ProfileModal: handleSignOutClick defined:', typeof handleSignOutClick);
  console.log('🔍 ProfileModal: signOut available:', typeof signOut);

  // Settings from store (including displayName)
  const displayName = useSettingsStore((state) => state.displayName);
  const setDisplayName = useSettingsStore((state) => state.setDisplayName);
  const [name, setName] = useState(displayName || username);

  const theme = useSettingsStore((state) => state.theme);
  const accentColor = useSettingsStore((state) => state.accentColor);
  const notifications = useSettingsStore((state) => state.notifications);
  const autoSave = useSettingsStore((state) => state.autoSave);
  const autoFetchMetadata = useSettingsStore((state) => state.autoFetchMetadata);
  const previewServiceUrl = useSettingsStore((state) => state.previewServiceUrl);
  const serverSync = useSettingsStore((state) => state.serverSync);
  const autoSyncOnReconnect = useSettingsStore((state) => state.autoSyncOnReconnect);

  // New sidebar visibility settings
  const showSyncStatusInSidebar = useSettingsStore((state) => state.showSyncStatusInSidebar);
  const showKeyboardShortcutsInSidebar = useSettingsStore((state) => state.showKeyboardShortcutsInSidebar);

  // New default preferences
  const defaultView = useSettingsStore((state) => state.defaultView);
  const defaultSort = useSettingsStore((state) => state.defaultSort);

  const setTheme = useSettingsStore((state) => state.setTheme);
  const setAccentColor = useSettingsStore((state) => state.setAccentColor);
  const setNotifications = useSettingsStore((state) => state.setNotifications);
  const setAutoSave = useSettingsStore((state) => state.setAutoSave);
  const setAutoFetchMetadata = useSettingsStore((state) => state.setAutoFetchMetadata);
  const setPreviewServiceUrl = useSettingsStore((state) => state.setPreviewServiceUrl);
  const setServerSync = useSettingsStore((state) => state.setServerSync);
  const setAutoSyncOnReconnect = useSettingsStore((state) => state.setAutoSyncOnReconnect);
  const setShowSyncStatusInSidebar = useSettingsStore((state) => state.setShowSyncStatusInSidebar);
  const setShowKeyboardShortcutsInSidebar = useSettingsStore((state) => state.setShowKeyboardShortcutsInSidebar);
  const setDefaultView = useSettingsStore((state) => state.setDefaultView);
  const setDefaultSort = useSettingsStore((state) => state.setDefaultSort);

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatar("");
    setAvatarPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save display name to server
      const response = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save profile');
      }

      // Also update local settings store for immediate UI update
      setDisplayName(name);

      // Close modal after a short delay for visual feedback
      setTimeout(() => {
        onClose();
        setSaving(false);
      }, 300);
    } catch (error) {
      alert(`Failed to save profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSaving(false);
    }
  };

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
    const denStatus = includeDenInExport ? " (including Den)" : "";
    setDataMessage(`Exported data${denStatus}`);
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
    } catch (error) {
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
      const toast = useToastStore.getState();
      toast.success(`Sample data deleted! Removed ${result.deletedCards} items and ${result.deletedPawkits} pawkits.`);
      setDataMessage(`Deleted ${result.deletedCards} sample items and ${result.deletedPawkits} sample pawkits`);
    } catch (error) {
      const toast = useToastStore.getState();
      toast.error("Failed to delete sample data");
      setDataMessage("Failed to delete sample data");
    } finally {
      setDeletingSampleData(false);
    }
  };

  const getAvatarDisplay = () => {
    if (avatarPreview) {
      return (
        <img
          src={avatarPreview}
          alt={name}
          className="h-full w-full object-cover"
        />
      );
    }
    // Show initial if no avatar
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-white text-4xl font-semibold">
        {name.charAt(0).toUpperCase()}
      </div>
    );
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xl backdrop-saturate-150 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-white/10 bg-white/5 backdrop-blur-lg p-4 md:p-6 flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-100">Profile Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-4 md:p-6">
          <Tabs defaultValue="account" className="w-full">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-1">
              <TabsTrigger value="account" className="text-xs md:text-sm">Account</TabsTrigger>
              <TabsTrigger value="appearance" className="text-xs md:text-sm">Appearance</TabsTrigger>
              <TabsTrigger value="preferences" className="text-xs md:text-sm">Preferences</TabsTrigger>
              <TabsTrigger value="connectors" className="text-xs md:text-sm">Connectors</TabsTrigger>
              <TabsTrigger value="sync-data" className="text-xs md:text-sm">Sync & Data</TabsTrigger>
              <TabsTrigger value="advanced" className="text-xs md:text-sm">Advanced</TabsTrigger>
            </TabsList>

            {/* Account Tab */}
            <TabsContent value="account" className="space-y-6 mt-6 h-[550px] overflow-y-auto">
              {/* Avatar Section */}
              <div className="space-y-4">
                <Label className="text-gray-300">Profile Picture</Label>
                <div className="flex items-center gap-6">
                  <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-gray-700">
                    {getAvatarDisplay()}
                  </div>
                  <div className="flex flex-col gap-2">
                    <GlowButton
                      variant="primary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload Photo
                    </GlowButton>
                    {avatarPreview && (
                      <GlowButton
                        variant="danger"
                        size="sm"
                        onClick={handleRemoveAvatar}
                      >
                        Remove Photo
                      </GlowButton>
                    )}
                    <p className="text-xs text-gray-500">
                      JPG, PNG or GIF. Max 2MB.
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>
              </div>

              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">
                  Display Name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="your.email@example.com"
                />
              </div>

              {/* Username (readonly) */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-300">
                  Username
                </Label>
                <Input
                  id="username"
                  value={username}
                  disabled
                  className="bg-gray-900/50"
                />
                <p className="text-xs text-gray-500">
                  Username cannot be changed
                </p>
              </div>

              {/* Sign Out - Moved from footer */}
              <div className="pt-6 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleSignOutClick}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600/20 border border-red-500/30 hover:bg-red-600/30 hover:border-red-500/50 rounded-lg text-white transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6 mt-6 h-[550px] overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Theme</Label>
                  <p className="text-sm text-gray-500 mt-1">
                    Customize how Pawkit looks on your device
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => setTheme("dark")}
                    className={`p-4 rounded-lg border-2 ${
                      theme === "dark" ? "border-accent bg-gray-900" : "border-gray-700 bg-gray-900/50"
                    } text-left relative`}
                  >
                    <div className="text-sm font-medium text-gray-100">Dark</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {theme === "dark" ? "Current theme" : "Dark mode"}
                    </div>
                    {theme === "dark" && (
                      <Check className="absolute top-2 right-2 h-4 w-4 text-accent" />
                    )}
                  </button>
                  <button
                    onClick={() => setTheme("light")}
                    className={`p-4 rounded-lg border-2 ${
                      theme === "light" ? "border-accent bg-gray-900" : "border-gray-700 bg-gray-900/50"
                    } text-left relative`}
                  >
                    <div className="text-sm font-medium text-gray-100">Light</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {theme === "light" ? "Current theme" : "Light mode"}
                    </div>
                    {theme === "light" && (
                      <Check className="absolute top-2 right-2 h-4 w-4 text-accent" />
                    )}
                  </button>
                  <button
                    onClick={() => setTheme("auto")}
                    className={`p-4 rounded-lg border-2 ${
                      theme === "auto" ? "border-accent bg-gray-900" : "border-gray-700 bg-gray-900/50"
                    } text-left relative`}
                  >
                    <div className="text-sm font-medium text-gray-100">Auto</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {theme === "auto" ? "Current theme" : "Follows system"}
                    </div>
                    {theme === "auto" && (
                      <Check className="absolute top-2 right-2 h-4 w-4 text-accent" />
                    )}
                  </button>
                </div>
              </div>

              {/* Accent Color */}
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Accent Color</Label>
                  <p className="text-sm text-gray-500 mt-1">
                    Choose your preferred accent color
                  </p>
                </div>
                <div className="flex gap-3">
                  {ACCENT_COLORS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setAccentColor(color.name)}
                      className={`h-10 w-10 rounded-full ${color.value} border-2 ${
                        accentColor === color.name ? "border-white ring-2 ring-white/30" : "border-transparent hover:border-white/50"
                      } transition-all relative`}
                      title={color.name.charAt(0).toUpperCase() + color.name.slice(1)}
                    >
                      {accentColor === color.name && (
                        <Check className="absolute inset-0 m-auto h-5 w-5 text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences" className="space-y-6 mt-6 h-[550px] overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-gray-300">Notifications</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Receive notifications for important updates
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded"
                    checked={notifications}
                    onChange={(e) => setNotifications(e.target.checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-gray-300">Auto-save</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Automatically save changes as you type
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded"
                    checked={autoSave}
                    onChange={(e) => setAutoSave(e.target.checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-gray-300">Auto-fetch Metadata</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Automatically fetch metadata from preview service
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded"
                    checked={autoFetchMetadata}
                    onChange={(e) => setAutoFetchMetadata(e.target.checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-gray-300">Show sync status in right sidebar</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Display sync status panel at bottom of right sidebar
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded"
                    checked={showSyncStatusInSidebar}
                    onChange={(e) => setShowSyncStatusInSidebar(e.target.checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-gray-300">Show keyboard shortcuts in left sidebar</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Display keyboard shortcuts panel in sidebar
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded"
                    checked={showKeyboardShortcutsInSidebar}
                    onChange={(e) => setShowKeyboardShortcutsInSidebar(e.target.checked)}
                  />
                </div>

                {/* Default View */}
                <div className="space-y-2">
                  <Label htmlFor="default-view" className="text-gray-300">
                    Default View
                  </Label>
                  <p className="text-sm text-gray-500">
                    Fallback view when no remembered state (your last-used view is always remembered per-collection)
                  </p>
                  <select
                    id="default-view"
                    value={defaultView}
                    onChange={(e) => setDefaultView(e.target.value as "grid" | "masonry" | "list")}
                    className="w-full rounded-lg bg-white/5 backdrop-blur-sm px-4 py-2 text-sm text-foreground border border-white/10 focus:border-accent focus:outline-none transition-colors"
                  >
                    <option value="grid">Grid</option>
                    <option value="masonry">Masonry</option>
                    <option value="list">List</option>
                  </select>
                </div>

                {/* Default Sort */}
                <div className="space-y-2">
                  <Label htmlFor="default-sort" className="text-gray-300">
                    Default Sort
                  </Label>
                  <p className="text-sm text-gray-500">
                    Fallback sort when no remembered state (your last-used sort is always remembered per-collection)
                  </p>
                  <select
                    id="default-sort"
                    value={defaultSort}
                    onChange={(e) => setDefaultSort(e.target.value as "dateAdded" | "recentlyModified" | "title" | "domain")}
                    className="w-full rounded-lg bg-white/5 backdrop-blur-sm px-4 py-2 text-sm text-foreground border border-white/10 focus:border-accent focus:outline-none transition-colors"
                  >
                    <option value="dateAdded">Date Added</option>
                    <option value="recentlyModified">Recently Modified</option>
                    <option value="title">Title</option>
                    <option value="domain">Domain</option>
                  </select>
                </div>
              </div>
            </TabsContent>

            {/* Connectors Tab */}
            <TabsContent value="connectors" className="space-y-6 mt-6 h-[550px] overflow-y-auto">
              <ConnectorsTabContent />
            </TabsContent>

            {/* Sync & Data Tab */}
            <TabsContent value="sync-data" className="space-y-6 mt-6 h-[550px] overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Sync Settings</Label>
                  <p className="text-sm text-gray-500 mt-1">
                    Control how your data is synced
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-lg border border-gray-800 bg-gray-900/50">
                    <div>
                      <Label className="text-gray-300">Server Sync</Label>
                      <p className="text-sm text-gray-500 mt-1">
                        Keep data local-only or sync with server
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded"
                      checked={serverSync}
                      onChange={(e) => setServerSync(e.target.checked)}
                    />
                  </div>

                  {/* Sub-toggle: Auto-sync when re-enabled */}
                  {!serverSync && (
                    <div className="flex items-center justify-between p-4 pl-8 rounded-lg border border-gray-700/50 bg-gray-900/30">
                      <div>
                        <Label className="text-gray-400 text-sm">Auto-sync when re-enabled</Label>
                        <p className="text-xs text-gray-500 mt-1">
                          Sync pending local changes when you turn server sync back on
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded"
                        checked={autoSyncOnReconnect}
                        onChange={(e) => setAutoSyncOnReconnect(e.target.checked)}
                      />
                    </div>
                  )}

                  {/* Coming Soon Section */}
                  <div className="p-4 rounded-lg border border-gray-700/50 bg-gray-900/30 opacity-50">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-gray-400 text-sm">Coming Soon</Label>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-gray-500 text-sm">Sync Frequency</Label>
                          <p className="text-xs text-gray-600 mt-1">
                            How often to sync with server
                          </p>
                        </div>
                        <select disabled className="rounded px-2 py-1 text-xs bg-gray-800/50 text-gray-600 border border-gray-700/50">
                          <option>Every 5 min</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-gray-500 text-sm">Conflict Resolution</Label>
                          <p className="text-xs text-gray-600 mt-1">
                            How to handle sync conflicts
                          </p>
                        </div>
                        <select disabled className="rounded px-2 py-1 text-xs bg-gray-800/50 text-gray-600 border border-gray-700/50">
                          <option>Ask me</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Import & Export</Label>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage your bookmark data
                  </p>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border border-gray-800 bg-gray-900/50">
                  <div>
                    <Label className="text-gray-300">Include Private Pawkits in Export</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Include private cards and collections when exporting
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded"
                    checked={includeDenInExport}
                    onChange={(e) => setIncludeDenInExport(e.target.checked)}
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <GlowButton onClick={handleExport} variant="primary" size="md">
                    Export JSON
                  </GlowButton>
                  <GlowButton
                    variant="primary"
                    size="md"
                    onClick={() => importFileInputRef.current?.click()}
                  >
                    Import JSON
                  </GlowButton>
                  <input
                    ref={importFileInputRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={handleImport}
                  />
                </div>
                {dataMessage && (
                  <p className="text-sm text-gray-400 bg-gray-900/50 p-3 rounded-lg">
                    {dataMessage}
                  </p>
                )}
              </div>

              {/* Storage Cleanup Section */}
              <StorageCleanupSection />

              {/* Sample Data Section - only show if sample data exists */}
              {hasSampleData && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Sample Data</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Remove the sample bookmarks, notes, and pawkits created when you signed up
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-amber-900/50 bg-amber-950/20">
                    {showDeleteConfirm ? (
                      <div className="space-y-3">
                        <p className="text-sm text-amber-200">
                          Are you sure? This will delete all sample content including:
                        </p>
                        <ul className="text-xs text-gray-400 list-disc list-inside space-y-1">
                          <li>Welcome to Pawkit, Read Later, and Articles pawkits</li>
                          <li>All sample bookmarks (IMDB, GitHub, YouTube, etc.)</li>
                          <li>Welcome notes and daily note</li>
                          <li>Sample calendar event</li>
                        </ul>
                        <div className="flex gap-2 pt-2">
                          <GlowButton
                            variant="danger"
                            size="sm"
                            onClick={handleDeleteSampleData}
                            disabled={deletingSampleData}
                          >
                            {deletingSampleData ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Deleting...
                              </>
                            ) : (
                              "Yes, Delete Sample Data"
                            )}
                          </GlowButton>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={deletingSampleData}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-300 flex items-center gap-2">
                            <Trash2 className="h-4 w-4 text-amber-500" />
                            Delete Sample Data
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Your own data will not be affected
                          </p>
                        </div>
                        <GlowButton
                          variant="primary"
                          size="sm"
                          onClick={() => setShowDeleteConfirm(true)}
                        >
                          Delete Sample Data
                        </GlowButton>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Danger Zone */}
              <div className="mt-8 pt-6 border-t border-gray-800">
                <Label className="text-red-400">Danger Zone</Label>
                <div className="mt-4 p-4 rounded-lg border border-red-900/50 bg-red-950/20">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-300">Clear All Data</div>
                        <p className="text-xs text-gray-500 mt-1">
                          Delete all cards and collections permanently
                        </p>
                      </div>
                      <GlowButton variant="danger" size="sm" onClick={handleClear}>
                        Clear Data
                      </GlowButton>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-red-900/30">
                      <div>
                        <div className="text-sm font-medium text-gray-300">Delete Account</div>
                        <p className="text-xs text-gray-500 mt-1">
                          Permanently delete your account and all data
                        </p>
                      </div>
                      <GlowButton variant="danger" size="sm" disabled>
                        Delete
                      </GlowButton>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-6 mt-6 h-[550px] overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Developer Options</Label>
                  <p className="text-sm text-gray-500 mt-1">
                    Advanced settings for developers
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preview-url" className="text-gray-300">
                    Preview Service URL
                  </Label>
                  <p className="text-sm text-gray-500">
                    Must contain {`{{url}}`} token
                  </p>
                  <Input
                    id="preview-url"
                    value={previewServiceUrl}
                    onChange={(e) => setPreviewServiceUrl(e.target.value)}
                    placeholder="https://example.com/preview?url={{url}}"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="sticky bottom-0 border-t border-white/10 bg-white/5 backdrop-blur-lg p-6 flex justify-end gap-3">
          <GlowButton onClick={onClose} variant="primary" size="md">
            Cancel
          </GlowButton>
          <GlowButton onClick={handleSave} variant="success" size="md" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </GlowButton>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// Wrapper component that prevents re-renders when closed
export function ProfileModal(props: ProfileModalProps) {
  // Early return prevents all store subscriptions when modal is closed
  if (!props.open || typeof document === 'undefined') return null;

  return <ProfileModalContent {...props} />;
}
