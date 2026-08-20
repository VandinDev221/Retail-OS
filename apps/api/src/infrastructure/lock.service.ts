import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class LockService {
  private readonly logger = new Logger(LockService.name);
  private localLocks = new Set<string>();

  constructor(private cacheService: CacheService) {}

  async acquire(key: string, ttlSeconds: number = 10): Promise<boolean> {
    const lockKey = `lock:${key}`;
    const exists = await this.cacheService.get(lockKey);
    if (exists) {
      return false;
    }

    if (this.localLocks.has(lockKey)) {
      return false;
    }

    await this.cacheService.set(lockKey, 'locked', ttlSeconds);
    this.localLocks.add(lockKey);

    setTimeout(() => {
      this.localLocks.delete(lockKey);
    }, ttlSeconds * 1000);

    return true;
  }

  async release(key: string): Promise<void> {
    const lockKey = `lock:${key}`;
    await this.cacheService.del(lockKey);
    this.localLocks.delete(lockKey);
  }
}
