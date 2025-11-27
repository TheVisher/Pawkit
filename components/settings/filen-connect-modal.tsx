"use client";

import { useState } from "react";
import { Loader2, Lock, Shield } from "lucide-react";
import { GlassModal } from "@/components/ui/glass-modal";
import { GlowButton } from "@/components/ui/glow-button";
import { filenService } from "@/lib/services/filen-service";
import { useConnectorStore } from "@/lib/stores/connector-store";

interface FilenConnectModalProps {
  open: boolean;
  onClose: () => void;
}

export function FilenConnectModal({ open, onClose }: FilenConnectModalProps) {
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
        // Create Pawkit folder
        await filenService.ensurePawkitFolder();

        setFilenConnected(email);
        handleClose();
      } else {
        // Check if 2FA is required
        if (result.error?.includes("Two-factor")) {
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

  return (
    <GlassModal open={open} onClose={handleClose} maxWidth="md">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 border border-purple-500/30">
          <Lock className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Connect to Filen</h2>
          <p className="text-sm text-gray-400">End-to-end encrypted cloud storage</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleConnect} className="space-y-4">
        {/* Email */}
        <div>
          <label htmlFor="filen-email" className="block text-sm font-medium text-gray-300 mb-1.5">
            Email
          </label>
          <input
            id="filen-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/20 transition-colors"
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="filen-password" className="block text-sm font-medium text-gray-300 mb-1.5">
            Password
          </label>
          <input
            id="filen-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your Filen password"
            required
            autoComplete="current-password"
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/20 transition-colors"
          />
        </div>

        {/* 2FA Code - Only show if required */}
        {needs2FA && (
          <div>
            <label htmlFor="filen-2fa" className="block text-sm font-medium text-gray-300 mb-1.5">
              2FA Code
            </label>
            <input
              id="filen-2fa"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={twoFactor}
              onChange={(e) => setTwoFactor(e.target.value)}
              placeholder="Enter 6-digit code"
              autoComplete="one-time-code"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/20 transition-colors"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the code from your authenticator app
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <p className="text-sm text-rose-400">{error}</p>
          </div>
        )}

        {/* Security Notice */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
          <Shield className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-gray-400">
              Your credentials are encrypted end-to-end using Filen&apos;s zero-knowledge
              architecture. They are processed locally and never stored on Pawkit servers.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-full text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <GlowButton
            type="submit"
            disabled={isLoading || !email || !password}
            variant="primary"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect"
            )}
          </GlowButton>
        </div>
      </form>
    </GlassModal>
  );
}
