import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AuthService } from "@/core/auth/interfaces";
import type { User } from "@/core/auth/models";

// Create a comprehensive mock AuthService that includes all required methods
const createMockAuthService = (): AuthService => ({
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
  // Additional methods that might be missing
  sendMagicLink: vi.fn(),
  verifyMagicLink: vi.fn(),
  setupTwoFactor: vi.fn(),
  verifyTwoFactor: vi.fn(),
  disableTwoFactor: vi.fn(),
  generateBackupCodes: vi.fn(),
  verifyBackupCode: vi.fn(),
  onAuthEvent: vi.fn(),
});

let mockAuthService: AuthService;

// Override the global useAuth mock from vitest.setup.ts for this test file
// This restores the real useAuth hook implementation for our tests
vi.doUnmock("@/hooks/auth/useAuth");

// Mock both the config and context to always return our mock service
vi.mock("@/core/config", () => {
  const actual = vi.importActual("@/core/config");
  return {
    ...actual,
    UserManagementConfiguration: {
      ...actual.UserManagementConfiguration,
      getServiceProvider: vi.fn(),
      configureServiceProviders: vi.fn(),
      reset: vi.fn(),
    }
  };
});

vi.mock("@/lib/context/AuthContext", () => ({
  useAuthService: vi.fn(),
}));

describe("useAuth", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    mockAuthService = createMockAuthService();
    
    // Set up default mock behaviors
    mockAuthService.getCurrentUser.mockResolvedValue(null);
    mockAuthService.isAuthenticated.mockReturnValue(false);
    mockAuthService.onAuthStateChanged.mockImplementation(() => () => {});
    mockAuthService.onAuthEvent.mockImplementation(() => () => {});
    
    // Mock both config and context to return our service
    const { UserManagementConfiguration } = await import("@/core/config");
    const { useAuthService } = await import("@/lib/context/AuthContext");
    
    vi.mocked(UserManagementConfiguration.getServiceProvider).mockReturnValue(mockAuthService);
    vi.mocked(useAuthService).mockReturnValue(mockAuthService);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("logs in successfully", async () => {
    const user: User = { id: "1", email: "test@example.com" };
    mockAuthService.login.mockResolvedValue({ success: true, user });
    
    const { useAuth } = await import("../useAuth");
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login("test@example.com", "pass");
    });

    expect(mockAuthService.login).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "pass",
      rememberMe: false,
    });
    expect(result.current.user).toEqual(user);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("handles login error", async () => {
    mockAuthService.login.mockRejectedValue(
      new Error("Invalid credentials"),
    );
    
    const { useAuth } = await import("../useAuth");
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login("test@example.com", "wrong");
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBe("Invalid credentials");
  });

  it("sends and verifies email", async () => {
    mockAuthService.sendVerificationEmail.mockResolvedValue({ success: true });
    
    const { useAuth } = await import("../useAuth");
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.sendVerificationEmail("a@test.com");
    });

    expect(mockAuthService.sendVerificationEmail).toHaveBeenCalledWith("a@test.com");

    mockAuthService.verifyEmail.mockResolvedValue();

    await act(async () => {
      const res = await result.current.verifyEmail("token");
      expect(res.success).toBe(true);
    });
    expect(mockAuthService.verifyEmail).toHaveBeenCalledWith("token");
  });
  
  it("registers user successfully", async () => {
    const user: User = { id: "1", email: "test@example.com" };
    const registrationData = {
      email: "test@example.com",
      password: "password123",
      firstName: "Test",
      lastName: "User"
    };
    mockAuthService.register.mockResolvedValue({ success: true, user });
    
    const { useAuth } = await import("../useAuth");
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.register(registrationData);
    });

    expect(mockAuthService.register).toHaveBeenCalledWith(registrationData);
    expect(result.current.user).toEqual(user);
    expect(result.current.isAuthenticated).toBe(true);
  });
  
  it("logs out user", async () => {
    mockAuthService.logout.mockResolvedValue();
    
    const { useAuth } = await import("../useAuth");
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
