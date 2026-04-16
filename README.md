# axioslast

## Registration email troubleshooting (Vercel + Gmail SMTP)

- Prefer Gmail SMTP over SSL on port `465` with pooled transport (`pool: true`, `maxConnections: 5`).
- Keep `SMTP_CONNECTION_TIMEOUT_MS=5000` and `SMTP_SOCKET_TIMEOUT_MS=10000` to avoid hanging requests.
- Registration now persists the user first; verification email delivery is best-effort and can be retried with resend.
- Use Vercel logs to inspect request traces:

```bash
vercel logs --prod
```

- Look for `x-vercel-id` and request identifiers in registration email delay logs.
