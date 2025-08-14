/**
 * API Response Formatter
 * 
 * Standardized response formatting for API endpoints across all domains.
 * This module provides consistent success response formatting and pagination.
 */

import { NextResponse } from 'next/server.js';
import { ApiError } from './api-error';

/**
 * Pagination metadata interface
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Success response interface
 */
export interface SuccessResponse<T> {
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    [key: string]: any;
  };
}

/**
 * Format a success response
 */
export function formatSuccess<T>(
  data: T,
  meta?: Record<string, any>
): SuccessResponse<T> {
  return {
    data,
    ...(meta && { meta }),
  };
}

/**
 * Format a paginated response
 */
export function formatPaginatedSuccess<T>(
  data: T[],
  pagination: PaginationMeta,
  additionalMeta?: Record<string, any>
): SuccessResponse<T[]> {
  return formatSuccess(data, {
    pagination,
    ...additionalMeta,
  });
}

/**
 * Create a NextResponse with the appropriate status and headers
 */
export function createApiResponse(
  body: any,
  status: number = 200,
  headers?: Record<string, string>
) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Create a success response
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
  meta?: Record<string, any>,
  headers?: Record<string, string>
) {
  const responseBody = formatSuccess(data, meta);
  return createApiResponse(responseBody, status, headers);
}

/**
 * Create a paginated success response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta,
  status: number = 200,
  additionalMeta?: Record<string, any>,
  headers?: Record<string, string>
) {
  const responseBody = formatPaginatedSuccess(data, pagination, additionalMeta);
  return createApiResponse(responseBody, status, headers);
}

/**
 * Create a created response (201)
 */
export function createCreatedResponse<T>(
  data: T,
  meta?: Record<string, any>,
  headers?: Record<string, string>
) {
  return createSuccessResponse(data, 201, meta, headers);
}

/**
 * Create an error response from an ApiError
 */
export function createErrorResponse(
  error: ApiError | Error,
  headers?: Record<string, string>
) {
  if (error instanceof ApiError) {
    return createApiResponse(error.toResponse(), error.status, headers);
  }
  
  // Convert regular Error to ApiError
  const apiError = new ApiError(
    'SERVER_GENERAL_001',
    error.message || 'An unexpected error occurred',
    500
  );
  
  return createApiResponse(apiError.toResponse(), apiError.status, headers);
}

/**
 * Create a no content response (204)
 */
export function createNoContentResponse(headers?: Record<string, string>) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...headers,
    },
  });
}
