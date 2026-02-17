import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTeamInvite } from '../useTeamInvite';
import { UserManagementConfiguration } from '@/core/config';
import type { TeamService } from '@/core/team/interfaces';
import React from 'react';

const mockTeamService: TeamService = {
  inviteToTeam: vi.fn(),
} as unknown as TeamService;

// Test wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  function QueryClientTestProvider({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  QueryClientTestProvider.displayName = 'QueryClientTestProvider';
  return QueryClientTestProvider;
}

describe('useTeamInvite', () => {
  const inviteData = {
    email: 'test@example.com',
    role: 'member' as const,
    teamLicenseId: 'license-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    UserManagementConfiguration.reset();
    UserManagementConfiguration.configureServiceProviders({ teamService: mockTeamService });
  });

  afterEach(() => {
    UserManagementConfiguration.reset();
  });

  it('should send an invitation successfully', async () => {
    vi.mocked(mockTeamService.inviteToTeam).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useTeamInvite(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.inviteToTeam('license-123', inviteData);
    });

    await waitFor(() => {
      expect(result.current.successMessage).toBe('Invitation sent successfully');
    });

    expect(mockTeamService.inviteToTeam).toHaveBeenCalledWith('license-123', inviteData);
  });

  it('should handle invitation failure', async () => {
    const errorMessage = 'Invalid email address';
    vi.mocked(mockTeamService.inviteToTeam).mockResolvedValue({ success: false, error: errorMessage });

    const { result } = renderHook(() => useTeamInvite(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.inviteToTeam('license-123', inviteData);
    });

    await waitFor(() => {
      expect(result.current.error).toBe(errorMessage);
    });

    expect(mockTeamService.inviteToTeam).toHaveBeenCalledWith('license-123', inviteData);
  });

  it('should handle network errors', async () => {
    vi.mocked(mockTeamService.inviteToTeam).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useTeamInvite(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.inviteToTeam('license-123', inviteData);
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });

    expect(mockTeamService.inviteToTeam).toHaveBeenCalledWith('license-123', inviteData);
  });
});
