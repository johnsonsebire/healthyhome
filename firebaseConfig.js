import { initializeApp } from 'firebase/app';

// Optionally import the services that you want to use
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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

const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);

export default app;
