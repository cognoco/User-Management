import React from 'react';
import { render, screen } from '../utils/test-utils';
import HomePage from '../../../app/page';
import { describe, it, expect } from 'vitest';

describe('Smoke: App Entry', () => {
  it('renders the main HomePage without crashing', () => {
    render(<HomePage />);
    expect(screen.getByText(/Welcome to User Management/i)).toBeInTheDocument();
    expect(screen.getByText(/powerful and flexible user management system/i)).toBeInTheDocument();
    expect(screen.getByText(/Go to Test Page/i)).toBeInTheDocument();
  });
}); 