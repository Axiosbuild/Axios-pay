import { Request, Response, NextFunction } from 'express';
import { verifyWebhookSignature } from '../services/interswitch.service';
import { completeDeposit } from '../services/wallet.service';
import { prisma } from '../config/prisma';
import { creditWallet } from '../services/walletService';

export async function interswitchWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const signature = req.headers['x-interswitch-signature'] as string || '';
    const rawBody: Buffer = (req as Request & { rawBody?: Buffer }).rawBody || Buffer.from(JSON.stringify(req.body));
    const payload =
      typeof req.body === 'object' && !Buffer.isBuffer(req.body)
        ? (req.body as Record<string, unknown>)
        : (JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>);

    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.error('Invalid Interswitch webhook signature');
      res.status(200).json({ message: 'OK' });
      return;
    }

    const { responseCode, transactionReference, paymentStatus, status } = payload as {
      responseCode?: string;
      transactionReference?: string;
      paymentStatus?: string;
      status?: string;
    };
    const normalizedStatus = (paymentStatus || status || '').toUpperCase();

    const isSuccess = responseCode === '00' || normalizedStatus === 'PAID';

    if (isSuccess && transactionReference) {
      await completeDeposit(transactionReference);

      const transaction = await prisma.transaction.findUnique({
        where: { reference: transactionReference },
      });

      if (transaction && transaction.status === 'PENDING') {
        await prisma.transaction.update({
          where: { reference: transactionReference },
          data: { status: 'COMPLETED' },
        });
        await creditWallet(
          transaction.userId,
          transaction.toCurrency as 'NGN' | 'KES' | 'UGX' | 'GHS' | 'ZAR',
          Number(transaction.toAmount)
        );
        console.log(
          `[Webhook] Wallet credited: ${transaction.userId} +${Number(transaction.toAmount)} ${transaction.toCurrency}`
        );
      }
    }

    res.status(200).json({ message: 'OK' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(200).json({ message: 'OK' }); // Always return 200
  }
}
