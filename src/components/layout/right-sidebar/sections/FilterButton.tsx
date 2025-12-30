"use client";

/**
 * Shared filter button component with consistent styling
 */

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface FilterButtonProps {
  isActive: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  children: React.ReactNode;
  showIndicator?: React.ReactNode;
  variant?: "default" | "grid";
}

export function FilterButton({
  isActive,
  onClick,
  icon: Icon,
  children,
  showIndicator,
  variant = "default",
}: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-xs rounded-md transition-all duration-200 w-full justify-start",
        variant === "grid" && "justify-center",
        isActive
          ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm font-medium"
          : "border border-transparent text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary",
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      <span className={cn(variant === "default" && "truncate")}>{children}</span>
      {showIndicator}
    </button>
  );
}

interface CompactButtonProps {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function CompactButton({ isActive, onClick, children }: CompactButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-2 py-1.5 text-xs rounded-md transition-all duration-200",
        isActive
          ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm font-medium"
          : "text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary",
      )}
    >
      {children}
    </button>
  );
}
