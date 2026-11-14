import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { R2Service } from '../../src/platform/storage/r2/r2.service';

@Injectable()
export class MockR2Service implements Pick<
  R2Service,
  'getObject' | 'putObject'
> {
  private readonly storedObjects = new Map<
    string,
    { body: Uint8Array; checksum: string }
  >();

  private nextPutError: Error | null = null;

  putObject(
    key: string,
    body: Uint8Array,
  ): Promise<{ sizeBytes: number; checksum: string }> {
    if (this.nextPutError) {
      const error = this.nextPutError;
      this.nextPutError = null;
      return Promise.reject(error);
    }

    const checksum = createHash('sha256').update(body).digest('hex');
    this.storedObjects.set(key, { body, checksum });

    return Promise.resolve({
      sizeBytes: body.byteLength,
      checksum,
    });
  }

  getObject(key: string): Promise<{ body: Uint8Array; checksum: string }> {
    const stored = this.storedObjects.get(key);

    if (!stored) {
      return Promise.reject(
        new Error(`Mock R2: object not found for key: ${key}`),
      );
    }

    return Promise.resolve({
      body: stored.body,
      checksum: stored.checksum,
    });
  }
  failNextPutObject(error: Error = new Error('Mock R2 upload failed')): void {
    this.nextPutError = error;
  }

  addObject(storageKey: string, body: Uint8Array): void {
    const checksum = createHash('sha256').update(body).digest('hex');
    this.storedObjects.set(storageKey, { body, checksum });
  }

  getStoredObjects(): Map<string, { body: Uint8Array; checksum: string }> {
    return this.storedObjects;
  }

  reset(): void {
    this.storedObjects.clear();
    this.nextPutError = null;
  }
}
