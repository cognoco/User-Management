// __tests__/utils/component-testing-utils.js

import React from 'react';
import { render, screen, waitFor, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { supabase } from '@/lib/database/supabase';
import { vi, type Mock } from 'vitest';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

/**
 * Creates a mock user event setup
 */
export function createUserEvent() {
  return userEvent.setup();
}

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  authUser?: User | null;
}

type AuthChangeCallback = (event: AuthChangeEvent, session: Session | null) => void;

/**
 * Sets up authentication mocks for component testing
 */
export function mockAuthState(user: User | null = null, loading = false) {
  // Mock getUser
  const getUserMock = supabase.auth.getUser as unknown as Mock;
  if (user) {
    getUserMock.mockResolvedValue({
      data: { user },
      error: null
    });
  } else {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: null
    });
  }

  // Set up auth state change mock to allow triggering auth state changes in tests
  const listeners: AuthChangeCallback[] = [];
  const onAuthStateChangeMock = supabase.auth.onAuthStateChange as unknown as Mock;
  onAuthStateChangeMock.mockImplementation((callback: AuthChangeCallback) => {
    listeners.push(callback);
    return {
      data: {
        subscription: {
          unsubscribe: vi.fn().mockImplementation(() => {
            const index = listeners.indexOf(callback);
            if (index > -1) {
              listeners.splice(index, 1);
            }
          })
        }
      }
    };
  });

  // Return function to trigger auth state changes
  return {
    triggerAuthChange: (event: AuthChangeEvent, session: Session | null) => {
      listeners.forEach(callback => callback(event, session));
    }
  };
}

/**
 * Custom render function with common providers
 */
export function renderWithProviders(ui: React.ReactElement, options: RenderWithProvidersOptions = {}) {
  const {
    route = '/',
    authUser = null,
    ...renderOptions
  } = options;

  // Set up auth mocks if user is provided
  const authControls = mockAuthState(authUser);

  // Create a wrapper with any providers needed
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return children;
  };

  // Render with wrapper
  const result = render(ui, {
    wrapper: Wrapper as React.ComponentType,
    ...renderOptions
  });

  // Return render result with added helpers
  return {
    ...result,
    user: createUserEvent(),
    rerender: (ui: React.ReactElement, rerenderOptions: RenderWithProvidersOptions = {}) =>
      renderWithProviders(ui, { ...rerenderOptions, container: result.container }),
    ...authControls
  };
}

/**
 * Waits for loading state to finish
 */
export async function waitForLoadingToFinish() {
  return waitFor(
    () => {
      const loaders = [
        ...screen.queryAllByRole('progressbar'),
        ...screen.queryAllByText(/loading/i),
        ...screen.queryAllByLabelText(/loading/i)
      ];
      
      if (loaders.length > 0) {
        throw new Error('Still loading');
      }
    },
    { timeout: 4000 }
  );
}

/**
 * Mocks fetching a profile for a user
 */
export function mockProfileFetch(userId: string, profile: Record<string, unknown>, error: Record<string, unknown> | null = null) {
  const mockResponse = { data: profile, error };
  
  // Set up the chain of mocks
  const fromMock = supabase.from as unknown as Mock;
  fromMock.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation((field: string, value: string) => {
          if (field === 'id' && value === userId) {
            return {
              single: vi.fn().mockResolvedValue(mockResponse)
            };
          }
          return { single: vi.fn().mockResolvedValue({ data: null, error: null }) };
        })
      };
    }
    return { select: vi.fn().mockReturnThis() };
  });
}

/**
 * Creates a mock file for testing file uploads
 */
export function createMockFile(name = 'test.jpg', type = 'image/jpeg', size = 1024) {
  const file = new File(['test file content'], name, { type });
  
  // Mock file size and lastModified
  Object.defineProperty(file, 'size', {
    get() { return size; }
  });
  Object.defineProperty(file, 'lastModified', {
    get() { return Date.now(); }
  });
  
  return file;
}

/**
 * Finds a form element by its label text
 */
export function getFormElementByLabel(labelText: string) {
  return screen.getByLabelText(new RegExp(labelText, 'i'));
}

/**
 * Fills a form with the provided data
 */
export async function fillForm(formData: Record<string, string>, userEventInstance: ReturnType<typeof userEvent.setup>) {
  for (const [label, value] of Object.entries(formData)) {
    const element = getFormElementByLabel(label);
    await userEventInstance.clear(element);
    await userEventInstance.type(element, value);
  }
}
