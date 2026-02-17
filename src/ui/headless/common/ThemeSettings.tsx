import { useEffect, useState } from 'react';
import { usePreferencesStore } from '@/lib/stores/preferences.store';
import { useTheme } from '@/ui/primitives/theme-provider';
import { usePalette, PaletteKey } from '@/ui/primitives/PaletteProvider';

/**
 * Headless Theme Settings
 */
export default function ThemeSettings({
  render
}: {
  render: (props: {
    pendingTheme: 'light' | 'dark' | 'system';
    setPendingTheme: (t: 'light' | 'dark' | 'system') => void;
    pendingPalette: PaletteKey;
    setPendingPalette: (p: PaletteKey) => void;
    saving: boolean;
    success: string;
    error: string | null;
    handleSave: () => Promise<void>;
    handleCancel: () => void;
  }) => React.ReactNode;
}) {
  const { preferences, fetchPreferences, updatePreferences, isLoading, error } = usePreferencesStore();
  const { theme, setTheme } = useTheme();
  const { paletteKey, setPaletteByKey } = usePalette();

  const [pendingTheme, setPendingTheme] = useState<'light' | 'dark' | 'system'>(theme as any);
  const [pendingPalette, setPendingPalette] = useState<PaletteKey>(paletteKey as PaletteKey);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!preferences && !isLoading && !error) fetchPreferences();
  }, [preferences, isLoading, error, fetchPreferences]);

  useEffect(() => {
    if (preferences) {
      if (preferences.theme) setPendingTheme(preferences.theme as any);
      if ((preferences as any).color_scheme) setPendingPalette((preferences as any).color_scheme as PaletteKey);
    }
  }, [preferences]);

  useEffect(() => {
    setTheme(pendingTheme);
    setPaletteByKey(pendingPalette);
  }, [pendingTheme, pendingPalette, setTheme, setPaletteByKey]);

  const handleSave = async () => {
    setSaving(true);
    setSuccess('');
    const ok = await updatePreferences({ theme: pendingTheme } as any);
    setSaving(false);
    if (ok) {
      setSuccess('saved');
  }
  };

  const handleCancel = () => {
    if (preferences) {
      setPendingTheme(preferences.theme as any);
      if ((preferences as any).color_scheme) setPendingPalette((preferences as any).color_scheme as PaletteKey);
    }
  };

  return (
    <>{render({ pendingTheme, setPendingTheme, pendingPalette, setPendingPalette, saving, success, error, handleSave, handleCancel })}</>
  );
}
