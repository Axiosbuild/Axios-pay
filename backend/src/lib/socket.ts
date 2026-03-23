import { Server as HTTPServer } from 'http';
import { Server } from 'socket.io';
import { setupSocketHandlers } from '../services/socket';

export function createSocketServer(httpServer: HTTPServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || '*',
      credentials: true,
    },
  });

  setupSocketHandlers(io);
  return io;
}
