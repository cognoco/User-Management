/**
 * Server-safe error factory that doesn't import React dependencies
 * Used by API routes and server-side code
 */

import { VALIDATION_ERROR_CODES, AUTH_ERROR_CODES, SERVER_ERROR_CODES, USER_ERROR_CODES } from '@/lib/api/common/error-codes';
import type { ErrorCode } from '@/lib/api/common/error-codes';

export type LanguageCode = 'en' | 'es' | 'fr';

export interface ApplicationError extends Error {
  code: ErrorCode;
  details?: Record<string, any>;
  status?: number;
  timestamp: string;
  requestId?: string;
  cause?: unknown;
}

// Simple localized messages without i18n dependencies
type MessageMap = Record<string, Record<string, string>>;
const LOCALIZED_MESSAGES: MessageMap = {
  en: {
    [AUTH_ERROR_CODES.UNAUTHORIZED]: 'Authentication required.',
    [AUTH_ERROR_CODES.FORBIDDEN]: 'Access denied.',
    [VALIDATION_ERROR_CODES.INVALID_REQUEST]: 'Validation failed.',
    [USER_ERROR_CODES.NOT_FOUND]: '{{resourceType}} {{resourceId}} not found.',
    [SERVER_ERROR_CODES.INTERNAL_ERROR]: 'Internal server error.',
  },
};

function formatTemplate(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template;
  return template.replace(/{{(\w+)}}/g, (_, key) => String(params[key] ?? ''));
}

function getLocalizedMessage(
  code: ErrorCode, 
  locale: string,
  params?: Record<string, string | number>
): string | undefined {
  // Use built-in messages only (no i18n imports)
  const base = locale.split('-')[0];
  const template =
    LOCALIZED_MESSAGES[locale]?.[code] ||
    LOCALIZED_MESSAGES[base]?.[code] ||
    LOCALIZED_MESSAGES.en[code];
  
  return template ? formatTemplate(template, params) : undefined;
}

/**
 * Create a basic ApplicationError instance.
 */
export function createError(
  code: ErrorCode,
  message: string,
  details?: Record<string, any>,
  cause?: unknown,
  httpStatus?: number,
  locale = 'en'
): ApplicationError {
  const err = new Error(message) as ApplicationError;
  err.name = 'ApplicationError';
  err.code = code;
  err.details = details;
  err.status = httpStatus;
  err.timestamp = new Date().toISOString();
  err.cause = cause;
  if (cause instanceof Error && cause.stack) {
    err.stack = `${err.stack}\nCaused by: ${cause.stack}`;
  }
  return err;
}

/**
 * Create a validation error with optional field level details.
 */
export function createValidationError(
  fieldErrors: Record<string, string>,
  message?: string,
  cause?: unknown,
  locale: LanguageCode = 'en'
) {
  let msg = message;
  if (!msg) {
    msg = getLocalizedMessage(VALIDATION_ERROR_CODES.INVALID_REQUEST, locale);
  }
  if (!msg) {
    msg = 'Validation failed.';
  }
  return createError(
    VALIDATION_ERROR_CODES.INVALID_REQUEST,
    msg,
    { fields: fieldErrors },
    cause,
    400
  );
}

/**
 * Create an authentication error.
 */
export function createAuthenticationError(
  message: string,
  cause?: unknown,
  locale: LanguageCode = 'en'
) {
  let msg = message;
  if (!msg) {
    msg = getLocalizedMessage(AUTH_ERROR_CODES.UNAUTHORIZED, locale);
  }
  if (!msg) {
    msg = 'Authentication required.';
  }
  return createError(AUTH_ERROR_CODES.UNAUTHORIZED, msg, undefined, cause, 401);
}

/**
 * Create a not found error for a given resource.
 */
export function createNotFoundError(
  resourceType: string,
  resourceId: string,
  cause?: unknown,
  locale: LanguageCode = 'en'
) {
  const code = USER_ERROR_CODES.NOT_FOUND;
  const defaultMsg = `${resourceType} ${resourceId} not found`;
  const msg = getLocalizedMessage(code, locale, { resourceType, resourceId }) || defaultMsg;
  return createError(code, msg, { resourceType, resourceId }, cause, 404);
}

/**
 * Simple error enhancement - converts unknown errors to ApplicationError format
 */
export function enhanceError(error: unknown): Error {
  // If it's already an Error, return as-is
  if (error instanceof Error) {
    return error;
  }
  
  // If it's a string, create an Error from it
  if (typeof error === 'string') {
    return new Error(error);
  }
  
  // For anything else, create a generic error
  return new Error('Unknown error occurred');
}