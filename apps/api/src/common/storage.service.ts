import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

const URL_TTL_SECONDS = 3600;

/**
 * Local disk storage for uploads (ARCHITECTURE.md section 2.2). Files live outside the code
 * folder and are served only through signed, short-lived URLs.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  readonly root = path.resolve(process.cwd(), env.STORAGE_DIR);

  absolute(relativePath: string): string {
    const full = path.resolve(this.root, relativePath);
    if (!full.startsWith(this.root + path.sep)) throw new Error('Path traversal blocked');
    return full;
  }

  async write(relativePath: string, data: Buffer): Promise<void> {
    const full = this.absolute(relativePath);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  }

  async remove(relativePaths: string[]): Promise<void> {
    for (const p of relativePaths) {
      try {
        await rm(this.absolute(p), { force: true });
      } catch (e) {
        this.logger.warn(`Failed to delete ${p}: ${(e as Error).message}`);
      }
    }
  }

  private sign(id: string, exp: number): string {
    return createHmac('sha256', env.JWT_ACCESS_SECRET).update(`attachment:${id}:${exp}`).digest('base64url');
  }

  /** Relative URL (to the API origin) valid for one hour. */
  signedUrl(attachmentId: string): string {
    const exp = Math.floor(Date.now() / 1000) + URL_TTL_SECONDS;
    return `/api/attachments/${attachmentId}/file?exp=${exp}&sig=${this.sign(attachmentId, exp)}`;
  }

  verify(attachmentId: string, exp: string | undefined, sig: string | undefined): boolean {
    if (!exp || !sig) return false;
    const expNum = Number(exp);
    if (!Number.isFinite(expNum) || expNum < Date.now() / 1000) return false;
    const expected = Buffer.from(this.sign(attachmentId, expNum));
    const given = Buffer.from(sig);
    return expected.length === given.length && timingSafeEqual(expected, given);
  }
}
