import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { APP_ENV } from '../../config/app-env.token';
import type { AppEnv } from '../../config/env.schema';

@Injectable()
export class R2Service implements OnModuleDestroy {
  private readonly logger = new Logger(R2Service.name);
  private readonly client: S3Client | undefined;
  constructor(@Inject(APP_ENV) private readonly env: AppEnv) {
    const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = env;
    if (R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) {
      this.client = new S3Client({
        endpoint: R2_ENDPOINT,
        region: 'auto',
        credentials: {
          accessKeyId: R2_ACCESS_KEY_ID,
          secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
        maxAttempts: 2,
      });
    }
  }
  async putObject(
    key: string,
    body: Uint8Array,
  ): Promise<{ sizeBytes: number; checksum: string }> {
    const client = this.getClient();
    const checksum = createHash('sha256').update(body).digest('hex');
    await client.send(
      new PutObjectCommand({
        Bucket: this.getBucket(),
        Key: key,
        Body: body,
        ContentLength: body.byteLength,
        Metadata: { sha256: checksum },
      }),
    );
    return {
      sizeBytes: body.byteLength,
      checksum,
    };
  }
  async getObject(
    key: string,
  ): Promise<{ body: Uint8Array; checksum: string }> {
    const response = await this.getClient().send(
      new GetObjectCommand({
        Bucket: this.getBucket(),
        Key: key,
      }),
    );
    if (!response.Body) {
      throw new Error(`R2 object has no body: ${key}`);
    }
    const body = await response.Body.transformToByteArray();
    const checksum = createHash('sha256').update(body).digest('hex');
    return { body, checksum };
  }
  onModuleDestroy(): void {
    this.client?.destroy();
    this.logger.log('R2 client closed');
  }
  private getClient(): S3Client {
    if (!this.client) {
      throw new Error(
        'R2 is not configured. Set R2_ENDPOINT, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY.',
      );
    }
    return this.client;
  }
  private getBucket(): string {
    const bucket = this.env.R2_BUCKET;
    if (!bucket) {
      throw new Error('R2_BUCKET is not configured.');
    }
    return bucket;
  }
}
