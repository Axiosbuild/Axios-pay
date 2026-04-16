import Redis from 'ioredis';
import { env } from './env';

const redisUsesTls = env.REDIS_URL.startsWith('rediss://');
const MAX_RETRY_ATTEMPTS = 3;
const retryStrategy = (attempt: number): number | null =>
  attempt > MAX_RETRY_ATTEMPTS ? null : Math.min(attempt * 200, 1_000);

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  enableOfflineQueue: false,
  connectTimeout: 10_000,
  commandTimeout: 5_000,
  maxRetriesPerRequest: MAX_RETRY_ATTEMPTS,
  enableReadyCheck: true,
  retryStrategy,
  // Upstash managed cert chains can fail strict verification in some Railway runtimes.
  // TODO: Revisit and set REDIS_TLS_REJECT_UNAUTHORIZED=true when strict cert verification is stable.
  // Keep this scoped to TLS (`rediss://`) connections only and configurable by env.
  ...(redisUsesTls ? { tls: { rejectUnauthorized: env.REDIS_TLS_REJECT_UNAUTHORIZED } } : {}),
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

/**
 * Wrap Redis-dependent code paths and return a safe fallback value when Redis is unavailable.
 * Use this for cache/session/OTP auxiliary operations where degraded behavior is acceptable.
 * `context` may be a string label or a structured object; string labels are logged under `context`.
 */
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
