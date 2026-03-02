/**
 * Minimal test for auth.store.ts focusing only on function accessibility
 */

import { describe, it, expect } from 'vitest';
import { useAuthStore } from '@/stores/auth.store';

describe('Auth Store Minimal Test', () => {
  it('should expose all action functions through getState()', () => {
    // Get the store state directly
    const state = useAuthStore.getState();
    
    // Check that all functions exist and are functions
    expect(state.login).toBeDefined();
    expect(typeof state.login).toBe('function');
    
    expect(state.register).toBeDefined();
    expect(typeof state.register).toBe('function');
    
    expect(state.logout).toBeDefined();
    expect(typeof state.logout).toBe('function');
    
    // This test confirms that the functions are accessible through getState()
    // and are properly defined as functions, which is the core issue
  });
});