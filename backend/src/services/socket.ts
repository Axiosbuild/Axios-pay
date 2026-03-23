import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';

type SocketUser = { userId: string; email?: string };

declare module 'socket.io' {
  interface Socket {
    user?: SocketUser;
  }
}

export function setupSocketHandlers(io: Server) {
  io.use((socket, next) => {
    try {
      const token = String(socket.handshake.auth?.token || '');
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as jwt.JwtPayload;
      socket.user = { userId: String(payload.userId), email: String(payload.email || '') };
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    if (socket.user?.userId) socket.join(`user:${socket.user.userId}`);
    socket.on('subscribe:rates', () => socket.join('rates'));
  });

  setInterval(() => {
    io.to('rates').emit('rates:updated', {
      rates: [
        { baseCurrency: 'NGN', quoteCurrency: 'KES', mid: 0.0912, bid: 0.0908, ask: 0.0915, spread: 0.0007 },
        { baseCurrency: 'KES', quoteCurrency: 'GHS', mid: 0.1129, bid: 0.1122, ask: 0.1136, spread: 0.0014 },
      ],
      updatedAt: new Date().toISOString(),
    });
  }, 60000);
}
