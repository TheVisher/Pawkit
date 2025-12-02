"use client";

import { ReactNode, useEffect } from "react";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";

type ContentPanelProps = {
  children: ReactNode;
  leftOpen: boolean;
  leftMode: "floating" | "anchored";
  rightOpen: boolean;
  rightMode: "floating" | "anchored";
};

export function ContentPanel({
  children,
  leftOpen,
  leftMode,
  rightOpen,
  rightMode,
}: ContentPanelProps) {
  // Mobile detection - on mobile, content takes full width
  const isMobile = useIsMobile();

  // Content panel mode is always tied to left panel mode
  const contentIsAnchored = leftMode === "anchored";

  // Determine if we have floating or anchored panels
  const hasAnchoredLeft = leftOpen && leftMode === "anchored";
  const hasAnchoredRight = rightOpen && rightMode === "anchored";

  // Special case: left floating + content floating + right anchored
  // = Right panel embeds INSIDE content panel
  const isRightEmbedded = !contentIsAnchored && hasAnchoredRight;

  // Calculate exact positioning
  // When content is anchored:
  //   - Left: 0 or 325px (if left panel is open)
  //   - Right: 0, 325px (if right is anchored), or 16px (if right is floating/closed)
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
  // - Embedded mode: content ends at 341px (325px panel + 16px margin) so panel sits flush
  // - Normal mode: standard positioning
  const rightPosition = isMobile
    ? "0"
    : (contentIsAnchored
      ? (rightOpen && rightMode === "anchored" ? "325px" : "0")
      : (isRightEmbedded ? "341px" : (rightOpen ? (rightMode === "floating" ? "357px" : "325px") : "16px")));

  // Build border classes dynamically
  // Mobile: no borders (full screen)
  // When content is anchored, remove all borders
  // When content is floating, show borders except where anchored/embedded panels are
  const borderClasses = isMobile
    ? "border-0"
    : (contentIsAnchored
      ? "border-0"
      : `
        ${hasAnchoredLeft ? "border-l-0" : "border-l"}
        ${hasAnchoredRight || isRightEmbedded ? "border-r-0" : "border-r"}
        border-t border-b border-white/10
      `);

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
  }, [leftOpen, leftMode, rightOpen, rightMode, leftPosition, rightPosition, contentIsAnchored, isRightEmbedded, hasAnchoredLeft, hasAnchoredRight]);

  return (
    <div
      className={`
        absolute
        ${verticalClasses}
        bg-white/5
        flex flex-col
        z-10
        transition-all duration-300
        ${borderClasses}
        ${roundedClasses}
      `}
      style={{
        left: leftPosition,
        right: rightPosition,
        boxShadow: "inset 0 2px 4px 0 rgba(255, 255, 255, 0.06)",
        // Smooth transitions for panel position changes
        transition: "left 0.3s ease-out, right 0.3s ease-out",
        // Only apply backdrop-blur when not in embedded mode to avoid Chrome rendering bug
        backdropFilter: isRightEmbedded ? 'none' : 'blur(16px)',
        WebkitBackdropFilter: isRightEmbedded ? 'none' : 'blur(16px)',
      }}
      data-content-panel
      data-right-embedded={isRightEmbedded}
    >
      {/* Content container with scrolling */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {children}
      </div>
    </div>
  );
}
