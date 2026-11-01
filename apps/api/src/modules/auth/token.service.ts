import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { v7 as uuidv7 } from 'uuid';
import { env } from '../../config/env.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthUser } from '../../common/decorators.js';

const secret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const ISSUER = 'prime-garage';

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export type IssuedTokens = { accessToken: string; accessTokenExpiresAt: Date; refreshToken: string };

@Injectable()
export class TokenService {
  constructor(private readonly prisma: PrismaService) {}

  async signAccessToken(user: AuthUser): Promise<{ token: string; expiresAt: Date }> {
    const expiresAt = new Date(Date.now() + env.JWT_ACCESS_TTL_SECONDS * 1000);
    const token = await new SignJWT({ email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
      .sign(secret);
    return { token, expiresAt };
  }

  async verifyAccessToken(token: string): Promise<AuthUser> {
    try {
      const { payload } = await jwtVerify(token, secret, { issuer: ISSUER, algorithms: ['HS256'] });
      if (!payload.sub || typeof payload['email'] !== 'string') throw new Error('bad payload');
      return { id: payload.sub, email: payload['email'] };
    } catch {
      throw new UnauthorizedException('Sesi tidak valid atau kedaluwarsa');
    }
  }

  /** Issues a new token pair. `familyId` is kept across rotations of the same login. */
  async issue(
    user: AuthUser,
    meta: { userAgent?: string | null; ip?: string | null },
    familyId: string = uuidv7(),
  ): Promise<IssuedTokens & { refreshTokenId: string }> {
    const refreshToken = randomBytes(48).toString('base64url');
    const row = await this.prisma.refreshToken.create({
      data: {
        id: uuidv7(),
        userId: user.id,
        familyId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
        userAgent: meta.userAgent?.slice(0, 255) ?? null,
        ipAddress: meta.ip?.slice(0, 45) ?? null,
      },
    });
    const access = await this.signAccessToken(user);
    return { accessToken: access.token, accessTokenExpiresAt: access.expiresAt, refreshToken, refreshTokenId: row.id };
  }

  /**
   * Rotates a refresh token. Reusing an already rotated token revokes the whole family
   * (token theft detection, ADR-007).
   */
  async rotate(refreshToken: string, meta: { userAgent?: string | null; ip?: string | null }): Promise<{ user: AuthUser; tokens: IssuedTokens }> {
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!row) throw new UnauthorizedException('Sesi tidak ditemukan, silakan login ulang');

    if (row.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: row.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Sesi sudah tidak berlaku, silakan login ulang');
    }
    if (row.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Sesi kedaluwarsa, silakan login ulang');
    }

    const user = { id: row.user.id, email: row.user.email };
    const next = await this.issue(user, meta, row.familyId);
    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date(), replacedById: next.refreshTokenId },
    });
    return { user, tokens: next };
  }

  async revoke(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
