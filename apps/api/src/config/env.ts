import 'dotenv/config';
import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0'])
  .optional()
  .transform((v) => v === 'true' || v === '1');

const list = z
  .string()
  .optional()
  .transform((v) =>
    (v ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  HOST: z.string().default('127.0.0.1'),
  DATABASE_URL: z.string().min(1),
  DATABASE_CONNECTION_LIMIT: z.coerce.number().int().min(1).default(10),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).default(30),
  GOOGLE_CLIENT_IDS: list,
  CORS_ORIGINS: list,
  APP_WEB_URL: z.string().url().default('http://localhost:8081'),
  AUTH_DEV_LOGIN_ENABLED: bool,
  STORAGE_DIR: z.string().default('../../storage'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(465),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('PrimeGarage <noreply@ngiliyun.my.id>'),
  EXPO_ACCESS_TOKEN: z.string().optional(),
  INTERNAL_API_URL: z.string().url().optional(),
  INTERNAL_API_SECRET: z.string().min(16).optional(),
  /** Daily reminder schedule, evaluated in REMINDER_TZ (default 07:00 WIB). */
  REMINDER_CRON: z.string().default('0 7 * * *'),
  /** IANA time zone for REMINDER_CRON. Asia/Jakarta = WIB = UTC+7 (no daylight saving). */
  REMINDER_TZ: z
    .string()
    .default('Asia/Jakarta')
    .refine((tz) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, 'REMINDER_TZ must be a valid IANA time zone, for example Asia/Jakarta'),
  TRUST_PROXY: bool,
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === 'production' && env.AUTH_DEV_LOGIN_ENABLED) {
    throw new Error('AUTH_DEV_LOGIN_ENABLED must not be true in production');
  }
  return env;
}

export const env = load();

export const isProduction = env.NODE_ENV === 'production';
