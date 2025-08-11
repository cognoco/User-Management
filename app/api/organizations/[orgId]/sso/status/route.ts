import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';

const putSchema = z.object({
  providerId: z.string(),
  active: z.boolean(),
});

// GET /api/organizations/[orgId]/sso/status
export const GET = withValidatedServices({
  schema: z.object({}),
  requiredServices: ['sso'],
  requireAuth: true,
  handler: async ({ params, services }) => {
    const orgId = params.orgId;
    const providers = await services.sso.getProviders(orgId);
    if (!providers.length) {
      return createSuccessResponse({
        status: 'unknown',
        lastSuccessfulLogin: null,
        lastError: null,
        totalSuccessfulLogins24h: 0,
      });
    }

    return createSuccessResponse({
      status: 'healthy',
      lastSuccessfulLogin: null,
      lastError: null,
      totalSuccessfulLogins24h: 0,
    });
  },
});

// PUT /api/organizations/[orgId]/sso/status
export const PUT = withValidatedServices({
  schema: putSchema,
  requiredServices: ['sso'],
  requireAuth: true,
  handler: async ({ params, data, services }) => {
    const orgId = params.orgId;
    
    await services.sso.setProviderActive(data.providerId, data.active);
    
    const providers = await services.sso.getProviders(orgId);
    const status = providers.length ? 'healthy' : 'unknown';
    return createSuccessResponse({
      status,
      lastSuccessfulLogin: null,
      lastError: null,
      totalSuccessfulLogins24h: 0,
    });
  },
});
