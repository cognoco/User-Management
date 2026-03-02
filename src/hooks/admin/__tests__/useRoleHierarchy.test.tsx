// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRoleHierarchy } from '../useRoleHierarchy';
import { useApi } from '@/hooks/core/useApi';

vi.mock('@/hooks/core/useApi');

describe('useRoleHierarchy', () => {
  const fetchApi = vi.fn();

  beforeEach(() => {
    vi.mocked(useApi).mockReturnValue({ isLoading: false, error: null, fetchApi, apiPost: vi.fn(), apiPatch: vi.fn(), apiDelete: vi.fn() });
    fetchApi.mockResolvedValue({});
  });

  it('fetches hierarchy', async () => {
    const { result } = renderHook(() => useRoleHierarchy());
    await act(async () => {
      await result.current.fetchHierarchy('root');
    });
    expect(fetchApi).toHaveBeenCalledWith('/api/roles/root/hierarchy');
  });

  it('updates parent', async () => {
    const { result } = renderHook(() => useRoleHierarchy());
    await act(async () => {
      await result.current.updateParent('c1', 'p1');
    });
    expect(fetchApi).toHaveBeenCalledWith('/api/roles/c1/hierarchy', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentRoleId: 'p1' }),
    });
  });
});
