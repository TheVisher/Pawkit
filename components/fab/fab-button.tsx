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
        "bg-black/40 backdrop-blur-xl border border-white/10",
        "hover:bg-white/10 hover:border-white/20",
        "transition-all duration-200",
        "shadow-lg",
        active && "bg-white/10 border-white/20",
        highlight && "hover:shadow-purple-500/25 hover:border-purple-500/50",
        highlight && active && "shadow-purple-500/30 border-purple-500/50 bg-purple-500/20"
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
