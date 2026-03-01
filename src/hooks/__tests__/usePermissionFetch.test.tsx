import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePermission } from '../usePermission';
import { useAuth } from '@/hooks/auth/useAuth';
import { PermissionValues } from '@/core/permission/models';

vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('usePermission (fetch)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when no user', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as any);
    const { result } = renderHook(() => usePermission(PermissionValues.VIEW_PROJECTS));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasPermission).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('checks permissions and sets value', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: '1' } } as any);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ data: { results: [{ hasPermission: true }] } }),
    } as Response);

    const { result } = renderHook(() => usePermission(PermissionValues.VIEW_PROJECTS));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFetch).toHaveBeenCalled();
    expect(result.current.hasPermission).toBe(true);
  });

  it('handles fetch failure', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: '1' } } as any);
    mockFetch.mockRejectedValueOnce(new Error('fail'));

    const { result } = renderHook(() => usePermission(PermissionValues.VIEW_PROJECTS));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasPermission).toBe(false);
  });
});
