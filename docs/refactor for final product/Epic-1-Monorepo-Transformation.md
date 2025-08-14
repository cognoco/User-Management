# Epic 1: Monorepo Transformation

**Duration:** 2 weeks  
**Priority:** High - Foundation for all subsequent work  
**Epic Owner:** Platform Architecture Team  
**Status:** Not Started  
**Prerequisites:** Epic 0 (Foundation Stabilization) must be complete

## Executive Summary

Monorepo Transformation converts our single Next.js application into a pnpm workspaces monorepo that supports the pluggable architecture vision. This epic creates the structural foundation for component extraction, SDK development, and multi-application deployment.

**Key Insight:** We're not changing functionality - we're changing how code is organized to enable future pluggability.

## Problem Statement

Current single-app structure blocks the pluggable platform vision:
- **No code sharing** between potential multiple applications
- **Circular dependencies** harder to manage in single codebase
- **Configuration duplication** across different deployment targets
- **Build optimization limits** with everything in one bundle
- **Package publishing impossible** - can't extract reusable libraries

## Objectives

### Primary Goal
Transform codebase structure to enable:
- Independent package development and versioning
- Shared configuration management
- Cross-package type safety
- Efficient build caching and optimization
- Clear dependency boundaries

### Secondary Goals
- Maintain 100% existing functionality
- Improve build performance through better caching
- Enable future component library extraction
- Create foundation for SDK development

## Success Criteria

### Critical Success Factors
- [ ] 📦 **Monorepo Structure**: All packages build independently
- [ ] 🔗 **Workspace Dependencies**: Cross-package imports work correctly
- [ ] ⚡ **Build Performance**: Build times improve or stay same
- [ ] 🧪 **Test Continuity**: All existing tests continue to pass  
- [ ] 🔄 **CI/CD Integration**: Pipeline updated for monorepo
- [ ] 📝 **Type Safety**: Cross-package TypeScript works

### Quality Gates
1. All workspace packages can build in isolation
2. Main application works exactly as before
3. Inter-package dependencies are properly managed
4. Development workflow is as good or better than before

## Target Monorepo Structure

```
user-management-reorganized/
├── apps/
│   ├── user-mgmt/                 # Main Next.js app (current codebase)
│   │   ├── src/                   # Current src/ moved here
│   │   ├── app/                   # Current app/ stays
│   │   └── package.json           # App-specific dependencies
│   └── example-host/              # Future: Host app integration example
│       └── package.json
├── packages/
│   ├── pump-config/               # Shared configuration
│   │   ├── tsconfig/              # TypeScript configs
│   │   ├── eslint/                # ESLint configs  
│   │   ├── vitest/                # Test configs
│   │   └── tailwind/              # Tailwind configs
│   ├── pump-types/                # Shared TypeScript types
│   │   ├── core/                  # Business domain types
│   │   ├── api/                   # API contract types
│   │   ├── ui/                    # Component types
│   │   └── config/                # Configuration types
│   ├── pump-utils/                # Shared utilities
│   │   ├── validation/            # Zod schemas
│   │   ├── formatters/            # Data formatters
│   │   ├── constants/             # Application constants
│   │   └── helpers/               # Pure utility functions
│   └── pump-testing/              # Shared test utilities
│       ├── mocks/                 # Global mock factories
│       ├── fixtures/              # Test data
│       ├── helpers/               # Test helper functions
│       └── setup/                 # Test environment setup
├── package.json                   # Root package.json with workspaces
├── pnpm-workspace.yaml           # Workspace configuration  
└── turbo.json                     # Build orchestration (optional)
```

## Detailed Task Breakdown

### Task 1.1: Workspace Infrastructure Setup
**Owner:** DevOps/Build Engineering  
**Duration:** 3 days  
**Priority:** Critical

#### Day 1: Root Configuration
```json
// Root package.json
{
  "name": "@pump/monorepo",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "build": "pnpm run --recursive build",
    "test": "pnpm run --recursive test",
    "lint": "pnpm run --recursive lint",
    "dev": "pnpm run --filter user-mgmt dev"
  },
  "devDependencies": {
    "@changesets/cli": "^2.26.0",
    "turbo": "^1.10.0"
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

#### Day 2: Package Structure Creation
```bash
# Create directory structure
mkdir -p apps/user-mgmt
mkdir -p apps/example-host
mkdir -p packages/{pump-config,pump-types,pump-utils,pump-testing}

# Initialize package.json for each workspace
# Set up basic package dependencies
```

#### Day 3: Build System Integration
```json
// turbo.json (optional but recommended)
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {}
  }
}
```

#### Acceptance Criteria
- [ ] `pnpm install` works correctly
- [ ] Workspace structure created
- [ ] Basic build orchestration working
- [ ] Package dependency resolution works

---

### Task 1.2: Configuration Package Development
**Owner:** Platform Architecture  
**Duration:** 3 days  
**Priority:** High

#### Extract Shared Configurations

**TypeScript Configuration**
```json
// packages/pump-config/tsconfig/base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{"name": "next"}],
    "baseUrl": ".",
    "paths": {
      "@pump/types": ["packages/pump-types/src"],
      "@pump/utils": ["packages/pump-utils/src"],
      "@pump/testing": ["packages/pump-testing/src"]
    }
  }
}
```

**ESLint Configuration**
```javascript
// packages/pump-config/eslint/base.js
module.exports = {
  extends: [
    "next/core-web-vitals",
    "@typescript-eslint/recommended"
  ],
  rules: {
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "warn"
  }
};
```

**Vitest Configuration**
```typescript
// packages/pump-config/vitest/base.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['@pump/testing/setup'],
    globals: true
  }
});
```

#### Acceptance Criteria
- [ ] Shared configs work across all packages
- [ ] TypeScript path mapping works
- [ ] ESLint rules applied consistently
- [ ] Test configuration shared properly

---

### Task 1.3: Type System Foundation
**Owner:** TypeScript Specialists  
**Duration:** 4 days  
**Priority:** High

#### Extract and Organize Types

**Core Business Types**
```typescript
// packages/pump-types/src/core/auth.ts
export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  profile: UserProfile | null;
  permissions: Permission[];
  roles: Role[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  bio?: string;
  avatarUrl?: string;
  isPublic: boolean;
  // ... other profile fields
}
```

**API Contract Types**
```typescript
// packages/pump-types/src/api/auth.ts
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
  session: {
    expiresAt: string;
  };
}
```

**UI Component Types**
```typescript
// packages/pump-types/src/ui/components.ts
export interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isLoading?: boolean;
  children: React.ReactNode;
}
```

**Configuration Types**
```typescript
// packages/pump-types/src/config/environment.ts
export interface EnvironmentConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiBaseUrl: string;
  enableDebugMode: boolean;
  // ... other config fields
}
```

#### Acceptance Criteria
- [ ] All major types extracted and organized
- [ ] Cross-package type imports work
- [ ] TypeScript compilation successful
- [ ] No circular type dependencies

---

### Task 1.4: Utilities Package Development
**Owner:** Development Team  
**Duration:** 3 days  
**Priority:** Medium

#### Extract Shared Utilities

**Validation Schemas**
```typescript
// packages/pump-utils/src/validation/auth.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  rememberMe: z.boolean().optional()
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*[0-9])/),
  firstName: z.string().min(1),
  lastName: z.string().min(1)
});
```

**Data Formatters**
```typescript
// packages/pump-utils/src/formatters/date.ts
export const formatDate = (date: Date, format: 'short' | 'long' = 'short'): string => {
  // Implementation
};

export const formatRelativeTime = (date: Date): string => {
  // Implementation
};
```

**Constants**
```typescript
// packages/pump-utils/src/constants/index.ts
export const API_ENDPOINTS = {
  AUTH: '/api/auth',
  USERS: '/api/users',
  ADMIN: '/api/admin'
} as const;

export const STORAGE_KEYS = {
  THEME: 'pump-theme',
  LANGUAGE: 'pump-language'
} as const;
```

#### Acceptance Criteria
- [ ] All utilities properly typed
- [ ] No external dependencies conflicts
- [ ] Tree-shaking works correctly
- [ ] Functions are pure and testable

---

### Task 1.5: Application Migration
**Owner:** Full Development Team  
**Duration:** 2 days  
**Priority:** Critical

#### Migrate Main Application

**Day 1: File Structure Migration**
```bash
# Move current application files
mv src/ apps/user-mgmt/src/
mv app/ apps/user-mgmt/app/
mv public/ apps/user-mgmt/public/

# Update package.json
# Update import paths throughout codebase
```

**Day 2: Import Path Updates**
```typescript
// Update all imports to use workspace packages
// Before:
import { User } from '@/types/auth';
import { formatDate } from '@/utils/formatters';

// After:
import { User } from '@pump/types/core/auth';
import { formatDate } from '@pump/utils/formatters';
```

#### Acceptance Criteria
- [ ] Application runs exactly as before
- [ ] All imports resolve correctly
- [ ] No functionality regressions
- [ ] Development workflow preserved

---

### Task 1.6: CI/CD Pipeline Updates
**Owner:** DevOps  
**Duration:** 1 day  
**Priority:** High

#### Update Build Pipeline

```yaml
# .github/workflows/ci.yml (example)
name: CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      - run: pnpm run build
      - run: pnpm run test
      - run: pnpm run lint
```

#### Acceptance Criteria
- [ ] CI builds all packages successfully
- [ ] Test suite runs across all packages
- [ ] Deployment pipeline updated
- [ ] Dependency caching optimized

## Package Versioning Strategy

### Changesets Integration
```json
// .changeset/config.json
{
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "linked": [],
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch"
}
```

### Version Management
- **Internal packages**: Synchronized versioning for now
- **Future external packages**: Independent versioning
- **Breaking changes**: Major version bumps
- **New features**: Minor version bumps  
- **Bug fixes**: Patch version bumps

## Dependencies and Integration

### Prerequisites from Epic 0
- Stable build system
- Working TypeScript compilation
- Functional test framework

### Enables Future Epics
- **Epic 2**: Component library extraction made possible
- **Epic 3**: tRPC client package can be created
- **Epic 4**: SDK development enabled
- **Epic 5**: Multi-app deployment supported

### Cross-package Dependencies
```
pump-types (foundation)
├── pump-utils (depends on pump-types)
├── pump-testing (depends on pump-types, pump-utils)
└── user-mgmt app (depends on all packages)
```

## Risk Assessment

### High Risk Items
1. **Import Path Complexity**
   - Risk: Breaking existing imports during migration
   - Mitigation: Automated find/replace tools, incremental migration
   - Contingency: Temporary re-export files during transition

2. **Build Performance Regression**
   - Risk: Monorepo overhead slows builds
   - Mitigation: Turbo.js for build caching, careful dependency management
   - Contingency: Optimize build pipeline, consider build tools

### Medium Risk Items
1. **Package Dependency Conflicts**
   - Risk: Version conflicts between workspace packages
   - Mitigation: Careful dependency management, peer dependencies
   - Contingency: Dependency deduplication tools

2. **TypeScript Path Resolution**
   - Risk: Complex import paths break IDE support
   - Mitigation: Well-tested tsconfig.json, clear naming conventions
   - Contingency: Simplified import patterns

## Performance Considerations

### Build Optimization
- **Parallel builds**: Turbo.js orchestration
- **Incremental compilation**: TypeScript project references
- **Dependency caching**: pnpm workspace benefits
- **Selective building**: Only changed packages

### Bundle Optimization
- **Tree shaking**: Proper ES module exports
- **Code splitting**: Package-level boundaries
- **Shared dependencies**: Efficient dependency management

## Testing Strategy

### Package-Level Testing
- Each package has its own test suite
- Shared test utilities in pump-testing package
- Cross-package integration tests

### Workspace Testing
```bash
# Test all packages
pnpm run --recursive test

# Test specific package
pnpm run --filter pump-types test

# Test with dependencies
pnpm run --filter user-mgmt --include-dependencies test
```

## Documentation Requirements

### Developer Documentation
- [ ] Workspace setup instructions
- [ ] Package development guidelines
- [ ] Import path conventions
- [ ] Build and test procedures

### Architecture Documentation
- [ ] Package dependency diagram
- [ ] Build flow documentation
- [ ] Deployment process updates
- [ ] Troubleshooting guide

## Definition of Done

### Technical Completion
- [ ] All packages build independently
- [ ] Cross-package imports work correctly
- [ ] Application functionality unchanged
- [ ] CI/CD pipeline updated and working
- [ ] Performance metrics equal or better

### Quality Assurance
- [ ] All existing tests pass
- [ ] New package structure tested
- [ ] Documentation complete and accurate
- [ ] Team training completed

### Stakeholder Acceptance
- [ ] Development workflow validated
- [ ] Build performance acceptable
- [ ] Clear path to Epic 2 demonstrated
- [ ] Risk mitigation plans in place

## Success Metrics

### Quantitative Measures
- **Build time**: Target same or better than current
- **Package count**: 4 packages initially (pump-config, pump-types, pump-utils, pump-testing)
- **Import errors**: 0 unresolved imports
- **Test coverage**: Maintain current coverage levels

### Qualitative Measures
- **Developer experience**: Easy to add new packages
- **Code organization**: Clear separation of concerns
- **Maintainability**: Reduced coupling between concerns
- **Scalability**: Foundation for future expansion

## Next Steps After Completion

1. **Epic 1 Retrospective**: Lessons learned from monorepo transformation
2. **Epic 2 Planning**: Component library extraction strategy
3. **Team Training**: Ensure all developers comfortable with new structure
4. **Performance Monitoring**: Track build and development metrics

---

**Key Success Factor: This epic is about structure, not features. Everything should work exactly the same, just organized better for future growth.**