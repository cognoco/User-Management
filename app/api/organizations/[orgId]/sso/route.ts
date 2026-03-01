import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createApiHandler, emptySchema } from '@/lib/api/route-helpers';
import { createSuccessResponse } from '@/lib/api/common';

// Schema for SSO settings
const ssoSettingsSchema = z.object({
  sso_enabled: z.boolean(),
  idp_type: z.enum(['saml', 'oidc']).nullable(),
});

// GET /api/organizations/[orgId]/sso/settings
export async function GET(
  req: NextRequest,
  ctx: { params: { orgId: string } }
): Promise<NextResponse> {
  const handler = createApiHandler(
    emptySchema,
    async (request: NextRequest, authContext: any, data: any, services: any) => {
      const orgId = ctx.params.orgId;
      const path = request.nextUrl.pathname;

      // Handle status endpoint
      if (path.endsWith('/status')) {
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
      }

      // Handle settings endpoint
      if (path.endsWith('/settings')) {
        const providers = await services.sso.getProviders(orgId);
        if (!providers.length) {
          return createSuccessResponse({ sso_enabled: false, idp_type: null });
        }
        return createSuccessResponse({
          sso_enabled: true,
          idp_type: providers[0].providerType,
        });
      }

      // Handle metadata endpoint
      if (path.endsWith('/metadata')) {
        return createSuccessResponse({
          url: `https://app.example.com/organizations/${orgId}/sso/metadata.xml`,
          entity_id: `https://app.example.com/organizations/${orgId}`,
          xml: `<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     validUntil="2024-12-31T23:59:59Z"
                     entityID="https://app.example.com/organizations/${orgId}">
    <md:SPSSODescriptor AuthnRequestsSigned="true" WantAssertionsSigned="true"
                        protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
        <md:KeyDescriptor use="signing">
            <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
                <ds:X509Data>
                    <ds:X509Certificate>MIIC...</ds:X509Certificate>
                </ds:X509Data>
            </ds:KeyInfo>
        </md:KeyDescriptor>
        <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                               Location="https://app.example.com/organizations/${orgId}/sso/logout"/>
        <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                    Location="https://app.example.com/organizations/${orgId}/sso/acs"
                                    index="0" isDefault="true"/>
    </md:SPSSODescriptor>
</md:EntityDescriptor>`,
        });
      }

      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    },
    {
      requireAuth: true,
    }
  );
  return handler(req);
}

// PUT /api/organizations/[orgId]/sso/settings
export async function PUT(
  req: NextRequest,
  ctx: { params: { orgId: string } }
): Promise<NextResponse> {
  const handler = createApiHandler(
    ssoSettingsSchema,
    async (request: NextRequest, authContext: any, settings: z.infer<typeof ssoSettingsSchema>, services: any) => {
      const orgId = ctx.params.orgId;
      const path = request.nextUrl.pathname;

      if (path.endsWith('/settings')) {
        try {
          if (settings.sso_enabled && settings.idp_type) {
            await services.sso.upsertProvider({
              organizationId: orgId,
              providerType: settings.idp_type,
              providerName: `default-${settings.idp_type}`,
              config: {},
            });
            return createSuccessResponse(settings);
          }

          const existing = await services.sso.getProviders(orgId);
          await Promise.all(existing.map((p: any) => services.sso.deleteProvider(p.id)));

          return createSuccessResponse({ sso_enabled: false, idp_type: null });
        } catch (error) {
          return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
      }

      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    },
    {
      requireAuth: true,
    }
  );
  return handler(req);
} 