import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export interface AccessTokenPayload {
  userId: string;
  email: string;
  kycTier: number;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  family: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
    issuer: 'axios-pay',
    audience: 'axios-pay-client',
  });
}

export function signRefreshToken(userId: string, sessionId: string): string {
  const family = uuidv4();
  return jwt.sign(
    { userId, sessionId, family } as RefreshTokenPayload,
    process.env.JWT_REFRESH_SECRET!,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRY || '30d',
      issuer: 'axios-pay',
    }
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET!, {
    issuer: 'axios-pay',
    audience: 'axios-pay-client',
  }) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!, {
    issuer: 'axios-pay',
  }) as RefreshTokenPayload;
}

export function getRefreshTokenExpiry(): Date {
  const days = parseInt((process.env.JWT_REFRESH_EXPIRY || '30d').replace('d', ''), 10);
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry;
}
