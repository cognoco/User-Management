import { createError, ApplicationError } from '@/core/common/errors';
import { enhanceError, createValidationError } from '@/lib/utils/error-factory';
import { ERROR_CODES } from '@/core/common/error-codes';
import { sanitizePII } from '@/lib/utils/pii';
import compliance from '../../../config/compliance.config';
import type { ZodSchema } from 'zod';

export interface ErrorContext {
  service: string;
  method: string;
  resourceType?: string;
  resourceId?: string;
}

export function logServiceError(error: ApplicationError, context: ErrorContext) {
  const { service, method, ...rest } = context;
  const safeDetails = error.details
    ? sanitizePII({ ...error.details }, compliance.piiFields)
    : undefined;
  const msg = `[${service}.${method}] ${error.message}`;
  if (error.httpStatus >= 500) {
    console.error(msg, { code: error.code, ...rest, details: safeDetails });
  } else {
    console.warn(msg, { code: error.code, ...rest, details: safeDetails });
  }
}

export function handleServiceError<T>(
  error: unknown,
  context: ErrorContext,
  defaultErrorCode: string = ERROR_CODES.INTERNAL_ERROR,
): { success: false; error: ApplicationError } {
  const enhanced = enhanceError(error);
  const code = (enhanced as any).code || defaultErrorCode;
  const appError =
    enhanced instanceof ApplicationError
      ? enhanced
      : createError(code as any, enhanced.message, { context }, enhanced);
  logServiceError(appError, context);
  return { success: false, error: appError };
}

export function withErrorHandling<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>,
  context: ErrorContext,
) {
  return async (...args: Args): Promise<T> => {
    try {
      return await fn(...args);
    } catch (err) {
      const res = handleServiceError(err, context);
      throw res.error;
    }
  };
}

export async function safeQuery<T>(
  queryFn: () => Promise<T>,
  fallback: T,
  context: ErrorContext,
): Promise<T> {
  try {
    return await queryFn();
  } catch (err) {
    handleServiceError(err, context);
    return fallback;
  }
}

export async function validateAndExecute<T, V>(
  data: unknown,
  schema: ZodSchema<V>,
  fn: (validated: V) => Promise<T>,
  context: ErrorContext,
): Promise<T | { success: false; error: ApplicationError }> {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const err = createValidationError(parsed.error.flatten().fieldErrors as unknown as Record<string, string>);
    logServiceError(err as any, context);
    return { success: false, error: err as any };
  }
  try {
    return await fn(parsed.data);
  } catch (e) {
    return handleServiceError(e, context);
  }
}
