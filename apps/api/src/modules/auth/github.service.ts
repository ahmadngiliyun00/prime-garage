import { BadRequestException, ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { env, isProduction } from '../../config/env.js';
import { GITHUB_STATE_TTL_SECONDS, isAllowedReturnTo, LoginCodeStore, pickVerifiedEmail, type GithubEmail } from './github-oauth.js';

const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const API_URL = 'https://api.github.com';
const STATE_AUDIENCE = 'github-oauth-state';
const APP_SCHEME = 'primegarage';

const stateSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

export type GithubProfile = { id: string; login: string; name: string; email: string; avatarUrl: string | null };

/** GitHub OAuth App login, server side (client secret never leaves the API). */
@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  readonly codes = new LoginCodeStore();
  /** Swappable in tests. */
  fetchImpl: typeof fetch = (...args) => fetch(...args);

  get enabled(): boolean {
    return Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
  }

  get callbackUrl(): string {
    return `${env.API_PUBLIC_URL.replace(/\/$/, '')}/api/auth/github/callback`;
  }

  isAllowedReturnTo(returnTo: string): boolean {
    return isAllowedReturnTo(returnTo, {
      webOrigins: [env.APP_WEB_URL, ...env.CORS_ORIGINS],
      appScheme: APP_SCHEME,
      production: isProduction,
    });
  }

  /** Builds the GitHub authorize URL. `nonce` is also set as a cookie to bind the flow to this browser. */
  async start(returnTo: string): Promise<{ url: string; nonce: string }> {
    if (!this.enabled) throw new BadRequestException('Login GitHub belum dikonfigurasi di server');
    if (!this.isAllowedReturnTo(returnTo)) throw new BadRequestException('Alamat kembali tidak diizinkan');
    const nonce = randomBytes(16).toString('base64url');
    const state = await new SignJWT({ returnTo, nonce })
      .setProtectedHeader({ alg: 'HS256' })
      .setAudience(STATE_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(`${GITHUB_STATE_TTL_SECONDS}s`)
      .sign(stateSecret);
    const url = new URL(AUTHORIZE_URL);
    url.searchParams.set('client_id', env.GITHUB_CLIENT_ID!);
    url.searchParams.set('redirect_uri', this.callbackUrl);
    url.searchParams.set('scope', 'read:user user:email');
    url.searchParams.set('state', state);
    url.searchParams.set('allow_signup', 'false');
    return { url: url.toString(), nonce };
  }

  /** Verifies the signed state. Returns the return URL, or null when the state is unusable. */
  async readState(state: string | undefined, cookieNonce: string | undefined): Promise<{ returnTo: string | null; valid: boolean }> {
    if (!state) return { returnTo: null, valid: false };
    try {
      const { payload } = await jwtVerify(state, stateSecret, { audience: STATE_AUDIENCE, algorithms: ['HS256'] });
      const returnTo = typeof payload['returnTo'] === 'string' && this.isAllowedReturnTo(payload['returnTo']) ? payload['returnTo'] : null;
      const valid = returnTo !== null && typeof payload['nonce'] === 'string' && payload['nonce'] === cookieNonce;
      return { returnTo, valid };
    } catch {
      return { returnTo: null, valid: false };
    }
  }

  /** Exchanges the OAuth code and loads the GitHub profile. Throws with an Indonesian message. */
  async profileFromCode(code: string): Promise<GithubProfile> {
    const tokenRes = await this.fetchImpl(TOKEN_URL, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: this.callbackUrl,
      }),
    });
    const token = (await tokenRes.json().catch(() => ({}))) as { access_token?: string; error?: string; error_description?: string };
    if (!tokenRes.ok || !token.access_token) {
      this.logger.warn(`GitHub token exchange failed: ${token.error ?? tokenRes.status} ${token.error_description ?? ''}`);
      throw new UnauthorizedException('Login GitHub gagal, silakan coba lagi');
    }

    const headers = {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token.access_token}`,
      'user-agent': 'PrimeGarage',
      'x-github-api-version': '2022-11-28',
    };
    const [userRes, emailsRes] = await Promise.all([
      this.fetchImpl(`${API_URL}/user`, { headers }),
      this.fetchImpl(`${API_URL}/user/emails`, { headers }),
    ]);
    if (!userRes.ok) throw new UnauthorizedException('Profil GitHub tidak dapat dibaca');
    const user = (await userRes.json()) as { id: number; login: string; name: string | null; avatar_url: string | null };
    const emails = emailsRes.ok ? ((await emailsRes.json()) as GithubEmail[]) : [];

    if (!env.GITHUB_ALLOWED_LOGINS.includes(user.login.toLowerCase())) {
      this.logger.warn(`GitHub login refused for ${user.login} (not in GITHUB_ALLOWED_LOGINS)`);
      throw new ForbiddenException(`Akun GitHub ${user.login} tidak diizinkan masuk`);
    }
    const email = pickVerifiedEmail(emails);
    if (!email) throw new UnauthorizedException('Akun GitHub belum punya email terverifikasi');
    return { id: String(user.id), login: user.login, name: user.name || user.login, email, avatarUrl: user.avatar_url };
  }
}
