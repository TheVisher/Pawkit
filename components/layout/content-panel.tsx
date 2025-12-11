"use client";

import { ReactNode, useEffect } from "react";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { DynamicTopBar } from "@/components/top-bar/dynamic-top-bar";

type ContentPanelProps = {
  children: ReactNode;
  leftOpen: boolean;
  leftMode: "floating" | "anchored";
  rightOpen: boolean;
  rightMode: "floating" | "anchored";
  kitAnchored?: boolean; // NEW: Kit overlay anchored state
};

export function ContentPanel({
  children,
  leftOpen,
  leftMode,
  rightOpen,
  rightMode,
  kitAnchored = false,
}: ContentPanelProps) {
  // Mobile detection - on mobile, content takes full width
  const isMobile = useIsMobile();

  // Content panel mode is always tied to left panel mode
  const contentIsAnchored = leftMode === "anchored";

  // Determine if we have floating or anchored panels
  const hasAnchoredLeft = leftOpen && leftMode === "anchored";
  const hasAnchoredRight = rightOpen && rightMode === "anchored";

  // Kit takes precedence over right panel when anchored
  // If Kit is anchored, treat it like the right panel is anchored
  const effectiveRightAnchored = kitAnchored || hasAnchoredRight;

  // Special case: left floating + content floating + right anchored (or Kit anchored)
  // = Right panel/Kit embeds INSIDE content panel
  const isRightEmbedded = !contentIsAnchored && effectiveRightAnchored;

  // Calculate exact positioning
  // When content is anchored:
  //   - Left: 0 or 325px (if left panel is open)
  //   - Right: 0, 325px (if right is anchored or Kit anchored), or 16px (if right is floating/closed)
  // When content is floating:
  //   - Special case (right embedded): Right margin is 16px
  //   - Normal: 357px (floating panel) or 325px (anchored panel) or 16px (closed)

  // Mobile: full width, no margins
  // Desktop: calculate based on panel states
  const leftPosition = isMobile
    ? "0"
    : (contentIsAnchored
      ? (leftOpen ? "325px" : "0")
      : (leftOpen ? (leftMode === "floating" ? "357px" : "325px") : "16px"));

  // Right position calculation:
  // - Mobile: 0 (full width)
  // - Kit anchored takes precedence over right panel
  // - Embedded mode: content ends at 341px (325px panel + 16px margin) so panel sits flush
  // - Normal mode: standard positioning
  const rightPosition = isMobile
    ? "0"
    : (contentIsAnchored
      ? (effectiveRightAnchored ? "325px" : "0")
      : (isRightEmbedded ? "341px" : (rightOpen && !kitAnchored ? (rightMode === "floating" ? "357px" : "325px") : "16px")));

  // Build border classes dynamically
  // Mobile: no borders (full screen)
  // When content is anchored, remove all borders
  // When content is floating, show borders except where anchored/embedded panels are
  // Border classes - now handled via inline style with design tokens
  // Only need to control which borders are visible
  const borderClasses = isMobile
    ? ""
    : (contentIsAnchored
      ? ""
      : "");

  // Border radius - only rounded when content is floating on desktop
  // Mobile: no rounding (full screen)
  const roundedClasses = isMobile
    ? "rounded-none"
    : (contentIsAnchored
      ? "rounded-none"
      : isRightEmbedded
        ? "rounded-l-2xl rounded-r-none"
        : "rounded-2xl");

  // Vertical positioning
  // Mobile: account for mobile header (sticky top bar)
  // Desktop: anchored content takes full height, floating has margins
  const verticalClasses = isMobile
    ? "top-0 bottom-0"
    : (contentIsAnchored ? "top-0 bottom-0" : "top-4 bottom-4");

  // Debug logging to track panel state and dimensions
  useEffect(() => {

    // Log actual dimensions after render
    setTimeout(() => {
      const panel = document.querySelector('[data-content-panel]');
      if (panel) {
        const rect = panel.getBoundingClientRect();
      }
    }, 350); // Wait for transition to complete
  }, [leftOpen, leftMode, rightOpen, rightMode, kitAnchored, leftPosition, rightPosition, contentIsAnchored, isRightEmbedded, hasAnchoredLeft, hasAnchoredRight]);

  return (
    <div
      className={`
        absolute
        ${verticalClasses}
        flex flex-col
        z-10
        ${borderClasses}
        ${roundedClasses}
      `}
      style={{
        left: leftPosition,
        right: rightPosition,
        // Match sidebars: use same surface level (surface-1 is the main panel background)
        background: 'var(--bg-surface-1)',
        // Use shadow-4 for floating mode (same as sidebars), shadow-2 for anchored
        // Add subtle top inset shadow to separate from gradient background
        boxShadow: contentIsAnchored
          ? 'var(--shadow-2), inset 0 1px 3px var(--content-top-shadow)'
          : 'var(--shadow-4), inset 0 1px 3px var(--content-top-shadow)',
        border: '1px solid var(--border-subtle)',
        // Use CSS variables for border highlights
        borderTopColor: 'var(--border-highlight-top)',
        borderLeftColor: 'var(--border-highlight-left)',
        // ONLY transition position properties - transition-all causes major lag
        transition: "left 0.3s ease-out, right 0.3s ease-out",
        // Force GPU acceleration for smoother animations
        willChange: "left, right",
        // Note: Removed transform: translateZ(0) as it causes coordinate issues with drag-and-drop
      }}
      data-panel="content"
      data-content-panel
      data-right-embedded={isRightEmbedded}
    >
      {/* Content container with scrolling - scrollbar hidden for cleaner look */}
      {/* Top bar is INSIDE scroll container so backdrop-filter can blur scrolling content */}
      <div className="content-panel-scroll flex-1 overflow-y-auto scrollbar-hide relative">
        {/* Dynamic Top Bar - sticky inside scroll container for backdrop-filter to work */}
        {!isMobile && <DynamicTopBar />}

        {/* Page content with padding */}
        <div className="px-6 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}
