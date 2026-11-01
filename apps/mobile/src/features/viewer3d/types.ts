import type { PartView, Vec3 } from '@prime-garage/shared';

export type Viewer3DProps = {
  modelKey: string;
  selectedPart: string | null;
  onSelectPart: (partCode: string | null) => void;
  /** Highlight color per part code (status colors in "status mode"). */
  partColors: Record<string, string>;
  /** Camera target for the selected part, or null for the default framing. */
  focusView: PartView | null;
  defaultCamera: { position: Vec3; target: Vec3 };
  onError: (error: Error) => void;
  dark: boolean;
};

/** Minimal controls contract shared by drei OrbitControls (web) and our native orbit controls. */
export type ControlsLike = {
  target: { x: number; y: number; z: number; set: (x: number, y: number, z: number) => void; lerp: (v: never, a: number) => void };
  update: () => void;
};
