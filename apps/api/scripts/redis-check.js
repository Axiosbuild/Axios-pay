/* eslint-disable no-console */
const Redis = require('ioredis');

const redisUrl = (process.env.REDIS_URL || '').trim();
const CONNECT_TIMEOUT_MS = 10_000;
const COMMAND_TIMEOUT_MS = 5_000;
const MAX_RETRIES_PER_REQUEST = 3;
const retryStrategy = (attempt) => (attempt > 3 ? null : Math.min(attempt * 200, 1_000));
const rejectUnauthorized = process.env.REDIS_TLS_REJECT_UNAUTHORIZED === 'true';

if (!redisUrl) {
  console.error('[redis-check] REDIS_URL is missing');
  process.exit(1);
}

if (!redisUrl.startsWith('rediss://')) {
  console.warn('[redis-check] REDIS_URL should start with rediss:// for Upstash on Railway');
}

const redis = new Redis(redisUrl, {
  lazyConnect: true,
  enableOfflineQueue: false,
  connectTimeout: CONNECT_TIMEOUT_MS,
  commandTimeout: COMMAND_TIMEOUT_MS,
  maxRetriesPerRequest: MAX_RETRIES_PER_REQUEST,
  retryStrategy,
  // Mirrors runtime behavior used for Upstash on Railway TLS endpoints.
  ...(redisUrl.startsWith('rediss://') ? { tls: { rejectUnauthorized } } : {}),
});

redis.on('connect', () => console.info(JSON.stringify({ source: 'redis-check', event: 'connect', status: redis.status })));
redis.on('error', (error) =>
  console.error(JSON.stringify({ source: 'redis-check', event: 'error', status: redis.status, message: error.message }))
);
redis.on('close', () => console.warn(JSON.stringify({ source: 'redis-check', event: 'close', status: redis.status })));

async function run() {
  const startedAt = Date.now();
  try {
    await redis.connect();
    await redis.ping();

    const key = `redis-check:${Date.now()}`;
    await redis.set(key, 'ok', 'EX', 30);
    const value = await redis.get(key);
    await redis.del(key);

    console.info(
      JSON.stringify({
        source: 'redis-check',
        event: 'success',
        latencyMs: Date.now() - startedAt,
        roundTrip: value === 'ok',
      })
    );
    process.exitCode = 0;
  } catch (error) {
    console.error(
      JSON.stringify({
        source: 'redis-check',
        event: 'failure',
        latencyMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : String(error),
      })
    );
    process.exitCode = 1;
  } finally {
    redis.disconnect();
  }
}

void run();
