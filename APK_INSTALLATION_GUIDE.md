# Installing the Healthy Home APK on Your Device

Once the APK build is complete, follow these steps to install it on your Android device:

## Download Options

1. **Direct Download**: When the build completes, EAS will provide a QR code and a download link. You can:
   - Scan the QR code with your Android device to download the APK
   - Open the link in your Android device browser to download the APK
   - Download it to your computer and transfer it to your device

## Installation Instructions

1. **Enable Installation from Unknown Sources**:
   - On Android 8.0 and higher:
     - Go to Settings > Apps > Special access > Install unknown apps
     - Select the browser or file manager you'll use to install the APK
     - Toggle "Allow from this source" to ON
   
   - On Android 7.0 and lower:
     - Go to Settings > Security
     - Toggle "Unknown sources" to ON

2. **Install the APK**:
   - Open the downloaded APK file
   - Tap "Install" when prompted
   - Wait for the installation to complete
   - Tap "Open" to launch the app

## Testing Notes

When testing the Healthy Home app, please pay special attention to:

1. **User Registration and Login**: Test the complete registration flow including the welcome email and onboarding process
2. **Subscription Plans**: Verify that the Free plan is set as default and that the upgrade options work correctly
3. **Family Members**: Confirm that the Free plan limits you to just one family member (yourself)
4. **Date Picker**: Verify that the date picker overlay is working correctly and not blocking date selection

## Troubleshooting

- **App Crashes on Launch**: Make sure you have a stable internet connection for the initial Firebase setup
- **Login Issues**: Verify that you have enabled Email/Password authentication in Firebase Console
- **"Missing or Insufficient Permissions"**: Confirm that the Firestore rules have been properly updated in Firebase Console

Please report any issues with detailed steps to reproduce and screenshots if possible.
