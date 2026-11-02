import { isAllowedOrigin } from './cors.js';

describe('isAllowedOrigin', () => {
  const prodOrigin = 'https://primegarage.ngiliyun.my.id';

  it('allows only CORS_ORIGINS in production', () => {
    const opts = { allowed: [prodOrigin], production: true };
    expect(isAllowedOrigin(prodOrigin, opts)).toBe(true);
    expect(isAllowedOrigin('http://localhost:8081', opts)).toBe(false);
    expect(isAllowedOrigin('http://192.168.1.10:8081', opts)).toBe(false);
  });

  it('also allows local and private network dev servers in development', () => {
    const opts = { allowed: [prodOrigin], production: false };
    for (const o of ['http://localhost:8081', 'http://127.0.0.1:8081', 'http://192.168.1.10:8081', 'http://172.20.10.2:8081', 'http://10.0.2.2:8081']) {
      expect(isAllowedOrigin(o, opts)).toBe(true);
    }
  });

  it('never allows public or look-alike hosts', () => {
    const opts = { allowed: [], production: false };
    for (const o of ['https://evil.example', 'http://localhost.evil.example', 'http://172.32.0.1:8081', 'http://192.168.1.10.evil.example', 'null']) {
      expect(isAllowedOrigin(o, opts)).toBe(false);
    }
  });
});
