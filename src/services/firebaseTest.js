// Firebase Test Script
// Run this to verify Firebase is properly configured
import { auth, db } from './firebase';
import Constants from 'expo-constants';

export const testFirebaseConnection = async () => {
  try {
    console.log('🧪 Testing Firebase connection...');
    
    // Test 0: Check environment variables
    console.log('🔍 Checking Firebase environment variables:');
    console.log('- Constants.expoConfig.extra:', Constants.expoConfig?.extra ? 'Available' : 'Not available');
    if (Constants.expoConfig?.extra?.firebaseApiKey) {
      console.log('✅ Firebase config found in Constants');
    } else {
      console.log('⚠️ No Firebase config in Constants');
    }
    
    // Test 1: Check if auth is initialized
    if (auth) {
      console.log('✅ Firebase Auth is initialized');
      console.log('Auth currentUser:', auth.currentUser);
    } else {
      console.error('❌ Firebase Auth is not initialized');
      return false;
    }
    
    // Test 2: Check if Firestore is initialized
    if (db) {
      console.log('✅ Firestore is initialized');
    } else {
      console.error('❌ Firestore is not initialized');
      return false;
    }
    
    console.log('🎉 Firebase connection test passed!');
    return true;
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    return false;
  }
};

// Auto-run test when imported
testFirebaseConnection();
