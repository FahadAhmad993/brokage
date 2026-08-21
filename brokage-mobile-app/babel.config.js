module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Zod v4 ESM uses `export * as` — Metro/Hermes need this transform for app + deps.
    '@babel/plugin-transform-export-namespace-from',
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        safe: false,
        allowUndefined: true,
      },
    ],
    // Worklets plugin — required by react-native-reanimated v4 (which is a
    // peer dep of react-native-keyboard-controller). Without it you get
    // "Native part of Worklets doesn't seem to be initialized" at runtime.
    // **Must be the LAST plugin in the list** (per Reanimated docs) — the
    // transform needs to see the final AST after every other plugin has
    // run, otherwise some workletized callbacks won't be picked up.
    'react-native-worklets/plugin',
  ],
};
