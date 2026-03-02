import { NextRequest } from 'next/server';
import { createSuccessResponse } from '@/lib/api/common';
import { RoleDefinition, isRole, RoleType } from '@/lib/rbac/roles';
import { createRoleNotFoundError } from '@/lib/api/permission/error-handler';
import { withErrorHandling } from '@/middleware/error-handling';

async function handleGet(roleId: string) {
  if (!isRole(roleId)) {
    throw createRoleNotFoundError(roleId);
  }
  const role = { id: roleId, ...RoleDefinition[roleId as RoleType] };
  return createSuccessResponse({ role });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await ctx.params;
  return withErrorHandling(() => handleGet(roleId), req);
}
