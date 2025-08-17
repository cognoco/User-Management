import React, { useEffect, useState } from 'react';
import { usePreferencesStore } from '@/lib/stores/preferences.store';
import { useAuth } from '@/hooks/auth/useAuth';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/ui/primitives/alert-dialog';
import type { UserPreferences } from '@/types/database';
import { getBrowserLanguage, getBrowserTimezone, getDefaultDateFormat } from '@/lib/utils';

/**
 * UserPreferences Component
 * Placeholder for managing user preferences (e.g., language, theme).
 */

// Types for props (for modular/host integration)
interface UserPreferencesProps {
  onSave?: () => void;
  onReset?: () => void;
  onError?: (error: string) => void;
}

// Helper to get locale-based defaults
function getLocaleDefaults(): Partial<UserPreferences> {
  const language = getBrowserLanguage();
  const timezone = getBrowserTimezone();
  const dateFormat = getDefaultDateFormat(language);
  return { language, timezone, dateFormat };
}

const DEFAULT_PREFERENCES: UserPreferences = {
  id: '',
  userId: '',
  createdAt: new Date(),
  updatedAt: new Date(),
  language: getLocaleDefaults().language || 'en',
  theme: 'system',
  notifications: {
    email: true,
    push: true,
    marketing: false,
  },
  itemsPerPage: 25,
  timezone: getLocaleDefaults().timezone || 'UTC',
  dateFormat: getLocaleDefaults().dateFormat || 'YYYY-MM-DD',
};

export const UserPreferencesComponent: React.FC<UserPreferencesProps> = ({ onSave, onReset, onError }) => {
  const { t } = useTranslation();
  const { preferences, isLoading, error, fetchPreferences, updatePreferences } = usePreferencesStore();
  const { user } = useAuth();

  // Local state for form
  const [form, setForm] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [validationError, setValidationError] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [importStatus, setImportStatus] = useState('');

  // Load preferences on mount
  useEffect(() => {
    if (user && !preferences) fetchPreferences();
    // eslint-disable-next-line
  }, [user]);

  // Sync store to form
  useEffect(() => {
    if (preferences) {
      setForm({
        ...DEFAULT_PREFERENCES,
        ...preferences,
        createdAt: preferences.createdAt ? new Date(preferences.createdAt) : new Date(),
        updatedAt: preferences.updatedAt ? new Date(preferences.updatedAt) : new Date(),
      });
    } else {
      // If no preferences, use locale-based defaults
      setForm({ ...DEFAULT_PREFERENCES });
    }
  }, [preferences]);

  // Theme application
  useEffect(() => {
    if (form.theme) {
      const root = document.documentElement;
      root.classList.remove('light-theme', 'dark-theme', 'system-theme');
      if (form.theme === 'light') root.classList.add('light-theme');
      else if (form.theme === 'dark') root.classList.add('dark-theme');
      else root.classList.add('system-theme');
    }
  }, [form.theme]);

  // Notification categories config (map to backend fields)
  const notificationCategories: { key: keyof UserPreferences['notifications']; label: string; description: string; mandatory: boolean }[] = [
    { key: 'email', label: 'email notifications', description: 'Receive important updates via email', mandatory: true },
    { key: 'push', label: 'push notifications', description: 'Receive push notifications in your browser/device', mandatory: false },
    { key: 'marketing', label: 'marketing notifications', description: 'Receive product updates, tips, and offers', mandatory: false },
  ];

  // Handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === 'itemsPerPage' ? Number(value) : value }));
    setValidationError('');
  };

  const handleSave = async (): Promise<void> => {
    if (form.itemsPerPage > 100) {
      setValidationError(t('maximum allowed is 100'));
      return;
    }
    setValidationError('');
    // Only send fields that exist in UserPreferences
    const ok = await updatePreferences({
      language: form.language,
      theme: form.theme,
      notifications: form.notifications,
      itemsPerPage: form.itemsPerPage,
      timezone: form.timezone,
      dateFormat: form.dateFormat,
    });
    if (ok) {
      setSuccessMsg(t('preferences saved'));
      onSave?.();
    } else {
      onError?.(error || t('error saving preferences'));
    }
  };

  const handleReset = async (): Promise<void> => {
    setShowResetModal(false);
    const localeDefaults = getLocaleDefaults();
    const resetDefaults = { ...DEFAULT_PREFERENCES, ...localeDefaults };
    setForm(resetDefaults);
    await updatePreferences(resetDefaults);
    setSuccessMsg(t('preferences reset'));
    onReset?.();
  };

  const handleNotificationChange = (
    catKey: keyof UserPreferences['notifications'],
    checked: boolean
  ): void => {
    setForm(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [catKey]: checked,
      },
    }));
  };

  // --- Export Preferences as JSON File ---
  const handleExportData = async (): Promise<void> => {
    setExportStatus('');
    try {
      // Only export relevant fields
      const exportData = {
        language: form.language,
        theme: form.theme,
        notifications: form.notifications,
        itemsPerPage: form.itemsPerPage,
        timezone: form.timezone,
        dateFormat: form.dateFormat,
      };
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'user-preferences.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
      setExportStatus('your data export has been downloaded successfully');
    } catch (err) {
      setExportStatus('failed to export preferences');
    }
  };

  // --- Import Preferences from JSON File ---
  const handleImportData = async (): Promise<void> => {
    setImportStatus('');
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.style.display = 'none';
      document.body.appendChild(input);
      input.click();
      input.onchange = async () => {
        if (!input.files || input.files.length === 0) {
          setImportStatus('no file selected');
          document.body.removeChild(input);
          return;
        }
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const text = e.target?.result as string;
            const data = JSON.parse(text);
            // Basic validation: check for required fields
            if (
              typeof data !== 'object' ||
              !data.language ||
              !data.theme ||
              !data.notifications ||
              typeof data.itemsPerPage !== 'number'
            ) {
              setImportStatus('invalid preferences file');
              document.body.removeChild(input);
              return;
            }
            // Update preferences
            await updatePreferences(data);
            setImportStatus('your data import was successful');
          } catch (err) {
            setImportStatus('failed to import preferences');
          }
          document.body.removeChild(input);
        };
        reader.onerror = () => {
          setImportStatus('failed to read file');
          document.body.removeChild(input);
        };
        reader.readAsText(file);
      };
    } catch (err) {
      setImportStatus('failed to import preferences');
    }
  };

  // UI
  return (
    <div className="max-w-md mx-auto p-4 bg-white dark:bg-gray-900 rounded shadow">
      <h2 className="text-xl font-bold mb-4">{t('user preferences')}</h2>
      {isLoading && <div role="status">{t('loading')}...</div>}
      {error && <div role="alert" className="text-red-600">{t(error)}</div>}
      {validationError && <div role="alert" className="text-red-600">{validationError}</div>}
      {successMsg && <div role="status" className="text-green-600">{successMsg}</div>}
      <form
        onSubmit={e => { e.preventDefault(); handleSave(); }}
        aria-label={t('user preferences')}
      >
        <div className="mb-4">
          <label htmlFor="language-select" className="block mb-1">{t('language')}</label>
          <select
            id="language-select"
            name="language"
            value={form.language}
            onChange={handleChange}
            className="w-full border rounded px-2 py-1"
          >
            <option value="en">{t('english')}</option>
            <option value="es">{t('spanish')}</option>
            <option value="fr">{t('french')}</option>
          </select>
        </div>
        <div className="mb-4">
          <label htmlFor="theme-select" className="block mb-1">{t('theme')}</label>
          <select
            id="theme-select"
            name="theme"
            value={form.theme}
            onChange={handleChange}
            className="w-full border rounded px-2 py-1"
          >
            <option value="light">{t('light')}</option>
            <option value="dark">{t('dark')}</option>
            <option value="system">{t('system')}</option>
          </select>
        </div>
        <div className="mb-4">
          <label htmlFor="items-per-page" className="block mb-1">{t('items per page')}</label>
          <input
            id="items-per-page"
            name="itemsPerPage"
            type="number"
            min={1}
            max={100}
            value={String(form.itemsPerPage)}
            onChange={handleChange}
            className="w-full border rounded px-2 py-1"
            aria-describedby="items-per-page-help"
          />
          <small id="items-per-page-help" className="text-gray-500">{t('maximum allowed is 100')}</small>
        </div>
        <button
          type="button"
          className="mb-2 text-blue-600 underline"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
        >
          {showAdvanced ? t('hide advanced settings') : t('show advanced settings')}
        </button>
        {showAdvanced && (
          <div className="mb-4">
            <label htmlFor="timezone" className="block mb-1">{t('timezone')}</label>
            <input
              id="timezone"
              name="timezone"
              type="text"
              value={form.timezone}
              onChange={handleChange}
              className="w-full border rounded px-2 py-1 mb-2"
            />
            <label htmlFor="date-format" className="block mb-1">{t('date format')}</label>
            <input
              id="date-format"
              name="dateFormat"
              type="text"
              value={form.dateFormat}
              onChange={handleChange}
              className="w-full border rounded px-2 py-1"
            />
          </div>
        )}
        <div className="mb-4">
          <h3 className="font-semibold mb-2">{t('notification preferences')}</h3>
          <table className="w-full text-sm mb-2">
            <thead>
              <tr>
                <th className="text-left">{t('type')}</th>
                <th>{t('enabled')}</th>
              </tr>
            </thead>
            <tbody>
              {notificationCategories.map(cat => (
                <tr key={cat.key}>
                  <td>{t(cat.label)}<br /><span className="text-xs text-gray-500">{t(cat.description)}</span></td>
                  <td>
                    <input
                      type="checkbox"
                      checked={form.notifications[cat.key] || false}
                      onChange={e => handleNotificationChange(cat.key, e.target.checked)}
                      disabled={cat.mandatory}
                      aria-label={t(`${cat.label}`)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <small className="text-gray-500">{t('mandatory notifications cannot be disabled')}</small>
        </div>
        <div className="mb-4">
          <h3 className="font-semibold mb-2">{t('data management')}</h3>
          <button type="button" className="bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded mr-2" onClick={handleExportData}>{t('export my data')}</button>
          <button type="button" className="bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded" onClick={handleImportData}>{t('import data')}</button>
          {exportStatus && <div className="text-green-600 mt-2">{t(exportStatus)}</div>}
          {importStatus && <div className="text-green-600 mt-2">{t(importStatus)}</div>}
        </div>
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            className="bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded"
            onClick={() => setShowResetModal(true)}
          >
            {t('reset to defaults')}
          </button>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-1 rounded"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {t('save')}
          </button>
        </div>
      </form>
      {/* Reset confirmation modal */}
      <AlertDialog open={showResetModal} onOpenChange={setShowResetModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('reset preferences')}</AlertDialogTitle>
            <AlertDialogDescription>{t('are you sure you want to reset your preferences to defaults?')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowResetModal(false)}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} className="bg-red-600 text-white">
              {t('reset')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Props: onSave, onReset, onError for host integration
// Emits: calls these props on respective actions
// Accessible: all fields labeled, modal uses Dialog, ARIA roles
// i18n: all text via useTranslation
// Integrates Zustand, Supabase, applies theme immediately 