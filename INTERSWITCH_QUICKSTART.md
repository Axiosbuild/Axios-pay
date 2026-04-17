# Interswitch Integration — Quick Start Guide

## 📱 For Users: How to Fund Wallet

### Step 1: Navigate to Deposit
- Go to Dashboard → Deposit
- Or visit: `/dashboard/deposit`

### Step 2: Enter Amount
- Enter amount in NGN (minimum ₦100)
- View fee breakdown (1.5%)
- Click "Request OTP"

### Step 3: Verify OTP
- Check your phone for 6-digit code
- Enter code in the modal
- Click "Verify OTP"

### Step 4: Complete Payment
- You'll be redirected to Interswitch checkout
- Enter card/bank details
- Click "Pay"

### Step 5: Confirmation
- You'll be redirected to callback page
- Status will show: Success / Pending / Failed
- Wallet will be credited automatically

---

## 🛠️ For Developers: Local Setup

### Prerequisites
```bash
Node.js 18+
PostgreSQL 14+
Redis 7+ (optional, for caching)
```

### Backend Setup

1. **Install dependencies**
   ```bash
   cd apps/api
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with:
   # - Interswitch sandbox credentials
   # - PostgreSQL connection string
   # - Redis URL (optional)
   ```

3. **Run migrations**
   ```bash
   npm run prisma:migrate
   ```

4. **Start server**
   ```bash
   npm run dev
   # Server runs on http://localhost:8080
   ```

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd apps/web
   npm install
   ```

2. **Configure environment**
   ```bash
   # Create .env.local
   NEXT_PUBLIC_API_URL=http://localhost:8080/api
   NEXT_PUBLIC_INTERSWITCH_MERCHANT_CODE=your-merchant-code
   NEXT_PUBLIC_INTERSWITCH_PAY_ITEM_ID=your-pay-item-id
   NEXT_PUBLIC_INTERSWITCH_MODE=TEST
   NEXT_PUBLIC_INTERSWITCH_INLINE_SCRIPT_URL=https://newwebpay.qa.interswitchng.com/inline-checkout.js
   ```

3. **Start dev server**
   ```bash
   npm run dev
   # Frontend runs on http://localhost:3000
   ```

### Test OTP Flow

1. **Request OTP** (via API or UI)
   ```bash
   curl -X POST http://localhost:8080/api/v1/otp/request \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "customerPhone": "+2348012345678",
       "transactionReference": "'$(uuidgen)'",
       "amount": 50000
     }'
   ```

2. **Verify OTP**
   ```bash
   curl -X POST http://localhost:8080/api/v1/otp/verify \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "sessionToken": "from-step-1",
       "otp": "123456",
       "transactionReference": "same-as-step-1"
     }'
   ```

3. **Use transfer token** to initiate payment in frontend

---

## 🔄 API Endpoints Reference

### OTP Routes (Protected)
```
POST   /api/v1/otp/request          - Request OTP code
POST   /api/v1/otp/verify           - Verify OTP code  
POST   /api/v1/otp/resend           - Resend OTP code
```

### Wallet Routes (Protected)
```
POST   /api/v1/wallets/deposit/initiate     - Start payment
GET    /api/v1/wallets/deposit/verify/:ref  - Check status
```

### Public Routes
```
POST   /api/wallet-funding/fund-wallet      - Fund wallet (no auth)
GET    /api/wallet-funding/wallet-balance   - Get balance (no auth)
```

### Webhooks
```
POST   /api/webhooks/interswitch    - Payment status webhook
```

---

## 🧪 Testing Checklist

- [ ] Request OTP with phone number
- [ ] Verify OTP with correct code
- [ ] Verify OTP with wrong code (should fail)
- [ ] Verify OTP twice (should fail on second attempt)
- [ ] Request OTP 4 times within 10 min (should rate limit)
- [ ] Initiate payment with valid transferToken
- [ ] Initiate payment with invalid transferToken (should fail)
- [ ] Complete payment and verify callback
- [ ] Check wallet balance updated

---

## 📊 Database Schema

### VerificationCode Table (for OTP storage)
```sql
CREATE TABLE VerificationCode (
  id              STRING PRIMARY KEY,
  key             STRING UNIQUE,
  value           STRING,
  expiresAt       DATETIME,
  createdAt       DATETIME DEFAULT NOW()
);
```

### Wallet-related Tables
- Already exist in schema
- No new migrations needed

---

## 🚨 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| OTP not received | Check phone number format (+234XXXXXXXXXX) |
| Token expired | Refresh token or request new OTP |
| Payment link not generated | Verify transferToken is valid & not expired |
| Webhook not received | Confirm URL is public & registered with Interswitch |
| CORS error | Verify FRONTEND_URL in Railway env vars |
| 401 Unauthorized | Check JWT token is valid & not expired |

---

## 📞 Interswitch Credentials Location

### Sandbox
- **Merchant Account**: [Interswitch Sandbox](https://sandbox.interswitchng.com)
- **Credentials**: Dashboard → API Keys
- **Test Cards**: See Interswitch docs for test card numbers

### Production
- **Merchant Account**: [Interswitch Live](https://www.interswitchng.com)
- **Credentials**: Dashboard → API Keys
- **Go-Live checklist**: Complete KYB verification first

---

## 🔒 Security Notes

1. **Never expose** INTERSWITCH_CLIENT_SECRET in frontend code
2. **Always use HTTPS** in production
3. **Validate** transactionReference matches across requests
4. **Rate limit** OTP requests (already configured)
5. **Burn** transferToken after first use
6. **Sign** webhooks with INTERSWITCH_WEBHOOK_SECRET
7. **Use JWT** for all authenticated requests
8. **Rotate** secrets periodically

---

## 📈 Performance Tips

1. Enable Redis for token caching (`REDIS_URL` in Railway)
2. Set `CRON_ENABLED=true` for background jobs
3. Use connection pooling for database
4. Monitor rate limiting metrics
5. Cache user preferences in frontend state

---

## 🆘 Support

- **Backend Issues**: Check `apps/api/src/config/env.ts` for required vars
- **Frontend Issues**: Check `NEXT_PUBLIC_API_URL` format
- **Payment Issues**: Review Interswitch logs in merchant dashboard
- **Webhook Issues**: Verify webhook URL is publicly accessible

---

**Last Updated**: April 17, 2026
