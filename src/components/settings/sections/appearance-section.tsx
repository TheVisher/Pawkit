'use client';

import { useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, ChevronDown, Plus, X, Sparkles, Square, Contrast } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useAppearanceSettings,
  ACCENT_COLOR_PRESETS,
  BACKGROUND_PRESETS,
  type BackgroundPreset,
  type VisualStyle,
  hslToHex,
  hexToHsl,
  isValidHex,
} from '@/lib/stores/settings-store';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const {
    accentHue,
    accentSaturation,
    accentLightness,
    savedColors,
    backgroundPreset,
    visualStyle,
    setAccentHue,
    setAccentSaturation,
    setAccentLightness,
    setAccentHSL,
    addSavedColor,
    removeSavedColor,
    applySavedColor,
    setBackgroundPreset,
    setVisualStyle,
  } = useAppearanceSettings();
  const [showCustomHue, setShowCustomHue] = useState(false);
  const [hexInput, setHexInput] = useState('');
  const [hexError, setHexError] = useState(false);
  const [savingColor, setSavingColor] = useState(false);
  const [colorName, setColorName] = useState('');

  // Check if current hue matches a preset (with default saturation/lightness)
  const isPresetSelected = ACCENT_COLOR_PRESETS.some(
    (p) => p.hue === accentHue && accentSaturation === 60 && accentLightness === 55
  );

  // Current color as hex
  const currentHex = hslToHex(accentHue, accentSaturation, accentLightness);

  // Handle hex input
  const handleHexChange = useCallback(
    (value: string) => {
      setHexInput(value);
      const cleaned = value.startsWith('#') ? value : `#${value}`;
      if (isValidHex(cleaned)) {
        setHexError(false);
        const hsl = hexToHsl(cleaned);
        if (hsl) {
          setAccentHSL(hsl.h, hsl.s, hsl.l);
        }
      } else if (value.length >= 4) {
        setHexError(true);
      }
    },
    [setAccentHSL]
  );

  // Handle saving color
  const handleSaveColor = useCallback(() => {
    if (colorName.trim()) {
      addSavedColor(colorName.trim());
      setColorName('');
      setSavingColor(false);
    }
  }, [colorName, addSavedColor]);

  return (
    <div className="space-y-8">
      {/* Visual Style */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium text-text-primary">Visual Style</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Choose your preferred visual aesthetic
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StyleButton
            active={visualStyle === 'glass'}
            onClick={() => setVisualStyle('glass')}
            icon={Sparkles}
            label="Glass"
          />
          <StyleButton
            active={visualStyle === 'flat'}
            onClick={() => setVisualStyle('flat')}
            icon={Square}
            label="Flat"
          />
          <StyleButton
            active={visualStyle === 'highContrast'}
            onClick={() => setVisualStyle('highContrast')}
            icon={Contrast}
            label="High Contrast"
          />
        </div>
      </div>

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
                setAccentHSL(preset.hue, 60, 55);
                setShowCustomHue(false);
                setHexInput('');
              }}
              className={cn(
                'w-10 h-10 rounded-full transition-all duration-200',
                'ring-offset-2 ring-offset-bg-base',
                accentHue === preset.hue && accentSaturation === 60 && accentLightness === 55
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

        {/* Custom color controls */}
        <AnimatePresence>
          {showCustomHue && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 space-y-4">
                {/* Color preview and hex input */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl shrink-0 border border-border-default"
                    style={{ backgroundColor: `hsl(${accentHue} ${accentSaturation}% ${accentLightness}%)` }}
                  />
                  <div className="flex-1">
                    <label className="text-xs text-text-muted block mb-1">Hex Code</label>
                    <input
                      type="text"
                      value={hexInput || currentHex}
                      onChange={(e) => handleHexChange(e.target.value)}
                      onFocus={() => setHexInput(currentHex)}
                      onBlur={() => setHexInput('')}
                      placeholder="#000000"
                      className={cn(
                        'w-full px-3 py-1.5 rounded-lg text-sm font-mono',
                        'bg-bg-surface-2 border transition-colors',
                        hexError
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-border-default focus:border-[var(--color-accent)]',
                        'focus:outline-none'
                      )}
                    />
                  </div>
                </div>

                {/* Hue slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-text-muted">Hue</label>
                    <span className="text-xs text-text-muted tabular-nums">{accentHue}°</span>
                  </div>
                  <Slider
                    value={[accentHue]}
                    onValueChange={(values: number[]) => setAccentHue(values[0])}
                    min={0}
                    max={360}
                    step={1}
                    className="flex-1"
                  />
                  <div
                    className="h-2 rounded-full"
                    style={{
                      background:
                        'linear-gradient(to right, hsl(0 60% 55%), hsl(60 60% 55%), hsl(120 60% 55%), hsl(180 60% 55%), hsl(240 60% 55%), hsl(300 60% 55%), hsl(360 60% 55%))',
                    }}
                  />
                </div>

                {/* Saturation slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-text-muted">Saturation</label>
                    <span className="text-xs text-text-muted tabular-nums">{accentSaturation}%</span>
                  </div>
                  <Slider
                    value={[accentSaturation]}
                    onValueChange={(values: number[]) => setAccentSaturation(values[0])}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <div
                    className="h-2 rounded-full"
                    style={{
                      background: `linear-gradient(to right, hsl(${accentHue} 0% ${accentLightness}%), hsl(${accentHue} 100% ${accentLightness}%))`,
                    }}
                  />
                </div>

                {/* Lightness slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-text-muted">Lightness</label>
                    <span className="text-xs text-text-muted tabular-nums">{accentLightness}%</span>
                  </div>
                  <Slider
                    value={[accentLightness]}
                    onValueChange={(values: number[]) => setAccentLightness(values[0])}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <div
                    className="h-2 rounded-full"
                    style={{
                      background: `linear-gradient(to right, hsl(${accentHue} ${accentSaturation}% 0%), hsl(${accentHue} ${accentSaturation}% 50%), hsl(${accentHue} ${accentSaturation}% 100%))`,
                    }}
                  />
                </div>

                {/* Save color button */}
                <div className="pt-2 border-t border-border-default">
                  {!savingColor ? (
                    <button
                      onClick={() => setSavingColor(true)}
                      className="flex items-center gap-2 text-sm text-text-secondary hover:text-[var(--color-accent)] transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Save this color
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={colorName}
                        onChange={(e) => setColorName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveColor()}
                        placeholder="Color name..."
                        autoFocus
                        className="flex-1 px-3 py-1.5 rounded-lg text-sm bg-bg-surface-2 border border-border-default focus:border-[var(--color-accent)] focus:outline-none"
                      />
                      <button
                        onClick={handleSaveColor}
                        disabled={!colorName.trim()}
                        className="px-3 py-1.5 rounded-lg text-sm bg-[var(--color-accent)] text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setSavingColor(false);
                          setColorName('');
                        }}
                        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-surface-2 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Saved Colors */}
        {savedColors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs text-text-muted font-medium">Saved Colors</h4>
            <div className="flex flex-wrap gap-2">
              {savedColors.map((color) => (
                <div key={color.id} className="group relative">
                  <button
                    onClick={() => applySavedColor(color.id)}
                    className={cn(
                      'w-10 h-10 rounded-full transition-all duration-200',
                      'ring-offset-2 ring-offset-bg-base hover:scale-105',
                      accentHue === color.hsl.h &&
                        accentSaturation === color.hsl.s &&
                        accentLightness === color.hsl.l
                        ? 'ring-2 ring-[var(--color-accent)] scale-110'
                        : '',
                    )}
                    style={{
                      backgroundColor: `hsl(${color.hsl.h} ${color.hsl.s}% ${color.hsl.l}%)`,
                    }}
                    title={color.name}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSavedColor(color.id);
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-bg-surface-3 border border-border-default text-text-muted hover:text-red-500 hover:border-red-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
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

// Style toggle button component
function StyleButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Sparkles;
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
