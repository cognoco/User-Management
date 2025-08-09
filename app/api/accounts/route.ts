export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareChain } from '@/middleware/createMiddlewareChain';
import { errorHandlingMiddleware } from '@/middleware/createMiddlewareChain';
import { getAccountService } from '@/services/account';
import { z } from 'zod';

const middleware = createMiddlewareChain([errorHandlingMiddleware()]);

export const GET = middleware(async (req: NextRequest, auth) => {
  const service = getAccountService();
  const accounts = await service.listAccounts(auth.userId);
  return NextResponse.json({ accounts });
});

const createOrgSchema = z.object({ name: z.string() });

export const POST = middleware(async (req: NextRequest, auth) => {
  const body = await req.json();
  const { name } = createOrgSchema.parse(body);
  const service = getAccountService();
  const organization = await service.createOrganization({ name, ownerId: auth.userId });
  return NextResponse.json({ organization });
});
