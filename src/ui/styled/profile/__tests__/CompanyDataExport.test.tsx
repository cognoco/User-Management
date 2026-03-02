import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CompanyDataExport from '../CompanyDataExport';

global.URL.createObjectURL = vi.fn(() => 'blob:url');

describe('CompanyDataExport', () => {
  let originalCreateElement: typeof document.createElement;
  let createElementSpy: any;
  let originalCreateObjectURL: typeof URL.createObjectURL;

  beforeEach(() => {
    vi.resetAllMocks();
    originalCreateElement = document.createElement;
    createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        const anchor = originalCreateElement.call(document, tagName);
        anchor.click = vi.fn();
        anchor.remove = vi.fn();
        return anchor;
      }
      return originalCreateElement.call(document, tagName);
    });
    originalCreateObjectURL = URL.createObjectURL;
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:http://localhost/fake-blob');
  });

  afterEach(() => {
    createElementSpy.mockRestore();
    (URL.createObjectURL as any).mockRestore?.() ?? (URL.createObjectURL = originalCreateObjectURL);
  });

  it('renders and allows company data export', async () => {
    const mockBlob = new Blob([JSON.stringify({ test: 'company' })], { type: 'application/json' });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => mockBlob,
      headers: { get: () => 'attachment; filename="Company_Data_Export.json"' },
    });
    global.fetch = mockFetch;

    await act(async () => {
      render(<CompanyDataExport />);
    });

    expect(screen.getByText('Export Company Data')).toBeInTheDocument();
    
    const downloadButton = screen.getByText('Download Company Data');
    await userEvent.click(downloadButton);

    // Debug: log the DOM after click
    // eslint-disable-next-line no-console
    console.log('DEBUG DOM after click:', document.body.innerHTML);

    await waitFor(() => {
      expect(screen.getByText('Company data export has been downloaded successfully.')).toBeInTheDocument();
    });
  });

  it('shows error on export failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, text: async () => 'Error' });
    
    await act(async () => {
      render(<CompanyDataExport />);
    });

    const downloadButton = screen.getByText('Download Company Data');
    await userEvent.click(downloadButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to export company data.')).toBeInTheDocument();
    });
  });
});
