'use client';

import { useEffect, useState } from 'react';
import { CountryConfig, DEFAULT_COUNTRY, PILOT_COUNTRIES } from '@/lib/countries';

export function useCountryDetect() {
  const [detected, setDetected] = useState<CountryConfig>(DEFAULT_COUNTRY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) })
      .then((response) => response.json())
      .then((data: { country_code?: string }) => {
        const match = PILOT_COUNTRIES.find((country) => country.code === data.country_code);
        setDetected(match ?? DEFAULT_COUNTRY);
      })
      .catch(() => {
        setDetected(DEFAULT_COUNTRY);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { detected, loading };
}
