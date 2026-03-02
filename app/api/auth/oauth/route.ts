import { cookies } from 'next/headers';
import { z } from 'zod';
import { OAuthProvider, oauthProviderConfigSchema } from '@/types/oauth';
import { createApiHandler } from '@/lib/api/route-helpers';
import {
  createSuccessResponse,
  ApiError,
  ERROR_CODES
} from '@/lib/api/common';
import { logUserAction } from '@/lib/audit/auditLogger';

// Request schema
const initiationRequestSchema = z.object({
  provider: z.nativeEnum(OAuthProvider),
});

// Helper to generate random state
function generateState(length = 32) {
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Supabase already handles PKCE internally when using signInWithOAuth

// Example: provider config source (replace with actual config source as needed)
const providerConfigs: Record<OAuthProvider, z.infer<typeof oauthProviderConfigSchema>> = {
  [OAuthProvider.GOOGLE]: {
    provider: OAuthProvider.GOOGLE,
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
    redirectUri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!,
    scope: 'profile email',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    enabled: true,
  },
  [OAuthProvider.GITHUB]: {
    provider: OAuthProvider.GITHUB,
    clientId: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID!,
    redirectUri: process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URI!,
    scope: 'user:email',
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    enabled: true,
  },
  // Add other providers as needed
  [OAuthProvider.FACEBOOK]: {
    provider: OAuthProvider.FACEBOOK,
    clientId: '',
    redirectUri: '',
    scope: '',
    authorizationUrl: '',
    enabled: false,
  },
  [OAuthProvider.TWITTER]: {
    provider: OAuthProvider.TWITTER,
    clientId: '',
    redirectUri: '',
    scope: '',
    authorizationUrl: '',
    enabled: false,
  },
  [OAuthProvider.MICROSOFT]: {
    provider: OAuthProvider.MICROSOFT,
    clientId: '',
    redirectUri: '',
    scope: '',
    authorizationUrl: '',
    enabled: false,
  },
  [OAuthProvider.APPLE]: {
    provider: OAuthProvider.APPLE,
    clientId: '',
    redirectUri: '',
    scope: '',
    authorizationUrl: '',
    enabled: false,
  },
  [OAuthProvider.LINKEDIN]: {
    provider: OAuthProvider.LINKEDIN,
    clientId: '',
    redirectUri: '',
    scope: '',
    authorizationUrl: '',
    enabled: false,
  },
};

const redirectAllowList: Record<OAuthProvider, string[]> = {
  [OAuthProvider.GOOGLE]: [process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!],
  [OAuthProvider.GITHUB]: [process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URI!],
  [OAuthProvider.FACEBOOK]: [],
  [OAuthProvider.TWITTER]: [],
  [OAuthProvider.MICROSOFT]: [],
  [OAuthProvider.APPLE]: [],
  [OAuthProvider.LINKEDIN]: [],
};

export const POST = createApiHandler(
  initiationRequestSchema,
  async (request, _authContext, data, services) => {
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const config = providerConfigs[data.provider];
    if (!config || !config.enabled) {
      await logUserAction({
        action: 'OAUTH_INIT',
        status: 'FAILURE',
        ipAddress,
        userAgent,
        targetResourceType: 'oauth',
        details: { provider: data.provider, error: 'not_enabled' }
      });
      throw new ApiError(
        ERROR_CODES.INVALID_REQUEST,
        'Provider not supported or not enabled.',
        400
      );
    }

    if (!redirectAllowList[data.provider].includes(config.redirectUri)) {
      await logUserAction({
        action: 'OAUTH_INIT',
        status: 'FAILURE',
        ipAddress,
        userAgent,
        targetResourceType: 'oauth',
        details: { provider: data.provider, error: 'redirect_not_allowed' }
      });
      throw new ApiError(
        ERROR_CODES.INVALID_REQUEST,
        'Redirect URI not allowed',
        400
      );
    }

    const state = generateState();
    const cookieStore = await cookies();
    cookieStore.set({
      name: `oauth_state_${data.provider}`,
      value: state,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 600,
      path: '/'
    });

    services.auth.configureOAuthProvider(config);
    const url = services.auth.getOAuthAuthorizationUrl(data.provider, state);

    await logUserAction({
      action: 'OAUTH_INIT',
      status: 'SUCCESS',
      ipAddress,
      userAgent,
      targetResourceType: 'oauth',
      details: { provider: data.provider }
    });

    return createSuccessResponse({ url, state });
  },
  {
    requireAuth: false,
    rateLimit: { windowMs: 15 * 60 * 1000, max: 30 }
  }
);
