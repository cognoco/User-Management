import { NextRequest, NextResponse } from 'next/server';
import { getApiCompanyService } from '@/services/company/factory';
import { getApiPermissionService } from '@/services/permission/factory';
import { getCompanyExportData } from '@/lib/exports/company-export.service';
import { logUserAction } from '@/lib/audit/auditLogger';
import {
  createMiddlewareChain,
  errorHandlingMiddleware,
  routeAuthMiddleware,
  rateLimitMiddleware,
  type RouteAuthContext,
} from '@/middleware/createMiddlewareChain';
import { withSecurity } from '@/middleware/with-security';


async function handleGet(req: NextRequest, auth: RouteAuthContext) {
  const user = auth.user;
  if (!user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Fetch user's company and check admin role
  const companyService = getApiCompanyService();
  const companyProfile = await companyService.getProfileByUserId(user.id);
  if (!companyProfile) {
    // Log failed export attempt
    await logUserAction({
      userId: user?.id,
      action: 'COMPANY_DATA_EXPORT',
      status: 'FAILURE',
      ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
      userAgent: req.headers.get('user-agent'),
      targetResourceType: 'company',
      targetResourceId: undefined,
      details: { error: 'Not a company member or error fetching membership.' }
    });
    return new NextResponse(JSON.stringify({ error: 'Not a company member or error fetching membership.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const permissionService = getApiPermissionService();
  const isAdmin = await permissionService.hasRole(user.id, 'ADMIN');
  if (!isAdmin) {
    // Log forbidden export attempt
    await logUserAction({
      userId: user.id,
      action: 'COMPANY_DATA_EXPORT',
      status: 'FAILURE',
      ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
      userAgent: req.headers.get('user-agent'),
      targetResourceType: 'company',
      targetResourceId: companyProfile.id,
      details: { error: 'Forbidden: Admin access required.' }
    });
    return new NextResponse(JSON.stringify({ error: 'Forbidden: Admin access required.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const exportData = await getCompanyExportData(companyProfile.id);
  if ('error' in exportData) {
    // Log failed export
    await logUserAction({
      userId: user.id,
      action: 'COMPANY_DATA_EXPORT',
      status: 'FAILURE',
      ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
      userAgent: req.headers.get('user-agent'),
      targetResourceType: 'company',
      targetResourceId: companyProfile.id,
      details: { error: exportData.error }
    });
    return new NextResponse(JSON.stringify({ error: 'Failed to export company data', details: exportData.error }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const filename = `Company_Data_Export_${companyProfile.id}_${new Date().toISOString().slice(0,10)}.json`;
  const json = JSON.stringify(exportData, null, 2);

  // Log successful export
  await logUserAction({
    userId: user.id,
    action: 'COMPANY_DATA_EXPORT',
    status: 'SUCCESS',
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
    userAgent: req.headers.get('user-agent'),
    targetResourceType: 'company',
    targetResourceId: companyProfile.id,
    details: { filename }
  });

  return new NextResponse(json, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

const getMiddleware = createMiddlewareChain([
  rateLimitMiddleware(),
  errorHandlingMiddleware(),
  routeAuthMiddleware({ includeUser: true }),
]);

export const GET = (req: NextRequest) =>
  withSecurity((r) => getMiddleware((rr, auth) => handleGet(rr, auth))(r))(req);
