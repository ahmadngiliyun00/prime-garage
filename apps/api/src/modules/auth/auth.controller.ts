import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  devLoginSchema,
  googleLoginSchema,
  refreshSchema,
  type AuthResponse,
  type DevLoginInput,
  type GoogleLoginInput,
  type RefreshInput,
} from '@prime-garage/shared';
import type { Request, Response } from 'express';
import { env, isProduction } from '../../config/env.js';
import { Public } from '../../common/decorators.js';
import { toUserDto } from '../../common/serializers.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import type { User } from '../../generated/prisma/client.js';
import { AuthService } from './auth.service.js';
import type { IssuedTokens } from './token.service.js';

export const REFRESH_COOKIE = 'pg_refresh';
const COOKIE_PATH = '/api/auth';

/** Native clients send `X-Client: native` and receive the refresh token in the body. */
function isNative(req: Request): boolean {
  return String(req.headers['x-client'] ?? '').toLowerCase() === 'native';
}

function meta(req: Request) {
  return { userAgent: req.headers['user-agent'], ip: req.ip };
}

@Controller('auth')
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Get('config')
  config() {
    return {
      googleEnabled: env.GOOGLE_CLIENT_IDS.length > 0,
      devLoginEnabled: env.AUTH_DEV_LOGIN_ENABLED && !isProduction,
    };
  }

  @Public()
  @Post('google')
  @HttpCode(200)
  async google(
    @Body(new ZodValidationPipe(googleLoginSchema)) body: GoogleLoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const { user, tokens } = await this.auth.loginWithGoogle(body.idToken, meta(req));
    return this.respond(req, res, user, tokens);
  }

  @Public()
  @Post('dev-login')
  @HttpCode(200)
  async devLogin(
    @Body(new ZodValidationPipe(devLoginSchema)) body: DevLoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const { user, tokens } = await this.auth.devLogin(body.email, body.name, meta(req));
    return this.respond(req, res, user, tokens);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body(new ZodValidationPipe(refreshSchema)) body: RefreshInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const token = body.refreshToken ?? (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    if (!token) throw new UnauthorizedException('Sesi tidak ditemukan, silakan login ulang');
    const { user, tokens } = await this.auth.refresh(token, meta(req));
    return this.respond(req, res, user, tokens);
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(
    @Body(new ZodValidationPipe(refreshSchema)) body: RefreshInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const token = body.refreshToken ?? (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    await this.auth.logout(token);
    res.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH });
  }

  private respond(req: Request, res: Response, user: User, tokens: IssuedTokens): AuthResponse {
    const base: AuthResponse = {
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt.toISOString(),
      user: toUserDto(user),
    };
    if (isNative(req)) return { ...base, refreshToken: tokens.refreshToken };
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: COOKIE_PATH,
      maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400_000,
    });
    return base;
  }
}
