export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareChain, errorHandlingMiddleware } from '@/middleware/createMiddlewareChain';
import { getAccountService } from '@/services/account';
import { z } from 'zod';

const middleware = createMiddlewareChain([errorHandlingMiddleware()]);

const bodySchema = z.object({ accountId: z.string() });

export const POST = middleware(async (req: NextRequest, auth) => {
  const { accountId } = bodySchema.parse(await req.json());
  const service = getAccountService();
  await service.switchAccount(auth.userId, accountId);
  return NextResponse.json({ success: true });
});
