import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { OAuthProvider } from '@/types/oauth';
import type { IOAuthDataProvider } from '@/core/oauth/IOAuthDataProvider';

export class SupabaseOAuthProvider implements IOAuthDataProvider {
  private supabase: SupabaseClient;

  constructor(private supabaseUrl: string, private supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getAuthorizationUrl(provider: OAuthProvider, state?: string): Promise<string> {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: provider as string as any,
      options: {
        queryParams: state ? { state } : undefined,
      },
    });
    if (error || !data?.url) {
      throw new Error(error?.message || 'Failed to get authorization URL');
    }
    return data.url;
  }

  async exchangeCode(
    _provider: OAuthProvider,
    code: string,
  ): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: number }> {
    const { data, error } = await this.supabase.auth.exchangeCodeForSession(code);
    if (error) {
      throw new Error(error.message);
    }
    return {
      accessToken: data.session?.access_token ?? '',
      refreshToken: data.session?.refresh_token ?? undefined,
      expiresAt: data.session?.expires_at ?? undefined,
    };
  }

  async linkProvider(
    provider: OAuthProvider,
    code: string,
  ): Promise<{
    success: boolean;
    error?: string;
    status?: number;
    user?: any;
    linkedProviders?: string[];
    collision?: boolean;
  }> {
    const { data: currentUser, error: authError } = await this.supabase.auth.getUser();
    if (authError || !currentUser?.user) {
      return { success: false, error: 'Authentication required', status: 401 };
    }

    const { error } = await this.supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return { success: false, error: error.message, status: 400 };
    }

    const { data: userData, error: userError } = await this.supabase.auth.getUser();
    if (userError || !userData?.user) {
      return { success: false, error: userError?.message || 'Failed to fetch user', status: 400 };
    }

    const linked = userData.user.identities?.map((i: any) => i.provider) ?? [];
    return { success: true, user: userData.user, linkedProviders: linked };
  }

  async disconnectProvider(
    provider: OAuthProvider,
  ): Promise<{ success: boolean; error?: string; status?: number }> {
    const { data: userData, error: authError } = await this.supabase.auth.getUser();
    if (authError || !userData?.user) {
      return { success: false, error: 'Authentication required', status: 401 };
    }

    const identity = (userData.user.identities || []).find(
      (i: any) => i.provider === provider.toLowerCase(),
    );
    if (!identity) {
      return { success: false, error: 'No linked account found for this provider.', status: 400 };
    }

    const remaining = (userData.user.identities || []).filter(
      (i: any) => i.identity_id !== identity.identity_id,
    );
    if (remaining.length === 0) {
      return {
        success: false,
        error: 'You must have at least one login method (password or another provider) before disconnecting this provider.',
        status: 400,
      };
    }

    const { error } = await this.supabase.auth.unlinkIdentity(identity);
    if (error) {
      return { success: false, error: error.message, status: 500 };
    }
    return { success: true };
  }

  async verifyProviderEmail(
    _providerId: OAuthProvider,
    email: string,
  ): Promise<{ success: boolean; error?: string; status?: number }> {
    const { data: userData, error: authError } = await this.supabase.auth.getUser();
    if (authError || !userData?.user) {
      return { success: false, error: 'Authentication required', status: 401 };
    }

    const { data: existing } = await this.supabase
      .from('account')
      .select('user_id')
      .eq('provider_email', email)
      .maybeSingle();

    if (existing && existing.user_id !== userData.user.id) {
      return { success: false, error: 'Email is already linked to another account.', status: 409 };
    }

    return { success: true };
  }
}

export default SupabaseOAuthProvider;
