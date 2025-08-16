# Epic 1: Monorepo Transformation (UPDATED)

**Duration:** 2 weeks  
**Priority:** HIGH - Foundation for all subsequent work  
**Epic Owner:** Platform Architecture Team  
**Status:** Ready to Start  
**Prerequisites:** Epic 0 (Foundation Stabilization) must be complete  
**Last Updated:** 2025-08-16

## Executive Summary

Monorepo Transformation remains critical but has been refined based on our analysis. The existing service/adapter architecture is excellent and must be preserved during the transformation. We'll focus on extracting packages while maintaining all working functionality.

## Updated Problem Statement

Current implementation strengths and gaps:
- **✅ Excellent service/adapter pattern** already in place
- **✅ Clean separation of concerns** between layers
- **❌ Single Next.js app** prevents package publishing
- **❌ Cannot share code** between multiple applications
- **❌ No independent versioning** of components
- **❌ Build optimization limited** to single bundle

## Refined Scope

### What We'll Transform
```
Current Structure:          Target Structure:
/src/                  →    /apps/user-mgmt/src/
  /services/           →    /packages/@pump/services/
  /adapters/           →    /packages/@pump/adapters/
  /ui/headless/        →    /packages/@pump/ui-headless/
  /ui/primitives/      →    /packages/@pump/ui-primitives/
  /ui/styled/          →    /packages/@pump/ui-styled/
  /core/               →    /packages/@pump/core/
```

### What We'll Preserve
- **All service implementations** (working perfectly)
- **All adapter implementations** (well-architected)
- **Database schema** (no changes)
- **API routes** (temporarily, until tRPC migration)
- **Authentication flows** (critical functionality)

## Detailed Task Breakdown

### Week 1: Package Extraction

#### Day 1-2: Monorepo Setup
```bash
# Initialize pnpm workspace
pnpm init
cat > pnpm-workspace.yaml << EOF
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# Create package structure
mkdir -p packages/@pump/{core,services,adapters,ui-headless,ui-primitives,ui-styled}
```

#### Day 3-4: Core Package Extraction
**Move with git history preservation:**
```bash
# Extract core types and interfaces
git filter-branch --subdirectory-filter src/core -- --all
git remote add core ../packages/@pump/core
git push core main

# Update imports across codebase
find . -type f -name "*.ts" -exec sed -i 's|@/core|@pump/core|g' {} \;
```

#### Day 5: Service Layer Extraction
**Critical: Preserve all 30+ services:**
- `/services/auth/` → `@pump/services/auth`
- `/services/team/` → `@pump/services/team`
- `/services/permission/` → `@pump/services/permission`
- `/services/subscription/` → `@pump/services/subscription`
- All other services maintain structure

### Week 2: Integration and Testing

#### Day 6-7: Adapter Extraction
**Preserve adapter pattern:**
```typescript
// packages/@pump/adapters/package.json
{
  "name": "@pump/adapters",
  "exports": {
    "./auth": "./auth/index.ts",
    "./database": "./database/index.ts",
    "./storage": "./storage/index.ts",
    "./supabase": "./supabase/index.ts"
  }
}
```

#### Day 8-9: UI Component Packages
**Three-tier UI architecture:**
1. `@pump/ui-headless` - Logic only (85 components)
2. `@pump/ui-primitives` - Basic styled (42 components)
3. `@pump/ui-styled` - Full featured (63 components)

#### Day 10: Cross-Package Validation
- Run all existing tests
- Verify build process
- Check import resolution
- Validate type checking

## Package Dependencies

### Dependency Graph
```mermaid
graph TD
    A[apps/user-mgmt] --> B[@pump/services]
    A --> C[@pump/ui-styled]
    B --> D[@pump/adapters]
    B --> E[@pump/core]
    C --> F[@pump/ui-headless]
    C --> G[@pump/ui-primitives]
    D --> E
    F --> E
    G --> E
```

### Version Strategy
- Core packages: `1.0.0` (stable interfaces)
- Service packages: `0.9.0` (nearly complete)
- UI packages: `0.8.0` (pending tRPC updates)
- Adapter packages: `1.0.0` (stable contracts)

## Migration Strategy

### Phase 1: Non-Breaking Extraction (Week 1)
1. Create packages with identical exports
2. Update imports via codemod
3. Maintain backward compatibility
4. No functionality changes

### Phase 2: Optimization (Week 2)
1. Implement package-level builds
2. Add package-specific tests
3. Optimize bundle sizes
4. Enable tree-shaking

## Updated Success Criteria

### Must Have (Week 2)
- [ ] All packages build independently
- [ ] Zero functionality regression
- [ ] All tests passing (including E2E)
- [ ] Type safety maintained across packages
- [ ] CI/CD pipeline updated

### Should Have
- [ ] Package documentation generated
- [ ] Dependency graph visualization
- [ ] Bundle size reduction >20%
- [ ] Build time improvement >30%

### Could Have
- [ ] Published to private npm registry
- [ ] Storybook for UI packages
- [ ] Package-level changelog

## Risk Mitigation

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Import path breaking | HIGH | Automated codemod scripts |
| Circular dependencies | MEDIUM | Dependency graph analysis |
| Type resolution issues | MEDIUM | Centralized tsconfig |
| Build complexity | LOW | Incremental migration |

### Process Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Service disruption | HIGH | Feature flags for rollback |
| Team confusion | MEDIUM | Clear documentation and training |
| CI/CD complexity | LOW | Gradual pipeline updates |

## Tooling Requirements

### Build Tools
```json
{
  "devDependencies": {
    "@changesets/cli": "^2.27.0",
    "turbo": "^1.11.0",
    "tsup": "^8.0.0",
    "@manypkg/cli": "^0.21.0"
  }
}
```

### Scripts
```json
{
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev --parallel",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "changeset": "changeset",
    "version": "changeset version",
    "publish": "turbo run build && changeset publish"
  }
}
```

## Files to Update

### Critical Configuration Files
1. `package.json` (root) - Workspace configuration
2. `pnpm-workspace.yaml` - Package locations
3. `turbo.json` - Build orchestration
4. `tsconfig.json` (root) - Path mappings
5. `.changeset/config.json` - Version management

### Import Updates Required
- 3,247 import statements need updating
- Use codemod for automation
- Verify with TypeScript compiler

## Definition of Done

### Package Extraction Complete When:
- [ ] Each package has its own package.json
- [ ] All packages have README.md
- [ ] Cross-package imports work
- [ ] Individual package builds succeed
- [ ] Package tests run independently
- [ ] No regression in functionality
- [ ] Documentation updated

## Next Steps

Upon completion:
1. **Epic 3**: Complete missing features (can start immediately)
2. **Epic 4**: tRPC migration (depends on monorepo)
3. **Epic 5**: SDK extraction (depends on packages)
4. **Epic 6**: Multi-tenant support (future)

## Appendix: Package Manifest

### Final Package List
1. `@pump/core` - Types, interfaces, constants
2. `@pump/services` - Business logic (30+ services)
3. `@pump/adapters` - Data providers (15+ adapters)
4. `@pump/ui-headless` - Headless components
5. `@pump/ui-primitives` - Basic components
6. `@pump/ui-styled` - Styled components
7. `@pump/utils` - Shared utilities
8. `@pump/config` - Configuration management
9. `@pump/types` - Shared TypeScript types
10. `@pump/testing` - Test utilities

---

*This updated epic preserves the excellent existing architecture while enabling the modular vision.*