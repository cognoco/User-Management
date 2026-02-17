/**
 * @file Browser-specific tests for the platform abstraction layer
 * @group core/platform
 * @browser
 */

import { getStorage } from '..';

// These tests only run in a browser environment
describe('Browser Platform', () => {
  describe('getStorage', () => {
    const originalLocalStorage = global.localStorage;
    const originalSessionStorage = global.sessionStorage;

    beforeEach(() => {
      // Mock localStorage and sessionStorage
      const localStorageMock = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        key: vi.fn(),
        length: 0
      };

      const sessionStorageMock = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        key: vi.fn(),
        length: 0
      };

      // @ts-expect-error - Mocking browser globals
      global.localStorage = localStorageMock;
      // @ts-expect-error - Mocking browser globals
      global.sessionStorage = sessionStorageMock;
    });

    afterEach(() => {
      // Restore originals
      // @ts-expect-error - Restoring browser globals
      global.localStorage = originalLocalStorage;
      // @ts-expect-error - Restoring browser globals
      global.sessionStorage = originalSessionStorage;
      vi.clearAllMocks();
    });

    it('should use localStorage when type is "local"', () => {
      const storage = getStorage('local');
      storage.setItem('test', 'value');
      expect(global.localStorage.setItem).toHaveBeenCalledWith('test', 'value');
    });

    it('should use sessionStorage when type is "session"', () => {
      const storage = getStorage('session');
      storage.setItem('test', 'value');
      expect(global.sessionStorage.setItem).toHaveBeenCalledWith('test', 'value');
    });

    it('should default to localStorage when no type is specified', () => {
      const storage = getStorage();
      storage.setItem('test', 'value');
      expect(global.localStorage.setItem).toHaveBeenCalledWith('test', 'value');
    });
  });
});
