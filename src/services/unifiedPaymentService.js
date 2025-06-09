import { Platform, Alert } from 'react-native';
import revenueCatService from './revenueCat';
import paystackService from './paystackService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export const PAYMENT_PROVIDERS = {
  REVENUECAT: 'revenuecat',
  PAYSTACK: 'paystack'
};

export const SUPPORTED_CURRENCIES = {
  USD: 'USD',
  NGN: 'NGN',
  EUR: 'EUR',
  GBP: 'GBP'
};

class UnifiedPaymentService {
  constructor() {
    this.defaultProvider = PAYMENT_PROVIDERS.REVENUECAT;
    this.availableProviders = [];
  }

  async initialize(userId = null) {
    try {
      this.availableProviders = [];

      // Initialize RevenueCat (for in-app purchases)
      try {
        await revenueCatService.initialize(userId);
        this.availableProviders.push(PAYMENT_PROVIDERS.REVENUECAT);
        console.log('RevenueCat initialized successfully');
      } catch (error) {
        console.warn('RevenueCat initialization failed:', error);
      }

      // Initialize Paystack (always available as web fallback)
      try {
        this.availableProviders.push(PAYMENT_PROVIDERS.PAYSTACK);
        console.log('Paystack service ready');
      } catch (error) {
        console.warn('Paystack initialization failed:', error);
      }

      console.log('Available payment providers:', this.availableProviders);
    } catch (error) {
      console.error('Payment service initialization error:', error);
    }
  }

  // Get available payment methods based on platform and region
  getAvailablePaymentMethods(userRegion = null, userCurrency = 'USD') {
    const methods = [];

    // RevenueCat (In-app purchases) - Available on mobile platforms
    if (this.availableProviders.includes(PAYMENT_PROVIDERS.REVENUECAT)) {
      methods.push({
        id: PAYMENT_PROVIDERS.REVENUECAT,
        name: 'In-App Purchase',
        description: 'Pay through your app store account',
        icon: Platform.OS === 'ios' ? 'logo-apple' : 'logo-google-playstore',
        currencies: [SUPPORTED_CURRENCIES.USD],
        recommended: true,
        features: [
          'Automatic subscription management',
          'Seamless mobile experience',
          'App store purchase protection'
        ]
      });
    }

    // Paystack - Available globally but optimized for African markets
    if (this.availableProviders.includes(PAYMENT_PROVIDERS.PAYSTACK)) {
      const isAfricanRegion = ['NG', 'GH', 'ZA', 'KE'].includes(userRegion);
      
      methods.push({
        id: PAYMENT_PROVIDERS.PAYSTACK,
        name: 'Paystack',
        description: 'Pay with card, bank transfer, or mobile money',
        icon: 'card',
        currencies: [SUPPORTED_CURRENCIES.NGN, SUPPORTED_CURRENCIES.USD],
        recommended: isAfricanRegion,
        features: [
          'Multiple payment options',
          'Local payment methods',
          'Bank transfer support',
          'Mobile money integration'
        ]
      });
    }

    return methods.sort((a, b) => b.recommended - a.recommended);
  }

  // Get subscription plans for a specific provider
  async getSubscriptionPlans(provider = null) {
    const selectedProvider = provider || this.defaultProvider;

    try {
      switch (selectedProvider) {
        case PAYMENT_PROVIDERS.REVENUECAT:
          const offerings = await revenueCatService.getOfferings();
          return this.formatRevenueCatPlans(offerings);

        case PAYMENT_PROVIDERS.PAYSTACK:
          return paystackService.getFormattedPlans();

        default:
          throw new Error(`Unsupported payment provider: ${selectedProvider}`);
      }
    } catch (error) {
      console.error(`Error fetching plans for ${selectedProvider}:`, error);
      throw error;
    }
  }

  // Purchase subscription with specified provider
  async purchaseSubscription(planId, provider, userEmail, userId) {
    try {
      console.log(`Initiating purchase: ${planId} via ${provider}`);

      switch (provider) {
        case PAYMENT_PROVIDERS.REVENUECAT:
          return await this.purchaseWithRevenueCat(planId, userId);

        case PAYMENT_PROVIDERS.PAYSTACK:
          return await this.purchaseWithPaystack(planId, userEmail, userId);

        default:
          throw new Error(`Unsupported payment provider: ${provider}`);
      }
    } catch (error) {
      console.error('Purchase error:', error);
      throw error;
    }
  }

  // RevenueCat purchase flow
  async purchaseWithRevenueCat(planId, userId) {
    try {
      const result = await revenueCatService.purchasePackage(planId);
      
      if (result.success) {
        // Update local subscription status
        await this.updateSubscriptionStatus(userId, {
          plan: planId,
          provider: PAYMENT_PROVIDERS.REVENUECAT,
          status: 'active',
          customerInfo: result.customerInfo
        });

        return {
          success: true,
          provider: PAYMENT_PROVIDERS.REVENUECAT,
          message: 'Subscription activated successfully!',
          customerInfo: result.customerInfo
        };
      } else {
        throw new Error(result.error || 'Purchase failed');
      }
    } catch (error) {
      console.error('RevenueCat purchase error:', error);
      throw error;
    }
  }

  // Paystack purchase flow
  async purchaseWithPaystack(planId, userEmail, userId) {
    try {
      // Step 1: Initiate payment (opens browser)
      const paymentResult = await paystackService.initiatePayment(planId, userEmail, userId);
      
      if (paymentResult.success) {
        // Return payment reference for verification later
        return {
          success: true,
          provider: PAYMENT_PROVIDERS.PAYSTACK,
          requiresVerification: true,
          reference: paymentResult.reference,
          message: paymentResult.message
        };
      } else {
        throw new Error('Failed to initiate payment');
      }
    } catch (error) {
      console.error('Paystack purchase error:', error);
      throw error;
    }
  }

  // Verify Paystack payment and complete subscription
  async verifyPaystackPayment(reference, userId) {
    try {
      const verificationResult = await paystackService.verifyPayment(reference);
      
      if (verificationResult.success && verificationResult.status === 'success') {
        // Process successful payment
        const result = await paystackService.processPaymentSuccess(verificationResult, userId);
        
        return {
          success: true,
          provider: PAYMENT_PROVIDERS.PAYSTACK,
          plan: result.plan,
          message: result.message
        };
      } else {
        throw new Error(verificationResult.message || 'Payment verification failed');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      throw error;
    }
  }

  // Restore purchases (primarily for RevenueCat)
  async restorePurchases(userId) {
    const results = [];

    // Try to restore RevenueCat purchases
    if (this.availableProviders.includes(PAYMENT_PROVIDERS.REVENUECAT)) {
      try {
        const revenueCatResult = await revenueCatService.restorePurchases();
        if (revenueCatResult.success) {
          results.push({
            provider: PAYMENT_PROVIDERS.REVENUECAT,
            success: true,
            customerInfo: revenueCatResult.customerInfo
          });
        }
      } catch (error) {
        console.warn('RevenueCat restore failed:', error);
      }
    }

    // For Paystack, we could check subscription status via API
    // This would require backend implementation

    return results;
  }

  // Cancel subscription
  async cancelSubscription(provider, subscriptionInfo) {
    try {
      switch (provider) {
        case PAYMENT_PROVIDERS.REVENUECAT:
          // RevenueCat subscriptions are managed through the app store
          Alert.alert(
            'Cancel Subscription',
            'To cancel your subscription, please go to your device\'s subscription settings.',
            [
              { text: 'OK' },
              {
                text: 'Open Settings',
                onPress: () => {
                  if (Platform.OS === 'ios') {
                    Linking.openURL('https://apps.apple.com/account/subscriptions');
                  } else {
                    Linking.openURL('https://play.google.com/store/account/subscriptions');
                  }
                }
              }
            ]
          );
          return { success: true, requiresManualCancellation: true };

        case PAYMENT_PROVIDERS.PAYSTACK:
          if (subscriptionInfo.subscriptionCode) {
            return await paystackService.cancelSubscription(subscriptionInfo.subscriptionCode);
          } else {
            throw new Error('No subscription code provided');
          }

        default:
          throw new Error(`Unsupported provider for cancellation: ${provider}`);
      }
    } catch (error) {
      console.error('Cancellation error:', error);
      throw error;
    }
  }

  // Update subscription status in Firestore
  async updateSubscriptionStatus(userId, subscriptionData) {
    try {
      const updateData = {
        subscriptionPlan: subscriptionData.plan,
        subscriptionProvider: subscriptionData.provider,
        subscriptionStatus: subscriptionData.status,
        updatedAt: new Date()
      };

      // Add provider-specific data
      if (subscriptionData.provider === PAYMENT_PROVIDERS.REVENUECAT) {
        updateData.revenueCatCustomerId = subscriptionData.customerInfo?.originalAppUserId;
      } else if (subscriptionData.provider === PAYMENT_PROVIDERS.PAYSTACK) {
        updateData.paystackCustomerId = subscriptionData.customerInfo?.customer_code;
      }

      await updateDoc(doc(db, 'users', userId), updateData);
      console.log('Subscription status updated successfully');
    } catch (error) {
      console.error('Error updating subscription status:', error);
      throw error;
    }
  }

  // Format RevenueCat offerings for consistent interface
  formatRevenueCatPlans(offerings) {
    if (!offerings || !Array.isArray(offerings)) return [];

    return offerings.map(pkg => ({
      id: pkg.identifier,
      name: pkg.packageType,
      price: pkg.product.price,
      currency: pkg.product.currencyCode,
      interval: this.getIntervalFromPackageType(pkg.packageType),
      provider: PAYMENT_PROVIDERS.REVENUECAT,
      originalPackage: pkg
    }));
  }

  // Helper to get interval from RevenueCat package type
  getIntervalFromPackageType(packageType) {
    const type = packageType.toLowerCase();
    if (type.includes('monthly')) return 'monthly';
    if (type.includes('annual') || type.includes('yearly')) return 'annual';
    if (type.includes('weekly')) return 'weekly';
    return 'monthly'; // default
  }

  // Get recommended payment provider based on user location and preferences
  getRecommendedProvider(userRegion = null, userPreference = null) {
    if (userPreference && this.availableProviders.includes(userPreference)) {
      return userPreference;
    }

    // Recommend Paystack for African regions
    const africanRegions = ['NG', 'GH', 'ZA', 'KE', 'TZ', 'UG'];
    if (africanRegions.includes(userRegion) && this.availableProviders.includes(PAYMENT_PROVIDERS.PAYSTACK)) {
      return PAYMENT_PROVIDERS.PAYSTACK;
    }

    // Default to RevenueCat for other regions
    return this.availableProviders.includes(PAYMENT_PROVIDERS.REVENUECAT) 
      ? PAYMENT_PROVIDERS.REVENUECAT 
      : this.availableProviders[0];
  }
}

export default new UnifiedPaymentService();
