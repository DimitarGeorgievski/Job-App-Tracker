import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from './permissions';

export const ORG_PERMISSION_KEY = 'orgPermission';
export const RequireOrgPermission = (permission: PermissionKey) =>
  SetMetadata(ORG_PERMISSION_KEY, permission);
