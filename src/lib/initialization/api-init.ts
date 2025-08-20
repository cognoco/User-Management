/**
 * API-specific initialization for service registration
 * 
 * This file handles the initialization of services needed specifically for API routes
 * without importing any client-side dependencies like React contexts.
 */

import { initializeServiceLocator } from '@/lib/config/service-locator';
import type { ServiceContainer } from '@/core/config/interfaces';

let apiInitialized = false;

/**
 * Initialize services specifically for API routes
 * This should be called by API routes before using services
 */
export function initializeApiServices(): void {
  if (apiInitialized) {
    return;
  }

  try {
    // Only initialize on the server side during API route execution
    if (typeof window === 'undefined') {
      // Import auth service factory without client dependencies
      // This will fail if the factory imports React-dependent code
      try {
        const { getApiAuthService } = require('@/services/auth/factory');
        const authService = getApiAuthService();
        
        // Create a minimal service container with required services
        const serviceContainer: Partial<ServiceContainer> = {
          auth: authService,
          // Add other API-safe services as they become available
        };

        // Initialize the service locator
        initializeServiceLocator(serviceContainer as ServiceContainer);
        if (process.env.NODE_ENV === 'development') {
          console.log('[API Init] Server-side API services initialized successfully');
        }
      } catch (factoryError) {
        console.error('[API Init] Factory import failed - likely has client dependencies:', factoryError);
        // Continue without service initialization - API routes will handle gracefully
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('[API Init] Client-side initialization not needed for API services');
      }
    }
    
    apiInitialized = true;
  } catch (error) {
    console.error('[API Init] Failed to initialize API services:', error);
    // Don't throw on initialization failure to avoid breaking API routes
  }
}

/**
 * Check if API services are initialized
 */
export function isApiServicesInitialized(): boolean {
  return apiInitialized;
}

/**
 * Reset API initialization state (for testing)
 */
export function resetApiServicesInitialization(): void {
  apiInitialized = false;
}