/**
 * Email service for sending various notifications to users
 */
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '../../firebaseConfig';

/**
 * Sends a welcome email to a newly registered user
 * @param {Object} user - The user object containing email and name
 * @returns {Promise} - A promise that resolves when the email is sent
 */
export const sendWelcomeEmail = async (user) => {
  try {
    const functions = getFunctions();
    const sendWelcomeEmailFn = httpsCallable(functions, 'sendWelcomeEmail');
    
    const result = await sendWelcomeEmailFn({ 
      email: user.email,
      displayName: user.displayName || user.firstName || '',
      uid: user.uid
    });
    
    console.log('✅ Welcome email sent successfully', result.data);
    return result.data;
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error);
    // Don't throw the error as this is not critical for app function
    return { success: false, error: error.message };
  }
};

/**
 * Sends a subscription upgrade confirmation email
 * @param {Object} user - The user object
 * @param {String} planName - The name of the plan the user upgraded to
 * @returns {Promise} - A promise that resolves when the email is sent
 */
export const sendPlanUpgradeEmail = async (user, planName) => {
  try {
    const functions = getFunctions();
    const sendPlanUpgradeEmailFn = httpsCallable(functions, 'sendPlanUpgradeEmail');
    
    const result = await sendPlanUpgradeEmailFn({ 
      email: user.email,
      displayName: user.displayName || user.firstName || '',
      planName
    });
    
    console.log('✅ Plan upgrade email sent successfully', result.data);
    return result.data;
  } catch (error) {
    console.error('❌ Failed to send plan upgrade email:', error);
    return { success: false, error: error.message };
  }
};

export default {
  sendWelcomeEmail,
  sendPlanUpgradeEmail
};
