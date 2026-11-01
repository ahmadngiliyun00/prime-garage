import { hashPassword, verifyPassword } from './password.js';

describe('password hashing', () => {
  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await hashPassword('rahasia-garasi');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('rahasia-garasi', hash)).toBe(true);
    expect(await verifyPassword('rahasia-garasi!', hash)).toBe(false);
  });

  it('uses a fresh salt for every hash', async () => {
    expect(await hashPassword('sama')).not.toBe(await hashPassword('sama'));
  });

  it('returns false for malformed hashes', async () => {
    expect(await verifyPassword('x', 'not-a-hash')).toBe(false);
    expect(await verifyPassword('x', 'scrypt$0$8$1$AA$AA')).toBe(false);
    expect(await verifyPassword('x', 'bcrypt$1$2$3$4$5')).toBe(false);
  });
});
