'use client';

/**
 * Accent Color Picker
 * Full-featured color picker with presets, custom HSL sliders, hex input, and saved colors
 */

import { useState, useCallback } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ACCENT_COLOR_PRESETS,
  hslToHex,
  hexToHsl,
  isValidHex,
} from '@/lib/stores/settings-store';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

interface AccentColorPickerProps {
  accentHue: number;
  accentSaturation: number;
  accentLightness: number;
  savedColors: Array<{ id: string; name: string; hsl: { h: number; s: number; l: number } }>;
  onHueChange: (hue: number) => void;
  onSaturationChange: (saturation: number) => void;
  onLightnessChange: (lightness: number) => void;
  onHSLChange: (h: number, s: number, l: number) => void;
  onSaveColor: (name: string) => void;
  onRemoveColor: (id: string) => void;
  onApplyColor: (id: string) => void;
}

export function AccentColorPicker({
  accentHue,
  accentSaturation,
  accentLightness,
  savedColors,
  onHueChange,
  onSaturationChange,
  onLightnessChange,
  onHSLChange,
  onSaveColor,
  onRemoveColor,
  onApplyColor,
}: AccentColorPickerProps) {
  const [showCustomHue, setShowCustomHue] = useState(false);
  const [hexInput, setHexInput] = useState('');
  const [hexError, setHexError] = useState(false);
  const [savingColor, setSavingColor] = useState(false);
  const [colorName, setColorName] = useState('');

  const isPresetSelected = ACCENT_COLOR_PRESETS.some(
    (p) => p.hue === accentHue && accentSaturation === 60 && accentLightness === 55
  );
  const currentHex = hslToHex(accentHue, accentSaturation, accentLightness);

  const handleHexChange = useCallback((value: string) => {
    setHexInput(value);
    const cleaned = value.startsWith('#') ? value : `#${value}`;
    if (isValidHex(cleaned)) {
      setHexError(false);
      const hsl = hexToHsl(cleaned);
      if (hsl) onHSLChange(hsl.h, hsl.s, hsl.l);
    } else if (value.length >= 4) {
      setHexError(true);
    }
  }, [onHSLChange]);

  const handleSaveColor = useCallback(() => {
    if (colorName.trim()) {
      onSaveColor(colorName.trim());
      setColorName('');
      setSavingColor(false);
    }
  }, [colorName, onSaveColor]);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-text-primary">Accent Color</h3>
        <p className="text-xs text-text-muted mt-0.5">Customize the primary accent color</p>
      </div>

      {/* Color Presets */}
      <div className="flex flex-wrap gap-3">
        {ACCENT_COLOR_PRESETS.map((preset) => (
          <button
            key={preset.hue}
            onClick={() => { onHSLChange(preset.hue, 60, 55); setShowCustomHue(false); setHexInput(''); }}
            className={cn(
              'w-10 h-10 rounded-full transition-all duration-200 ring-offset-2 ring-offset-bg-base',
              accentHue === preset.hue && accentSaturation === 60 && accentLightness === 55
                ? 'ring-2 ring-[var(--color-accent)] scale-110' : 'hover:scale-105',
            )}
            style={{ backgroundColor: `hsl(${preset.hue} 60% 55%)` }}
            title={preset.name}
          />
        ))}
        <button
          onClick={() => setShowCustomHue(!showCustomHue)}
          className={cn(
            'w-10 h-10 rounded-full transition-all duration-200 flex items-center justify-center border-2 border-dashed',
            !isPresetSelected || showCustomHue
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
              : 'border-border-default hover:border-text-muted',
          )}
          title="Custom color"
        >
          <ChevronDown className={cn(
            'h-4 w-4 transition-transform duration-200',
            showCustomHue && 'rotate-180',
            !isPresetSelected ? 'text-[var(--color-accent)]' : 'text-text-muted',
          )} />
        </button>
      </div>

      {/* Custom Color Controls */}
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
                      'w-full px-3 py-1.5 rounded-lg text-sm font-mono bg-bg-surface-2 border transition-colors focus:outline-none',
                      hexError ? 'border-red-500 focus:border-red-500' : 'border-border-default focus:border-[var(--color-accent)]',
                    )}
                  />
                </div>
              </div>

              <ColorSlider
                label="Hue" value={accentHue} max={360} unit="°"
                onChange={onHueChange}
                gradient="linear-gradient(to right, hsl(0 60% 55%), hsl(60 60% 55%), hsl(120 60% 55%), hsl(180 60% 55%), hsl(240 60% 55%), hsl(300 60% 55%), hsl(360 60% 55%))"
              />
              <ColorSlider
                label="Saturation" value={accentSaturation} max={100} unit="%"
                onChange={onSaturationChange}
                gradient={`linear-gradient(to right, hsl(${accentHue} 0% ${accentLightness}%), hsl(${accentHue} 100% ${accentLightness}%))`}
              />
              <ColorSlider
                label="Lightness" value={accentLightness} max={100} unit="%"
                onChange={onLightnessChange}
                gradient={`linear-gradient(to right, hsl(${accentHue} ${accentSaturation}% 0%), hsl(${accentHue} ${accentSaturation}% 50%), hsl(${accentHue} ${accentSaturation}% 100%))`}
              />

              {/* Save color */}
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
                      onClick={() => { setSavingColor(false); setColorName(''); }}
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
                  onClick={() => onApplyColor(color.id)}
                  className={cn(
                    'w-10 h-10 rounded-full transition-all duration-200 ring-offset-2 ring-offset-bg-base hover:scale-105',
                    accentHue === color.hsl.h && accentSaturation === color.hsl.s && accentLightness === color.hsl.l
                      ? 'ring-2 ring-[var(--color-accent)] scale-110' : '',
                  )}
                  style={{ backgroundColor: `hsl(${color.hsl.h} ${color.hsl.s}% ${color.hsl.l}%)` }}
                  title={color.name}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveColor(color.id); }}
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
  );
}

function ColorSlider({ label, value, max, unit, onChange, gradient }: {
  label: string;
  value: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
  gradient: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-text-muted">{label}</label>
        <span className="text-xs text-text-muted tabular-nums">{value}{unit}</span>
      </div>
      <Slider value={[value]} onValueChange={(v: number[]) => onChange(v[0])} min={0} max={max} step={1} className="flex-1" />
      <div className="h-2 rounded-full" style={{ background: gradient }} />
    </div>
  );
}
