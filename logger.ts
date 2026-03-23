import winston from 'winston';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'pin', 'otp', 'cvv', 'cardNumber'];

const redactSensitive = winston.format((info) => {
  const redact = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result = { ...obj };
    for (const key of Object.keys(result)) {
      if (sensitiveFields.some((f) => key.toLowerCase().includes(f))) {
        result[key] = '[REDACTED]';
      } else if (typeof result[key] === 'object' && result[key] !== null) {
        result[key] = redact(result[key] as Record<string, unknown>);
      }
    }
    return result;
  };
  return redact(info as unknown as Record<string, unknown>) as typeof info;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    redactSensitive(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'axios-pay-api' },
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'development'
        ? combine(colorize(), simple())
        : combine(timestamp(), json()),
    }),
  ],
});
