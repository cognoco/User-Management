import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NotificationPreferences as HeadlessNotificationPreferences } from '@/ui/headless/shared/NotificationPreferences';

export default function NotificationPreferences(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <HeadlessNotificationPreferences
      render={(props) => <NotificationPreferencesContent {...props} t={t} />}
    />
  );
}

interface ContentProps {
  preferences: unknown;
  isLoading: boolean;
  error: string | null;
  update: (prefs: unknown) => Promise<void>;
  t: (key: string, defaultValue?: string) => string;
}

function NotificationPreferencesContent({ preferences, isLoading, error, update, t }: ContentProps): React.ReactElement {
  const [form, setForm] = useState(
    preferences?.notifications || { email: true, push: true, marketing: false }
  );

  useEffect(() => {
    if (preferences) {
      setForm(preferences.notifications);
    }
  }, [preferences]);

  const handleChange = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [key]: e.target.checked });
  };

  const handleSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    await update({ notifications: form });
  };

  return (
    <div className="rounded border p-4 max-w-lg mx-auto bg-white shadow mt-6">
      <h3 className="text-lg font-semibold mb-2">
        {t('profile.notifications.title', 'Notification Preferences')}
      </h3>
      {isLoading ? (
        <div className="text-gray-500" role="status">{t('common.loading')}</div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={!!form.email}
                onChange={handleChange('email')}
                className="mr-2"
              />
              {t('profile.notifications.email', 'Email Notifications')}
            </label>
            <div className="text-xs text-gray-500 ml-6">
              {t('profile.notifications.emailHelp', 'Security alerts, account activity, important updates')}
            </div>
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={!!form.push}
                onChange={handleChange('push')}
                className="mr-2"
              />
              {t('profile.notifications.push', 'Push Notifications')}
            </label>
            <div className="text-xs text-gray-500 ml-6">
              {t('profile.notifications.pushHelp', 'Browser/device notifications (requires permission)')}
            </div>
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={!!form.marketing}
                onChange={handleChange('marketing')}
                className="mr-2"
              />
              {t('profile.notifications.marketing', 'Product & Marketing Updates')}
            </label>
            <div className="text-xs text-gray-500 ml-6">
              {t('profile.notifications.marketingHelp', 'Tips, tutorials, new features, and offers')}
            </div>
          </div>
          <div className="flex items-center space-x-4 mt-4">
            <button
              type="submit"
              className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
              disabled={isLoading}
            >
              {t('common.save', 'Save Preferences')}
            </button>
            {error && <span className="text-red-600 text-sm" role="alert">{error}</span>}
          </div>
        </form>
      )}
    </div>
  );
}
