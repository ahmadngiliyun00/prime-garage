import { Canvas, useThree } from '@react-three/fiber';
import { Asset } from 'expo-asset';
import { Suspense, useEffect, useState } from 'react';
import { ActivityIndicator, PanResponder, View } from 'react-native';
import * as THREE from 'three';
import { modelAssetFor } from './model-assets';
import { CameraRig, Stage, VehicleModel } from './scene';
import type { Viewer3DProps } from './types';

const LOAD_TIMEOUT_MS = 10_000;
const MIN_RADIUS = 0.5;
const MAX_RADIUS = 5;
const MIN_POLAR = 0.15;
const MAX_POLAR = Math.PI / 2 - 0.05;

/**
 * Orbit controls for React Native. Implements the same `{ target, update() }` contract as
 * drei OrbitControls so CameraRig works on both platforms.
 */
class NativeOrbitControls {
  readonly target = new THREE.Vector3();
  private readonly spherical = new THREE.Spherical();

  constructor(
    private readonly camera: THREE.Camera,
    private readonly invalidate: () => void,
  ) {}

  /** Re-derives the spherical state from the camera (called after programmatic moves). */
  update(): void {
    this.spherical.setFromVector3(this.camera.position.clone().sub(this.target));
    this.camera.lookAt(this.target);
  }

  rotate(dx: number, dy: number): void {
    this.update();
    this.spherical.theta -= dx * 0.008;
    this.spherical.phi = THREE.MathUtils.clamp(this.spherical.phi - dy * 0.008, MIN_POLAR, MAX_POLAR);
    this.apply();
  }

  zoom(scale: number): void {
    this.update();
    this.spherical.radius = THREE.MathUtils.clamp(this.spherical.radius / scale, MIN_RADIUS, MAX_RADIUS);
    this.apply();
  }

  private apply(): void {
    this.camera.position.copy(new THREE.Vector3().setFromSpherical(this.spherical).add(this.target));
    this.camera.lookAt(this.target);
    this.invalidate();
  }
}

/** One finger rotates, two fingers pinch to zoom. Taps fall through to the canvas for part selection. */
class OrbitGestures {
  private controls: NativeOrbitControls | null = null;
  private lastX = 0;
  private lastY = 0;
  private lastDist = 0;

  attach(controls: NativeOrbitControls): void {
    this.controls = controls;
  }

  readonly responder = PanResponder.create({
    onMoveShouldSetPanResponderCapture: (e, g) => e.nativeEvent.touches.length >= 2 || Math.abs(g.dx) + Math.abs(g.dy) > 6,
    onPanResponderGrant: (e) => {
      const t = e.nativeEvent.touches;
      this.lastX = t[0]?.pageX ?? 0;
      this.lastY = t[0]?.pageY ?? 0;
      this.lastDist = 0;
    },
    onPanResponderMove: (e) => {
      const t = e.nativeEvent.touches;
      const c = this.controls;
      if (!c || !t[0]) return;
      if (t.length >= 2 && t[1]) {
        const dist = Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);
        if (this.lastDist > 0) c.zoom(dist / this.lastDist);
        this.lastDist = dist;
        return;
      }
      c.rotate(t[0].pageX - this.lastX, t[0].pageY - this.lastY);
      this.lastX = t[0].pageX;
      this.lastY = t[0].pageY;
      this.lastDist = 0;
    },
  });
}

function ControlsBinder({ target, onReady }: { target: [number, number, number]; onReady: (c: NativeOrbitControls) => void }) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const set = useThree((s) => s.set);
  useEffect(() => {
    const controls = new NativeOrbitControls(camera, invalidate);
    controls.target.set(...target);
    controls.update();
    set({ controls: controls as unknown as THREE.EventDispatcher });
    onReady(controls);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera]);
  return null;
}

/** Native viewer: React Three Fiber on expo-gl. */
export function Viewer3D(props: Viewer3DProps) {
  const { modelKey, selectedPart, onSelectPart, partColors, focusView, defaultCamera, onError, dark } = props;
  const [uri, setUri] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [gestures] = useState(() => new OrbitGestures());

  useEffect(() => {
    let cancelled = false;
    const asset = Asset.fromModule(modelAssetFor(modelKey));
    asset
      .downloadAsync()
      .then(() => {
        if (!cancelled) setUri(asset.localUri ?? asset.uri);
      })
      .catch((e: unknown) => onError(e instanceof Error ? e : new Error('Gagal memuat model 3D')));
    return () => {
      cancelled = true;
    };
  }, [modelKey, onError]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!loaded) onError(new Error('Model 3D terlalu lama dimuat'));
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [loaded, onError]);

  return (
    <View style={{ flex: 1 }} {...gestures.responder.panHandlers} testID="viewer3d">
      <Canvas
        frameloop="demand"
        camera={{ position: defaultCamera.position, fov: 40, near: 0.01, far: 50 }}
        onPointerMissed={() => onSelectPart(null)}
      >
        <Stage dark={dark} />
        <ControlsBinder target={defaultCamera.target} onReady={(c) => gestures.attach(c)} />
        {uri ? (
          <Suspense fallback={null}>
            <VehicleModel
              uri={uri}
              selectedPart={selectedPart}
              partColors={partColors}
              onSelectPart={onSelectPart}
              onLoaded={() => setLoaded(true)}
            />
          </Suspense>
        ) : null}
        <CameraRig focusView={focusView} defaultCamera={defaultCamera} />
      </Canvas>
      {!loaded ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
          <ActivityIndicator color="#dc2626" />
        </View>
      ) : null}
    </View>
  );
}
