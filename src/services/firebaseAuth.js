/**
 * Firebase Auth for Expo/React Native
 * Using Firebase Web SDK with proper Expo compatibility
 */
import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth,
  signInWithEmailAndPassword as firebaseSignIn,
  createUserWithEmailAndPassword as firebaseCreateUser,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail
} from 'firebase/auth';
import firebaseConfig from './firebaseConfig';

// Initialize Firebase app (only once)
let app;
let auth;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase app initialized in firebaseAuth.js');
  } else {
    app = getApps()[0];
    console.log('✅ Using existing Firebase app in firebaseAuth.js');
  }

  // Initialize Auth with standard getAuth (works with Expo)
  auth = getAuth(app);
  console.log('✅ Firebase Auth initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Firebase Auth in firebaseAuth.js:', error);
  throw new Error(`Failed to initialize Firebase Auth: ${error.message}`);
}

// Export auth instance
export default auth;

// Export auth methods
export const signInWithEmailAndPassword = (email, password) => firebaseSignIn(auth, email, password);
export const createUserWithEmailAndPassword = (email, password) => firebaseCreateUser(auth, email, password);
export const signOut = () => firebaseSignOut(auth);
export const onAuthStateChanged = (callback) => firebaseOnAuthStateChanged(auth, callback);
export const sendPasswordResetEmail = (email) => firebaseSendPasswordResetEmail(auth, email);
