'use client';

import { useDebugStore } from '@/lib/stores/debug-store';
import { SliderControl, CheckboxControl } from '../controls';

export function ResizeObserverSection() {
  const { enableResizeObserver, resizeDebounce, resizeThreshold, set } = useDebugStore();

  return (
    <div className="space-y-3">
      <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-[10px] text-yellow-300">
        <strong>CRITICAL:</strong> ResizeObserver on cards was just removed - it was causing scroll
        freezes. Enable here to test if a smarter version could work.
      </div>

      <CheckboxControl
        label="Enable ResizeObserver"
        value={enableResizeObserver}
        onChange={(v) => set('enableResizeObserver', v)}
        description="Watch cards for height changes (can cause scroll issues!)"
      />

      <SliderControl
        label="Debounce"
        value={resizeDebounce}
        onChange={(v) => set('resizeDebounce', v)}
        min={0}
        max={500}
        step={10}
        unit="ms"
        disabled={!enableResizeObserver}
      />

      <SliderControl
        label="Threshold"
        value={resizeThreshold}
        onChange={(v) => set('resizeThreshold', v)}
        min={1}
        max={50}
        step={1}
        unit="px"
        disabled={!enableResizeObserver}
      />

      {enableResizeObserver && (
        <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-[10px] text-red-300">
          ResizeObserver is ON. Watch for scroll performance issues.
        </div>
      )}
    </div>
  );
}
