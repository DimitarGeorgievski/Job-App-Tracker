import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
  const request = context.switchToHttp().getRequest();
  const token = this.extractToken(request);
  if (!token) return false;
  const payload = await this.jwtService.verifyAsync(token);
  request.user = payload;
  return true;
}
  private extractToken(request: any) {
    const cookieToken = request.cookies?.['access-token'];
    if (cookieToken) return cookieToken;
    const headerToken = request.headers['authorization']?.split(' ')[1];
    return headerToken ?? null;
  }
}
