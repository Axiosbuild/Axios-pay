import Decimal from 'decimal.js';
import { prisma } from '../config/prisma';
import { chargeToken } from './interswitch.service';
import { sendRecurringDepositFailedEmail } from './email.service';

function computeNextRunAt(current: Date, frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'): Date {
  const next = new Date(current);
  if (frequency === 'DAILY') next.setDate(next.getDate() + 1);
  if (frequency === 'WEEKLY') next.setDate(next.getDate() + 7);
  if (frequency === 'MONTHLY') next.setMonth(next.getMonth() + 1);
  return next;
}

export async function processRecurring(): Promise<void> {
  const due = await prisma.recurringDeposit.findMany({
    where: {
      isActive: true,
      nextRunAt: { lte: new Date() },
    },
    include: {
      user: {
        select: {
          id: true,
          cardToken: true,
          email: true,
          firstName: true,
        },
      },
    },
  });

  for (const item of due) {
    if (!item.user.cardToken) {
      await sendRecurringDepositFailedEmail(item.user.email, item.user.firstName);
      continue;
    }

    const amount = new Decimal(item.amount.toString());
    try {
      const charge = await chargeToken(item.user.id, amount.toNumber(), item.user.cardToken);
      if (!charge.success) throw new Error('RECURRING_FAILED');

      await prisma.$transaction(async (db) => {
        await db.wallet.upsert({
          where: { userId_currency: { userId: item.userId, currency: 'NGN' } },
          create: { userId: item.userId, currency: 'NGN', balance: amount.toNumber() },
          update: { balance: { increment: amount.toNumber() } },
        });
        await db.transaction.create({
          data: {
            userId: item.userId,
            type: 'DEPOSIT',
            status: 'COMPLETED',
            fromCurrency: 'NGN',
            toCurrency: 'NGN',
            fromAmount: amount,
            toAmount: amount,
            exchangeRate: new Decimal(1),
            fee: new Decimal(0),
            reference: charge.reference,
            narration: 'Recurring deposit',
          },
        });
        await db.recurringDeposit.update({
          where: { id: item.id },
          data: { nextRunAt: computeNextRunAt(item.nextRunAt, item.frequency) },
        });
        await db.notification.create({
          data: {
            userId: item.userId,
            type: 'RECURRING',
            message: `Recurring deposit of ₦${amount.toFixed(2)} successful`,
            metadata: { recurringId: item.id, reference: charge.reference },
          },
        });
      });
    } catch {
      await sendRecurringDepositFailedEmail(item.user.email, item.user.firstName);
      await prisma.notification.create({
        data: {
          userId: item.userId,
          type: 'RECURRING',
          message: 'Your recurring deposit failed',
          metadata: { recurringId: item.id },
        },
      });
    }
  }
}
