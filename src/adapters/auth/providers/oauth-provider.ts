import type { AuthDataProvider } from '../interfaces';
import { randomBytes, createHash } from "crypto";
import type {
  OAuthProviderConfig,
  OAuthUserProfile,
  OAuthProvider as ProviderId,
} from '@/types/oauth';
import type {
  AuthResult,
  LoginPayload,
  RegistrationPayload,
  MFASetupResponse,
  MFAVerifyResponse,
  User,
} from '@/core/auth/models';

/**
 * Extended authentication provider interface with OAuth specific operations.
 */
export interface OAuthDataProvider extends AuthDataProvider {
  /**
   * Register or update configuration for an OAuth provider.
   */
  configureProvider(config: OAuthProviderConfig): void;

  /**
   * Retrieve configuration for a provider if available.
   */
  getProviderConfig(provider: ProviderId): OAuthProviderConfig | undefined;

  /**
   * Build an authorization URL for the given provider.
   */
  getAuthorizationUrl(provider: ProviderId, state?: string): string;

  /**
   * Exchange an authorization code for access and refresh tokens.
   */
  exchangeCode(
    provider: ProviderId,
    code: string
  ): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: number }>;

  /**
   * Fetch the user profile from the provider using the given access token.
   */
  fetchUserProfile(provider: ProviderId, accessToken: string): Promise<OAuthUserProfile>;

  /**
   * Store arbitrary metadata about a provider.
   */
  setProviderMetadata(provider: ProviderId, metadata: Record<string, any>): void;

  /**
   * Retrieve previously stored provider metadata.
   */
  getProviderMetadata(provider: ProviderId): Record<string, any> | undefined;
}

/**
 * Basic in-memory OAuth provider implementation.
 *
 * This implementation focuses on provider configuration management and
 * token exchange logic. It does not persist any state and simply throws
 * for the standard {@link AuthDataProvider} methods which should be
 * implemented by a concrete data source.
 */
export class BasicOAuthProvider implements OAuthDataProvider {
  private configs: Map<ProviderId, OAuthProviderConfig> = new Map();
  private metadata: Map<ProviderId, Record<string, any>> = new Map();
  private codeVerifiers: Map<ProviderId, string> = new Map();

  constructor(configs: OAuthProviderConfig[] = []) {
    configs.forEach(cfg => this.configureProvider(cfg));
  }

  configureProvider(config: OAuthProviderConfig): void {
    this.configs.set(config.provider, config);
  }

  getProviderConfig(provider: ProviderId): OAuthProviderConfig | undefined {
    return this.configs.get(provider);
  }

  getAuthorizationUrl(provider: ProviderId, state?: string): string {
    const cfg = this.requireConfig(provider);
    if (!cfg.authorizationUrl) {
      throw new Error(`authorizationUrl not configured for provider ${provider}`);
    }
    const url = new URL(cfg.authorizationUrl);
    url.searchParams.set('client_id', cfg.clientId);
    url.searchParams.set('redirect_uri', cfg.redirectUri);
    url.searchParams.set('response_type', 'code');
    const verifier = this.generateCodeVerifier();
    this.codeVerifiers.set(provider, verifier);
    const challenge = this.generateCodeChallenge(verifier);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    if (cfg.scope) url.searchParams.set('scope', cfg.scope);
    if (state) url.searchParams.set('state', state);
    return url.toString();
  }

  async exchangeCode(
    provider: ProviderId,
    code: string
  ): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: number }> {
    const cfg = this.requireConfig(provider);
    if (!cfg.tokenUrl) {
      throw new Error(`tokenUrl not configured for provider ${provider}`);
    }

    const body = new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret ?? '',
      redirect_uri: cfg.redirectUri,
      grant_type: 'authorization_code',
      code,
    });
    const verifier = this.codeVerifiers.get(provider);
    if (verifier) {
      body.set('code_verifier', verifier);
      this.codeVerifiers.delete(provider);
    }

    const res = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      throw new Error(`Token exchange failed with status ${res.status}`);
    }

    const data: any = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? Date.now() + Number(data.expires_in) * 1000 : undefined,
    };
  }

  async fetchUserProfile(provider: ProviderId, accessToken: string): Promise<OAuthUserProfile> {
    const cfg = this.requireConfig(provider);
    if (!cfg.userInfoUrl) {
      throw new Error(`userInfoUrl not configured for provider ${provider}`);
    }
    const res = await fetch(cfg.userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch profile with status ${res.status}`);
    }
    const data: any = await res.json();
    return {
      id: data.id || data.sub || '',
      provider,
      email: data.email,
      name: data.name,
      firstName: data.given_name || data.first_name,
      lastName: data.family_name || data.last_name,
      displayName: data.name || data.login,
      avatar: data.picture || data.avatar_url,
      accessToken,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
      raw: data,
    };
  }

  setProviderMetadata(provider: ProviderId, metadata: Record<string, any>): void {
    this.metadata.set(provider, metadata);
  }

  getProviderMetadata(provider: ProviderId): Record<string, any> | undefined {
    return this.metadata.get(provider);
  }

  // --- AuthDataProvider methods -------------------------------------------------
  // These are stub implementations since this class focuses on OAuth handling.
  async login(_credentials: LoginPayload): Promise<AuthResult> {
    throw new Error('Method not implemented.');
  }
  async register(_userData: RegistrationPayload): Promise<AuthResult> {
    throw new Error('Method not implemented.');
  }
  async logout(): Promise<void> {
    /* no-op */
  }
  async getCurrentUser(): Promise<User | null> {
    return null;
  }
  async resetPassword(_email: string): Promise<{ success: boolean; message?: string; error?: string }> {
    return { success: false, error: 'Not implemented' };
  }
  async updatePassword(_oldPassword: string, _newPassword: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  async sendVerificationEmail(_email: string): Promise<AuthResult> {
    return { success: false, error: 'Not implemented' };
  }
  async verifyEmail(_token: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  async verifyPasswordResetToken(_token: string): Promise<{ valid: boolean; user?: User; token?: string; error?: string }> {
    return { valid: false, error: 'Not implemented' };
  }
  async updatePasswordWithToken(_token: string, _newPassword: string): Promise<AuthResult> {
    return { success: false, error: 'Not implemented' };
  }
  async invalidateSessions(_userId: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  async sendMagicLink(_email: string): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'Not implemented' };
  }
  async verifyMagicLink(_token: string): Promise<AuthResult> {
    return { success: false, error: 'Not implemented' };
  }
  async deleteAccount(_password?: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  async setupMFA(): Promise<MFASetupResponse> {
    throw new Error('Method not implemented.');
  }
  async verifyMFA(_code: string): Promise<MFAVerifyResponse> {
    throw new Error('Method not implemented.');
  }
  async disableMFA(_code: string): Promise<AuthResult> {
    return { success: false, error: 'Not implemented' };
  }

  async startWebAuthnRegistration(): Promise<MFASetupResponse> {
    return { success: false, error: 'WebAuthn registration not implemented' };
  }

  async verifyWebAuthnRegistration(_data: unknown): Promise<MFAVerifyResponse> {
    return { success: false, error: 'WebAuthn registration not implemented' };
  }
  async refreshToken(): Promise<
    { accessToken: string; refreshToken: string; expiresAt: number } | null
  > {
    return null;
  }
  onAuthStateChanged(_callback: (user: User | null) => void): () => void {
    return () => {};
  }
  handleSessionTimeout(): void {
    /* no-op */
  }
  private generateCodeVerifier(): string {
    return randomBytes(32).toString("hex");
  }

  private generateCodeChallenge(verifier: string): string {
    const hash = createHash("sha256").update(verifier).digest();
    return hash.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }


  // -----------------------------------------------------------------------------
  private requireConfig(provider: ProviderId): OAuthProviderConfig {
    const cfg = this.configs.get(provider);
    if (!cfg) {
      throw new Error(`OAuth provider ${provider} is not configured`);
    }
    return cfg;
  }
}

export default BasicOAuthProvider;
