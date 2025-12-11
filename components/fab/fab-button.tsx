'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FabButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
  highlight?: boolean;
}

export function FabButton({
  icon: Icon,
  label,
  onClick,
  active,
  highlight
}: FabButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center",
        "bg-[rgb(30,30,35)] border border-white/20",
        "hover:bg-[rgb(40,40,45)] hover:border-white/30",
        "transition-all duration-200",
        "shadow-xl shadow-black/50",
        active && "bg-white/20 border-white/30",
        highlight && "hover:shadow-purple-500/40 hover:border-purple-500/50",
        highlight && active && "shadow-purple-500/50 border-purple-500/50 bg-purple-500/30"
      )}
    >
      <Icon size={20} className={cn(
        "text-white/70",
        active && "text-white",
        highlight && active && "text-purple-300"
      )} />
    </button>
  );
}
