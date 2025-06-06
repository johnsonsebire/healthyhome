/**
 * Firebase Auth for Expo/React Native
 * Using Firebase Web SDK v11 with proper Expo compatibility
 */
import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth,
  signInWithEmailAndPassword as firebaseSignIn,
  createUserWithEmailAndPassword as firebaseCreateUser,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged
} from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyC2UB6QQeOW_du-5bGXbJC7N2dBP6hCqUo",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "familyhealthapp-e5fd3.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "familyhealthapp-e5fd3",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "familyhealthapp-e5fd3.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "320688524984",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:320688524984:web:be8dadb6bac8de118e6e4d",
};

console.log('🔧 Firebase Config Check:', {
  hasApiKey: !!firebaseConfig.apiKey,
  hasAuthDomain: !!firebaseConfig.authDomain,
  hasProjectId: !!firebaseConfig.projectId,
  projectId: firebaseConfig.projectId
});

// Initialize Firebase app (only once)
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase app initialized');
} else {
  app = getApps()[0];
  console.log('✅ Firebase app already initialized');
}

// Initialize Auth with standard getAuth (works with Expo)
const auth = getAuth(app);
console.log('✅ Firebase Auth initialized');

// Export auth instance and methods
export default auth;
export const signInWithEmailAndPassword = (email, password) => firebaseSignIn(auth, email, password);
export const createUserWithEmailAndPassword = (email, password) => firebaseCreateUser(auth, email, password);
export const signOut = () => firebaseSignOut(auth);
export const onAuthStateChanged = (callback) => firebaseOnAuthStateChanged(auth, callback);