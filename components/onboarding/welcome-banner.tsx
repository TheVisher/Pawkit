"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Trash2, HelpCircle } from "lucide-react";
import { useDataStore } from "@/lib/stores/data-store";
import { useToastStore } from "@/lib/stores/toast-store";
import {
  deleteOnboardingData,
  ONBOARDING_TAG,
  ONBOARDING_PAWKIT_SLUGS,
} from "@/lib/services/onboarding-service";
import { useTourContext } from "@/components/onboarding/tour-provider";
import { cn } from "@/lib/utils";

interface WelcomeBannerProps {
  className?: string;
}

export function WelcomeBanner({ className }: WelcomeBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState<boolean | null>(null);

  const cards = useDataStore((state) => state.cards);
  const collections = useDataStore((state) => state.collections);

  // Check if sample data exists
  const hasSampleData =
    cards.some((c) => c.tags?.includes(ONBOARDING_TAG)) ||
    collections.some((c) => ONBOARDING_PAWKIT_SLUGS.includes(c.slug));

  // Fetch banner dismissed state on mount
  useEffect(() => {
    async function checkBannerState() {
      try {
        const response = await fetch("/api/user/settings");
        if (response.ok) {
          const settings = await response.json();
          setBannerDismissed(settings.onboardingBannerDismissed ?? false);
        }
      } catch (error) {
        console.error("[WelcomeBanner] Error fetching settings:", error);
        setBannerDismissed(false);
      }
    }
    checkBannerState();
  }, []);

  // Show banner if not dismissed and has sample data
  useEffect(() => {
    if (bannerDismissed === null) return; // Still loading
    setIsVisible(!bannerDismissed && hasSampleData);
  }, [bannerDismissed, hasSampleData]);

  const handleDismiss = async () => {
    setIsDismissing(true);
    try {
      await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingBannerDismissed: true }),
      });
      setBannerDismissed(true);
    } catch (error) {
      console.error("[WelcomeBanner] Error dismissing banner:", error);
    } finally {
      setIsDismissing(false);
    }
  };

  const handleDeleteSampleData = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteOnboardingData();
      useToastStore
        .getState()
        .success(
          `Sample data deleted! Removed ${result.deletedCards} items and ${result.deletedPawkits} pawkits.`
        );
      // Banner will auto-hide since hasSampleData will become false
    } catch (error) {
      console.error("[WelcomeBanner] Error deleting sample data:", error);
      useToastStore.getState().error("Failed to delete sample data");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTakeTour = () => {
    // Import and use tour context dynamically to avoid hook issues
    import("@/components/onboarding/tour-provider").then(({ useTourContext }) => {
      try {
        // This won't work as a hook outside component, so we'll dispatch a custom event
        window.dispatchEvent(new CustomEvent("pawkit:start-tour"));
      } catch {
        useToastStore.getState().info("Tour is loading...");
      }
    });
  };

  // Don't render if not visible or still loading
  if (bannerDismissed === null || !isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl",
        "backdrop-blur-md bg-white/5 border border-white/10",
        "shadow-[0_0_30px_var(--ds-accent-subtle)]",
        "transition-all duration-500 ease-out",
        isDismissing && "opacity-0 translate-y-[-10px]",
        className
      )}
    >
      {/* Accent gradient on left edge */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-accent via-accent/80 to-accent" />

      <div className="flex items-start gap-4 p-5 pl-6">
        {/* Icon */}
        <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-accent/20 border border-accent/30">
          <Sparkles className="w-6 h-6 text-accent" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-100 mb-1">
            Welcome to Pawkit!
          </h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            We&apos;ve added some sample bookmarks and notes to help you explore.
            Feel free to browse around, or delete them when you&apos;re ready to
            start fresh.
          </p>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button
              onClick={handleTakeTour}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
                "bg-accent/20 border border-accent/50",
                "text-accent-foreground",
                "shadow-[0_0_15px_var(--ds-accent-subtle)]",
                "hover:bg-accent/30 hover:shadow-[0_0_20px_var(--ds-accent-subtle)]",
                "transition-all duration-200"
              )}
            >
              <HelpCircle className="w-4 h-4" />
              Take a Tour
            </button>

            <button
              onClick={handleDeleteSampleData}
              disabled={isDeleting}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
                "bg-white/5 border border-white/10",
                "text-gray-300",
                "hover:border-accent/50 hover:shadow-[0_0_15px_var(--ds-accent-subtle)]",
                "transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? "Deleting..." : "Delete Sample Data"}
            </button>
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          disabled={isDismissing}
          className={cn(
            "flex-shrink-0 p-2 rounded-full",
            "text-gray-400 hover:text-gray-200",
            "hover:bg-white/10",
            "transition-all duration-200",
            "disabled:opacity-50"
          )}
          aria-label="Dismiss welcome banner"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
