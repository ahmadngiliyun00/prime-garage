/**
 * Default maintenance intervals (docs/MAINTENANCE-LOGIC.md section 6).
 * Initial general estimates; must be verified against the official service book.
 */
import type { ServiceAction, VehicleCategory } from '../enums.js';

export type RuleTemplateDefinition = {
  partCode: string;
  action: ServiceAction;
  category: VehicleCategory;
  intervalKm: number | null;
  intervalMonths: number | null;
  resetActions: ServiceAction[];
  sourceNote: string;
};

const NOTE = 'Estimasi umum awal, verifikasi dengan buku servis';

function r(
  partCode: string,
  action: ServiceAction,
  intervalKm: number | null,
  intervalMonths: number | null,
  resetActions: ServiceAction[],
): RuleTemplateDefinition {
  return { partCode, action, category: 'underbone', intervalKm, intervalMonths, resetActions, sourceNote: NOTE };
}

export const RULE_TEMPLATES: RuleTemplateDefinition[] = [
  r('engine_oil', 'replace', 2000, 3, ['replace']),
  r('spark_plug', 'inspect', 4000, 6, ['inspect', 'clean', 'replace']),
  r('spark_plug', 'replace', 8000, 12, ['replace']),
  r('air_filter', 'replace', 12000, 12, ['replace']),
  r('drive_chain', 'lubricate', 500, 1, ['lubricate', 'adjust', 'replace']),
  r('drive_chain', 'adjust', 1000, 2, ['adjust', 'replace']),
  r('drive_chain', 'replace', 20000, null, ['replace']),
  r('brake_pad_front', 'inspect', 4000, 4, ['inspect', 'replace']),
  r('brake_pad_front', 'replace', 12000, null, ['replace']),
  r('brake_shoe_rear', 'inspect', 4000, 4, ['inspect', 'adjust', 'replace']),
  r('brake_shoe_rear', 'replace', 15000, null, ['replace']),
  r('brake_fluid', 'inspect', 4000, 4, ['inspect', 'top_up', 'replace']),
  r('brake_fluid', 'replace', null, 24, ['replace']),
  r('tire_front', 'inspect', 2000, 1, ['inspect', 'replace']),
  r('tire_front', 'replace', 20000, 48, ['replace']),
  r('tire_rear', 'inspect', 2000, 1, ['inspect', 'replace']),
  r('tire_rear', 'replace', 15000, 48, ['replace']),
  r('battery', 'inspect', null, 6, ['inspect', 'replace']),
  r('battery', 'replace', null, 24, ['replace']),
  r('throttle_body', 'clean', 8000, 12, ['clean']),
  r('valve_clearance', 'adjust', 8000, 12, ['adjust']),
  r('clutch', 'inspect', 8000, 12, ['inspect', 'adjust', 'replace']),
  r('front_fork', 'inspect', 8000, 12, ['inspect', 'repair', 'replace']),
  r('lighting', 'inspect', null, 3, ['inspect', 'repair', 'replace']),
];

export function templatesForCategory(category: VehicleCategory): RuleTemplateDefinition[] {
  // Until other categories get their own tables, every motorcycle category falls back to underbone.
  const motorcycle = ['underbone', 'scooter', 'sport', 'trail', 'other'];
  return RULE_TEMPLATES.filter((t) => t.category === category || (motorcycle.includes(category) && t.category === 'underbone'));
}
