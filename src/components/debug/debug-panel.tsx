'use client';

import { useState, useRef, useEffect } from 'react';
import { useDebugStore, PRESETS } from '@/lib/stores/debug-store';
import { cn } from '@/lib/utils';
import {
  GridSection,
  ResizeObserverSection,
  ScrollSection,
  ReactSection,
  ImageSection,
  CacheSection,
  MetricsSection,
} from './sections';
import { SectionHeader, PresetButton } from './controls';

// Section definitions
const SECTIONS = [
  { id: 'resizeObserver', label: 'ResizeObserver', badge: 'CRITICAL', component: ResizeObserverSection },
  { id: 'scroll', label: 'Scroll & Virtualization', badge: 'CRITICAL', component: ScrollSection },
  { id: 'grid', label: 'Masonry Grid', component: GridSection },
  { id: 'react', label: 'React & Framer', component: ReactSection },
  { id: 'image', label: 'Image Loading', component: ImageSection },
  { id: 'cache', label: 'Cache & IndexedDB', component: CacheSection },
  { id: 'metrics', label: 'Performance Metrics', component: MetricsSection },
] as const;

export function DebugPanel() {
  const {
    isPanelOpen,
    closePanel,
    expandedSections,
    toggleSection,
    applyPreset,
    resetToDefaults,
    exportSettingsJson,
  } = useDebugStore();

  const [position, setPosition] = useState({ x: 20, y: 100 });

  // Set initial position on mount (bottom-left)
  useEffect(() => {
    setPosition({ x: 20, y: window.innerHeight - 500 });
  }, []);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [copyFeedback, setCopyFeedback] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  const handleCopySettings = async () => {
    const json = exportSettingsJson();
    await navigator.clipboard.writeText(json);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  if (!isPanelOpen) return null;

  return (
    <div
      ref={panelRef}
      className={cn(
        'fixed z-[9999] w-[340px] max-h-[70vh]',
        'bg-bg-surface-1/95 backdrop-blur-xl',
        'border border-glass-border rounded-xl',
        'shadow-2xl overflow-hidden',
        'flex flex-col',
        'select-none'
      )}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {/* Header - Draggable */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-glass-border bg-bg-surface-2/50 cursor-move"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-semibold text-xs">Performance Debug</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopySettings}
            className="p-1 hover:bg-bg-surface-3 rounded transition-colors"
            title="Copy settings as JSON"
          >
            {copyFeedback ? (
              <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
          <button
            onClick={resetToDefaults}
            className="p-1 hover:bg-bg-surface-3 rounded transition-colors"
            title="Reset to defaults"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={closePanel}
            className="p-1 hover:bg-bg-surface-3 rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="flex gap-1 p-2 border-b border-glass-border bg-bg-surface-2/30">
        <PresetButton label="V1 Mode" onClick={() => applyPreset('v1')} />
        <PresetButton label="V2 Mode" onClick={() => applyPreset('v2')} />
        <PresetButton label="Max Perf" onClick={() => applyPreset('maxPerf')} variant="warning" />
        <PresetButton label="Debug" onClick={() => applyPreset('debug')} />
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {SECTIONS.map(({ id, label, badge, component: SectionComponent }) => (
          <div key={id} className="rounded-lg bg-bg-surface-2/30">
            <SectionHeader
              title={label}
              badge={badge}
              isExpanded={expandedSections.includes(id)}
              onToggle={() => toggleSection(id)}
            />
            {expandedSections.includes(id) && (
              <div className="px-2 pb-2">
                <SectionComponent />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-glass-border bg-bg-surface-2/30 text-[10px] text-text-muted">
        <span>Ctrl+Shift+D to toggle</span>
      </div>
    </div>
  );
}
