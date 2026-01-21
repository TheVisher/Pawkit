'use client';

import { useDebugStore } from '@/lib/stores/debug-store';
import { SliderControl, CheckboxControl, SelectControl } from '../controls';

export function ImageSection() {
  const {
    imageLazyLoading,
    imageDecoding,
    blurBackgroundEnabled,
    priorityCardCount,
    set,
  } = useDebugStore();

  return (
    <div className="space-y-3">
      {/* Loading Strategy */}
      <div className="space-y-2">
        <SelectControl
          label="Lazy Loading"
          value={imageLazyLoading}
          onChange={(v) => set('imageLazyLoading', v as typeof imageLazyLoading)}
          options={[
            { value: 'lazy', label: 'lazy (default)' },
            { value: 'eager', label: 'eager' },
            { value: 'auto', label: 'auto' },
          ]}
        />

        <SelectControl
          label="Decoding"
          value={imageDecoding}
          onChange={(v) => set('imageDecoding', v as typeof imageDecoding)}
          options={[
            { value: 'async', label: 'async (default)' },
            { value: 'sync', label: 'sync' },
            { value: 'auto', label: 'auto' },
          ]}
        />
      </div>

      {/* Visual Features */}
      <div className="space-y-2 pt-2 border-t border-border-default">
        <CheckboxControl
          label="Blur Background"
          value={blurBackgroundEnabled}
          onChange={(v) => set('blurBackgroundEnabled', v)}
          description="Show blurred preview while image loads"
        />

        <SliderControl
          label="Priority Cards"
          value={priorityCardCount}
          onChange={(v) => set('priorityCardCount', v)}
          min={0}
          max={20}
          step={1}
          unit=" cards"
        />
        <p className="text-[10px] text-text-muted">
          First N cards get priority loading (currently: first {priorityCardCount})
        </p>
      </div>
    </div>
  );
}
