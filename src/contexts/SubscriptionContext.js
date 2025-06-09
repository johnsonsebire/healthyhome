import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from './AuthContext';
import networkService from '../services/networkService';
import offlineStorageService from '../services/offlineStorage';
import emailService from '../services/emailService';

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
  const [currentPlan, setCurrentPlan] = useState('basic');
  const [subscriptionStatus, setSubscriptionStatus] = useState('active');
  const [usageStats, setUsageStats] = useState({
    familyMembers: 0,
    storageUsed: 0
  });

  useEffect(() => {
    if (user) {
      fetchSubscriptionData();
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

  const upgradePlan = async (newPlan) => {
    try {
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
    upgradePlan,
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
