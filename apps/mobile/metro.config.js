// Metro config: monorepo is auto-detected by expo/metro-config (SDK 52+).
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
// 3D models are bundled as assets (docs/3D-VIEWER.md)
config.resolver.assetExts.push('glb', 'gltf');

// three >= 0.181 ships `build/three.cjs` as a deprecation shim that calls `process.emitWarning`,
// which does not exist in React Native, so `require('three')` (used by @react-three/fiber/native)
// crashes on device. The shim only re-exports `three.module.js`, so resolve every `three` import
// straight to the ES module build. This also keeps a single three instance in the bundle.
const threeModule = path.join(path.dirname(require.resolve('three')), 'three.module.js');
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') return { type: 'sourceFile', filePath: threeModule };
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
