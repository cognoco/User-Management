import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { logUserAction } from '@/lib/audit/auditLogger';

const exportQuerySchema = z.object({
  format: z.enum(['csv', 'json']).optional(),
  query: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended', 'all']).optional(),
  role: z.string().optional(),
  dateCreatedStart: z.string().optional(),
  dateCreatedEnd: z.string().optional(),
  dateLastLoginStart: z.string().optional(),
  dateLastLoginEnd: z.string().optional(),
  teamId: z.string().optional(),
});

export const GET = withValidatedServices({
  schema: exportQuerySchema,
  requiredServices: ['admin'],
  requireAuth: true,
  requiredPermissions: ['admin.users.export'],
  handler: async ({ data, services }) => {
    const { format = 'csv', ...searchParams } = data;
    const result = await services.admin.searchUsers({ ...searchParams, limit: 10000, page: 1 });
    
    await logUserAction({
      action: 'USERS_EXPORT',
      status: 'SUCCESS',
      targetResourceType: 'user',
      details: {
        format,
        userCount: result.users.length,
        searchParams,
      },
    });
    
    if (format === 'json') {
      return new NextResponse(JSON.stringify(result.users, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="users-export-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    } else {
      const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Status', 'Role', 'Created At', 'Last Login At'];
      const rows = result.users.map((u: any) => [u.id, u.firstName, u.lastName, u.email, u.status, u.role, u.createdAt, u.lastLoginAt || '']);
      const csv = [headers.join(','), ...rows.map((row: any[]) => row.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="users-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }
  }
});
