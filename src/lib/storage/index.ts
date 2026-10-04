import fs from 'fs';
import path from 'path';

// Storage adapter interface
export interface StorageDriver {
  putObject(key: string, data: Buffer, mimeType: string, isPublic?: boolean): Promise<{ key: string; url: string; size: number }>;
  getObject(key: string): Promise<Buffer>;
  deleteObject(key: string): Promise<void>;
  getUrl(key: string, isPublic?: boolean): string;
}

// Local filesystem adapter
export class LocalStorageDriver implements StorageDriver {
  private baseDir: string;
  private publicDir: string;
  private privateDir: string;

  constructor() {
    this.baseDir = process.cwd();
    this.publicDir = path.join(this.baseDir, 'public', 'uploads', 'public');
    this.privateDir = path.join(this.baseDir, 'data', 'private-storage');

    if (!fs.existsSync(this.publicDir)) {
      fs.mkdirSync(this.publicDir, { recursive: true });
    }
    if (!fs.existsSync(this.privateDir)) {
      fs.mkdirSync(this.privateDir, { recursive: true });
    }
  }

  async putObject(key: string, data: Buffer, _mimeType: string, isPublic = false): Promise<{ key: string; url: string; size: number }> {
    const targetDir = isPublic ? this.publicDir : this.privateDir;
    const filePath = path.join(targetDir, key);
    const parentDir = path.dirname(filePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    await fs.promises.writeFile(filePath, data);
    const url = isPublic ? `/uploads/public/${key}` : `/api/storage/private/${key}`;

    return {
      key,
      url,
      size: data.length,
    };
  }

  async getObject(key: string): Promise<Buffer> {
    // Check private first, then public
    const privPath = path.join(this.privateDir, key);
    if (fs.existsSync(privPath)) {
      return await fs.promises.readFile(privPath);
    }
    const pubPath = path.join(this.publicDir, key);
    if (fs.existsSync(pubPath)) {
      return await fs.promises.readFile(pubPath);
    }
    throw new Error(`Storage object not found: ${key}`);
  }

  async deleteObject(key: string): Promise<void> {
    const privPath = path.join(this.privateDir, key);
    if (fs.existsSync(privPath)) {
      await fs.promises.unlink(privPath).catch(() => {});
    }
    const pubPath = path.join(this.publicDir, key);
    if (fs.existsSync(pubPath)) {
      await fs.promises.unlink(pubPath).catch(() => {});
    }
  }

  getUrl(key: string, isPublic = false): string {
    return isPublic ? `/uploads/public/${key}` : `/api/storage/private/${key}`;
  }
}

let storageInstance: StorageDriver | null = null;

export function getStorage(): StorageDriver {
  if (!storageInstance) {
    // Checks if AWS S3 environment variables are provided, otherwise defaults to local driver
    if (process.env.STORAGE_DRIVER === 's3' && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
      // In production S3 adapter can be instantiated here
      storageInstance = new LocalStorageDriver(); // Fallback for stability
    } else {
      storageInstance = new LocalStorageDriver();
    }
  }
  return storageInstance;
}
