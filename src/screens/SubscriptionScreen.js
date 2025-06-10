import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Constants from 'expo-constants';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription, SUBSCRIPTION_PLANS } from '../contexts/SubscriptionContext';
import { useError, ERROR_TYPES, ERROR_SEVERITY } from '../contexts/ErrorContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PAYMENT_PROVIDERS } from '../services/unifiedPaymentService';

const SubscriptionScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const { 
    currentPlan, 
    upgradePlan, 
    isProcessing, 
    revenueCatOfferings, 
    isRevenueCatInitialized,
    purchaseSubscription,
    restorePurchases,
    // New payment provider functionality
    availablePaymentMethods,
    selectedPaymentProvider,
    paymentPlans,
    pendingPaymentReference,
    verifyPaystackPayment,
    getPlansForProvider,
    switchPaymentProvider
  } = useSubscription();
  const { withErrorHandling, isLoading } = useError();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showProviderSelection, setShowProviderSelection] = useState(false);
  const [currentSelectedProvider, setCurrentSelectedProvider] = useState(selectedPaymentProvider);

  // Get parameters from route if coming from onboarding
  const fromOnboarding = route?.params?.fromOnboarding;
  const selectedPlanFromOnboarding = route?.params?.selectedPlan;

  useEffect(() => {
    // If coming from onboarding with a selected plan, pre-select it
    if (fromOnboarding && selectedPlanFromOnboarding) {
      const plan = plans.find(p => p.id === selectedPlanFromOnboarding);
      if (plan) {
        setSelectedPlan(plan);
        // Automatically show payment modal after a short delay
        setTimeout(() => {
          setShowPaymentModal(true);
        }, 500);
      }
    }
  }, [fromOnboarding, selectedPlanFromOnboarding, plans]);

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      period: 'month',
      features: [
        'Single user only',
        'Basic health records',
        '200MB storage',
        'Basic appointment scheduling',
        'Standard support',
      ],
      limits: {
        familyMembers: 1,
        records: 10,
        storage: 200 * 1024 * 1024, // 200MB in bytes
      },
      color: '#6b7280', // Gray
      popular: false,
    },
    {
      id: 'basic',
      name: 'Basic',
      price: 1,
      period: 'month',
      features: [
        'Up to 2 family members',
        'Up to 20 medical records',
        '500MB storage',
        'Basic appointment scheduling',
        'Standard support',
      ],
      limits: {
        familyMembers: 2,
        records: 20,
        storage: 500 * 1024 * 1024, // 500MB in bytes
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
        'Up to 5 family members',
        'Up to 100 medical records',
        '2GB storage',
        'Advanced appointment scheduling',
        'OCR document scanning',
        'Data export',
        'Priority support',
      ],
      limits: {
        familyMembers: 5,
        records: 100,
        storage: 2 * 1024 * 1024 * 1024, // 2GB in bytes
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
        'Unlimited family members',
        'Unlimited medical records',
        '10GB storage',
        'Advanced appointment scheduling',
        'OCR document scanning',
        'Data export & backup',
        'Insurance claim tracking',
        'Health analytics',
        '24/7 premium support',
      ],
      limits: {
        familyMembers: -1, // unlimited
        records: -1, // unlimited
        storage: 10 * 1024 * 1024 * 1024, // 10GB in bytes
      },
      color: '#FF9500',
      popular: false,
    },
  ];

  const handleSelectPlan = (plan) => {
    if (currentPlan === plan.id) {
      Alert.alert('Current Plan', 'You are already subscribed to this plan.');
      return;
    }

    setSelectedPlan(plan);
    
    if (plan.id === 'free') {
      // Handle free plan downgrade
      handleDowngradeToFree();
    } else {
      // Show provider selection first, then payment modal
      if (availablePaymentMethods.length > 1) {
        setShowProviderSelection(true);
      } else {
        setShowPaymentModal(true);
      }
    }
  };

  const handleDowngradeToFree = () => {
    Alert.alert(
      'Downgrade to Free',
      'Are you sure you want to downgrade to the free plan? You will lose access to premium features.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Downgrade',
          style: 'destructive',
          onPress: async () => {
            try {
              await upgradePlan('free');
              Alert.alert('Success', 'You have been downgraded to the free plan.');
            } catch (error) {
              Alert.alert('Error', 'Failed to downgrade plan. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handlePayment = async () => {
    if (!selectedPlan) {
      Alert.alert('Error', 'No plan selected. Please select a plan first.');
      return;
    }

    if (!currentSelectedProvider) {
      Alert.alert('Error', 'No payment provider selected. Please select a payment method first.');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await purchaseSubscription(selectedPlan.id, currentSelectedProvider);
      
      setLoading(false);
      
      if (result.success) {
        if (result.requiresVerification) {
          // For Paystack payments that require verification
          setShowPaymentModal(false);
          Alert.alert(
            'Payment Initiated',
            result.message + '\n\nPlease complete the payment in your browser and return to verify.',
            [
              {
                text: 'Verify Payment',
                onPress: () => handlePaymentVerification(result.reference)
              },
              {
                text: 'Later',
                style: 'cancel'
              }
            ]
          );
        } else {
          // For RevenueCat in-app purchases
          setShowPaymentModal(false);
          Alert.alert(
            'Success!',
            `You have successfully subscribed to the ${selectedPlan.name} plan.`,
            [
              {
                text: 'OK',
                onPress: () => {
                  if (fromOnboarding) {
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'MainTabs' }],
                    });
                  }
                }
              }
            ]
          );
        }
      } else if (result.cancelled) {
        setShowPaymentModal(false);
        Alert.alert('Purchase Cancelled', 'You cancelled the purchase.');
      } else {
        throw new Error(result.error || 'Purchase failed');
      }
    } catch (error) {
      setLoading(false);
      console.error('Payment error:', error);
      
      let errorMessage = 'There was an error processing your payment. Please try again later.';
      
      if (error.message?.includes('cancelled')) {
        errorMessage = 'Purchase was cancelled.';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      Alert.alert('Error', errorMessage);
    }
  };

  const handleRestorePurchases = async () => {
    if (!isRevenueCatInitialized) {
      Alert.alert('Error', 'Restore system is not ready. Please try again in a moment.');
      return;
    }

    setLoading(true);

    try {
      const result = await restorePurchases();
      setLoading(false);

      if (result.success) {
        Alert.alert(
          'Purchases Restored',
          'Your previous purchases have been restored successfully.'
        );
      } else {
        Alert.alert(
          'No Purchases Found',
          'No previous purchases were found to restore.'
        );
      }
    } catch (error) {
      setLoading(false);
      console.error('Restore purchases error:', error);
      Alert.alert(
        'Error',
        'Failed to restore purchases. Please try again later.'
      );
    }
  };

  // Handle Paystack payment verification
  const handlePaymentVerification = async (reference = null) => {
    const paymentRef = reference || pendingPaymentReference;
    
    if (!paymentRef) {
      Alert.alert('Error', 'No payment reference found to verify.');
      return;
    }

    setLoading(true);

    try {
      const result = await verifyPaystackPayment(paymentRef);
      
      setLoading(false);
      
      if (result.success) {
        Alert.alert(
          'Payment Verified!',
          `Your ${result.plan} subscription has been activated successfully.`,
          [
            {
              text: 'OK',
              onPress: () => {
                if (fromOnboarding) {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'MainTabs' }],
                  });
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Verification Failed', 'Payment verification failed. Please try again or contact support.');
      }
    } catch (error) {
      setLoading(false);
      console.error('Payment verification error:', error);
      Alert.alert('Error', 'Failed to verify payment. Please try again.');
    }
  };

  // Handle payment provider selection
  const handleProviderSelection = (providerId) => {
    setCurrentSelectedProvider(providerId);
    switchPaymentProvider(providerId);
    // We don't close the modal here to allow the user to click Continue
    // setShowProviderSelection(false);
  };

  // Get formatted currency for display
  const formatCurrency = (amount, currency = 'USD') => {
    if (currency === 'GHS') {
      return `₵${amount.toFixed(2)}`;
    }
    return `$${amount.toFixed(2)}`;
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

  const getCurrentPlanDetails = () => {
    return plans.find(plan => plan.id === currentPlan) || plans[0];
  };

  const userCurrentPlan = getCurrentPlanDetails();

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
          <View style={[styles.currentPlanCard, { borderColor: userCurrentPlan.color }]}>
            <View style={styles.currentPlanHeader}>
              <Text style={styles.currentPlanName}>{userCurrentPlan.name}</Text>
              <Text style={styles.currentPlanPrice}>
                ${userCurrentPlan.price}/{userCurrentPlan.period}
              </Text>
            </View>
            <Text style={styles.currentPlanStatus}>
              Status: Active
            </Text>
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
                    currentPlan === plan.id && styles.currentPlanButton,
                  ]}
                  onPress={() => handleSelectPlan(plan)}
                  disabled={currentPlan === plan.id}
                >
                  <Text style={styles.selectButtonText}>
                    {currentPlan === plan.id ? 'Current' : 'Select'}
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

        {/* Restore Purchases Button */}
        <View style={styles.restoreSection}>
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestorePurchases}
            disabled={loading || !isRevenueCatInitialized}
          >
            <Ionicons name="refresh" size={20} color="#007AFF" />
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          </TouchableOpacity>
          <Text style={styles.restoreHint}>
            Already have a subscription? Tap here to restore your purchase.
          </Text>
        </View>
      </ScrollView>

      {/* Provider Selection Modal */}
      <Modal
        visible={showProviderSelection}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowProviderSelection(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Choose Payment Method</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView 
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentContainer}
            showsVerticalScrollIndicator={true}
          >
            {selectedPlan && (
              <View style={styles.paymentSummary}>
                <Text style={styles.paymentPlanName}>{selectedPlan.name} Plan</Text>
                <Text style={styles.paymentPrice}>
                  ${selectedPlan.price}/{selectedPlan.period}
                </Text>
              </View>
            )}

            <Text style={styles.providerSectionTitle}>Select your preferred payment method:</Text>
            
            {availablePaymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.providerOption,
                  currentSelectedProvider === method.id && styles.providerOptionSelected
                ]}
                onPress={() => handleProviderSelection(method.id)}
              >
                <View style={styles.providerOptionHeader}>
                  <View style={styles.providerIconContainer}>
                    <Ionicons 
                      name={method.icon} 
                      size={24} 
                      color={method.recommended ? '#007AFF' : '#666'} 
                    />
                  </View>
                  <View style={styles.providerInfo}>
                    <Text style={styles.providerName}>{method.name}</Text>
                    <Text style={styles.providerDescription}>{method.description}</Text>
                  </View>
                  {method.recommended && (
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedText}>Recommended</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.providerFeatures}>
                  {method.features.map((feature, index) => (
                    <View key={index} style={styles.providerFeature}>
                      <Ionicons name="checkmark-circle" size={12} color="#34C759" />
                      <Text style={styles.providerFeatureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))}

            {currentSelectedProvider && (
              <Text style={styles.helperText}>
                Please tap "Continue" below to proceed with payment
              </Text>
            )}

            <TouchableOpacity
              style={[
                styles.continueButton,
                !currentSelectedProvider && styles.continueButtonDisabled
              ]}
              disabled={!currentSelectedProvider}
              onPress={() => {
                setShowProviderSelection(false);
                setShowPaymentModal(true);
              }}
            >
              <Text style={[
                styles.continueButtonText,
                !currentSelectedProvider && styles.continueButtonTextDisabled
              ]}>
                Continue with {availablePaymentMethods.find(m => m.id === currentSelectedProvider)?.name || 'Selected Method'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Payment Confirmation Modal */}
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

          <ScrollView 
            style={styles.scrollableModalContent}
            contentContainerStyle={styles.modalContentContainer}
            showsVerticalScrollIndicator={true}
          >
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
                  <TouchableOpacity 
                    style={styles.paymentMethodCard}
                    onPress={() => {
                      setShowPaymentModal(false);
                      setShowProviderSelection(true);
                    }}
                  >
                    <Ionicons 
                      name={availablePaymentMethods.find(m => m.id === currentSelectedProvider)?.icon || 'card'} 
                      size={24} 
                      color="#007AFF" 
                    />
                    <View style={styles.paymentMethodInfo}>
                      <Text style={styles.paymentMethodText}>
                        {availablePaymentMethods.find(m => m.id === currentSelectedProvider)?.name || 'Select Payment Method'}
                      </Text>
                      <Text style={styles.paymentMethodSubtext}>
                        {availablePaymentMethods.find(m => m.id === currentSelectedProvider)?.description || ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#666" />
                  </TouchableOpacity>
                  
                  {/* Show pending payment verification if exists */}
                  {pendingPaymentReference && (
                    <View style={styles.pendingPaymentSection}>
                      <Text style={styles.pendingPaymentTitle}>Pending Payment</Text>
                      <Text style={styles.pendingPaymentText}>
                        You have a pending payment. Tap to verify.
                      </Text>
                      <TouchableOpacity
                        style={styles.verifyButton}
                        onPress={() => handlePaymentVerification()}
                      >
                        <Text style={styles.verifyButtonText}>Verify Payment</Text>
                      </TouchableOpacity>
                    </View>
                  )}
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
          </ScrollView>
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
  paymentMethodInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#666',
  },
  paymentMethodSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
  restoreSection: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'white',
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  restoreButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  restoreHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  providerSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
  },
  providerOption: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  providerOptionSelected: {
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  providerOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  providerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  providerDescription: {
    fontSize: 14,
    color: '#666',
  },
  recommendedBadge: {
    backgroundColor: '#34C759',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginLeft: 10,
  },
  recommendedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedProviderIndicator: {
    position: 'absolute',
    right: 10,
    top: 10,
  },
  providerFeatures: {
    marginTop: 10,
  },
  providerFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  providerFeatureText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  helperText: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  continueButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButtonTextDisabled: {
    color: '#999',
  },
  pendingPaymentSection: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  pendingPaymentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  pendingPaymentText: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 8,
  },
  verifyButton: {
    backgroundColor: '#FFC107',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  verifyButtonText: {
    color: '#856404',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollableModalContent: {
    flex: 1,
    padding: 20,
  },
  modalContentContainer: {
    paddingBottom: 40,
  },
});

export default SubscriptionScreen;
