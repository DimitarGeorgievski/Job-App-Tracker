import { describe, expect, it } from '@jest/globals';
import { parseEnv } from './env.schema';

const testEnv = {
  REDIS_URL: 'redis://localhost:6379',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/squidflag',
  CORS_ORIGINS: 'http://localhost:3000',
};
describe('parseEnv', () => {
  it('defaults APP_ROLE to all', () => {
    expect(parseEnv(testEnv).APP_ROLE).toBe('all');
  });
  it('accepts a valid control configuration', () => {
    expect(
      parseEnv({
        ...testEnv,
        APP_ROLE: 'control',
      }).APP_ROLE,
    ).toBe('control');
  });
  it('uses default HOST and PORT values', () => {
    const env = parseEnv(testEnv);
    expect(env.HOST).toBe('localhost');
    expect(env.PORT).toBe(3000);
  });
  it('allows evaluator without DATABASE_URL', () => {
    const { DATABASE_URL: _, ...envWithoutDatabase } = testEnv;
    expect(
      parseEnv({
        ...envWithoutDatabase,
        APP_ROLE: 'evaluator',
      }).APP_ROLE,
    ).toBe('evaluator');
  });
  it('requires CORS_ORIGINS for all role', () => {
    const { CORS_ORIGINS: _, ...envWithoutCors } = testEnv;
    expect(() => parseEnv(envWithoutCors)).toThrow();
  });
  it('requires CORS_ORIGINS for control role', () => {
    const { CORS_ORIGINS: _, ...envWithoutCors } = testEnv;
    expect(() =>
      parseEnv({
        ...envWithoutCors,
        APP_ROLE: 'control',
      }),
    ).toThrow();
  });
  it('allows evaluator without CORS_ORIGINS', () => {
    const {
      CORS_ORIGINS: _,
      DATABASE_URL: __,
      ...envWithoutOptionalValues
    } = testEnv;
    expect(
      parseEnv({
        ...envWithoutOptionalValues,
        APP_ROLE: 'evaluator',
      }).APP_ROLE,
    ).toBe('evaluator');
  });
  it('requires DATABASE_URL for control and all roles', () => {
    const { DATABASE_URL: _, ...envWithoutDatabase } = testEnv;
    for (const APP_ROLE of ['control', 'all']) {
      expect(() => parseEnv({ ...envWithoutDatabase, APP_ROLE })).toThrow();
    }
  });
  it.each(['not-a-number', '0', '-1', '65536', '3.5'])(
    'rejects invalid PORT value: %s',
    (PORT) => {
      expect(() => parseEnv({ ...testEnv, PORT })).toThrow();
    },
  );
  it.each(['1', '3000', '65535'])('accepts valid PORT value: %s', (PORT) => {
    expect(parseEnv({ ...testEnv, PORT }).PORT).toBe(Number(PORT));
  });
  it('rejects an unsupported APP_ROLE', () => {
    expect(() => parseEnv({ ...testEnv, APP_ROLE: 'worker' })).toThrow();
  });
  it.each(['http://localhost:6379', 'localhost:6379', 'ftp://localhost:6379'])(
    'rejects invalid REDIS_URL: %s',
    (REDIS_URL) => {
      expect(() => parseEnv({ ...testEnv, REDIS_URL })).toThrow();
    },
  );
  it('requires TLS-enabled Redis in production', () => {
    expect(() =>
      parseEnv({
        ...testEnv,
        NODE_ENV: 'production',
        REDIS_URL: 'redis://localhost:6379',
        CORS_ORIGINS: 'https://dashboard.example.com',
      }),
    ).toThrow();
  });
  it('requires REDIS_URL for all roles', () => {
    const { REDIS_URL: _, ...envWithoutRedis } = testEnv;
    for (const APP_ROLE of ['all', 'control', 'evaluator']) {
      expect(() =>
        parseEnv({
          ...envWithoutRedis,
          APP_ROLE,
        }),
      ).toThrow();
    }
  });
  it('requires CORS_ORIGINS in production', () => {
    const { CORS_ORIGINS: _, ...envWithoutCors } = testEnv;
    expect(() =>
      parseEnv({
        ...envWithoutCors,
        NODE_ENV: 'production',
        REDIS_URL: 'rediss://localhost:6379',
      }),
    ).toThrow();
  });
  it('rejects wildcard CORS origins in production', () => {
    expect(() =>
      parseEnv({
        ...testEnv,
        NODE_ENV: 'production',
        REDIS_URL: 'rediss://localhost:6379',
        CORS_ORIGINS: '*',
      }),
    ).toThrow();
  });
  it('parses multiple CORS origins', () => {
    const env = parseEnv({
      ...testEnv,
      CORS_ORIGINS: 'http://localhost:3000, https://dashboard.example.com',
    });
    expect(env.CORS_ORIGINS).toEqual([
      'http://localhost:3000',
      'https://dashboard.example.com',
    ]);
  });
  it.each([
    'not-a-url',
    'http://localhost:3000/path',
    'http://localhost:3000/',
    'ftp://localhost:3000',
  ])('rejects invalid CORS origin: %s', (CORS_ORIGINS) => {
    expect(() => parseEnv({ ...testEnv, CORS_ORIGINS })).toThrow();
  });
  it('rejects an empty DATABASE_URL', () => {
    expect(() =>
      parseEnv({
        ...testEnv,
        DATABASE_URL: '',
      }),
    ).toThrow();
  });
  it('reports multiple invalid environment variables', () => {
    try {
      parseEnv({
        ...testEnv,
        PORT: 'invalid',
        APP_ROLE: 'worker',
      });
      throw new Error('Expected parseEnv to throw');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(Error);
      if (error instanceof Error) {
        expect(error.message).toContain('PORT');
        expect(error.message).toContain('APP_ROLE');
      }
    }
  });
});
