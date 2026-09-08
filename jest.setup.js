// React 19 only enables act(...) support when the environment opts in, and the
// preset does not set this for us.
global.IS_REACT_ACT_ENVIRONMENT = true;

// Every persistence test runs against the in-memory fake, never a native module.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('./src/test/asyncStorage').mockAsyncStorage,
);
