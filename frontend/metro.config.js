const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { resolve } = require('metro-resolver');

const config = getDefaultConfig(__dirname);

config.resolver ??= {};

const shim = (loader) => path.resolve(__dirname, `lib/shims/${loader}.js`);

const shimmedLoaders = new Map([
  ['three/examples/js/loaders/STLLoader', shim('STLLoader')],
  ['three/examples/js/loaders/STLLoader.js', shim('STLLoader')],
  ['three/examples/js/loaders/PCDLoader', shim('PCDLoader')],
  ['three/examples/js/loaders/PCDLoader.js', shim('PCDLoader')],
  ['three/examples/js/loaders/BinaryLoader', shim('BinaryLoader')],
  ['three/examples/js/loaders/BinaryLoader.js', shim('BinaryLoader')],
]);

const previousResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (
  context,
  moduleName,
  platform,
  resolverOptions,
) => {
  const shimmed = shimmedLoaders.get(moduleName);
  if (shimmed) {
    return {
      type: 'sourceFile',
      filePath: shimmed,
    };
  }

  if (previousResolveRequest) {
    return previousResolveRequest(
      context,
      moduleName,
      platform,
      resolverOptions,
    );
  }

  return resolve(context, moduleName, platform, resolverOptions);
};

module.exports = config;
