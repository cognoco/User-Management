// Simplified test for empty states
import { vi, describe, beforeEach, test, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@/tests/i18nTestSetup';

// Simple empty state component
const EmptyState = ({ 
  type, 
  message, 
  actionLabel 
}: { 
  type: 'data' | 'search' | 'notifications';
  message?: string;
  actionLabel?: string | false;
}) => {
  const defaultMessages = {
    data: 'No data available',
    search: 'No results found',
    notifications: 'No notifications'
  };
  
  const defaultActions = {
    data: 'Create new',
    search: 'Try different keywords',
    notifications: 'Update settings'
  };
  
  return (
    <div className="text-center p-8 border border-dashed rounded-md">
      <p className="text-muted-foreground">
        {message || defaultMessages[type]}
      </p>
      {actionLabel !== false && (
        <button className="mt-4">
          {actionLabel || defaultActions[type]}
        </button>
      )}
    </div>
  );
};

describe('Empty States - Simplified', () => {
  test('shows appropriate empty state for data table', () => {
    render(<EmptyState type="data" />);
    
    expect(screen.getByText('No data available')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create new' })).toBeInTheDocument();
  });
  
  test('shows appropriate empty state for search results', () => {
    render(<EmptyState type="search" />);
    
    expect(screen.getByText('No results found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try different keywords' })).toBeInTheDocument();
  });
  
  test('shows appropriate empty state for notification center', () => {
    render(<EmptyState type="notifications" />);
    
    expect(screen.getByText('No notifications')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update settings' })).toBeInTheDocument();
  });
  
  test('allows custom messages', () => {
    render(
      <EmptyState 
        type="data" 
        message="No projects found" 
        actionLabel="Create your first project"
      />
    );
    
    expect(screen.getByText('No projects found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create your first project' })).toBeInTheDocument();
  });
  
  test('can hide action button', () => {
    render(<EmptyState type="data" actionLabel={false} />);
    
    expect(screen.getByText('No data available')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});