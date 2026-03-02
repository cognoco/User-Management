import { render, screen } from '@/tests/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { ErrorBoundary } from '../ErrorBoundary';

vi.mock('@/lib/utils/analytics', () => ({
  analytics: { trackError: vi.fn() },
}));

const { analytics } = await import('@/lib/utils/analytics');

function ProblemChild(): React.ReactElement {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>ok</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('ok')).toBeInTheDocument();
  });

  it('reports error and recovers on retry', async () => {
    const onError = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <ErrorBoundary onError={onError}>
        <ProblemChild />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(onError).toHaveBeenCalled();
    expect(analytics.trackError).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    rerender(
      <ErrorBoundary onError={onError} key="safe">
        <div>safe</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('safe')).toBeInTheDocument();
  });
});
