'use client';

import { cn } from '@/lib/utils';

// =============================================================================
// SLIDER CONTROL
// =============================================================================

interface SliderControlProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
}

export function SliderControl({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = '',
  disabled = false,
}: SliderControlProps) {
  return (
    <div className={cn('space-y-1', disabled && 'opacity-50')}>
      <div className="flex justify-between text-xs">
        <span className="text-text-secondary">{label}</span>
        <span className="font-mono text-text-primary">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className={cn(
          'w-full h-1.5 rounded-full appearance-none cursor-pointer',
          'bg-bg-surface-3',
          '[&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:w-3',
          '[&::-webkit-slider-thumb]:h-3',
          '[&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:bg-accent',
          '[&::-webkit-slider-thumb]:cursor-pointer',
          '[&::-webkit-slider-thumb]:transition-transform',
          '[&::-webkit-slider-thumb]:hover:scale-125',
          disabled && 'cursor-not-allowed'
        )}
      />
    </div>
  );
}

// =============================================================================
// CHECKBOX CONTROL
// =============================================================================

interface CheckboxControlProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  description?: string;
}

export function CheckboxControl({ label, value, onChange, description }: CheckboxControlProps) {
  return (
    <label className="flex items-start gap-2 cursor-pointer group">
      <div className="relative flex items-center justify-center mt-0.5">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={cn(
            'w-4 h-4 rounded border-2 transition-colors',
            value
              ? 'bg-accent border-accent'
              : 'bg-transparent border-border-default group-hover:border-accent/50'
          )}
        >
          {value && (
            <svg className="w-full h-full text-white" viewBox="0 0 16 16" fill="currentColor">
              <path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" />
            </svg>
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs text-text-primary">{label}</span>
        {description && <p className="text-[10px] text-text-muted mt-0.5">{description}</p>}
      </div>
    </label>
  );
}

// =============================================================================
// SELECT CONTROL
// =============================================================================

interface SelectOption {
  value: string;
  label: string;
}

interface SelectControlProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
}

export function SelectControl({ label, value, onChange, options }: SelectControlProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-text-secondary">{label}</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'text-xs bg-bg-surface-3 border border-border-default rounded px-2 py-1',
            'text-text-primary cursor-pointer',
            'focus:outline-none focus:ring-1 focus:ring-accent'
          )}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// =============================================================================
// SECTION HEADER
// =============================================================================

interface SectionHeaderProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  badge?: string;
}

export function SectionHeader({ title, isExpanded, onToggle, badge }: SectionHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-center justify-between px-2 py-1.5',
        'text-xs font-medium text-text-primary',
        'hover:bg-bg-surface-3/50 rounded transition-colors'
      )}
    >
      <div className="flex items-center gap-2">
        <svg
          className={cn('w-3 h-3 transition-transform', isExpanded && 'rotate-90')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span>{title}</span>
        {badge && (
          <span className="px-1.5 py-0.5 text-[10px] bg-accent/20 text-accent rounded">
            {badge}
          </span>
        )}
      </div>
    </button>
  );
}

// =============================================================================
// PRESET BUTTON
// =============================================================================

interface PresetButtonProps {
  label: string;
  onClick: () => void;
  active?: boolean;
  variant?: 'default' | 'warning';
}

export function PresetButton({ label, onClick, active, variant = 'default' }: PresetButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2 py-1 text-[10px] font-medium rounded transition-colors',
        active
          ? 'bg-accent text-white'
          : variant === 'warning'
            ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
            : 'bg-bg-surface-3 text-text-secondary hover:bg-bg-surface-3/80 hover:text-text-primary'
      )}
    >
      {label}
    </button>
  );
}

// =============================================================================
// METRIC DISPLAY
// =============================================================================

interface MetricDisplayProps {
  label: string;
  value: string | number;
  unit?: string;
  status?: 'good' | 'warning' | 'bad';
  bar?: number; // 0-100 for progress bar
}

export function MetricDisplay({ label, value, unit = '', status, bar }: MetricDisplayProps) {
  const statusColor =
    status === 'good'
      ? 'text-green-400'
      : status === 'warning'
        ? 'text-yellow-400'
        : status === 'bad'
          ? 'text-red-400'
          : 'text-text-primary';

  const barColor =
    status === 'good'
      ? 'bg-green-400'
      : status === 'warning'
        ? 'bg-yellow-400'
        : status === 'bad'
          ? 'bg-red-400'
          : 'bg-accent';

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-text-muted w-24 shrink-0">{label}</span>
      <span className={cn('font-mono', statusColor)}>
        {value}
        {unit}
      </span>
      {bar !== undefined && (
        <div className="flex-1 h-1.5 bg-bg-surface-3 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', barColor)}
            style={{ width: `${Math.min(100, Math.max(0, bar))}%` }}
          />
        </div>
      )}
    </div>
  );
}
