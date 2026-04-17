import crypto from 'crypto';
import axios, { AxiosError } from 'axios';
import { Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { getInterswitchToken } from '../services/interswitchAuth';
import {
  generateInterswitchSignature,
  InterswitchSignatureMethod,
} from '../services/interswitchSignature';

const resolveAccountSchema = z.object({
  bankCode: z.string().trim().min(1),
  accountNumber: z.string().trim().regex(/^\d{6,18}$/),
});

const initiateTransferSchema = z.object({
  amount: z.number().positive(),
  destinationBankCode: z.string().trim().min(1),
  destinationAccountNumber: z.string().trim().regex(/^\d{6,18}$/),
  narration: z.string().trim().min(1).max(200),
});

interface NameEnquiryResponse {
  accountName?: string;
  data?: {
    accountName?: string;
  };
}

interface TransferResponse {
  status?: string;
  responseCode?: string;
  responseMessage?: string;
  transactionId?: string;
  reference?: string;
  data?: Record<string, unknown>;
}

function logInterswitchError(context: string, error: unknown): void {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    console.error(`[InterswitchTransfer] ${context} failed`, {
      status: axiosError.response?.status,
      data: axiosError.response?.data,
      message: axiosError.message,
    });
    return;
  }

  console.error(`[InterswitchTransfer] ${context} failed`, error);
}

export async function resolveAccountName(req: Request, res: Response): Promise<void> {
  const parsed = resolveAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid bankCode or accountNumber supplied',
      details: parsed.error.flatten(),
    });
    return;
  }

  const { bankCode, accountNumber } = parsed.data;

  try {
    const token = await getInterswitchToken();
    const endpoint = `${env.INTERSWITCH_NAME_ENQUIRY_BASE_URL}/banks/${encodeURIComponent(bankCode)}/accounts/${encodeURIComponent(accountNumber)}`;

    const response = await axios.get<NameEnquiryResponse>(endpoint, {
      timeout: 20000,
      headers: {
        Authorization: `Bearer ${token}`,
        TerminalId: env.INTERSWITCH_TERMINAL_ID,
      },
    });

    const accountName = response.data.accountName ?? response.data.data?.accountName;

    if (!accountName) {
      console.error('[InterswitchTransfer] Name enquiry missing accountName', {
        bankCode,
        accountNumber,
        responseData: response.data,
      });
      res.status(502).json({
        error: 'NAME_ENQUIRY_FAILED',
        message: 'Unable to resolve account name from provider response.',
      });
      return;
    }

    res.status(200).json({
      bankCode,
      accountNumber,
      accountName,
    });
  } catch (error) {
    logInterswitchError('Name enquiry', error);

    if (axios.isAxiosError(error) && error.response?.status === 404) {
      res.status(404).json({
        error: 'ACCOUNT_NOT_FOUND',
        message: 'Account not found',
      });
      return;
    }

    res.status(502).json({
      error: 'NAME_ENQUIRY_FAILED',
      message: 'Unable to resolve account name right now.',
    });
  }
}

export async function initiateTransfer(req: Request, res: Response): Promise<void> {
  const parsed = initiateTransferSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid transfer payload',
      details: parsed.error.flatten(),
    });
    return;
  }

  const { amount, destinationBankCode, destinationAccountNumber, narration } = parsed.data;
  const reference = crypto.randomUUID();
  const signatureMethod: InterswitchSignatureMethod = 'SHA-512';

  try {
    const token = await getInterswitchToken();
    const signature = generateInterswitchSignature(
      amount,
      reference,
      destinationAccountNumber,
      env.INTERSWITCH_TRANSFER_SECRET_KEY,
      signatureMethod
    );

    const response = await axios.post<TransferResponse>(
      env.INTERSWITCH_FUNDS_TRANSFER_URL,
      {
        amount,
        reference,
        destinationBankCode,
        destinationAccountNumber,
        narration,
      },
      {
        timeout: 25000,
        headers: {
          Authorization: `Bearer ${token}`,
          Signature: signature,
          SignatureMethod: signatureMethod,
          TerminalId: env.INTERSWITCH_TERMINAL_ID,
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(200).json({
      reference,
      status: response.data.status ?? 'PROCESSING',
      responseCode: response.data.responseCode,
      responseMessage: response.data.responseMessage,
      transactionId: response.data.transactionId,
      providerResponse: response.data,
    });
  } catch (error) {
    logInterswitchError('Funds transfer', error);
    res.status(502).json({
      error: 'TRANSFER_INITIATION_FAILED',
      message: 'Unable to initiate transfer right now.',
      reference,
    });
  }
}
