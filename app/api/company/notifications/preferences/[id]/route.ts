import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createApiHandler } from '@/lib/api/route-helpers';
import type { AuthContext, ServiceContainer } from '@/core/config/interfaces';

const updateSchema = z.object({
  enabled: z.boolean().optional(),
  channel: z.enum(['email', 'in_app', 'both']).optional(),
});

async function handlePatch(_req: NextRequest, auth: AuthContext, data: z.infer<typeof updateSchema>, services: ServiceContainer, id: string) {
  const updated = await services.companyNotification!.updatePreference(auth.userId!, id, data);
  return NextResponse.json(updated);
}

export const PATCH = (req: NextRequest, ctx: { params: { id: string } }) =>
  createApiHandler(updateSchema, (r, a, d, s) => handlePatch(r, a, d, s, ctx.params.id), { requireAuth: true })(req);
