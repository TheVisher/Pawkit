'use client';

import { X, Minus, PanelRightClose, PanelRightOpen, Trash2 } from 'lucide-react';
import { useKitStore } from '@/lib/hooks/use-kit-store';
import { cn } from '@/lib/utils';

interface KitHeaderProps {
  onClose: () => void;
  onMinimize: () => void;
  onAnchor: () => void;
  isMinimized: boolean;
  isAnchored: boolean;
}

export function KitHeader({
  onClose,
  onMinimize,
  onAnchor,
  isMinimized,
  isAnchored
}: KitHeaderProps) {
  const { messages, clearMessages } = useKitStore();

  return (
    <div className={cn(
      "kit-drag-handle flex-shrink-0",
      "flex items-center justify-between",
      "px-3 py-2 h-12",
      "border-b border-white/10",
      "cursor-move select-none",
      "bg-white/5"
    )}>
      {/* Left side - icon and title */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center">
          <span className="text-sm">🐕</span>
        </div>
        <div>
          <h3 className="font-medium text-sm leading-none">Kit</h3>
          {!isMinimized && (
            <p className="text-[10px] text-muted-foreground">Your Pawkit Assistant</p>
          )}
        </div>
      </div>

      {/* Right side - window controls */}
      <div className="flex items-center gap-1">
        {/* Clear chat button */}
        {messages.length > 0 && !isMinimized && (
          <button
            onClick={clearMessages}
            title="Clear chat"
            className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
          >
            <Trash2 size={14} className="text-muted-foreground" />
          </button>
        )}

        {/* Anchor button */}
        <button
          onClick={onAnchor}
          title={isAnchored ? "Detach window" : "Anchor to side"}
          className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
        >
          {isAnchored ? (
            <PanelRightOpen size={14} className="text-muted-foreground" />
          ) : (
            <PanelRightClose size={14} className="text-muted-foreground" />
          )}
        </button>

        {/* Minimize button */}
        <button
          onClick={onMinimize}
          title={isMinimized ? "Expand" : "Minimize"}
          className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
        >
          <Minus size={14} className="text-muted-foreground" />
        </button>

        {/* Close button */}
        <button
          onClick={onClose}
          title="Close"
          className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
        >
          <X size={14} className="text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
