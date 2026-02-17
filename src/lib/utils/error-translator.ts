import type { ApplicationError } from './error-factory';
import { sanitizePII } from './pii';
import compliance from '../../../config/compliance.config';
import { createError, createAuthenticationError, createNotFoundError } from './error-factory';
import { SERVER_ERROR_CODES } from '@/lib/api/common/error-codes';
import type { ErrorCode } from '@/lib/api/common/error-codes';
import type { LanguageCode } from '@/lib/i18n';

export interface ErrorContext {
  requestId?: string;
  locale?: string;
}

/**
 * Translate low level database errors into application errors.
 */
export function translateDatabaseError(error: any, locale = 'en'): ApplicationError {
  if (error && typeof error === 'object') {
    if (error.code === 'P2002' || error.code === '23505') {
      return createError(
        SERVER_ERROR_CODES.DATABASE_ERROR as ErrorCode,
        getMessage('uniqueConstraint', locale),
        { causeCode: error.code },
        error,
        409
      );
    }
    if (error.code === 'ECONNREFUSED') {
      return createError(
        SERVER_ERROR_CODES.DATABASE_ERROR as ErrorCode,
        getMessage('dbConnection', locale),
        { causeCode: error.code },
        error,
        503
      );
    }
  }
  return createError(
    SERVER_ERROR_CODES.DATABASE_ERROR as ErrorCode,
    getMessage('genericDb', locale),
    undefined,
    error,
    500
  );
}

/**
 * Translate third party API errors to application errors.
 */
export function translateApiError(error: any, serviceName: string, locale: LanguageCode = 'en'): ApplicationError {
  const status = error?.response?.status;
  if (status === 401) {
    return createAuthenticationError(getMessage('auth', locale), error, locale);
  }
  if (status === 404) {
    return createNotFoundError(serviceName, error?.response?.data?.id || '', error, locale);
  }
  return createError(
    SERVER_ERROR_CODES.OPERATION_FAILED as ErrorCode,
    `${serviceName} ${getMessage('genericExternal', locale)}`,
    { status },
    error,
    status || 500
  );
}

/**
 * Enhance any error with request context and convert to ApplicationError.
 */
export function enhanceError(error: any, context: ErrorContext, locale = 'en'): ApplicationError {
  if (isApplicationError(error)) {
    error.requestId = context.requestId;
    return error;
  }
  const appError = createError(
    SERVER_ERROR_CODES.INTERNAL_ERROR as ErrorCode,
    getMessage('generic', locale),
    undefined,
    error,
    500
  );
  appError.requestId = context.requestId;
  return appError;
}

/**
 * Format error for server side logging with stack and details.
 */
export function formatErrorForLogging(error: ApplicationError) {
  return {
    code: error.code,
    message: error.message,
    stack: error.stack,
    details: sanitizePII(error.details, compliance.piiFields),
    requestId: error.requestId,
    timestamp: error.timestamp,
  };
}

/**
 * Sanitize error for client responses by removing stack traces and sensitive details.
 */
export function sanitizeErrorForClient(error: ApplicationError) {
  return {
    code: error.code,
    message: error.message,
    ...(error.requestId && { requestId: error.requestId }),
  };
}

function isApplicationError(err: any): err is ApplicationError {
  return err && typeof err === 'object' && 'code' in err && 'timestamp' in err;
}

const LOCALIZED_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    generic: 'An unexpected error occurred.',
    uniqueConstraint: 'Record already exists.',
    dbConnection: 'Database connection error.',
    genericDb: 'Database error.',
    auth: 'Authentication failed.',
    genericExternal: 'service error.',
  },
};

function getMessage(key: string, locale: string): string {
  return LOCALIZED_TRANSLATIONS[locale]?.[key] || LOCALIZED_TRANSLATIONS.en[key];
}
