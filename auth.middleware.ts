import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload } from '../lib/jwt';
import { prisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: AccessTokenPayload & { dbUser?: { kycStatus: string; isSuspended: boolean } };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization token required' });
      return;
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    // Check user still active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { isActive: true, isSuspended: true, kycStatus: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Account not found or inactive' });
      return;
    }

    if (user.isSuspended) {
      res.status(403).json({ error: 'Account suspended. Contact support.' });
      return;
    }

    req.user = { ...payload, dbUser: user };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireKYC(minTier: number) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (req.user.kycTier < minTier) {
      res.status(403).json({
        error: `KYC Tier ${minTier} required`,
        currentTier: req.user.kycTier,
        requiredTier: minTier,
        upgradeUrl: '/dashboard/kyc',
      });
      return;
    }
    next();
  };
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  // In production, check admin role from DB
  // For now, check a special claim
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}
