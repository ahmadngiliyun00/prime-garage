/** Bundled GLB files per model_3d_assets.key (docs/3D-VIEWER.md section 3.1). */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const underboneV1: number = require('../../../assets/models/underbone_v1.glb');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const hondaSupraX125FiV1: number = require('../../../assets/models/honda_supra_x_125_fi_v1.glb');

export const MODEL_ASSETS: Record<string, number> = {
  underbone_v1: underboneV1,
  honda_supra_x_125_fi_v1: hondaSupraX125FiV1,
};

export function modelAssetFor(key: string): number {
  return MODEL_ASSETS[key] ?? underboneV1;
}
