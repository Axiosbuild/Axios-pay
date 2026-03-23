import axios, { AxiosInstance } from 'axios';
import { logger } from '../lib/logger';

interface ISWToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface BVNFullDetails {
  bvn: string;
  firstName: string;
  lastName: string;
  middleName: string;
  dateOfBirth: string;
  phoneNumber: string;
  enrollmentBank: string;
  enrollmentBranch: string;
  email: string;
  gender: string;
  levelOfAccount: string;
  lgaOfCapture: string;
  stateOfCapture: string;
  maritalStatus: string;
  nigerianResident: string;
  nationality: string;
  image: string;
}

interface NINDetails {
  nin: string;
  firstname: string;
  surname: string;
  middlename: string;
  birthdate: string;
  phone: string;
  email: string;
  gender: string;
  photo: string;
}

interface AMLResult {
  searchId: string;
  totalHits: number;
  hits: Array<{
    name: string;
    matchScore: number;
    categories: string[];
    sources: string[];
  }>;
}

interface NameEnquiryResult {
  accountName: string;
  accountNumber: string;
  bankCode: string;
  currency: string;
}

interface TransferResult {
  responseCode: string;
  responseDescription: string;
  transactionReference: string;
  amount: number;
}

interface BankAccount {
  accountNumber: string;
  bankName: string;
  bankCode: string;
  currency: string;
}

class InterswitchService {
  private client: AxiosInstance;
  private passportClient: AxiosInstance;
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.INTERSWITCH_BASE_URL || 'https://sandbox.interswitchng.com',
      timeout: 30000,
    });

    this.passportClient = axios.create({
      baseURL: process.env.INTERSWITCH_PASSPORT_URL || 'https://sandbox.interswitchng.com/passport',
      timeout: 30000,
    });
  }

  // ── OAuth Token ──────────────────────────────────────────────────────────
  private async getToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.token;
    }

    const credentials = Buffer.from(
      `${process.env.INTERSWITCH_CLIENT_ID}:${process.env.INTERSWITCH_CLIENT_SECRET}`
    ).toString('base64');

    const res = await this.passportClient.post<ISWToken>(
      '/oauth/token',
      'grant_type=client_credentials&scope=profile',
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    this.tokenCache = {
      token: res.data.access_token,
      expiresAt: Date.now() + (res.data.expires_in - 60) * 1000,
    };

    return this.tokenCache.token;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // ── BVN Full Details ─────────────────────────────────────────────────────
  async verifyBVN(bvn: string): Promise<BVNFullDetails> {
    const headers = await this.authHeaders();
    const res = await this.client.get<{ data: BVNFullDetails }>(
      `/api/v2/identity/bvn/full-details?bvn=${bvn}`,
      { headers }
    );
    logger.info('BVN verified', { bvn: bvn.slice(0, 4) + '******' });
    return res.data.data;
  }

  // ── BVN Boolean Match ────────────────────────────────────────────────────
  async matchBVN(bvn: string, firstName: string, lastName: string, dateOfBirth: string): Promise<boolean> {
    const headers = await this.authHeaders();
    const res = await this.client.post<{ data: { match: boolean } }>(
      '/api/v2/identity/bvn/boolean-match',
      { bvn, firstName, lastName, dateOfBirth },
      { headers }
    );
    return res.data.data.match;
  }

  // ── NIN Full Details ─────────────────────────────────────────────────────
  async verifyNIN(nin: string): Promise<NINDetails> {
    const headers = await this.authHeaders();
    const res = await this.client.get<{ data: NINDetails }>(
      `/api/v2/identity/nin/full-details?nin=${nin}`,
      { headers }
    );
    logger.info('NIN verified', { nin: nin.slice(0, 4) + '******' });
    return res.data.data;
  }

  // ── International Passport ───────────────────────────────────────────────
  async verifyPassport(passportNumber: string, dateOfBirth: string, firstName: string, lastName: string): Promise<Record<string, unknown>> {
    const headers = await this.authHeaders();
    const res = await this.client.post<{ data: Record<string, unknown> }>(
      '/api/v2/identity/passport/verify',
      { passportNumber, dateOfBirth, firstName, lastName },
      { headers }
    );
    return res.data.data;
  }

  // ── Driver's License ─────────────────────────────────────────────────────
  async verifyDriversLicense(licenseNumber: string, dateOfBirth: string): Promise<Record<string, unknown>> {
    const headers = await this.authHeaders();
    const res = await this.client.post<{ data: Record<string, unknown> }>(
      '/api/v2/identity/drivers-license/verify',
      { licenseNumber, dateOfBirth },
      { headers }
    );
    return res.data.data;
  }

  // ── Facial Comparison ────────────────────────────────────────────────────
  async compareFaces(image1Base64: string, image2Base64: string): Promise<{ match: boolean; confidence: number }> {
    const headers = await this.authHeaders();
    const res = await this.client.post<{ data: { match: boolean; confidence: number } }>(
      '/api/v2/identity/facial-comparison',
      { image1: image1Base64, image2: image2Base64 },
      { headers }
    );
    return res.data.data;
  }

  // ── Domestic AML ─────────────────────────────────────────────────────────
  async screenDomesticAML(name: string, dateOfBirth?: string): Promise<AMLResult> {
    const headers = await this.authHeaders();
    const res = await this.client.post<{ data: AMLResult }>(
      '/api/v2/compliance/aml/domestic-search',
      { name, dateOfBirth },
      { headers }
    );
    logger.info('Domestic AML screening complete', { hits: res.data.data.totalHits });
    return res.data.data;
  }

  // ── Global AML ───────────────────────────────────────────────────────────
  async screenGlobalAML(name: string, dateOfBirth?: string, country?: string): Promise<AMLResult> {
    const headers = await this.authHeaders();
    const res = await this.client.post<{ data: AMLResult }>(
      '/api/v2/compliance/aml/global-search',
      { name, dateOfBirth, country },
      { headers }
    );
    logger.info('Global AML screening complete', { hits: res.data.data.totalHits });
    return res.data.data;
  }

  // ── Bank Account Verification ────────────────────────────────────────────
  async verifyBankAccount(accountNumber: string, bankCode: string): Promise<NameEnquiryResult> {
    const headers = await this.authHeaders();
    const res = await this.client.get<{ data: NameEnquiryResult }>(
      `/api/v2/nameenquiry/banks/accounts/names?accountNumber=${accountNumber}&bankCode=${bankCode}`,
      { headers }
    );
    return res.data.data;
  }

  // ── Bank Accounts Lookup (by BVN) ────────────────────────────────────────
  async lookupAccountsByBVN(bvn: string): Promise<BankAccount[]> {
    const headers = await this.authHeaders();
    const res = await this.client.get<{ data: { accounts: BankAccount[] } }>(
      `/api/v2/identity/bvn/accounts?bvn=${bvn}`,
      { headers }
    );
    return res.data.data.accounts;
  }

  // ── Funds Transfer ───────────────────────────────────────────────────────
  async doTransfer(params: {
    amount: number;
    destinationAccountNumber: string;
    destinationBankCode: string;
    narration: string;
    reference: string;
  }): Promise<TransferResult> {
    const headers = await this.authHeaders();

    // Compute MAC for security
    const mac = this.computeMAC(params.amount, params.reference);

    const res = await this.client.post<{ data: TransferResult }>(
      '/api/v2/quickteller/payments/transfers',
      {
        initiatingEntityCode: process.env.INTERSWITCH_CLIENT_ID,
        beneficiaryAccountName: '',
        beneficiaryAccountNumber: params.destinationAccountNumber,
        beneficiaryBankCode: params.destinationBankCode,
        beneficiaryEmail: '',
        initiatingEntityAccountNumber: '',
        initiatingEntityName: 'Axios Pay',
        narration: params.narration,
        transactionReference: params.reference,
        amount: params.amount * 100, // Convert to kobo
        mac,
      },
      { headers }
    );

    logger.info('Transfer initiated', {
      reference: params.reference,
      responseCode: res.data.data.responseCode,
    });

    return res.data.data;
  }

  // ── Transaction Search ───────────────────────────────────────────────────
  async searchTransaction(reference: string): Promise<Record<string, unknown>> {
    const headers = await this.authHeaders();
    const res = await this.client.get<{ data: Record<string, unknown> }>(
      `/api/v2/quickteller/transactions?reference=${reference}`,
      { headers }
    );
    return res.data.data;
  }

  // ── Generate Safetoken OTP ───────────────────────────────────────────────
  async generateAndSendOTP(phone: string, email: string, transactionRef: string): Promise<{ otpId: string }> {
    const headers = await this.authHeaders();
    const res = await this.client.post<{ data: { otpId: string } }>(
      '/api/v2/safetoken/generate-send',
      { phoneNumber: phone, email, transactionReference: transactionRef },
      { headers }
    );
    return res.data.data;
  }

  // ── WhatsApp OTP ─────────────────────────────────────────────────────────
  async sendWhatsAppOTP(phone: string, transactionRef: string): Promise<{ otpId: string }> {
    const headers = await this.authHeaders();
    const res = await this.client.post<{ data: { otpId: string } }>(
      '/api/v2/safetoken/whatsapp-otp',
      { phoneNumber: phone, transactionReference: transactionRef },
      { headers }
    );
    return res.data.data;
  }

  // ── MAC Computation ──────────────────────────────────────────────────────
  private computeMAC(amount: number, reference: string): string {
    const crypto = require('crypto');
    const data = `${amount}566NGN${amount}566NGN${reference}`;
    return crypto.createHmac('sha512', process.env.INTERSWITCH_CLIENT_SECRET!)
      .update(data)
      .digest('hex');
  }
}

export const interswitchService = new InterswitchService();
