# Firebase Setup Guide for Family Medical App

## 1. Create Firebase Project

1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" 
3. Enter project name: `family-medical-app` (or your preferred name)
4. Enable Google Analytics (recommended)
5. Choose Analytics location
6. Click "Create project"

## 2. Add Web App

1. In Firebase Console, click the Web icon (`</>`)
2. Enter app nickname: `Family Medical App`
3. **DON'T** check "Set up Firebase Hosting" (not needed)
4. Click "Register app"
5. **COPY the configuration object shown**

## 3. Configure the App

Replace the placeholder values in `src/services/firebaseConfig.js` with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...", // Your actual API key
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id", 
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
  measurementId: "G-XXXXXXXXXX" // Optional
};
```

## 4. Enable Authentication

1. Go to Authentication → Sign-in method
2. Enable "Email/Password" provider
3. Click "Save"

## 5. Create Firestore Database

1. Go to Firestore Database
2. Click "Create database"
3. Choose "Start in test mode" 
4. Select location (choose closest to your users)
5. Click "Done"

## 6. Setup Storage

1. Go to Storage
2. Click "Get started"
3. Start in test mode
4. Use same location as Firestore
5. Click "Done"

## 7. Security Rules (Important!)

### Firestore Rules (allows authenticated users):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Storage Rules (allows authenticated users):
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 8. Test the Setup

After updating `firebaseConfig.js` with your values:
1. Save the file
2. Restart your Expo development server
3. Try to register a new user
4. Check Firebase Console → Authentication to see if user was created

## Common Issues

- **"Firebase app not initialized"**: Check if config values are correct
- **Authentication errors**: Ensure Email/Password is enabled in Firebase Console
- **Permission denied**: Check Firestore/Storage security rules
- **CORS errors**: This shouldn't happen with React Native, only web apps

## Next Steps

Once Firebase is working:
- Set up proper security rules for production
- Enable additional auth providers (Google, Apple, etc.)
- Set up Cloud Functions for server-side logic (optional)
- Configure Firebase hosting for web version (optional)
