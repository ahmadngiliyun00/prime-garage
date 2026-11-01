import { isAllowedReturnTo, LoginCodeStore, LOGIN_CODE_TTL_MS, pickVerifiedEmail, withParams } from './github-oauth.js';

describe('isAllowedReturnTo', () => {
  const opts = { webOrigins: ['https://primegarage.ngiliyun.my.id', 'http://localhost:8081'], appScheme: 'primegarage', production: true };

  it('accepts our web origins and the app scheme', () => {
    expect(isAllowedReturnTo('https://primegarage.ngiliyun.my.id/auth/github', opts)).toBe(true);
    expect(isAllowedReturnTo('http://localhost:8081/auth/github', opts)).toBe(true);
    expect(isAllowedReturnTo('primegarage://auth/github', opts)).toBe(true);
  });

  it('rejects other hosts, look-alikes and script URLs', () => {
    expect(isAllowedReturnTo('https://evil.example/auth/github', opts)).toBe(false);
    expect(isAllowedReturnTo('https://primegarage.ngiliyun.my.id.evil.example/', opts)).toBe(false);
    expect(isAllowedReturnTo('https://user@primegarage.ngiliyun.my.id/', opts)).toBe(false);
    expect(isAllowedReturnTo('javascript:alert(1)', opts)).toBe(false);
    expect(isAllowedReturnTo('not a url', opts)).toBe(false);
  });

  it('accepts Expo Go only outside production', () => {
    const url = 'exp://172.20.10.2:8081/--/auth/github';
    expect(isAllowedReturnTo(url, opts)).toBe(false);
    expect(isAllowedReturnTo(url, { ...opts, production: false })).toBe(true);
  });
});

describe('withParams', () => {
  it('adds query parameters to web, Expo Go and custom scheme URLs', () => {
    expect(withParams('http://localhost:8081/auth/github', { code: 'a b' })).toBe('http://localhost:8081/auth/github?code=a+b');
    expect(withParams('exp://172.20.10.2:8081/--/auth/github', { code: 'x' })).toBe('exp://172.20.10.2:8081/--/auth/github?code=x');
    expect(withParams('primegarage://auth/github', { error: 'nope' })).toBe('primegarage://auth/github?error=nope');
  });
});

describe('pickVerifiedEmail', () => {
  it('prefers the primary verified email and ignores unverified ones', () => {
    expect(
      pickVerifiedEmail([
        { email: 'Old@Example.com', primary: false, verified: true },
        { email: 'Main@Example.com', primary: true, verified: true },
      ]),
    ).toBe('main@example.com');
    expect(pickVerifiedEmail([{ email: 'x@example.com', primary: true, verified: false }])).toBeNull();
  });
});

describe('LoginCodeStore', () => {
  it('returns the user once and expires codes', () => {
    let now = 1_000;
    const store = new LoginCodeStore(() => now);
    const code = store.create('user-1');
    expect(store.consume(code)).toBe('user-1');
    expect(store.consume(code)).toBeNull();

    const late = store.create('user-2');
    now += LOGIN_CODE_TTL_MS + 1;
    expect(store.consume(late)).toBeNull();
  });
});
