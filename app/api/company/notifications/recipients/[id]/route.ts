import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler, emptySchema } from '@/lib/api/route-helpers';
import type { AuthContext, ServiceContainer } from '@/core/config/interfaces';

async function handleDelete(_req: NextRequest, auth: AuthContext, _data: unknown, services: ServiceContainer, id: string) {
  await services.companyNotification!.removeRecipient(auth.userId!, id);
  return NextResponse.json({ success: true, message: 'Recipient removed successfully' });
}

export const DELETE = async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  return createApiHandler(emptySchema, (r, a, d, s) => handleDelete(r, a, d, s, id), { requireAuth: true })(req);
};
