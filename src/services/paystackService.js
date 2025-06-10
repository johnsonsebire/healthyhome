import { Linking, Alert } from 'react-native';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import emailService from './emailService';

// Paystack Configuration from environment variables
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const API_BASE_URL = process.env.API_BASE_URL;

class PaystackService {
  constructor() {
    if (!PAYSTACK_PUBLIC_KEY || !PAYSTACK_SECRET_KEY || !API_BASE_URL) {
      throw new Error('Missing required environment variables for Paystack configuration');
    }
    this.publicKey = PAYSTACK_PUBLIC_KEY;
    this.initialized = true;
  }

  // Plan configurations for Paystack
  getPaystackPlans() {
    return {
      basic: {
        id: 'basic_monthly',
        name: 'Basic Plan',
        amount: 100, // Amount in pesewas (₵1.00)
        currency: 'GHS',
        interval: 'monthly',
        planCode: 'PLN_basic_monthly'
      },
      standard: {
        id: 'standard_monthly',
        name: 'Standard Plan',
        amount: 200, // Amount in pesewas (₵2.00)
        currency: 'GHS',
        interval: 'monthly',
        planCode: 'PLN_standard_monthly'
      },
      premium: {
        id: 'premium_monthly',
        name: 'Premium Plan',
        amount: 300, // Amount in pesewas (₵3.00)
        currency: 'GHS',
        interval: 'monthly',
        planCode: 'PLN_premium_monthly'
      }
    };
  }

  // Create a payment URL for web-based payment
  async createPaymentUrl(planId, customerEmail, userId) {
    try {
      const plans = this.getPaystackPlans();
      const selectedPlan = plans[planId];

      if (!selectedPlan) {
        throw new Error('Invalid plan selected');
      }

      // Generate a unique reference
      const reference = `sub_${userId}_${planId}_${Date.now()}`;

      // Payment initialization data
      const paymentData = {
        email: customerEmail,
        amount: selectedPlan.amount,
        currency: selectedPlan.currency,
        reference: reference,
        plan: selectedPlan.planCode,
        callback_url: `${API_BASE_URL}/paystack/callback`,
        metadata: {
          user_id: userId,
          plan_id: planId,
          plan_name: selectedPlan.name,
          custom_fields: [
            {
              display_name: 'User ID',
              variable_name: 'user_id',
              value: userId
            },
            {
              display_name: 'Plan',
              variable_name: 'plan_id',
              value: planId
            }
          ]
        }
      };

      // Call backend to initialize the payment
      const response = await this.callBackendAPI('/paystack/initialize', 'POST', paymentData);

      if (response.status && response.data) {
        return {
          success: true,
          authorization_url: response.data.authorization_url,
          access_code: response.data.access_code,
          reference: response.data.reference
        };
      } else {
        throw new Error(response.message || 'Failed to initialize payment');
      }
    } catch (error) {
      console.error('Paystack payment initialization error:', error);
      throw error;
    }
  }

  // Open payment URL in browser
  async initiatePayment(planId, customerEmail, userId) {
    try {
      const paymentResult = await this.createPaymentUrl(planId, customerEmail, userId);

      if (paymentResult.success) {
        // Open the payment URL in the default browser
        const supported = await Linking.canOpenURL(paymentResult.authorization_url);

        if (supported) {
          await Linking.openURL(paymentResult.authorization_url);
          return {
            success: true,
            reference: paymentResult.reference,
            message: 'Payment page opened. Please complete the payment in your browser.'
          };
        } else {
          throw new Error('Cannot open payment URL');
        }
      } else {
        throw new Error('Failed to create payment URL');
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      throw error;
    }
  }

  // Verify payment status
  async verifyPayment(reference) {
    try {
      const response = await this.callBackendAPI(`/paystack/verify/${reference}`, 'GET');

      if (response.status && response.data) {
        const paymentData = response.data;

        return {
          success: true,
          status: paymentData.status,
          amount: paymentData.amount,
          currency: paymentData.currency,
          customer: paymentData.customer,
          metadata: paymentData.metadata,
          paid_at: paymentData.paid_at
        };
      } else {
        return {
          success: false,
          message: response.message || 'Payment verification failed'
        };
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      throw error;
    }
  }

  // Process successful payment and update user subscription
  async processPaymentSuccess(verificationResult, userId) {
    try {
      if (!verificationResult.success || verificationResult.status !== 'success') {
        throw new Error('Payment was not successful');
      }

      const planId = verificationResult.metadata.plan_id;

      // Update user subscription in Firestore
      await updateDoc(doc(db, 'users', userId), {
        subscriptionPlan: planId,
        subscriptionStatus: 'active',
        subscriptionProvider: 'paystack',
        paystackCustomerId: verificationResult.customer.customer_code,
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        updatedAt: new Date()
      });

      // Send confirmation email
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          await emailService.sendPlanUpgradeEmail({
            email: userData.email,
            uid: userId,
            firstName: userData.firstName,
            displayName: userData.displayName || userData.firstName
          }, verificationResult.metadata.plan_name);
        }
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
      }

      return {
        success: true,
        plan: planId,
        message: 'Subscription activated successfully!'
      };
    } catch (error) {
      console.error('Error processing payment success:', error);
      throw error;
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionCode) {
    try {
      const response = await this.callBackendAPI(`/paystack/subscription/disable`, 'POST', {
        code: subscriptionCode,
        token: subscriptionCode
      });

      if (response.status) {
        return {
          success: true,
          message: 'Subscription cancelled successfully'
        };
      } else {
        throw new Error(response.message || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Subscription cancellation error:', error);
      throw error;
    }
  }

  // Helper method to call backend API
  async callBackendAPI(endpoint, method = 'GET', data = null) {
    try {
      const config = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`
        }
      };

      if (data) {
        config.body = JSON.stringify(data);
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const result = await response.json();

      return result;
    } catch (error) {
      console.error('API call error:', error);
      throw error;
    }
  }

  // Get subscription plans formatted for UI
  getFormattedPlans() {
    const plans = this.getPaystackPlans();
    return Object.keys(plans).map(key => ({
      id: key,
      name: plans[key].name,
      price: plans[key].amount / 100, // Convert from pesewas to cedis
      currency: 'GHS',
      interval: plans[key].interval,
      provider: 'paystack'
    }));
  }
}

export default new PaystackService();