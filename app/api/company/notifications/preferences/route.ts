import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';

// Validation schema for creating a new notification preference
const preferenceSchema = z.object({
  company_id: z.string().uuid('Invalid company ID format'),
  notification_type: z.enum(['new_member_domain', 'domain_verified', 'domain_verification_failed', 'security_alert']),
  enabled: z.boolean().default(true),
  channel: z.enum(['email', 'in_app', 'both']).default('both'),
});

export const GET = withValidatedServices({
  schema: z.object({}),
  requiredServices: ['companyNotification'],
  requireAuth: true,
  handler: async ({ auth, services }) => {
    const preferences = await services.companyNotification.getPreferencesForUser(auth.userId!);
    return createSuccessResponse({ preferences });
  },
});

export const POST = withValidatedServices({
  schema: preferenceSchema,
  requiredServices: ['companyNotification'],
  requireAuth: true,
  handler: async ({ auth, data, services }) => {
    const pref = await services.companyNotification.createPreference(auth.userId!, {
      companyId: data.company_id,
      notificationType: data.notification_type,
      enabled: data.enabled,
      channel: data.channel,
    });
    return createSuccessResponse(pref);
  },
});
