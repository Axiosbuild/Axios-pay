'use client';

import { CountryConfig, PILOT_COUNTRIES } from '@/lib/countries';

interface Props {
  value: string;
  onChange: (country: CountryConfig) => void;
  disabled?: boolean;
  label?: string;
  error?: string;
}

export function CountrySelect({ value, onChange, disabled, label, error }: Props) {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label ? <label className="text-sm font-medium text-gray-700">{label}</label> : null}
      <div className="relative">
        <select
          value={value}
          disabled={disabled}
          onChange={(event) => {
            const country = PILOT_COUNTRIES.find((item) => item.code === event.target.value);
            if (country) onChange(country);
          }}
          className={[
            'w-full px-3 py-2 border rounded-lg text-sm appearance-none',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'disabled:bg-gray-50 disabled:cursor-not-allowed',
            error ? 'border-red-400' : 'border-gray-300',
          ].join(' ')}
        >
          {PILOT_COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.flag} {country.name} ({country.currency})
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          ▾
        </div>
      </div>
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

export default CountrySelect;
