// Firebase configuration
// Replace these values with your actual Firebase project configuration
// You can find these in Firebase Console > Project Settings > General > Your apps > Firebase SDK snippet
// src/services/firebaseConfig.js

import Constants from 'expo-constants';

// Fallback config in case env variables aren't working
const fallbackConfig = {
  apiKey: "AIzaSyC2UB6QQeOW_du-5bGXbJC7N2dBP6hCqUo",
  authDomain: "familyhealthapp-e5fd3.firebaseapp.com",
  projectId: "familyhealthapp-e5fd3",
  storageBucket: "familyhealthapp-e5fd3.firebasestorage.app",
  messagingSenderId: "320688524984",
  appId: "1:320688524984:web:be8dadb6bac8de118e6e4d"
};

// Try to get config from environment variables or Constants
let firebaseConfig;
try {
  // First try Constants (more reliable in production builds)
  if (Constants.expoConfig?.extra?.firebaseApiKey) {
    firebaseConfig = {
      apiKey: Constants.expoConfig.extra.firebaseApiKey,
      authDomain: Constants.expoConfig.extra.firebaseAuthDomain,
      projectId: Constants.expoConfig.extra.firebaseProjectId,
      storageBucket: Constants.expoConfig.extra.firebaseStorageBucket,
      messagingSenderId: Constants.expoConfig.extra.firebaseMessagingSenderId,
      appId: Constants.expoConfig.extra.firebaseAppId
    };
    console.log('✅ Using Firebase config from Constants');
  } 
  // Then try environment variables
  else if (process.env.EXPO_PUBLIC_FIREBASE_API_KEY) {
    firebaseConfig = {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
    };
    console.log('✅ Using Firebase config from environment variables');
  } 
  // Use fallback as last resort
  else {
    console.log('⚠️ Using fallback Firebase config');
    firebaseConfig = fallbackConfig;
  }
  
  // Check if any config values are undefined and use fallback
  const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'];
  const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);
  
  if (missingKeys.length > 0) {
    console.log(`⚠️ Missing Firebase config values: ${missingKeys.join(', ')}. Using fallback config.`);
    firebaseConfig = fallbackConfig;
  }
  
  console.log('🔧 Firebase Config Check:', {
    hasApiKey: !!firebaseConfig.apiKey,
    hasAuthDomain: !!firebaseConfig.authDomain,
    hasProjectId: !!firebaseConfig.projectId,
    projectId: firebaseConfig.projectId
  });
} catch (error) {
  console.error('❌ Error loading Firebase config:', error);
  console.log('⚠️ Using fallback Firebase config');
  firebaseConfig = fallbackConfig;
}

export default firebaseConfig;