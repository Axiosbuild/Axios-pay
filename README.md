# axioslast

## Redis (Upstash + Railway)

### Railway environment variable checklist

- Use `REDIS_URL` from Upstash exactly as provided; Railway stores env vars encrypted at rest by default.
- Ensure there is no leading/trailing whitespace in `REDIS_URL`.
- Use TLS URL format: `rediss://...` (not `redis://...`).
- Set `REDIS_TLS_REJECT_UNAUTHORIZED=false` for Upstash on Railway when strict TLS chain verification fails.
- Prefer `default` user format from Upstash URL (`rediss://default:<password>@...`).
- After updating env vars in Railway, trigger a redeploy.

### Local + Railway test commands

```bash
# Run from repository root
npm run redis:check --workspace @axiospay/api

# Optional full API validation
npm run type-check --workspace @axiospay/api
npm run build --workspace @axiospay/api
```

### Common Upstash/ioredis troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `Connection is closed` on startup | URL is `redis://` or missing TLS options | Use `rediss://...` and TLS config (`rejectUnauthorized: false`); note this weakens TLS verification and should be revisited when strict verification is possible |
| `ETIMEDOUT` | Network/connect timeout too low or transient network issue | Keep `connectTimeout` and `commandTimeout`; retry by redeploying |
| Commands hang then fail late | Offline queue buffering while disconnected | Set `enableOfflineQueue: false` to fail fast |
| Too many retries / noisy reconnects | Unlimited request retries | Set `maxRetriesPerRequest: 3` and bounded `retryStrategy` |
| Works locally but fails on Railway | Misconfigured env var value | Re-copy `REDIS_URL` in Railway, confirm no whitespace, redeploy |

## Registration email (Railway + Resend)

- All transactional emails are sent via the [Resend](https://resend.com) Node SDK.
- Set `RESEND_API_KEY` in your Railway service environment variables.
- Verify your sending domain (`axiospay.space`) in the Resend dashboard → **Domains**.
- `EMAIL_FROM` defaults to `info@axiospay.space` — update in Railway if you change the domain.
- Verification email delivery is **best-effort** during registration; failures are logged but do not block the HTTP response. Users can retry via `POST /api/v1/auth/resend-verification`.

### Railway environment variable checklist (email)

| Variable | Required | Example |
| --- | --- | --- |
| `RESEND_API_KEY` | ✅ | `re_...` |
| `EMAIL_FROM` | optional | `info@axiospay.space` |
| `FRONTEND_URL` | ✅ | `https://axiospay.vercel.app` |
| `VERIFICATION_TOKEN_TTL_MINUTES` | optional | `15` |

### Resend failure troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `[Resend] 403: ...` | Domain not verified or wrong API key | Verify domain in Resend dashboard, re-copy key |
| `[Resend] 422: ...` | Invalid `from` address | Ensure `EMAIL_FROM` matches a verified Resend domain |
| Emails not received | Resend free-tier limit or spam | Check Resend logs dashboard → **Emails** |
| `placeholder-resend-api-key` warnings at startup | `RESEND_API_KEY` not set in Railway | Add the variable in Railway → **Variables** and redeploy |
