import React, { useEffect, useState } from 'react';
import { usePreferencesStore } from '@/lib/stores/preferences.store';
import { useTheme } from '../../../components/ui/theme-provider';
import { usePalette, PaletteKey } from '../../../components/ui/PaletteProvider';
import { paletteLabels } from './PaletteThemeSwitcher';

const paletteKeys: PaletteKey[] = ['earthTones', 'modernTech', 'oceanBreeze'];

/**
 * ThemeSettings Component
 * Placeholder for managing theme settings.
 */
export const ThemeSettings: React.FC = (): JSX.Element => {
  const { preferences, fetchPreferences, updatePreferences, isLoading, error } = usePreferencesStore();
  const { theme, setTheme } = useTheme();
  const { paletteKey, setPaletteByKey } = usePalette();

  // Local state for previewing changes before saving
  const [pendingTheme, setPendingTheme] = useState<'light' | 'dark' | 'system'>(theme);
  const [pendingPalette, setPendingPalette] = useState<PaletteKey>(paletteKey as PaletteKey);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  // Fetch preferences on mount
  useEffect(() => {
    if (!preferences && !isLoading && !error) {
      fetchPreferences();
    }
  }, [preferences, isLoading, error, fetchPreferences]);

  // Set local state from preferences when loaded
  useEffect(() => {
    if (preferences) {
      if (preferences.theme) setPendingTheme(preferences.theme as 'light' | 'dark' | 'system');
      if (preferences.color_scheme && paletteKeys.includes(preferences.color_scheme as PaletteKey)) {
        setPendingPalette(preferences.color_scheme as PaletteKey);
      }
    }
  }, [preferences]);

  // Preview changes immediately
  useEffect(() => {
    setTheme(pendingTheme);
    setPaletteByKey(pendingPalette);
    setPreviewMode(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTheme, pendingPalette]);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system'): void => {
    setPendingTheme(newTheme);
  };

  const handlePaletteChange = (key: PaletteKey): void => {
    setPendingPalette(key);
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    setSuccess('');
    const ok = await updatePreferences({ theme: pendingTheme, color_scheme: pendingPalette });
    setSaving(false);
    if (ok) {
      setSuccess('Theme and palette preference saved!');
      setPreviewMode(false);
    }
  };

  const handleCancel = (): void => {
    // Restore from preferences
    if (preferences) {
      setPendingTheme(preferences.theme as 'light' | 'dark' | 'system');
      if (preferences.color_scheme && paletteKeys.includes(preferences.color_scheme as PaletteKey)) {
        setPendingPalette(preferences.color_scheme as PaletteKey);
      }
    }
    setPreviewMode(false);
  };

  return (
    <div>
      <h2>Theme Settings</h2>
      <fieldset>
        <legend>Select Theme:</legend>
        <div>
          <input
            type="radio"
            id="light"
            name="theme"
            value="light"
            checked={pendingTheme === 'light'}
            onChange={() => handleThemeChange('light')}
            data-testid="theme-light"
          />
          <label htmlFor="light">Light</label>
        </div>
        <div>
          <input
            type="radio"
            id="dark"
            name="theme"
            value="dark"
            checked={pendingTheme === 'dark'}
            onChange={() => handleThemeChange('dark')}
            data-testid="theme-dark"
          />
          <label htmlFor="dark">Dark</label>
        </div>
        <div>
          <input
            type="radio"
            id="system"
            name="theme"
            value="system"
            checked={pendingTheme === 'system'}
            onChange={() => handleThemeChange('system')}
            data-testid="theme-system"
          />
          <label htmlFor="system">System</label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Select Color Palette:</legend>
        <div className="flex gap-2 mt-2">
          {paletteKeys.map((key) => (
            <button
              key={key}
              type="button"
              className={`px-3 py-1 rounded border text-sm transition-colors ${pendingPalette === key ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}
              onClick={() => handlePaletteChange(key)}
              data-testid={`palette-${key}`}
              aria-pressed={pendingPalette === key}
            >
              {paletteLabels[key]}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex gap-2 mt-4">
        <button type="button" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
        {previewMode && (
          <button type="button" onClick={handleCancel}>
            Cancel
          </button>
        )}
      </div>
      {previewMode && <div className="text-blue-600 mt-2">Preview mode: changes not saved yet.</div>}
      {success && <div role="status" className="text-green-600">{success}</div>}
      {error && <div role="alert" className="text-red-600">{error}</div>}
    </div>
  );
};

export default ThemeSettings; 