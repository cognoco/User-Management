// @vitest-environment jsdom
import React from "react";
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MFASetup } from '../MFASetup';
import { useAuth } from '@/hooks/auth/useAuth';

vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Helper to render component and return props from render prop
function renderSetup() {
  let captured: any;
  render(
    <MFASetup
      render={(props) => {
        captured = props;
        return null;
      }}
    />
  );
  if (!captured) throw new Error('Props not captured');
  return captured;
}

describe('MFASetup integration', () => {
  it('calls setupMFA when handleStartSetup is invoked', async () => {
    const setupMFA = vi.fn().mockResolvedValue({ success: true });
    (useAuth as any).mockReturnValue({
      setupMFA,
      verifyMFA: vi.fn(),
      isLoading: false,
      error: null,
    });

    const props = renderSetup();
    await act(async () => {
      await props.handleStartSetup();
    });
    expect(setupMFA).toHaveBeenCalled();
  });

});
