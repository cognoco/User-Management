import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUserProfile } from '../useUserProfile';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

const mockUserProfile = {
  id: 'user-1',
  firstName: 'Alice',
  lastName: 'Johnson',
  email: 'alice@example.com',
  phone: '+1987654321',
  bio: 'Software developer',
  avatar: 'https://example.com/avatar.jpg',
  location: 'San Francisco',
  website: 'https://alice.dev',
  preferences: {
    theme: 'dark',
    notifications: true,
  },
};

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch user profile successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockUserProfile,
      }),
    });

    const { result } = renderHook(() => useUserProfile('user-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockUserProfile);
    expect(result.current.error).toBeNull();
    expect(result.current.isSuccess).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith('/api/users/user-1/profile', {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  it('should handle user profile fetch error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({
        success: false,
        error: 'User profile not found',
      }),
    });

    const { result } = renderHook(() => useUserProfile('user-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeTruthy();
    expect(result.current.isError).toBe(true);
  });

  it('should not fetch without userId', () => {
    const { result } = renderHook(() => useUserProfile(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should refetch on userId change', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockUserProfile,
      }),
    });

    const { result, rerender } = renderHook(
      ({ userId }: { userId: string }) => useUserProfile(userId),
      {
        wrapper: createWrapper(),
        initialProps: { userId: 'user-1' },
      }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Mock response for second user
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { ...mockUserProfile, id: 'user-2', firstName: 'Bob' },
      }),
    });

    // Change userId
    rerender({ userId: 'user-2' });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    expect(mockFetch).toHaveBeenLastCalledWith('/api/users/user-2/profile', {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useUserProfile('user-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.isError).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('should handle server errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        error: 'Internal server error',
      }),
    });

    const { result } = renderHook(() => useUserProfile('user-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.isError).toBe(true);
    expect(result.current.data).toBeUndefined();
  });
});