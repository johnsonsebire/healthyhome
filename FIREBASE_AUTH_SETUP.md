# Firebase Authentication Setup Guide

## Error: auth/configuration-not-found

This error occurs when Firebase Authentication is not properly configured in your Firebase Console.

## Steps to Fix:

### 1. Go to Firebase Console
1. Visit https://console.firebase.google.com
2. Select your project: `familyhealthapp-e5fd3`

### 2. Enable Authentication
1. In the left sidebar, click on **Authentication**
2. Click on **Get started** if you haven't set up Authentication yet

### 3. Enable Email/Password Authentication
1. Go to the **Sign-in method** tab
2. Click on **Email/Password**
3. Enable the first toggle: **Email/Password**
4. Optionally enable **Email link (passwordless sign-in)** if needed
5. Click **Save**

### 4. Configure Authorized Domains
1. In the **Sign-in method** tab, scroll down to **Authorized domains**
2. Make sure the following domains are listed:
   - `localhost` (for local development)
   - `familyhealthapp-e5fd3.firebaseapp.com` (your Firebase domain)
   - Any custom domains you plan to use

### 5. Check Authentication Settings
1. Go to the **Settings** tab in Authentication
2. Verify your project configuration
3. Check that the Web API Key matches your `firebaseConfig.js`

### 6. Verify Project Configuration
Make sure your `firebaseConfig.js` has the correct values:
- `apiKey`: Should match the Web API Key in Firebase Console
- `authDomain`: Should be `familyhealthapp-e5fd3.firebaseapp.com`
- `projectId`: Should be `familyhealthapp-e5fd3`

### 7. Test the Configuration
After making these changes:
1. Restart your Expo development server
2. Use the "Test Firebase" button in your app to verify connection
3. Try creating a new account

## Common Issues:

1. **Authentication not enabled**: The most common cause
2. **Wrong project**: Make sure you're in the correct Firebase project
3. **API Key mismatch**: Verify the API key in your config matches Firebase Console
4. **Authorized domains**: Make sure localhost is in the authorized domains list

## If Still Having Issues:

1. Check the Browser Network tab for any 400/403 errors
2. Verify your Firebase project is active and billing is set up (if required)
3. Check if there are any Firebase service outages
4. Try creating a fresh Firebase project and updating your config

## Testing Command:
Run this in your app to test Firebase connection:
```javascript
import { testFirebaseConnection } from '../utils/firebaseTest';
testFirebaseConnection();
```
