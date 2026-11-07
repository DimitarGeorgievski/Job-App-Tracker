export type OrgPermissionContext = {
  getHandler: () => object;
  getClass: () => object;
  switchToHttp: () => {
    getRequest: () => {
      params: { orgId: string };
      user: { sub: string };
    };
  };
};

export function createOrgPermissionContext(
  orgId: string,
  userId: string,
): OrgPermissionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        params: { orgId },
        user: { sub: userId },
      }),
    }),
  };
}
