# RevenueCat Integration Setup Guide

This guide explains how to set up RevenueCat for in-app purchases in the Healthy Home app.

## Prerequisites

1. **RevenueCat Account**: Create an account at [revenuecat.com](https://revenuecat.com)
2. **App Store Connect** (iOS) and/or **Google Play Console** (Android) accounts
3. **Bundle ID/Package Name**: Ensure your app's bundle identifier matches your store listings

## Step 1: RevenueCat Dashboard Setup

### 1.1 Create a New Project
1. Log into RevenueCat dashboard
2. Click "Create New Project"
3. Enter project name: "Healthy Home"
4. Add your app:
   - **iOS Bundle ID**: `com.manifestghana.HealthyHome`
   - **Android Package Name**: `com.manifestghana.HealthyHome`

### 1.2 Configure API Keys
1. Go to Project Settings → API keys
2. Copy the **Public API Key** for each platform:
   - iOS API Key
   - Android API Key

### 1.3 Set Up Products
Create the following products in RevenueCat:

#### Products Configuration
```
Product ID: basic_monthly
- Price: $1.00 USD/month
- Type: Auto-renewable subscription
- Description: "Basic Plan - Monthly"

Product ID: standard_monthly  
- Price: $2.00 USD/month
- Type: Auto-renewable subscription
- Description: "Standard Plan - Monthly"

Product ID: premium_monthly
- Price: $3.00 USD/month  
- Type: Auto-renewable subscription
- Description: "Premium Plan - Monthly"
```

### 1.4 Configure Entitlements
Create these entitlements:

```
Entitlement ID: basic
- Products: basic_monthly

Entitlement ID: standard  
- Products: standard_monthly

Entitlement ID: premium
- Products: premium_monthly
```

### 1.5 Create Offerings
Create a "default" offering with all three packages:
- Basic Package (basic_monthly)
- Standard Package (standard_monthly) 
- Premium Package (premium_monthly)

## Step 2: App Store Configuration

### 2.1 iOS - App Store Connect
1. Create in-app purchase products:
   ```
   Product ID: basic_monthly
   Reference Name: Basic Monthly Subscription
   Duration: 1 Month
   Price: $0.99
   
   Product ID: standard_monthly  
   Reference Name: Standard Monthly Subscription
   Duration: 1 Month
   Price: $1.99
   
   Product ID: premium_monthly
   Reference Name: Premium Monthly Subscription  
   Duration: 1 Month
   Price: $2.99
   ```

2. Configure App Store Server Notifications:
   - URL: `https://api.revenuecat.com/v1/subscribers/webhooks/apple`
   - Shared Secret: (Get from RevenueCat dashboard)

### 2.2 Android - Google Play Console
1. Create subscription products:
   ```
   Product ID: basic_monthly
   Name: Basic Monthly Subscription
   Billing Period: Monthly  
   Price: $0.99
   
   Product ID: standard_monthly
   Name: Standard Monthly Subscription
   Billing Period: Monthly
   Price: $1.99
   
   Product ID: premium_monthly  
   Name: Premium Monthly Subscription
   Billing Period: Monthly
   Price: $2.99
   ```

2. Configure Real-time Developer Notifications:
   - Cloud Pub/Sub Topic: (Create in Google Cloud Console)
   - Link to RevenueCat webhook

## Step 3: Update App Configuration

### 3.1 Update API Keys
In `src/services/revenueCat.js`, replace the placeholder API keys:

```javascript
// Replace these with your actual RevenueCat API keys
const REVENUECAT_API_KEY_ANDROID = 'your_actual_android_api_key_here';
const REVENUECAT_API_KEY_IOS = 'your_actual_ios_api_key_here';
```

### 3.2 Environment Variables (Recommended)
For security, store API keys in environment variables:

1. Create `.env` file:
   ```
   REVENUECAT_API_KEY_IOS=your_ios_api_key
   REVENUECAT_API_KEY_ANDROID=your_android_api_key
   ```

2. Update `revenueCat.js`:
   ```javascript
   import Constants from 'expo-constants';
   
   const REVENUECAT_API_KEY_ANDROID = Constants.expoConfig?.extra?.revenueCatAndroidKey;
   const REVENUECAT_API_KEY_IOS = Constants.expoConfig?.extra?.revenueCatIosKey;
   ```

3. Update `app.json`:
   ```json
   {
     "expo": {
       "extra": {
         "revenueCatAndroidKey": "your_android_key",
         "revenueCatIosKey": "your_ios_key"
       }
     }
   }
   ```

## Step 4: Testing

### 4.1 iOS Testing
1. Create sandbox test users in App Store Connect
2. Test subscription flow on physical device
3. Verify webhooks in RevenueCat dashboard

### 4.2 Android Testing  
1. Add test accounts in Google Play Console
2. Upload signed APK for internal testing
3. Test subscription flow on device

## Step 5: Production Deployment

### 5.1 Pre-launch Checklist
- [ ] All products created in app stores
- [ ] RevenueCat webhooks configured
- [ ] API keys properly configured
- [ ] Tested on both platforms
- [ ] Privacy policy updated with subscription terms
- [ ] Terms of service updated

### 5.2 Go Live
1. Submit app for review (iOS/Android)
2. Monitor RevenueCat dashboard for transactions
3. Set up analytics and conversion tracking

## Troubleshooting

### Common Issues

**1. "No products available"**
- Verify product IDs match between app stores and RevenueCat
- Check that products are approved and active
- Ensure bundle ID matches exactly

**2. "Purchase failed"**  
- Test with sandbox accounts
- Check device payment method setup
- Verify internet connection

**3. "Entitlements not updating"**
- Check webhook configuration
- Verify RevenueCat API key is correct
- Test purchase restoration

### Support Resources
- [RevenueCat Documentation](https://docs.revenuecat.com)
- [RevenueCat Community](https://community.revenuecat.com)
- [Expo In-App Purchases Guide](https://docs.expo.dev/versions/latest/sdk/in-app-purchases/)

## Security Notes

- Never commit API keys to version control
- Use environment variables for sensitive data
- Implement proper error handling for payment failures
- Validate purchases server-side for critical features
- Monitor for suspicious purchase activity

---

## Current Implementation Status

✅ **Completed:**
- RevenueCat service integration
- Subscription context updates  
- Purchase flow implementation
- Restore purchases functionality
- Error handling and validation

⚠️ **Requires Configuration:**
- RevenueCat API keys
- App Store/Play Store product setup
- Webhook configuration
- Testing with real devices

📋 **Next Steps:**
1. Set up RevenueCat dashboard
2. Configure store products
3. Add real API keys
4. Test on physical devices
5. Deploy to production
