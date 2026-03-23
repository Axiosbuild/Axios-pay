import { Router, Response } from 'express';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { interswitchService } from '../services/interswitch.service';
import { prisma } from '../lib/prisma';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const kycRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authenticate);
router.use(kycRateLimit);

const uploadSchema = z.object({
  documentType: z.enum(['BVN', 'NIN', 'PASSPORT', 'DRIVERS_LICENSE']),
  documentNumber: z.string().min(5),
});

router.post('/documents', upload.single('document'), async (req: AuthRequest, res: Response) => {
  try {
    const requestWithFile = req as AuthRequest & { file?: { originalname: string; mimetype: string; size: number } };
    const { documentType, documentNumber } = uploadSchema.parse(req.body);

    if (!requestWithFile.file) {
      res.status(400).json({ error: 'Document file is required' });
      return;
    }

    let verificationResult: Record<string, unknown>;
    if (documentType === 'BVN') verificationResult = await interswitchService.verifyBVN(documentNumber);
    else if (documentType === 'NIN') verificationResult = await interswitchService.verifyNIN(documentNumber);
    else if (documentType === 'PASSPORT') verificationResult = await interswitchService.verifyPassport(documentNumber);
    else verificationResult = await interswitchService.verifyDriversLicense(documentNumber);

    const verified = Boolean((verificationResult as { verified?: boolean }).verified ?? true);
    const tierMap: Record<string, number> = { BVN: 1, NIN: 2, PASSPORT: 2, DRIVERS_LICENSE: 2 };

    const [document] = await prisma.$transaction([
      prisma.kycDocument.create({
        data: {
          userId: req.user!.userId,
          documentType,
          documentNumber,
          status: verified ? 'PENDING' : 'REJECTED',
          fileName: requestWithFile.file.originalname,
          mimeType: requestWithFile.file.mimetype,
          size: requestWithFile.file.size,
          verificationData: verificationResult,
          kycTier: tierMap[documentType],
        },
      }),
      prisma.user.update({
        where: { id: req.user!.userId },
        data: {
          kycStatus: verified ? 'PENDING_REVIEW' : 'REJECTED',
          kycTier: verified ? tierMap[documentType] : 0,
        },
      }),
    ]);

    res.status(201).json({ document, verificationResult, kycTier: verified ? tierMap[documentType] : 0 });
  } catch (error) {
    res.status(400).json({ error: 'KYC upload failed', details: error });
  }
});

router.get('/status', async (req: AuthRequest, res: Response) => {
  const [user, documents] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.user!.userId }, select: { kycStatus: true, kycTier: true } }),
    prisma.kycDocument.findMany({ where: { userId: req.user!.userId }, orderBy: { createdAt: 'desc' } }),
  ]);

  res.json({
    status: user?.kycStatus || 'UNVERIFIED',
    tier: user?.kycTier || 0,
    documents,
  });
});

router.post('/facial-compare', upload.fields([{ name: 'selfie', maxCount: 1 }, { name: 'documentPhoto', maxCount: 1 }]), async (req: AuthRequest, res: Response) => {
  try {
    const files = (req as AuthRequest & { files?: Record<string, Array<{ buffer: Buffer }>> }).files;
    const selfie = files?.selfie?.[0];
    const documentPhoto = files?.documentPhoto?.[0];

    if (!selfie || !documentPhoto) {
      res.status(400).json({ error: 'selfie and documentPhoto are required' });
      return;
    }

    const result = await interswitchService.facialCompare(selfie.buffer, documentPhoto.buffer);

    await prisma.kycFacialCheck.create({
      data: {
        userId: req.user!.userId,
        passed: Boolean((result as { matched?: boolean }).matched),
        similarityScore: Number((result as { similarityScore?: number }).similarityScore || 0),
        metadata: result,
      },
    });

    res.json({ result });
  } catch (error) {
    res.status(400).json({ error: 'Facial compare failed', details: error });
  }
});

export default router;
