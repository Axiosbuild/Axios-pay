import { Request, Response, NextFunction } from 'express';
import * as ratesService from '../services/rates.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/prisma';
import { env } from '../config/env';

export async function getAllRates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rates = await ratesService.getAllRates();
    res.json({ rates, count: rates.length, fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getRate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { from, to } = req.params;
    const fromCurrency = from.toUpperCase();
    const toCurrency = to.toUpperCase();
    const rate = await ratesService.getRateDetails(fromCurrency, toCurrency);
    res.json({
      fromCurrency,
      toCurrency,
      rate: rate.rate.toString(),
      midMarketRate: rate.midMarketRate.toString(),
      spread: rate.spread.toString(),
      provider: rate.provider,
      isLive: rate.isLive,
      fetchedAt: rate.fetchedAt.toISOString(),
      ageSeconds: rate.ageSeconds,
    });
  } catch (err) {
    next(err);
  }
}

export async function getHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const health = await ratesService.getRatesHealth();
    res.json(health);
  } catch (err) {
    next(err);
  }
}

export async function refreshRates(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { email: true },
    });

    if (!user || user.email.toLowerCase() !== env.ADMIN_EMAIL.toLowerCase()) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Admin access required' });
      return;
    }

    const result = await ratesService.refreshAllRates({ manual: true });
    res.json({ message: 'Rates refresh complete', ...result, refreshedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}
