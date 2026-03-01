/**
 * @file Unit tests for the platform abstraction layer
 * @group core/platform
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  isServer,
  isClient,
  getRequestContext,
  setRequestContext,
  clientOnly,
  serverOnly,
  ServerStorage
} from '..';

describe('Platform Abstraction Layer', () => {
  describe('Environment Detection', () => {
    it('should correctly identify the environment', () => {
      // One of these should be true and the other false
      expect(isServer !== isClient).toBe(true);
    });
  });

  describe('ServerStorage', () => {
    let storage: Storage;

    beforeEach(() => {
      storage = new ServerStorage();
    });

    it('should implement the Storage interface', () => {
      expect(storage).toHaveProperty('length');
      expect(typeof storage.setItem).toBe('function');
      expect(typeof storage.getItem).toBe('function');
      expect(typeof storage.removeItem).toBe('function');
      expect(typeof storage.clear).toBe('function');
      expect(typeof storage.key).toBe('function');
    });

    it('should store and retrieve items', () => {
      storage.setItem('test', 'value');
      expect(storage.getItem('test')).toBe('value');
      expect(storage.length).toBe(1);
    });

    it('should remove items', () => {
      storage.setItem('test', 'value');
      storage.removeItem('test');
      expect(storage.getItem('test')).toBeNull();
      expect(storage.length).toBe(0);
    });

    it('should clear all items', () => {
      storage.setItem('test1', 'value1');
      storage.setItem('test2', 'value2');
      storage.clear();
      expect(storage.length).toBe(0);
    });

    it('should return the correct key by index', () => {
      storage.setItem('key1', 'value1');
      storage.setItem('key2', 'value2');
      expect(storage.key(0)).toBe('key1');
      expect(storage.key(1)).toBe('key2');
      expect(storage.key(2)).toBeNull();
    });
  });

  describe('Request Context', () => {
    afterEach(() => {
      // Reset the request context after each test
      setRequestContext({});
    });

    it('should set and get request context', () => {
      const testContext = { userId: '123', role: 'admin' };
      setRequestContext(testContext);
      expect(getRequestContext()).toEqual(testContext);
    });

    it('should merge request context', () => {
      setRequestContext({ userId: '123' });
      setRequestContext({ role: 'admin' });
      expect(getRequestContext()).toEqual({ userId: '123', role: 'admin' });
    });
  });

  describe('clientOnly and serverOnly', () => {
    it('clientOnly should only execute on client', () => {
      const clientFn = vi.fn(() => 'client');
      const result = clientOnly(clientFn, 'server');
      
      if (isClient) {
        expect(clientFn).toHaveBeenCalled();
        expect(result).toBe('client');
      } else {
        expect(clientFn).not.toHaveBeenCalled();
        expect(result).toBe('server');
      }
    });

    it('serverOnly should only execute on server', () => {
      const serverFn = vi.fn(() => 'server');
      const result = serverOnly(serverFn, 'client');
      
      if (isServer) {
        expect(serverFn).toHaveBeenCalled();
        expect(result).toBe('server');
      } else {
        expect(serverFn).not.toHaveBeenCalled();
        expect(result).toBe('client');
      }
    });
  });
});
