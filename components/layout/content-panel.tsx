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
  const hasAnchoredLeft = leftOpen && leftMode === "anchored";
  const hasAnchoredRight = rightOpen && rightMode === "anchored";

  // Calculate exact positioning
  // Floating panels: 325px width + 16px margin on each side = 357px total space
  // Anchored panels: 325px width, flush to edge
  // Default: 16px margin
  const leftPosition = leftOpen
    ? (leftMode === "floating" ? "357px" : "325px")
    : "16px";

  const rightPosition = rightOpen
    ? (rightMode === "floating" ? "357px" : "325px")
    : "16px";

  // Build border classes dynamically
  // When panels are anchored, we need to be flush with them (no border on that side)
  const borderClasses = `
    ${hasAnchoredLeft ? "border-l-0" : "border-l"}
    ${hasAnchoredRight ? "border-r-0" : "border-r"}
    border-t border-b border-white/10
  `;

  // Border radius - when floating panels are present or no panels
  const roundedClasses = (leftMode === "floating" || rightMode === "floating" || (!leftOpen && !rightOpen)) ? "rounded-2xl" : "rounded-none";

  return (
    <div
      className={`
        absolute
        top-4 bottom-4
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
        transition: "left 0.3s ease-out, right 0.3s ease-out"
      }}
    >
      {/* Content container with scrolling */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {children}
      </div>
    </div>
  );
}
