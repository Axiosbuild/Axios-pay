# 🔌 INTERSWITCH INTEGRATION — API REFERENCE CARD

## Quick Reference

### Base URLs
```
Backend API:    https://your-app.up.railway.app/api
  • Auth prefix:   /v1 (requires JWT)
  • Public prefix: (no prefix)
Frontend:       https://axioslast-web.vercel.app
```

---

## 🔐 OTP ENDPOINTS (Authenticated)

### 1️⃣ Request OTP
```http
POST /api/v1/otp/request
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "customerPhone": "+2348012345678",
  "transactionReference": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 50000
}
```

**Response (200)**
```json
{
  "sessionToken": "opt_sess_1234567890abcdef",
  "message": "OTP sent successfully to +2348012345678",
  "expiresInSeconds": 300
}
```

**Errors**
- 400: Invalid input (missing phone/reference/amount)
- 401: Unauthorized (missing/invalid JWT)
- 429: Rate limited (>3 requests per phone per 10 min)
- 500: Interswitch API error

---

### 2️⃣ Verify OTP
```http
POST /api/v1/otp/verify
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "sessionToken": "opt_sess_1234567890abcdef",
  "otp": "123456",
  "transactionReference": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200)**
```json
{
  "verified": true,
  "transferToken": "txf_token_1234567890abcdef",
  "message": "OTP verified successfully. Proceed with transfer."
}
```

**Errors**
- 400: Reference mismatch / invalid input
- 401: Invalid OTP (includes remaining attempts)
- 404: Session token not found
- 409: Session already used
- 410: OTP expired
- 429: Max attempts exceeded
- 500: Verification failed

---

### 3️⃣ Resend OTP
```http
POST /api/v1/otp/resend
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "sessionToken": "opt_sess_1234567890abcdef",
  "customerPhone": "+2348012345678",
  "transactionReference": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 50000
}
```

**Response (200)**
```json
{
  "sessionToken": "opt_sess_new1234567890",
  "message": "OTP resent successfully",
  "expiresInSeconds": 300
}
```

---

## 💳 PAYMENT ENDPOINTS (Authenticated)

### 4️⃣ Initiate Payment
```http
POST /api/v1/wallets/deposit/initiate
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "amount": 50000,
  "transferToken": "txf_token_1234567890abcdef",
  "transactionReference": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200)**
```json
{
  "paymentUrl": "https://newwebpay.interswitchng.com/checkout/xxxxx",
  "reference": "INT123456789"
}
```

**Next Step**: Redirect user to `paymentUrl`

**Errors**
- 400: Invalid transferToken or reference mismatch
- 403: Transfer token not verified or already used
- 500: Payment initiation failed

---

### 5️⃣ Verify Payment Status
```http
GET /api/v1/wallets/deposit/verify/{transactionReference}
Authorization: Bearer {JWT_TOKEN}
```

**Response (200)**
```json
{
  "status": "PAID",
  "amount": "50000",
  "currency": "NGN",
  "createdAt": "2026-04-17T10:30:00Z"
}
```

**Status Values**
- `PAID` → Payment successful, wallet credited
- `PENDING` → Payment processing, check again in 30s
- `FAILED` → Payment failed or rejected

**Errors**
- 404: Transaction not found
- 500: Verification failed

---

## 🏦 PUBLIC ENDPOINTS (No Auth)

### 6️⃣ Public Fund Wallet
```http
POST /api/wallet-funding/fund-wallet
Content-Type: application/json

{
  "amount": 50000,
  "email": "user@example.com"
}
```

**Response (200)**
```json
{
  "transactionReference": "550e8400-e29b-41d4-a716-446655440000",
  "paymentUrl": "https://newwebpay.interswitchng.com/checkout/xxxxx"
}
```

---

### 7️⃣ Public Get Wallet Balance
```http
GET /api/wallet-funding/wallet-balance?email=user@example.com
```

**Response (200)**
```json
{
  "balance": "250000"
}
```

---

## 🔔 WEBHOOK ENDPOINT

### 8️⃣ Interswitch Webhook (Incoming)
```http
POST /api/webhooks/interswitch
Content-Type: application/json

{
  "transactionReference": "550e8400-e29b-41d4-a716-446655440000",
  "status": "SUCCESSFUL",
  "amount": 50000,
  "responseCode": "00",
  "responseDescription": "Successful"
}
```

**Response (200)**
```json
{
  "received": true,
  "credited": true
}
```

**What Happens**
- Wallet automatically credited
- Transaction recorded
- User notified (via email/SMS if configured)

---

## 📊 ERROR RESPONSE FORMAT

All errors follow this format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable description",
  "details": { "field": ["error message"] }
}
```

**Common Codes**
- `VALIDATION_ERROR` — Input validation failed
- `UNAUTHORIZED` — Missing/invalid JWT
- `RATE_LIMIT` — Too many requests
- `OTP_INVALID` — Wrong OTP code
- `OTP_EXPIRED` — OTP past expiry time
- `TOKEN_NOT_FOUND` — Session/transfer token missing
- `PAYMENT_INIT_FAILED` — Interswitch error

---

## 🔄 COMPLETE FLOW EXAMPLE

### JavaScript/TypeScript
```typescript
// 1. Request OTP
const otpResponse = await fetch('/api/v1/otp/request', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    customerPhone: '+2348012345678',
    transactionReference: crypto.randomUUID(),
    amount: 50000,
  }),
});
const { sessionToken, expiresInSeconds } = await otpResponse.json();

// 2. User enters OTP (from UI input)
const otp = '123456'; // User entered

// 3. Verify OTP
const verifyResponse = await fetch('/api/v1/otp/verify', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    sessionToken,
    otp,
    transactionReference,
  }),
});
const { transferToken } = await verifyResponse.json();

// 4. Initiate payment
const paymentResponse = await fetch('/api/v1/wallets/deposit/initiate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    amount: 50000,
    transferToken,
    transactionReference,
  }),
});
const { paymentUrl } = await paymentResponse.json();

// 5. Redirect to payment
window.location.href = paymentUrl;

// 6. After payment, user redirected to callback
// Callback page calls:
const statusResponse = await fetch(
  `/api/v1/wallets/deposit/verify/${transactionReference}`,
  {
    headers: { 'Authorization': `Bearer ${jwtToken}` },
  }
);
const { status } = await statusResponse.json();
// Show result to user
```

---

## 🧪 CURL Examples

### Request OTP
```bash
curl -X POST http://localhost:8080/api/v1/otp/request \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "customerPhone": "+2348012345678",
    "transactionReference": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 50000
  }'
```

### Verify OTP
```bash
curl -X POST http://localhost:8080/api/v1/otp/verify \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "sessionToken": "opt_sess_1234567890abcdef",
    "otp": "123456",
    "transactionReference": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

### Initiate Payment
```bash
curl -X POST http://localhost:8080/api/v1/wallets/deposit/initiate \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "transferToken": "txf_token_1234567890abcdef",
    "transactionReference": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

## 📱 Frontend Integration (TypeScript)

### Using paymentService.ts
```typescript
import {
  requestPaymentOTP,
  verifyPaymentOTP,
  initiatePayment,
  verifyPaymentStatus,
} from '@/services/paymentService';

// All functions return typed promises
type Response = Awaited<ReturnType<typeof requestPaymentOTP>>;
```

### Using TransferFormWithOTP Component
```typescript
import { TransferFormWithOTP } from '@/components/TransferFormWithOTP';

export default function Deposit() {
  return (
    <TransferFormWithOTP
      onSuccess={(reference) => {
        console.log('Payment success:', reference);
        // Redirect to callback page
      }}
      onError={(error) => {
        console.error('Payment error:', error);
        // Show toast notification
      }}
    />
  );
}
```

### Using OTPVerificationModal Component
```typescript
import { useState } from 'react';
import { OTPVerificationModal } from '@/components/OTPVerificationModal';

export default function Deposit() {
  const [showOTP, setShowOTP] = useState(false);

  return (
    <>
      <button onClick={() => setShowOTP(true)}>Request OTP</button>

      <OTPVerificationModal
        isOpen={showOTP}
        sessionToken="opt_sess_..."
        transactionReference="550e8400..."
        expiresInSeconds={300}
        onVerified={(transferToken) => {
          console.log('OTP verified:', transferToken);
          // Proceed with payment initiation
        }}
        onClose={() => setShowOTP(false)}
      />
    </>
  );
}
```

---

## ⏱️ Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| /otp/request | 3 per phone | 10 minutes |
| /otp/verify | 5 per IP | 10 minutes |
| /otp/resend | 3 per phone | 10 minutes |
| /webhooks/* | 100 per minute | Rolling |

---

## 🔐 Authentication

All `/api/v1/*` endpoints require:
```http
Authorization: Bearer {JWT_ACCESS_TOKEN}
```

JWT token obtained from:
- `/api/v1/auth/login` → returns `accessToken`
- Stored in localStorage as `axiospay-auth`
- Auto-refreshed by api client interceptor

---

## 💾 Session Storage

- **sessionToken**: 5 minutes (in-memory)
- **transferToken**: 5 minutes (in-memory)
- **Burned after use**: transferToken consumed on /initiate

---

## 🆘 Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| OTP not received | Phone format wrong | Use E.164: +234XXXXXXXXXX |
| 429 error | Rate limited | Wait 10 minutes or use new phone |
| 401 error | Invalid JWT | Re-authenticate (/api/v1/auth/login) |
| Payment link shows error | Invalid transferToken | Re-verify OTP |
| Webhook not received | URL not registered | Register in Interswitch dashboard |

---

**Last Updated**: April 17, 2026
**Version**: 1.0.0
