/** @type {import('jest').Config} */
const config = {
  // Jest will use jsdom for tests to simulate a browser environment
  testEnvironment: 'jsdom',
  // Transform files with babel-jest
  transform: {
    '^.+\\.(js|mjs)$': 'babel-jest',
  },
  // We need to tell jest to handle ES modules
  transformIgnorePatterns: [
    '/node_modules/',
  ],
  moduleNameMapper: {
    '^/script.js$': '<rootDir>/tests/mocks/script.js',
    '^/lib.js$': '<rootDir>/tests/mocks/lib.js',
    '^/scripts/extensions.js$': '<rootDir>/tests/mocks/extensions.js',
    '^/scripts/popup.js$': '<rootDir>/tests/mocks/popup.js',
    '^/scripts/power-user.js$': '<rootDir>/tests/mocks/power-user.js',
    '^/scripts/f-localStorage.js$': '<rootDir>/tests/mocks/f-localStorage.js',
    '^/scripts/i18n.js$': '<rootDir>/tests/mocks/i18n.js',
    'utils/json5\\.min\\.mjs$': '<rootDir>/utils/json5.min.mjs',
    'data/pluginSetting\\.js$': '<rootDir>/tests/mocks/pluginSetting.js',
    'scripts/settings/standaloneAPI\\.js$': '<rootDir>/tests/mocks/standaloneAPI.js',
    'scripts/settings/devConsole\\.js$': '<rootDir>/tests/mocks/devConsole.js',
  },
};

export default config;