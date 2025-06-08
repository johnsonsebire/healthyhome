// Firebase Configuration Test
// Run this to verify Firebase is properly configured

import { auth, db, storage } from './firebaseConfig.js';

console.log('🔥 Firebase Configuration Test');
console.log('===============================');

// Test Firebase Auth
console.log('📧 Auth instance:', auth ? '✅ Initialized' : '❌ Failed');
console.log('📧 Auth app:', auth?.app?.name || 'Not available');
console.log('📧 Auth config:', auth?.config || 'Not available');

// Test Firestore
console.log('🗃️ Firestore instance:', db ? '✅ Initialized' : '❌ Failed');
console.log('🗃️ Firestore app:', db?.app?.name || 'Not available');

// Test Storage
console.log('📦 Storage instance:', storage ? '✅ Initialized' : '❌ Failed');
console.log('📦 Storage app:', storage?.app?.name || 'Not available');
console.log('📦 Storage bucket:', storage?._location?.bucket || 'Not available');

// Test AsyncStorage availability
import AsyncStorage from '@react-native-async-storage/async-storage';
console.log('💾 AsyncStorage:', AsyncStorage ? '✅ Available' : '❌ Missing');

export default function testFirebase() {
  return {
    auth: !!auth,
    firestore: !!db,
    storage: !!storage,
    asyncStorage: !!AsyncStorage,
    authPersistence: auth?._config?.persistence || 'Not configured'
  };
}
