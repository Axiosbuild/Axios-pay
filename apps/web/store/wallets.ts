'use client';

import { create } from 'zustand';

type Wallet = { id: string; currency: string; balance: string; lockedBalance: string };

type WalletState = {
  wallets: Wallet[];
  setWallets: (wallets: Wallet[]) => void;
};

export const useWalletStore = create<WalletState>((set) => ({
  wallets: [],
  setWallets: (wallets) => set({ wallets }),
}));
