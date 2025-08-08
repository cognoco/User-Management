"use client";

import React, { useEffect, useState } from "react";
import {
  UserManagementProvider,
  UserManagementConfig,
  IntegrationCallbacks,
} from "./UserManagementProvider";
import { initializeCsrf } from "@/lib/api/csrf";
import { UserManagementConfiguration } from "@/core/config";
import { AuthService } from "@/core/auth/interfaces";
import { User } from "@/core/auth/models";
// Toast temporarily disabled to unblock production build; can re-enable with dynamic import
// const Toaster = dynamic(() => import('react-hot-toast').then(m => m.Toaster), { ssr: false });
// const toastPromise = import('react-hot-toast');
import { OAuthProvider } from "@/types/oauth";
import { SessionPolicyEnforcer } from "@/ui/styled/session/SessionPolicyEnforcer";
import { registerAllServices } from "@/scripts/fix-initialization";
import { AuthProvider } from '@/lib/context/AuthContext';

// Define the callbacks inside the Client Component
const clientCallbacks: Required<IntegrationCallbacks> = {
  onUserLogin: (user) => {
    console.log("Client Boundary: User logged in:", user);
  },
  onUserLogout: () => {
    console.log("Client Boundary: User logged out");
  },
  onProfileUpdate: (profile) => {
    console.log("Client Boundary: Profile updated:", profile);
  },
  onError: (error) => {
    console.error("Client Boundary: Error in user management:", error);
  },
};

// Construct the config within the Client Component
// Read necessary environment variables available client-side
const clientConfig: UserManagementConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL, // Read client-safe env var
  storageKeyPrefix: "user-mgmt", // Or read from env if needed
  callbacks: clientCallbacks,
  oauth: {
    enabled: true,
    providers: [
      {
        enabled: true,
        provider: OAuthProvider.GOOGLE,
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
        redirectUri:
          process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI ||
          (typeof window !== "undefined"
            ? window.location.origin + "/auth/callback"
            : ""),
      },
      {
        enabled: true,
        provider: OAuthProvider.APPLE,
        clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || "",
        redirectUri:
          process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI ||
          (typeof window !== "undefined"
            ? window.location.origin + "/auth/callback"
            : ""),
      },
      {
        enabled: true,
        provider: OAuthProvider.GITHUB,
        clientId: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || "",
        redirectUri:
          process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URI ||
          (typeof window !== "undefined"
            ? window.location.origin + "/auth/callback"
            : ""),
      },
    ],
    autoLink: true,
    allowUnverifiedEmails: false,
    defaultRedirectPath: "/",
  },
  // Add other config defaults from UserManagementProvider if they weren't passed from layout
  // Example: (ensure these match defaults in UserManagementProvider or pass props)
  // twoFactor: { enabled: false, methods: [], required: false },
  // subscription: { enabled: false, defaultTier: 'FREE', features: {}, enableBilling: false },
  // corporateUsers: { enabled: false, registrationEnabled: true, requireCompanyValidation: false, allowUserTypeChange: false, companyFieldsRequired: ['name'], defaultUserType: 'PRIVATE' },
};

interface UserManagementClientBoundaryProps {
  children: React.ReactNode;
}

export function UserManagementClientBoundary({
  children,
}: UserManagementClientBoundaryProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Initialize services on mount
  useEffect(() => {
    console.log(
      ">>>>>>>>>> [UserManagementClientBoundary] useEffect SERVICE INITIALIZATION RUNNING <<<<<<<<<<",
    );
    
    async function initializeServices() {
      try {
        console.log("[UserManagementClientBoundary] Initializing services...");
        await registerAllServices();
        console.log("[UserManagementClientBoundary] Services initialized successfully");
        setIsInitialized(true);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during service initialization';
        console.error("[UserManagementClientBoundary] Service initialization failed:", errorMessage);
        setInitError(errorMessage);
      }
    }

    initializeServices();
  }, []);

  // Get the auth service from the service provider registry (only after initialization)
  const authService = isInitialized ? UserManagementConfiguration.getServiceProvider<AuthService>("authService") : null;

  // Initialize CSRF token fetching on mount
  useEffect(() => {
    console.log(
      ">>>>>>>>>> [UserManagementClientBoundary] useEffect CSRF RUNNING <<<<<<<<<<",
    );
    console.log("[UserManagementClientBoundary] Initializing CSRF...");
    initializeCsrf()
      .then(() => {
        console.log(
          "[UserManagementClientBoundary] CSRF initialization successful (or already done).",
        );
      })
      .catch((error) => {
        console.error(
          "[UserManagementClientBoundary] CSRF initialization failed:",
          error,
        );
      });
  }, []);

  // Supabase auth listener temporarily disabled to unblock build; server API keeps session state
  // Re-enable once client bundle no longer pulls node-fetch

  // Show error screen if initialization failed
  if (initError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="p-6 max-w-md bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Initialization Error</h1>
          <p className="text-gray-700 mb-4">
            The application failed to initialize properly. Please try refreshing the page or contact support if the issue persists.
          </p>
          <div className="p-3 bg-red-50 rounded text-sm text-red-800 font-mono overflow-auto">
            {initError}
          </div>
        </div>
      </div>
    );
  }

  // Show loading indicator while initializing
  if (!isInitialized || !authService) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <UserManagementProvider config={clientConfig}>
      <AuthProvider authService={authService}>
        <SessionPolicyEnforcer>{children}</SessionPolicyEnforcer>
      </AuthProvider>
    </UserManagementProvider>
  );
}
