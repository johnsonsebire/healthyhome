import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PrivacyPolicyScreen = ({ navigation }) => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <Text style={styles.headerSubtitle}>Last Updated: June 10, 2025</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Introduction</Text>
        <Text style={styles.paragraph}>
          At Healthy Home, we take your privacy seriously. This Privacy Policy describes how we collect,
          use, process, and disclose your information, including personal information, in conjunction with your
          access to and use of the Healthy Home.
        </Text>

        <Text style={styles.sectionTitle}>Information We Collect</Text>
        <Text style={styles.paragraph}>
          When you use our App, we collect the following types of information:
        </Text>
        
        <Text style={styles.listTitle}>1. Personal Information</Text>
        <Text style={styles.listItem}>• Account Information: When you sign up, we collect your name, email address, and password.</Text>
        <Text style={styles.listItem}>• Profile Information: Information you provide in your user profile, including family member details.</Text>
        <Text style={styles.listItem}>• Health Records: Medical records, prescriptions, diagnoses, and other health information you enter.</Text>
        
        <Text style={styles.listTitle}>2. Usage Information</Text>
        <Text style={styles.listItem}>• App Usage: How you interact with our app, features you use, and time spent.</Text>
        <Text style={styles.listItem}>• Device Information: Device type, operating system, and other technical details.</Text>
        
        <Text style={styles.sectionTitle}>How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          We use the information we collect for the following purposes:
        </Text>
        <Text style={styles.listItem}>• To provide and maintain our Service</Text>
        <Text style={styles.listItem}>• To notify you about changes to our Service</Text>
        <Text style={styles.listItem}>• To allow you to participate in interactive features when you choose to do so</Text>
        <Text style={styles.listItem}>• To provide customer support</Text>
        <Text style={styles.listItem}>• To gather analysis or valuable information so that we can improve our Service</Text>
        <Text style={styles.listItem}>• To monitor the usage of our Service</Text>
        <Text style={styles.listItem}>• To detect, prevent and address technical issues</Text>

        <Text style={styles.sectionTitle}>Data Storage and Security</Text>
        <Text style={styles.paragraph}>
          We take the security of your data seriously. All data is encrypted both in transit and at rest.
          We implement appropriate technical and organizational measures to protect your personal data
          against unauthorized or unlawful processing, accidental loss, destruction, or damage.
        </Text>

        <Text style={styles.sectionTitle}>Sharing Your Information</Text>
        <Text style={styles.paragraph}>
          We do not share your personal information with third parties except in the following cases:
        </Text>
        <Text style={styles.listItem}>• With your explicit consent</Text>
        <Text style={styles.listItem}>• To comply with legal obligations</Text>
        <Text style={styles.listItem}>• To protect our rights, privacy, safety or property</Text>
        <Text style={styles.listItem}>• In connection with a sale or transfer of business assets</Text>

        <Text style={styles.sectionTitle}>Your Rights</Text>
        <Text style={styles.paragraph}>
          Depending on your location, you may have certain rights regarding your personal information, including:
        </Text>
        <Text style={styles.listItem}>• Right to access your personal data</Text>
        <Text style={styles.listItem}>• Right to correct inaccurate data</Text>
        <Text style={styles.listItem}>• Right to delete your data</Text>
        <Text style={styles.listItem}>• Right to restrict processing</Text>
        <Text style={styles.listItem}>• Right to data portability</Text>
        
        <Text style={styles.sectionTitle}>Changes to This Privacy Policy</Text>
        <Text style={styles.paragraph}>
          We may update our Privacy Policy from time to time. We will notify you of any changes by posting
          the new Privacy Policy on this page and updating the "Last Updated" date at the top.
        </Text>
        <Text style={styles.paragraph}>
          You are advised to review this Privacy Policy periodically for any changes. Changes to this
          Privacy Policy are effective when they are posted on this page.
        </Text>

        <Text style={styles.sectionTitle}>Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions about this Privacy Policy, please contact us at:
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
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
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

export default PrivacyPolicyScreen;
