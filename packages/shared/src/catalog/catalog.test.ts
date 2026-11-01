import { describe, expect, it } from 'vitest';
import { PARTS } from './parts.js';
import { RULE_TEMPLATES } from './rule-templates.js';
import { UNDERBONE_V1_PART_VIEWS, partCodeFromNodeName } from './model-views.js';

describe('catalog consistency', () => {
  const codes = new Set(PARTS.map((p) => p.code));
  it('part codes are unique', () => expect(codes.size).toBe(PARTS.length));
  it('every rule template references a known part', () => {
    for (const t of RULE_TEMPLATES) expect(codes.has(t.partCode), t.partCode).toBe(true);
  });
  it('every rule has an interval and resets on its own action', () => {
    for (const t of RULE_TEMPLATES) {
      expect(t.intervalKm != null || t.intervalMonths != null).toBe(true);
      expect(t.resetActions).toContain(t.action);
    }
  });
  it('every part has a 3D view on underbone_v1', () => {
    const viewCodes = new Set(UNDERBONE_V1_PART_VIEWS.map((v) => v.partCode));
    for (const p of PARTS) expect(viewCodes.has(p.code), p.code).toBe(true);
  });
  it('parses mesh names', () => {
    expect(partCodeFromNodeName('part__drive_chain__02')).toBe('drive_chain');
    expect(partCodeFromNodeName('part__spark_plug')).toBe('spark_plug');
    expect(partCodeFromNodeName('body__frame')).toBeNull();
  });
});
