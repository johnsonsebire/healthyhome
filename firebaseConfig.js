import { initializeApp } from 'firebase/app';

// Optionally import the services that you want to use
import { initializeAuth, getReactNativePersistence, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initialize Firebase
const firebaseConfig = {
  apiKey: 'AIzaSyC2UB6QQeOW_du-5bGXbJC7N2dBP6hCqUo',
  authDomain: 'familyhealthapp-e5fd3.firebaseapp.com',
  projectId: 'familyhealthapp-e5fd3',
  storageBucket: 'familyhealthapp-e5fd3.firebasestorage.app',
  messagingSenderId: '320688524984',
  appId: '1:320688524984:web:be8dadb6bac8de118e6e4d',
  measurementId: 'G-K7MK2VGKL2',
};

console.log('🔥 Initializing Firebase with config:', {
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  apiKeyPresent: !!firebaseConfig.apiKey
});

const app = initializeApp(firebaseConfig);

console.log('🔥 Firebase app initialized, setting up services...');

// Initialize Firebase Authentication with AsyncStorage persistence
console.log('⚙️ Configuring Firebase Auth with AsyncStorage persistence...');
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
console.log('✅ Firebase Auth initialized with AsyncStorage persistence');

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);

console.log('✅ Firebase services initialized:', {
  hasAuth: !!auth,
  hasFirestore: !!db,
  hasStorage: !!storage,
  authDomain: auth.config?.authDomain,
  projectId: db.app.options.projectId
});

export default app;
