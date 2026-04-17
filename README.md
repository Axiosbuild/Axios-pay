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

## Registration email (Railway + Gmail SMTP)

- All transactional emails are sent via SMTP (Gmail recommended).
- Enable 2-step verification on Gmail and generate an App Password.
- Set `SMTP_USER` to your Gmail address and `SMTP_PASS` to the Gmail App Password.
- `EMAIL_FROM` should typically match `SMTP_USER`.
- Users must verify their email after registration using `POST /api/v1/auth/verify-email` (and can request a new code via `POST /api/v1/auth/verify-email/resend`).

### Railway environment variable checklist (email)

| Variable | Required | Example |
| --- | --- | --- |
| `SMTP_HOST` | optional | `smtp.gmail.com` |
| `SMTP_PORT` | optional | `465` |
| `SMTP_SECURE` | optional | `true` |
| `SMTP_USER` | ✅ | `you@gmail.com` |
| `SMTP_PASS` | ✅ | `xxxx xxxx xxxx xxxx` |
| `EMAIL_FROM` | optional | `you@gmail.com` |
| `FRONTEND_URL` | ✅ | `https://axiospay.vercel.app` |

### Gmail SMTP troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `Invalid login` / SMTP auth error | Wrong app password or account password used | Regenerate Gmail App Password and update `SMTP_PASS` |
| `Unable to verify first certificate` | TLS/port mismatch | Use `SMTP_PORT=465` with `SMTP_SECURE=true` |
| Emails not received | Spam filtering or Gmail sender restrictions | Check Spam folder and Gmail security activity |
