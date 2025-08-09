// Application-wide error factory and utilities
import { VALIDATION_ERROR_CODES, AUTH_ERROR_CODES, SERVER_ERROR_CODES, USER_ERROR_CODES } from '@/lib/api/common/error-codes';
import type { ErrorCode } from '@/lib/api/common/error-codes';
// Avoid importing i18n index (which initializes react-i18next) on server bundles
export type LanguageCode = 'en' | 'es' | 'fr';
import { formatErrorMessage } from '@/lib/i18n/messages';

export interface ApplicationError extends Error {
  code: ErrorCode;
  details?: Record<string, any>;
  status?: number;
  timestamp: string;
  requestId?: string;
  cause?: unknown;
}

/**
 * Lookup a localized message for the given error code and locale.
 */
/**
 * Lookup a localized message for the given error code and locale.
 */
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
  // Try first with formatErrorMessage function if available
  if (typeof formatErrorMessage === 'function') {
    const msg = formatErrorMessage(code, params || {}, locale);
    if (msg !== `errors.${code}`) {
      return msg;
    }
  }
  
  // Fall back to built-in messages
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
  /* c8 ignore next */
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
  /* c8 ignore next */
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
