import { BadRequestException, type PipeTransform } from '@nestjs/common';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validates any RFC 4122/9562 UUID route param (we generate v7). */
export class UuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!UUID_RE.test(value)) throw new BadRequestException('ID tidak valid');
    return value.toLowerCase();
  }
}

export const uuid = new UuidPipe();
