"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarSectionProps {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  action?: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function SidebarSection({
  title,
  icon: Icon,
  children,
  action,
  defaultOpen = false,
  className,
}: SidebarSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("mb-1", className)}>
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer transition-colors group relative rounded-xl select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3 text-text-secondary group-hover:text-text-primary transition-colors relative z-10">
          {Icon && <Icon className="h-5 w-5" />}
          <span className="text-sm font-medium">{title}</span>

          {/* Hover Glow Line (Content Width + Extension) */}
          <div className="absolute -bottom-1 -left-2 -right-2 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-accent)] via-50% to-transparent opacity-0 transition-all duration-300 group-hover:opacity-100 blur-[0.5px]" />
        </div>

        <div className="flex items-center gap-2 relative z-10">
          {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
          <ChevronRight
            className={cn(
              "h-4 w-4 text-text-muted transition-transform duration-200",
              isOpen && "rotate-90",
            )}
          />
        </div>
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pb-2 pt-1 px-3 border-l-2 border-[var(--color-accent)]/30 ml-4 pl-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
