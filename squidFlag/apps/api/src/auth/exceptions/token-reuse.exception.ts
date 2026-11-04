import { UnauthorizedException } from '@nestjs/common';

export class TokenReuseException extends UnauthorizedException {
  constructor(public readonly familyId: string) {
    super('Token reuse detected; session revoked');
    this.name = 'TokenReuseException';
  }
}
