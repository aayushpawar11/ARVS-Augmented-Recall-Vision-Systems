// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Set Expo Router app root before Metro config loads
// This is required for require.context to work properly
process.env.EXPO_ROUTER_APP_ROOT = './app';

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configure Metro to transform expo-router files in node_modules
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
  // Custom transformer to replace process.env.EXPO_ROUTER_APP_ROOT
  babelTransformerPath: require.resolve('./metro-transformer.js'),
  // Ensure expo-router files are transformed
  unstable_allowRequireContext: true,
};

// Configure resolver to transform expo-router
config.resolver = {
  ...config.resolver,
  // Transform expo-router files in node_modules
  unstable_enablePackageExports: true,
};

// Add workspace support for @arvs/shared
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...config.resolver.extraNodeModules,
    '@arvs/shared': path.resolve(__dirname, '../shared'),
  },
  nodeModulesPaths: [
    path.resolve(__dirname, 'node_modules'),
    path.resolve(__dirname, '../node_modules'),
  ],
};

// Add source extensions for TypeScript
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'ts', 'tsx'];

module.exports = config;

