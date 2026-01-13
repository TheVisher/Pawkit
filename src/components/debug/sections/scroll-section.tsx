'use client';

import { useDebugStore } from '@/lib/stores/debug-store';
import { SliderControl, CheckboxControl, SelectControl } from '../controls';

export function ScrollSection() {
  const {
    scrollBehavior,
    smoothScrollDuration,
    enableVirtualization,
    virtualizeThreshold,
    virtualizeOverscan,
    set,
  } = useDebugStore();

  return (
    <div className="space-y-3">
      {/* Scroll Behavior */}
      <div className="space-y-2">
        <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded text-[10px] text-blue-300">
          <strong>V1 vs V2:</strong> V1 may feel smoother due to scroll behavior differences. Test
          different settings here.
        </div>

        <SelectControl
          label="Scroll Behavior"
          value={scrollBehavior}
          onChange={(v) => set('scrollBehavior', v as typeof scrollBehavior)}
          options={[
            { value: 'auto', label: 'auto (default)' },
            { value: 'smooth', label: 'smooth' },
            { value: 'instant', label: 'instant' },
          ]}
        />

        <SliderControl
          label="Smooth Duration"
          value={smoothScrollDuration}
          onChange={(v) => set('smoothScrollDuration', v)}
          min={0}
          max={1000}
          step={50}
          unit="ms"
          disabled={scrollBehavior !== 'smooth'}
        />
      </div>

      {/* Virtualization */}
      <div className="space-y-2 pt-2 border-t border-border-default">
        <p className="text-[10px] text-text-muted mb-1">Virtualization</p>

        <CheckboxControl
          label="Enable Virtualization"
          value={enableVirtualization}
          onChange={(v) => set('enableVirtualization', v)}
          description="Only render visible cards (V2 has this, V1 doesn't)"
        />

        <SliderControl
          label="Threshold"
          value={virtualizeThreshold}
          onChange={(v) => set('virtualizeThreshold', v)}
          min={50}
          max={1000}
          step={50}
          unit=" cards"
          disabled={!enableVirtualization}
        />

        <SliderControl
          label="Overscan"
          value={virtualizeOverscan}
          onChange={(v) => set('virtualizeOverscan', v)}
          min={0}
          max={20}
          step={1}
          unit=" items"
          disabled={!enableVirtualization}
        />
      </div>
    </div>
  );
}
