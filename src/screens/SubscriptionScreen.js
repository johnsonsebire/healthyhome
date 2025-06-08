import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useError, ERROR_TYPES, ERROR_SEVERITY } from '../contexts/ErrorContext';
import { LoadingSpinner } from '../components/LoadingSpinner';

const SubscriptionScreen = () => {
  const { user } = useAuth();
  const { subscription, updateSubscription } = useSubscription();
  const { withErrorHandling, isLoading } = useError();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: 1,
      period: 'month',
      features: [
        'Up to 3 family members',
        'Up to 10 medical records',
        '100MB storage',
        'Basic appointment scheduling',
        'Standard support',
      ],
      limits: {
        familyMembers: 3,
        records: 10,
        storage: 100 * 1024 * 1024, // 100MB in bytes
      },
      color: '#34C759',
      popular: false,
    },
    {
      id: 'standard',
      name: 'Standard',
      price: 2,
      period: 'month',
      features: [
        'Up to 10 family members',
        'Up to 100 medical records',
        '500MB storage',
        'Advanced appointment scheduling',
        'OCR document scanning',
        'Data export',
        'Priority support',
      ],
      limits: {
        familyMembers: 10,
        records: 100,
        storage: 500 * 1024 * 1024, // 500MB in bytes
      },
      color: '#007AFF',
      popular: true,
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 3,
      period: 'month',
      features: [
        'Up to 50 family members',
        'Unlimited medical records',
        '2GB storage',
        'Advanced appointment scheduling',
        'OCR document scanning',
        'Data export & backup',
        'Insurance claim tracking',
        'Health analytics',
        '24/7 premium support',
      ],
      limits: {
        familyMembers: 50,
        records: -1, // unlimited
        storage: 2 * 1024 * 1024 * 1024, // 2GB in bytes
      },
      color: '#FF9500',
      popular: false,
    },
  ];

  const handleSelectPlan = (plan) => {
    if (subscription?.plan === plan.id) {
      Alert.alert('Current Plan', 'You are already subscribed to this plan.');
      return;
    }

    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handlePayment = async () => {
    const result = await withErrorHandling(
      async () => {
        // In a real app, you would integrate with Stripe or another payment processor
        // For now, we'll simulate a successful payment
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const newSubscription = {
          plan: selectedPlan.id,
          planName: selectedPlan.name,
          price: selectedPlan.price,
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          limits: selectedPlan.limits,
        };

        await updateSubscription(newSubscription);
        
        return newSubscription;
      },
      {
        errorType: ERROR_TYPES.SUBSCRIPTION,
        errorSeverity: ERROR_SEVERITY.HIGH,
        showLoading: true,
      }
    );

    if (result.success) {
      setShowPaymentModal(false);
      setSelectedPlan(null);
      
      Alert.alert(
        'Success!',
        `You have successfully subscribed to the ${selectedPlan.name} plan.`
      );
    }
  };

  const formatStorageSize = (bytes) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
    } else if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
    } else {
      return `${(bytes / 1024).toFixed(0)}KB`;
    }
  };

  const getCurrentPlanFeatures = () => {
    return plans.find(plan => plan.id === subscription?.plan) || plans[0];
  };

  const currentPlan = getCurrentPlanFeatures();

  return (
    <View style={styles.container}>
      {/* Loading Overlay */}
      {isLoading && <LoadingSpinner />}
      
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Subscription Plans</Text>
          <Text style={styles.subtitle}>
            Choose the plan that best fits your family's needs
          </Text>
        </View>

        <View style={styles.currentPlanSection}>
          <Text style={styles.sectionTitle}>Current Plan</Text>
          <View style={[styles.currentPlanCard, { borderColor: currentPlan.color }]}>
            <View style={styles.currentPlanHeader}>
              <Text style={styles.currentPlanName}>{currentPlan.name}</Text>
              <Text style={styles.currentPlanPrice}>
                ${currentPlan.price}/{currentPlan.period}
              </Text>
            </View>
            <Text style={styles.currentPlanStatus}>
              Status: {subscription?.status || 'Active'}
            </Text>
            {subscription?.endDate && (
              <Text style={styles.currentPlanExpiry}>
                Expires: {new Date(subscription.endDate).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>Available Plans</Text>
          {plans.map((plan) => (
            <View key={plan.id} style={styles.planCard}>
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>Most Popular</Text>
                </View>
              )}
              
              <View style={styles.planHeader}>
                <View>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <View style={styles.planPriceContainer}>
                    <Text style={[styles.planPrice, { color: plan.color }]}>
                      ${plan.price}
                    </Text>
                    <Text style={styles.planPeriod}>/{plan.period}</Text>
                  </View>
                </View>
                
                <TouchableOpacity
                  style={[
                    styles.selectButton,
                    { backgroundColor: plan.color },
                    subscription?.plan === plan.id && styles.currentPlanButton,
                  ]}
                  onPress={() => handleSelectPlan(plan)}
                  disabled={subscription?.plan === plan.id}
                >
                  <Text style={styles.selectButtonText}>
                    {subscription?.plan === plan.id ? 'Current' : 'Select'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.featuresContainer}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={16} color={plan.color} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Can I change my plan anytime?</Text>
            <Text style={styles.faqAnswer}>
              Yes, you can upgrade or downgrade your plan at any time. Changes will take effect immediately.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>What happens to my data if I downgrade?</Text>
            <Text style={styles.faqAnswer}>
              Your data will remain safe. However, you may need to remove some family members or records if you exceed the new plan's limits.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Is my payment information secure?</Text>
            <Text style={styles.faqAnswer}>
              Yes, we use industry-standard encryption and secure payment processors to protect your financial information.
            </Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showPaymentModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Confirm Subscription</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.modalContent}>
            {selectedPlan && (
              <>
                <View style={styles.paymentSummary}>
                  <Text style={styles.paymentPlanName}>{selectedPlan.name} Plan</Text>
                  <Text style={styles.paymentPrice}>
                    ${selectedPlan.price}/{selectedPlan.period}
                  </Text>
                  <Text style={styles.paymentDescription}>
                    Billed monthly. Cancel anytime.
                  </Text>
                </View>

                <View style={styles.paymentFeatures}>
                  <Text style={styles.paymentFeaturesTitle}>What's included:</Text>
                  {selectedPlan.features.map((feature, index) => (
                    <View key={index} style={styles.paymentFeatureItem}>
                      <Ionicons name="checkmark" size={16} color="#34C759" />
                      <Text style={styles.paymentFeatureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.paymentMethodSection}>
                  <Text style={styles.paymentMethodTitle}>Payment Method</Text>
                  <View style={styles.paymentMethodCard}>
                    <Ionicons name="card" size={24} color="#007AFF" />
                    <Text style={styles.paymentMethodText}>
                      Demo Mode - No actual payment will be processed
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    { backgroundColor: selectedPlan.color },
                    loading && styles.confirmButtonDisabled,
                  ]}
                  onPress={handlePayment}
                  disabled={loading}
                >
                  <Text style={styles.confirmButtonText}>
                    {loading ? 'Processing...' : `Subscribe for $${selectedPlan.price}/month`}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.paymentDisclaimer}>
                  By subscribing, you agree to our Terms of Service and Privacy Policy.
                  You can cancel your subscription at any time.
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  currentPlanSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  currentPlanCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  currentPlanName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  currentPlanPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  currentPlanStatus: {
    fontSize: 14,
    color: '#34C759',
    marginBottom: 5,
  },
  currentPlanExpiry: {
    fontSize: 14,
    color: '#666',
  },
  plansSection: {
    padding: 20,
    paddingTop: 0,
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 20,
    backgroundColor: '#FF9500',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  planName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  planPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  planPeriod: {
    fontSize: 16,
    color: '#666',
  },
  selectButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  currentPlanButton: {
    backgroundColor: '#666',
  },
  selectButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  featuresContainer: {
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  faqSection: {
    padding: 20,
    paddingTop: 0,
  },
  faqItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  cancelButton: {
    color: '#007AFF',
    fontSize: 16,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  paymentSummary: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  paymentPlanName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  paymentPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  paymentDescription: {
    fontSize: 14,
    color: '#666',
  },
  paymentFeatures: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  paymentFeaturesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  paymentFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  paymentFeatureText: {
    fontSize: 16,
    color: '#333',
  },
  paymentMethodSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  paymentMethodTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#666',
  },
  confirmButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  paymentDisclaimer: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default SubscriptionScreen;
