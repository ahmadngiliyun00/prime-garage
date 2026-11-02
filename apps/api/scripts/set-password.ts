/**
 * Create a username and password account, or set a new password for an existing one.
 * There is no public sign-up: this is how the owner gets an account (docs/DEPLOYMENT.md).
 *
 *   npm run user:password -w @prime-garage/api -- --username ahmad --email ahmad@example.com --name "Ahmad"
 *
 * The password is asked twice on a hidden prompt. For scripts, pass it in PG_PASSWORD instead.
 * If --email matches an existing account (for example one created by GitHub login), the
 * username and password are added to that account.
 */
import { parseArgs } from 'node:util';
import { usernameSchema } from '@prime-garage/shared';
import { v7 as uuidv7 } from 'uuid';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { ensurePersonalGarage } from '../src/modules/auth/accounts.js';
import { hashPassword, PASSWORD_MIN_LENGTH } from '../src/modules/auth/password.js';

/**
 * Reads a line without echoing it: each typed character shows as `*`. Uses raw mode directly
 * (no readline output patching), handles backspace, Ctrl+C, and pasted text.
 */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    let value = '';
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const finish = (err?: Error) => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
      if (err) reject(err);
      else resolve(value);
    };

    const onData = (chunk: string) => {
      // Bracketed paste markers some terminals wrap pasted text in.
      const text = chunk.replace(/\x1b\[20[01]~/g, '');
      for (const ch of text) {
        if (ch === '\r' || ch === '\n') return finish();
        if (ch === '\u0003') return finish(new Error('Dibatalkan'));
        if (ch === '\u007f' || ch === '\b') {
          if (value.length > 0) {
            value = [...value].slice(0, -1).join('');
            stdout.write('\b \b');
          }
          continue;
        }
        if (ch < ' ') continue; // other control keys
        value += ch;
        stdout.write('*');
      }
    };
    stdin.on('data', onData);
  });
}

async function readPassword(): Promise<string> {
  const fromEnv = process.env['PG_PASSWORD'];
  if (fromEnv) return fromEnv;
  if (!process.stdin.isTTY) throw new Error('No terminal for the password prompt: set PG_PASSWORD');
  const first = await askHidden('Password baru: ');
  const second = await askHidden('Ulangi password: ');
  if (first !== second) throw new Error('Password tidak sama');
  return first;
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { username: { type: 'string' }, email: { type: 'string' }, name: { type: 'string' } },
  });
  const parsed = usernameSchema.safeParse(values.username ?? '');
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Username tidak valid');
  const username = parsed.data;
  const email = values.email?.trim().toLowerCase();

  const password = await readPassword();
  if (password.length < PASSWORD_MIN_LENGTH) throw new Error(`Password minimal ${PASSWORD_MIN_LENGTH} karakter`);
  const passwordHash = await hashPassword(password);

  const prisma = new PrismaService();
  try {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new Error('Tidak bisa terhubung ke database. Pastikan MySQL berjalan dan DATABASE_URL di apps/api/.env benar.');
    }
    const result = await prisma.$transaction(async (tx) => {
      const byUsername = await tx.user.findUnique({ where: { username } });
      if (byUsername) {
        if (email && byUsername.email !== email) throw new Error(`Username ${username} sudah dipakai akun ${byUsername.email}`);
        return { action: 'password diperbarui', user: await tx.user.update({ where: { id: byUsername.id }, data: { passwordHash } }) };
      }
      if (!email) throw new Error('Akun baru butuh --email');
      const byEmail = await tx.user.findUnique({ where: { email } });
      if (byEmail) {
        return {
          action: 'username dan password ditambahkan ke akun yang sudah ada',
          user: await tx.user.update({ where: { id: byEmail.id }, data: { username, passwordHash } }),
        };
      }
      const user = await tx.user.create({
        data: { id: uuidv7(), email, username, passwordHash, name: (values.name ?? username).slice(0, 120) },
      });
      await ensurePersonalGarage(tx, user);
      return { action: 'akun dibuat', user };
    });
    console.log(`OK: ${result.action} (${result.user.username} <${result.user.email}>)`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e: unknown) => {
  const code = (e as { code?: unknown } | null)?.code;
  if (code === 'P2021' || code === 'P2022') {
    console.error('Gagal: skema database belum terbaru. Jalankan dulu: npm run db:migrate -w @prime-garage/api');
    process.exit(1);
  }
  console.error(`Gagal: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
