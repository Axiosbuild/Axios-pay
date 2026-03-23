import { createHmac, timingSafeEqual } from 'crypto';
import { Router, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { prisma } from '../lib/prisma';

const router = Router();
const webhooksRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(webhooksRateLimit);

function verifyPaystackSignature(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha512', secret).update(payload).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const providedBuffer = Buffer.from(signature || '', 'utf8');

  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

router.post('/paystack', async (req: Request, res: Response) => {
  const signature = String(req.headers['x-paystack-signature'] || '');
  const payload = JSON.stringify(req.body || {});

  if (!verifyPaystackSignature(payload, signature, process.env.PAYSTACK_WEBHOOK_SECRET || '')) {
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  const event = req.body;
  if (event?.event !== 'charge.success') {
    res.json({ received: true, ignored: true });
    return;
  }

  const reference = String(event?.data?.reference || '');
  const providerReference = `paystack:${reference}`;
  if (!reference) {
    res.status(400).json({ error: 'Missing reference' });
    return;
  }

  const existing = await prisma.webhookEvent.findUnique({ where: { providerReference } });
  if (existing) {
    res.json({ received: true, idempotent: true });
    return;
  }

  const amount = Number(event?.data?.amount || 0) / 100;
  const currency = String(event?.data?.currency || 'NGN');
  const userId = String(event?.data?.metadata?.userId || '');

  await prisma.$transaction(async (tx: typeof prisma) => {
    await tx.webhookEvent.create({
      data: {
        provider: 'PAYSTACK',
        providerReference,
        payload: event,
      },
    });

    await tx.wallet.updateMany({
      where: { userId, currency, isActive: true },
      data: { balance: { increment: amount } },
    });
  });

  res.json({ received: true, credited: true });
});

router.post('/flutterwave', async (req: Request, res: Response) => {
  const signature = String(req.headers['x-flw-signature'] || '');
  const expected = process.env.FLUTTERWAVE_WEBHOOK_SECRET || '';

  if (!signature || signature !== expected) {
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  res.json({ received: true });
});

export default router;
