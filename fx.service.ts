import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { setCache, getCache, setQuote } from '../lib/redis';
import { logger } from '../lib/logger';

export interface FXQuote {
  quoteId: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  fee: number;
  feePercent: number;
  spread: number;
  expiresAt: Date;
  expiresInSeconds: number;
}

export interface RateData {
  baseCurrency: string;
  quoteCurrency: string;
  bid: number;
  ask: number;
  mid: number;
  spread: number;
  source: string;
}

// Supported corridors
export const SUPPORTED_CURRENCIES = ['NGN', 'GHS', 'KES', 'ZAR', 'UGX', 'TZS', 'RWF', 'XOF', 'USD', 'EUR', 'GBP'];

export const CURRENCY_INFO: Record<string, { name: string; symbol: string; flag: string; country: string }> = {
  NGN: { name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬', country: 'Nigeria' },
  GHS: { name: 'Ghanaian Cedi', symbol: '₵', flag: '🇬🇭', country: 'Ghana' },
  KES: { name: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪', country: 'Kenya' },
  ZAR: { name: 'South African Rand', symbol: 'R', flag: '🇿🇦', country: 'South Africa' },
  UGX: { name: 'Ugandan Shilling', symbol: 'USh', flag: '🇺🇬', country: 'Uganda' },
  TZS: { name: 'Tanzanian Shilling', symbol: 'TSh', flag: '🇹🇿', country: 'Tanzania' },
  RWF: { name: 'Rwandan Franc', symbol: 'RF', flag: '🇷🇼', country: 'Rwanda' },
  XOF: { name: 'West African CFA', symbol: 'CFA', flag: '🌍', country: 'West Africa' },
  USD: { name: 'US Dollar', symbol: '$', flag: '🇺🇸', country: 'United States' },
  EUR: { name: 'Euro', symbol: '€', flag: '🇪🇺', country: 'Europe' },
  GBP: { name: 'British Pound', symbol: '£', flag: '🇬🇧', country: 'United Kingdom' },
};

class FXService {
  // Calculate dynamic spread based on amount and corridor
  private calculateSpread(fromCurrency: string, toCurrency: string, amount: number): number {
    const baseSpread = 0.008; // 0.8%
    const maxSpread = 0.025; // 2.5%

    // Tighter spread for larger amounts
    if (amount > 1000000) return baseSpread;
    if (amount > 100000) return baseSpread + 0.002;
    if (amount > 10000) return baseSpread + 0.004;

    // Higher spread for exotic corridors
    const exoticPairs = ['RWF', 'XOF', 'TZS'];
    if (exoticPairs.includes(fromCurrency) || exoticPairs.includes(toCurrency)) {
      return Math.min(baseSpread + 0.007, maxSpread);
    }

    return baseSpread + 0.005;
  }

  // Fetch rates from Open Exchange Rates, cache in Redis
  async refreshRates(): Promise<void> {
    try {
      const appId = process.env.OPEN_EXCHANGE_APP_ID;
      if (!appId) {
        logger.warn('No Open Exchange Rates API key, using fallback rates');
        await this.storeFallbackRates();
        return;
      }

      const res = await axios.get(`https://openexchangerates.org/api/latest.json?app_id=${appId}&symbols=${SUPPORTED_CURRENCIES.join(',')}`);
      const rates: Record<string, number> = res.data.rates;

      for (const base of SUPPORTED_CURRENCIES) {
        for (const quote of SUPPORTED_CURRENCIES) {
          if (base === quote) continue;
          if (!rates[base] || !rates[quote]) continue;

          const mid = rates[quote] / rates[base];
          const spread = this.calculateSpread(base, quote, 50000);
          const bid = mid * (1 - spread / 2);
          const ask = mid * (1 + spread / 2);

          const rateData: RateData = {
            baseCurrency: base,
            quoteCurrency: quote,
            bid: parseFloat(bid.toFixed(8)),
            ask: parseFloat(ask.toFixed(8)),
            mid: parseFloat(mid.toFixed(8)),
            spread,
            source: 'OPEN_EXCHANGE_RATES',
          };

          await setCache(`rate:${base}:${quote}`, rateData, 90);

          await prisma.fXRate.upsert({
            where: { baseCurrency_quoteCurrency: { baseCurrency: base, quoteCurrency: quote } },
            update: { bid: bid.toFixed(8), ask: ask.toFixed(8), mid: mid.toFixed(8), spread, validUntil: new Date(Date.now() + 90000) },
            create: { baseCurrency: base, quoteCurrency: quote, bid: bid.toFixed(8), ask: ask.toFixed(8), mid: mid.toFixed(8), spread, source: 'OPEN_EXCHANGE_RATES', validUntil: new Date(Date.now() + 90000) },
          });
        }
      }

      logger.info('FX rates refreshed successfully');
    } catch (err) {
      logger.error('Failed to refresh FX rates', { error: err });
      await this.storeFallbackRates();
    }
  }

  // Fallback rates for demo/development
  private async storeFallbackRates(): Promise<void> {
    const usdRates: Record<string, number> = {
      NGN: 1580, GHS: 14.5, KES: 129, ZAR: 18.8,
      UGX: 3850, TZS: 2560, RWF: 1290, XOF: 610,
      USD: 1, EUR: 0.92, GBP: 0.79,
    };

    for (const base of SUPPORTED_CURRENCIES) {
      for (const quote of SUPPORTED_CURRENCIES) {
        if (base === quote) continue;
        const mid = usdRates[quote] / usdRates[base];
        const spread = this.calculateSpread(base, quote, 50000);

        await setCache(`rate:${base}:${quote}`, {
          baseCurrency: base,
          quoteCurrency: quote,
          bid: mid * (1 - spread / 2),
          ask: mid * (1 + spread / 2),
          mid,
          spread,
          source: 'FALLBACK',
        }, 300);
      }
    }
  }

  async getRate(from: string, to: string): Promise<RateData | null> {
    const cached = await getCache<RateData>(`rate:${from}:${to}`);
    if (cached) return cached;

    // Try DB
    const dbRate = await prisma.fXRate.findUnique({
      where: { baseCurrency_quoteCurrency: { baseCurrency: from, quoteCurrency: to } },
    });

    if (dbRate && dbRate.validUntil > new Date()) {
      return {
        baseCurrency: from,
        quoteCurrency: to,
        bid: parseFloat(dbRate.bid.toString()),
        ask: parseFloat(dbRate.ask.toString()),
        mid: parseFloat(dbRate.mid.toString()),
        spread: parseFloat(dbRate.spread.toString()),
        source: dbRate.source,
      };
    }

    await this.refreshRates();
    return getCache<RateData>(`rate:${from}:${to}`);
  }

  async getAllRates(): Promise<RateData[]> {
    const rates: RateData[] = [];
    const pairs = [
      ['NGN', 'USD'], ['NGN', 'UGX'], ['NGN', 'GHS'], ['NGN', 'KES'],
      ['KES', 'UGX'], ['GHS', 'NGN'], ['ZAR', 'NGN'], ['ZAR', 'KES'],
      ['USD', 'NGN'], ['USD', 'GHS'], ['USD', 'KES'], ['USD', 'ZAR'],
    ];

    for (const [from, to] of pairs) {
      const rate = await this.getRate(from, to);
      if (rate) rates.push(rate);
    }

    return rates;
  }

  async generateQuote(
    fromCurrency: string,
    toCurrency: string,
    fromAmount: number,
    direction: 'send' | 'receive' = 'send'
  ): Promise<FXQuote> {
    const rate = await this.getRate(fromCurrency, toCurrency);
    if (!rate) throw new Error(`No rate available for ${fromCurrency}/${toCurrency}`);

    const spread = this.calculateSpread(fromCurrency, toCurrency, fromAmount);
    const feePercent = Math.max(0.008, spread - 0.002);

    let actualFromAmount = fromAmount;
    let actualToAmount: number;

    if (direction === 'send') {
      const fee = fromAmount * feePercent;
      const netAmount = fromAmount - fee;
      actualToAmount = netAmount * rate.mid;
    } else {
      const grossFrom = fromAmount / rate.mid;
      actualFromAmount = grossFrom / (1 - feePercent);
      actualToAmount = fromAmount;
    }

    const fee = actualFromAmount * feePercent;
    const expiresAt = new Date(Date.now() + 30000);

    const quote: FXQuote = {
      quoteId: uuidv4(),
      fromCurrency,
      toCurrency,
      fromAmount: parseFloat(actualFromAmount.toFixed(2)),
      toAmount: parseFloat(actualToAmount.toFixed(2)),
      rate: parseFloat(rate.mid.toFixed(8)),
      fee: parseFloat(fee.toFixed(2)),
      feePercent: parseFloat((feePercent * 100).toFixed(2)),
      spread,
      expiresAt,
      expiresInSeconds: 30,
    };

    await setQuote(quote.quoteId, quote);
    return quote;
  }
}

export const fxService = new FXService();
