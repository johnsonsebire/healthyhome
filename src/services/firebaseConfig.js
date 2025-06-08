// Firebase configuration
// This file contains the Firebase configuration and initialization
import Constants from 'expo-constants';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyC2UB6QQeOW_du-5bGXbJC7N2dBP6hCqUo",
  authDomain: "familyhealthapp-e5fd3.firebaseapp.com",
  projectId: "familyhealthapp-e5fd3",
  storageBucket: "familyhealthapp-e5fd3.firebasestorage.app",
  messagingSenderId: "320688524984",
  appId: "1:320688524984:web:be8dadb6bac8de118e6e4d"
};

// Initialize Firebase app only once
let app;
let auth;
let db;
let storage;

try {
  // Check if Firebase is already initialized
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase app initialized successfully');
  } else {
    app = getApps()[0];
    console.log('✅ Using existing Firebase app');
  }

  // Initialize Firebase services
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  
  console.log('✅ Firebase services initialized:', {
    hasAuth: !!auth,
    hasFirestore: !!db,
    hasStorage: !!storage
  });

} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  throw new Error(`Firebase failed to initialize: ${error.message}`);
}

// Export the initialized services
export { auth, db, storage };
export default firebaseConfig;