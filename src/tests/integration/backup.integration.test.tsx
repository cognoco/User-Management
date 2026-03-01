import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BackupCodesDisplay } from '@/ui/styled/auth/BackupCodesDisplay';
import { MFAVerificationForm } from '@/ui/styled/auth/MFAVerificationForm';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { vi } from 'vitest';
import '@/tests/i18nTestSetup';

const backupCodes = [
  'ABCD-1234',
  'EFGH-5678',
  'IJKL-9012',
  'MNOP-3456',
  'QRST-7890',
  'UVWX-2345',
  'YZAB-6789',
  'CDEF-0123',
  'GHIJ-4567',
  'KLMN-8901',
];

const server = setupServer(
  http.post('/api/2fa/backup-codes', () => {
    return HttpResponse.json({ codes: backupCodes });
  }),
  http.post('/api/2fa/backup-codes/verify', async ({ request }) => {
    const { code } = (await request.json()) as { code: string };
    if (backupCodes.includes(code)) {
      return HttpResponse.json({ success: true });
    }
    return new HttpResponse(
      JSON.stringify({ error: 'Invalid backup code.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('Backup Codes Integration', () => {
  it('displays and allows download/copy/regenerate of backup codes', async () => {
    renderWithClient(<BackupCodesDisplay showRegenerateOption={true} />);
    await waitFor(() => {
      backupCodes.forEach(code => {
        expect(screen.getByText(code)).toBeInTheDocument();
      });
    });
    // Simulate download and copy (clipboard API is stubbed in jsdom)
    fireEvent.click(screen.getByText('Download'));
    fireEvent.click(screen.getByText('Copy'));
    // Regenerate
    fireEvent.click(screen.getByText('Regenerate Codes'));
    await waitFor(() => {
      expect(screen.getByText(backupCodes[0])).toBeInTheDocument();
    });
  });

  it('verifies a valid backup code in MFAVerificationForm', async () => {
    const onSuccess = vi.fn();
    renderWithClient(
      <MFAVerificationForm sessionId="dummy-session" onSuccess={onSuccess} />
    );
    // Switch to backup code mode
    fireEvent.click(screen.getByText('Use a backup code'));
    fireEvent.change(screen.getByPlaceholderText('XXXX-XXXX'), { target: { value: backupCodes[0] } });
    fireEvent.click(screen.getByText('Verify'));
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('shows error for invalid backup code in MFAVerificationForm', async () => {
    const onSuccess = vi.fn();
    renderWithClient(
      <MFAVerificationForm sessionId="dummy-session" onSuccess={onSuccess} />
    );
    fireEvent.click(screen.getByText('Use a backup code'));
    fireEvent.change(screen.getByPlaceholderText('XXXX-XXXX'), { target: { value: 'WRONG-0000' } });
    fireEvent.click(screen.getByText('Verify'));
    await waitFor(() => {
      expect(screen.getByText('Invalid backup code.')).toBeInTheDocument();
    });
  });
});
