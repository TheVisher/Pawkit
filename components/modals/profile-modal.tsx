"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { GlowButton } from "@/components/ui/glow-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettingsStore } from "@/lib/hooks/settings-store";
import { useAuth } from "@/lib/contexts/auth-context";
import { LogOut, Settings, User } from "lucide-react";

type ProfileModalProps = {
  open: boolean;
  onClose: () => void;
  username: string;
  email?: string;
  avatarUrl?: string;
};

// Inner component that only renders when modal is open
function ProfileModalContent({ open, onClose, username, email = "", avatarUrl }: ProfileModalProps) {
  const [userEmail, setUserEmail] = useState(email);
  const [avatarPreview, setAvatarPreview] = useState(avatarUrl || "");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth
  const { signOut } = useAuth();

  // Settings from store (including displayName)
  const displayName = useSettingsStore((state) => state.displayName);
  const setDisplayName = useSettingsStore((state) => state.setDisplayName);
  const [name, setName] = useState(displayName || username);

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
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

  const handleSignOutClick = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out failed:', err);
      alert('Sign out error: ' + (err instanceof Error ? err.message : String(err)));
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
    return (
      <div
        className="flex h-full w-full items-center justify-center text-4xl font-semibold"
        style={{
          background: 'linear-gradient(135deg, var(--ds-accent) 0%, var(--ds-accent-muted) 100%)',
          color: 'white',
        }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(12px)',
      }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-md overflow-hidden"
        style={{
          background: 'var(--bg-surface-2)',
          boxShadow: 'var(--shadow-3)',
          border: '1px solid var(--border-subtle)',
          borderTopColor: 'var(--border-highlight-top)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-5 flex items-center justify-between"
          style={{
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background: 'var(--ds-accent-muted)',
              }}
            >
              <User className="h-5 w-5" style={{ color: 'var(--ds-accent)' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Account
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Manage your profile
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-2xl leading-none transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Avatar Section */}
          <div className="flex items-center gap-5">
            <div
              className="h-20 w-20 rounded-full overflow-hidden"
              style={{
                boxShadow: 'var(--raised-shadow)',
                border: '3px solid var(--border-subtle)',
              }}
            >
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
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
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

          {/* Form Fields */}
          <div
            className="space-y-4 p-4 rounded-xl"
            style={{
              background: 'var(--bg-surface-1)',
              boxShadow: 'var(--inset-shadow)',
              border: 'var(--inset-border)',
              borderBottomColor: 'var(--inset-border-bottom)',
            }}
          >
            {/* Name Field */}
            <div className="space-y-1.5">
              <Label htmlFor="name" style={{ color: 'var(--text-secondary)' }}>
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
            <div className="space-y-1.5">
              <Label htmlFor="email" style={{ color: 'var(--text-secondary)' }}>
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
            <div className="space-y-1.5">
              <Label htmlFor="username" style={{ color: 'var(--text-secondary)' }}>
                Username
              </Label>
              <Input
                id="username"
                value={username}
                disabled
                style={{
                  background: 'var(--bg-surface-1)',
                  opacity: 0.7,
                }}
              />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Username cannot be changed
              </p>
            </div>
          </div>

          {/* Settings Link */}
          <Link
            href="/settings"
            onClick={onClose}
            className="flex items-center justify-between p-4 rounded-xl transition-all hover:scale-[1.01]"
            style={{
              background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
              boxShadow: 'var(--raised-shadow-sm)',
              border: '1px solid var(--border-subtle)',
              borderTopColor: 'var(--raised-border-top)',
            }}
          >
            <div className="flex items-center gap-3">
              <Settings className="h-4 w-4" style={{ color: 'var(--ds-accent)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                App Settings
              </span>
            </div>
            <span style={{ color: 'var(--ds-accent)' }}>→</span>
          </Link>

          {/* Sign Out */}
          <button
            type="button"
            onClick={handleSignOutClick}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-colors"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'rgb(248, 113, 113)',
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>

        {/* Footer */}
        <div
          className="p-5 flex justify-end gap-3"
          style={{
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
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
