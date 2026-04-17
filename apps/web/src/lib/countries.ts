export interface CountryConfig {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  flag: string;
  phonePrefix: string;
  interswitchEnv: 'supported' | 'partial' | 'coming_soon';
}

export const PILOT_COUNTRIES: CountryConfig[] = [
  {
    code: 'NG',
    name: 'Nigeria',
    currency: 'NGN',
    currencySymbol: '₦',
    flag: '🇳🇬',
    phonePrefix: '+234',
    interswitchEnv: 'supported',
  },
  {
    code: 'KE',
    name: 'Kenya',
    currency: 'KES',
    currencySymbol: 'KSh',
    flag: '🇰🇪',
    phonePrefix: '+254',
    interswitchEnv: 'partial',
  },
  {
    code: 'UG',
    name: 'Uganda',
    currency: 'UGX',
    currencySymbol: 'USh',
    flag: '🇺🇬',
    phonePrefix: '+256',
    interswitchEnv: 'partial',
  },
  {
    code: 'GH',
    name: 'Ghana',
    currency: 'GHS',
    currencySymbol: 'GH₵',
    flag: '🇬🇭',
    phonePrefix: '+233',
    interswitchEnv: 'partial',
  },
  {
    code: 'SA',
    name: 'South Africa',
    currency: 'ZAR',
    currencySymbol: 'R',
    flag: '🇿🇦',
    phonePrefix: '+27',
    interswitchEnv: 'coming_soon',
  },
];

export const DEFAULT_COUNTRY = PILOT_COUNTRIES[0];

export function getCountryByCode(code: string): CountryConfig {
  return PILOT_COUNTRIES.find((country) => country.code === code) ?? DEFAULT_COUNTRY;
}

export function getCountryByCurrency(currency: string): CountryConfig {
  return PILOT_COUNTRIES.find((country) => country.currency === currency) ?? DEFAULT_COUNTRY;
}
