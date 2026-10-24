import { describe, expect, it, jest, afterEach } from '@jest/globals';
import type { S3Client } from '@aws-sdk/client-s3';
import { parseEnv } from '../../config/env.schema';
import { R2Service } from './r2.service';

const validEnv = () =>
  parseEnv({
    APP_ROLE: 'all',
    DATABASE_URL: 'postgresql://user:password@localhost:5432/squidflag',
    CORS_ORIGINS: 'http://localhost:3000',
    REDIS_URL: 'redis://localhost:6379',
    R2_ENDPOINT: 'https://example.r2.cloudflarestorage.com',
    R2_BUCKET: 'squidflag',
    R2_ACCESS_KEY_ID: 'test-access-key',
    R2_SECRET_ACCESS_KEY: 'test-secret-key',
  });
describe('R2Service', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });
  it('creates the client without making network requests', () => {
    const service = new R2Service(validEnv());
    expect(service).toBeInstanceOf(R2Service);
    service.onModuleDestroy();
  });
  it('uploads an object and returns its size and SHA-256 checksum', async () => {
    const service = new R2Service(validEnv());
    const client = (service as unknown as { client: S3Client }).client;
    const send = jest.spyOn(client, 'send').mockResolvedValue({} as never);
    const body = new TextEncoder().encode('snapshot payload');
    const result = await service.putObject('snapshots/v1.json', body);
    const firstCall = send.mock.calls[0];
    expect(send).toHaveBeenCalledTimes(1);
    expect(firstCall?.[0]).toMatchObject({
      input: {
        Bucket: 'squidflag',
        Key: 'snapshots/v1.json',
        ContentLength: body.byteLength,
        Metadata: {
          sha256: result.checksum,
        },
      },
    });
    expect(result.sizeBytes).toBe(body.byteLength);
    expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
    service.onModuleDestroy();
  });
  it('downloads an object and calculates its SHA-256 checksum', async () => {
    const service = new R2Service(validEnv());
    const client = (service as unknown as { client: S3Client }).client;
    const body = new TextEncoder().encode('snapshot payload');
    jest.spyOn(client, 'send').mockResolvedValue({
      Body: {
        transformToByteArray: () => Promise.resolve(body),
      },
    } as never);
    const result = await service.getObject('snapshots/v1.json');
    expect(result.body).toEqual(body);
    expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
    service.onModuleDestroy();
  });
  it('rejects an object response without a body', async () => {
    const service = new R2Service(validEnv());
    const client = (service as unknown as { client: S3Client }).client;
    jest.spyOn(client, 'send').mockResolvedValue({} as never);
    await expect(service.getObject('snapshots/missing.json')).rejects.toThrow(
      'R2 object has no body: snapshots/missing.json',
    );
    service.onModuleDestroy();
  });
  it('fails explicitly when R2 credentials are missing', async () => {
    const env = parseEnv({
      APP_ROLE: 'all',
      DATABASE_URL: 'postgresql://user:password@localhost:5432/squidflag',
      CORS_ORIGINS: 'http://localhost:3000',
      REDIS_URL: 'redis://localhost:6379',
    });
    const service = new R2Service(env);
    await expect(service.getObject('snapshots/v1.json')).rejects.toThrow(
      'R2 is not configured. Set R2_ENDPOINT, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY.',
    );
    service.onModuleDestroy();
  });
  it('fails explicitly when the bucket is missing', async () => {
    const env = parseEnv({
      APP_ROLE: 'all',
      DATABASE_URL: 'postgresql://user:password@localhost:5432/squidflag',
      CORS_ORIGINS: 'http://localhost:3000',
      REDIS_URL: 'redis://localhost:6379',
      R2_ENDPOINT: 'https://example.r2.cloudflarestorage.com',
      R2_ACCESS_KEY_ID: 'test-access-key',
      R2_SECRET_ACCESS_KEY: 'test-secret-key',
    });
    const service = new R2Service(env);
    await expect(service.getObject('snapshots/v1.json')).rejects.toThrow(
      'R2_BUCKET is not configured.',
    );
    service.onModuleDestroy();
  });
  it('closes the SDK client during module shutdown', () => {
    const service = new R2Service(validEnv());
    const client = (service as unknown as { client: S3Client }).client;
    const destroy = jest.spyOn(client, 'destroy');
    service.onModuleDestroy();
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
