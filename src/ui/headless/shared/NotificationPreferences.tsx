/**
 * Headless Notification Preferences Component
 *
 * Provides user notification preferences without UI.
 */
import { useEffect } from 'react';
import { usePreferencesStore } from '@/lib/stores/preferences.store';
import type { UserPreferences } from '@/types/database';

export interface NotificationPreferencesProps {
  render: (props: {
    preferences: UserPreferences | null;
    isLoading: boolean;
    error: string | null;
    update: (prefs: Partial<UserPreferences>) => Promise<void>;
  }) => React.ReactNode;
}

export function NotificationPreferences({ render }: NotificationPreferencesProps) {
  const { preferences, isLoading, error, fetchPreferences, updatePreferences } = usePreferencesStore();

  useEffect(() => { fetchPreferences(); }, [fetchPreferences]);

  const update = async (prefs: Partial<UserPreferences>): Promise<void> => { await updatePreferences(prefs); };

  return <>{render({ preferences, isLoading, error, update })}</>;
}
