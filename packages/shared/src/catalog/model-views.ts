/**
 * 3D asset registry and per-part camera views (docs/3D-VIEWER.md).
 * Coordinates in meters, vehicle faces +X, Y up, +Z is the rider's right side.
 */
import type { VehicleCategory } from '../enums.js';

export type Vec3 = [number, number, number];

export type PartView = {
  partCode: string;
  cameraPosition: Vec3;
  cameraTarget: Vec3;
  labelAnchor: Vec3;
};

export type Model3dAsset = {
  key: string;
  category: VehicleCategory;
  filePath: string;
  version: number;
  licenseNote: string;
  defaultCamera: { position: Vec3; target: Vec3 };
};

export const MODEL_3D_ASSETS: Model3dAsset[] = [
  {
    key: 'underbone_v1',
    category: 'underbone',
    filePath: 'assets/models/underbone_v1.glb',
    version: 1,
    licenseNote: 'Dibuat prosedural oleh proyek PrimeGarage (MIT), skrip apps/mobile/scripts/generate-underbone-model.mjs',
    defaultCamera: { position: [2.1, 1.25, 2.3], target: [0, 0.5, 0] },
  },
];

/** Mesh name prefix for interactive parts. */
export const PART_MESH_PREFIX = 'part__';

/** Extracts the part code from a node name like `part__drive_chain__02`. */
export function partCodeFromNodeName(name: string): string | null {
  if (!name.startsWith(PART_MESH_PREFIX)) return null;
  const rest = name.slice(PART_MESH_PREFIX.length);
  const code = rest.replace(/__\d+$/, '');
  return code.length > 0 ? code : null;
}

function v(partCode: string, cameraPosition: Vec3, cameraTarget: Vec3): PartView {
  return { partCode, cameraPosition, cameraTarget, labelAnchor: cameraTarget };
}

export const UNDERBONE_V1_PART_VIEWS: PartView[] = [
  v('engine_oil', [0.45, 0.65, 1.15], [0.0, 0.3, 0.19]),
  v('spark_plug', [1.0, 1.05, 0.75], [0.4, 0.53, 0.0]),
  v('air_filter', [0.35, 0.95, -1.05], [0.02, 0.6, -0.12]),
  v('drive_chain', [-0.3, 0.6, -1.35], [-0.3, 0.3, -0.12]),
  v('brake_pad_front', [0.95, 0.6, -0.95], [0.52, 0.4, -0.08]),
  v('brake_fluid', [0.95, 1.4, 0.8], [0.5, 1.03, 0.22]),
  v('brake_shoe_rear', [-0.95, 0.6, 0.95], [-0.62, 0.3, 0.08]),
  v('tire_front', [1.45, 0.65, 1.05], [0.62, 0.3, 0.0]),
  v('tire_rear', [-1.45, 0.65, 1.05], [-0.62, 0.3, 0.0]),
  v('battery', [-0.1, 0.95, 1.05], [-0.12, 0.55, 0.0]),
  v('throttle_body', [0.55, 1.0, 0.9], [0.22, 0.57, 0.0]),
  v('clutch', [0.5, 0.55, 1.05], [0.12, 0.33, 0.17]),
  v('valve_clearance', [1.15, 0.8, 0.7], [0.46, 0.45, 0.0]),
  v('front_fork', [1.45, 0.95, 1.2], [0.56, 0.65, 0.0]),
  v('rear_shock', [-0.95, 0.85, 1.0], [-0.5, 0.55, 0.14]),
  v('lighting', [1.55, 1.3, 0.9], [0.66, 1.0, 0.0]),
  v('exhaust', [-0.2, 0.55, 1.35], [-0.3, 0.3, 0.2]),
  v('fuel_tank', [-0.3, 1.25, 1.0], [-0.27, 0.76, 0.0]),
];

export const PART_VIEWS_BY_MODEL: Record<string, PartView[]> = {
  underbone_v1: UNDERBONE_V1_PART_VIEWS,
};

export function modelKeyForCategory(category: VehicleCategory): string {
  const exact = MODEL_3D_ASSETS.find((m) => m.category === category);
  // Only the underbone template exists for now; every other category reuses it until its model is added.
  return exact?.key ?? 'underbone_v1';
}
