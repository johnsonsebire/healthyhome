/**
 * Firebase services export
 * This file exports all Firebase services and functions from the centralized config
 */

// Import Firebase services from the main config
import { auth, db, storage } from '../../firebaseConfig';

// Export Firebase services
export { auth, db, storage };

// Export Firebase Auth functions
export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';

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
  onSnapshot
} from 'firebase/firestore';

// Export Storage functions
export {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';