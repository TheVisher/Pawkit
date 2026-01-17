'use client';

/**
 * Callout NodeView Component
 *
 * Renders callout/admonition blocks with type-specific icons and colors.
 * Allows changing callout type via a dropdown menu.
 */

import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useState, useRef, useEffect } from 'react';
import {
  Info,
  AlertTriangle,
  Lightbulb,
  AlertCircle,
  StickyNote,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalloutType } from './callout';

interface CalloutConfig {
  icon: typeof Info;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const calloutConfig: Record<CalloutType, CalloutConfig> = {
  info: {
    icon: Info,
    label: 'Info',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500',
  },
  warning: {
    icon: AlertTriangle,
    label: 'Warning',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500',
  },
  tip: {
    icon: Lightbulb,
    label: 'Tip',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500',
  },
  danger: {
    icon: AlertCircle,
    label: 'Danger',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500',
  },
  note: {
    icon: StickyNote,
    label: 'Note',
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500',
  },
};

export function CalloutNodeView({ node, updateAttributes }: NodeViewProps) {
  const type = node.attrs.type as CalloutType;
  const config = calloutConfig[type];
  const Icon = config.icon;

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const changeType = (newType: CalloutType) => {
    updateAttributes({ type: newType });
    setShowDropdown(false);
  };

  return (
    <NodeViewWrapper className="callout-wrapper">
      <div
        className={cn(
          'callout',
          `callout-${type}`,
          'flex gap-3 p-3 rounded-lg my-2 border-l-4 relative group'
        )}
        data-callout=""
        data-type={type}
      >
        {/* Icon and Type Selector */}
        <div className="flex-shrink-0 relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md transition-colors',
              'hover:bg-black/5 dark:hover:bg-white/5',
              'focus:outline-none focus:ring-2 focus:ring-offset-1',
              config.color
            )}
            title="Change callout type"
          >
            <Icon className="h-5 w-5" />
            <ChevronDown className="h-3 w-3 opacity-50" />
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div
              className={cn(
                'absolute top-full left-0 mt-1 z-50 min-w-[140px]',
                'rounded-lg',
                'bg-[var(--glass-panel-bg)]',
                'backdrop-blur-[var(--glass-blur)] backdrop-saturate-[var(--glass-saturate)]',
                'border border-[var(--glass-border)]',
                'shadow-[var(--glass-shadow)]',
                'py-1',
                'animate-in fade-in-0 zoom-in-95 duration-100'
              )}
            >
              {(Object.entries(calloutConfig) as [CalloutType, CalloutConfig][]).map(
                ([calloutType, calloutTypeConfig]) => {
                  const TypeIcon = calloutTypeConfig.icon;
                  return (
                    <button
                      key={calloutType}
                      onClick={() => changeType(calloutType)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors',
                        'hover:bg-[var(--glass-bg)]',
                        calloutType === type && 'bg-[var(--glass-bg-hover)]'
                      )}
                    >
                      <TypeIcon className={cn('h-4 w-4', calloutTypeConfig.color)} />
                      <span className="text-sm text-[var(--color-text-primary)]">
                        {calloutTypeConfig.label}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <NodeViewContent className="callout-content" />
        </div>
      </div>

      {/* Styles for callout content */}
      <style jsx global>{`
        .callout-content > * {
          margin: 0;
        }

        .callout-content > * + * {
          margin-top: 0.5rem;
        }

        .callout-content p.is-editor-empty:first-child::before {
          color: var(--color-text-muted);
          content: 'Type something...';
          float: left;
          height: 0;
          pointer-events: none;
        }

        /* Prevent nested callouts from having extra padding */
        .callout .callout {
          margin: 0.5rem 0;
        }
      `}</style>
    </NodeViewWrapper>
  );
}

export default CalloutNodeView;
