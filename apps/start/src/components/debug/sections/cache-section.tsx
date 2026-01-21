'use client';

import { useDebugStore } from '@/lib/stores/debug-store';
import { SliderControl, CheckboxControl } from '../controls';

export function CacheSection() {
  const {
    cacheEnabled,
    widthTolerance,
    persistDebounceMs,
    set,
  } = useDebugStore();

  return (
    <div className="space-y-3">
      {/* Layout Cache */}
      <div className="space-y-2">
        <p className="text-[10px] text-text-muted mb-1">Layout Cache</p>

        <CheckboxControl
          label="Enable Cache"
          value={cacheEnabled}
          onChange={(v) => set('cacheEnabled', v)}
          description="Cache card heights to avoid re-measuring"
        />

        <SliderControl
          label="Width Tolerance"
          value={widthTolerance}
          onChange={(v) => set('widthTolerance', v)}
          min={0}
          max={100}
          step={5}
          unit="px"
          disabled={!cacheEnabled}
        />

        <SliderControl
          label="Persist Debounce"
          value={persistDebounceMs}
          onChange={(v) => set('persistDebounceMs', v)}
          min={100}
          max={5000}
          step={100}
          unit="ms"
          disabled={!cacheEnabled}
        />
      </div>

    </div>
  );
}
