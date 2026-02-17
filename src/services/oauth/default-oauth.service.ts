import { createServerClient } from "@supabase/ssr";
import { OAuthProvider } from "@/types/oauth";
import { logUserAction } from "@/lib/audit/auditLogger";
import { ApiError, ERROR_CODES } from "@/lib/api/common";
import { PermissionValues } from "@/core/permission/models";
import { getApiPermissionService } from "@/services/permission/factory";
import { sendProviderLinkedNotification } from "@/lib/notifications/sendProviderLinkedNotification";
import { OAuthService, OAuthCallbackResult } from "@/core/oauth/interfaces";

export class DefaultOAuthService implements OAuthService {
  private async createSupabase() {
    // OAuth service only works on server side
    if (typeof window !== 'undefined') {
      throw new Error('OAuth service not available on client side');
    }
    
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options: any) => {
            cookieStore.set({ name, value, ...options });
          },
          remove: (name: string, options: any) => {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      },
    );
  }

  async handleCallback(
    provider: OAuthProvider,
    code: string,
    state?: string,
  ): Promise<OAuthCallbackResult> {
    // OAuth service only works on server side
    if (typeof window !== 'undefined') {
      throw new Error('OAuth service not available on client side');
    }
    
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const stateCookie = cookieStore.get(`oauth_state_${provider}`)?.value;
    if (!state || !stateCookie || state !== stateCookie) {
      await logUserAction({
        action: "SSO_LOGIN",
        status: "FAILURE",
        details: { error: "invalid_state" },
      });
      throw new ApiError(
        ERROR_CODES.INVALID_REQUEST,
        "Invalid or missing state parameter. Possible CSRF attack.",
        400,
      );
    }

    cookieStore.set({
      name: `oauth_state_${provider}`,
      value: "",
      maxAge: 0,
      path: "/",
    });

    const supabase = await this.createSupabase();
    const { data: currentSession, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError) {
      await logUserAction({
        action: "SSO_LOGIN",
        status: "FAILURE",
        details: { error: "session_check_failed" },
      });
      throw new ApiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to check current session.",
        500,
      );
    }
    if (currentSession?.session) {
      await logUserAction({
        action: "SSO_LOGIN",
        status: "FAILURE",
        details: { error: "already_authenticated" },
      });
      throw new ApiError(
        ERROR_CODES.INVALID_REQUEST,
        "User already authenticated. Use the account linking endpoint to link a new provider.",
        409,
      );
    }

    const { data: sessionData, error } =
      await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      await logUserAction({
        action: "SSO_LOGIN",
        status: "FAILURE",
        details: { error: error.message },
      });
      if (error.message && error.message.toLowerCase().includes("revoked")) {
        throw new ApiError(
          ERROR_CODES.INVALID_REQUEST,
          "Access to your provider account has been revoked. Please re-link your account or use another login method.",
          400,
        );
      }
      throw new ApiError(ERROR_CODES.INVALID_REQUEST, error.message, 400);
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      await logUserAction({
        action: "SSO_LOGIN",
        status: "FAILURE",
        details: { error: userError?.message || "user_fetch_failed" },
      });
      throw new ApiError(
        ERROR_CODES.INVALID_REQUEST,
        userError?.message || "Failed to fetch user data",
        400,
      );
    }

    const { prisma } = await import("@/lib/database/prisma");
    const providerAccountId = userData.user.app_metadata?.provider_id;
    const email = userData.user.email;
    if (!providerAccountId && !email) {
      await logUserAction({
        action: "SSO_LOGIN",
        status: "FAILURE",
        details: { error: "missing_identifier" },
      });
      throw new ApiError(
        ERROR_CODES.INVALID_REQUEST,
        "Provider did not return a unique identifier (email or provider user ID).",
        400,
      );
    }

    let account = null as any;
    if (providerAccountId) {
      account = await prisma.account.findUnique({
        where: {
          provider_provider_account_id: {
            provider: provider.toLowerCase(),
            provider_account_id: providerAccountId,
          },
        },
        include: { users: true },
      });
    }

    if (account) {
      if (email && account.provider_email !== email) {
        try {
          await prisma.account.update({
            where: { id: account.id },
            data: { provider_email: email },
          });
        } catch (err: any) {
          await logUserAction({
            action: "SSO_LOGIN",
            status: "FAILURE",
            details: { error: err.message },
          });
          throw new ApiError(ERROR_CODES.INTERNAL_ERROR, err.message, 500);
        }
      }

      await logUserAction({
        userId: userData.user.id,
        action: "SSO_LOGIN",
        status: "SUCCESS",
        targetResourceType: "auth",
        targetResourceId: userData.user.id,
        details: { provider, email, isNewUser: false },
      });

      if (sessionData.session) {
        await supabase.auth.setSession({
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
        });
      }

      return {
        user: account.users,
        token: sessionData.session?.access_token,
        isNewUser: false,
        info: "Logged in via linked provider account.",
      };
    }

    let emailCollision = null as any;
    if (email) {
      emailCollision = await prisma.account.findFirst({
        where: { provider_email: email },
        include: { users: true },
      });
    }
    if (emailCollision) {
      await logUserAction({
        action: "SSO_LOGIN",
        status: "FAILURE",
        details: { error: "email collision" },
      });
      throw new ApiError(
        ERROR_CODES.ALREADY_EXISTS,
        "An account with this email already exists. Please log in and link your provider from your account settings.",
        409,
        { collision: true },
      );
    }

    let newAccount;
    try {
      newAccount = await prisma.account.create({
        data: {
          user_id: userData.user.id,
          provider: provider.toLowerCase(),
          provider_account_id: providerAccountId || "",
          provider_email: email || "",
        },
        include: { users: true },
      });
    } catch (err: any) {
      await logUserAction({
        action: "SSO_LOGIN",
        status: "FAILURE",
        details: { error: err.message },
      });
      throw new ApiError(ERROR_CODES.INTERNAL_ERROR, err.message, 500);
    }

    await logUserAction({
      userId: userData.user.id,
      action: "SSO_LOGIN",
      status: "SUCCESS",
      targetResourceType: "auth",
      targetResourceId: userData.user.id,
      details: { provider, email, isNewUser: true },
    });

    if (sessionData.session) {
      await supabase.auth.setSession({
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
      });
    }

    return {
      user: newAccount.users,
      token: sessionData.session?.access_token,
      isNewUser: true,
      info: "New provider account linked and user created.",
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
    try {
      const supabase = await this.createSupabase();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        return { success: false, error: "Authentication required", status: 401 };
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        return { success: false, error: exchangeError.message, status: 400 };
      }

      const { data: providerUserData, error: providerUserError } = await supabase.auth.getUser();
      if (providerUserError || !providerUserData?.user) {
        return {
          success: false,
          error: providerUserError?.message || "Failed to fetch provider user data",
          status: 400,
        };
      }

      const providerAccountId = providerUserData.user.app_metadata?.provider_id;
      const email = providerUserData.user.email;
      if (!providerAccountId && !email) {
        return {
          success: false,
          error: "Provider did not return a unique identifier (email or provider user ID).",
          status: 400,
        };
      }

      const { data: existingAccount } = await supabase
        .from("account")
        .select("id, user_id")
        .eq("provider", provider.toLowerCase())
        .eq("provider_account_id", providerAccountId)
        .maybeSingle();
      if (existingAccount) {
        return {
          success: false,
          error: "This provider is already linked to an account.",
          status: 409,
        };
      }

      let emailCollision: { id: string; user_id: string } | null = null;
      if (email) {
        const { data } = await supabase
          .from("account")
          .select("id, user_id")
          .eq("provider_email", email)
          .maybeSingle();
        emailCollision = data;
      }

      if (emailCollision && emailCollision.user_id !== user.id) {
        return {
          success: false,
          error:
            "An account with this email already exists. Please use another provider or contact support.",
          status: 409,
          collision: true,
        };
      }

      const { error: insertError } = await supabase.from("account").insert({
        user_id: user.id,
        provider: provider.toLowerCase(),
        provider_account_id: providerAccountId || "",
        provider_email: email || "",
      });
      if (insertError) {
        return { success: false, error: insertError.message, status: 400 };
      }

      await sendProviderLinkedNotification(user.id, provider);
      try {
        await logUserAction({
          userId: user.id,
          action: "SSO_LINK",
          status: "SUCCESS",
          details: { provider },
        });
      } catch {
        // ignore logging errors
      }

      const { data: linkedAccounts } = await supabase
        .from("account")
        .select("provider")
        .eq("user_id", user.id);

      return {
        success: true,
        user,
        linkedProviders: linkedAccounts?.map((a: { provider: string }) => a.provider) ?? [],
      };
    } catch (error: any) {
      try {
        await logUserAction({
          action: "SSO_LINK",
          status: "FAILURE",
          details: { error: error.message || "Failed to link provider." },
        });
      } catch {
        /* noop */
      }
      return { success: false, error: error.message || "Failed to link provider.", status: 400 };
    }
  }

  async disconnectProvider(
    provider: OAuthProvider,
  ): Promise<{ success: boolean; error?: string; status?: number }> {
    try {
      const supabase = await this.createSupabase();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        await logUserAction({
          action: "SSO_UNLINK",
          status: "FAILURE",
          details: { provider, error: "Authentication required" },
        });
        return {
          success: false,
          error: "Authentication required",
          status: 401,
        };
      }

      const permissionService = getApiPermissionService();
      const hasPermission = await permissionService!.hasPermission(
        user.id,
        PermissionValues.MANAGE_SETTINGS,
      );
      if (!hasPermission) {
        await logUserAction({
          userId: user.id,
          action: "SSO_UNLINK",
          status: "FAILURE",
          details: { provider, error: "Insufficient permissions" },
        });
        return {
          success: false,
          error: "Insufficient permissions",
          status: 403,
        };
      }

      const { data: identityData, error: identityError } =
        await supabase.auth.getUser();
      if (identityError || !identityData?.user) {
        return {
          success: false,
          error: identityError?.message || "Failed to fetch identities",
          status: 400,
        };
      }

      const identities = identityData.user.identities ?? [];
      const identity = identities.find(
        (i) => i.provider === provider.toLowerCase(),
      );
      if (!identity) {
        await logUserAction({
          userId: user.id,
          action: "SSO_UNLINK",
          status: "FAILURE",
          details: { provider, error: "No linked account found" },
        });
        return {
          success: false,
          error: "No linked account found for this provider.",
          status: 400,
        };
      }

      const remaining = identities.filter(
        (i) => i.identity_id !== identity.identity_id,
      );
      if (remaining.length === 0) {
        await logUserAction({
          userId: user.id,
          action: "SSO_UNLINK",
          status: "FAILURE",
          details: {
            provider,
            error:
              "You must have at least one login method (password or another provider) before disconnecting this provider.",
          },
        });
        return {
          success: false,
          error:
            "You must have at least one login method (password or another provider) before disconnecting this provider.",
          status: 400,
        };
      }

      const { error: unlinkError } =
        await supabase.auth.unlinkIdentity(identity);
      if (unlinkError) {
        await logUserAction({
          userId: user.id,
          action: "SSO_UNLINK",
          status: "FAILURE",
          details: { provider, error: unlinkError.message },
        });
        return { success: false, error: unlinkError.message, status: 500 };
      }

      await logUserAction({
        userId: user.id,
        action: "SSO_UNLINK",
        status: "SUCCESS",
        details: { provider },
      });
      return { success: true };
    } catch (error: any) {
      console.error("Error in OAuth disconnect:", error);
      try {
        await logUserAction({
          action: "SSO_UNLINK",
          status: "FAILURE",
          details: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
      } catch (logError) {
        console.error("Failed to log SSO_UNLINK failure:", logError);
      }
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        status: 500,
      };
    }
  }

  async verifyProviderEmail(
    providerId: OAuthProvider,
    email: string,
  ): Promise<{ success: boolean; error?: string; status?: number }> {
    try {
      const supabase = await this.createSupabase();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        return {
          success: false,
          error: "Authentication required",
          status: 401,
        };
      }

      const { data: existing } = await supabase
        .from("account")
        .select("user_id")
        .eq("provider_email", email)
        .maybeSingle();

      if (existing && existing.user_id !== user.id) {
        return {
          success: false,
          error: "Email is already linked to another account.",
          status: 409,
        };
      }

      await sendProviderLinkedNotification(user.id, providerId);
      await logUserAction({
        userId: user.id,
        action: "SSO_LINK_VERIFY",
        status: "SUCCESS",
        details: { provider: providerId },
      });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to verify provider",
        status: 400,
      };
    }
  }
}
