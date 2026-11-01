import { BadRequestException } from '@nestjs/common';
import { serviceRecordSchema } from '@prime-garage/shared';
import { UuidPipe } from './uuid.pipe.js';
import { ZodValidationPipe } from './zod-validation.pipe.js';

describe('UuidPipe', () => {
  const pipe = new UuidPipe();
  it('accepts a v7 uuid', () => {
    expect(pipe.transform('01A197B6-FA1E-704E-8447-AB15B76952F0')).toBe('01a197b6-fa1e-704e-8447-ab15b76952f0');
  });
  it('rejects garbage', () => {
    expect(() => pipe.transform('../etc/passwd')).toThrow(BadRequestException);
  });
});

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(serviceRecordSchema);
  it('returns field errors in Indonesian', () => {
    try {
      pipe.transform({ serviceDate: '10-01-2026', odometerKm: -1, items: [] });
      throw new Error('should fail');
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      const body = (e as BadRequestException).getResponse() as { errors: { path: string }[] };
      expect(body.errors.map((x) => x.path).sort()).toEqual(['items', 'odometerKm', 'serviceDate']);
    }
  });
});
