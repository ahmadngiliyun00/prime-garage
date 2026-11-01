// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'scripts/*', '.expo/*'],
  },
  {
    // React Three Fiber JSX uses three.js props (args, attach, position, ...)
    files: ['src/features/viewer3d/**/*.tsx'],
    rules: { 'react/no-unknown-property': 'off' },
  },
]);
