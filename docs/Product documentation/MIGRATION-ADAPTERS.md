# Adapter Registry Migration Guide

This guide explains how to migrate from the old direct adapter instantiation to the new adapter registry system.

## Overview of Changes

The new adapter registry system introduces a more flexible way to manage different adapter implementations. Key changes include:

1. **Centralized Adapter Registry**: A single source of truth for all adapter types
2. **Factory Pattern**: Adapters are created through factories
3. **Configuration-Based**: Adapters are configured at initialization time
4. **Pluggable Architecture**: Easy to add new adapter types

## Migration Steps

### 1. Update Imports

**Before**:
```typescript
import { SupabaseAuthAdapter } from '@/adapters/auth/supabase-auth-adapter';
import { SupabaseUserAdapter } from '@/adapters/user/supabase-user-adapter';
// ... other adapter imports
```

**After**:
```typescript
import { initializeUserManagement } from '@/core/initialization/initialize-adapters';
```

### 2. Update Initialization

**Before**:
```typescript
// Create adapter instances
const authAdapter = new SupabaseAuthAdapter();
const userAdapter = new SupabaseUserAdapter();
// ... other adapters

// Create service instances
const authService = new DefaultAuthService(authAdapter);
// ... other services

// Configure the User Management Module
UserManagementConfiguration.configure({
  serviceProviders: {
    authService,
    // ... other services
  }
});
```

**After**:
```typescript
// Initialize with default Supabase adapter
const services = initializeUserManagement({
  type: 'supabase',
  options: {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  }
});

// services contains all the initialized services and adapters
const { authService, userService, teamService, permissionService } = services;
```

### 3. Using a Custom Adapter

To use a custom adapter:

1. Implement the `AdapterFactory` interface
2. Register your factory with the `AdapterRegistry`
3. Initialize with your custom adapter type

```typescript
// In your adapter's index.ts
import { AdapterRegistry } from '../registry';
import { createMyCustomAdapterFactory } from './my-custom-adapter/factory';

// Register your factory
AdapterRegistry.registerFactory('my-custom-adapter', createMyCustomAdapterFactory);

// Then in your application initialization
const services = initializeUserManagement({
  type: 'my-custom-adapter',
  options: {
    // Your custom options
  }
});
```

## Backward Compatibility

The old initialization method is still available but marked as deprecated. It has been updated to use the new system internally.

## Testing Your Migration

1. Test all authentication flows
2. Verify data access works as expected
3. Check that all services are properly initialized
4. Test with different adapter configurations

## Troubleshooting

### Adapter Not Found
If you see an error like "Adapter type 'xxx' not found", make sure:
1. The adapter factory is properly registered
2. The type name matches exactly (case-sensitive)
3. The module with the registration is imported before initialization

### Configuration Errors
If you get configuration errors:
1. Verify all required options are provided
2. Check that environment variables are set correctly
3. Validate your configuration object structure

## Next Steps

1. Consider implementing additional adapter types (GraphQL, REST, etc.)
2. Add tests for your custom adapters
3. Update documentation for your specific adapter implementations
