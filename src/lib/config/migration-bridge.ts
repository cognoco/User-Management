/**
 * Migration Bridge for Circular Dependency Solution
 * 
 * This module provides backward compatibility during the migration from the
 * circular dependency pattern to the new pure dependency injection pattern.
 * 
 * Migration phases:
 * 1. Phase 1: Both old and new patterns coexist
 * 2. Phase 2: New patterns preferred, old patterns deprecated
 * 3. Phase 3: Old patterns removed, only new patterns remain
 * 
 * This bridge allows incremental migration without breaking existing code.
 */

import type { ServiceContainer } from '@/core/config/interfaces';
import { DependencyContainer } from './dependency-container';
import { ServiceLocator, initializeServiceLocator } from './service-locator';
import { AdapterRegistry } from '@/adapters/registry';

/**
 * Migration configuration
 */
export interface MigrationConfig {
  /** Current migration phase */
  phase: 'phase1' | 'phase2' | 'phase3';
  
  /** Whether to log migration warnings */
  enableWarnings?: boolean;
  
  /** Service overrides for testing */
  serviceOverrides?: Partial<ServiceContainer>;
  
  /** Whether to use new dependency injection pattern */
  useNewPattern?: boolean;
}

/**
 * Global migration state
 */
let migrationConfig: MigrationConfig = {
  phase: 'phase1',
  enableWarnings: true,
  useNewPattern: false,
};

/**
 * Singleton instances for backward compatibility
 */
let legacyServiceContainer: ServiceContainer | null = null;
let newDependencyContainer: DependencyContainer | null = null;

/**
 * Configure the migration settings
 */
export function configureMigration(config: Partial<MigrationConfig>): void {
  migrationConfig = { ...migrationConfig, ...config };
  
  // Reset containers when config changes
  legacyServiceContainer = null;
  newDependencyContainer = null;
}

/**
 * Backward-compatible getServiceContainer that works during migration
 * 
 * This function maintains the same API as the original but uses the new
 * dependency injection pattern under the hood when enabled.
 */
export function getServiceContainer(overrides?: Partial<ServiceContainer>): ServiceContainer {
  // Phase 3: Only new pattern allowed
  if (migrationConfig.phase === 'phase3') {
    return getNewServiceContainer(overrides);
  }
  
  // Phase 2: Prefer new pattern with deprecation warning
  if (migrationConfig.phase === 'phase2') {
    if (migrationConfig.enableWarnings) {
      console.warn(
        'DEPRECATION WARNING: getServiceContainer() is deprecated. Use DependencyContainer or ServiceLocator instead. ' +
        'This will be removed in the next version.'
      );
    }
    
    if (migrationConfig.useNewPattern) {
      return getNewServiceContainer(overrides);
    }
  }
  
  // Phase 1: Use legacy pattern by default, new pattern optional
  if (migrationConfig.useNewPattern) {
    return getNewServiceContainer(overrides);
  }
  
  return getLegacyServiceContainer(overrides);
}

/**
 * Get service container using new dependency injection pattern
 */
function getNewServiceContainer(overrides?: Partial<ServiceContainer>): ServiceContainer {
  if (!newDependencyContainer) {
    newDependencyContainer = new DependencyContainer({
      services: migrationConfig.serviceOverrides,
    });
  }
  
  const container = newDependencyContainer.getServiceContainer();
  
  // Apply any runtime overrides
  if (overrides) {
    return { ...container, ...overrides };
  }
  
  // Initialize service locator for compatibility
  initializeServiceLocator(container);
  
  return container;
}

/**
 * Get service container using legacy pattern (with circular deps fixed)
 * 
 * This version maintains backward compatibility but fixes the circular
 * dependency by using the new pattern internally.
 */
function getLegacyServiceContainer(overrides?: Partial<ServiceContainer>): ServiceContainer {
  if (!legacyServiceContainer) {
    // Import the legacy configure function but use it safely
    const { configureUserManagement } = require('@/lib/config/configure-user-management');
    
    // Use new pattern internally to avoid circular deps
    legacyServiceContainer = configureUserManagement({
      services: migrationConfig.serviceOverrides,
    });
  }
  
  if (overrides) {
    return { ...legacyServiceContainer, ...overrides };
  }
  
  return legacyServiceContainer;
}

/**
 * Migration helper: Update existing service factories to use new pattern
 */
export function createMigrationCompatibleFactory<T>(
  legacyFactory: () => T,
  newFactory: () => T,
  serviceName: string
): () => T {
  return () => {
    if (migrationConfig.phase === 'phase3') {
      return newFactory();
    }
    
    if (migrationConfig.phase === 'phase2' && migrationConfig.enableWarnings) {
      console.warn(`DEPRECATION WARNING: Legacy ${serviceName} factory is deprecated`);
    }
    
    if (migrationConfig.useNewPattern) {
      return newFactory();
    }
    
    return legacyFactory();
  };
}

/**
 * Reset all cached instances (useful for testing)
 */
export function resetMigrationState(): void {
  legacyServiceContainer = null;
  newDependencyContainer = null;
  ServiceLocator.getInstance().clear();
}

/**
 * Migration utilities for updating existing route handlers
 */
export class MigrationUtils {
  /**
   * Update a route handler to use the new pattern gradually
   */
  static updateRouteHandlerServices<T>(
    routeHandler: (container: ServiceContainer) => T
  ): (container?: ServiceContainer) => T {
    return (providedContainer?: ServiceContainer) => {
      // Use provided container or get from migration-aware getter
      const container = providedContainer || getServiceContainer();
      return routeHandler(container);
    };
  }
  
  /**
   * Create a service factory that works in both old and new patterns
   */
  static createCompatibleServiceFactory<T>(
    serviceKey: string,
    createNew: () => T,
    createLegacy?: () => T
  ): () => T {
    return () => {
      if (migrationConfig.useNewPattern) {
        return createNew();
      }
      
      if (createLegacy) {
        return createLegacy();
      }
      
      // Fallback to service locator
      try {
        const locator = ServiceLocator.getInstance();
        return locator.get<T>(serviceKey);
      } catch {
        // Final fallback to new pattern
        return createNew();
      }
    };
  }
}

/**
 * Testing utilities for migration
 */
export class MigrationTestUtils {
  /**
   * Set up test environment with new pattern
   */
  static setupNewPatternTest(
    mockServices: Partial<ServiceContainer> = {}
  ): void {
    configureMigration({
      phase: 'phase3',
      useNewPattern: true,
      serviceOverrides: mockServices,
      enableWarnings: false,
    });
  }
  
  /**
   * Set up test environment with legacy compatibility
   */
  static setupLegacyCompatibilityTest(
    mockServices: Partial<ServiceContainer> = {}
  ): void {
    configureMigration({
      phase: 'phase1',
      useNewPattern: false,
      serviceOverrides: mockServices,
      enableWarnings: false,
    });
  }
  
  /**
   * Clean up test environment
   */
  static cleanup(): void {
    resetMigrationState();
    configureMigration({
      phase: 'phase1',
      useNewPattern: false,
      enableWarnings: true,
    });
  }
}