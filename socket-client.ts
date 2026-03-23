'use client';

import { io, Socket } from 'socket.io-client';
import { useFXStore, useAuthStore, useNotifStore } from '../store';

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 30000;

export function connectSocket(token: string): void {
  if (socket?.connected) return;

  socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: MAX_RECONNECT_DELAY,
    reconnectionAttempts: Infinity,
  });

  socket.on('connect', () => {
    reconnectAttempts = 0;
    useFXStore.getState().setConnected(true);
    socket!.emit('subscribe:rates');
  });

  socket.on('disconnect', () => {
    useFXStore.getState().setConnected(false);
  });

  socket.on('rates:updated', ({ rates }) => {
    useFXStore.getState().setRates(rates);
  });

  socket.on('transaction:updated', ({ transaction }) => {
    const { addToast } = useNotifStore.getState();
    const statusMessages: Record<string, string> = {
      COMPLETED: 'Transaction completed successfully',
      FAILED: 'Transaction failed',
      PROCESSING: 'Transaction is processing',
    };
    if (statusMessages[transaction?.status]) {
      addToast({
        type: transaction.status === 'COMPLETED' ? 'success' : transaction.status === 'FAILED' ? 'error' : 'info',
        title: statusMessages[transaction.status],
        message: transaction.description,
      });
    }
  });

  socket.on('kyc:status_changed', ({ status }) => {
    const { addToast } = useNotifStore.getState();
    const { updateUser } = useAuthStore.getState();
    updateUser({ kycStatus: status });
    addToast({
      type: status === 'APPROVED' ? 'success' : 'warning',
      title: status === 'APPROVED' ? 'KYC Approved!' : 'KYC Update',
      message: status === 'APPROVED' ? 'Your identity has been verified.' : 'Please check your KYC status.',
    });
  });

  socket.on('wallet:updated', ({ currency, amount }) => {
    useNotifStore.getState().addToast({
      type: 'success',
      title: 'Wallet Credited',
      message: `${currency} ${parseFloat(amount).toLocaleString()} added to your wallet.`,
    });
  });
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}
