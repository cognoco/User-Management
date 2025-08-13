// __tests__/integration/file-upload-flow.test.js

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import FileManager from '@/ui/styled/common/FileManager';
import { vi, Mock } from 'vitest';

// Import our standardized mock
vi.mock('@/lib/database/supabase', async () => (await import('@/tests/mocks/supabase')));
import { supabase } from '@/lib/database/supabase';

// Cast storage methods to Mock for linter compliance
const getStorage = () => supabase.storage.from('files');
const mockList = getStorage().list as Mock;
const mockUpload = getStorage().upload as Mock;
const mockRemove = getStorage().remove as Mock;
const mockMove = getStorage().move as Mock;
const mockGetPublicUrl = getStorage().getPublicUrl as Mock;

describe('File Upload and Management Flow', () => {
  let user: UserEvent;
  let files: Array<{ name: string; metadata?: any }>; // stateful file list

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    files = [];
    // Mock .list() to always return the current state
    mockList.mockImplementation(() => Promise.resolve({ data: [...files], error: null }));
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/test-doc.pdf' } });
    (supabase.auth.getUser as Mock).mockResolvedValue({
      data: { user: { id: 'user-123', email: 'user@example.com' } },
      error: null
    });
    mockList.mockResolvedValueOnce({
      data: [...files],
      error: null
    });
  });

  test('User can upload, view, and delete files', async () => {
    render(<FileManager allowFolders={true} />);
    await screen.findByText(/no files/i);
    // 1. UPLOAD: Create test file
    const file = new File(['test content'], 'test-doc.pdf', { type: 'application/pdf' });
    mockUpload.mockResolvedValueOnce({
      data: { path: 'test-doc.pdf' },
      error: null
    });
    const input = screen.getByLabelText(/upload file/i);
    await user.upload(input, file);
    
    // Update the files array and set up the next list call to return updated data
    files.push({ name: 'test-doc.pdf', metadata: { size: 12345, mimetype: 'application/pdf' } });
    mockList.mockResolvedValueOnce({
      data: [...files],
      error: null
    });
    
    await waitFor(() => expect(screen.getByText('test-doc.pdf')).toBeInTheDocument());
    const downloadLink = screen.getByRole('link', { name: /download/i });
    expect(downloadLink).toHaveAttribute('href', 'https://example.com/test-doc.pdf');
    await user.click(screen.getByRole('button', { name: /delete/i }));
    await user.click(screen.getByRole('button', { name: /confirm/i }));
    
    mockRemove.mockResolvedValueOnce({
      data: { success: true },
      error: null
    });
    
    // Update files array and mock the next list call
    files = files.filter(f => f.name !== 'test-doc.pdf');
    mockList.mockResolvedValueOnce({
      data: [...files],
      error: null
    });
    
    await waitFor(() => expect(screen.getByText(/no files/i)).toBeInTheDocument());
  });
  
  test('displays upload progress indicator', async () => {
    render(<FileManager allowFolders={true} />);
    mockUpload.mockReturnValueOnce(new Promise(resolve => setTimeout(() => {
      files.push({ name: 'large-file.pdf', metadata: { size: 50000 } });
      resolve({ data: { path: 'large-file.pdf' }, error: null });
    }, 100)));
    const fileInput = screen.getByLabelText(/upload file/i);
    await user.upload(fileInput, new File(['dummy'], 'large-file.pdf', { type: 'application/pdf' }));
    expect(await screen.findByText(/uploading/i)).toBeInTheDocument();
    // Wait for upload to finish and file to appear
    await screen.findByText(/large-file\.pdf/i);
  });
  
  test('handles file upload errors', async () => {
    render(<FileManager allowFolders={true} />);
    mockUpload.mockResolvedValueOnce({
      data: null,
      error: { message: 'File size exceeds limit' }
    });
    const largeFile = new File(['test'.repeat(1000000)], 'too-large.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/upload file/i);
    await user.upload(input, largeFile);
    await screen.findByText(/file size exceeds limit/i);
  });
  
  test('handles different file types with appropriate icons', async () => {
    render(<FileManager allowFolders={true} />);
    files = [
      { name: 'document.pdf', metadata: { size: 12345, mimetype: 'application/pdf' } },
      { name: 'image.jpg', metadata: { size: 23456, mimetype: 'image/jpeg' } },
      { name: 'spreadsheet.xlsx', metadata: { size: 34567, mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } }
    ];
    render(<FileManager allowFolders={true} />);
    await waitFor(() => expect(screen.getByText('document.pdf')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('image.jpg')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('spreadsheet.xlsx')).toBeInTheDocument());
  });
  
  test('supports file renaming', async () => {
    render(<FileManager allowFolders={true} />);
    files = [
      { name: 'old-name.pdf', metadata: { size: 12345, mimetype: 'application/pdf' } }
    ];
    render(<FileManager allowFolders={true} />);
    await waitFor(() => expect(screen.getByText('old-name.pdf')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /rename/i }));
    await user.clear(screen.getByLabelText(/new name/i));
    await user.type(screen.getByLabelText(/new name/i), 'new-name.pdf');
    mockMove.mockResolvedValueOnce({
      data: { path: 'new-name.pdf' },
      error: null
    });
    files = [
      { name: 'new-name.pdf', metadata: { size: 12345, mimetype: 'application/pdf' } }
    ];
    await user.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(screen.getByText('new-name.pdf')).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText('old-name.pdf')).not.toBeInTheDocument());
  });
  
  test('supports folder navigation', async () => {
    render(<FileManager allowFolders={true} />);
    let inDocuments = false;
    mockList.mockImplementation(() => {
      if (inDocuments) {
        return Promise.resolve({
          data: [
            { name: 'document1.pdf', metadata: { size: 12345, mimetype: 'application/pdf' } },
            { name: 'document2.docx', metadata: { size: 23456, mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' } }
          ],
          error: null
        });
      } else {
        return Promise.resolve({
          data: [
            { name: 'documents/', id: 'documents', metadata: { mimetype: 'inode/directory' } },
            { name: 'images/', id: 'images', metadata: { mimetype: 'inode/directory' } },
            { name: 'file.txt', metadata: { size: 1234, mimetype: 'text/plain' } }
          ],
          error: null
        });
      }
    });
    await screen.findByText(/documents\//i);
    await screen.findByText(/images\//i);
    await screen.findByText(/file\.txt/i);
    inDocuments = true;
    await user.click(screen.getByText(/documents\//i));
    await screen.findByText(/document1\.pdf/i);
    await screen.findByText(/document2\.docx/i);
    inDocuments = false;
    await user.click(screen.getByText(/home/i));
    await screen.findByText(/documents\//i);
    await screen.findByText(/images\//i);
    await screen.findByText(/file\.txt/i);
  });
  
  test('handles error loading files', async () => {
    render(<FileManager allowFolders={true} />);
    mockList.mockImplementation(() => Promise.resolve({ data: null, error: { message: 'Error loading files' } }));
    await screen.findByText(/error/i);
  });
});
