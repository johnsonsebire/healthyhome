# Multi-Provider Payment Integration Guide

## Overview

This guide covers the integration of **Paystack** alongside **RevenueCat** to provide multiple payment options for your subscription plans. This gives users flexibility to choose their preferred payment method based on their location and preferences.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Unified Payment Service              │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │   RevenueCat    │    │        Paystack             │ │
│  │                 │    │                             │ │
│  │ • In-app       │    │ • Web payments              │ │
│  │   purchases     │    │ • Bank transfer             │ │
│  │ • iOS/Android   │    │ • Mobile money              │ │
│  │   app stores    │    │ • Card payments             │ │
│  │ • Auto renewal  │    │ • African markets           │ │
│  └─────────────────┘    └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Features

### 🏪 RevenueCat (In-App Purchases)
- **Best for**: iOS and Android users worldwide
- **Features**: Automatic subscription management, App Store integration
- **Payment Methods**: Credit cards through app stores
- **Currencies**: USD, EUR, GBP (app store dependent)

### 💳 Paystack (Web Payments)
- **Best for**: African markets (Nigeria, Ghana, South Africa, Kenya)
- **Features**: Multiple payment methods, local payment options
- **Payment Methods**: Cards, bank transfer, mobile money, USSD
- **Currencies**: NGN, USD, EUR, GBP

## Setup Instructions

### 1. Backend API Setup

You need to create backend endpoints to handle Paystack payments. Here's a basic Node.js/Express example:

```javascript
// server.js
const express = require('express');
const { Paystack } = require('paystack-sdk');

const app = express();
const paystack = new Paystack(process.env.PAYSTACK_SECRET_KEY);

// Initialize payment
app.post('/paystack/initialize', async (req, res) => {
  try {
    const { email, amount, currency, plan, metadata } = req.body;
    
    const response = await paystack.transaction.initialize({
      email,
      amount,
      currency,
      plan,
      metadata,
      callback_url: process.env.PAYSTACK_CALLBACK_URL
    });
    
    res.json(response);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Verify payment
app.get('/paystack/verify/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    const response = await paystack.transaction.verify(reference);
    res.json(response);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Webhook for payment notifications
app.post('/paystack/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');
    
  if (hash === req.headers['x-paystack-signature']) {
    const event = req.body;
    
    if (event.event === 'charge.success') {
      // Handle successful payment
      handleSuccessfulPayment(event.data);
    }
  }
  
  res.sendStatus(200);
});
```

### 2. Environment Variables

Add these to your environment:

```bash
# Paystack Configuration
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key
PAYSTACK_SECRET_KEY=sk_test_your_secret_key
PAYSTACK_CALLBACK_URL=https://your-app.com/payment/callback

# Backend API
API_BASE_URL=https://your-backend-api.com
```

### 3. Firebase Security Rules Update

Ensure your Firestore rules support the new payment provider fields:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Allow updating payment provider information
      allow update: if request.auth != null && 
                    request.auth.uid == userId &&
                    request.resource.data.keys().hasAny([
                      'subscriptionProvider', 
                      'paystackCustomerId', 
                      'revenueCatCustomerId'
                    ]);
    }
  }
}
```

### 4. Install Dependencies

```bash
# React Native dependencies
npm install react-native-purchases

# Optional: If using Paystack React Native SDK
npm install react-native-paystack-webview
```

### 5. Configure Paystack API Keys

Update `src/services/paystackService.js`:

```javascript
// Replace with your actual Paystack keys
const PAYSTACK_PUBLIC_KEY = 'pk_live_your_live_public_key';
const API_BASE_URL = 'https://your-backend-api.com';
```

### 6. Configure RevenueCat

Update `src/services/revenueCat.js`:

```javascript
// Replace with your actual RevenueCat keys
const REVENUECAT_API_KEY_ANDROID = 'goog_your_android_key';
const REVENUECAT_API_KEY_IOS = 'appl_your_ios_key';
```

## Usage

### Provider Selection
Users can choose their preferred payment provider:

```javascript
const { 
  availablePaymentMethods,
  switchPaymentProvider,
  purchaseSubscription 
} = useSubscription();

// Switch to Paystack
await switchPaymentProvider('paystack');

// Purchase with selected provider
const result = await purchaseSubscription('premium', 'paystack');
```

### Payment Flow

#### RevenueCat Flow:
1. User selects plan
2. In-app purchase dialog opens
3. Payment processed through app store
4. Subscription activated immediately

#### Paystack Flow:
1. User selects plan
2. Browser opens with Paystack payment page
3. User completes payment
4. App verifies payment
5. Subscription activated

## Testing

### Test Cards for Paystack:

```
Successful Payment:
Card: 4084084084084081
CVV: 408
PIN: 0000
OTP: 123456

Failed Payment:
Card: 4084084084084085
```

### RevenueCat Testing:
- Use sandbox environment
- Test with sandbox accounts

## Production Deployment

### 1. Environment Setup
- Replace test keys with live keys
- Update API endpoints to production
- Configure proper SSL certificates

### 2. App Store Setup
- Configure RevenueCat products in App Store Connect
- Set up Paystack products in dashboard

### 3. Monitoring
- Monitor payment success rates
- Track conversion by provider
- Set up alerts for failed payments

## Security Considerations

### 🔒 Best Practices:
1. **Never expose secret keys** in client-side code
2. **Validate payments server-side** before activating subscriptions
3. **Use webhooks** for reliable payment notifications
4. **Implement payment reconciliation** between providers
5. **Log all payment attempts** for debugging

### 🛡️ Fraud Protection:
- Implement rate limiting on payment endpoints
- Validate user identity before processing payments
- Monitor for suspicious payment patterns

## Currency Handling

Different providers support different currencies:

```javascript
const getCurrencyForProvider = (provider, userRegion) => {
  if (provider === 'paystack') {
    return ['NG', 'GH'].includes(userRegion) ? 'NGN' : 'USD';
  }
  return 'USD'; // RevenueCat
};
```

## Error Handling

Implement comprehensive error handling:

```javascript
try {
  const result = await purchaseSubscription(planId, provider);
  if (result.requiresVerification) {
    // Handle Paystack verification flow
    await handlePaymentVerification(result.reference);
  }
} catch (error) {
  if (error.code === 'payment_cancelled') {
    // User cancelled payment
  } else if (error.code === 'insufficient_funds') {
    // Payment failed due to insufficient funds
  } else {
    // Generic error handling
  }
}
```

## Analytics & Reporting

Track key metrics:

```javascript
// Track payment provider usage
analytics.track('payment_provider_selected', {
  provider: selectedProvider,
  plan: planId,
  amount: planPrice
});

// Track conversion rates
analytics.track('subscription_purchase_completed', {
  provider: result.provider,
  plan: result.plan,
  success: result.success
});
```

## Support & Troubleshooting

### Common Issues:

1. **Payment verification fails**
   - Check webhook configuration
   - Verify API keys are correct
   - Ensure proper network connectivity

2. **RevenueCat purchases not working**
   - Verify app store configuration
   - Check sandbox vs production environment
   - Validate product identifiers

3. **Currency mismatch**
   - Ensure price currencies match between providers
   - Implement proper currency conversion if needed

### Getting Help:
- RevenueCat: [docs.revenuecat.com](https://docs.revenuecat.com)
- Paystack: [paystack.com/docs](https://paystack.com/docs)

---

This integration provides a robust, flexible payment solution that caters to global users while providing optimized experiences for different markets and payment preferences.
