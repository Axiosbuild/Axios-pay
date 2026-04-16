/* eslint-disable no-console */
const Redis = require('ioredis');

const redisUrl = (process.env.REDIS_URL || '').trim();

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
  connectTimeout: 10000,
  commandTimeout: 5000,
  maxRetriesPerRequest: 3,
  retryStrategy: (attempt) => (attempt > 3 ? null : Math.min(attempt * 200, 1000)),
  ...(redisUrl.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {}),
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
