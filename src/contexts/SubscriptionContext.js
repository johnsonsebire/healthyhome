import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Constants from 'expo-constants';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from './AuthContext';
import networkService from '../services/networkService';
import offlineStorageService from '../services/offlineStorage';
import emailService from '../services/emailService';
import revenueCatService from '../services/revenueCat';

const SubscriptionContext = createContext();

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    features: {
      familyMembers: 1, // only self
      storage: 200, // MB
      editAccess: false,
      ocr: false,
      offlineAccess: false,
      reports: false
    }
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 1,
    features: {
      familyMembers: 2,
      storage: 500, // MB
      editAccess: true,
      ocr: false,
      offlineAccess: false,
      reports: false
    }
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    price: 2,
    features: {
      familyMembers: 5,
      storage: 2048, // MB
      editAccess: true,
      ocr: true,
      offlineAccess: true,
      reports: false
    }
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 3,
    features: {
      familyMembers: -1, // unlimited
      storage: 10240, // MB
      editAccess: true,
      ocr: true,
      offlineAccess: true,
      reports: true
    }
  }
};

export const SubscriptionProvider = ({ children }) => {
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState('active');
  const [usageStats, setUsageStats] = useState({
    familyMembers: 0,
    storageUsed: 0
  });
  const [revenueCatOfferings, setRevenueCatOfferings] = useState([]);
  const [isRevenueCatInitialized, setIsRevenueCatInitialized] = useState(false);

  useEffect(() => {
    if (user) {
      try {
        initializeRevenueCat();
        fetchSubscriptionData();
      } catch (error) {
        console.error('Error in subscription effect:', error);
        // Default to free plan as fallback
        setCurrentPlan('free');
      }
    } else {
      // No user, default to free
      setCurrentPlan('free');
    }
  }, [user]);

  const initializeRevenueCat = async () => {
    try {
      await revenueCatService.initialize(user?.uid);
      setIsRevenueCatInitialized(true);
      
      // Get offerings
      const offerings = await revenueCatService.getOfferings();
      setRevenueCatOfferings(offerings);
      
      // Get current customer info to determine active plan
      const customerInfo = await revenueCatService.getCustomerInfo();
      const activePlan = revenueCatService.getCurrentPlan();
      
      if (activePlan !== 'free') {
        setCurrentPlan(activePlan);
        setSubscriptionStatus('active');
      }
      
      console.log('RevenueCat initialized with plan:', activePlan);
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
      setIsRevenueCatInitialized(false);
    }
  };

  useEffect(() => {
    if (user) {
      try {
        fetchSubscriptionData();
      } catch (error) {
        console.error('Error in subscription effect:', error);
        // Default to free plan as fallback
        setCurrentPlan('free');
      }
    } else {
      // No user, default to free
      setCurrentPlan('free');
    }
  }, [user]);

  const fetchSubscriptionData = async () => {
    try {
      // Check if we're online before making Firebase calls
      if (!networkService.isOnline()) {
        console.log('Device is offline, using cached subscription data');
        // Try to use cached subscription data
        const cachedSubscription = await offlineStorageService.getCachedSubscription();
        if (cachedSubscription?.subscriptionPlan) {
          setCurrentPlan(cachedSubscription.subscriptionPlan);
          setSubscriptionStatus(cachedSubscription.subscriptionStatus || 'active');
        }
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const plan = userData.subscriptionPlan || 'basic';
        const status = userData.subscriptionStatus || 'active';
        
        setCurrentPlan(plan);
        setSubscriptionStatus(status);
        
        // Cache the subscription data for offline use
        await offlineStorageService.cacheSubscription({
          subscriptionPlan: plan,
          subscriptionStatus: status,
          lastSync: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      
      // Fallback to cached data if Firebase call fails
      try {
        const cachedSubscription = await offlineStorageService.getCachedSubscription();
        if (cachedSubscription?.subscriptionPlan) {
          setCurrentPlan(cachedSubscription.subscriptionPlan);
          setSubscriptionStatus(cachedSubscription.subscriptionStatus || 'active');
          console.log('Using cached subscription data as fallback');
        }
      } catch (cacheError) {
        console.error('Error loading cached subscription data:', cacheError);
      }
    }
  };

  const purchaseSubscription = async (packageToPurchase) => {
    try {
      if (!isRevenueCatInitialized) {
        throw new Error('RevenueCat not initialized');
      }

      const result = await revenueCatService.purchasePackage(packageToPurchase);
      
      if (result.success) {
        // Update local state
        const newPlan = revenueCatService.getCurrentPlan();
        setCurrentPlan(newPlan);
        setSubscriptionStatus('active');
        
        // Update Firebase
        await updateDoc(doc(db, 'users', user.uid), {
          subscriptionPlan: newPlan,
          subscriptionStatus: 'active',
          revenueCatCustomerId: result.customerInfo.originalAppUserId,
          updatedAt: new Date()
        });
        
        // Send confirmation email
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            await emailService.sendPlanUpgradeEmail({
              email: user.email,
              uid: user.uid,
              firstName: userData.firstName,
              displayName: userData.displayName || userData.firstName
            }, SUBSCRIPTION_PLANS[newPlan].name);
          }
        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError);
        }
        
        return result;
      } else {
        throw new Error(result.error || 'Purchase failed');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      throw error;
    }
  };

  const restorePurchases = async () => {
    try {
      if (!isRevenueCatInitialized) {
        throw new Error('RevenueCat not initialized');
      }

      const result = await revenueCatService.restorePurchases();
      
      if (result.success) {
        const currentPlanFromRC = revenueCatService.getCurrentPlan();
        setCurrentPlan(currentPlanFromRC);
        
        // Update Firebase
        await updateDoc(doc(db, 'users', user.uid), {
          subscriptionPlan: currentPlanFromRC,
          subscriptionStatus: 'active',
          updatedAt: new Date()
        });
        
        return result;
      } else {
        throw new Error(result.error || 'Failed to restore purchases');
      }
    } catch (error) {
      console.error('Restore purchases error:', error);
      throw error;
    }
  };

  const upgradePlan = async (newPlan) => {
    try {
      // Check if running in Expo Go or if we don't have Firebase available
      const isExpoGo = 
        (Platform && !Platform.constants.isDevice) || 
        (Constants && Constants.appOwnership === 'expo');
        
      if (isExpoGo) {
        console.log('Running in Expo Go, simulating plan upgrade');
        setCurrentPlan(newPlan);
        return { success: true };
      }
      
      // For RevenueCat integration, we don't directly upgrade plans
      // Instead, we guide users to make purchases through the offerings
      console.warn('Direct plan upgrade deprecated. Use purchaseSubscription instead.');
      
      // Normal flow for production app (keeping for backward compatibility)
      await updateDoc(doc(db, 'users', user.uid), {
        subscriptionPlan: newPlan,
        subscriptionStatus: 'active',
        updatedAt: new Date()
      });
      
      setCurrentPlan(newPlan);
      
      // Send confirmation email for plan upgrade
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          await emailService.sendPlanUpgradeEmail({
            email: user.email,
            uid: user.uid,
            firstName: userData.firstName,
            displayName: userData.displayName || userData.firstName
          }, SUBSCRIPTION_PLANS[newPlan].name);
          console.log('✅ Plan upgrade email sent');
        }
      } catch (emailError) {
        console.error('⚠️ Failed to send plan upgrade email:', emailError);
        // Don't block the upgrade if email fails
      }
      
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to upgrade plan:', error);
      throw error;
    }
  };

  const checkUsageLimit = (type, currentCount) => {
    const plan = SUBSCRIPTION_PLANS[currentPlan];
    if (type === 'familyMembers') {
      return plan.features.familyMembers === -1 || currentCount < plan.features.familyMembers;
    }
    return true;
  };

  const updateSubscription = async (newSubscription) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        subscriptionPlan: newSubscription.plan,
        subscriptionStatus: newSubscription.status,
        subscriptionStartDate: newSubscription.startDate,
        subscriptionEndDate: newSubscription.endDate,
        updatedAt: new Date()
      });
      setCurrentPlan(newSubscription.plan);
      setSubscriptionStatus(newSubscription.status);
    } catch (error) {
      throw error;
    }
  };

  const canAddFamilyMember = (currentCount) => {
    const plan = SUBSCRIPTION_PLANS[currentPlan];
    return plan.features.familyMembers === -1 || currentCount < plan.features.familyMembers;
  };

  const canUploadFile = (fileSize) => {
    const plan = SUBSCRIPTION_PLANS[currentPlan];
    const maxStorageBytes = plan.features.storage * 1024 * 1024; // Convert MB to bytes
    return (usageStats.storageUsed + fileSize) <= maxStorageBytes;
  };

  const value = {
    currentPlan,
    subscriptionStatus,
    usageStats,
    subscription: {
      plan: currentPlan,
      status: subscriptionStatus
    },
    revenueCatOfferings,
    isRevenueCatInitialized,
    upgradePlan,
    purchaseSubscription,
    restorePurchases,
    updateSubscription,
    checkUsageLimit,
    canAddFamilyMember,
    canUploadFile,
    plans: SUBSCRIPTION_PLANS
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
