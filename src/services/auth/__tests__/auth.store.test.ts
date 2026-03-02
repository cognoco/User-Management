import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DefaultAuthService } from '../default-auth.service';
import type { AuthStorage } from '../auth-storage';
import type { AuthDataProvider } from '@/adapters/auth/interfaces';
import type { AuthResult, LoginPayload } from '@/core/auth/models';

function createAdapter(
  overrides: Partial<AuthDataProvider> = {},
): AuthDataProvider {
  return ({
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    // getCurrentUser should resolve to null by default to mimic
    // the typical behavior of real providers when no user is
    // authenticated. This prevents tests from receiving
    // `undefined` which would cause assertions expecting `null`
    // to fail.
    getCurrentUser: vi.fn().mockResolvedValue(null),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    sendVerificationEmail: vi.fn(),
    verifyEmail: vi.fn(),
    deleteAccount: vi.fn(),
    setupMFA: vi.fn(),
    verifyMFA: vi.fn(),
    disableMFA: vi.fn(),
    refreshToken: vi.fn(),
    onAuthStateChanged: vi.fn().mockReturnValue(() => {}),
    handleSessionTimeout: vi.fn(),
    verifyPasswordResetToken: vi.fn().mockResolvedValue({ valid: false }),
    ...overrides,
  }) as AuthDataProvider;
}

describe("DefaultAuthService", () => {
  let adapter: AuthDataProvider;
  let service: DefaultAuthService;

  beforeEach(() => {
    adapter = createAdapter();
const storage: AuthStorage = {
  setItem: vi.fn(),
  getItem: vi.fn(),
  removeItem: vi.fn()
};
service = new DefaultAuthService(adapter, storage);
Object.defineProperty(global, 'localStorage', {
      value: { setItem: vi.fn(), getItem: vi.fn(), removeItem: vi.fn() },
      writable: true,
    });
  });

  it("login success sets user and token", async () => {
    const payload: LoginPayload = { email: "a@test.com", password: "pw" };
    const result: AuthResult = {
      success: true,
      user: { id: "1", email: payload.email },
      token: "tok",
    };
    (adapter.login as any).mockResolvedValue(result);

    const res = await service.login(payload);

    expect(adapter.login).toHaveBeenCalledWith(payload);
    expect(res).toEqual(result);
    await expect(service.getCurrentUser()).resolves.toEqual(result.user);
  });

  it("login failure stores error", async () => {
    const payload: LoginPayload = { email: "a@test.com", password: "bad" };
    (adapter.login as any).mockResolvedValue({ success: false, error: "fail" });

    const res = await service.login(payload);

    expect(res.success).toBe(false);
    expect(res.error).toBe("fail");
    await expect(service.getCurrentUser()).resolves.toBeNull();
  });

  it("logout calls provider and clears state", async () => {
    (adapter.logout as any).mockResolvedValue(undefined);
    (service as any).user = { id: "1", email: "a@test.com" };
    (service as any).token = "tok";

    await service.logout();

    expect(adapter.logout).toHaveBeenCalled();
    await expect(service.getCurrentUser()).resolves.toBeNull();
  });
});
