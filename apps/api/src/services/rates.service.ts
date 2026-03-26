import axios from 'axios';
import Decimal from 'decimal.js';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { sendRateProvidersOutageEmail } from './email.service';

type ProviderName = 'exchangerate-api' | 'frankfurter' | 'database-fallback';

interface CachedRate {
  fromCurrency: string;
  toCurrency: string;
  rate: Decimal;
  midMarketRate: Decimal;
  spread: Decimal;
  provider: ProviderName;
  isLive: boolean;
  fetchedAt: Date;
}

interface ProviderHealth {
  healthy: boolean;
  lastSuccessAt: Date | null;
  lastError: string | null;
}

const SUPPORTED_CURRENCIES = ['NGN', 'UGX', 'KES', 'GHS', 'ZAR'] as const;
const CACHE_TTL_MS = 10 * 60 * 1000;
const PROVIDER_TIMEOUT_MS = 10_000;

const RATE_PAIRS: Array<[string, string]> = SUPPORTED_CURRENCIES.flatMap((from) =>
  SUPPORTED_CURRENCIES
    .filter((to) => to !== from)
    .map((to) => [from, to] as [string, string])
);

const rateCache = new Map<string, CachedRate>();
const providerHealth: Record<'exchangerate-api' | 'frankfurter', ProviderHealth> = {
  'exchangerate-api': { healthy: false, lastSuccessAt: null, lastError: null },
  frankfurter: { healthy: false, lastSuccessAt: null, lastError: null },
};

function pairKey(fromCurrency: string, toCurrency: string): string {
  return `${fromCurrency}-${toCurrency}`;
}

function ensureSupportedPair(fromCurrency: string, toCurrency: string): void {
  if (!SUPPORTED_CURRENCIES.includes(fromCurrency as (typeof SUPPORTED_CURRENCIES)[number])) {
    throw new Error('UNSUPPORTED_PAIR');
  }

  if (!SUPPORTED_CURRENCIES.includes(toCurrency as (typeof SUPPORTED_CURRENCIES)[number])) {
    throw new Error('UNSUPPORTED_PAIR');
  }

  if (fromCurrency === toCurrency) {
    throw new Error('UNSUPPORTED_PAIR');
  }
}

function markProviderSuccess(provider: 'exchangerate-api' | 'frankfurter'): void {
  providerHealth[provider] = {
    healthy: true,
    lastSuccessAt: new Date(),
    lastError: null,
  };
}

function markProviderFailure(provider: 'exchangerate-api' | 'frankfurter', errorMessage: string): void {
  providerHealth[provider] = {
    healthy: false,
    lastSuccessAt: providerHealth[provider].lastSuccessAt,
    lastError: errorMessage,
  };
}

function buildSpreadFactor(): Decimal {
  const spreadPercent = new Decimal(env.RATE_SPREAD_PERCENT);
  return spreadPercent.div(100);
}

function applySpread(midMarketRate: Decimal): { finalRate: Decimal; spread: Decimal } {
  const spread = buildSpreadFactor();
  const finalRate = midMarketRate.mul(new Decimal(1).add(spread)).toDecimalPlaces(6, Decimal.ROUND_HALF_UP);
  return { finalRate, spread };
}

async function saveAndCacheRate(input: {
  fromCurrency: string;
  toCurrency: string;
  midMarketRate: Decimal;
  finalRate: Decimal;
  provider: ProviderName;
  isLive: boolean;
  spread: Decimal;
}): Promise<CachedRate> {
  const stored = await prisma.exchangeRate.create({
    data: {
      fromCurrency: input.fromCurrency,
      toCurrency: input.toCurrency,
      rate: input.finalRate,
      source: input.provider,
      provider: input.provider,
      midMarketRate: input.midMarketRate,
      spread: input.spread,
      isLive: input.isLive,
    },
  });

  const cached: CachedRate = {
    fromCurrency: stored.fromCurrency,
    toCurrency: stored.toCurrency,
    rate: new Decimal(stored.rate.toString()),
    midMarketRate: new Decimal(stored.midMarketRate.toString()),
    spread: new Decimal(stored.spread.toString()),
    provider: (stored.provider as ProviderName) || input.provider,
    isLive: stored.isLive,
    fetchedAt: stored.fetchedAt,
  };

  rateCache.set(pairKey(input.fromCurrency, input.toCurrency), cached);
  return cached;
}

export async function fetchFromExchangeRateAPI(baseCurrency: string): Promise<Record<string, Decimal>> {
  if (!env.EXCHANGE_RATE_API_KEY) {
    throw new Error('ExchangeRate-API key is missing');
  }

  try {
    const response = await axios.get(
      `https://v6.exchangerate-api.com/v6/${env.EXCHANGE_RATE_API_KEY}/latest/${baseCurrency}`,
      { timeout: PROVIDER_TIMEOUT_MS }
    );

    const rates = response.data?.conversion_rates as Record<string, number> | undefined;
    if (!rates || typeof rates !== 'object') {
      throw new Error('ExchangeRate-API response missing conversion_rates');
    }

    const parsed = Object.entries(rates).reduce<Record<string, Decimal>>((acc, [currency, value]) => {
      acc[currency] = new Decimal(value);
      return acc;
    }, {});

    markProviderSuccess('exchangerate-api');
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    markProviderFailure('exchangerate-api', message);
    throw new Error(`ExchangeRate-API failed: ${message}`);
  }
}

export async function fetchFromFrankfurter(baseCurrency: string): Promise<Record<string, Decimal>> {
  const symbols = SUPPORTED_CURRENCIES.filter((currency) => currency !== baseCurrency).join(',');

  try {
    const response = await axios.get('https://api.frankfurter.app/latest', {
      params: { from: baseCurrency, to: symbols },
      timeout: PROVIDER_TIMEOUT_MS,
    });

    const rates = response.data?.rates as Record<string, number> | undefined;
    if (!rates || typeof rates !== 'object') {
      throw new Error('Frankfurter response missing rates');
    }

    const parsed = Object.entries(rates).reduce<Record<string, Decimal>>((acc, [currency, value]) => {
      acc[currency] = new Decimal(value);
      return acc;
    }, {});

    markProviderSuccess('frankfurter');
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    markProviderFailure('frankfurter', message);
    throw new Error(`Frankfurter failed: ${message}`);
  }
}

async function fetchFromDatabaseFallback(fromCurrency: string, toCurrency: string): Promise<CachedRate | null> {
  const latest = await prisma.exchangeRate.findFirst({
    where: { fromCurrency, toCurrency },
    orderBy: { fetchedAt: 'desc' },
  });

  if (!latest) return null;

  const fallback: CachedRate = {
    fromCurrency,
    toCurrency,
    rate: new Decimal(latest.rate.toString()),
    midMarketRate: latest.midMarketRate
      ? new Decimal(latest.midMarketRate.toString())
      : new Decimal(latest.rate.toString()),
    spread: latest.spread ? new Decimal(latest.spread.toString()) : buildSpreadFactor(),
    provider: 'database-fallback',
    isLive: false,
    fetchedAt: latest.fetchedAt,
  };

  const persisted = await saveAndCacheRate({
    fromCurrency,
    toCurrency,
    midMarketRate: fallback.midMarketRate,
    finalRate: fallback.rate,
    provider: 'database-fallback',
    isLive: false,
    spread: fallback.spread,
  });

  return persisted;
}

export async function fetchLiveRate(fromCurrency: string, toCurrency: string): Promise<CachedRate> {
  ensureSupportedPair(fromCurrency, toCurrency);

  try {
    const rates = await fetchFromExchangeRateAPI(fromCurrency);
    const midMarketRate = rates[toCurrency];

    if (!midMarketRate) {
      throw new Error(`Rate not found for ${fromCurrency}->${toCurrency}`);
    }

    const { finalRate, spread } = applySpread(midMarketRate);
    return saveAndCacheRate({
      fromCurrency,
      toCurrency,
      midMarketRate,
      finalRate,
      provider: 'exchangerate-api',
      isLive: true,
      spread,
    });
  } catch (error) {
    console.warn(`[rates] ExchangeRate-API failed for ${fromCurrency}->${toCurrency}:`, error);
  }

  try {
    const rates = await fetchFromFrankfurter(fromCurrency);
    const midMarketRate = rates[toCurrency];

    if (!midMarketRate) {
      throw new Error(`Rate not found for ${fromCurrency}->${toCurrency}`);
    }

    const { finalRate, spread } = applySpread(midMarketRate);
    return saveAndCacheRate({
      fromCurrency,
      toCurrency,
      midMarketRate,
      finalRate,
      provider: 'frankfurter',
      isLive: true,
      spread,
    });
  } catch (error) {
    console.warn(`[rates] Frankfurter failed for ${fromCurrency}->${toCurrency}:`, error);
  }

  const fallback = await fetchFromDatabaseFallback(fromCurrency, toCurrency);
  if (fallback) {
    console.warn(`[rates] using database fallback for ${fromCurrency}->${toCurrency}`);
    return fallback;
  }

  throw new Error('RATES_UNAVAILABLE');
}

export async function getRate(fromCurrency: string, toCurrency: string): Promise<Decimal> {
  const details = await getRateDetails(fromCurrency, toCurrency);
  return details.rate;
}

export async function getRateDetails(fromCurrency: string, toCurrency: string): Promise<CachedRate & { ageSeconds: number }> {
  ensureSupportedPair(fromCurrency, toCurrency);

  const key = pairKey(fromCurrency, toCurrency);
  const now = Date.now();
  const cached = rateCache.get(key);

  if (cached && now - cached.fetchedAt.getTime() <= CACHE_TTL_MS) {
    return {
      ...cached,
      ageSeconds: Math.floor((now - cached.fetchedAt.getTime()) / 1000),
    };
  }

  const freshCutoff = new Date(now - CACHE_TTL_MS);
  const dbFresh = await prisma.exchangeRate.findFirst({
    where: {
      fromCurrency,
      toCurrency,
      fetchedAt: { gte: freshCutoff },
    },
    orderBy: { fetchedAt: 'desc' },
  });

  if (dbFresh) {
    const dbRate: CachedRate = {
      fromCurrency,
      toCurrency,
      rate: new Decimal(dbFresh.rate.toString()),
      midMarketRate: new Decimal(dbFresh.midMarketRate.toString()),
      spread: new Decimal(dbFresh.spread.toString()),
      provider: dbFresh.provider as ProviderName,
      isLive: dbFresh.isLive,
      fetchedAt: dbFresh.fetchedAt,
    };

    rateCache.set(key, dbRate);

    return {
      ...dbRate,
      ageSeconds: Math.floor((now - dbRate.fetchedAt.getTime()) / 1000),
    };
  }

  const live = await fetchLiveRate(fromCurrency, toCurrency);
  return {
    ...live,
    ageSeconds: Math.floor((Date.now() - live.fetchedAt.getTime()) / 1000),
  };
}

export async function getAllRates(): Promise<Array<{
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  midMarketRate: string;
  spread: string;
  provider: string;
  isLive: boolean;
  fetchedAt: string;
  ageSeconds: number;
}>> {
  const settled = await Promise.allSettled(
    RATE_PAIRS.map(async ([fromCurrency, toCurrency]) => getRateDetails(fromCurrency, toCurrency))
  );

  return settled
    .filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof getRateDetails>>> => result.status === 'fulfilled')
    .map(({ value }) => ({
      fromCurrency: value.fromCurrency,
      toCurrency: value.toCurrency,
      rate: value.rate.toString(),
      midMarketRate: value.midMarketRate.toString(),
      spread: value.spread.toString(),
      provider: value.provider,
      isLive: value.isLive,
      fetchedAt: value.fetchedAt.toISOString(),
      ageSeconds: value.ageSeconds,
    }));
}

export function clearRateCache(): void {
  rateCache.clear();
}

export async function refreshAllRates(options?: { manual?: boolean }): Promise<{
  total: number;
  success: number;
  failed: number;
}> {
  if (options?.manual) {
    clearRateCache();
  }

  const settled = await Promise.allSettled(
    RATE_PAIRS.map(async ([fromCurrency, toCurrency]) => {
      const refreshed = await fetchLiveRate(fromCurrency, toCurrency);
      console.log(`[rates] refreshed ${fromCurrency}->${toCurrency} via ${refreshed.provider} (${refreshed.rate.toString()})`);
      return refreshed;
    })
  );

  const success = settled.filter((result) => result.status === 'fulfilled').length;
  const failed = settled.length - success;

  if (failed === settled.length) {
    const details = settled
      .map((result, index) => {
        if (result.status === 'rejected') {
          const [fromCurrency, toCurrency] = RATE_PAIRS[index];
          const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
          return `${fromCurrency}->${toCurrency}: ${reason}`;
        }
        return null;
      })
      .filter(Boolean)
      .join('\n');

    try {
      await sendRateProvidersOutageEmail(env.ADMIN_EMAIL, details || 'All pair refreshes failed');
    } catch (alertError) {
      console.error('[rates] failed to send outage alert email:', alertError);
    }
  }

  console.log(`[rates] refresh completed: ${success}/${settled.length} succeeded`);

  return {
    total: settled.length,
    success,
    failed,
  };
}

export async function getRatesHealth(): Promise<{
  providers: Record<string, { healthy: boolean; lastSuccessAt: string | null; lastError: string | null }>;
  cache: { size: number; oldestAgeSeconds: number | null; newestAgeSeconds: number | null };
}> {
  const now = Date.now();
  const ages = Array.from(rateCache.values()).map((entry) => Math.floor((now - entry.fetchedAt.getTime()) / 1000));

  return {
    providers: {
      'exchangerate-api': {
        healthy: providerHealth['exchangerate-api'].healthy,
        lastSuccessAt: providerHealth['exchangerate-api'].lastSuccessAt?.toISOString() || null,
        lastError: providerHealth['exchangerate-api'].lastError,
      },
      frankfurter: {
        healthy: providerHealth.frankfurter.healthy,
        lastSuccessAt: providerHealth.frankfurter.lastSuccessAt?.toISOString() || null,
        lastError: providerHealth.frankfurter.lastError,
      },
    },
    cache: {
      size: rateCache.size,
      oldestAgeSeconds: ages.length ? Math.max(...ages) : null,
      newestAgeSeconds: ages.length ? Math.min(...ages) : null,
    },
  };
}
