import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from 'generated/prisma/enums';
import { Roles } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const [classRole, handlerRole] = this.reflector.getAll(Roles, [
      context.getClass(),
      context.getHandler(),
    ]);
    const decoratorRole = handlerRole || classRole;
    console.log(decoratorRole, 'decoratorRole')
    if (!decoratorRole) return true;
    const userRole = request.user.role as Role;
    console.log(userRole, 'userRole')
    if (userRole !== decoratorRole) return false;
    return true;
  }
}
// import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';
// import { ROLES_KEY } from './roles.decorator';
// import { Role } from 'generated/prisma/enums';

// @Injectable()
// export class RolesGuard implements CanActivate {
//   constructor(private reflector: Reflector) {}

//   canActivate(context: ExecutionContext): boolean {
//     const requiredRoles = this.reflector.getAllAndOverride<Role>(
//       ROLES_KEY,
//       [context.getHandler(), context.getClass()],
//     );
//     if (!requiredRoles) {
//       return true;
//     }
//     const request = context.switchToHttp().getRequest();
//     const userRole = request.user.role as Role;
//     console.log(userRole,"userRole")
//     console.log(requiredRoles,"requiredRoles")
//     return requiredRoles.includes(userRole);
//   }
// }