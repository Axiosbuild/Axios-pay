import { CURRENCY_META, DEFAULT_CORRIDOR_RATES, SUPPORTED_CORRIDORS, type CurrencyCode } from '@/lib/currencies';

export type CorridorTab = CurrencyCode;

export type CurrencyOption = {
  code: CurrencyCode;
  flag: string;
  label: string;
};

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'NGN', flag: CURRENCY_META.NGN.flag, label: 'Nigerian Naira' },
  { code: 'UGX', flag: CURRENCY_META.UGX.flag, label: 'Ugandan Shilling' },
  { code: 'KES', flag: CURRENCY_META.KES.flag, label: 'Kenyan Shilling' },
  { code: 'GHS', flag: CURRENCY_META.GHS.flag, label: 'Ghanaian Cedi' },
  { code: 'ZAR', flag: CURRENCY_META.ZAR.flag, label: 'South African Rand' },
];

export const QUICK_SWAP_DEFAULTS = {
  sendCurrency: 'NGN' as CurrencyCode,
  receiveCurrency: 'KES' as CurrencyCode,
  sendAmount: 250000,
};

export const LIVE_TICKER_PAIRS = [
  { pair: '🇳🇬 NGN / 🇰🇪 KES', rate: '0.084', trend: 'up' as const, label: 'LIVE' },
  { pair: '🇺🇬 UGX / 🇿🇦 ZAR', rate: '0.0047', trend: 'down' as const, label: 'LIVE' },
  { pair: '🇰🇪 KES / 🇬🇭 GHS', rate: '0.072', trend: 'up' as const, label: 'LIVE' },
  { pair: '🇬🇭 GHS / 🇳🇬 NGN', rate: '47.60', trend: 'up' as const, label: 'LIVE' },
  { pair: '🇿🇦 ZAR / 🇺🇬 UGX', rate: '208.00', trend: 'down' as const, label: 'LIVE' },
  { pair: '🇳🇬 NGN / 🇿🇦 ZAR', rate: '0.052', trend: 'up' as const, label: 'LIVE' },
];

export const HOW_IT_WORKS_STEPS = [
  {
    title: 'Deposit',
    description: 'Add funds with a secure card payment or bank transfer in minutes.',
    icon: 'CreditCard',
  },
  {
    title: 'Swap',
    description: 'Convert currencies at transparent live rates with a flat 1.5% fee.',
    icon: 'RefreshCw',
  },
  {
    title: 'Travel',
    description: 'Move with money ready for the market you’re landing in.',
    icon: 'Plane',
  },
  {
    title: 'Spend',
    description: 'Pay local bills, send money, and spend like a local on arrival.',
    icon: 'Smartphone',
  },
] as const;

export const TRUST_METRICS = [
  {
    label: '5 Currencies',
    value: 'NGN, UGX, KES, GHS, ZAR',
  },
  {
    label: '1.5% Flat Fee',
    value: 'No hidden charges, ever',
  },
  {
    label: 'Instant Settlement',
    value: 'Swap completes in seconds',
  },
] as const;

export const CORRIDOR_TABS = CURRENCY_OPTIONS.map((currency) => currency.code);

export const CORRIDOR_ROWS = SUPPORTED_CORRIDORS.map(({ from, to }) => ({
  from,
  to,
  rate: DEFAULT_CORRIDOR_RATES[`${from}-${to}`] ?? '-',
}));
