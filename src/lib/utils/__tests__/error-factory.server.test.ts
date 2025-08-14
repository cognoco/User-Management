import { describe, it, expect } from 'vitest';
import { 
  createError, 
  createValidationError, 
  createAuthenticationError, 
  createNotFoundError,
  enhanceError 
} from '../error-factory.server';
import { AUTH_ERROR_CODES, VALIDATION_ERROR_CODES, USER_ERROR_CODES } from '@/lib/api/common/error-codes';

describe('Server Error Factory', () => {
  describe('createError', () => {
    it('should create an ApplicationError with all properties', () => {
      const error = createError(
        AUTH_ERROR_CODES.UNAUTHORIZED,
        'Test error',
        { field: 'value' },
        new Error('cause'),
        401
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe(AUTH_ERROR_CODES.UNAUTHORIZED);
      expect(error.details).toEqual({ field: 'value' });
      expect(error.status).toBe(401);
      expect(error.cause).toBeInstanceOf(Error);
      expect(error.timestamp).toBeDefined();
    });
  });

  describe('createValidationError', () => {
    it('should create validation error with field errors', () => {
      const fieldErrors = { email: 'Invalid email', name: 'Required' };
      const error = createValidationError(fieldErrors);

      expect(error.code).toBe(VALIDATION_ERROR_CODES.INVALID_REQUEST);
      expect(error.message).toBe('Validation failed.');
      expect(error.details).toEqual({ fields: fieldErrors });
      expect(error.status).toBe(400);
    });

    it('should use custom message when provided', () => {
      const error = createValidationError({}, 'Custom validation message');
      expect(error.message).toBe('Custom validation message');
    });
  });

  describe('createAuthenticationError', () => {
    it('should create auth error with default message', () => {
      const error = createAuthenticationError('');

      expect(error.code).toBe(AUTH_ERROR_CODES.UNAUTHORIZED);
      expect(error.message).toBe('Authentication required.');
      expect(error.status).toBe(401);
    });

    it('should use custom message when provided', () => {
      const error = createAuthenticationError('Custom auth error');
      expect(error.message).toBe('Custom auth error');
    });
  });

  describe('createNotFoundError', () => {
    it('should create not found error with resource details', () => {
      const error = createNotFoundError('User', '123');

      expect(error.code).toBe(USER_ERROR_CODES.NOT_FOUND);
      expect(error.message).toBe('User 123 not found.');
      expect(error.details).toEqual({ resourceType: 'User', resourceId: '123' });
      expect(error.status).toBe(404);
    });
  });

  describe('enhanceError', () => {
    it('should return Error instance as-is', () => {
      const originalError = new Error('test');
      const enhanced = enhanceError(originalError);
      expect(enhanced).toBe(originalError);
    });

    it('should convert string to Error', () => {
      const enhanced = enhanceError('string error');
      expect(enhanced).toBeInstanceOf(Error);
      expect(enhanced.message).toBe('string error');
    });

    it('should handle unknown error types', () => {
      const enhanced = enhanceError({ unknown: 'object' });
      expect(enhanced).toBeInstanceOf(Error);
      expect(enhanced.message).toBe('Unknown error occurred');
    });
  });
});