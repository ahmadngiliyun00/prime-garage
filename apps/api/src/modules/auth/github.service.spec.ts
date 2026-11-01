import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

// env.ts parses process.env at import time, so set what this test needs first.
vi.hoisted(() => {
  Object.assign(process.env, {
    DATABASE_URL: process.env['DATABASE_URL'] ?? 'mysql://u:p@127.0.0.1:3306/test',
    JWT_ACCESS_SECRET: process.env['JWT_ACCESS_SECRET'] ?? 'x'.repeat(32),
    GITHUB_CLIENT_ID: 'client-id',
    GITHUB_CLIENT_SECRET: 'client-secret',
    GITHUB_ALLOWED_LOGINS: 'AhmadNgiliyun00',
    API_PUBLIC_URL: 'http://localhost:3000',
    APP_WEB_URL: 'http://localhost:8081',
  });
});

const { GithubService } = await import('./github.service.js');

function fakeGithub(login: string, emails: { email: string; primary: boolean; verified: boolean }[]): typeof fetch {
  return async (input) => {
    const url = input instanceof Request ? input.url : input.toString();
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    if (url.endsWith('/login/oauth/access_token')) return json({ access_token: 'gho_test' });
    if (url.endsWith('/user')) return json({ id: 42, login, name: null, avatar_url: 'https://avatars.example/42' });
    if (url.endsWith('/user/emails')) return json(emails);
    return json({}, 404);
  };
}

describe('GithubService', () => {
  it('builds the authorize URL and round-trips the signed state', async () => {
    const svc = new GithubService();
    const { url, nonce } = await svc.start('http://localhost:8081/auth/github');
    const authorize = new URL(url);
    expect(authorize.origin + authorize.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(authorize.searchParams.get('redirect_uri')).toBe('http://localhost:3000/api/auth/github/callback');
    const state = authorize.searchParams.get('state') ?? undefined;

    expect(await svc.readState(state, nonce)).toEqual({ returnTo: 'http://localhost:8081/auth/github', valid: true });
    // Same state from another browser (no or different nonce cookie) is not valid.
    expect((await svc.readState(state, 'other')).valid).toBe(false);
    expect((await svc.readState('tampered.jwt.value', nonce)).returnTo).toBeNull();
  });

  it('refuses return URLs outside our origins', async () => {
    await expect(new GithubService().start('https://evil.example/cb')).rejects.toThrow('tidak diizinkan');
  });

  it('returns the profile of an allowed account with its verified email', async () => {
    const svc = new GithubService();
    svc.fetchImpl = fakeGithub('ahmadngiliyun00', [
      { email: 'unverified@example.com', primary: true, verified: false },
      { email: 'Ahmad@Example.com', primary: false, verified: true },
    ]);
    expect(await svc.profileFromCode('code')).toEqual({
      id: '42',
      login: 'ahmadngiliyun00',
      name: 'ahmadngiliyun00',
      email: 'ahmad@example.com',
      avatarUrl: 'https://avatars.example/42',
    });
  });

  it('refuses accounts that are not in GITHUB_ALLOWED_LOGINS', async () => {
    const svc = new GithubService();
    svc.fetchImpl = fakeGithub('someone-else', [{ email: 'x@example.com', primary: true, verified: true }]);
    await expect(svc.profileFromCode('code')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses accounts without a verified email', async () => {
    const svc = new GithubService();
    svc.fetchImpl = fakeGithub('ahmadngiliyun00', [{ email: 'x@example.com', primary: true, verified: false }]);
    await expect(svc.profileFromCode('code')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
