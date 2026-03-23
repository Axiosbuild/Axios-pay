import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../lib/api-client';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  kycStatus: string;
  kycTier: number;
  twoFactorEnabled: boolean;
}

interface Wallet {
  id: string;
  currency: string;
  balance: string;
  lockedBalance: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  wallets: Wallet[];
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setWallets: (wallets: Wallet[]) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      wallets: [],
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        set({ user, accessToken, refreshToken, isAuthenticated: true });
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      },

      setWallets: (wallets) => set({ wallets }),

      updateUser: (updates) =>
        set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null, wallets: [], isAuthenticated: false });
        delete apiClient.defaults.headers.common['Authorization'];
        if (typeof window !== 'undefined') window.location.href = '/auth/login';
      },
    }),
    {
      name: 'axios-pay-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// FX Store
interface RateData {
  baseCurrency: string;
  quoteCurrency: string;
  mid: number;
  bid: number;
  ask: number;
  spread: number;
  change24h?: number;
}

interface FXQuote {
  quoteId: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  fee: number;
  feePercent: number;
  expiresAt: string;
  expiresInSeconds: number;
}

interface FXState {
  rates: Record<string, RateData>;
  activeQuote: FXQuote | null;
  lastUpdated: Date | null;
  isConnected: boolean;
  setRates: (rates: RateData[]) => void;
  setActiveQuote: (quote: FXQuote | null) => void;
  setConnected: (connected: boolean) => void;
  getRate: (from: string, to: string) => RateData | null;
}

export const useFXStore = create<FXState>((set, get) => ({
  rates: {},
  activeQuote: null,
  lastUpdated: null,
  isConnected: false,

  setRates: (rates) => {
    const rateMap: Record<string, RateData> = {};
    for (const rate of rates) {
      rateMap[`${rate.baseCurrency}:${rate.quoteCurrency}`] = rate;
    }
    set({ rates: rateMap, lastUpdated: new Date() });
  },

  setActiveQuote: (quote) => set({ activeQuote: quote }),
  setConnected: (isConnected) => set({ isConnected }),

  getRate: (from, to) => {
    return get().rates[`${from}:${to}`] || null;
  },
}));

// Notification store
interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface NotifState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useNotifStore = create<NotifState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 5000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
