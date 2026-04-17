import axios from 'axios';

const SUPPORTED_PAIRS = ['NGN', 'KES', 'UGX', 'GHS', 'ZAR'] as const;
type Currency = (typeof SUPPORTED_PAIRS)[number];

let rateCache: Record<string, Record<string, number>> = {};
let cacheExpiry = 0;
const CACHE_TTL = 30 * 60 * 1000;

export async function getExchangeRates(base: Currency = 'NGN'): Promise<Record<string, number>> {
  if (Date.now() < cacheExpiry && rateCache[base]) {
    return rateCache[base];
  }

  try {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    const url = apiKey
      ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${base}`
      : `https://api.frankfurter.app/latest?from=${base}&to=KES,UGX,GHS,ZAR,NGN`;

    const { data } = await axios.get(url);
    const sourceRates = (apiKey ? data.conversion_rates : data.rates) as Record<string, number>;

    const rates: Record<string, number> = { [base]: 1 };
    for (const code of SUPPORTED_PAIRS) {
      if (code === base) {
        rates[code] = 1;
        continue;
      }
      rates[code] = sourceRates[code];
    }

    rateCache[base] = rates;
    cacheExpiry = Date.now() + CACHE_TTL;
    return rates;
  } catch {
    console.error('[FX] Rate fetch failed, using fallback');
    return {
      NGN: 1,
      KES: 0.12,
      UGX: 5.8,
      GHS: 0.018,
      ZAR: 0.021,
    };
  }
}

export async function convertAmount(
  amount: number,
  from: Currency,
  to: Currency
): Promise<{ converted: number; rate: number }> {
  if (from === to) {
    return { converted: amount, rate: 1 };
  }

  const rates = await getExchangeRates(from);
  const rate = rates[to];
  if (!rate) {
    throw new Error(`No rate available for ${from} to ${to}`);
  }

  return {
    converted: Math.round(amount * rate * 100) / 100,
    rate,
  };
}
