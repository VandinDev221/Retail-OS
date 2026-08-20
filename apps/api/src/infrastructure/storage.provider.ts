import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
}

export abstract class StorageProvider {
  abstract upload(file: Buffer, filename: string, mimeType: string, folder?: string): Promise<UploadResult>;
  abstract delete(key: string): Promise<void>;
  abstract getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

@Injectable()
export class CloudStorageProvider implements StorageProvider {
  private readonly logger = new Logger(CloudStorageProvider.name);

  constructor(private configService: ConfigService) {}

  async upload(file: Buffer, filename: string, mimeType: string, folder: string = 'uploads'): Promise<UploadResult> {
    const key = `${folder}/${Date.now()}-${filename}`;
    this.logger.log(`[StorageProvider] Upload de arquivo: ${key} (${file.length} bytes)`);

    // Abstração pronta para AWS S3, Cloudflare R2 ou MinIO
    // Em modo básico/simulado retorna URL base
    const baseUrl = this.configService.get<string>('STORAGE_ENDPOINT') || 'https://storage.retailos.com';
    return {
      url: `${baseUrl}/${key}`,
      key,
      size: file.length,
      mimeType,
    };
  }

  async delete(key: string): Promise<void> {
    this.logger.log(`[StorageProvider] Exclusão de arquivo: ${key}`);
  }

  async getSignedUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
    const baseUrl = this.configService.get<string>('STORAGE_ENDPOINT') || 'https://storage.retailos.com';
    return `${baseUrl}/${key}?expires=${Date.now() + expiresInSeconds * 1000}`;
  }
}
