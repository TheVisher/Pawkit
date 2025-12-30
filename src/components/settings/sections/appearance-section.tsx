'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useAppearanceSettings,
  ACCENT_COLOR_PRESETS,
  BACKGROUND_PRESETS,
  type BackgroundPreset,
} from '@/lib/stores/settings-store';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const { accentHue, backgroundPreset, setAccentHue, setBackgroundPreset } =
    useAppearanceSettings();
  const [showCustomHue, setShowCustomHue] = useState(false);

  // Check if current hue matches a preset
  const isPresetSelected = ACCENT_COLOR_PRESETS.some((p) => p.hue === accentHue);

  return (
    <div className="space-y-8">
      {/* Theme Mode */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium text-text-primary">Theme</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Choose your preferred color scheme
          </p>
        </div>
        <div className="flex gap-2">
          <ThemeButton
            active={theme === 'light'}
            onClick={() => setTheme('light')}
            icon={Sun}
            label="Light"
          />
          <ThemeButton
            active={theme === 'dark'}
            onClick={() => setTheme('dark')}
            icon={Moon}
            label="Dark"
          />
          <ThemeButton
            active={theme === 'system'}
            onClick={() => setTheme('system')}
            icon={Monitor}
            label="System"
          />
        </div>
      </div>

      {/* Accent Color */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium text-text-primary">Accent Color</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Customize the primary accent color
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {ACCENT_COLOR_PRESETS.map((preset) => (
            <button
              key={preset.hue}
              onClick={() => {
                setAccentHue(preset.hue);
                setShowCustomHue(false);
              }}
              className={cn(
                'w-10 h-10 rounded-full transition-all duration-200',
                'ring-offset-2 ring-offset-bg-base',
                accentHue === preset.hue
                  ? 'ring-2 ring-[var(--color-accent)] scale-110'
                  : 'hover:scale-105',
              )}
              style={{
                backgroundColor: `hsl(${preset.hue} 60% 55%)`,
              }}
              title={preset.name}
            />
          ))}
          {/* Custom button */}
          <button
            onClick={() => setShowCustomHue(!showCustomHue)}
            className={cn(
              'w-10 h-10 rounded-full transition-all duration-200 flex items-center justify-center',
              'border-2 border-dashed',
              !isPresetSelected || showCustomHue
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                : 'border-border-default hover:border-text-muted',
            )}
            title="Custom color"
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                showCustomHue && 'rotate-180',
                !isPresetSelected ? 'text-[var(--color-accent)]' : 'text-text-muted',
              )}
            />
          </button>
        </div>

        {/* Custom hue slider */}
        <AnimatePresence>
          {showCustomHue && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 space-y-3">
                <div className="flex items-center gap-4">
                  <div
                    className="w-8 h-8 rounded-full shrink-0"
                    style={{ backgroundColor: `hsl(${accentHue} 60% 55%)` }}
                  />
                  <Slider
                    value={[accentHue]}
                    onValueChange={(values: number[]) => setAccentHue(values[0])}
                    min={0}
                    max={360}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-xs text-text-muted w-8 text-right tabular-nums">
                    {accentHue}°
                  </span>
                </div>
                <div
                  className="h-2 rounded-full"
                  style={{
                    background:
                      'linear-gradient(to right, hsl(0 60% 55%), hsl(60 60% 55%), hsl(120 60% 55%), hsl(180 60% 55%), hsl(240 60% 55%), hsl(300 60% 55%), hsl(360 60% 55%))',
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Background */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium text-text-primary">Background</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Choose a background gradient style
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(Object.keys(BACKGROUND_PRESETS) as BackgroundPreset[]).map((key) => {
            const preset = BACKGROUND_PRESETS[key];
            return (
              <button
                key={key}
                onClick={() => setBackgroundPreset(key)}
                className={cn(
                  'relative h-20 rounded-xl overflow-hidden transition-all duration-200',
                  'ring-offset-2 ring-offset-bg-base',
                  backgroundPreset === key
                    ? 'ring-2 ring-[var(--color-accent)]'
                    : 'hover:ring-1 hover:ring-border-default',
                )}
              >
                {/* Preview gradient - always show dark version for consistency */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: preset.darkGradient,
                    backgroundColor: '#0a0814',
                  }}
                />
                {/* Label */}
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                  <span className="text-xs font-medium text-white">
                    {preset.name}
                  </span>
                </div>
                {/* Selected indicator */}
                {backgroundPreset === key && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--color-accent)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Theme toggle button component
function ThemeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Sun;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200',
        active
          ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm font-medium'
          : 'bg-bg-surface-2 border border-transparent text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary',
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="text-sm">{label}</span>
    </button>
  );
}
