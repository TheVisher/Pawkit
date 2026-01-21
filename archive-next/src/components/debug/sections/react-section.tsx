'use client';

import { useDebugStore } from '@/lib/stores/debug-store';
import { SliderControl, CheckboxControl } from '../controls';

export function ReactSection() {
  const {
    enableStartTransition,
    forceFlushSync,
    enableFramerMotion,
    animationDuration,
    set,
  } = useDebugStore();

  return (
    <div className="space-y-3">
      {/* React 18 Features */}
      <div className="space-y-2">
        <p className="text-[10px] text-text-muted mb-1">React 18</p>

        <CheckboxControl
          label="Enable startTransition"
          value={enableStartTransition}
          onChange={(v) => set('enableStartTransition', v)}
          description="Use React 18 transitions for low-priority updates"
        />

        <CheckboxControl
          label="Force flushSync"
          value={forceFlushSync}
          onChange={(v) => set('forceFlushSync', v)}
          description="Disable React batching (may cause more re-renders)"
        />
      </div>

      {/* Framer Motion */}
      <div className="space-y-2 pt-2 border-t border-border-default">
        <p className="text-[10px] text-text-muted mb-1">Framer Motion</p>

        <CheckboxControl
          label="Enable Framer Motion"
          value={enableFramerMotion}
          onChange={(v) => set('enableFramerMotion', v)}
          description="V1 doesn't have Framer. Disable to test impact."
        />

        <SliderControl
          label="Animation Duration"
          value={animationDuration}
          onChange={(v) => set('animationDuration', v)}
          min={0}
          max={500}
          step={25}
          unit="ms"
          disabled={!enableFramerMotion}
        />
      </div>
    </div>
  );
}
