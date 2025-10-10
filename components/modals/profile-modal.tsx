"use client";

import { useState, useRef, useEffect, ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettingsStore, type Theme, type AccentColor } from "@/lib/hooks/settings-store";
import { useAuth } from "@/lib/contexts/auth-context";
import { Check, LogOut } from "lucide-react";

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

export function ProfileModal({ open, onClose, username, email = "", avatarUrl }: ProfileModalProps) {
  const [name, setName] = useState(username);
  const [userEmail, setUserEmail] = useState(email);
  const [avatar, setAvatar] = useState(avatarUrl || "");
  const [avatarPreview, setAvatarPreview] = useState(avatarUrl || "");
  const [saving, setSaving] = useState(false);
  const [dataMessage, setDataMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  // Auth
  const { signOut } = useAuth();

  // Settings from store
  const theme = useSettingsStore((state) => state.theme);
  const accentColor = useSettingsStore((state) => state.accentColor);
  const notifications = useSettingsStore((state) => state.notifications);
  const autoSave = useSettingsStore((state) => state.autoSave);
  const compactMode = useSettingsStore((state) => state.compactMode);
  const showPreviews = useSettingsStore((state) => state.showPreviews);
  const autoFetchMetadata = useSettingsStore((state) => state.autoFetchMetadata);
  const showThumbnails = useSettingsStore((state) => state.showThumbnails);
  const previewServiceUrl = useSettingsStore((state) => state.previewServiceUrl);
  const serverSync = useSettingsStore((state) => state.serverSync);

  const setTheme = useSettingsStore((state) => state.setTheme);
  const setAccentColor = useSettingsStore((state) => state.setAccentColor);
  const setNotifications = useSettingsStore((state) => state.setNotifications);
  const setAutoSave = useSettingsStore((state) => state.setAutoSave);
  const setCompactMode = useSettingsStore((state) => state.setCompactMode);
  const setShowPreviews = useSettingsStore((state) => state.setShowPreviews);
  const setAutoFetchMetadata = useSettingsStore((state) => state.setAutoFetchMetadata);
  const setShowThumbnails = useSettingsStore((state) => state.setShowThumbnails);
  const setPreviewServiceUrl = useSettingsStore((state) => state.setPreviewServiceUrl);
  const setServerSync = useSettingsStore((state) => state.setServerSync);

  if (!open || typeof document === 'undefined') return null;

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
      // Save display name
      const response = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name })
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      // Trigger a page refresh to update all components with new display name
      window.location.reload();
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    const response = await fetch("/api/import");
    if (!response.ok) {
      setDataMessage("Failed to export data");
      return;
    }
    const data = await response.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bookmark-export-${new Date().toISOString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDataMessage("Exported data");
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
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-950 rounded-lg border border-gray-800 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-gray-800 bg-gray-950 p-4 md:p-6 flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-100">Profile Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-4 md:p-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1">
              <TabsTrigger value="general" className="text-xs md:text-sm">General</TabsTrigger>
              <TabsTrigger value="appearance" className="text-xs md:text-sm">Appearance</TabsTrigger>
              <TabsTrigger value="preferences" className="text-xs md:text-sm">Preferences</TabsTrigger>
              <TabsTrigger value="data" className="text-xs md:text-sm">Data</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-6 mt-6 min-h-[550px]">
              {/* Avatar Section */}
              <div className="space-y-4">
                <Label className="text-gray-300">Profile Picture</Label>
                <div className="flex items-center gap-6">
                  <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-gray-700">
                    {getAvatarDisplay()}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload Photo
                    </Button>
                    {avatarPreview && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveAvatar}
                        className="text-red-400 hover:text-red-300"
                      >
                        Remove Photo
                      </Button>
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
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6 mt-6 min-h-[550px]">
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
            <TabsContent value="preferences" className="space-y-6 mt-6 min-h-[550px]">
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
                    <Label className="text-gray-300">Compact Mode</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Show more content on screen
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded"
                    checked={compactMode}
                    onChange={(e) => setCompactMode(e.target.checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-gray-300">Show Previews</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Display image and link previews in cards
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded"
                    checked={showPreviews}
                    onChange={(e) => setShowPreviews(e.target.checked)}
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
                    <Label className="text-gray-300">Show Thumbnails</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Show thumbnails in card views
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded"
                    checked={showThumbnails}
                    onChange={(e) => setShowThumbnails(e.target.checked)}
                  />
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

            {/* Data Tab */}
            <TabsContent value="data" className="space-y-6 mt-6 min-h-[550px]">
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Sync Settings</Label>
                  <p className="text-sm text-gray-500 mt-1">
                    Control how your data is synced
                  </p>
                </div>
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
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Import & Export</Label>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage your bookmark data
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleExport} variant="outline">
                    Export JSON
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => importFileInputRef.current?.click()}
                  >
                    Import JSON
                  </Button>
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
                      <Button variant="destructive" size="sm" onClick={handleClear}>
                        Clear Data
                      </Button>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-red-900/30">
                      <div>
                        <div className="text-sm font-medium text-gray-300">Delete Account</div>
                        <p className="text-xs text-gray-500 mt-1">
                          Permanently delete your account and all data
                        </p>
                      </div>
                      <Button variant="destructive" size="sm" disabled>
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="sticky bottom-0 border-t border-gray-800 bg-gray-950 p-6 flex justify-between items-center">
          <Button
            onClick={() => signOut()}
            variant="ghost"
            className="text-red-400 hover:text-red-300 hover:bg-red-950/20"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
          <div className="flex gap-3">
            <Button onClick={onClose} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
