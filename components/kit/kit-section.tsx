'use client';

import { useState } from 'react';
import { MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { KitChatPanel } from './kit-chat-panel';

/**
 * Kit section for the control panel sidebar
 * Can be collapsed/expanded
 */
export function KitSection() {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border-b border-white/10">
      {/* Header - clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-purple-400" />
          <span className="text-sm font-medium">Ask Kit</span>
        </div>
        {isExpanded ? (
          <ChevronUp size={16} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={16} className="text-muted-foreground" />
        )}
      </button>

      {/* Chat panel */}
      {isExpanded && (
        <div className="h-[400px] border-t border-white/5">
          <KitChatPanel />
        </div>
      )}
    </div>
  );
}
