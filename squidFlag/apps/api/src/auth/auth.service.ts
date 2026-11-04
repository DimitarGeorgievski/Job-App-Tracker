import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../platform/database/prisma.service';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  ACCESS_TOKEN_TTL,
  BCRYPT_COST,
  COOKIE_OPTIONS,
} from './auth.constants';
import { TokenPair } from './interfaces/token-pair.interface';
import { TokenReuseException } from './exceptions/token-reuse.exception';
import type { FastifyReply } from 'fastify';
import { compare, hash } from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { APP_ENV } from '../platform/config/app-env.token';
import type { AppEnv } from '../platform/config/env.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject(APP_ENV) private readonly config: AppEnv,
  ) {}

  private createRefreshToken(): { token: string; tokenHash: string } {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    return { token, tokenHash };
  }
  async hashPassword(password: string): Promise<string> {
    return hash(password, BCRYPT_COST);
  }
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return compare(password, hash);
  }
  generateAccessToken(user: { id: string; email: string }): string {
    const jwtSecret = this.config.JWT_SECRET;
    if (!jwtSecret) {
      throw new UnauthorizedException('JWT secret not configured');
    }
    return this.jwtService.sign(
      { sub: user.id, email: user.email },
      { secret: jwtSecret, expiresIn: ACCESS_TOKEN_TTL },
    );
  }
  generateRefreshToken(
    user: { id: string; email: string },
    familyId: string,
  ): { token: string; tokenHash: string; familyId: string } {
    const { token, tokenHash } = this.createRefreshToken();
    return { token, tokenHash, familyId };
  }

  async rotateRefreshToken(
    tokenHash: string,
  ): Promise<{ newTokenPlain: string; newTokenHash: string }> {
    const result = await this.prisma.$transaction(async (tx) => {
      const oldToken = await tx.refreshToken.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          familyId: true,
          userId: true,
          revokedAt: true,
          expiresAt: true,
        },
      });
      if (!oldToken) throw new UnauthorizedException('Invalid refresh token');
      if (oldToken.revokedAt !== null)
        throw new TokenReuseException(oldToken.familyId);
      if (oldToken.expiresAt < new Date())
        throw new UnauthorizedException('Expired refresh token');
      const user = await tx.user.findUnique({
        where: { id: oldToken.userId },
        select: { id: true, email: true, disabledAt: true },
      });
      if (!user || user.disabledAt)
        throw new UnauthorizedException('User not found or disabled');
      const { token: newRefreshToken, tokenHash: newTokenHash } =
        this.createRefreshToken();
      const newToken = await tx.refreshToken.create({
        data: {
          userId: oldToken.userId,
          tokenHash: newTokenHash,
          familyId: oldToken.familyId,
          expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          replacedByTokenId: null,
        },
      });
      const updated = await tx.refreshToken.updateMany({
        where: { id: oldToken.id, revokedAt: null },
        data: { revokedAt: new Date(), replacedByTokenId: newToken?.id },
      });
      if (updated.count === 0) {
        throw new TokenReuseException(oldToken.familyId);
      }
      return {
        newTokenPlain: newRefreshToken,
        newTokenHash: newToken.tokenHash,
      };
    });
    return result;
  }
  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId },
      data: { revokedAt: new Date() },
    });
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<{ id: string; email: string } | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    if (user.disabledAt) return null;
    const isValid = await this.verifyPassword(password, user.passwordHash);
    if (!isValid) return null;
    return { id: user.id, email: user.email };
  }

  setAuthCookies(res: FastifyReply, tokens: TokenPair): void {
    res.setCookie(ACCESS_COOKIE, tokens.accessToken, COOKIE_OPTIONS);
    res.setCookie(REFRESH_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);
  }

  clearAuthCookies(res: FastifyReply): void {
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
  }

  async register(
    parsed: RegisterDto,
    res: FastifyReply,
  ): Promise<{ user: { id: string; email: string } }> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(1234567890)`;
      const count = await tx.user.count();
      if (count > 0) throw new ConflictException('Bootstrap complete');
      const user = await tx.user.create({
        data: {
          email: parsed.email,
          passwordHash: await this.hashPassword(parsed.password),
        },
      });
      const familyId = randomUUID();
      const { token: refreshToken, tokenHash } = this.generateRefreshToken(
        user,
        familyId,
      );
      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash,
          familyId,
          expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          replacedByTokenId: null,
        },
      });
      const accessToken = this.generateAccessToken(user);
      this.setAuthCookies(res, { accessToken, refreshToken });
      return { user: { id: user.id, email: user.email } };
    });
  }

  async login(
    parsed: LoginDto,
    res: FastifyReply,
  ): Promise<{ user: { id: string; email: string } }> {
    const user = await this.validateUser(parsed.email, parsed.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const familyId = randomUUID();
    const { token: refreshToken, tokenHash } = this.generateRefreshToken(
      user,
      familyId,
    );
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        familyId,
        expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        replacedByTokenId: null,
      },
    });
    const accessToken = this.generateAccessToken(user);
    this.setAuthCookies(res, { accessToken, refreshToken });
    return { user: { id: user.id, email: user.email } };
  }

  async refresh(
    refreshToken: string | undefined,
    res: FastifyReply,
  ): Promise<{ user: { id: string; email: string } }> {
    if (!refreshToken)
      throw new UnauthorizedException('Refresh token not found');
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    try {
      const { newTokenPlain, newTokenHash } =
        await this.rotateRefreshToken(tokenHash);
      const user = await this.prisma.refreshToken.findUnique({
        where: { tokenHash: newTokenHash },
        select: { user: { select: { id: true, email: true } } },
      });
      if (!user) throw new UnauthorizedException('User not found');
      const accessToken = this.generateAccessToken(user.user);
      this.setAuthCookies(res, { accessToken, refreshToken: newTokenPlain });
      return { user: { id: user.user.id, email: user.user.email } };
    } catch (e) {
      if (e instanceof TokenReuseException) {
        await this.revokeFamily(e.familyId);
        throw new UnauthorizedException(
          'Token reuse detected; session revoked',
        );
      }
      throw e;
    }
  }

  async logout(
    refreshToken: string | undefined,
    res: FastifyReply,
  ): Promise<{ ok: boolean }> {
    if (refreshToken) {
      const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
      const token = await this.prisma.refreshToken.findUnique({
        where: { tokenHash },
        select: { familyId: true },
      });
      if (token) await this.revokeFamily(token.familyId);
    }
    this.clearAuthCookies(res);
    return { ok: true };
  }
}
