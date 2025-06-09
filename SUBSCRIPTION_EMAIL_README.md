# Healthy Home - Family Health Records App

## Cloud Functions Deployment

To enable the welcome and subscription upgrade emails, follow these steps to deploy the Firebase Cloud Functions:

### Prerequisites

1. Install Firebase CLI globally:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Set environment variables for email service:
   ```bash
   firebase functions:config:set email.user="your-email@gmail.com" email.password="your-app-password"
   ```
   
   Note: For Gmail, you'll need to use an "App Password" rather than your regular password. 
   You can create one at https://myaccount.google.com/security > App passwords.

### Deployment

1. Navigate to the functions directory:
   ```bash
   cd functions
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Deploy the functions:
   ```bash
   firebase deploy --only functions
   ```

## Subscription Plans

The app now includes the following subscription plans:

1. **Free Plan**
   - Single user only (no family members)
   - 200MB storage
   - Basic features

2. **Basic Plan** - $1/month
   - Up to 2 family members
   - 500MB storage
   - Basic features

3. **Standard Plan** - $2/month
   - Up to 5 family members
   - 2GB storage
   - OCR document scanning
   - Data export

4. **Premium Plan** - $3/month
   - Unlimited family members
   - 10GB storage
   - All features including health analytics

## New User Flow

1. User registers for an account
2. System sends a welcome email
3. User is shown the onboarding screen with subscription plan options
4. User can select a plan or continue with the free plan
5. If a paid plan is selected, they proceed to the payment screen

## Updated Features

- **Welcome Email**: Automatically sent to new users after registration
- **Plan Upgrade Email**: Sent when a user upgrades their subscription plan
- **Onboarding Screen**: Guides new users to select an appropriate subscription plan
- **Free Plan**: New default plan limiting users to managing only their own records
