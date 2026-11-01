import { useFrame, useLoader, useThree, type ThreeEvent } from '@react-three/fiber';
import { BODY_MESH_PREFIX, isHotspotNodeName, partCodeFromNodeName, type PartView, type Vec3 } from '@prime-garage/shared';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { ControlsLike } from './types';

const SELECT_COLOR = '#2563eb';
const HOTSPOT_SELECTED_COLOR = '#dc2626';

/**
 * Finds the part code of a mesh by walking up to the nearest `part__*` node.
 * A `body__*` node on the way means the mesh is non-interactive.
 */
export function partCodeOf(object: THREE.Object3D | null): string | null {
  let o: THREE.Object3D | null = object;
  while (o) {
    const code = partCodeFromNodeName(o.name);
    if (code) return code;
    if (o.name.startsWith(BODY_MESH_PREFIX)) return null;
    o = o.parent;
  }
  return null;
}

/** Hotspot markers stay visible through the bodywork so users can find hidden parts (oil, spark plug, ...). */
function prepareHotspots(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const hotspot = isHotspotNodeName(mesh.name) || (mesh.parent != null && isHotspotNodeName(mesh.parent.name));
    if (!hotspot) return;
    const m = (mesh.material as THREE.Material).clone();
    m.depthTest = false;
    m.transparent = true;
    mesh.material = m;
    mesh.renderOrder = 10;
  });
}

type MeshWithOriginal = THREE.Mesh & { userData: { originalMaterial?: THREE.Material } };

export function VehicleModel({
  uri,
  selectedPart,
  partColors,
  onSelectPart,
  onLoaded,
}: {
  uri: string;
  selectedPart: string | null;
  partColors: Record<string, string>;
  onSelectPart: (code: string | null) => void;
  onLoaded: () => void;
}) {
  const gltf = useLoader(GLTFLoader, uri);
  const scene = useMemo(() => {
    const s = gltf.scene.clone(true);
    prepareHotspots(s);
    return s;
  }, [gltf]);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    onLoaded();
  }, [onLoaded]);

  // Highlight: selected part in blue, other parts in their status color (FR-3D-03, FR-3D-05).
  // Hotspot markers: the selected one turns red and grows, the others fade so the focus stays clear.
  useEffect(() => {
    scene.traverse((obj) => {
      const mesh = obj as MeshWithOriginal;
      if (!mesh.isMesh) return;
      mesh.userData.originalMaterial ??= mesh.material as THREE.Material;
      const original = mesh.userData.originalMaterial as THREE.MeshStandardMaterial;
      const code = partCodeOf(mesh);
      const isSelected = code != null && code === selectedPart;
      const hotspot = isHotspotNodeName(mesh.name);

      if (hotspot) {
        const m = original.clone();
        const status = code ? partColors[code] : undefined;
        if (isSelected) m.color = new THREE.Color(HOTSPOT_SELECTED_COLOR);
        else if (status) m.color = new THREE.Color(status);
        m.emissive = m.color.clone();
        m.emissiveIntensity = 0.6;
        m.opacity = selectedPart && !isSelected ? 0.35 : 0.95;
        mesh.material = m;
        mesh.scale.setScalar(isSelected ? 1.6 : 1);
        return;
      }

      const color = isSelected ? SELECT_COLOR : code ? partColors[code] : undefined;
      if (!color) {
        mesh.material = original;
        return;
      }
      const m = original.clone();
      const c = new THREE.Color(color);
      if (isSelected) {
        // Keep the part recognizable but clearly highlighted.
        m.color.lerp(c, 0.55);
        m.emissive = c;
        m.emissiveIntensity = 0.6;
      } else {
        // Status mode: paint the part in its status color.
        m.color = c;
        m.emissive = c;
        m.emissiveIntensity = 0.3;
        m.metalness = Math.min(m.metalness, 0.3);
      }
      mesh.material = m;
    });
    invalidate();
  }, [scene, selectedPart, partColors, invalidate]);

  // R3F delivers the click to every intersected mesh, nearest first. Bodywork without a part code
  // lets the event continue, so a hotspot behind the body panel still gets selected.
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return; // a drag, not a tap
    const code = partCodeOf(e.object);
    if (!code) return;
    e.stopPropagation();
    onSelectPart(code);
  };

  return <primitive object={scene} onClick={onClick} />;
}

/** Smoothly moves the camera to the selected part view (or the default framing). */
export function CameraRig({ focusView, defaultCamera }: { focusView: PartView | null; defaultCamera: { position: Vec3; target: Vec3 } }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null;
  const invalidate = useThree((s) => s.invalidate);
  const goal = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  useEffect(() => {
    const view = focusView ? { position: focusView.cameraPosition, target: focusView.cameraTarget } : defaultCamera;
    goal.current = { position: new THREE.Vector3(...view.position), target: new THREE.Vector3(...view.target) };
    invalidate();
  }, [focusView, defaultCamera, invalidate]);

  useFrame((_, delta) => {
    const g = goal.current;
    if (!g || !controls) return;
    const a = 1 - Math.exp(-delta * 6);
    camera.position.lerp(g.position, a);
    (controls.target as unknown as THREE.Vector3).lerp(g.target, a);
    controls.update();
    if (camera.position.distanceTo(g.position) < 0.005 && (controls.target as unknown as THREE.Vector3).distanceTo(g.target) < 0.005) {
      goal.current = null;
    } else {
      invalidate();
    }
  });

  return null;
}

export function Stage({ dark }: { dark: boolean }) {
  return (
    <>
      <color attach="background" args={[dark ? '#0f172a' : '#e2e8f0']} />
      <hemisphereLight args={['#ffffff', '#64748b', 2.0]} />
      <directionalLight position={[3, 5, 4]} intensity={2.4} />
      <directionalLight position={[-3, 2, -3]} intensity={0.8} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
        <circleGeometry args={[1.5, 48]} />
        <meshStandardMaterial color={dark ? '#1e293b' : '#cbd5e1'} />
      </mesh>
    </>
  );
}
