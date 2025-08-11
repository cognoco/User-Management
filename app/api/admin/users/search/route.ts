import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';
import { PermissionValues } from '@/core/permission/models';

const searchQuerySchema = z.object({
  query: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: z.enum(['active', 'inactive', 'suspended', 'all']).optional(),
  role: z.string().optional(),
  dateCreatedStart: z.string().optional(),
  dateCreatedEnd: z.string().optional(),
  dateLastLoginStart: z.string().optional(),
  dateLastLoginEnd: z.string().optional(),
  sortBy: z.enum(['name', 'email', 'createdAt', 'lastLoginAt', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  teamId: z.string().optional(),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

export const GET = withValidatedServices({
  schema: searchQuerySchema,
  requiredServices: ['admin'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.ADMIN_ACCESS],
  handler: async ({ data, services }) => {
    // Apply defaults for undefined values
    const searchParams = {
      page: 1,
      limit: 10,
      status: 'all' as const,
      sortBy: 'createdAt' as const,
      sortOrder: 'desc' as const,
      ...data,
    };
    
    const result = await services.admin.searchUsers(searchParams);
    return createSuccessResponse({
      users: result.users,
      pagination: result.pagination,
    });
  }
});
