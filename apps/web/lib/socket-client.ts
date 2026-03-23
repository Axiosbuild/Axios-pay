'use client';

import { io, Socket } from 'socket.io-client';
import { useFXStore } from '@/store/fx';

let socket: Socket | null = null;

export function connectRatesSocket(token?: string) {
  if (socket?.connected) return socket;

  socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
    auth: token ? { token } : undefined,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 30000,
    randomizationFactor: 0.5,
  });

  socket.on('connect', () => {
    useFXStore.getState().setConnected(true);
    socket?.emit('subscribe:rates');
  });

  socket.on('disconnect', () => {
    useFXStore.getState().setConnected(false);
  });

  socket.on('rates:updated', ({ rates }) => {
    useFXStore.getState().setRates(rates || []);
  });

  return socket;
}

export function disconnectRatesSocket() {
  socket?.disconnect();
  socket = null;
}
