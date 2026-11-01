import { createHash, randomBytes } from 'node:crypto';

/** Pure helpers for the GitHub OAuth flow (docs/ARCHITECTURE.md section 4.1). */

export const GITHUB_STATE_TTL_SECONDS = 600;
export const LOGIN_CODE_TTL_MS = 120_000;

/**
 * Where the API may send the user back to after GitHub. Only our own web origins and the
 * app's deep link scheme are allowed, so the flow cannot be used as an open redirect.
 * `exp://` (Expo Go) is accepted outside production only.
 */
export function isAllowedReturnTo(
  returnTo: string,
  opts: { webOrigins: string[]; appScheme: string; production: boolean },
): boolean {
  let url: URL;
  try {
    url = new URL(returnTo);
  } catch {
    return false;
  }
  if (url.protocol === `${opts.appScheme}:`) return true;
  if (url.protocol === 'exp:' || url.protocol === 'exps:') return !opts.production;
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  if (url.username || url.password) return false;
  return opts.webOrigins.some((o) => {
    try {
      return new URL(o).origin === url.origin;
    } catch {
      return false;
    }
  });
}

/** Appends query parameters to a return URL (works for http(s), exp:// and custom schemes). */
export function withParams(returnTo: string, params: Record<string, string>): string {
  const url = new URL(returnTo);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.toString();
}

export type GithubEmail = { email: string; primary: boolean; verified: boolean };

/** The primary verified email, else any verified one. Unverified emails are never used. */
export function pickVerifiedEmail(emails: GithubEmail[]): string | null {
  const verified = emails.filter((e) => e.verified);
  return (verified.find((e) => e.primary) ?? verified[0])?.email.toLowerCase() ?? null;
}

/**
 * One-time login codes handed to the client after the GitHub callback and exchanged for a
 * session. Kept in memory: the API runs as a single process (ADR-005) and a code lives 2 minutes.
 */
export class LoginCodeStore {
  private readonly codes = new Map<string, { userId: string; expiresAt: number }>();

  constructor(private readonly now: () => number = Date.now) {}

  create(userId: string): string {
    this.sweep();
    const code = randomBytes(32).toString('base64url');
    this.codes.set(this.key(code), { userId, expiresAt: this.now() + LOGIN_CODE_TTL_MS });
    return code;
  }

  /** Returns the user id once; a second call with the same code returns null. */
  consume(code: string): string | null {
    const key = this.key(code);
    const entry = this.codes.get(key);
    this.codes.delete(key);
    if (!entry || entry.expiresAt < this.now()) return null;
    return entry.userId;
  }

  private key(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  private sweep(): void {
    const now = this.now();
    for (const [k, v] of this.codes) if (v.expiresAt < now) this.codes.delete(k);
  }
}
