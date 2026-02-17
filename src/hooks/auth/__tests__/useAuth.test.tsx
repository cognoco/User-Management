vi.unmock('@/hooks/auth/useAuth');

import { renderHook, act } from "@testing-library/react";
import React from "react";
import { describe, it, beforeEach, expect, vi } from "vitest";
import AuthProvider from "@/lib/context/AuthContext";
import type { AuthService } from "@/core/auth/interfaces";
import type { User } from "@/core/auth/models";
import { useAuth } from "../useAuth";

let mockAuthService: AuthService & { onAuthEvent?: any };

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider authService={mockAuthService}>{children}</AuthProvider>
);

beforeEach(async () => {
  mockAuthService = {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    isAuthenticated: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    sendVerificationEmail: vi.fn(),
    verifyEmail: vi.fn(),
    deleteAccount: vi.fn(),
    setupMFA: vi.fn(),
    verifyMFA: vi.fn(),
    disableMFA: vi.fn(),
    refreshToken: vi.fn(),
    handleSessionTimeout: vi.fn(),
    onAuthStateChanged: vi.fn(),
    onAuthEvent: vi.fn(),
  } as any;

  (mockAuthService.isAuthenticated as any).mockReturnValue(false);
  (mockAuthService.getCurrentUser as any).mockResolvedValue(null);
  (mockAuthService.onAuthStateChanged as any).mockImplementation(
    () => () => {},
  );
});

describe("useAuth hook", () => {
  it("initializes with default state", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.mfaEnabled).toBe(false);
  });

  it("handles successful login", async () => {
    const user: User = {
      id: "1",
      email: "a@test.com",
      mfaEnabled: true,
    } as any;
    (mockAuthService.login as any).mockResolvedValue({
      success: true,
      user,
      token: "tok",
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login("a@test.com", "pass", true);
    });

    expect(mockAuthService.login).toHaveBeenCalledWith({
      email: "a@test.com",
      password: "pass",
      rememberMe: true,
    });
    expect(result.current.user).toEqual(user);
    expect(result.current.token).toBe("tok");
    expect(result.current.mfaEnabled).toBe(true);
    expect(result.current.success).toBe("Login successful");
    expect(result.current.error).toBeNull();
  });

  it("handles failed login", async () => {
    (mockAuthService.login as any).mockRejectedValue("bad");

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login("a@test.com", "wrong");
    });

    expect(result.current.error).toBe("Login failed");
    expect(result.current.loading).toBe(false);
  });

  it("registers a new user", async () => {
    const user: User = { id: "2", email: "new@test.com" } as any;
    (mockAuthService.register as any).mockResolvedValue({
      success: true,
      user,
      token: "tok2",
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.register({
        email: "new@test.com",
        password: "p",
        confirmPassword: "p",
        firstName: "a",
        lastName: "b",
        acceptTerms: true,
      });
    });

    expect(mockAuthService.register).toHaveBeenCalled();
    expect(result.current.user).toEqual(user);
    expect(result.current.token).toBe("tok2");
    expect(result.current.success).toBe("Registration successful");
  });

  it("resets password and handles errors", async () => {
    (mockAuthService.resetPassword as any).mockResolvedValue({
      success: true,
      message: "sent",
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.resetPassword("a@test.com");
    });
    expect(result.current.success).toBe("sent");

    (mockAuthService.resetPassword as any).mockRejectedValue("fail");
    await act(async () => {
      await result.current.resetPassword("a@test.com");
    });
    expect(result.current.error).toBe("Password reset failed");
  });

  it("updates password with failure", async () => {
    (mockAuthService.updatePassword as any).mockRejectedValue("fail");
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.updatePassword("old", "new");
    });
    expect(result.current.error).toBe("Password update failed");
  });

  it("handles MFA setup, verify and disable", async () => {
    (mockAuthService.setupMFA as any).mockResolvedValue({
      success: true,
      secret: "s",
      qrCode: "q",
      backupCodes: ["b"],
    });
    (mockAuthService.verifyMFA as any).mockResolvedValue({
      success: true,
      backupCodes: ["b2"],
      token: "t",
    });
    (mockAuthService.disableMFA as any).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.setupMFA();
    });
    expect(result.current.mfaSecret).toBe("s");
    await act(async () => {
      await result.current.verifyMFA("code");
    });
    expect(result.current.token).toBe("t");
    await act(async () => {
      await result.current.disableMFA();
    });
    expect(result.current.mfaEnabled).toBe(false);
  });

  it("refreshes token and tracks activity", async () => {
    (mockAuthService.refreshToken as any).mockResolvedValue(true);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      const ok = await result.current.refreshToken();
      expect(ok).toBe(true);
    });

    (mockAuthService.refreshToken as any).mockRejectedValue(new Error("oops"));
    await act(async () => {
      const ok = await result.current.refreshToken();
      expect(ok).toBe(false);
    });

    result.current.updateLastActivity();
    expect(localStorage.getItem("last_activity")).not.toBeNull();
  });

  it("verifies email and deletes account", async () => {
    (mockAuthService.sendVerificationEmail as any).mockResolvedValue({ success: true });
    (mockAuthService.verifyEmail as any).mockResolvedValue(undefined);
    (mockAuthService.deleteAccount as any).mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.sendVerificationEmail("a@test.com");
    });
    expect(mockAuthService.sendVerificationEmail).toHaveBeenCalledWith("a@test.com");

    await act(async () => {
      const res = await result.current.verifyEmail("token");
      expect(res.success).toBe(true);
    });
    expect(mockAuthService.verifyEmail).toHaveBeenCalledWith("token");

    await act(async () => {
      const res = await result.current.deleteAccount();
      expect(res.success).toBe(true);
    });
    expect(mockAuthService.deleteAccount).toHaveBeenCalled();
  });

  it("handles auth events", () => {
    let eventHandler: any;
    (mockAuthService.onAuthEvent as any).mockImplementation((cb: any) => {
      eventHandler = cb;
      return () => "unsub";
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    const cb = vi.fn();
    const unsub = result.current.onSessionTimeout(cb);
    eventHandler({ type: "SESSION_TIMEOUT" });
    expect(cb).toHaveBeenCalled();
    expect(typeof unsub).toBe("function");
    expect(unsub()).toBe("unsub");
  });

  it("fetches current user", async () => {
    (mockAuthService.getCurrentUser as any).mockResolvedValue({ id: "1", email: "t@test.com" });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      const user = await result.current.getCurrentUser();
      expect(user?.email).toBe("t@test.com");
    });
    expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
  });

  it("clears messages", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    // Flush initial effects (getCurrentUser resolves with null) before setting state
    await act(async () => {});
    await act(async () => {
      result.current.setUser({ id: "x", email: "e" } as any);
      result.current.setToken("a");
      result.current.clearError();
      result.current.clearSuccess();
    });
    expect(result.current.error).toBeNull();
    expect(result.current.success).toBeNull();
    expect(result.current.user).toEqual({ id: "x", email: "e" });
    expect(result.current.token).toBe("a");
  });
});
