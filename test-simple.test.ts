import { describe, it, expect, vi } from 'vitest';

// Simple mock for withValidatedServices
vi.mock('@/lib/api/with-services', () => ({
  withValidatedServices: vi.fn((config) => {
    console.log('Mock withValidatedServices called with:', config);
    return async (req: Request) => {
      console.log('Handler called with request:', req.method);
      return new Response(JSON.stringify({ test: 'success' }), { status: 200 });
    };
  })
}));

describe('Simple test', () => {
  it('should work', () => {
    console.log('Simple test running');
    expect(1).toBe(1);
  });

  it('should handle async', async () => {
    console.log('Async test starting');
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('Async test completed');
    expect(true).toBe(true);
  });
});