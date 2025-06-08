/**
 * Firebase Connection Test Utility
 * Use this to test if Firebase services are properly configured
 */
import { auth, db } from '../../firebaseConfig';
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';

export const testFirebaseConnection = async () => {
  try {
    console.log('🔥 Testing Firebase connection...');
    
    // Test Firebase App initialization
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }
    
    if (!db) {
      throw new Error('Firebase Firestore not initialized');
    }
    
    console.log('✅ Firebase services initialized successfully');
    console.log('📱 Auth domain:', auth.config.authDomain);
    console.log('🗂️ Project ID:', db.app.options.projectId);
    
    // Test auth configuration
    console.log('🔐 Auth current user:', auth.currentUser);
    console.log('🔐 Auth settings:', {
      apiKey: auth.config.apiKey ? '✅ Present' : '❌ Missing',
      authDomain: auth.config.authDomain ? '✅ Present' : '❌ Missing',
    });
    
    return {
      success: true,
      auth: !!auth,
      firestore: !!db,
      authDomain: auth.config.authDomain,
      projectId: db.app.options.projectId
    };
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const getFirebaseDebugInfo = () => {
  return {
    authInitialized: !!auth,
    firestoreInitialized: !!db,
    authConfig: auth?.config || 'Not available',
    appOptions: db?.app?.options || 'Not available'
  };
};
