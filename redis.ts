import { createClient } from 'redis';
import { logger } from './logger';

export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
  },
});

redisClient.on('error', (err) => logger.error('Redis error', { error: err.message }));
redisClient.on('reconnecting', () => logger.warn('Redis reconnecting'));

export async function setCache(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
}

export async function getCache<T>(key: string): Promise<T | null> {
  const data = await redisClient.get(key);
  if (!data) return null;
  return JSON.parse(data) as T;
}

export async function deleteCache(key: string): Promise<void> {
  await redisClient.del(key);
}

export async function setOTP(userId: string, type: string, code: string, ttlSeconds = 600): Promise<void> {
  await redisClient.setEx(`otp:${type}:${userId}`, ttlSeconds, code);
}

export async function getOTP(userId: string, type: string): Promise<string | null> {
  return redisClient.get(`otp:${type}:${userId}`);
}

export async function deleteOTP(userId: string, type: string): Promise<void> {
  await redisClient.del(`otp:${type}:${userId}`);
}

export async function setQuote(quoteId: string, quoteData: unknown): Promise<void> {
  await redisClient.setEx(`quote:${quoteId}`, 30, JSON.stringify(quoteData));
}

export async function getQuote<T>(quoteId: string): Promise<T | null> {
  const data = await redisClient.get(`quote:${quoteId}`);
  if (!data) return null;
  return JSON.parse(data) as T;
}
