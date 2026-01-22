'use client';

/**
 * Tag Color Picker
 * Compact color picker for tag customization - reuses accent color picker utilities
 */

import { useState, useCallback } from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ACCENT_COLOR_PRESETS,
  hslToHex,
  hexToHsl,
  isValidHex,
} from '@/lib/stores/settings-store';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

interface TagColorPickerProps {
  tag: string;
  currentHsl?: string; // "hue sat light" format e.g., "270 60 50"
  onColorChange: (hsl: string | null) => void; // null to reset to auto
  isCustom: boolean; // Whether this tag has a custom color
}

// Parse HSL string "h s l" to object
function parseHsl(hsl: string | undefined | null): { h: number; s: number; l: number } {
  if (!hsl) {
    // Default to a neutral color if no HSL provided
    return { h: 0, s: 60, l: 50 };
  }
  const [h, s, l] = hsl.split(' ').map(Number);
  return { h: h || 0, s: s || 60, l: l || 50 };
}

// Format HSL object to string
function formatHsl(h: number, s: number, l: number): string {
  return `${Math.round(h)} ${Math.round(s)} ${Math.round(l)}`;
}

export function TagColorPicker({
  tag,
  currentHsl,
  onColorChange,
  isCustom,
}: TagColorPickerProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [hexInput, setHexInput] = useState('');
  const [hexError, setHexError] = useState(false);

  const { h, s, l } = parseHsl(currentHsl);
  const currentHex = hslToHex(h, s, l);

  // Check if current color matches a preset
  const matchingPreset = ACCENT_COLOR_PRESETS.find(
    (p) => p.hue === h && s === 60 && l === 50
  );

  const handlePresetClick = useCallback((hue: number) => {
    onColorChange(formatHsl(hue, 60, 50));
    setShowCustom(false);
    setHexInput('');
  }, [onColorChange]);

  const handleHexChange = useCallback((value: string) => {
    setHexInput(value);
    const cleaned = value.startsWith('#') ? value : `#${value}`;
    if (isValidHex(cleaned)) {
      setHexError(false);
      const hsl = hexToHsl(cleaned);
      if (hsl) onColorChange(formatHsl(hsl.h, hsl.s, hsl.l));
    } else if (value.length >= 4) {
      setHexError(true);
    }
  }, [onColorChange]);

  const handleSliderChange = useCallback((type: 'h' | 's' | 'l', value: number) => {
    const newH = type === 'h' ? value : h;
    const newS = type === 's' ? value : s;
    const newL = type === 'l' ? value : l;
    onColorChange(formatHsl(newH, newS, newL));
  }, [h, s, l, onColorChange]);

  const handleReset = useCallback(() => {
    onColorChange(null);
    setShowCustom(false);
    setHexInput('');
  }, [onColorChange]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium uppercase text-text-muted">
          Tag Color
        </label>
        {isCustom && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      {/* Color Presets */}
      <div className="flex flex-wrap gap-2">
        {ACCENT_COLOR_PRESETS.map((preset) => (
          <button
            key={preset.hue}
            onClick={() => handlePresetClick(preset.hue)}
            className={cn(
              'w-8 h-8 rounded-full transition-all duration-200 ring-offset-1 ring-offset-bg-base',
              matchingPreset?.hue === preset.hue
                ? 'ring-2 ring-white/50 scale-110'
                : 'hover:scale-105',
            )}
            style={{ backgroundColor: `hsl(${preset.hue} 60% 50%)` }}
            title={preset.name}
          />
        ))}
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={cn(
            'w-8 h-8 rounded-full transition-all duration-200 flex items-center justify-center border-2 border-dashed',
            !matchingPreset || showCustom
              ? 'border-white/50 bg-white/10'
              : 'border-border-default hover:border-text-muted',
          )}
          title="Custom color"
        >
          <ChevronDown className={cn(
            'h-3.5 w-3.5 transition-transform duration-200',
            showCustom && 'rotate-180',
            !matchingPreset ? 'text-white' : 'text-text-muted',
          )} />
        </button>
      </div>

      {/* Custom Color Controls */}
      <AnimatePresence>
        {showCustom && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-3">
              {/* Color preview and hex input */}
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded-lg shrink-0 border border-border-default"
                  style={{ backgroundColor: `hsl(${h} ${s}% ${l}%)` }}
                />
                <div className="flex-1">
                  <label className="text-xs text-text-muted block mb-1">Hex</label>
                  <input
                    type="text"
                    value={hexInput || currentHex}
                    onChange={(e) => handleHexChange(e.target.value)}
                    onFocus={() => setHexInput(currentHex)}
                    onBlur={() => setHexInput('')}
                    placeholder="#000000"
                    className={cn(
                      'w-full px-2 py-1 rounded-lg text-xs font-mono bg-bg-surface-2 border transition-colors focus:outline-none',
                      hexError ? 'border-red-500' : 'border-border-default focus:border-[var(--color-accent)]',
                    )}
                  />
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-2">
                <ColorSlider
                  label="Hue"
                  value={h}
                  max={360}
                  onChange={(v) => handleSliderChange('h', v)}
                  gradient="linear-gradient(to right, hsl(0 60% 50%), hsl(60 60% 50%), hsl(120 60% 50%), hsl(180 60% 50%), hsl(240 60% 50%), hsl(300 60% 50%), hsl(360 60% 50%))"
                />
                <ColorSlider
                  label="Saturation"
                  value={s}
                  max={100}
                  onChange={(v) => handleSliderChange('s', v)}
                  gradient={`linear-gradient(to right, hsl(${h} 0% ${l}%), hsl(${h} 100% ${l}%))`}
                />
                <ColorSlider
                  label="Lightness"
                  value={l}
                  max={100}
                  onChange={(v) => handleSliderChange('l', v)}
                  gradient={`linear-gradient(to right, hsl(${h} ${s}% 0%), hsl(${h} ${s}% 50%), hsl(${h} ${s}% 100%))`}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ColorSlider({ label, value, max, onChange, gradient }: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
  gradient: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-text-muted">{label}</label>
        <span className="text-xs text-text-muted tabular-nums">{Math.round(value)}</span>
      </div>
      <div className="relative">
        <div className="h-2 rounded-full absolute inset-0" style={{ background: gradient }} />
        <Slider
          value={[value]}
          onValueChange={(v: number[]) => onChange(v[0])}
          min={0}
          max={max}
          step={1}
          className="relative"
        />
      </div>
    </div>
  );
}
