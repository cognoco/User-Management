export interface LoginApiPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginApiResponse {
  success: boolean;
  requiresMfa?: boolean;
  error?: string;
}

export async function loginViaApi(payload: LoginApiPayload): Promise<LoginApiResponse> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err?.error?.message ?? 'Login failed' };
    }

    const data = await res.json();
    return data as LoginApiResponse;
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}