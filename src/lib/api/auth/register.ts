export interface RegistrationApiPayload {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
  userType?: string;
  metadata?: Record<string, unknown>;
}

export interface RegistrationApiResponse {
  success: boolean;
  requiresEmailConfirmation?: boolean;
  error?: string;
}

/**
 * Call the server-side registration endpoint.
 * Always POSTs JSON to /api/auth/register and returns parsed result.
 */
export async function registerUserViaApi(
  payload: RegistrationApiPayload,
): Promise<RegistrationApiResponse> {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Server error' }));
      return { success: false, error: err?.error?.message ?? 'Registration failed' };
    }

    const data = await res.json();
    return data as RegistrationApiResponse;
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}