import { BadRequestException, Body, Controller, Get, HttpCode, HttpException, Logger, Post, Query, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  devLoginSchema,
  githubExchangeSchema,
  googleLoginSchema,
  passwordLoginSchema,
  refreshSchema,
  type AuthResponse,
  type DevLoginInput,
  type GithubExchangeInput,
  type GoogleLoginInput,
  type PasswordLoginInput,
  type RefreshInput,
} from '@prime-garage/shared';
import type { Request, Response } from 'express';
import { env, isProduction } from '../../config/env.js';
import { Public } from '../../common/decorators.js';
import { toUserDto } from '../../common/serializers.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import type { User } from '../../generated/prisma/client.js';
import { AuthService } from './auth.service.js';
import { GithubService } from './github.service.js';
import { GITHUB_STATE_TTL_SECONDS, withParams } from './github-oauth.js';
import type { IssuedTokens } from './token.service.js';

export const REFRESH_COOKIE = 'pg_refresh';
const COOKIE_PATH = '/api/auth';
const GITHUB_NONCE_COOKIE = 'pg_gh_nonce';
const GITHUB_COOKIE_PATH = '/api/auth/github';

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
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly auth: AuthService,
    private readonly github: GithubService,
  ) {}

  @Public()
  @Get('config')
  config() {
    return {
      passwordEnabled: true,
      githubEnabled: this.github.enabled,
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
  @Post('login')
  @HttpCode(200)
  // Stricter than the controller default: password guessing.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body(new ZodValidationPipe(passwordLoginSchema)) body: PasswordLoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const { user, tokens } = await this.auth.loginWithPassword(body.username, body.password, meta(req));
    return this.respond(req, res, user, tokens);
  }

  /** Step 1: browser (web page or in-app auth session) is sent here, then on to GitHub. */
  @Public()
  @Get('github/start')
  async githubStart(@Query('returnTo') returnTo: string | undefined, @Res() res: Response): Promise<void> {
    if (!returnTo) throw new BadRequestException('returnTo wajib diisi');
    const { url, nonce } = await this.github.start(returnTo);
    res.cookie(GITHUB_NONCE_COOKIE, nonce, {
      httpOnly: true,
      secure: isProduction,
      // Lax: the cookie must come back on the top-level redirect from github.com.
      sameSite: 'lax',
      path: GITHUB_COOKIE_PATH,
      maxAge: GITHUB_STATE_TTL_SECONDS * 1000,
    });
    res.redirect(302, url);
  }

  /** Step 2: GitHub redirects here. Signs the user in and sends a one-time code back to the app. */
  @Public()
  @Get('github/callback')
  async githubCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const nonce = (req.cookies as Record<string, string> | undefined)?.[GITHUB_NONCE_COOKIE];
    res.clearCookie(GITHUB_NONCE_COOKIE, { path: GITHUB_COOKIE_PATH });
    const { returnTo, valid } = await this.github.readState(state, nonce);
    if (!returnTo) throw new BadRequestException('Sesi login GitHub tidak valid, silakan ulangi dari aplikasi');
    const fail = (message: string) => res.redirect(302, withParams(returnTo, { error: message }));
    if (error) return fail(error === 'access_denied' ? 'Login GitHub dibatalkan' : 'Login GitHub gagal');
    if (!valid || !code) return fail('Sesi login GitHub tidak valid atau kedaluwarsa, silakan ulangi');
    try {
      const loginCode = await this.auth.githubCallback(code);
      res.redirect(302, withParams(returnTo, { code: loginCode }));
    } catch (e) {
      if (!(e instanceof HttpException)) this.logger.error(`GitHub callback failed: ${(e as Error).message}`);
      fail(e instanceof HttpException ? e.message : 'Login GitHub gagal');
    }
  }

  /** Step 3: the app trades the one-time code for a normal session. */
  @Public()
  @Post('github/exchange')
  @HttpCode(200)
  async githubExchange(
    @Body(new ZodValidationPipe(githubExchangeSchema)) body: GithubExchangeInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const { user, tokens } = await this.auth.githubExchange(body.code, meta(req));
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
