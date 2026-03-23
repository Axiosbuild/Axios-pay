import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';

const router = Router();
const startedAt = Date.now();

router.get('/', async (_req, res: Response) => {
  let db = 'ok';
  let redisStatus = 'ok';

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = 'down';
  }

  try {
    await redis.ping();
  } catch {
    redisStatus = 'down';
  }

  res.status(db === 'ok' && redisStatus === 'ok' ? 200 : 503).json({
    status: 'ok',
    db,
    redis: redisStatus,
    uptime: Math.floor((Date.now() - startedAt) / 1000),
  });
});

export default router;
