import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';
import { triggerWebhook } from '@/lib/webhooks/triggerWebhook';
import { ssoProviderSchema } from '@/core/sso/models';

// Zod schema for SSO provider config
const SsoProviderSchema = ssoProviderSchema;

const getQuerySchema = z.object({
  organizationId: z.string().min(1),
});

// GET: List all active SSO providers for an org (orgId via query param)
const getHandler = async ({ data, services }: { data: z.infer<typeof getQuerySchema>, services: any }) => {
  const { organizationId } = data;
  try {
    const providers = await services.sso.getProviders(organizationId);
    return createSuccessResponse({ providers });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch SSO providers' },
      { status: 500 }
    );
  }
};

const postHandler = async ({ data, services }: { data: z.infer<typeof SsoProviderSchema>, services: any }) => {
  const { organizationId, providerType, providerName, config } = data;
  let provider;
  try {
    provider = await services.sso.upsertProvider({
      organizationId,
      providerType,
      providerName,
      config,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to upsert SSO provider' }, { status: 500 });
  }
  // Trigger webhook for SSO provider update
  await triggerWebhook('sso.provider.updated', {
    organizationId,
    providerType,
    providerName,
    config,
    timestamp: new Date().toISOString(),
    action: 'updated',
  });
  return NextResponse.json({ provider, success: true });
};

export const GET = withValidatedServices({
  schema: getQuerySchema,
  requiredServices: ['sso'],
  requireAuth: true,
  handler: getHandler
});

export const POST = withValidatedServices({
  schema: SsoProviderSchema,
  requiredServices: ['sso'],
  requireAuth: true,
  handler: postHandler
});
