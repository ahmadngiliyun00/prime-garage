// Metro config: monorepo is auto-detected by expo/metro-config (SDK 52+).
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
// 3D models are bundled as assets (docs/3D-VIEWER.md)
config.resolver.assetExts.push('glb', 'gltf');

module.exports = withNativeWind(config, { input: './global.css' });
