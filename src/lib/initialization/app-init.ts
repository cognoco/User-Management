/**
 * Application initialization for service registration
 * 
 * This file handles the initialization of all services needed for API routes
 * and other server-side operations. It must be called before any API routes
 * attempt to use services.
 */

import { initializeServiceLocator } from '@/lib/config/service-locator';
import type { ServiceContainer } from '@/core/config/interfaces';

let initialized = false;

/**
 * Initialize services for the application
 * This should be called once during application startup
 */
export function initializeAppServices(): void {
  if (initialized) {
    return;
  }

  try {
    // Only initialize minimal services on the server side for API routes
    // Avoid importing any client-side dependencies like React contexts
    if (typeof window === 'undefined') {
      // Server-side: Skip service initialization during page rendering
      // Services will be initialized on-demand in API routes only
      console.log('[App Init] Server-side page rendering - skipping service initialization');
    } else {
      console.log('[App Init] Client-side initialization skipped (handled by UserManagementClientBoundary)');
    }
    
    initialized = true;
  } catch (error) {
    console.error('[App Init] Failed to initialize services:', error);
    // Don't throw on initialization failure to avoid breaking page renders
    // API routes will handle service registration errors gracefully
  }
}

/**
 * Check if services are initialized
 */
export function isServicesInitialized(): boolean {
  return initialized;
}

/**
 * Reset initialization state (for testing)
 */
export function resetServicesInitialization(): void {
  initialized = false;
}