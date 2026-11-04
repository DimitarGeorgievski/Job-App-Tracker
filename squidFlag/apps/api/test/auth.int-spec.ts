import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import { buildTestApp } from './helpers/build-test-app';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { HttpStatus } from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/platform/database/prisma.service';

describe('Auth integration tests', () => {
  let app: NestFastifyApplication;
  let authService: AuthService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    app = await buildTestApp({ role: 'all' });
    authService = app.get(AuthService);
    prismaService = app.get(PrismaService);
    await app.init();
    await prismaService.refreshToken.deleteMany({});
    await prismaService.user.deleteMany({});
  });
  afterEach(async () => {
    await app?.close();
  });
  type InjectResponse = Awaited<ReturnType<typeof app.inject>>;

  const ORIGIN = 'http://localhost:4001';

  const toCookieJar = (
    cookies: InjectResponse['cookies'],
  ): Record<string, string> =>
    Object.fromEntries(cookies.map(({ name, value }) => [name, value]));
  const registerUser = async (email: string, password: string) => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email, password },
      headers: { origin: ORIGIN },
    });
    return { res, cookies: toCookieJar(res.cookies) };
  };

  const loginUser = async (email: string, password: string) => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
      headers: { origin: ORIGIN },
    });
    return { res, cookies: toCookieJar(res.cookies) };
  };

  const refreshTokens = async (cookies: Record<string, string>) => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies,
      headers: { origin: ORIGIN },
    });
    return { res, cookies: toCookieJar(res.cookies) };
  };

  const getMe = async (cookies: Record<string, string>) => {
    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      cookies,
    });
    return res;
  };

  const logout = async (cookies: Record<string, string>) => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      cookies,
      headers: { origin: ORIGIN },
    });
    return { res, cookies: toCookieJar(res.cookies) };
  };

  it('full flow: register -> login -> me -> refresh (multiple) -> logout', async () => {
    const email = `test-${randomUUID()}@example.com`;
    const password = 'password123';
    const { res: regRes } = await registerUser(email, password);
    expect(regRes.statusCode).toBe(HttpStatus.CREATED);
    expect(regRes.json()).toEqual({ user: { id: expect.any(String), email } });
    const { res: loginRes, cookies: loginCookies } = await loginUser(
      email,
      password,
    );
    expect(loginRes.statusCode).toBe(HttpStatus.OK);
    expect(loginRes.json()).toEqual({
      user: { id: expect.any(String), email },
    });
    const meRes = await getMe(loginCookies);
    expect(meRes.statusCode).toBe(HttpStatus.OK);
    expect(meRes.json()).toEqual({ user: { id: expect.any(String), email } });
    let currentCookies = loginCookies;
    for (let i = 0; i < 3; i++) {
      const { res: refreshRes, cookies: refreshCookies } =
        await refreshTokens(currentCookies);
      expect(refreshRes.statusCode).toBe(HttpStatus.OK);
      expect(refreshRes.json()).toEqual({
        user: { id: expect.any(String), email },
      });
      currentCookies = refreshCookies;
    }
    const { res: logoutRes } = await logout(currentCookies);
    expect(logoutRes.statusCode).toBe(HttpStatus.OK);
    expect(logoutRes.json()).toEqual({ ok: true });
    const meAfterLogout = await getMe(currentCookies);
    expect(meAfterLogout.statusCode).toBe(HttpStatus.OK);
  });

  it('token reuse: old token after rotation -> family revoked (committed)', async () => {
    const email = `reuse-${randomUUID()}@example.com`;
    const password = 'password123';

    await registerUser(email, password);
    const { res: loginRes, cookies: loginCookies } = await loginUser(
      email,
      password,
    );
    expect(loginRes.statusCode).toBe(HttpStatus.OK);
    const { res: refresh1, cookies: cookies1 } =
      await refreshTokens(loginCookies);
    expect(refresh1.statusCode).toBe(HttpStatus.OK);
    const { res: refresh2 } = await refreshTokens(loginCookies);
    expect(refresh2.statusCode).toBe(HttpStatus.UNAUTHORIZED);
    const { res: refresh3 } = await refreshTokens(cookies1);
    expect(refresh3.statusCode).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('concurrent refresh: two independent HTTP requests with same token -> one succeeds, other detects reuse', async () => {
    const email = `concurrent-${randomUUID()}@example.com`;
    const password = 'password123';

    await registerUser(email, password);
    const { cookies: loginCookies } = await loginUser(email, password);
    expect(loginCookies).toBeDefined();

    const [res1, res2] = await Promise.all([
      app.inject({
        method: 'POST',
        url: '/auth/refresh',
        cookies: loginCookies,
        headers: { origin: ORIGIN },
      }),
      app.inject({
        method: 'POST',
        url: '/auth/refresh',
        cookies: loginCookies,
        headers: { origin: ORIGIN },
      }),
    ]);

    const successCount = [res1, res2].filter(
      (r) => r.statusCode === 200,
    ).length;
    const failCount = [res1, res2].filter((r) => r.statusCode === 401).length;

    expect(successCount).toBe(1);
    expect(failCount).toBe(1);
    const successRes = res1.statusCode === 200 ? res1 : res2;
    const successCookies = successRes.cookies;
    const res3 = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies: toCookieJar(successCookies),
      headers: { origin: ORIGIN },
    });
    expect(res3.statusCode).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('expired token -> 401 without family revocation', async () => {
    const email = `expired-${randomUUID()}@example.com`;
    const password = 'password123';
    await registerUser(email, password);
    const { res: loginRes, cookies: loginCookies } = await loginUser(
      email,
      password,
    );
    expect(loginRes.statusCode).toBe(HttpStatus.OK);
    const loginRefreshToken = loginCookies.refresh_token;
    expect(loginRefreshToken).toBeDefined();
    const loginTokenHash = createHash('sha256')
      .update(loginRefreshToken!)
      .digest('hex');

    const token = await prismaService.refreshToken.findUnique({
      where: { tokenHash: loginTokenHash },
    });

    expect(token).not.toBeNull();
    await prismaService.refreshToken.update({
      where: { id: token!.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const { res: refreshRes } = await refreshTokens(loginCookies);

    expect(refreshRes.statusCode).toBe(HttpStatus.UNAUTHORIZED);
    const updatedToken = await prismaService.refreshToken.findUnique({
      where: { id: token!.id },
    });

    expect(updatedToken?.revokedAt).toBeNull();
  });

  it('explicitly revoked token (via revokeFamily) presented -> 401 with family revocation', async () => {
    const email = `revoked-${randomUUID()}@example.com`;
    const password = 'password123';

    await registerUser(email, password);

    const { res: loginRes, cookies: loginCookies } = await loginUser(
      email,
      password,
    );
    expect(loginRes.statusCode).toBe(HttpStatus.OK);
    const loginRefreshToken = loginCookies.refresh_token;
    expect(loginRefreshToken).toBeDefined();
    const loginTokenHash = createHash('sha256')
      .update(loginRefreshToken!)
      .digest('hex');

    const token = await prismaService.refreshToken.findUnique({
      where: { tokenHash: loginTokenHash },
    });

    expect(token).not.toBeNull();
    await authService.revokeFamily(token!.familyId);

    const { res: refreshRes } = await refreshTokens(loginCookies);

    expect(refreshRes.statusCode).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('rate limiting: login exceeds -> 429', async () => {
    const email = `ratelimit-${randomUUID()}@example.com`;
    const password = 'password123';

    await registerUser(email, password);
    for (let i = 0; i < 5; i++) {
      const { res } = await loginUser(email, password);
      expect(res.statusCode).toBe(HttpStatus.OK);
    }
    const { res: rateLimited } = await loginUser(email, password);
    expect(rateLimited.statusCode).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  it('rate limiting: register exceeds -> 429', async () => {
    const first = await registerUser(
      `reg-limit-${randomUUID()}@example.com`,
      'password123',
    );
    expect(first.res.statusCode).toBe(HttpStatus.CREATED);
    const second = await registerUser(
      `reg-limit-${randomUUID()}@example.com`,
      'password123',
    );
    expect(second.res.statusCode).toBe(HttpStatus.CONFLICT);
    const third = await registerUser(
      `reg-limit-${randomUUID()}@example.com`,
      'password123',
    );
    expect(third.res.statusCode).toBe(HttpStatus.CONFLICT);
    const fourth = await registerUser(
      `reg-limit-${randomUUID()}@example.com`,
      'password123',
    );
    expect(fourth.res.statusCode).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  it('rate limiting: refresh exceeds -> 429', async () => {
    const email = `refresh-limit-${randomUUID()}@example.com`;
    const password = 'password123';

    await registerUser(email, password);
    const { cookies: loginCookies } = await loginUser(email, password);
    let currentCookies = loginCookies;
    for (let i = 0; i < 10; i++) {
      const { res, cookies } = await refreshTokens(currentCookies);
      expect(res.statusCode).toBe(HttpStatus.OK);
      currentCookies = cookies;
    }
    const { res: rateLimited } = await refreshTokens(currentCookies);
    expect(rateLimited.statusCode).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  it('CSRF: missing Origin header -> 403', async () => {
    const email = `csrf-${randomUUID()}@example.com`;
    const password = 'password123';

    await registerUser(email, password);
    const res1 = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
      headers: { origin: 'http://localhost:4001' },
    });
    expect(res1.statusCode).toBe(HttpStatus.OK);
    const res2 = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    });
    expect(res2.statusCode).toBe(HttpStatus.FORBIDDEN);
  });

  it('CSRF: invalid Origin header -> 403', async () => {
    const email = `csrf2-${randomUUID()}@example.com`;
    const password = 'password123';

    await registerUser(email, password);

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
      headers: { origin: 'http://evil.com' },
    });
    expect(res.statusCode).toBe(HttpStatus.FORBIDDEN);
  });
});
