const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { resolve } = require('metro-resolver');

const config = getDefaultConfig(__dirname);

const shim = (loader) => path.resolve(__dirname, `lib/shims/${loader}.js`);

const shimmedLoaders = new Map([
  ['three/examples/js/loaders/STLLoader', shim('STLLoader')],
  ['three/examples/js/loaders/STLLoader.js', shim('STLLoader')],
  ['three/examples/js/loaders/PCDLoader', shim('PCDLoader')],
  ['three/examples/js/loaders/PCDLoader.js', shim('PCDLoader')],
  ['three/examples/js/loaders/BinaryLoader', shim('BinaryLoader')],
  ['three/examples/js/loaders/BinaryLoader.js', shim('BinaryLoader')],
]);

const createResolveRequest = (fallbackResolveRequest) => (
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

  const legacyLoaderMatch = moduleName.match(
    /^three\/examples\/js\/loaders\/(.+?)(?:\.js)?$/,
  );

  if (legacyLoaderMatch) {
    const [, loaderName] = legacyLoaderMatch;
    const fallback = shimmedLoaders.get(
      `three/examples/js/loaders/${loaderName}.js`,
    );

    if (fallback) {
      return {
        type: 'sourceFile',
        filePath: fallback,
      };
    }
  }

  if (fallbackResolveRequest) {
    return fallbackResolveRequest(
      context,
      moduleName,
      platform,
      resolverOptions,
    );
  }

  return resolve(context, moduleName, platform, resolverOptions);
};

module.exports = {
  ...config,
  resolver: {
    ...config.resolver,
    resolveRequest: createResolveRequest(config.resolver?.resolveRequest),
    extraNodeModules: {
      ...config.resolver?.extraNodeModules,
      ...Object.fromEntries(
        [...shimmedLoaders.entries()].map(([specifier, filePath]) => [specifier, filePath]),
      ),
    },
  },
};
