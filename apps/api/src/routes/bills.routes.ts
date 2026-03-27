import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { requireAuth, type AuthRequest } from '../middleware/auth.middleware';
import * as billsService from '../services/bills.service';

const router = Router();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: { error: 'RATE_LIMIT', message: 'Too many requests. Try again later.' },
});

const airtimeSchema = z.object({
  phoneNumber: z.string().regex(/^\d{10,15}$/),
  amount: z.number().positive().min(50).max(50000),
  network: z.enum(['MTN', 'Airtel', 'Glo', '9mobile']),
});

const validateSchema = z.object({
  billerId: z.string().min(1),
  customerId: z.string().min(1),
});

const paySchema = z.object({
  categoryId: z.string().min(1),
  billerId: z.string().min(1),
  customerId: z.string().min(1),
  amount: z.number().positive(),
});

router.use(apiLimiter);
router.use(requireAuth);

router.post('/airtime', async (req: AuthRequest, res, next) => {
  try {
    const data = airtimeSchema.parse(req.body);
    const result = await billsService.rechargeAirtime(
      req.userId!,
      data.phoneNumber,
      data.amount,
      data.network,
      req.header('X-Pin-Token') || undefined
    );
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
});

router.get('/categories', (_req, res) => {
  res.json(billsService.getBillCategories());
});

router.get('/billers/:categoryId', async (req, res, next) => {
  try {
    const result = await billsService.getBillers(req.params.categoryId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/validate', async (req, res, next) => {
  try {
    const data = validateSchema.parse(req.body);
    const result = await billsService.validateCustomer(data.billerId, data.customerId);
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
});

router.post('/pay', async (req: AuthRequest, res, next) => {
  try {
    const data = paySchema.parse(req.body);
    const result = await billsService.payBill(req.userId!, data, req.header('X-Pin-Token') || undefined);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
});

export default router;
