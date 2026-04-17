'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface LiveRate {
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  midMarketRate: string;
  spread: string;
  provider: string;
  isLive: boolean;
  fetchedAt: string;
  ageSeconds: number;
}

interface RatesResponse {
  rates: LiveRate[];
  count: number;
  fetchedAt: string;
}

export function useRates() {
  const query = useQuery({
    queryKey: ['rates'],
    queryFn: () => api.rates.getAll().then((response) => response.data as RatesResponse),
    refetchInterval: 60_000,
    staleTime: 60_000,
  });

  const rates = query.data?.rates ?? [];
  const lastUpdated = query.data?.fetchedAt ?? null;

  const isStale = useMemo(() => {
    if (!rates.length) return true;
    return rates.some((rate) => rate.ageSeconds > 600);
  }, [rates]);

  const getRate = (from: string, to: string): LiveRate | undefined =>
    rates.find((rate) => rate.fromCurrency === from && rate.toCurrency === to);

  return {
    ...query,
    rates,
    lastUpdated,
    isStale,
    getRate,
  };
}
