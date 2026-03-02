import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createApiHandler, emptySchema } from '@/lib/api/route-helpers';
import type { AuthContext, ServiceContainer } from '@/core/config/interfaces';

// Validation schema for creating a new notification preference
const preferenceSchema = z.object({
  company_id: z.string().uuid('Invalid company ID format'),
  notification_type: z.enum(['new_member_domain', 'domain_verified', 'domain_verification_failed', 'security_alert']),
  enabled: z.boolean().default(true),
  channel: z.enum(['email', 'in_app', 'both']).default('both'),
});

async function handleGet(_req: NextRequest, auth: AuthContext, _data: unknown, services: ServiceContainer) {
  const preferences = await services.companyNotification!.getPreferencesForUser(auth.userId!);
  return NextResponse.json({ preferences });
}

async function handlePost(_req: NextRequest, auth: AuthContext, data: z.infer<typeof preferenceSchema>, services: ServiceContainer) {
  const pref = await services.companyNotification!.createPreference(auth.userId!, {
    companyId: data.company_id,
    notificationType: data.notification_type,
    enabled: data.enabled,
    channel: data.channel,
  });
  return NextResponse.json(pref);
}

export const GET = createApiHandler(emptySchema, handleGet, { requireAuth: true });
export const POST = createApiHandler(preferenceSchema, handlePost, { requireAuth: true });
