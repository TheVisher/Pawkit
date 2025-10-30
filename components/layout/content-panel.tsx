"use client";

import { ReactNode, useEffect } from "react";

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

  const leftPosition = contentIsAnchored
    ? (leftOpen ? "325px" : "0")
    : (leftOpen ? (leftMode === "floating" ? "357px" : "325px") : "16px");

  // Right position calculation:
  // - Embedded mode: content ends at 341px (325px panel + 16px margin) so panel sits flush
  // - Normal mode: standard positioning
  const rightPosition = contentIsAnchored
    ? (rightOpen && rightMode === "anchored" ? "325px" : "0")
    : (isRightEmbedded ? "341px" : (rightOpen ? (rightMode === "floating" ? "357px" : "325px") : "16px"));

  // Build border classes dynamically
  // When content is anchored, remove all borders
  // When content is floating, show borders except where anchored/embedded panels are
  const borderClasses = contentIsAnchored
    ? "border-0"
    : `
      ${hasAnchoredLeft ? "border-l-0" : "border-l"}
      ${hasAnchoredRight || isRightEmbedded ? "border-r-0" : "border-r"}
      border-t border-b border-white/10
    `;

  // Border radius - only rounded when content is floating
  // When right is embedded, remove right-side rounding to merge with embedded panel
  const roundedClasses = contentIsAnchored
    ? "rounded-none"
    : isRightEmbedded
      ? "rounded-l-2xl rounded-r-none"
      : "rounded-2xl";

  // Vertical positioning - anchored content takes full height
  const verticalClasses = contentIsAnchored ? "top-0 bottom-0" : "top-4 bottom-4";

  // Debug logging to track panel state and dimensions
  useEffect(() => {
    console.log('=== CONTENT PANEL DEBUG ===');
    console.log('Left:', { open: leftOpen, mode: leftMode, anchored: hasAnchoredLeft });
    console.log('Right:', { open: rightOpen, mode: rightMode, anchored: hasAnchoredRight });
    console.log('Content anchored:', contentIsAnchored);
    console.log('Right embedded:', isRightEmbedded);
    console.log('Positions:', { left: leftPosition, right: rightPosition });

    // Log actual dimensions after render
    setTimeout(() => {
      const panel = document.querySelector('[data-content-panel]');
      if (panel) {
        const rect = panel.getBoundingClientRect();
        console.log('Actual ContentPanel dimensions:', {
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height
        });
      }
    }, 350); // Wait for transition to complete
  }, [leftOpen, leftMode, rightOpen, rightMode, leftPosition, rightPosition, contentIsAnchored, isRightEmbedded, hasAnchoredLeft, hasAnchoredRight]);

  return (
    <div
      className={`
        absolute
        ${verticalClasses}
        bg-white/5 backdrop-blur-lg
        flex flex-col
        overflow-hidden
        z-10
        transition-all duration-300
        ${borderClasses}
        ${roundedClasses}
      `}
      style={{
        left: leftPosition,
        right: rightPosition,
        boxShadow: "inset 0 2px 4px 0 rgba(255, 255, 255, 0.06)",
        // Disable smooth transitions in embedded mode to prevent Chromium CSS columns flickering
        transition: isRightEmbedded ? "none" : "left 0.3s ease-out, right 0.3s ease-out",
        // Chromium rendering fixes for embedded panel mode
        willChange: "left, right", // Hint to optimize transitions
        transform: "translateZ(0)", // Force hardware acceleration
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
