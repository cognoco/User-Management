import { z } from 'zod';
import { withValidatedServices, schemas, WithServicesContext } from '@/src/lib/api/with-services';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';

// SAML Configuration Schema
const samlConfigSchema = z.object({
  entityId: z.string().min(1),
  ssoUrl: z.string().url(),
  nameIdFormat: z.string().default('urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'),
  x509Certificate: z.string().min(1),
});

// OIDC Configuration Schema
const oidcConfigSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  issuer: z.string().url(),
  authorizationEndpoint: z.string().url(),
  tokenEndpoint: z.string().url(),
  userInfoEndpoint: z.string().url(),
  scope: z.string().min(1).default('openid email profile'),
});

// Combined schema that validates based on idpType
const configSchema = z.union([samlConfigSchema, oidcConfigSchema]);

const getHandler = async ({ params, services }: WithServicesContext<Record<string, never>>) => {
  const orgId = params?.orgId;
  const idpType = params?.idpType;

  if (!orgId) {
    throw new ApiError(ERROR_CODES.INVALID_REQUEST, 'Organization ID is required', 400);
  }

  if (!idpType || !['saml', 'oidc'].includes(idpType)) {
    throw new ApiError(ERROR_CODES.INVALID_REQUEST, 'Invalid IDP type', 400);
  }

  const providers = await services.sso.getProviders(orgId);
  const provider = providers.find((p: any) => p.providerType === idpType);
  const config = provider?.config;

  if (!config) {
    // Return default configuration
    const defaultConfig = idpType === 'saml' ? {
      entityId: '',
      ssoUrl: '',
      nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      x509Certificate: '',
    } : {
      clientId: '',
      clientSecret: '',
      issuer: '',
      authorizationEndpoint: '',
      tokenEndpoint: '',
      userInfoEndpoint: '',
      scope: 'openid email profile',
    };
    return createSuccessResponse(defaultConfig);
  }

  return createSuccessResponse(config);
};

// GET /api/organizations/[orgId]/sso/[idpType]/config
export const GET = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['sso'],
  requireAuth: true,
  handler: getHandler
});

const putHandler = async ({ data, params, services }: WithServicesContext<z.infer<typeof configSchema>>) => {
  const orgId = params?.orgId;
  const idpType = params?.idpType;

  if (!orgId) {
    throw new ApiError(ERROR_CODES.INVALID_REQUEST, 'Organization ID is required', 400);
  }

  if (!idpType || !['saml', 'oidc'].includes(idpType)) {
    throw new ApiError(ERROR_CODES.INVALID_REQUEST, 'Invalid IDP type', 400);
  }

  try {
    const schema = idpType === 'saml' ? samlConfigSchema : oidcConfigSchema;
    const config = schema.parse(data);
    
    await services.sso.upsertProvider({
      organizationId: orgId,
      providerType: idpType as 'saml' | 'oidc',
      providerName: idpType,
      config,
    });

    return createSuccessResponse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError(
        ERROR_CODES.INVALID_REQUEST,
        'Invalid configuration',
        400,
        { errors: error.errors }
      );
    }
    throw new ApiError(ERROR_CODES.INTERNAL_ERROR, 'Internal server error', 500);
  }
};

// PUT /api/organizations/[orgId]/sso/[idpType]/config
export const PUT = withValidatedServices({
  schema: configSchema,
  requiredServices: ['sso'],
  requireAuth: true,
  handler: putHandler
}); 