import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const IS_PUBLIC_KEY = 'isPublic';
/** Marks a route as not requiring an access token. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export type AuthUser = { id: string; email: string };

export type AuthenticatedRequest = Request & { user?: AuthUser };

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!req.user) throw new Error('CurrentUser used on a public route');
  return req.user;
});
