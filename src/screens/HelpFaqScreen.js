import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const HelpFaqScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState({});

  const faqItems = [
    {
      id: '1',
      category: 'Account',
      question: 'How do I create a family member profile?',
      answer: 'To create a family member profile, go to the Settings tab, tap on "Family Members", and then tap the "+" button in the top right corner. Fill in the required information and tap "Save" to add the family member.'
    },
    {
      id: '2',
      category: 'Account',
      question: 'How do I change my password?',
      answer: 'To change your password, go to the Settings tab, tap on "Profile", then tap "Security", and select "Change Password". You will need to enter your current password and then your new password twice to confirm the change.'
    },
    {
      id: '3',
      category: 'Records',
      question: 'How do I add a new medical record?',
      answer: 'To add a new medical record, go to the Records tab and tap the "+" button in the bottom right corner. Select the type of record you want to add, fill in the details, and tap "Save" to create the record.'
    },
    {
      id: '4',
      category: 'Records',
      question: 'Can I share medical records with my doctor?',
      answer: 'Yes, you can share medical records with your doctor. Open the record you want to share, tap the share icon (usually in the top right corner), and choose your preferred sharing method. You can share via email, messaging apps, or generate a PDF that you can print.'
    },
    {
      id: '5',
      category: 'Insurance',
      question: 'How do I add my insurance card?',
      answer: 'To add an insurance card, go to the Insurance tab and tap "Add Insurance Card". Fill in your insurance details, take a photo of the front and back of your card if desired, and tap "Save" to store your insurance information.'
    },
    {
      id: '6',
      category: 'Insurance',
      question: 'Where can I see my insurance policy details?',
      answer: 'You can view your insurance policy details by going to the Insurance tab and selecting the insurance card you want to view. Tap on "View Details" to see full information about your policy, including coverage details and contact information.'
    },
    {
      id: '7',
      category: 'Subscription',
      question: 'How do I upgrade my subscription?',
      answer: 'To upgrade your subscription, go to the Settings tab and tap on "Subscription". You will see the available plans and their features. Select the plan you want to upgrade to and follow the payment instructions to complete your purchase.'
    },
    {
      id: '8',
      category: 'Subscription',
      question: 'Can I cancel my subscription at any time?',
      answer: 'Yes, you can cancel your subscription at any time. Go to the Settings tab, tap on "Subscription", and select "Manage Subscription". From there, you can cancel your subscription. Note that you will continue to have access to premium features until the end of your current billing period.'
    },
    {
      id: '9',
      category: 'Technical',
      question: 'How do I enable offline mode?',
      answer: 'Offline mode is automatically enabled when you lose internet connection. The app will sync your data when you regain connectivity. To ensure you have the latest data available offline, make sure to open the app while connected to the internet regularly.'
    },
    {
      id: '10',
      category: 'Technical',
      question: 'How do I back up my data?',
      answer: 'Your data is automatically backed up to our secure cloud storage when you are connected to the internet. If you want to create a manual backup, go to Settings, tap on "Data & Storage", and select "Backup Now". You can also export your data in various formats for personal backup.'
    }
  ];

  const toggleExpandItem = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredFaqItems = searchQuery
    ? faqItems.filter(item => 
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : faqItems;

  const groupedByCategory = filteredFaqItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Help & FAQ</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for help topics..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.content}>
        {Object.keys(groupedByCategory).length === 0 ? (
          <View style={styles.noResults}>
            <Ionicons name="search-outline" size={64} color="#d1d5db" />
            <Text style={styles.noResultsText}>No matching results found</Text>
            <Text style={styles.noResultsSubtext}>Try different keywords or browse the categories below</Text>
          </View>
        ) : (
          Object.entries(groupedByCategory).map(([category, items]) => (
            <View key={category} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category}</Text>
              {items.map(item => (
                <TouchableOpacity 
                  key={item.id} 
                  style={styles.faqItem}
                  onPress={() => toggleExpandItem(item.id)}
                >
                  <View style={styles.faqQuestion}>
                    <Text style={styles.questionText}>{item.question}</Text>
                    <Ionicons 
                      name={expandedItems[item.id] ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#6b7280" 
                    />
                  </View>
                  {expandedItems[item.id] && (
                    <Text style={styles.answerText}>{item.answer}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Still need help?</Text>
          <Text style={styles.contactText}>
            If you couldn't find the answer you're looking for, feel free to contact our support team.
          </Text>
          <TouchableOpacity style={styles.contactButton}>
            <Ionicons name="mail-outline" size={20} color="#ffffff" />
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
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
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  content: {
    padding: 16,
    paddingTop: 24,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  faqItem: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  answerText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4b5563',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  noResults: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4b5563',
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
  contactSection: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 20,
    marginTop: 24,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 16,
  },
  contactButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  contactButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginLeft: 8,
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

export default HelpFaqScreen;
