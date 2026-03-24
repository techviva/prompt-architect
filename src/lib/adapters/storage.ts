import fs from "fs/promises";
import path from "path";
import { getEnv } from "@/lib/config/env";

export interface StorageAdapter {
  upload(key: string, data: Buffer, contentType: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}

class LocalStorageAdapter implements StorageAdapter {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async upload(key: string, data: Buffer, _contentType: string): Promise<string> {
    const filePath = path.join(this.basePath, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
    return key;
  }

  async download(key: string): Promise<Buffer> {
    const filePath = path.join(this.basePath, key);
    return fs.readFile(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.basePath, key);
    await fs.unlink(filePath).catch(() => {});
  }

  getUrl(key: string): string {
    return `/api/files/${key}`;
  }
}

let _storage: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (_storage) return _storage;
  const env = getEnv();
  if (env.STORAGE_ADAPTER === "s3") {
    // For S3 support:
    // 1. npm install @aws-sdk/client-s3
    // 2. Create src/lib/adapters/storage-s3.ts implementing StorageAdapter
    // 3. Import and use it here
    throw new Error(
      "S3 storage adapter requires @aws-sdk/client-s3. " +
        "Install it with: npm install @aws-sdk/client-s3 " +
        "and implement the S3StorageAdapter, or use STORAGE_ADAPTER=local"
    );
  }
  _storage = new LocalStorageAdapter(env.STORAGE_LOCAL_PATH);
  return _storage;
}
