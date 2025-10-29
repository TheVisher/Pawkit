"use client";

import { useMultiSessionDetector } from "@/lib/hooks/use-multi-session-detector";
import { AlertCircle, X } from "lucide-react";
import { useState } from "react";

/**
 * Session Warning Banner
 *
 * Note: With localStorage-only multi-session detection, this banner
 * no longer shows because we don't track other devices via server.
 * We only detect when another tab on the SAME device takes over.
 *
 * Kept for potential future use if we re-add cross-device detection.
 */
export function SessionWarningBanner() {
  const { takeoverSession, hasOtherSessions } = useMultiSessionDetector();
  const [dismissed, setDismissed] = useState(false);

  // Don't show - hasOtherSessions is always false with localStorage-only approach
  // (we only track same-device tabs, not other devices)
  if (dismissed || !hasOtherSessions) {
    return null;
  }

  const handleTakeover = () => {
    takeoverSession();
    setDismissed(true);
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[150] animate-slide-down">
      <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-lg rounded-2xl border border-orange-500/30 shadow-glow-orange px-6 py-4 min-w-[500px] max-w-2xl">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <AlertCircle className="h-6 w-6 text-orange-400" />
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-orange-100 mb-1">
              Another Tab is Active
            </h3>
            <p className="text-xs text-orange-200/80 mb-3">
              Another tab on this device is currently the active session.
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDismissed(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-orange-200 hover:bg-white/10 transition-colors"
              >
                Continue Read-Only
              </button>
              <button
                onClick={handleTakeover}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white transition-colors shadow-lg"
              >
                Use This Tab →
              </button>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors text-orange-300"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
