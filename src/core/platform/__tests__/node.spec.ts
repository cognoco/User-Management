/**
 * @file Node.js-specific tests for the platform abstraction layer
 * @group core/platform
 * @node
 */

import { getStorage } from '..';

// These tests only run in a Node.js environment
describe('Node.js Platform', () => {
  const originalWindow = global.window;

  beforeAll(() => {
    // Simulate Node.js environment
    // @ts-expect-error - Mocking browser globals
    delete global.window;
  });

  afterAll(() => {
    // Restore original window object
    global.window = originalWindow;
  });

  describe('getStorage', () => {
    it('should return a ServerStorage instance when window is not defined', () => {
      const storage = getStorage('local');
      expect(storage).toBeDefined();
      expect(typeof storage.setItem).toBe('function');
      expect(typeof storage.getItem).toBe('function');
    });

    it('should store and retrieve values in memory', () => {
      const storage = getStorage('local');
      storage.setItem('test', 'value');
      expect(storage.getItem('test')).toBe('value');
    });
  });
});
