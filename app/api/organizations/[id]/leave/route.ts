export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareChain, errorHandlingMiddleware } from '@/middleware/createMiddlewareChain';
import { getOrganizationService } from '@/services/organization';

const middleware = createMiddlewareChain([errorHandlingMiddleware()]);

export const POST = middleware(async (req: NextRequest, auth, _data, _services, params) => {
  const orgId = params.id as string;
  const service = getOrganizationService();
  await service.leaveOrganization(orgId, auth.userId);
  return NextResponse.json({ success: true });
});
