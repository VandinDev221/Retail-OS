import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis as UpstashRedis } from '@upstash/redis';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit {
  private readonly logger = new Logger(CacheService.name);
  private upstashClient: UpstashRedis | null = null;
  private ioRedisClient: Redis | null = null;
  private memoryCache = new Map<string, { value: any; expiresAt: number }>();

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const upstashUrl = this.configService.get<string>('UPSTASH_REDIS_REST_URL');
    const upstashToken = this.configService.get<string>('UPSTASH_REDIS_REST_TOKEN');
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (upstashUrl && upstashToken) {
      try {
        this.upstashClient = new UpstashRedis({
          url: upstashUrl,
          token: upstashToken,
        });
        this.logger.log('⚡ Conectado ao Upstash Redis (REST API)');
      } catch (err) {
        this.logger.warn('⚠️ Falha ao inicializar Upstash Redis, usando fallback em memória.');
      }
    } else if (redisUrl) {
      try {
        this.ioRedisClient = new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          retryStrategy: () => null, // Não trava o processo se não houver Redis
        });
        this.ioRedisClient.connect().then(() => {
          this.logger.log('⚡ Conectado ao Redis local/TCP');
        }).catch(() => {
          this.logger.warn('⚠️ Redis local indisponível, usando fallback em memória.');
          this.ioRedisClient = null;
        });
      } catch (err) {
        this.logger.warn('⚠️ Fallback para cache em memória ativado.');
      }
    } else {
      this.logger.log('ℹ️ Nenhuma URL Redis informada. Usando cache resiliente em memória.');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.upstashClient) {
        const data = await this.upstashClient.get<T>(key);
        return data ?? null;
      }
      if (this.ioRedisClient && this.ioRedisClient.status === 'ready') {
        const data = await this.ioRedisClient.get(key);
        return data ? (JSON.parse(data) as T) : null;
      }
    } catch (error) {
      this.logger.warn(`Erro ao ler cache no Redis para key ${key}. Recorrendo ao fallback.`, error);
    }

    // Fallback Memory
    const item = this.memoryCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return item.value as T;
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    try {
      if (this.upstashClient) {
        await this.upstashClient.set(key, value, { ex: ttlSeconds });
        return;
      }
      if (this.ioRedisClient && this.ioRedisClient.status === 'ready') {
        await this.ioRedisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        return;
      }
    } catch (error) {
      this.logger.warn(`Erro ao salvar cache no Redis para key ${key}. Recorrendo ao fallback.`, error);
    }

    // Fallback Memory
    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    try {
      if (this.upstashClient) {
        await this.upstashClient.del(key);
      } else if (this.ioRedisClient && this.ioRedisClient.status === 'ready') {
        await this.ioRedisClient.del(key);
      }
    } catch (error) {
      this.logger.warn(`Erro ao deletar key ${key} no Redis.`, error);
    }
    this.memoryCache.delete(key);
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      if (this.ioRedisClient && this.ioRedisClient.status === 'ready') {
        const keys = await this.ioRedisClient.keys(pattern);
        if (keys.length > 0) {
          await this.ioRedisClient.del(...keys);
        }
      }
    } catch (error) {
      this.logger.warn(`Erro ao invalidar padrão ${pattern}`, error);
    }

    // Memory cache prefix clean
    const prefix = pattern.replace('*', '');
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    }
  }
}
