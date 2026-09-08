module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Some Expo packages are not hoisted, because expo-modules-core's peer range for
  // react-native-worklets conflicts with the version reanimated 4 needs. Letting
  // Jest fall back to expo's own node_modules resolves them without installing a
  // duplicate or loosening the dependency tree.
  moduleDirectories: ['node_modules', '<rootDir>/node_modules/expo/node_modules'],
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
};
