'use client';

/**
 * Appearance Section
 * Settings for visual style, theme, accent color, and background
 */

import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, Sparkles, Square, Contrast } from 'lucide-react';
import {
  useAppearanceSettings,
  BACKGROUND_PRESETS,
  type BackgroundPreset,
} from '@/lib/stores/settings-store';
import { cn } from '@/lib/utils';
import { AccentColorPicker } from './accent-color-picker';

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

  const isHighContrast = visualStyle === 'highContrast';

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
          <SettingsButton
            active={visualStyle === 'glass'}
            onClick={() => setVisualStyle('glass')}
            icon={Sparkles}
            label="Glass"
            isHighContrast={isHighContrast}
          />
          <SettingsButton
            active={visualStyle === 'flat'}
            onClick={() => setVisualStyle('flat')}
            icon={Square}
            label="Flat"
            isHighContrast={isHighContrast}
          />
          <SettingsButton
            active={visualStyle === 'highContrast'}
            onClick={() => setVisualStyle('highContrast')}
            icon={Contrast}
            label="High Contrast"
            isHighContrast={isHighContrast}
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
          <SettingsButton
            active={theme === 'light'}
            onClick={() => setTheme('light')}
            icon={Sun}
            label="Light"
            isHighContrast={isHighContrast}
          />
          <SettingsButton
            active={theme === 'dark'}
            onClick={() => setTheme('dark')}
            icon={Moon}
            label="Dark"
            isHighContrast={isHighContrast}
          />
          <SettingsButton
            active={theme === 'system'}
            onClick={() => setTheme('system')}
            icon={Monitor}
            label="System"
            isHighContrast={isHighContrast}
          />
        </div>
      </div>

      {/* Accent Color */}
      <AccentColorPicker
        accentHue={accentHue}
        accentSaturation={accentSaturation}
        accentLightness={accentLightness}
        savedColors={savedColors}
        onHueChange={setAccentHue}
        onSaturationChange={setAccentSaturation}
        onLightnessChange={setAccentLightness}
        onHSLChange={setAccentHSL}
        onSaveColor={addSavedColor}
        onRemoveColor={removeSavedColor}
        onApplyColor={applySavedColor}
      />

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

/**
 * Consolidated settings toggle button for theme/style selection
 */
function SettingsButton({
  active,
  onClick,
  icon: Icon,
  label,
  isHighContrast = false,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Sun;
  label: string;
  isHighContrast?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200',
        isHighContrast
          ? active
            ? 'bg-bg-surface-3 text-[var(--color-accent)] border-2 border-[var(--color-accent)] font-bold'
            : 'bg-bg-surface-2 border border-border-subtle text-text-primary hover:bg-bg-surface-3 hover:border-text-muted'
          : active
            ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm font-medium'
            : 'bg-bg-surface-2 border border-transparent text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary',
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="text-sm">{label}</span>
    </button>
  );
}
