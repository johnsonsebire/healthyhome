// Mock Firebase config for testing
jest.mock('../../firebaseConfig', () => ({
  db: {},
  auth: {},
  storage: {},
  functions: {},
}));
