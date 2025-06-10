import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TermsOfServiceScreen = ({ navigation }) => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <Text style={styles.headerSubtitle}>Last Updated: June 10, 2025</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By accessing or using the Healthy Home, you agree to be bound by these Terms of Service and our Privacy Policy.
          If you disagree with any part of the terms, you do not have permission to access the service.
        </Text>

        <Text style={styles.sectionTitle}>2. Description of Service</Text>
        <Text style={styles.paragraph}>
          Healthy Home provides tools for managing and storing personal and family health information, including medical
          records, prescriptions, appointments, and insurance details. The app is designed for personal use and is not intended
          to replace professional medical advice, diagnosis, or treatment.
        </Text>

        <Text style={styles.sectionTitle}>3. User Accounts</Text>
        <Text style={styles.paragraph}>
          To use certain features of the app, you must register for an account. You are responsible for:
        </Text>
        <Text style={styles.listItem}>• Providing accurate and complete information</Text>
        <Text style={styles.listItem}>• Maintaining the security of your account and password</Text>
        <Text style={styles.listItem}>• All activities that occur under your account</Text>
        <Text style={styles.paragraph}>
          We reserve the right to disable any user account if we believe you have violated these Terms.
        </Text>

        <Text style={styles.sectionTitle}>4. Content and Information</Text>
        <Text style={styles.paragraph}>
          You retain ownership of any content you submit to the app. By submitting content, you grant us a worldwide,
          non-exclusive, royalty-free license to use, store, and process this content solely for the purpose of providing
          the service to you.
        </Text>
        <Text style={styles.paragraph}>
          You are solely responsible for the accuracy and legality of the information you provide.
        </Text>

        <Text style={styles.sectionTitle}>5. Subscription and Billing</Text>
        <Text style={styles.paragraph}>
          The app offers both free and paid subscription plans. By subscribing to a paid plan, you agree to:
        </Text>
        <Text style={styles.listItem}>• Pay all fees associated with your subscription</Text>
        <Text style={styles.listItem}>• Provide current, complete, and accurate billing information</Text>
        <Text style={styles.listItem}>• Automatically renew your subscription unless canceled</Text>
        <Text style={styles.paragraph}>
          We reserve the right to change subscription prices with notice. No refunds will be issued for partial subscription periods.
        </Text>

        <Text style={styles.sectionTitle}>6. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          The app is provided "as is" without any guarantees or warranties, expressed or implied. In no event will the app
          developers or their suppliers be liable for any damages arising from the use or inability to use the app.
        </Text>
        <Text style={styles.paragraph}>
          The app is not intended to provide medical advice and should not be used as a substitute for professional medical advice,
          diagnosis, or treatment.
        </Text>

        <Text style={styles.sectionTitle}>7. Data Security and Privacy</Text>
        <Text style={styles.paragraph}>
          We implement reasonable security measures to protect your data. However, no system is completely secure,
          and we cannot guarantee the absolute security of your information. Please refer to our Privacy Policy for details
          on how we handle your data.
        </Text>

        <Text style={styles.sectionTitle}>8. Changes to Terms</Text>
        <Text style={styles.paragraph}>
          We reserve the right to modify these Terms at any time. We will provide notice of significant changes by updating
          the "Last Updated" date. Your continued use of the app after such changes constitutes acceptance of the new Terms.
        </Text>

        <Text style={styles.sectionTitle}>9. Termination</Text>
        <Text style={styles.paragraph}>
          We may terminate or suspend your account and access to the service immediately, without prior notice, for conduct
          that we determine violates these Terms, is harmful to other users, or is harmful to our business interests.
        </Text>

        <Text style={styles.sectionTitle}>10. Governing Law</Text>
        <Text style={styles.paragraph}>
          These Terms shall be governed by the laws of the jurisdiction in which the app developers are based, without regard
          to its conflict of law provisions.
        </Text>

        <Text style={styles.sectionTitle}>11. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions about these Terms, please contact us at:
        </Text>
        <Text style={styles.contactInfo}>Email: legal@manifestghana.com</Text>
        <Text style={styles.contactInfo}>Address: Manifest Digital, Pawpaw Street, East Legon, Ghana, West Africa</Text>
      </View>
      
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#6366f1" />
        <Text style={styles.backButtonText}>Back to Settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#6366f1',
    padding: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0e7ff',
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4b5563',
    marginBottom: 16,
  },
  listItem: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4b5563',
    marginBottom: 8,
    paddingLeft: 8,
  },
  contactInfo: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 8,
    fontWeight: '500',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginTop: 16,
    marginBottom: 32,
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '500',
  },
});

export default TermsOfServiceScreen;
