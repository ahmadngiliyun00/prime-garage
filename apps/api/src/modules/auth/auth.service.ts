import { BadRequestException, ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { v7 as uuidv7 } from 'uuid';
import { env, isProduction } from '../../config/env.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { IdentityProvider, User } from '../../generated/prisma/client.js';
import { ensurePersonalGarage } from './accounts.js';
import { getDummyHash, verifyPassword } from './password.js';
import { TokenService, type IssuedTokens } from './token.service.js';

type Profile = { provider: IdentityProvider; providerUserId: string; email: string; name: string; avatarUrl: string | null };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly google = new OAuth2Client();

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  async loginWithGoogle(idToken: string, meta: { userAgent?: string; ip?: string }): Promise<{ user: User; tokens: IssuedTokens }> {
    if (env.GOOGLE_CLIENT_IDS.length === 0) {
      throw new BadRequestException('Login Google belum dikonfigurasi di server (GOOGLE_CLIENT_IDS)');
    }
    let payload;
    try {
      const ticket = await this.google.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_IDS });
      payload = ticket.getPayload();
    } catch (e) {
      this.logger.warn(`Google token rejected: ${(e as Error).message}`);
      throw new UnauthorizedException('Token Google tidak valid');
    }
    if (!payload?.sub || !payload.email) throw new UnauthorizedException('Token Google tidak berisi email');
    if (payload.email_verified === false) throw new UnauthorizedException('Email Google belum terverifikasi');

    const user = await this.upsertUser({
      provider: 'google',
      providerUserId: payload.sub,
      email: payload.email.toLowerCase(),
      name: payload.name ?? payload.email.split('@')[0] ?? 'Pengguna',
      avatarUrl: payload.picture ?? null,
    });
    return { user, tokens: await this.tokens.issue({ id: user.id, email: user.email }, meta) };
  }

  /**
   * Username (or email) and password sign-in. Accounts are created with the CLI
   * (`npm run user:password -w @prime-garage/api`), there is no public sign-up.
   */
  async loginWithPassword(identifier: string, password: string, meta: { userAgent?: string; ip?: string }) {
    const id = identifier.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({ where: id.includes('@') ? { email: id } : { username: id } });
    const ok = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
    if (!user?.passwordHash || !ok) throw new UnauthorizedException('Username atau password salah');

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      await ensurePersonalGarage(tx, u);
      return u;
    });
    return { user: updated, tokens: await this.tokens.issue({ id: updated.id, email: updated.email }, meta) };
  }

  /** Development-only login without Google (AUTH_DEV_LOGIN_ENABLED=true, never in production). */
  async devLogin(email: string, name: string, meta: { userAgent?: string; ip?: string }) {
    if (!env.AUTH_DEV_LOGIN_ENABLED || isProduction) throw new ForbiddenException('Dev login tidak aktif');
    const user = await this.upsertUser({
      provider: 'email',
      providerUserId: email.toLowerCase(),
      email: email.toLowerCase(),
      name,
      avatarUrl: null,
    });
    return { user, tokens: await this.tokens.issue({ id: user.id, email: user.email }, meta) };
  }

  /**
   * Finds or creates the user for an identity. Links by email when the identity is new
   * (so one person can later sign in with several providers), and makes sure the user
   * has a personal garage (FR-VEH-01).
   */
  private async upsertUser(p: Profile): Promise<User> {
    return this.prisma.$transaction(async (tx) => {
      const identity = await tx.userIdentity.findUnique({
        where: { provider_providerUserId: { provider: p.provider, providerUserId: p.providerUserId } },
        include: { user: true },
      });

      let user: User;
      if (identity) {
        user = await tx.user.update({
          where: { id: identity.userId },
          data: { lastLoginAt: new Date(), avatarUrl: p.avatarUrl ?? identity.user.avatarUrl },
        });
      } else {
        const existing = await tx.user.findUnique({ where: { email: p.email } });
        user =
          existing ??
          (await tx.user.create({
            data: { id: uuidv7(), email: p.email, name: p.name.slice(0, 120), avatarUrl: p.avatarUrl, lastLoginAt: new Date() },
          }));
        await tx.userIdentity.create({
          data: { id: uuidv7(), userId: user.id, provider: p.provider, providerUserId: p.providerUserId, email: p.email },
        });
      }

      await ensurePersonalGarage(tx, user);
      return user;
    });
  }

  async refresh(refreshToken: string, meta: { userAgent?: string; ip?: string }) {
    const { user, tokens } = await this.tokens.rotate(refreshToken, meta);
    const full = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    return { user: full, tokens };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (refreshToken) await this.tokens.revoke(refreshToken);
  }
}
