#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all API test files
const testFiles = glob.sync('app/api/**/__tests__/*.test.ts', {
  cwd: '/workspaces/ZDX-UM/user-management-reorganized'
});

console.log(`Found ${testFiles.length} test files to fix`);

testFiles.forEach(file => {
  const filePath = path.join('/workspaces/ZDX-UM/user-management-reorganized', file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Pattern 1: Replace service-container imports with ServiceLocator
  if (content.includes('from \'@/lib/config/service-container\'')) {
    content = content.replace(
      /import\s*{\s*[^}]*}\s*from\s*['"]@\/lib\/config\/service-container['"]/g,
      'import { ServiceLocator, ServiceKeys } from \'@/lib/config/service-locator\''
    );
    modified = true;
  }

  // Pattern 2: Add auth middleware mock if not present
  if (!content.includes('vi.mock(\'@/lib/api/auth-middleware\'') && 
      (content.includes('createAuthenticatedRequest') || content.includes('withAuthRequest'))) {
    const importEndIndex = content.lastIndexOf('import');
    const nextLineIndex = content.indexOf('\n', importEndIndex) + 1;
    
    const authMock = `
// Mock the auth middleware to bypass authentication
vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: () => vi.fn((req: any) => Promise.resolve({
    userId: 'u1',
    user: { id: 'u1', email: 'test@example.com' },
    permissions: []
  }))
}));
`;
    
    content = content.slice(0, nextLineIndex) + authMock + content.slice(nextLineIndex);
    modified = true;
  }

  // Pattern 3: Replace resetServiceContainer/configureServices with ServiceLocator pattern
  if (content.includes('resetServiceContainer')) {
    content = content.replace(
      /resetServiceContainer\(\);[\s\S]*?configureServices\(\{[\s\S]*?\}\);/g,
      (match) => {
        // Extract service names from the configureServices call
        const serviceMatches = match.match(/(\w+Service):/g) || [];
        const registrations = serviceMatches.map(s => {
          const serviceName = s.replace(':', '');
          const serviceKey = getServiceKey(serviceName);
          if (serviceKey) {
            return `  locator.register(ServiceKeys.${serviceKey}, ${serviceName.replace('Service', '')} || service);`;
          }
          return '';
        }).filter(Boolean).join('\n');

        return `
  // Clear and register services in ServiceLocator
  const locator = ServiceLocator.getInstance();
  locator.clear();
${registrations}`;
      }
    );
    modified = true;
  }

  // Pattern 4: Replace getApiAddressService and similar patterns
  if (content.includes('getApiAddressService') || content.includes('getApi')) {
    // Remove the mock for factory functions
    content = content.replace(
      /vi\.mock\(['"]@\/services\/\w+\/factory['"]\s*,[\s\S]*?\}\)\);?/g,
      ''
    );
    
    // Replace the service setup in beforeEach
    content = content.replace(
      /vi\.mocked\(getApi\w+Service\)\.mockReturnValue\(service\);/g,
      `// Clear and register services in ServiceLocator
  const locator = ServiceLocator.getInstance();
  locator.clear();
  locator.register(ServiceKeys.ADDRESS_SERVICE, service);`
    );
    modified = true;
  }

  // Pattern 5: Add params to route handler calls for dynamic routes
  if (file.includes('[') && file.includes(']')) {
    // Extract the param name from the file path (e.g., [id] -> id)
    const paramMatch = file.match(/\[(\w+)\]/);
    if (paramMatch) {
      const paramName = paramMatch[1];
      
      // Update GET, PUT, DELETE, POST calls to include params
      content = content.replace(
        /await (GET|PUT|DELETE|POST)\(req\)/g,
        `await $1(req, { params: { ${paramName}: '1' } })`
      );
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${file}`);
  }
});

function getServiceKey(serviceName) {
  const mapping = {
    'addressService': 'ADDRESS_SERVICE',
    'authService': 'AUTH_SERVICE',
    'userService': 'USER_SERVICE',
    'permissionService': 'PERMISSION_SERVICE',
    'teamService': 'TEAM_SERVICE',
    'companyService': 'COMPANY_SERVICE',
    'adminService': 'ADMIN_SERVICE',
    'auditService': 'AUDIT_SERVICE',
    'subscriptionService': 'SUBSCRIPTION_SERVICE',
    'roleService': 'ROLE_SERVICE',
    'organizationService': 'ORGANIZATION_SERVICE',
    'webhookService': 'WEBHOOK_SERVICE',
    'ssoService': 'SSO_SERVICE',
    // Add more mappings as needed
  };
  return mapping[serviceName];
}

console.log('Test fixes complete!');