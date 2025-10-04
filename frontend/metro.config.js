const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const shim = (loader) => path.resolve(__dirname, `lib/shims/${loader}.js`);

config.resolver.alias = {
  ...(config.resolver.alias || {}),
  'three/examples/js/loaders/STLLoader': shim('STLLoader'),
  'three/examples/js/loaders/STLLoader.js': shim('STLLoader'),
  'three/examples/js/loaders/PCDLoader': shim('PCDLoader'),
  'three/examples/js/loaders/PCDLoader.js': shim('PCDLoader'),
  'three/examples/js/loaders/BinaryLoader': shim('BinaryLoader'),
  'three/examples/js/loaders/BinaryLoader.js': shim('BinaryLoader'),
};

module.exports = config;
