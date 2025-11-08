module.exports = function(api) {
  api.cache(true);
  
  // Ensure EXPO_ROUTER_APP_ROOT is set for Babel transformation
  if (!process.env.EXPO_ROUTER_APP_ROOT) {
    process.env.EXPO_ROUTER_APP_ROOT = './app';
  }
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Expo Router babel plugin - needed for require.context transformation
      // Even though deprecated warning appears, it's still needed for the transform
      [
        require.resolve('expo-router/babel'),
        {
          root: './app',
        },
      ],
      // Reanimated plugin must be last
      'react-native-reanimated/plugin',
    ],
    // Transform expo-router files in node_modules
    overrides: [
      {
        include: /node_modules\/expo-router/,
        plugins: [
          [
            require.resolve('expo-router/babel'),
            {
              root: './app',
            },
          ],
        ],
      },
    ],
  };
};

