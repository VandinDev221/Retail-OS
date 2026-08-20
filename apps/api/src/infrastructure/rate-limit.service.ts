import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class RateLimitService {
  constructor(private cacheService: CacheService) {}

  async checkLimit(key: string, limit: number = 60, windowSeconds: number = 60): Promise<void> {
    const rateKey = `rate-limit:${key}`;
    const current = (await this.cacheService.get<number>(rateKey)) || 0;

    if (current >= limit) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Muitas requisições. Por favor, aguarde alguns instantes.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.cacheService.set(rateKey, current + 1, windowSeconds);
  }
}
