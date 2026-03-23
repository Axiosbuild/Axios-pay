import { NextFunction, Request, Response } from 'express';

export type AuthRequest = Request & {
  user?: { userId: string; email?: string; kycTier?: number };
};

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  req.user = req.user || {
    userId: String(req.headers['x-user-id'] || 'demo-user'),
    email: String(req.headers['x-user-email'] || 'demo@axiospay.africa'),
    kycTier: 1,
  };
  next();
}
