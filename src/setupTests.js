import '@testing-library/jest-native/extend-expect';

// Mock Expo modules
jest.mock('expo-constants', () => ({
  default: {
    executionEnvironment: 'bare',
  },
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() => 
    Promise.resolve({ status: 'granted' })
  ),
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [{
        uri: 'test://image.jpg',
        fileSize: 1024,
      }]
    })
  ),
  MediaTypeOptions: {
    Images: 'Images',
  },
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [{
        uri: 'test://document.pdf',
        name: 'document.pdf',
        size: 2048,
      }]
    })
  ),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock Firebase
jest.mock('../firebaseConfig', () => ({
  auth: {},
  db: {},
  storage: {},
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn(),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: jest.fn(),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

// Mock DateTimePicker
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

// Mock Vector Icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Global test utilities
global.__TEST__ = true;

// Console warnings filter
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning: React.createElement')
  ) {
    return;
  }
  originalWarn.call(console, ...args);
};

// Mock timers for consistent testing
jest.useFakeTimers();

// Setup global test data
global.testUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
};

global.testRecord = {
  id: 'test-record-id',
  title: 'Test Record',
  type: 'prescription',
  familyMemberId: 'test-member-id',
  familyMemberName: 'Test Member',
  description: 'Test description',
  doctor: 'Dr. Test',
  date: '2024-01-01',
  notes: 'Test notes',
  attachments: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

global.testFamilyMember = {
  id: 'test-member-id',
  name: 'Test Member',
  relationship: 'Self',
  dateOfBirth: '1990-01-01',
  userId: 'test-user-id',
};
