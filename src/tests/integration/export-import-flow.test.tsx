// __tests__/integration/export-import-flow.test.tsx

vi.mock('@/lib/database/supabase', () => import('@/tests/mocks/supabase'));
import { supabase } from '@/lib/database/supabase';

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserPreferencesComponent } from '@/ui/styled/common/UserPreferences';
import { vi } from 'vitest';

describe('User Preferences Flow', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    
    // Mock authentication
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-123', email: 'user@example.com' } },
      error: null
    });
    
    // Mock supabase.from for user_preferences
    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'user_preferences') {
        return {
          select: vi.fn().mockResolvedValue({
            data: {
              id: 'pref-1',
              user_id: 'user-123',
              theme: 'system',
              language: 'en',
              timezone: 'America/New_York',
              dateFormat: 'MM/DD/YYYY',
              itemsPerPage: 25,
              notifications: {
                email: true,
                push: false,
                marketing: true,
              },
            },
            error: null
          }),
          update: vi.fn().mockResolvedValue({ data: {}, error: null })
        };
      }
      return {} as any;
    });
  });

  test('User can view and update preferences', async () => {
    // Render user preferences
    render(<UserPreferencesComponent />);
    
    // Wait for preferences to load
    await waitFor(() => {
      expect(screen.getByLabelText(/theme/i)).toHaveValue('system');
      expect(screen.getByLabelText(/language/i)).toHaveValue('en');
      expect(screen.getByLabelText(/items per page/i)).toHaveValue('25');
    });
    
    // Update preferences
    await user.selectOptions(screen.getByLabelText(/theme/i), 'dark');
    await user.selectOptions(screen.getByLabelText(/language/i), 'es');
    await user.clear(screen.getByLabelText(/items per page/i));
    await user.type(screen.getByLabelText(/items per page/i), '50');
    
    // Mock successful update
    (supabase.from('user_preferences').update as any).mockResolvedValueOnce({
      data: {
        id: 'pref-1',
        user_id: 'user-123',
        theme: 'dark',
        language: 'es',
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
        itemsPerPage: 50
      },
      error: null
    });
    
    // Save changes
    await user.click(screen.getByRole('button', { name: /save/i }));
    
    // Verify save was successful
    await waitFor(() => {
      expect(screen.getByText(/preferences saved/i)).toBeInTheDocument();
    });
    
    // Verify update was called with correct data
    expect((supabase.from('user_preferences').update as any)).toHaveBeenCalledWith({
      theme: 'dark',
      language: 'es',
      timezone: 'America/New_York',
      dateFormat: 'MM/DD/YYYY',
      itemsPerPage: 50
    });
  });
  
  test('applies theme change immediately', async () => {
    // Mock document.documentElement for theme testing
    const documentElementClassList = {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn()
    };
    
    Object.defineProperty(document, 'documentElement', {
      value: { classList: documentElementClassList },
      writable: true
    });
    
    // Mock preference update
    (supabase.from('user_preferences').update as any).mockResolvedValueOnce({
      data: {
        theme: 'dark'
      },
      error: null
    });
    
    // Render user preferences
    render(<UserPreferencesComponent />);
    
    // Wait for preferences to load
    await waitFor(() => {
      expect(screen.getByLabelText(/theme/i)).toHaveValue('system');
    });
    
    // Change theme
    await user.selectOptions(screen.getByLabelText(/theme/i), 'dark');
    
    // Save changes
    await user.click(screen.getByRole('button', { name: /save/i }));
    
    // Verify theme was applied immediately
    expect(documentElementClassList.remove).toHaveBeenCalledWith('light-theme', 'dark-theme', 'system-theme');
    
    // Restore original document.documentElement
    vi.restoreAllMocks();
  });
  
  test('validates items per page input', async () => {
    // Render user preferences
    render(<UserPreferencesComponent />);
    
    // Wait for preferences to load
    await waitFor(() => {
      expect(screen.getByLabelText(/items per page/i)).toBeInTheDocument();
    });
    
    // Enter invalid value
    await user.clear(screen.getByLabelText(/items per page/i));
    await user.type(screen.getByLabelText(/items per page/i), '500');
    
    // Try to save
    await user.click(screen.getByRole('button', { name: /save/i }));
    
    // Verify validation error
    expect(await screen.findByText(/maximum allowed is 100/i)).toBeInTheDocument();
    
    // Verify no update was attempted
    expect((supabase.from('user_preferences').update as any)).not.toHaveBeenCalled();
  });
  
  test('handles error when saving preferences', async () => {
    // Render user preferences
    render(<UserPreferencesComponent />);
    
    // Wait for preferences to load
    await waitFor(() => {
      expect(screen.getByLabelText(/theme/i)).toBeInTheDocument();
    });
    
    // Change theme
    await user.selectOptions(screen.getByLabelText(/theme/i), 'dark');
    
    // Mock error during update
    (supabase.from('user_preferences').update as any).mockResolvedValueOnce({
      data: null,
      error: { message: 'Error saving preferences' }
    });
    
    // Try to save changes
    await user.click(screen.getByRole('button', { name: /save/i }));
    
    // Verify error message is displayed
    expect(await screen.findByText(/error saving preferences/i)).toBeInTheDocument();
  });
  
  test('can select timezone from dropdown', async () => {
    // Render user preferences
    render(<UserPreferencesComponent />);
    
    // Wait for preferences to load
    await waitFor(() => {
      expect(screen.getByLabelText(/timezone/i)).toBeInTheDocument();
    });
    
    // Open timezone dropdown
    await user.click(screen.getByLabelText(/timezone/i));
    
    // Select a different timezone
    await user.click(await screen.findByText('Europe/London'));
    
    // Mock successful update
    (supabase.from('user_preferences').update as any).mockResolvedValueOnce({
      data: {
        timezone: 'Europe/London'
      },
      error: null
    });
    
    // Save changes
    await user.click(screen.getByRole('button', { name: /save/i }));
    
    // Verify update was called with correct timezone
    expect((supabase.from('user_preferences').update as any)).toHaveBeenCalledWith(expect.objectContaining({
      timezone: 'Europe/London'
    }));
  });
  
  test('can select date format', async () => {
    // Render user preferences
    render(<UserPreferencesComponent />);
    
    // Wait for preferences to load
    await waitFor(() => {
      expect(screen.getByLabelText(/date format/i)).toBeInTheDocument();
    });
    
    // Select a different date format
    await user.selectOptions(screen.getByLabelText(/date format/i), 'DD/MM/YYYY');
    
    // Mock successful update
    (supabase.from('user_preferences').update as any).mockResolvedValueOnce({
      data: {
        dateFormat: 'DD/MM/YYYY'
      },
      error: null
    });
    
    // Save changes
    await user.click(screen.getByRole('button', { name: /save/i }));
    
    // Verify update was called with correct date format
    expect((supabase.from('user_preferences').update as any)).toHaveBeenCalledWith(expect.objectContaining({
      dateFormat: 'DD/MM/YYYY'
    }));
    
    // Verify date format preview is updated
    expect(await screen.findByText(/date format preview/i)).toHaveTextContent(/\d{2}\/\d{2}\/\d{4}/);
  });
  
  test('can toggle advanced settings', async () => {
    // Render user preferences
    render(<UserPreferencesComponent />);
    
    // Wait for preferences to load
    await waitFor(() => {
      expect(screen.getByLabelText(/theme/i)).toBeInTheDocument();
    });
    
    // Advanced settings should be hidden initially
    expect(screen.queryByLabelText(/keyboard shortcuts/i)).not.toBeInTheDocument();
    
    // Open advanced settings section
    await user.click(screen.getByRole('button', { name: /advanced settings/i }));
    
    // Verify advanced settings are visible
    expect(screen.getByLabelText(/keyboard shortcuts/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/auto save/i)).toBeInTheDocument();
    
    // Toggle keyboard shortcuts
    await user.click(screen.getByLabelText(/keyboard shortcuts/i));
    
    // Mock successful update
    (supabase.from('user_preferences').update as any).mockResolvedValueOnce({
      data: {
        advanced_settings: {
          keyboard_shortcuts: true,
          auto_save: false
        }
      },
      error: null
    });
    
    // Save changes
    await user.click(screen.getByRole('button', { name: /save/i }));
    
    // Verify update was called with correct advanced settings
    expect((supabase.from('user_preferences').update as any)).toHaveBeenCalledWith(expect.objectContaining({
      advanced_settings: {
        keyboard_shortcuts: true,
        auto_save: false
      }
    }));
  });
  
  test('can reset preferences to defaults', async () => {
    // Render user preferences
    render(<UserPreferencesComponent />);
    
    // Wait for preferences to load
    await waitFor(() => {
      expect(screen.getByLabelText(/theme/i)).toBeInTheDocument();
    });
    
    // Mock default preferences
    const defaultPreferences = {
      theme: 'system',
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
      itemsPerPage: 25
    };
    
    // Mock successful reset
    (supabase.from('user_preferences').update as any).mockResolvedValueOnce({
      data: defaultPreferences,
      error: null
    });
    
    // Click reset to defaults button
    await user.click(screen.getByRole('button', { name: /reset to defaults/i }));
    
    // Confirm reset
    await user.click(screen.getByRole('button', { name: /reset/i }));
    
    // Verify reset was successful
    expect(await screen.findByText(/preferences reset/i)).toBeInTheDocument();
    
    // Verify form fields were updated to defaults
    expect(screen.getByLabelText(/theme/i)).toHaveValue('system');
    expect(screen.getByLabelText(/items per page/i)).toHaveValue('25');
  });
  
  test('initializes with locale-based defaults if no preferences exist', async () => {
    // Mock browser language and timezone
    Object.defineProperty(navigator, 'language', { value: 'fr-FR', configurable: true });
    const originalResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
    Intl.DateTimeFormat.prototype.resolvedOptions = () => ({
      locale: 'fr-FR',
      calendar: 'gregory',
      numberingSystem: 'latn',
      timeZone: 'Europe/Paris',
    });

    // Simulate no preferences in store
    (supabase.from as any) = vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockResolvedValue({ data: {}, error: null })
    }));

    render(<UserPreferencesComponent />);
    await waitFor(() => {
      expect(screen.getByLabelText(/language/i)).toHaveValue('fr');
      expect(screen.getByLabelText(/timezone/i)).toHaveValue('Europe/Paris');
      expect(screen.getByLabelText(/date format/i)).toHaveValue('DD/MM/YYYY');
    });

    // Restore mocks
    Intl.DateTimeFormat.prototype.resolvedOptions = originalResolvedOptions;
  });
  
  test('can reset preferences to locale-based defaults', async () => {
    // Mock browser language and timezone
    Object.defineProperty(navigator, 'language', { value: 'fr-FR', configurable: true });
    const originalResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
    Intl.DateTimeFormat.prototype.resolvedOptions = () => ({
      locale: 'fr-FR',
      calendar: 'gregory',
      numberingSystem: 'latn',
      timeZone: 'Europe/Paris',
    });

    render(<UserPreferencesComponent />);
    await waitFor(() => {
      expect(screen.getByLabelText(/theme/i)).toBeInTheDocument();
    });

    // Click reset to defaults button
    await user.click(screen.getByRole('button', { name: /reset to defaults/i }));
    // Confirm reset
    await user.click(screen.getByRole('button', { name: /reset/i }));

    // Verify form fields were updated to locale-based defaults
    await waitFor(() => {
      expect(screen.getByLabelText(/language/i)).toHaveValue('fr');
      expect(screen.getByLabelText(/timezone/i)).toHaveValue('Europe/Paris');
      expect(screen.getByLabelText(/date format/i)).toHaveValue('DD/MM/YYYY');
      expect(screen.getByText(/preferences reset/i)).toBeInTheDocument();
    });

    // Restore mocks
    Intl.DateTimeFormat.prototype.resolvedOptions = originalResolvedOptions;
  });
});
