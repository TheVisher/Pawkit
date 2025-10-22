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
  // In float mode, add margins to create space from floating panels
  // In anchor mode, the parent handles padding, so we fill the space
  const hasFloatingLeft = leftOpen && leftMode === "floating";
  const hasFloatingRight = rightOpen && rightMode === "floating";

  return (
    <div
      className={`
        relative flex flex-1 flex-col
        bg-white/5 backdrop-blur-lg
        border border-white/10
        overflow-hidden
        z-10
        ${hasFloatingLeft || hasFloatingRight ? "m-4 rounded-2xl" : "rounded-none"}
      `}
    >
      {/* Content container with higher z-index for interactivity */}
      <div className="relative z-20 flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
