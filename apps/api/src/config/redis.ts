import Redis from 'ioredis';
import { env } from './env';

const redisUsesTls = env.REDIS_URL.startsWith('rediss://');

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  enableOfflineQueue: false,
  connectTimeout: 10_000,
  commandTimeout: 5_000,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy: (attempt) => (attempt > 3 ? null : Math.min(attempt * 200, 1_000)),
  ...(redisUsesTls ? { tls: { rejectUnauthorized: false } } : {}),
});

type RedisLogLevel = 'info' | 'warn' | 'error';

function logRedisEvent(level: RedisLogLevel, event: string, details?: Record<string, unknown>): void {
  const payload = {
    source: 'redis',
    event,
    status: redis.status,
    timestamp: new Date().toISOString(),
    ...details,
  };
  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
    return;
  }
  if (level === 'warn') {
    console.warn(line);
    return;
  }
  console.info(line);
}

redis.on('connect', () => {
  logRedisEvent('info', 'connect', { tls: redisUsesTls });
});

redis.on('error', (err) => {
  logRedisEvent('error', 'error', { message: err.message, name: err.name });
});

redis.on('close', () => {
  logRedisEvent('warn', 'close');
});

if (!redisUsesTls && env.NODE_ENV === 'production') {
  logRedisEvent('warn', 'url_not_rediss', {
    message: 'Upstash on Railway requires REDIS_URL to start with rediss://',
  });
}

export async function connectRedis(): Promise<void> {
  if (redis.status === 'connecting' || redis.status === 'connect' || redis.status === 'ready') {
    return;
  }
  await redis.connect();
}

export type RedisHealthCheck = {
  healthy: boolean;
  latencyMs: number;
  checkedAt: string;
  error?: string;
};

export async function checkRedisHealth(): Promise<RedisHealthCheck> {
  const startedAt = Date.now();
  const checkedAt = new Date().toISOString();
  try {
    await redis.ping();
    return { healthy: true, latencyMs: Date.now() - startedAt, checkedAt };
  } catch (error) {
    return {
      healthy: false,
      latencyMs: Date.now() - startedAt,
      checkedAt,
      error: error instanceof Error ? error.message : 'Unknown Redis error',
    };
  }
}

export async function withRedisFallback<T>(
  operation: () => Promise<T>,
  fallback: () => Promise<T> | T,
  context: string | Record<string, unknown>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logRedisEvent('warn', 'fallback', {
      context,
      message: error instanceof Error ? error.message : String(error),
    });
    return await fallback();
  }
}
