import crypto from 'crypto';

export type InterswitchSignatureMethod = 'SHA-256' | 'SHA-512';

const HASH_ALGORITHM_BY_METHOD: Record<InterswitchSignatureMethod, 'sha256' | 'sha512'> = {
  'SHA-256': 'sha256',
  'SHA-512': 'sha512',
};

export function generateInterswitchSignature(
  amount: number,
  reference: string,
  destAccount: string,
  secretKey: string,
  method: InterswitchSignatureMethod = 'SHA-512'
): string {
  const signaturePayload = `${amount}${reference}${destAccount}${secretKey}`;
  return crypto
    .createHash(HASH_ALGORITHM_BY_METHOD[method])
    .update(signaturePayload, 'utf8')
    .digest('hex');
}
