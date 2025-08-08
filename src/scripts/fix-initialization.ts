/**
 * Fix Initialization Script
 * 
 * This script is designed to diagnose and fix issues with the application initialization.
 * It checks for missing or improperly registered services and ensures they are properly
 * registered with the UserManagementConfiguration.
 */

import { UserManagementConfiguration } from "@/core/config";
// Avoid importing axios into the client bundle; email/webhooks use server-side fetch or api when invoked server-side.
// Import lazily where needed.

// Import factory functions
import { createAuthService } from "@/services/auth";
import { createUserService } from "@/services/user";
import { createTeamService } from "@/services/team";
import { createPermissionService } from "@/services/permission";
import { createWebhookService } from "@/services/webhooks";

// Import adapter factories
import { createSupabaseAuthProvider } from "@/adapters/auth";
import { createSupabaseUserProvider } from "@/adapters/user";
import { createSupabaseTeamProvider } from "@/adapters/team";
import { createSupabasePermissionProvider } from "@/adapters/permission";
import { createSupabaseWebhookProvider } from "@/adapters/webhooks";

// Function to check if a service is registered
function checkServiceRegistration(serviceName: string): boolean {
  const service = UserManagementConfiguration.getServiceProvider(serviceName);
  return !!service;
}

// Function to register all services
function registerAllServices() {
  try {
    console.log("Registering all services...");

    // Get environment variables - use same pattern as working supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log("[fix-initialization] Environment variables:", {
      supabaseUrl: supabaseUrl || 'MISSING',
      supabaseKey: supabaseKey ? 'EXISTS' : 'MISSING'
    });
    
    if (!supabaseUrl || !supabaseKey) {
      const missingVars = [];
      if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
      if (!supabaseKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
      console.error("Missing required environment variables:", missingVars);
      throw new Error(`Missing Supabase environment variables: ${missingVars.join(', ')}`);
    }

    // Create data providers (adapters)
    const authProvider = createSupabaseAuthProvider(
      supabaseUrl,
      supabaseKey
    );
    
    const userProvider = createSupabaseUserProvider(
      supabaseUrl,
      supabaseKey
    );
    
    const teamProvider = createSupabaseTeamProvider(
      supabaseUrl,
      supabaseKey
    );
    
    const permissionProvider = createSupabasePermissionProvider(
      supabaseUrl,
      supabaseKey
    );
    
    const webhookProvider = createSupabaseWebhookProvider({
      supabaseUrl,
      supabaseKey
    });

    // Create services using the providers
    const authService = createAuthService({ authDataProvider: authProvider });
    const userService = createUserService({ userDataProvider: userProvider });
    const teamService = createTeamService({ teamDataProvider: teamProvider });
    const permissionService = createPermissionService({
      permissionDataProvider: permissionProvider
    });
    const webhookService = createWebhookService({
      apiClient: api,
      webhookDataProvider: webhookProvider
    });

    // Register all services
    UserManagementConfiguration.configureServiceProviders({
      authService,
      userService,
      teamService,
      permissionService,
      webhookService
    });

    // Configure feature flags
    UserManagementConfiguration.configureFeatures({
      enableRegistration: true,
      enablePasswordReset: true,
      enableMFA: true,
      enableSocialAuth: true,
      enableSSOAuth: true,
      enableProfileManagement: true,
      enableAccountSettings: true,
      enableTeams: true,
      enableTeamInvitations: true,
      enableTeamRoles: true,
      enableRoleManagement: true,
      enablePermissionManagement: true,
      enableEmailNotifications: true,
      enableInAppNotifications: true
    });

    // Configure options
    UserManagementConfiguration.configure({
      options: {
        redirects: {
          afterLogin: '/dashboard',
          afterLogout: '/',
          afterRegistration: '/auth/verify-email',
          afterPasswordReset: '/auth/login'
        }
      }
    });

    console.log("All services registered successfully");
    return {
      authService,
      userService,
      teamService,
      permissionService,
      webhookService
    };
  } catch (error) {
    console.error("Failed to register services:", error);
    throw error;
  }
}

// Function to diagnose initialization issues
function diagnoseInitializationIssues() {
  console.log("Diagnosing initialization issues...");
  
  const services = [
    "authService",
    "userService",
    "teamService",
    "permissionService",
    "webhookService"
  ];
  
  const missingServices = services.filter(service => !checkServiceRegistration(service));
  
  if (missingServices.length > 0) {
    console.log(`Missing services: ${missingServices.join(", ")}`);
    console.log("Attempting to register missing services...");
    registerAllServices();
    
    // Check again after registration
    const stillMissingServices = services.filter(service => !checkServiceRegistration(service));
    
    if (stillMissingServices.length > 0) {
      console.error(`Failed to register services: ${stillMissingServices.join(", ")}`);
      return false;
    } else {
      console.log("All services successfully registered");
      return true;
    }
  } else {
    console.log("All services are properly registered");
    return true;
  }
}

// Export the functions for use in other files
export {
  checkServiceRegistration,
  registerAllServices,
  diagnoseInitializationIssues
};

// If this script is run directly, diagnose and fix issues
if (typeof window !== 'undefined') {
  console.log("Running initialization diagnostics...");
  diagnoseInitializationIssues();
}
