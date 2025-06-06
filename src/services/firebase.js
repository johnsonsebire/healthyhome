/**
 * Firebase configuration and initialization
 */
import { getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import auth, {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from './firebaseAuth';

console.log('🔧 Firebase Service: Initializing remaining Firebase services');

// Get the initialized app from firebaseAuth
const app = getApps()[0];
if (!app) {
  throw new Error('Firebase app not initialized');
}

// Initialize other Firebase services
let db, storage;
try {
  db = getFirestore(app);
  storage = getStorage(app);
  console.log('✅ Firestore and Storage initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Firestore/Storage:', error);
  throw error;
}

// Export auth instance directly
export const authInstance = auth;

// Export initialized services
export { db, storage };

// Export auth functions
export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
};

// Export Firestore functions
export {
  doc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';

// Export Storage functions
export {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';