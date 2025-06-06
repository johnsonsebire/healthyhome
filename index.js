import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';
import App from './App';
import { authInstance } from './src/services/firebase';

console.log('🔄 Initializing application with Firebase');

// Initialize Firebase asynchronously
async function initializeFirebase() {
  try {
    if (authInstance) {
      console.log('✅ Firebase auth ready:', {
        hasAuth: !!authInstance,
        authType: typeof authInstance,
        methods: Object.keys(authInstance),
      });
    } else {
      throw new Error('Firebase auth not initialized');
    }
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
  }
}

// Run initialization and register app
initializeFirebase().then(() => {
  registerRootComponent(App);
});

// Only ignore non-critical warnings in development
if (__DEV__) {
  LogBox.ignoreLogs([
    'Setting a timer',
    'AsyncStorage has been extracted from react-native core',
    'Warning: componentWillReceiveProps has been renamed',
    'Warning: componentWillMount has been renamed',
  ]);
}