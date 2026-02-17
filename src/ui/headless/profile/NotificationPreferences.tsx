import { useEffect, useState } from 'react';
import { usePreferencesStore } from '@/lib/stores/preferences.store';
import { NotificationChannel, NotificationCategory } from '@/core/notification/models';

export interface CategoryPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
}

export type NotificationPreferencesState = Record<NotificationCategory, CategoryPreferences>;

export interface NotificationPreferencesProps {
  /** Automatically save changes when toggles change */
  autoSave?: boolean;
  /** Optional save handler. If not provided, preferences store update is used */
  onSave?: (prefs: NotificationPreferencesState) => Promise<void>;
  /** Render prop function */
  render: (props: {
    preferences: NotificationPreferencesState;
    isLoading: boolean;
    error: string | null;
    toggle: (category: NotificationCategory, channel: NotificationChannel) => void;
    save: () => Promise<void>;
  }) => React.ReactNode;
}

/**
 * Headless component for managing notification preferences
 */
export function NotificationPreferences({ autoSave = true, onSave, render }: NotificationPreferencesProps) {
  const { preferences, fetchPreferences, updatePreferences, isLoading, error } = usePreferencesStore();

  const defaultState: NotificationPreferencesState = {
    [NotificationCategory.SECURITY]: { email: true, push: true, inApp: true },
    [NotificationCategory.TEAM]: { email: true, push: true, inApp: true },
    [NotificationCategory.ACCOUNT]: { email: true, push: true, inApp: true }
  } as NotificationPreferencesState;

  const [prefs, setPrefs] = useState<NotificationPreferencesState>(defaultState);

  useEffect(() => { fetchPreferences(); }, [fetchPreferences]);

  useEffect(() => {
    if (preferences?.notifications) {
      const { email = true, push = true } = preferences.notifications as any;
      setPrefs({
        [NotificationCategory.SECURITY]: { email, push, inApp: true },
        [NotificationCategory.TEAM]: { email, push, inApp: true },
        [NotificationCategory.ACCOUNT]: { email, push, inApp: true },
        [NotificationCategory.SYSTEM]: { email, push, inApp: true },
        [NotificationCategory.PROMOTIONAL]: { email, push, inApp: false },
        [NotificationCategory.UPDATES]: { email, push, inApp: true },
        [NotificationCategory.ACTIVITY]: { email, push, inApp: true },
      } as NotificationPreferencesState);
    }
  }, [preferences]);

  const save = async () => {
    if (onSave) {
      await onSave(prefs);
    } else {
      const firstCat = prefs[NotificationCategory.SECURITY];
      await updatePreferences({ notifications: { email: firstCat.email, push: firstCat.push } as any });
    }
  };

  const toggle = (category: NotificationCategory, channel: NotificationChannel) => {
    setPrefs(prev => {
      const next = { ...prev };
      const cat = { ...next[category] };
      if (channel === NotificationChannel.EMAIL) cat.email = !cat.email;
      if (channel === NotificationChannel.PUSH) cat.push = !cat.push;
      if (channel === NotificationChannel.IN_APP) cat.inApp = !cat.inApp;
      next[category] = cat;
      return next;
    });
    if (autoSave) {
      save();
    }
  };

  return <>{render({ preferences: prefs, isLoading, error, toggle, save })}</>;
}

export default NotificationPreferences;
