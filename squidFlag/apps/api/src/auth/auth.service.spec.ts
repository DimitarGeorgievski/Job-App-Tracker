import { describe, expect, it, beforeEach } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { AuthService } from './auth.service';
import { TokenReuseException } from './exceptions/token-reuse.exception';
import type { PrismaService } from '../platform/database/prisma.service';
import type { FastifyReply } from 'fastify';
import type { JwtService } from '@nestjs/jwt';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import type { Prisma } from 'generated/prisma/client';

const createRefreshTokenFixture = (
  overrides: Partial<Prisma.RefreshTokenGetPayload<object>> = {},
): Prisma.RefreshTokenGetPayload<object> => ({
  id: randomUUID(),
  userId: randomUUID(),
  tokenHash: createHash('sha256').update('old-refresh-token').digest('hex'),
  familyId: randomUUID(),
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  revokedAt: null,
  replacedByTokenId: null,
  usedAt: null,
  ...overrides,
});

const createUserFixture = (
  overrides: Partial<Prisma.UserGetPayload<object>> = {},
): Prisma.UserGetPayload<object> => ({
  id: randomUUID(),
  email: 'test@example.com',
  passwordHash: 'test-password-hash',
  disabledAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const createAppConfig = (
  jwtSecret?: string,
): ConstructorParameters<typeof AuthService>[2] =>
  ({
    JWT_SECRET: jwtSecret,
  }) as ConstructorParameters<typeof AuthService>[2];

describe('AuthService', () => {
  let service: AuthService;
  let mockPrismaService: DeepMockProxy<PrismaService>;
  let mockJwtService: DeepMockProxy<JwtService>;
  let mockFastifyReply: DeepMockProxy<FastifyReply>;
  beforeEach(() => {
    mockPrismaService = mockDeep<PrismaService>();
    mockJwtService = mockDeep<JwtService>();
    mockFastifyReply = mockDeep<FastifyReply>();
    service = new AuthService(
      mockPrismaService,
      mockJwtService,
      createAppConfig('test-secret-at-least-32-characters-long'),
    );
  });

  describe('hashPassword / verifyPassword', () => {
    it('hashes and verifies password correctly', async () => {
      const password = 'test-password-123';
      const hash = await service.hashPassword(password);
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      const isValid = await service.verifyPassword(password, hash);
      expect(isValid).toBe(true);
      const isInvalid = await service.verifyPassword('wrong-password', hash);
      expect(isInvalid).toBe(false);
    });
  });
  describe('generateAccessToken', () => {
    it('signs JWT with correct payload and options', () => {
      mockJwtService.sign.mockReturnValue('mock-access-token');
      const user = { id: 'user-123', email: 'test@example.com' };
      const token = service.generateAccessToken(user);
      expect(token).toBe('mock-access-token');
      expect(mockJwtService.sign.mock.calls).toContainEqual([
        { sub: user.id, email: user.email },
        {
          secret: 'test-secret-at-least-32-characters-long',
          expiresIn: '10m',
        },
      ]);
    });

    it('should throw when JWT secret is missing', () => {
      const serviceWithoutSecret = new AuthService(
        mockPrismaService,
        mockJwtService,
        createAppConfig(),
      );
      expect(() =>
        serviceWithoutSecret.generateAccessToken({
          id: randomUUID(),
          email: 'test@example.com',
        }),
      ).toThrow(UnauthorizedException);
    });
  });

  describe('generateRefreshToken', () => {
    it('produces a valid opaque token and SHA-256 hash', () => {
      const user = { id: 'user-123', email: 'test@example.com' };
      const familyId = randomUUID();
      const result = service.generateRefreshToken(user, familyId);
      expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      const expectedHash = createHash('sha256')
        .update(result.token)
        .digest('hex');
      expect(result.tokenHash).toBe(expectedHash);
      expect(result.tokenHash).toHaveLength(64);
      expect(result.familyId).toBe(familyId);
    });
    it('produces different tokens on each call', () => {
      const user = { id: 'user-123', email: 'test@example.com' };
      const familyId = randomUUID();
      const first = service.generateRefreshToken(user, familyId);
      const second = service.generateRefreshToken(user, familyId);
      expect(first.token).not.toBe(second.token);
      expect(first.tokenHash).not.toBe(second.tokenHash);
    });
  });

  describe('rotateRefreshToken', () => {
    const oldTokenHash = 'old-token-hash';
    const familyId = randomUUID();
    const userId = 'user-123';
    const oldTokenId = randomUUID();
    const newTokenHash = 'new-token-hash';
    beforeEach(() => {
      mockPrismaService.$transaction.mockImplementation(async (callback) =>
        callback(mockPrismaService),
      );
    });
    it('successfully rotates token and returns new tokens', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        id: oldTokenId,
        familyId,
        userId,
        tokenHash: createHash('sha256')
          .update('old-refresh-token')
          .digest('hex'),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        revokedAt: null,
        replacedByTokenId: null,
        usedAt: null,
      });
      mockPrismaService.user.findUnique.mockResolvedValue(
        createUserFixture({
          id: userId,
        }),
      );
      mockPrismaService.user.findUnique.mockResolvedValue(
        createUserFixture({
          id: userId,
          disabledAt: null,
        }),
      );
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(
        createRefreshTokenFixture({
          id: oldTokenId,
          userId,
          familyId,
        }),
      );
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.refreshToken.create.mockResolvedValue(
        createRefreshTokenFixture({
          id: randomUUID(),
          userId,
          familyId,
          tokenHash: newTokenHash,
        }),
      );
      const result = await service.rotateRefreshToken(oldTokenHash);
      expect(result.newTokenPlain).toBeDefined();
      expect(result.newTokenHash).toBe(newTokenHash);
      expect(mockPrismaService.refreshToken.create.mock.calls).toEqual(
        expect.arrayContaining([
          [
            expect.objectContaining({
              data: expect.objectContaining({ familyId }),
            }),
          ],
        ]),
      );
      expect(mockPrismaService.refreshToken.updateMany.mock.calls).toEqual(
        expect.arrayContaining([
          [
            expect.objectContaining({
              where: { id: oldTokenId, revokedAt: null },
            }),
          ],
        ]),
      );
    });

    it('throws UnauthorizedException for non-existent token', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.rotateRefreshToken(oldTokenHash)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws TokenReuseException when token already revoked (revokedAt !== null)', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(
        createRefreshTokenFixture({
          id: oldTokenId,
          userId,
          familyId,
          revokedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }),
      );
      await expect(service.rotateRefreshToken(oldTokenHash)).rejects.toThrow(
        TokenReuseException,
      );
    });

    it('throws UnauthorizedException for expired token', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(
        createRefreshTokenFixture({
          id: oldTokenId,
          userId,
          familyId,
          revokedAt: null,
          expiresAt: new Date(Date.now() - 1000),
        }),
      );
      await expect(service.rotateRefreshToken(oldTokenHash)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException for disabled user', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(
        createRefreshTokenFixture({
          id: oldTokenId,
          userId,
          familyId,
          revokedAt: null,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }),
      );
      mockPrismaService.user.findUnique.mockResolvedValue(
        createUserFixture({
          id: userId,
          disabledAt: new Date(),
        }),
      );
      await expect(service.rotateRefreshToken(oldTokenHash)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws TokenReuseException when concurrent consumption detected (updateMany count = 0)', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(
        createRefreshTokenFixture({
          id: oldTokenId,
          userId,
          familyId,
          revokedAt: null,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }),
      );
      mockPrismaService.user.findUnique.mockResolvedValue(
        createUserFixture({
          id: userId,
        }),
      );
      mockPrismaService.user.findUnique.mockResolvedValue(
        createUserFixture({
          id: userId,
          disabledAt: null,
        }),
      );
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(
        createRefreshTokenFixture({
          id: oldTokenId,
          userId,
          tokenHash: newTokenHash,
          familyId,
        }),
      );
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.rotateRefreshToken(oldTokenHash)).rejects.toThrow(
        TokenReuseException,
      );
    });
  });

  describe('revokeFamily', () => {
    it('revokes all tokens in family', async () => {
      const familyId = randomUUID();
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 5 });
      await service.revokeFamily(familyId);
      expect(mockPrismaService.refreshToken.updateMany.mock.calls).toEqual(
        expect.arrayContaining([
          [
            {
              where: { familyId },
              data: { revokedAt: expect.any(Date) },
            },
          ],
        ]),
      );
    });
  });

  describe('validateUser', () => {
    it('returns user when credentials valid', async () => {
      const passwordHash = await service.hashPassword('test-password');
      mockPrismaService.user.findUnique.mockResolvedValue(
        createUserFixture({
          id: 'user-123',
          passwordHash,
        }),
      );
      const result = await service.validateUser(
        'test@example.com',
        'test-password',
      );
      expect(result).toEqual({ id: 'user-123', email: 'test@example.com' });
    });

    it('returns null for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      const result = await service.validateUser(
        'nonexistent@example.com',
        'password',
      );
      expect(result).toBeNull();
    });

    it('returns null for invalid password', async () => {
      const passwordHash = await service.hashPassword('test-password');
      mockPrismaService.user.findUnique.mockResolvedValue(
        createUserFixture({
          id: 'user-123',
          passwordHash,
        }),
      );
      const result = await service.validateUser(
        'test@example.com',
        'wrong-password',
      );
      expect(result).toBeNull();
    });

    it('returns null for disabled user', async () => {
      const passwordHash = await service.hashPassword('test-password');
      mockPrismaService.user.findUnique.mockResolvedValue(
        createUserFixture({
          id: 'user-123',
          passwordHash,
          disabledAt: new Date(),
        }),
      );
      const result = await service.validateUser(
        'test@example.com',
        'test-password',
      );
      expect(result).toBeNull();
    });
  });

  describe('setAuthCookies / clearAuthCookies', () => {
    it('sets both access and refresh cookies', () => {
      service.setAuthCookies(mockFastifyReply, {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(mockFastifyReply.setCookie.mock.calls).toHaveLength(2);
      expect(mockFastifyReply.setCookie).toHaveBeenCalledWith(
        'access_token',
        'access-token',
        expect.objectContaining({ httpOnly: true, path: '/' }),
      );
      expect(mockFastifyReply.setCookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-token',
        expect.objectContaining({ httpOnly: true, path: '/' }),
      );
    });
    it('clears both cookies with matching path', () => {
      service.clearAuthCookies(mockFastifyReply);
      const calls = mockFastifyReply.clearCookie.mock.calls;
      expect(calls).toHaveLength(2);
      expect(calls[0]).toEqual(['access_token', { path: '/' }]);
      expect(calls[1]).toEqual(['refresh_token', { path: '/' }]);
    });
  });
});
