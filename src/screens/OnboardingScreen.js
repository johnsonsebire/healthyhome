import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  SafeAreaView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription, SUBSCRIPTION_PLANS } from '../contexts/SubscriptionContext';
import { LoadingSpinner } from '../components/LoadingSpinner';

const { width } = Dimensions.get('window');

const OnboardingScreen = () => {
  const navigation = useNavigation();
  const { user, userProfile } = useAuth();
  const { currentPlan, upgradePlan, isProcessing } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    // If user already has a plan other than free, navigate to home
    if (userProfile && userProfile.subscriptionPlan && userProfile.subscriptionPlan !== 'free') {
      navigation.replace('Home');
    }
  }, [userProfile, navigation]);

  const handleContinue = () => {
    if (selectedPlan && selectedPlan !== 'free') {
      navigation.navigate('Subscription', { fromOnboarding: true, selectedPlan });
    } else {
      // User wants to continue with free plan
      navigation.replace('Home');
    }
  };

  const renderPlanCard = (planId) => {
    const plan = SUBSCRIPTION_PLANS[planId];
    const isSelected = selectedPlan === planId;
    const isCurrent = currentPlan === planId;

    return (
      <TouchableOpacity
        key={planId}
        style={[
          styles.planCard,
          isSelected && styles.selectedPlanCard
        ]}
        onPress={() => setSelectedPlan(planId)}
      >
        <View style={styles.planHeader}>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.planPrice}>
            {plan.price > 0 ? `$${plan.price}/mo` : 'Free'}
          </Text>
        </View>

        <View style={styles.planFeatures}>
          <View style={styles.featureItem}>
            <Ionicons 
              name="people" 
              size={20} 
              color="#6366f1" 
            />
            <Text style={styles.featureText}>
              {plan.features.familyMembers === -1 
                ? 'Unlimited family members' 
                : `${plan.features.familyMembers} family member${plan.features.familyMembers > 1 ? 's' : ''}`}
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Ionicons 
              name="cloud-upload" 
              size={20} 
              color="#6366f1" 
            />
            <Text style={styles.featureText}>
              {(plan.features.storage / 1024) >= 1 
                ? `${plan.features.storage / 1024}GB storage`
                : `${plan.features.storage}MB storage`}
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Ionicons 
              name={plan.features.editAccess ? "checkmark-circle" : "close-circle"} 
              size={20} 
              color={plan.features.editAccess ? "#10b981" : "#6b7280"} 
            />
            <Text style={styles.featureText}>
              {plan.features.editAccess ? 'Edit access' : 'No edit access'}
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Ionicons 
              name={plan.features.ocr ? "checkmark-circle" : "close-circle"} 
              size={20} 
              color={plan.features.ocr ? "#10b981" : "#6b7280"} 
            />
            <Text style={styles.featureText}>
              {plan.features.ocr ? 'OCR document scanning' : 'No OCR scanning'}
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Ionicons 
              name={plan.features.offlineAccess ? "checkmark-circle" : "close-circle"} 
              size={20} 
              color={plan.features.offlineAccess ? "#10b981" : "#6b7280"} 
            />
            <Text style={styles.featureText}>
              {plan.features.offlineAccess ? 'Offline access' : 'No offline access'}
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Ionicons 
              name={plan.features.reports ? "checkmark-circle" : "close-circle"} 
              size={20} 
              color={plan.features.reports ? "#10b981" : "#6b7280"} 
            />
            <Text style={styles.featureText}>
              {plan.features.reports ? 'Health reports' : 'No health reports'}
            </Text>
          </View>
        </View>

        {isCurrent && (
          <View style={styles.currentPlanBadge}>
            <Text style={styles.currentPlanText}>CURRENT</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isProcessing) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Image 
            source={require('../../assets/splash-icon.png')} 
            style={styles.logo} 
            resizeMode="contain" 
          />
          <Text style={styles.welcomeText}>Welcome to Healthy Home!</Text>
          <Text style={styles.subtitle}>
            Choose a plan that works best for you and your family
          </Text>
        </View>

        <View style={styles.plansContainer}>
          {Object.keys(SUBSCRIPTION_PLANS).map(planId => renderPlanCard(planId))}
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>
              {selectedPlan && selectedPlan !== 'free' 
                ? 'Continue to Payment' 
                : 'Continue with Free Plan'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    marginTop: Platform.OS === 'ios' ? 0 : 20
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 10
  },
  plansContainer: {
    padding: 16,
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPlanCard: {
    borderColor: '#6366f1',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  planPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  planFeatures: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#4b5563',
  },
  currentPlanBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentPlanText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionContainer: {
    padding: 16,
    marginBottom: 40,
  },
  continueButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OnboardingScreen;
