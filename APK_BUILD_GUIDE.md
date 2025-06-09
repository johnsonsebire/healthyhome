# Healthy Home APK Build Guide

## Build Process

To build an APK for the Healthy Home app, we're using EAS Build with the following command:

```bash
eas build -p android --profile preview-apk
```

This uses the `preview-apk` profile defined in `eas.json`, which is configured to:
- Build a standard APK (not an AAB)
- Include all necessary environment variables
- Use internal distribution for testing

## Build Configuration

The build configuration is defined in several files:

### 1. eas.json
```json
{
  "preview-apk": {
    "android": {
      "buildType": "apk"
    },
    "distribution": "internal",
    "env": {
      "EXPO_PUBLIC_FIREBASE_API_KEY": "...",
      "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN": "...",
      ...
    }
  }
}
```

### 2. app.json
```json
{
  "expo": {
    "name": "Healthy Home",
    "slug": "HealthyHome",
    "android": {
      "package": "com.manifestghana.HealthyHome",
      "permissions": [
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        ...
      ]
    }
  }
}
```

## Alternative Build Methods

If you encounter issues with EAS Build, you can try:

### Local Build

```bash
cd /home/johnsonsebire/www/HealthApp/FamilyMedicalApp
expo prebuild -p android
cd android
./gradlew assembleDebug
```

The APK will be in: `/android/app/build/outputs/apk/debug/app-debug.apk`

### Expo Development Build

```bash
expo start --dev-client
```

Then use the Expo Go app to scan the QR code. This is useful for rapid testing but doesn't produce a standalone APK.

## Distribution Options

1. **Firebase App Distribution**: Upload the APK to Firebase for controlled testing
2. **Email**: Send the APK directly to testers
3. **TestFlight/Google Play**: For more formal testing with a larger group

## Next Steps After Testing

Once testing is complete and all issues are resolved:
1. Create a production build using `eas build -p android --profile production`
2. Submit to Google Play using `eas submit -p android`
