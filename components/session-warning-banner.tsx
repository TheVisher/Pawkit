"use client";

import { useMultiSessionDetector } from "@/lib/hooks/use-multi-session-detector";
import { AlertCircle, X } from "lucide-react";
import { useState } from "react";

/**
 * Session Warning Banner
 *
 * Shows when another tab on the same device is active.
 * Uses localStorage for cross-tab communication (no server polling).
 * Follows Pawkit glass morphism + purple glow design language.
 */
export function SessionWarningBanner() {
  const { takeoverSession, hasOtherSessions, otherDevices } = useMultiSessionDetector();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if dismissed or no other sessions detected
  if (dismissed || !hasOtherSessions) {
    return null;
  }

  const handleTakeover = () => {
    takeoverSession();
    setDismissed(true);
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[150] animate-slide-down">
      <div className="backdrop-blur-md bg-white/5 rounded-2xl border border-white/10 shadow-[0_0_30px_rgba(168,85,247,0.2)] px-6 py-4 min-w-[500px] max-w-2xl">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <AlertCircle className="h-6 w-6 text-purple-400" />
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Another Tab is Active
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Another tab on this device is currently the active session. You can continue in read-only mode or take control to edit.
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDismissed(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-white/10 transition-all duration-200"
              >
                Continue Read-Only
              </button>
              <button
                onClick={handleTakeover}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500/20 border border-purple-500/50 text-purple-200 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all duration-200"
              >
                Use This Tab →
              </button>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
