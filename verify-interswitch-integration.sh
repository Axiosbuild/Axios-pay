#!/bin/bash
# Deployment verification script for Interswitch Integration
# Run this before going live to verify all components are correctly wired

set -e

echo "🔍 Interswitch Integration Verification Script"
echo "=============================================="
echo ""

# Backend checks
echo "📦 Backend Verification"
echo "─────────────────────"

if [ ! -f "apps/api/src/services/interswitchAuth.ts" ]; then
  echo "❌ Missing apps/api/src/services/interswitchAuth.ts"
  exit 1
fi
echo "✅ interswitchAuth.ts exists"

if [ ! -f "apps/api/src/services/interswitch.service.ts" ]; then
  echo "❌ Missing apps/api/src/services/interswitch.service.ts"
  exit 1
fi
echo "✅ interswitch.service.ts exists"

if [ ! -f "apps/api/src/services/interswitchOtp.ts" ]; then
  echo "❌ Missing apps/api/src/services/interswitchOtp.ts"
  exit 1
fi
echo "✅ interswitchOtp.ts exists"

if [ ! -f "apps/api/src/services/otpStore.ts" ]; then
  echo "❌ Missing apps/api/src/services/otpStore.ts"
  exit 1
fi
echo "✅ otpStore.ts exists"

if [ ! -f "apps/api/src/routes/otp.routes.ts" ]; then
  echo "❌ Missing apps/api/src/routes/otp.routes.ts"
  exit 1
fi
echo "✅ otp.routes.ts exists"

if ! grep -q "otpRoutes" apps/api/src/routes/index.ts; then
  echo "❌ OTP routes not mounted in routes/index.ts"
  exit 1
fi
echo "✅ OTP routes mounted"

echo ""
echo "🎨 Frontend Verification"
echo "─────────────────────"

if [ ! -f "apps/web/src/services/paymentService.ts" ]; then
  echo "❌ Missing apps/web/src/services/paymentService.ts"
  exit 1
fi
echo "✅ paymentService.ts exists"

if [ ! -f "apps/web/src/components/OTPVerificationModal.tsx" ]; then
  echo "❌ Missing apps/web/src/components/OTPVerificationModal.tsx"
  exit 1
fi
echo "✅ OTPVerificationModal.tsx exists"

if [ ! -f "apps/web/src/components/TransferFormWithOTP.tsx" ]; then
  echo "❌ Missing apps/web/src/components/TransferFormWithOTP.tsx"
  exit 1
fi
echo "✅ TransferFormWithOTP.tsx exists"

if [ ! -f "apps/web/src/components/ui/OTPInput.tsx" ]; then
  echo "❌ Missing apps/web/src/components/ui/OTPInput.tsx"
  exit 1
fi
echo "✅ OTPInput.tsx exists"

echo ""
echo "📋 Environment Variables Checklist"
echo "──────────────────────────────────"
echo ""
echo "Backend (Railway):"
echo "  Required: INTERSWITCH_CLIENT_ID, INTERSWITCH_CLIENT_SECRET"
echo "  Required: INTERSWITCH_MERCHANT_CODE, INTERSWITCH_PAY_ITEM_ID"
echo "  Required: DATABASE_URL, REDIS_URL, FRONTEND_URL"
echo "  ℹ️  Run: railway env list"
echo ""
echo "Frontend (Vercel):"
echo "  Required: NEXT_PUBLIC_API_URL"
echo "  Required: NEXT_PUBLIC_INTERSWITCH_MERCHANT_CODE"
echo "  Required: NEXT_PUBLIC_INTERSWITCH_PAY_ITEM_ID"
echo "  ℹ️  Visit: https://vercel.com/axioslast/axioslast-web/settings/environment-variables"
echo ""

echo "🚀 Verification Complete!"
echo "─────────────────────────"
echo ""
echo "Next Steps:"
echo "  1. Verify all environment variables are set in Railway & Vercel"
echo "  2. Register webhook URL with Interswitch: https://your-api.up.railway.app/api/webhooks/interswitch"
echo "  3. Test OTP flow in sandbox environment"
echo "  4. Run: npm run build && npm run start (backend)"
echo "  5. Run: npm run build && npm run start (frontend)"
echo ""
