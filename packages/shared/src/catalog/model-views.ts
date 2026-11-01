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
  /** Credit line shown in the viewer when the license requires attribution (CC BY). */
  attribution: string | null;
  defaultCamera: { position: Vec3; target: Vec3 };
};

export const MODEL_3D_ASSETS: Model3dAsset[] = [
  {
    key: 'underbone_v1',
    category: 'underbone',
    filePath: 'assets/models/underbone_v1.glb',
    version: 1,
    licenseNote: 'Dibuat prosedural oleh proyek PrimeGarage (MIT), skrip apps/mobile/scripts/generate-underbone-model.mjs',
    attribution: null,
    defaultCamera: { position: [2.1, 1.25, 2.3], target: [0, 0.5, 0] },
  },
  {
    key: 'honda_supra_x_125_fi_v1',
    category: 'underbone',
    filePath: 'assets/models/honda_supra_x_125_fi_v1.glb',
    version: 1,
    licenseNote:
      '"Honda Supra x 125" oleh boiledfish.vvti (https://sketchfab.com/3d-models/honda-supra-x-125-6d61abb3aa3a4161bda31ef783111015), CC BY 4.0. Diubah: orientasi, nama node, dan titik sentuh.',
    attribution: 'Model 3D: "Honda Supra x 125" oleh boiledfish.vvti, CC BY 4.0',
    defaultCamera: { position: [2.2, 1.3, 2.4], target: [0, 0.55, 0] },
  },
];

/** Fallback model when a vehicle-specific model cannot be loaded on a device. */
export const FALLBACK_MODEL_KEY = 'underbone_v1';

/** Node name prefix for non-interactive meshes; part lookup stops at these nodes. */
export const BODY_MESH_PREFIX = 'body__';

/** Mesh name prefix for interactive parts. */
export const PART_MESH_PREFIX = 'part__';

/** Extracts the part code from a node name like `part__drive_chain__02`. */
export function partCodeFromNodeName(name: string): string | null {
  if (!name.startsWith(PART_MESH_PREFIX)) return null;
  const rest = name.slice(PART_MESH_PREFIX.length);
  const code = rest.replace(/__(\d+|hs\d*)$/, '');
  return code.length > 0 ? code : null;
}

/** Hotspot marker meshes (`part__<code>__hs`, `part__<code>__hs2`) for parts without their own mesh. */
export function isHotspotNodeName(name: string): boolean {
  return /^part__.+__hs\d*$/.test(name);
}

function v(partCode: string, cameraPosition: Vec3, cameraTarget: Vec3): PartView {
  return { partCode, cameraPosition, cameraTarget, labelAnchor: cameraTarget };
}

export const UNDERBONE_V1_PART_VIEWS: PartView[] = [
  v('engine_oil', [0.35, 0.7, 1.15], [-0.06, 0.38, 0.15]),
  v('spark_plug', [0.95, 1.0, 0.75], [0.43, 0.55, 0.0]),
  v('air_filter', [0.35, 0.95, -1.05], [0.02, 0.6, -0.12]),
  v('drive_chain', [-0.3, 0.6, -1.35], [-0.3, 0.3, -0.12]),
  v('brake_pad_front', [0.95, 0.6, -0.95], [0.54, 0.38, -0.08]),
  v('brake_fluid', [0.95, 1.4, 0.8], [0.5, 1.03, 0.22]),
  v('brake_shoe_rear', [-0.95, 0.6, 0.95], [-0.62, 0.3, 0.08]),
  v('tire_front', [1.45, 0.65, 1.05], [0.62, 0.3, 0.0]),
  v('tire_rear', [-1.45, 0.65, 1.05], [-0.62, 0.3, 0.0]),
  v('battery', [0.05, 0.95, 1.05], [-0.02, 0.56, 0.0]),
  v('throttle_body', [0.55, 1.0, 0.9], [0.22, 0.57, 0.0]),
  v('clutch', [0.5, 0.55, 1.05], [0.1, 0.31, 0.14]),
  v('valve_clearance', [1.1, 0.75, 0.8], [0.46, 0.45, 0.0]),
  v('front_fork', [1.45, 0.95, 1.2], [0.56, 0.65, 0.0]),
  v('rear_shock', [-0.95, 0.85, 1.0], [-0.49, 0.55, 0.14]),
  v('lighting', [1.55, 1.25, 0.9], [0.63, 0.98, 0.0]),
  v('exhaust', [-0.2, 0.55, 1.35], [-0.3, 0.3, 0.2]),
  v('fuel_tank', [-0.3, 1.25, 1.0], [-0.27, 0.78, 0.0]),
];

/**
 * Honda Supra X 125 FI (Sketchfab model, normalized to the project axes).
 * The source model only separates wheels, forks, swingarm, fender, and handlebars, so the
 * remaining parts are marked with hotspot spheres placed at these anchors.
 */
export const SUPRA_X_125_ANCHORS: Record<string, Vec3> = {
  engine_oil: [0.1, 0.28, 0.14],
  spark_plug: [0.17, 0.45, 0.0],
  air_filter: [-0.2, 0.5, -0.12],
  drive_chain: [-0.4, 0.33, -0.11],
  brake_pad_front: [0.56, 0.36, -0.08],
  brake_fluid: [0.25, 1.05, 0.2],
  brake_shoe_rear: [-0.66, 0.32, 0.08],
  tire_front: [0.65, 0.29, 0.0],
  tire_rear: [-0.66, 0.32, 0.0],
  battery: [-0.05, 0.6, 0.0],
  throttle_body: [0.05, 0.5, 0.0],
  clutch: [-0.02, 0.36, 0.14],
  valve_clearance: [0.25, 0.38, 0.0],
  front_fork: [0.58, 0.62, 0.0],
  rear_shock: [-0.5, 0.55, 0.13],
  lighting: [0.45, 0.98, 0.0],
  exhaust: [-0.45, 0.42, 0.18],
  fuel_tank: [-0.4, 0.68, 0.0],
};

/** Extra hotspot positions for parts that appear in several places (e.g. head and tail lights). */
export const SUPRA_X_125_EXTRA_HOTSPOTS: { partCode: string; position: Vec3 }[] = [{ partCode: 'lighting', position: [-0.95, 0.8, 0.0] }];

/** Parts represented by the source model's own meshes (node renamed to part__<code>). */
export const SUPRA_X_125_MESH_PARTS: Record<string, string> = {
  wheel_front: 'tire_front',
  wheel_rear: 'tire_rear',
  forks_front: 'front_fork',
  forks_rear: 'rear_shock',
};

/** Camera view derived from an anchor: look at it from its own side, slightly above and in front. */
export function viewFromAnchor(partCode: string, anchor: Vec3): PartView {
  const side = anchor[2] < -0.03 ? -1 : 1;
  const cameraPosition: Vec3 = [anchor[0] + 0.35, anchor[1] + 0.35, anchor[2] + side * 1.0];
  return { partCode, cameraPosition, cameraTarget: anchor, labelAnchor: anchor };
}

export const SUPRA_X_125_PART_VIEWS: PartView[] = Object.entries(SUPRA_X_125_ANCHORS).map(([code, anchor]) => {
  if (code === 'tire_front' || code === 'tire_rear' || code === 'front_fork') {
    return { partCode: code, cameraPosition: [anchor[0] + 0.7, anchor[1] + 0.45, 1.3], cameraTarget: anchor, labelAnchor: anchor };
  }
  if (code === 'lighting') return { partCode: code, cameraPosition: [1.5, 1.3, 0.9], cameraTarget: anchor, labelAnchor: anchor };
  return viewFromAnchor(code, anchor);
});

export const PART_VIEWS_BY_MODEL: Record<string, PartView[]> = {
  underbone_v1: UNDERBONE_V1_PART_VIEWS,
  honda_supra_x_125_fi_v1: SUPRA_X_125_PART_VIEWS,
};

export function modelKeyForCategory(category: VehicleCategory): string {
  const exact = MODEL_3D_ASSETS.find((m) => m.category === category);
  // Only the underbone template exists for now; every other category reuses it until its model is added.
  return exact?.key ?? 'underbone_v1';
}
