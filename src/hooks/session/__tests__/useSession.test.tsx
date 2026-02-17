import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { SessionProvider } from '@/lib/context/SessionContext';
import type { SessionService } from '@/core/session/interfaces';
import { useSession } from '../useSession';

const mockService: SessionService = {
  listUserSessions: vi.fn(),
  revokeUserSession: vi.fn(),
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SessionProvider sessionService={mockService}>{children}</SessionProvider>
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useSession', () => {
  it('fetches sessions successfully', async () => {
    (mockService.listUserSessions as any).mockResolvedValue([
      { id: '1', is_current: true },
      { id: '2', is_current: false },
    ]);
    const { result } = renderHook(() => useSession(), { wrapper });
    await act(async () => {
      await result.current.fetchSessions();
    });
    expect(mockService.listUserSessions).toHaveBeenCalled();
    expect(result.current.sessions.length).toBe(2);
    expect(result.current.currentSession?.id).toBe('1');
    expect(result.current.error).toBeNull();
  });

  it('handles fetch error', async () => {
    (mockService.listUserSessions as any).mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useSession(), { wrapper });
    await act(async () => {
      await result.current.fetchSessions();
    });
    expect(result.current.sessions).toEqual([]);
    expect(result.current.error).toBe('fail');
  });

  it('terminates a session', async () => {
    (mockService.revokeUserSession as any).mockResolvedValue(undefined);
    const { result } = renderHook(() => useSession(), { wrapper });
    result.current['sessions'] = [ { id: '1', is_current: false } as any ];
    await act(async () => {
      await result.current.terminateSession('1');
    });
    expect(mockService.revokeUserSession).toHaveBeenCalledWith('me', '1');
    expect(result.current.sessions).toEqual([]);
  });

  it('handles terminate error', async () => {
    (mockService.revokeUserSession as any).mockRejectedValue(new Error('oops'));
    const { result } = renderHook(() => useSession(), { wrapper });
    await act(async () => {
      await result.current.terminateSession('1');
    });
    expect(result.current.error).toBe('oops');
  });

  it('terminates all other sessions', async () => {
    (mockService.listUserSessions as any).mockResolvedValue([
      { id: '1', is_current: true },
      { id: '2', is_current: false },
    ]);
    (mockService.revokeUserSession as any).mockResolvedValue(undefined);
    const { result } = renderHook(() => useSession(), { wrapper });
    // Populate sessions and currentSession via fetchSessions
    await act(async () => {
      await result.current.fetchSessions();
    });
    await act(async () => {
      await result.current.terminateAllOtherSessions();
    });
    expect(mockService.revokeUserSession).toHaveBeenCalledWith('me', '2');
    expect(result.current.sessions).toEqual([{ id: '1', is_current: true }]);
  });
});
