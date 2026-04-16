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

## Registration email troubleshooting (Vercel + Gmail SMTP)

- Prefer Gmail SMTP over SSL on port `465` with pooled transport (`pool: true`, `maxConnections: 5`).
- Keep `SMTP_CONNECTION_TIMEOUT_MS=5000` and `SMTP_SOCKET_TIMEOUT_MS=10000` to avoid hanging requests.
- Registration now persists the user first; verification email delivery is best-effort and can be retried with resend.
- Use Vercel logs to inspect request traces:

```bash
vercel logs --prod
```

- Look for `x-vercel-id` and request identifiers in registration email delay logs.
