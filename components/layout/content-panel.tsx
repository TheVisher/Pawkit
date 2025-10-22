"use client";

import { ReactNode } from "react";

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
  // Determine if we have floating or anchored panels
  const hasFloatingLeft = leftOpen && leftMode === "floating";
  const hasFloatingRight = rightOpen && rightMode === "floating";
  const hasAnchoredLeft = leftOpen && leftMode === "anchored";
  const hasAnchoredRight = rightOpen && rightMode === "anchored";

  // When panels are anchored, we need to be flush with them (no border on that side)
  // When panels are floating, we need margins and full borders
  const hasAnyFloating = hasFloatingLeft || hasFloatingRight;

  // Build border classes dynamically
  const borderClasses = hasAnyFloating
    ? "border border-white/10" // Full border when floating
    : `${hasAnchoredLeft ? "border-l-0" : "border-l"} ${hasAnchoredRight ? "border-r-0" : "border-r"} border-t border-b border-white/10`; // No border on anchored sides

  // Border radius - only when we have floating panels
  const roundedClasses = hasAnyFloating ? "rounded-2xl" : "rounded-none";

  // Margins - only when we have floating panels
  const marginClasses = hasAnyFloating ? "m-4" : "";

  return (
    <div
      className={`
        relative flex flex-1 flex-col
        bg-white/5 backdrop-blur-lg
        overflow-hidden
        z-10
        ${borderClasses}
        ${roundedClasses}
        ${marginClasses}
      `}
    >
      {/* Content container with higher z-index for interactivity */}
      <div className="relative z-20 flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
