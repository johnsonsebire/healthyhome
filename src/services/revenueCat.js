import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';

// RevenueCat API Keys - Replace with your actual keys
const REVENUECAT_API_KEY_ANDROID = 'your_android_api_key_here';
const REVENUECAT_API_KEY_IOS = 'your_ios_api_key_here';

class RevenueCatService {
  constructor() {
    this.initialized = false;
    this.offerings = null;
    this.customerInfo = null;
  }

  async initialize(userId = null) {
    try {
      if (this.initialized) return;

      // Configure RevenueCat
      const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
      
      await Purchases.configure({
        apiKey,
        appUserID: userId, // Optional: pass user ID for multi-device support
      });

      // Set up debugging (only in development)
      if (__DEV__) {
        await Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
      }

      this.initialized = true;
      console.log('RevenueCat initialized successfully');
    } catch (error) {
      console.error('RevenueCat initialization failed:', error);
      throw error;
    }
  }

  async getOfferings() {
    try {
      if (!this.initialized) {
        throw new Error('RevenueCat not initialized');
      }

      const offerings = await Purchases.getOfferings();
      this.offerings = offerings;
      
      if (offerings.current !== null) {
        console.log('Available packages:', offerings.current.availablePackages);
        return offerings.current.availablePackages;
      } else {
        console.log('No current offering available');
        return [];
      }
    } catch (error) {
      console.error('Error fetching offerings:', error);
      throw error;
    }
  }

  async purchasePackage(packageToPurchase) {
    try {
      if (!this.initialized) {
        throw new Error('RevenueCat not initialized');
      }

      console.log('Attempting to purchase package:', packageToPurchase.identifier);

      const purchaseResult = await Purchases.purchasePackage(packageToPurchase);
      
      // Check if the purchase was successful
      if (typeof purchaseResult.customerInfo.entitlements.active !== 'undefined') {
        console.log('Purchase successful');
        this.customerInfo = purchaseResult.customerInfo;
        return {
          success: true,
          customerInfo: purchaseResult.customerInfo,
          productIdentifier: purchaseResult.productIdentifier,
        };
      } else {
        console.log('Purchase failed - no active entitlements');
        return {
          success: false,
          error: 'No active entitlements found after purchase',
        };
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      
      if (error.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED) {
        return {
          success: false,
          cancelled: true,
          error: 'Purchase cancelled by user',
        };
      }
      
      return {
        success: false,
        error: error.message || 'Purchase failed',
      };
    }
  }

  async restorePurchases() {
    try {
      if (!this.initialized) {
        throw new Error('RevenueCat not initialized');
      }

      const customerInfo = await Purchases.restorePurchases();
      this.customerInfo = customerInfo;
      
      console.log('Purchases restored:', customerInfo);
      return {
        success: true,
        customerInfo,
      };
    } catch (error) {
      console.error('Error restoring purchases:', error);
      return {
        success: false,
        error: error.message || 'Failed to restore purchases',
      };
    }
  }

  async getCustomerInfo() {
    try {
      if (!this.initialized) {
        throw new Error('RevenueCat not initialized');
      }

      const customerInfo = await Purchases.getCustomerInfo();
      this.customerInfo = customerInfo;
      return customerInfo;
    } catch (error) {
      console.error('Error getting customer info:', error);
      throw error;
    }
  }

  // Check if user has active subscription for a specific entitlement
  hasActiveSubscription(entitlementId = 'premium') {
    if (!this.customerInfo) return false;
    
    const entitlements = this.customerInfo.entitlements.active;
    return entitlementId in entitlements;
  }

  // Get the current subscription plan based on active entitlements
  getCurrentPlan() {
    if (!this.customerInfo) return 'free';
    
    const entitlements = this.customerInfo.entitlements.active;
    
    // Check entitlements in order of priority
    if ('premium' in entitlements) return 'premium';
    if ('standard' in entitlements) return 'standard';
    if ('basic' in entitlements) return 'basic';
    
    return 'free';
  }

  // Get subscription expiration date
  getSubscriptionExpirationDate(entitlementId = 'premium') {
    if (!this.customerInfo) return null;
    
    const entitlements = this.customerInfo.entitlements.active;
    if (entitlementId in entitlements) {
      return entitlements[entitlementId].expirationDate;
    }
    
    return null;
  }

  // Set user attributes for analytics and targeting
  async setUserAttributes(attributes) {
    try {
      if (!this.initialized) {
        throw new Error('RevenueCat not initialized');
      }

      await Purchases.setAttributes(attributes);
      console.log('User attributes set:', attributes);
    } catch (error) {
      console.error('Error setting user attributes:', error);
    }
  }

  // Identify user for multi-device support
  async identifyUser(userId) {
    try {
      if (!this.initialized) {
        throw new Error('RevenueCat not initialized');
      }

      const customerInfo = await Purchases.logIn(userId);
      this.customerInfo = customerInfo.customerInfo;
      
      console.log('User identified:', userId);
      return customerInfo;
    } catch (error) {
      console.error('Error identifying user:', error);
      throw error;
    }
  }

  // Log out user (for account switching)
  async logOut() {
    try {
      if (!this.initialized) {
        throw new Error('RevenueCat not initialized');
      }

      const customerInfo = await Purchases.logOut();
      this.customerInfo = customerInfo;
      
      console.log('User logged out');
      return customerInfo;
    } catch (error) {
      console.error('Error logging out user:', error);
      throw error;
    }
  }
}

// Export singleton instance
const revenueCatService = new RevenueCatService();
export default revenueCatService;
