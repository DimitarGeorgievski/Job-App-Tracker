import { MembershipRole } from 'generated/prisma/client';

export const PERMISSION_MATRIX = {
  'organization:view': () => true,
  'organization:rename': (role: MembershipRole) =>
    role === MembershipRole.OWNER,
  'organization:archive': (role: MembershipRole) =>
    role === MembershipRole.OWNER,

  'project:create': (role: MembershipRole) =>
    role === MembershipRole.OWNER || role === MembershipRole.ADMIN,
  'project:view': () => true,
  'project:rename': (role: MembershipRole) =>
    role === MembershipRole.OWNER || role === MembershipRole.ADMIN,
  'project:archive': (role: MembershipRole) =>
    role === MembershipRole.OWNER || role === MembershipRole.ADMIN,

  'environment:create': (role: MembershipRole) =>
    role === MembershipRole.OWNER ||
    role === MembershipRole.ADMIN ||
    role === MembershipRole.EDITOR,
  'environment:view': () => true,
  'environment:rename': (role: MembershipRole) =>
    role === MembershipRole.OWNER ||
    role === MembershipRole.ADMIN ||
    role === MembershipRole.EDITOR,
  'environment:archive': (role: MembershipRole) =>
    role === MembershipRole.OWNER ||
    role === MembershipRole.ADMIN ||
    role === MembershipRole.EDITOR,

  'flag:create': (role: MembershipRole) =>
    role === MembershipRole.OWNER || role === MembershipRole.ADMIN,
  'flag:view': () => true,
  'flag:edit': (role: MembershipRole) =>
    role === MembershipRole.OWNER ||
    role === MembershipRole.ADMIN ||
    role === MembershipRole.EDITOR,
  'flag:delete': (role: MembershipRole) =>
    role === MembershipRole.OWNER || role === MembershipRole.ADMIN,

  'rule:create': (role: MembershipRole) =>
    role === MembershipRole.OWNER || role === MembershipRole.ADMIN,
  'rule:view': () => true,
  'rule:edit': (role: MembershipRole) =>
    role === MembershipRole.OWNER ||
    role === MembershipRole.ADMIN ||
    role === MembershipRole.EDITOR,
  'rule:delete': (role: MembershipRole) =>
    role === MembershipRole.OWNER || role === MembershipRole.ADMIN,

  'sdk:create': (role: MembershipRole) =>
    role === MembershipRole.OWNER || role === MembershipRole.ADMIN,
  'sdk:view': () => true,
  'sdk:rotate': (role: MembershipRole) =>
    role === MembershipRole.OWNER || role === MembershipRole.ADMIN,
  'sdk:revoke': (role: MembershipRole) =>
    role === MembershipRole.OWNER || role === MembershipRole.ADMIN,

  publish: (role: MembershipRole) =>
    role === MembershipRole.OWNER || role === MembershipRole.ADMIN,
} as const;

export type PermissionKey = keyof typeof PERMISSION_MATRIX;
export const hasPermission = (
  role: MembershipRole,
  permission: PermissionKey,
): boolean => {
  const checker = PERMISSION_MATRIX[permission];
  if (!checker) return false;
  return checker(role);
};
