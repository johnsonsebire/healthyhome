/**
 * Cloud Functions for sending emails via Firebase
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// Configure nodemailer with appropriate SMTP settings
// For production, you would use a proper email service like SendGrid, Mailgun, etc.
const mailTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const APP_NAME = 'Healthy Home';
const EMAIL_FROM = 'noreply@healthyhome.app';

/**
 * Sends a welcome email to a newly registered user
 */
exports.sendWelcomeEmail = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const { email, displayName } = data;
  const name = displayName || email.split('@')[0];

  const mailOptions = {
    from: `${APP_NAME} <${EMAIL_FROM}>`,
    to: email,
    subject: `Welcome to ${APP_NAME}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://firebasestorage.googleapis.com/v0/b/familyhealthapp-e5fd3.firebasestorage.app/o/app_assets%2Flogo.png?alt=media" alt="${APP_NAME} Logo" style="max-width: 150px;">
        </div>
        
        <h1 style="color: #4f46e5; text-align: center;">Welcome to ${APP_NAME}!</h1>
        
        <p>Hello ${name},</p>
        
        <p>Thank you for joining Healthy Home - your personal and family health record management solution!</p>
        
        <p>With your free account, you can:</p>
        <ul>
          <li>Manage your personal health records</li>
          <li>Store up to 200MB of health documents</li>
          <li>Keep track of your medical history</li>
        </ul>
        
        <p>Looking for more features? Upgrade your plan to enjoy:</p>
        <ul>
          <li>Add multiple family members (up to 5 with our Standard plan)</li>
          <li>Access up to 10GB of storage (Premium plan)</li>
          <li>Use OCR to extract text from your documents</li>
          <li>Generate comprehensive health reports</li>
          <li>Offline access to your records</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Open Healthy Home App
          </a>
        </div>
        
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        
        <p>Best regards,<br>The ${APP_NAME} Team</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; text-align: center;">
          <p>This is an automated message, please do not reply directly to this email.</p>
          <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    await mailTransport.sendMail(mailOptions);
    console.log('Welcome email sent to:', email);
    return { success: true };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw new functions.https.HttpsError('internal', 'Error sending email');
  }
});

/**
 * Sends a plan upgrade confirmation email
 */
exports.sendPlanUpgradeEmail = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const { email, displayName, planName } = data;
  const name = displayName || email.split('@')[0];

  const mailOptions = {
    from: `${APP_NAME} <${EMAIL_FROM}>`,
    to: email,
    subject: `Your ${APP_NAME} Subscription Has Been Upgraded!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://firebasestorage.googleapis.com/v0/b/familyhealthapp-e5fd3.firebasestorage.app/o/app_assets%2Flogo.png?alt=media" alt="${APP_NAME} Logo" style="max-width: 150px;">
        </div>
        
        <h1 style="color: #4f46e5; text-align: center;">Subscription Upgraded!</h1>
        
        <p>Hello ${name},</p>
        
        <p>Thank you for upgrading to our <strong>${planName}</strong> plan!</p>
        
        <p>You now have access to enhanced features to better manage your family's health records.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Open Healthy Home App
          </a>
        </div>
        
        <p>If you have any questions or need assistance with your new features, please don't hesitate to contact our support team.</p>
        
        <p>Best regards,<br>The ${APP_NAME} Team</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; text-align: center;">
          <p>This is an automated message, please do not reply directly to this email.</p>
          <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    await mailTransport.sendMail(mailOptions);
    console.log('Plan upgrade email sent to:', email);
    return { success: true };
  } catch (error) {
    console.error('Error sending plan upgrade email:', error);
    throw new functions.https.HttpsError('internal', 'Error sending email');
  }
});
