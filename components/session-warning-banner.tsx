"use client";

import { useMultiSessionDetector } from "@/lib/hooks/use-multi-session-detector";
import { AlertCircle, X, Monitor } from "lucide-react";
import { useState } from "react";

export function SessionWarningBanner() {
  const { otherDevices, takeoverSession, hasOtherSessions } = useMultiSessionDetector();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if dismissed or no other sessions
  if (dismissed || !hasOtherSessions) {
    return null;
  }

  const mostRecentDevice = otherDevices[0];
  const lastActiveTime = new Date(mostRecentDevice.lastActive);
  const secondsAgo = Math.floor((Date.now() - lastActiveTime.getTime()) / 1000);

  const timeAgoText =
    secondsAgo < 60
      ? `${secondsAgo}s ago`
      : secondsAgo < 3600
      ? `${Math.floor(secondsAgo / 60)}m ago`
      : `${Math.floor(secondsAgo / 3600)}h ago`;

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
              Active Session Detected
            </h3>
            <p className="text-xs text-orange-200/80 mb-3">
              You're currently logged in on:
            </p>

            {/* Device Info */}
            <div className="flex items-center gap-3 bg-black/20 rounded-lg px-3 py-2 mb-3">
              <Monitor className="h-4 w-4 text-orange-300" />
              <div className="flex-1">
                <div className="text-sm font-medium text-orange-100">
                  {mostRecentDevice.deviceName}
                </div>
                <div className="text-xs text-orange-300/60">
                  Active {timeAgoText}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDismissed(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-orange-200 hover:bg-white/10 transition-colors"
              >
                Continue on {mostRecentDevice.deviceName.split(' - ')[0]}
              </button>
              <button
                onClick={handleTakeover}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white transition-colors shadow-lg"
              >
                Use This Device →
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
