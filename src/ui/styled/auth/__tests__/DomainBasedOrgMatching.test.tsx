import '@/tests/i18nTestSetup';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DomainBasedOrgMatching } from '../DomainBasedOrgMatching';
import { TestWrapper } from '../../../../tests/utils/test-wrapper';
import { api } from '@/lib/api/axios';

vi.mock('@/lib/api/axios');
vi.mock('@/ui/primitives/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

const mockGet = vi.mocked(api.get);
const mockPost = vi.mocked(api.post);
const mockDelete = vi.mocked(api.delete);
const mockPatch = vi.mocked(api.patch);

function renderComponent(): ReturnType<typeof render> {
  return render(
    <TestWrapper authenticated>
      <DomainBasedOrgMatching organizationId="org1" />
    </TestWrapper>
  );
}

describe('DomainBasedOrgMatching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: { domains: [] } });
    mockPost.mockResolvedValue({ data: {} });
    mockDelete.mockResolvedValue({});
    mockPatch.mockResolvedValue({});
  });

  it('fetches and displays domains', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        domains: [
          { id: '1', domain: 'example.com', verified: true, autoJoin: true, enforceSSO: false, createdAt: '' },
        ],
      },
    });
    renderComponent();

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/api/organizations/org1/domains');
    });

    expect(await screen.findByText('example.com')).toBeInTheDocument();
  });

  it('shows skeleton while loading', async () => {
    let resolve: (v: unknown) => void = () => {};
    mockGet.mockImplementationOnce(
      () => new Promise((r) => {
        resolve = r;
      })
    );

    renderComponent();

    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);

    resolve({ data: { domains: [] } });
    await waitFor(() => {
      expect(screen.queryByTestId('skeleton')).toBeNull();
    });
  });

  it('adds a domain on submit', async () => {
    renderComponent();
    const input = screen.getByPlaceholderText('example.com');
    await userEvent.type(input, 'new.com');
    await userEvent.click(screen.getByRole('button', { name: /org\.domains\.addButton/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/organizations/org1/domains', {
        domain: 'new.com',
        autoJoin: true,
        enforceSSO: false,
      });
    });
  });

  it('shows error when add fails', async () => {
    mockPost.mockRejectedValueOnce({ response: { data: { error: 'add failed' } } });
    renderComponent();
    const input = screen.getByPlaceholderText('example.com');
    await userEvent.type(input, 'bad.com');
    await userEvent.click(screen.getByRole('button', { name: /org\.domains\.addButton/i }));

    const alerts = await screen.findAllByRole('alert');
    expect(alerts.some(a => a.textContent?.includes('add failed'))).toBe(true);
  });

  it('removes a domain', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        domains: [
          { id: '1', domain: 'remove.com', verified: false, autoJoin: true, enforceSSO: false, createdAt: '' },
        ],
      },
    });
    renderComponent();

    const deleteBtn = await screen.findByLabelText('org.domains.deleteDomain');
    await userEvent.click(deleteBtn);

    expect(mockDelete).toHaveBeenCalledWith('/api/organizations/org1/domains/1');
  });
});
