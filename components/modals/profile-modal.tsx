"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ProfileModalProps = {
  open: boolean;
  onClose: () => void;
  username: string;
  email?: string;
  avatarUrl?: string;
};

export function ProfileModal({ open, onClose, username, email = "", avatarUrl }: ProfileModalProps) {
  const [name, setName] = useState(username);
  const [userEmail, setUserEmail] = useState(email);
  const [avatar, setAvatar] = useState(avatarUrl || "");
  const [avatarPreview, setAvatarPreview] = useState(avatarUrl || "");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    // TODO: Implement API call to save profile
    // For now, just simulate saving
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    onClose();
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
        <div className="sticky top-0 z-10 border-b border-gray-800 bg-gray-950 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-100">Profile Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-6 mt-6">
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
            <TabsContent value="appearance" className="space-y-6 mt-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Theme</Label>
                  <p className="text-sm text-gray-500 mt-1">
                    Customize how Pawkit looks on your device
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <button className="p-4 rounded-lg border-2 border-accent bg-gray-900 text-left">
                    <div className="text-sm font-medium text-gray-100">Dark</div>
                    <div className="text-xs text-gray-500 mt-1">Current theme</div>
                  </button>
                  <button className="p-4 rounded-lg border-2 border-gray-700 bg-gray-900/50 text-left opacity-50 cursor-not-allowed">
                    <div className="text-sm font-medium text-gray-400">Light</div>
                    <div className="text-xs text-gray-500 mt-1">Coming soon</div>
                  </button>
                  <button className="p-4 rounded-lg border-2 border-gray-700 bg-gray-900/50 text-left opacity-50 cursor-not-allowed">
                    <div className="text-sm font-medium text-gray-400">Auto</div>
                    <div className="text-xs text-gray-500 mt-1">Coming soon</div>
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
                  <button className="h-10 w-10 rounded-full bg-purple-500 border-2 border-white shadow-lg" title="Purple (Current)" />
                  <button className="h-10 w-10 rounded-full bg-blue-500 border-2 border-transparent hover:border-white/50" title="Blue" />
                  <button className="h-10 w-10 rounded-full bg-green-500 border-2 border-transparent hover:border-white/50" title="Green" />
                  <button className="h-10 w-10 rounded-full bg-red-500 border-2 border-transparent hover:border-white/50" title="Red" />
                  <button className="h-10 w-10 rounded-full bg-orange-500 border-2 border-transparent hover:border-white/50" title="Orange" />
                </div>
              </div>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences" className="space-y-6 mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-gray-300">Notifications</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Receive notifications for important updates
                    </p>
                  </div>
                  <input type="checkbox" className="h-5 w-5 rounded" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-gray-300">Auto-save</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Automatically save changes as you type
                    </p>
                  </div>
                  <input type="checkbox" className="h-5 w-5 rounded" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-gray-300">Compact Mode</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Show more content on screen
                    </p>
                  </div>
                  <input type="checkbox" className="h-5 w-5 rounded" />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-gray-300">Show Previews</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Display image and link previews in cards
                    </p>
                  </div>
                  <input type="checkbox" className="h-5 w-5 rounded" defaultChecked />
                </div>
              </div>

              {/* Danger Zone */}
              <div className="mt-8 pt-6 border-t border-gray-800">
                <Label className="text-red-400">Danger Zone</Label>
                <div className="mt-4 p-4 rounded-lg border border-red-900/50 bg-red-950/20">
                  <div className="flex items-center justify-between">
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
            </TabsContent>
          </Tabs>
        </div>

        <div className="sticky bottom-0 border-t border-gray-800 bg-gray-950 p-6 flex justify-end gap-3">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
