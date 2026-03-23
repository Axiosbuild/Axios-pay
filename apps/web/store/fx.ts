'use client';

import { create } from 'zustand';

type Rate = { baseCurrency: string; quoteCurrency: string; mid: number; bid?: number; ask?: number; spread?: number };

type FXState = {
  rates: Record<string, Rate>;
  connected: boolean;
  setRates: (rates: Rate[]) => void;
  setConnected: (connected: boolean) => void;
};

export const useFXStore = create<FXState>((set) => ({
  rates: {},
  connected: false,
  setRates: (rates) =>
    set({
      rates: Object.fromEntries(rates.map((r) => [`${r.baseCurrency}:${r.quoteCurrency}`, r])),
    }),
  setConnected: (connected) => set({ connected }),
}));
