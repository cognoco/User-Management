export { DefaultRoleService } from './default-role.service';
export type { RoleRecord, RoleHierarchyRecord } from './default-role.service';
export { RoleService } from './role.service';
export type {
  Role,
  RoleCreateData,
  RoleUpdateData,
  UserRoleAssignment,
  RoleHierarchyNode,
} from '@/core/role/interfaces';
export { getApiRoleService } from './factory';
