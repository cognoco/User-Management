export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareChain, errorHandlingMiddleware } from '@/middleware/createMiddlewareChain';
import { getOrganizationService } from '@/services/organization';

const middleware = createMiddlewareChain([errorHandlingMiddleware()]);

export const GET = middleware(async (req: NextRequest, auth, _data, _services, params) => {
  const orgId = params.orgId as string;
  const service = getOrganizationService();
  const members = await service.listMembers(orgId, auth.userId);
  return NextResponse.json({ members });
});
