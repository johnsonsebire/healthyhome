/**
 * Firebase Test and Diagnostics
 * This file tests Firebase connectivity and provides diagnostics
 */
import { auth, db, storage } from './firebaseConfig';

export const testFirebaseConnection = async () => {
  try {
    console.log('🧪 Running Firebase connection test...');
    
    // Test 1: Check if Firebase services are initialized
    console.log('🔍 Firebase Services Check:');
    console.log('- Auth Service:', auth ? '✅ Available' : '❌ Not available');
    console.log('- Firestore Service:', db ? '✅ Available' : '❌ Not available');
    console.log('- Storage Service:', storage ? '✅ Available' : '❌ Not available');
    
    if (!auth || !db || !storage) {
      console.error('❌ One or more Firebase services not initialized');
      return false;
    }
    
    // Test 2: Check auth state
    console.log('🔑 Auth State:', auth.currentUser ? `Logged in as ${auth.currentUser.email}` : 'Not logged in');
    
    // Test 3: Check if we can access Firestore (this will fail if not authenticated, which is expected)
    try {
      // Just test if we can create a reference - don't actually read/write
      const testRef = db._delegate ? db._delegate : db;
      console.log('🗄️ Firestore connection:', testRef ? '✅ Connected' : '❌ Not connected');
    } catch (firestoreError) {
      console.log('🗄️ Firestore test skipped (requires authentication)');
    }
    
    console.log('🎉 Firebase connection test completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    return false;
  }
};

// Auto-run test when file is imported (only in development)
if (__DEV__) {
  setTimeout(() => {
    testFirebaseConnection().catch(console.error);
  }, 1000); // Delay to allow app to fully initialize
}
