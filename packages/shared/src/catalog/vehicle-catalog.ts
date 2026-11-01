/** Seed catalog of brands and vehicle models. */
import type { VehicleCategory, VehicleKind } from '../enums.js';

export type BrandDefinition = { slug: string; name: string };

export type VehicleModelDefinition = {
  brandSlug: string;
  name: string;
  slug: string;
  kind: VehicleKind;
  category: VehicleCategory;
  engineCc: number;
  fuelSystem: 'carburetor' | 'injection' | null;
  transmission: 'manual' | 'semi_automatic' | 'automatic' | null;
  finalDrive: 'chain' | 'belt' | 'shaft' | null;
  yearStart: number | null;
  yearEnd: number | null;
  model3dKey: string;
  specs: Record<string, string | number>;
};

export const BRANDS: BrandDefinition[] = [
  { slug: 'honda', name: 'Honda' },
  { slug: 'yamaha', name: 'Yamaha' },
  { slug: 'suzuki', name: 'Suzuki' },
  { slug: 'kawasaki', name: 'Kawasaki' },
  { slug: 'tvs', name: 'TVS' },
  { slug: 'vespa-piaggio', name: 'Vespa/Piaggio' },
];

function underbone(
  brandSlug: string,
  name: string,
  slug: string,
  engineCc: number,
  fuelSystem: 'carburetor' | 'injection',
  yearStart: number | null,
  yearEnd: number | null,
  specs: Record<string, string | number> = {},
): VehicleModelDefinition {
  return {
    brandSlug,
    name,
    slug,
    kind: 'motorcycle',
    category: 'underbone',
    engineCc,
    fuelSystem,
    transmission: 'semi_automatic',
    finalDrive: 'chain',
    yearStart,
    yearEnd,
    model3dKey: 'underbone_v1',
    specs,
  };
}

export const VEHICLE_MODELS: VehicleModelDefinition[] = [
  underbone('honda', 'Supra X 125 FI', 'honda-supra-x-125-fi', 125, 'injection', 2014, null, {
    engineOilCapacityL: 0.8,
    tireFront: '70/90-17',
    tireRear: '80/90-17',
  }),
  underbone('honda', 'Supra X 125', 'honda-supra-x-125', 125, 'carburetor', 2005, 2013),
  underbone('honda', 'Revo X', 'honda-revo-x', 110, 'injection', 2014, null),
  underbone('honda', 'Blade 125 FI', 'honda-blade-125-fi', 125, 'injection', 2014, 2019),
  underbone('yamaha', 'Jupiter Z1', 'yamaha-jupiter-z1', 115, 'injection', 2012, null),
  underbone('yamaha', 'Vega Force', 'yamaha-vega-force', 115, 'injection', 2015, null),
  underbone('suzuki', 'Smash FI', 'suzuki-smash-fi', 115, 'injection', 2016, null),
  underbone('kawasaki', 'Kaze ZX 130', 'kawasaki-kaze-zx-130', 130, 'carburetor', 2008, 2012),
];
