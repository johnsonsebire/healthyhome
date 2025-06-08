import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext();

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SUBSCRIPTION_PLANS = {
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 1,
    features: {
      familyMembers: 1,
      storage: 500, // MB
      editAccess: false,
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
      familyMembers: 3,
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
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setCurrentPlan(userData.subscriptionPlan || 'basic');
        setSubscriptionStatus(userData.subscriptionStatus || 'active');
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
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
    } catch (error) {
      throw error;
    }
  };

  const canAddFamilyMember = () => {
    const plan = SUBSCRIPTION_PLANS[currentPlan];
    return plan.features.familyMembers === -1 || 
           usageStats.familyMembers < plan.features.familyMembers;
  };

  const canUploadFile = (fileSize) => {
    const plan = SUBSCRIPTION_PLANS[currentPlan];
    const maxStorage = plan.features.storage * 1024 * 1024; // Convert MB to bytes
    return (usageStats.storageUsed + fileSize) <= maxStorage;
  };

  const value = {
    currentPlan,
    subscriptionStatus,
    usageStats,
    upgradePlan,
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
