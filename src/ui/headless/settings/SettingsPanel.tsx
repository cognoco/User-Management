/**
 * Headless Settings Panel
 *
 * Provides settings data and update handlers via render props.
 */
import { useSettingsStore } from '@/lib/stores/settings.store';

export interface SettingsPanelProps {
  render: (props: {
    settings: {
      theme: 'light' | 'dark' | 'system';
      language: string;
      notifications: { email: boolean; push: boolean; sms: boolean };
      privacy: { showProfile: boolean; showActivity: boolean };
    };
    isLoading: boolean;
    error: string | null;
    updateSettings: (s: Partial<{
      theme: 'light' | 'dark' | 'system';
      language: string;
    }>) => void;
  }) => React.ReactNode;
}

export function SettingsPanel({ render }: SettingsPanelProps) {
  const { theme, language, notifications, privacy, setTheme, setLanguage } = useSettingsStore();

  const settings = { theme, language, notifications, privacy };

  const updateSettings = (s: Partial<{ theme: 'light' | 'dark' | 'system'; language: string }>) => {
    if (s.theme) setTheme(s.theme);
    if (s.language) setLanguage(s.language);
  };

  return <>{render({ settings, isLoading: false, error: null, updateSettings })}</>;
}
