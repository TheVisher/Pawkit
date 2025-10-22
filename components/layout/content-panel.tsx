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

  // Build border classes dynamically
  // When panels are anchored, we need to be flush with them (no border on that side)
  const borderClasses = `
    ${hasAnchoredLeft ? "border-l-0" : "border-l"}
    ${hasAnchoredRight ? "border-r-0" : "border-r"}
    border-t border-b border-white/10
  `;

  // Border radius - when floating panels are present
  const roundedClasses = (hasFloatingLeft || hasFloatingRight) ? "rounded-2xl" : "rounded-none";

  // Margin classes - account for panel positions
  // Floating panels: 400px width + 16px margin on each side = 432px total space
  // Anchored panels: 400px width, flush to edge
  let marginClasses = "my-4"; // Always have top/bottom margin

  if (leftOpen) {
    marginClasses += leftMode === "floating" ? " ml-[432px]" : " ml-[400px]";
  } else {
    marginClasses += " ml-4"; // No left panel, use default margin
  }

  if (rightOpen) {
    marginClasses += rightMode === "floating" ? " mr-[432px]" : " mr-[400px]";
  } else {
    marginClasses += " mr-4"; // No right panel, use default margin
  }

  return (
    <div
      className={`
        relative flex flex-col
        h-full w-full
        bg-white/5 backdrop-blur-lg
        z-10
        ${borderClasses}
        ${roundedClasses}
        ${marginClasses}
      `}
    >
      {/* Content container with higher z-index for interactivity */}
      <div className="relative z-20 h-full overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
