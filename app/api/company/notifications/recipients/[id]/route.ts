import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler, emptySchema } from '@/lib/api/route-helpers';
import type { AuthContext, ServiceContainer } from '@/core/config/interfaces';

async function handleDelete(_req: NextRequest, auth: AuthContext, _data: unknown, services: ServiceContainer, id: string) {
  await services.companyNotification!.removeRecipient(auth.userId!, id);
  return NextResponse.json({ success: true, message: 'Recipient removed successfully' });
}

export const DELETE = (req: NextRequest, ctx: { params: { id: string } }) =>
  createApiHandler(emptySchema, (r, a, d, s) => handleDelete(r, a, d, s, ctx.params.id), { requireAuth: true })(req);
