import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';
import { PermissionPolicyService, PolicyViolation } from '@/lib/services/permission-policy.service';
import { PermissionValues } from '@/core/permission/models';

export const POST = withValidatedServices({
  schema: z.object({}),
  requiredServices: ['permission'],
  requireAuth: true,
  requiredPermissions: [PermissionValues.ADMIN_ACCESS],
  handler: async ({ services }) => {
    const policy = new PermissionPolicyService();
    const roles = await services.permission.getAllRoles();
    const violations: PolicyViolation[] = [];

    for (const role of roles) {
      if (role.name !== 'SUPER_ADMIN' && role.permissions.includes(PermissionValues.ADMIN_ACCESS)) {
        violations.push({
          userId: '',
          permission: PermissionValues.ADMIN_ACCESS,
          reason: `Role ${role.name} has ADMIN_ACCESS`,
        });
      }
    }

    if (violations.length > 0) {
      await policy.reportViolations(violations);
    }

    return createSuccessResponse({ success: true, violations });
  },
});
