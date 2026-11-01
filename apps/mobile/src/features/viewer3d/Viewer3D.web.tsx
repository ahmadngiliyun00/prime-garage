import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Asset } from 'expo-asset';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { modelAssetFor } from './model-assets';
import { CameraRig, Stage, VehicleModel } from './scene';
import type { Viewer3DProps } from './types';

const LOAD_TIMEOUT_MS = 10_000;

export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Web viewer: React Three Fiber + drei OrbitControls (mouse, touch, wheel). */
export function Viewer3D(props: Viewer3DProps) {
  const { modelKey, selectedPart, onSelectPart, partColors, focusView, defaultCamera, onError, dark } = props;
  const uri = useMemo(() => Asset.fromModule(modelAssetFor(modelKey)).uri, [modelKey]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isWebGLAvailable()) {
      onError(new Error('WebGL tidak tersedia di browser ini'));
      return;
    }
    const t = setTimeout(() => {
      if (!loaded) onError(new Error('Model 3D terlalu lama dimuat'));
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [loaded, onError]);

  return (
    <View style={{ flex: 1 }} testID="viewer3d">
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ position: defaultCamera.position, fov: 40, near: 0.01, far: 50 }}
        onPointerMissed={() => onSelectPart(null)}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', () => onError(new Error('Konteks WebGL hilang')));
        }}
      >
        <Stage dark={dark} />
        <OrbitControls
          makeDefault
          target={defaultCamera.target}
          enablePan
          minDistance={0.5}
          maxDistance={5}
          maxPolarAngle={Math.PI / 2 - 0.05}
          enableDamping={false}
        />
        <Suspense fallback={null}>
          <VehicleModel
            uri={uri}
            selectedPart={selectedPart}
            partColors={partColors}
            onSelectPart={onSelectPart}
            onLoaded={() => setLoaded(true)}
          />
        </Suspense>
        <CameraRig focusView={focusView} defaultCamera={defaultCamera} />
      </Canvas>
    </View>
  );
}
