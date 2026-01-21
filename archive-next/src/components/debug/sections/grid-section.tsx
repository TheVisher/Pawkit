'use client';

import { useDebugStore } from '@/lib/stores/debug-store';
import { SliderControl, CheckboxControl, SelectControl } from '../controls';

export function GridSection() {
  const {
    layoutDuration,
    layoutOnResize,
    showDuration,
    hideDuration,
    fillGaps,
    layoutEasing,
    minItemWidthSmall,
    minItemWidthMedium,
    minItemWidthLarge,
    minItemWidthXL,
    set,
  } = useDebugStore();

  return (
    <div className="space-y-3">
      {/* Animation Timing */}
      <div className="space-y-2">
        <SliderControl
          label="Layout Duration"
          value={layoutDuration}
          onChange={(v) => set('layoutDuration', v)}
          min={0}
          max={1000}
          step={50}
          unit="ms"
        />
        <SliderControl
          label="Resize Debounce"
          value={layoutOnResize}
          onChange={(v) => set('layoutOnResize', v)}
          min={0}
          max={500}
          step={16}
          unit="ms"
        />
        <SliderControl
          label="Show Duration"
          value={showDuration}
          onChange={(v) => set('showDuration', v)}
          min={0}
          max={500}
          step={50}
          unit="ms"
        />
        <SliderControl
          label="Hide Duration"
          value={hideDuration}
          onChange={(v) => set('hideDuration', v)}
          min={0}
          max={500}
          step={50}
          unit="ms"
        />
      </div>

      {/* Options */}
      <div className="space-y-2 pt-2 border-t border-border-default">
        <CheckboxControl
          label="Fill Gaps"
          value={fillGaps}
          onChange={(v) => set('fillGaps', v)}
          description="Use gap-filling algorithm for layout"
        />
        <SelectControl
          label="Easing"
          value={layoutEasing}
          onChange={(v) => set('layoutEasing', v as typeof layoutEasing)}
          options={[
            { value: 'ease', label: 'ease' },
            { value: 'ease-in', label: 'ease-in' },
            { value: 'ease-out', label: 'ease-out' },
            { value: 'ease-in-out', label: 'ease-in-out' },
            { value: 'linear', label: 'linear' },
          ]}
        />
      </div>

      {/* Card Widths */}
      <div className="space-y-2 pt-2 border-t border-border-default">
        <p className="text-[10px] text-text-muted mb-1">Min Card Widths</p>
        <SliderControl
          label="Small"
          value={minItemWidthSmall}
          onChange={(v) => set('minItemWidthSmall', v)}
          min={100}
          max={300}
          step={10}
          unit="px"
        />
        <SliderControl
          label="Medium"
          value={minItemWidthMedium}
          onChange={(v) => set('minItemWidthMedium', v)}
          min={200}
          max={400}
          step={10}
          unit="px"
        />
        <SliderControl
          label="Large"
          value={minItemWidthLarge}
          onChange={(v) => set('minItemWidthLarge', v)}
          min={300}
          max={500}
          step={10}
          unit="px"
        />
        <SliderControl
          label="XL"
          value={minItemWidthXL}
          onChange={(v) => set('minItemWidthXL', v)}
          min={400}
          max={700}
          step={10}
          unit="px"
        />
      </div>
    </div>
  );
}
