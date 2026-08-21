const { getDefaultConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * Use React Native defaults only. Do not add `require` / `import` to
 * `unstable_conditionNames` — that breaks `package.json` "exports" resolution
 * for some dependencies and can yield wrong interop (e.g. default export not a
 * function) during `Libraries/Core` setup on device.
 *
 * Zod v4 resolves with the default resolver.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
module.exports = getDefaultConfig(__dirname);
