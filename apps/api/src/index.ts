import './config/env'; // Validate env first
import { prisma } from './config/prisma';
import { redis } from './config/redis';
import { env } from './config/env';
import app from './app';
import { refreshAllRates } from './services/rates.service';
import { processRecurring } from './services/recurring.service';

async function start(): Promise<void> {
  try {
    // 1. Validate env (already done by import side-effect)
    // 2. Connect DB
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connected');

    // 3. Connect Redis
    try {
      await redis.connect();
      await redis.ping();
      console.log('✅ Redis connected');
    } catch (err) {
      console.warn('⚠️ Redis unavailable at startup. Continuing with degraded functionality (OTP/reset/session-cache features may fail until Redis recovers).');
      console.warn('Redis startup error:', err);
      try {
        redis.disconnect();
      } catch (disconnectErr) {
        console.warn('Redis disconnect cleanup error after failed startup connection:', disconnectErr);
      }
    }

    // 4. Fetch all rates immediately
    try {
      await refreshAllRates();
      console.log('✅ Initial rates refresh completed');
    } catch (ratesErr) {
      console.error('⚠️ Initial rates refresh failed. Continuing startup with fallback behavior.', ratesErr);
    }

    // 5. Start server
    app.listen(env.PORT, () => {
      console.log(`🚀 Axios Pay API running on port ${env.PORT}`);
      console.log(`   Health: http://localhost:${env.PORT}/health`);
      console.log(`   Environment: ${env.NODE_ENV}`);
    });

    // 6. Start cron jobs
    if (env.CRON_ENABLED) {
      setInterval(async () => {
        try {
          await refreshAllRates();
          console.log('✅ Rates refreshed successfully');
        } catch (cronErr) {
          console.error('❌ Rates refresh job failed:', cronErr);
        }
      }, env.RATE_REFRESH_INTERVAL_MS);

      setInterval(async () => {
        try {
          await processRecurring();
          console.log('✅ Recurring deposits processed successfully');
        } catch (recurringErr) {
          console.error('❌ Recurring deposits job failed:', recurringErr);
        }
      }, 60 * 60 * 1000);
    }
  } catch (err) {
    console.error('❌ Startup failed:', err);
    process.exit(1);
  }
}

start();
