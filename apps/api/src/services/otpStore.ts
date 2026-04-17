export interface OtpSession {
  otp: string;
  expiresAt: number;
  customerPhone: string;
  transactionReference: string;
  verified: boolean;
  attempts: number;
}

const store = new Map<string, OtpSession>();

export const MAX_ATTEMPTS = 3;
export const OTP_TTL_MS = 5 * 60 * 1000;

export function saveOtpSession(
  sessionToken: string,
  data: Omit<OtpSession, 'verified' | 'attempts'>
): void {
  store.set(sessionToken, { ...data, verified: false, attempts: 0 });
}

export function saveVerifiedTransferSession(
  transferToken: string,
  data: Omit<OtpSession, 'verified' | 'attempts'>
): void {
  store.set(transferToken, { ...data, verified: true, attempts: 0 });
}

export function getOtpSession(sessionToken: string): OtpSession | undefined {
  return store.get(sessionToken);
}

export function markOtpVerified(sessionToken: string): void {
  const session = store.get(sessionToken);
  if (session) {
    store.set(sessionToken, { ...session, verified: true });
  }
}

export function incrementAttempts(sessionToken: string): number {
  const session = store.get(sessionToken);
  if (!session) return 0;
  const updated = { ...session, attempts: session.attempts + 1 };
  store.set(sessionToken, updated);
  return updated.attempts;
}

export function deleteOtpSession(sessionToken: string): void {
  store.delete(sessionToken);
}

export function isExpired(session: OtpSession): boolean {
  return Date.now() > session.expiresAt;
}
