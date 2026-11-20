const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// 3D baby models are shipped as binary glTF files.
config.resolver.assetExts.push('glb');

module.exports = config;
