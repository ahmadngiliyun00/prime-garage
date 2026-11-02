/**
 * Which browser origins may call the API with credentials.
 * Production: only CORS_ORIGINS. Development: also the local dev servers (localhost, and private
 * network addresses such as a phone or laptop on the same Wi-Fi), so a fresh .env copied from
 * .env.example does not block http://localhost:8081.
 */
const DEV_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d{1,5})?$/;

/** True for http(s) origins on localhost or a private network address (development machines). */
export function isDevOrigin(origin: string): boolean {
  return DEV_ORIGIN.test(origin);
}

export function isAllowedOrigin(origin: string, opts: { allowed: string[]; production: boolean }): boolean {
  if (opts.allowed.includes(origin)) return true;
  return !opts.production && DEV_ORIGIN.test(origin);
}

/** Origin callback for Express CORS and Socket.IO. Requests without Origin (native apps, curl) pass. */
export function corsOrigin(opts: { allowed: string[]; production: boolean }) {
  return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void): void => {
    callback(null, origin === undefined || isAllowedOrigin(origin, opts));
  };
}
