import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import type { AuthService } from './auth.service';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { mockDeep } from 'jest-mock-extended';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: ReturnType<typeof mockDeep<AuthService>>;
  let mockFastifyReply: ReturnType<typeof mockDeep<FastifyReply>>;
  let mockFastifyRequest: ReturnType<typeof mockDeep<FastifyRequest>>;
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthService = mockDeep<AuthService>();
    mockFastifyReply = mockDeep<FastifyReply>();
    mockFastifyRequest = mockDeep<FastifyRequest>();
    mockFastifyRequest.cookies = {};
    controller = new AuthController(mockAuthService);
  });

  describe('register', () => {
    const registerDto = { email: 'test@example.com', password: 'password123' };
    const user = { id: 'user-123', email: 'test@example.com' };

    it('registers first user, sets cookies, returns user', async () => {
      mockAuthService.register.mockResolvedValue({ user });

      const result = await controller.register(registerDto, mockFastifyReply);

      expect(result).toEqual({ user: { id: user.id, email: user.email } });
      expect(mockAuthService.register.mock.calls).toContainEqual([
        registerDto,
        mockFastifyReply,
      ]);
    });

    it('throws ConflictException when bootstrap already complete', async () => {
      mockAuthService.register.mockRejectedValue(
        new ConflictException('Bootstrap complete'),
      );
      await expect(
        controller.register(registerDto, mockFastifyReply),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'password123' };
    const user = { id: 'user-123', email: 'test@example.com' };

    it('logs in user, sets cookies, returns user', async () => {
      mockAuthService.login.mockResolvedValue({ user });

      const result = await controller.login(loginDto, mockFastifyReply);

      expect(result).toEqual({ user: { id: user.id, email: user.email } });
      expect(mockAuthService.login.mock.calls).toContainEqual([
        loginDto,
        mockFastifyReply,
      ]);
    });

    it('throws UnauthorizedException for invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );
      await expect(
        controller.login(loginDto, mockFastifyReply),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    const refreshToken = 'refresh-token';
    const user = { id: 'user-123', email: 'test@example.com' };

    beforeEach(() => {
      mockFastifyRequest.cookies = { refresh_token: refreshToken };
    });

    it('rotates tokens, sets both cookies, returns user', async () => {
      mockAuthService.refresh.mockResolvedValue({ user });

      const result = await controller.refresh(
        mockFastifyReply,
        mockFastifyRequest,
      );

      expect(result).toEqual({
        user: { id: user.id, email: user.email },
      });
      expect(mockAuthService.refresh.mock.calls).toContainEqual([
        refreshToken,
        mockFastifyReply,
      ]);
    });

    it('throws UnauthorizedException when refresh token missing', async () => {
      mockFastifyRequest.cookies = {};
      mockAuthService.refresh.mockRejectedValue(
        new UnauthorizedException('Refresh token not found'),
      );

      await expect(
        controller.refresh(mockFastifyReply, mockFastifyRequest),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('revokes family and throws on TokenReuseException', async () => {
      mockAuthService.refresh.mockRejectedValue(
        new UnauthorizedException('Token reuse detected; session revoked'),
      );

      await expect(
        controller.refresh(mockFastifyReply, mockFastifyRequest),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    const refreshToken = 'refresh-token';

    it('revokes family if token present, clears cookies, returns ok', async () => {
      mockFastifyRequest.cookies = { refresh_token: refreshToken };
      mockAuthService.logout.mockResolvedValue({ ok: true });

      const result = await controller.logout(
        mockFastifyReply,
        mockFastifyRequest,
      );

      expect(result).toEqual({ ok: true });
      expect(mockAuthService.logout.mock.calls).toContainEqual([
        refreshToken,
        mockFastifyReply,
      ]);
    });

    it('idempotent: clears cookies even if token not present', async () => {
      mockFastifyRequest.cookies = {};
      mockAuthService.logout.mockResolvedValue({ ok: true });

      const result = await controller.logout(
        mockFastifyReply,
        mockFastifyRequest,
      );

      expect(result).toEqual({ ok: true });
      expect(mockAuthService.logout.mock.calls).toContainEqual([
        undefined,
        mockFastifyReply,
      ]);
    });

    it('idempotent: clears cookies even if token not found in DB', async () => {
      mockFastifyRequest.cookies = { refresh_token: refreshToken };
      mockAuthService.logout.mockResolvedValue({ ok: true });

      const result = await controller.logout(
        mockFastifyReply,
        mockFastifyRequest,
      );

      expect(result).toEqual({ ok: true });
      expect(mockAuthService.logout.mock.calls).toContainEqual([
        refreshToken,
        mockFastifyReply,
      ]);
    });
  });

  describe('me', () => {
    it('returns user from JWT payload without DB lookup', () => {
      const payload = { sub: 'user-123', email: 'test@example.com' };
      const result = controller.me(payload);
      expect(result).toEqual({
        user: { id: 'user-123', email: 'test@example.com' },
      });
    });
  });
});
