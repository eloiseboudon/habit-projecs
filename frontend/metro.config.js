const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const MetroResolver = require('metro-resolver');

const config = getDefaultConfig(__dirname);
const previousResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three/examples/js/loaders/STLLoader') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'lib/shims/STLLoader.js'),
    };
  }

  if (moduleName === 'three/examples/js/loaders/PCDLoader') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'lib/shims/PCDLoader.js'),
    };
  }

  if (previousResolveRequest) {
    return previousResolveRequest(context, moduleName, platform);
  }

  return MetroResolver.resolve(context, moduleName, platform);
};

module.exports = config;
