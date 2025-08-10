# ADR-001: Circular Dependency Resolution in Route Testing Architecture

## Status
Proposed

## Context

The current route testing architecture suffers from a critical circular dependency problem that makes testing and development difficult:

### Current Circular Dependency Chain
```
Route Handler → createApiHandler() → getServiceContainer() → configureServices() → getAuthServiceFactory() → getServiceContainer() [CIRCULAR!]
```

### Pain Points
1. **Testing Complexity**: Cannot mock incrementally - need to mock entire dependency graph
2. **Singleton State**: State carries between tests, causing test pollution
3. **Dynamic Import Issues**: Dynamic imports make mocking harder
4. **Circular References**: Make the entire system fragile and hard to understand

### Current Architecture Issues
- Service factories call `getServiceContainer()` which calls the same factories
- Mixed responsibilities: factories act as both creators and locators
- Global state dependencies make services hard to test in isolation
- No clear dependency injection pattern

## Decision

We will implement a **Pure Dependency Injection Container** with the following architecture:

### 1. **Dependency Injection Container**
- **Container-First Pattern**: Services created in correct dependency order
- **Pure Factory Functions**: No circular references or global state
- **Explicit Dependency Passing**: All dependencies injected explicitly
- **Lazy Initialization**: Services created only when needed

### 2. **Service Locator Pattern**
- **Type-Safe Service Resolution**: Generic-based service retrieval
- **Registry-Based Lookup**: Clean separation of registration and usage
- **Testing Support**: Easy mock service registration
- **Singleton Management**: Configurable singleton vs prototype patterns

### 3. **Migration Bridge**
- **Backward Compatibility**: Existing code continues to work
- **Incremental Migration**: Three-phase migration strategy
- **Runtime Configuration**: Switch between old/new patterns
- **Deprecation Warnings**: Clear migration path guidance

### 4. **Testing Utilities**
- **Mock Service Factory**: Type-safe mock creation
- **Test Environment Manager**: Automatic setup/teardown
- **Integration Test Support**: Mix real/mock services
- **Framework Integration**: Vitest-specific utilities

## Implementation Strategy

### Phase 1: Coexistence (Current → 2 weeks)
- New dependency injection system runs alongside existing system
- No breaking changes to existing code
- Optional opt-in to new pattern via configuration
- Full test coverage for new components

### Phase 2: Migration (2 weeks → 6 weeks) 
- Deprecation warnings for old pattern usage
- New pattern becomes default (but old pattern still works)
- Route handlers migrated to use new pattern
- Documentation and training on new patterns

### Phase 3: Cleanup (6 weeks → 8 weeks)
- Remove old circular dependency code
- Clean up deprecated APIs
- Performance optimizations
- Final testing and validation

## Architecture Components

### 1. **DependencyContainer**
```typescript
class DependencyContainer {
  getServiceContainer(): ServiceContainer
  private initializeServices(): void  // Creates services in dependency order
  private initializeProviders(): void  // Resolves data providers first
}
```

### 2. **ServiceLocator**
```typescript
class ServiceLocator {
  register<T>(key: string, implementation: T): void
  get<T>(key: string): T
  has(key: string): boolean
}
```

### 3. **Pure Factory Functions**
```typescript
export function createAuthService(deps: AuthServiceDependencies): AuthService {
  // No circular dependencies - all deps passed explicitly
}
```

### 4. **Migration Bridge**
```typescript
export function getServiceContainer(): ServiceContainer {
  // Maintains same API but uses new pattern internally
}
```

## Technical Benefits

### 1. **No Circular Dependencies**
- Services created in topological dependency order
- Pure factory functions with explicit dependencies
- No service calls `getServiceContainer()` during creation

### 2. **Easy Testing**
- Simple mock injection: `TestEnv.setupWithMocks({ auth: mockAuth })`
- Isolated testing: Mock only what you need
- No singleton state pollution between tests

### 3. **Type Safety**
- Full TypeScript support with generics
- Compile-time dependency checking
- Auto-completion for service methods

### 4. **Performance**
- Lazy service initialization
- Configurable singleton vs prototype patterns
- Optimized dependency resolution

### 5. **Maintainability**
- Clear separation of concerns
- Explicit dependency declarations
- Easy to understand service lifecycle

## Example Usage

### Before (Circular Dependencies)
```typescript
// In service factory
export function getApiAuthService(): AuthService {
  // This creates circular dependency!
  const container = getServiceContainer(); 
  return container.auth;
}
```

### After (Pure Dependency Injection)
```typescript
// Route handler
const services = configureUserManagement({
  services: { auth: mockAuthService } // Easy testing!
});

export const POST = createApiHandlerWithServices(
  schema,
  handler,
  services, // Injected explicitly - no circular deps!
  options
);

// Testing
const mockAuth = Mocks.createAuthService();
const container = TestEnv.setupWithMocks({ auth: mockAuth });
// Clean, isolated testing!
```

## Migration Example

### Phase 1: Coexistence
```typescript
// Old code continues to work
const container = getServiceContainer(); // Still works

// New code can opt-in
const newContainer = configureUserManagement(); // New pattern
```

### Phase 2: Migration
```typescript
// Old code gets warnings but still works
const container = getServiceContainer(); // DEPRECATION WARNING

// New pattern becomes default
const newContainer = configureUserManagement(); // Recommended
```

### Phase 3: Cleanup
```typescript
// Only new pattern available
const container = configureUserManagement(); // Only option
```

## Risks and Mitigations

### Risk: Breaking Changes During Migration
**Mitigation**: Three-phase migration with backward compatibility bridge

### Risk: Performance Impact
**Mitigation**: Lazy initialization and singleton caching

### Risk: Learning Curve
**Mitigation**: Comprehensive documentation and gradual migration

### Risk: Incomplete Migration
**Mitigation**: Deprecation warnings and clear migration guides

## Success Metrics

### Technical Metrics
- [ ] Zero circular dependencies in dependency graph analysis
- [ ] 100% test coverage for new dependency injection system
- [ ] <50ms service container initialization time
- [ ] Zero singleton state pollution between tests

### Developer Experience Metrics
- [ ] Test setup time reduced by >50%
- [ ] Mock service creation requires <5 lines of code
- [ ] All existing tests pass without modification in Phase 1
- [ ] Documentation coverage >90% for new patterns

### Migration Metrics
- [ ] Phase 1: New system coexists with 0 breaking changes
- [ ] Phase 2: >80% of route handlers migrated to new pattern
- [ ] Phase 3: Old circular dependency code completely removed

## Implementation Files

### Core Architecture
- `/src/lib/config/dependency-container.ts` - Main DI container
- `/src/lib/config/service-locator.ts` - Service registry pattern
- `/src/services/*/pure-factory.ts` - Pure factory functions

### Migration Support
- `/src/lib/config/migration-bridge.ts` - Backward compatibility
- `/src/lib/config/configure-user-management.ts` - Updated main config

### Testing Support
- `/src/lib/config/testing-utilities.ts` - Test helpers and mocks
- `/src/lib/api/route-helpers-v2.ts` - Updated route helpers

## References

- [Dependency Injection Patterns](https://martinfowler.com/articles/injection.html)
- [Service Locator vs Dependency Injection](https://martinfowler.com/articles/injection.html#ServiceLocatorVsDependencyInjection)
- [PUMP Architecture Guidelines](docs/architecture/pump-architecture.md)
- [Testing Patterns for Dependency Injection](docs/testing/dependency-injection-testing.md)

---

**Supersedes**: Previous ad-hoc circular dependency workarounds  
**Related**: ADR-002 (Testing Strategy), ADR-003 (Migration Timeline)