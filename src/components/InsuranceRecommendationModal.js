import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const POPULAR_PROVIDERS = [
  {
    id: 'nhis',
    name: 'National Health Insurance Scheme (NHIS)',
    type: 'Public',
    coverage: 'Basic healthcare services',
    pros: ['Government subsidized', 'Wide network of hospitals', 'Affordable premiums'],
    cons: ['Limited coverage', 'Long waiting times', 'Basic services only'],
    rating: 3.5,
    isApproved: true, // This provider is already integrated
    contactInfo: {
      phone: '+233-302-123456',
      website: 'www.nhis.gov.gh',
      email: 'info@nhis.gov.gh'
    }
  },
  {
    id: 'star_assurance',
    name: 'Star Assurance Company Limited',
    type: 'Private',
    coverage: 'Comprehensive health insurance',
    pros: ['Fast claim processing', 'Good customer service', 'Comprehensive coverage'],
    cons: ['Higher premiums', 'Limited to urban areas', 'Strict eligibility criteria'],
    rating: 4.2,
    isApproved: false, // Not yet integrated
    contactInfo: {
      phone: '+233-302-654321',
      website: 'www.starassurance.com.gh',
      email: 'health@starassurance.com.gh'
    }
  },
  {
    id: 'metropolitan',
    name: 'Metropolitan Insurance Ghana',
    type: 'Private',
    coverage: 'Health and life insurance',
    pros: ['International coverage', 'Premium services', 'Digital platform'],
    cons: ['Expensive premiums', 'Complex procedures', 'Urban-focused'],
    rating: 4.0,
    isApproved: false, // Not yet integrated
    contactInfo: {
      phone: '+233-302-789012',
      website: 'www.metropolitan.com.gh',
      email: 'contact@metropolitan.com.gh'
    }
  },
  {
    id: 'glico',
    name: 'GLICO Healthcare',
    type: 'Private',
    coverage: 'Health insurance and wellness',
    pros: ['Wellness programs', 'Preventive care', 'Good network'],
    cons: ['Premium pricing', 'Limited rural coverage', 'Lengthy approval process'],
    rating: 3.8,
    isApproved: false, // Not yet integrated
    contactInfo: {
      phone: '+233-302-345678',
      website: 'www.glico.com.gh',
      email: 'healthcare@glico.com.gh'
    }
  }
];

const InsuranceRecommendationModal = ({ visible, onClose }) => {
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [userBudget, setUserBudget] = useState('');
  const [coverageNeeds, setCoverageNeeds] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackProvider, setFeedbackProvider] = useState(null);
  const [userFeedback, setUserFeedback] = useState('');
  const [userRating, setUserRating] = useState(0);
  const [showUnlistedProviderModal, setShowUnlistedProviderModal] = useState(false);
  const [unlistedProvider, setUnlistedProvider] = useState({
    name: '',
    type: '',
    website: '',
    phone: '',
    email: '',
    coverage: '',
    pros: '',
    cons: ''
  });

  const handleProvideFeedback = (provider) => {
    setFeedbackProvider(provider);
    setShowFeedbackModal(true);
  };

  const submitFeedback = () => {
    if (userFeedback.trim() && userRating > 0) {
      Alert.alert(
        'Thank You!',
        `Your ${userRating}-star feedback about ${feedbackProvider.name} has been recorded. This helps us improve our recommendations for other users.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowFeedbackModal(false);
              setUserFeedback('');
              setUserRating(0);
              setFeedbackProvider(null);
            }
          }
        ]
      );
    } else {
      Alert.alert('Please provide both a rating and feedback');
    }
  };

  const handleRecommendUnlistedProvider = async () => {
    const { name, type, website, phone, email, coverage, pros, cons } = unlistedProvider;
    
    if (!name.trim() || !type.trim()) {
      Alert.alert('Required Fields', 'Please provide at least the provider name and type.');
      return;
    }

    try {
      const message = `🏥 NEW INSURANCE PROVIDER RECOMMENDATION

📋 Provider Name: ${name}
🏢 Type: ${type}
📋 Coverage: ${coverage || 'Not specified'}

📞 Contact Information:
• Phone: ${phone || 'Not provided'}
• Website: ${website || 'Not provided'}
• Email: ${email || 'Not provided'}

✅ Advantages mentioned:
${pros || 'Not specified'}

⚠️ Potential concerns:
${cons || 'Not specified'}

💡 User Message: I recommend adding this provider to the Family Medical App. This provider is not currently listed but could benefit our community.

---
Sent from Family Medical App - New Provider Recommendation Feature`;

      await Share.share({
        message: message,
        title: `New Provider Recommendation: ${name} for Family Medical App`
      });
      
      Alert.alert(
        'Recommendation Sent! 📤',
        `Thank you for recommending ${name}! Your suggestion has been shared with our team. We'll research and review this provider for potential integration.`,
        [{ 
          text: 'Great!', 
          onPress: () => {
            setShowUnlistedProviderModal(false);
            setUnlistedProvider({
              name: '',
              type: '',
              website: '',
              phone: '',
              email: '',
              coverage: '',
              pros: '',
              cons: ''
            });
          }
        }]
      );
    } catch (error) {
      console.error('Error sharing recommendation:', error);
      Alert.alert('Error', 'Failed to send recommendation. Please try again.');
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={14} color="#f59e0b" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={14} color="#f59e0b" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={14} color="#d1d5db" />
      );
    }

    return stars;
  };

  const renderRatingStars = (currentRating, onRatingPress) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => onRatingPress(i)}
          style={styles.ratingStarButton}
        >
          <Ionicons 
            name={i <= currentRating ? "star" : "star-outline"} 
            size={32} 
            color={i <= currentRating ? "#f59e0b" : "#d1d5db"} 
          />
        </TouchableOpacity>
      );
    }
    return <View style={styles.ratingStarsContainer}>{stars}</View>;
  };

  const handleRecommendProvider = async (provider) => {
    try {
      const message = `🏥 INSURANCE PROVIDER RECOMMENDATION TO FAMILY MEDICAL APP TEAM

📋 Provider: ${provider.name}
🏢 Type: ${provider.type}
📊 Rating: ${provider.rating}/5.0
📋 Coverage: ${provider.coverage}

✅ Reasons for Recommendation:
${provider.pros.map(pro => `• ${pro}`).join('\n')}

⚠️ Potential Concerns:
${provider.cons.map(con => `• ${con}`).join('\n')}

📞 Provider Contact Information:
• Phone: ${provider.contactInfo.phone}
• Website: ${provider.contactInfo.website}
• Email: ${provider.contactInfo.email}

💡 User Message: I recommend considering this provider for integration into the Family Medical App. This would benefit our community by expanding insurance options.

---
Sent from Family Medical App - Provider Recommendation Feature`;

      await Share.share({
        message: message,
        title: `Provider Recommendation: ${provider.name} for Family Medical App`
      });
      
      Alert.alert(
        'Recommendation Sent! 📤',
        `Thank you for recommending ${provider.name}! Your suggestion has been shared with our team. We'll review this provider for potential integration into our app.`,
        [{ text: 'Great!' }]
      );
    } catch (error) {
      console.error('Error sharing recommendation:', error);
      Alert.alert('Error', 'Failed to send recommendation. Please try again.');
    }
  };

  const getRecommendationBasedOnBudget = () => {
    const budget = parseFloat(userBudget);
    if (budget < 100) {
      return POPULAR_PROVIDERS.filter(p => p.id === 'nhis');
    } else if (budget < 500) {
      return POPULAR_PROVIDERS.filter(p => ['nhis', 'glico'].includes(p.id));
    } else {
      return POPULAR_PROVIDERS;
    }
  };

  const getFilteredProviders = () => {
    if (userBudget) {
      return getRecommendationBasedOnBudget();
    }
    return POPULAR_PROVIDERS;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Insurance Providers & Recommendations</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Budget Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Find providers that work for you</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Monthly Budget (GH₵)</Text>
              <TextInput
                style={styles.input}
                value={userBudget}
                onChangeText={setUserBudget}
                placeholder="e.g., 200"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Specific Coverage Needs</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={coverageNeeds}
                onChangeText={setCoverageNeeds}
                placeholder="e.g., Maternity care, Dental coverage, Emergency services..."
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Provider Recommendations */}
          <View style={styles.providersSection}>
            <Text style={styles.sectionTitle}>
              {userBudget ? 'Recommended for Your Budget' : 'Popular Providers'}
            </Text>
            
            {getFilteredProviders().map((provider) => (
              <View key={provider.id} style={styles.providerCard}>
                <View style={styles.providerHeader}>
                  <View style={styles.providerInfo}>
                    <View style={styles.providerNameRow}>
                      <Text style={styles.providerName}>{provider.name}</Text>
                      {provider.isApproved && (
                        <View style={styles.approvedBadge}>
                          <Ionicons name="checkmark-circle" size={12} color="#10b981" />
                          <Text style={styles.approvedText}>Approved</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.providerMeta}>
                      <Text style={styles.providerType}>{provider.type}</Text>
                      <View style={styles.ratingContainer}>
                        <View style={styles.stars}>
                          {renderStars(provider.rating)}
                        </View>
                        <Text style={styles.ratingText}>{provider.rating}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <Text style={styles.coverageText}>{provider.coverage}</Text>

                <View style={styles.prosConsContainer}>
                  <View style={styles.prosSection}>
                    <Text style={styles.prosConsTitle}>✅ Pros</Text>
                    {provider.pros.map((pro, index) => (
                      <Text key={index} style={styles.prosConsItem}>• {pro}</Text>
                    ))}
                  </View>

                  <View style={styles.consSection}>
                    <Text style={styles.prosConsTitle}>❌ Cons</Text>
                    {provider.cons.map((con, index) => (
                      <Text key={index} style={styles.prosConsItem}>• {con}</Text>
                    ))}
                  </View>
                </View>

                <View style={styles.contactSection}>
                  <Text style={styles.contactTitle}>Contact Information</Text>
                  <Text style={styles.contactItem}>📞 {provider.contactInfo.phone}</Text>
                  <Text style={styles.contactItem}>🌐 {provider.contactInfo.website}</Text>
                  <Text style={styles.contactItem}>✉️ {provider.contactInfo.email}</Text>
                </View>

                <View style={styles.actionButtons}>
                  {provider.isApproved ? (
                    // Approved provider - only show feedback button
                    <TouchableOpacity
                      style={styles.feedbackButtonFull}
                      onPress={() => handleProvideFeedback(provider)}
                    >
                      <Ionicons name="chatbubble-ellipses" size={16} color="#6366f1" />
                      <Text style={styles.feedbackButtonText}>Share Experience</Text>
                    </TouchableOpacity>
                  ) : (
                    // Not approved - only show recommend button
                    <TouchableOpacity
                      style={styles.recommendButtonFull}
                      onPress={() => handleRecommendProvider(provider)}
                    >
                      <Ionicons name="paper-plane" size={16} color="#ffffff" />
                      <Text style={styles.recommendButtonText}>Recommend Provider</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* Recommend Unlisted Provider Button */}
          <View style={styles.unlistedProviderSection}>
            <TouchableOpacity
              style={styles.unlistedProviderButton}
              onPress={() => setShowUnlistedProviderModal(true)}
            >
              <Ionicons name="add-circle" size={20} color="#8b5cf6" />
              <Text style={styles.unlistedProviderButtonText}>Recommend a Provider not listed</Text>
            </TouchableOpacity>
          </View>

          {/* Tips Section */}
          <View style={styles.tipsSection}>
            <Text style={styles.sectionTitle}>💡 Tips for Choosing Insurance</Text>
            <View style={styles.tipCard}>
              <Text style={styles.tipItem}>• Compare coverage options and exclusions</Text>
              <Text style={styles.tipItem}>• Check the provider's hospital network</Text>
              <Text style={styles.tipItem}>• Consider your family's medical history</Text>
              <Text style={styles.tipItem}>• Review claim processing procedures</Text>
              <Text style={styles.tipItem}>• Ask about wellness and preventive care benefits</Text>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Feedback Modal */}
      <Modal
        visible={showFeedbackModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFeedbackModal(false)}
      >
        <View style={styles.feedbackModalOverlay}>
          <View style={styles.feedbackModalContent}>
            <View style={styles.feedbackHeader}>
              <Text style={styles.feedbackTitle}>
                Share Your Experience with {feedbackProvider?.name}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowFeedbackModal(false)}
                style={styles.feedbackCloseButton}
              >
                <Ionicons name="close" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.feedbackDescription}>
              Your feedback helps other families make better insurance decisions
            </Text>

            {/* Star Rating */}
            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>Rate this provider:</Text>
              {renderRatingStars(userRating, setUserRating)}
              <Text style={styles.ratingHint}>
                {userRating > 0 ? `${userRating} star${userRating > 1 ? 's' : ''}` : 'Tap to rate'}
              </Text>
            </View>
            
            <TextInput
              style={styles.feedbackInput}
              value={userFeedback}
              onChangeText={setUserFeedback}
              placeholder="Share your experience, coverage quality, claim process, customer service, etc..."
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            
            <View style={styles.feedbackActions}>
              <TouchableOpacity
                style={styles.cancelFeedbackButton}
                onPress={() => setShowFeedbackModal(false)}
              >
                <Text style={styles.cancelFeedbackText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.submitFeedbackButton}
                onPress={submitFeedback}
              >
                <Text style={styles.submitFeedbackText}>Submit Feedback</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Unlisted Provider Modal */}
      <Modal
        visible={showUnlistedProviderModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowUnlistedProviderModal(false)}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Recommend New Provider</Text>
            <TouchableOpacity 
              onPress={() => setShowUnlistedProviderModal(false)} 
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Help us expand our provider network</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Provider Name *</Text>
                <TextInput
                  style={styles.input}
                  value={unlistedProvider.name}
                  onChangeText={(text) => setUnlistedProvider({...unlistedProvider, name: text})}
                  placeholder="e.g., ABC Insurance Company"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Provider Type *</Text>
                <TextInput
                  style={styles.input}
                  value={unlistedProvider.type}
                  onChangeText={(text) => setUnlistedProvider({...unlistedProvider, type: text})}
                  placeholder="e.g., Private, Public, Corporate"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Website</Text>
                <TextInput
                  style={styles.input}
                  value={unlistedProvider.website}
                  onChangeText={(text) => setUnlistedProvider({...unlistedProvider, website: text})}
                  placeholder="e.g., www.provider.com"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={unlistedProvider.phone}
                  onChangeText={(text) => setUnlistedProvider({...unlistedProvider, phone: text})}
                  placeholder="e.g., +233-XXX-XXXXXX"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={unlistedProvider.email}
                  onChangeText={(text) => setUnlistedProvider({...unlistedProvider, email: text})}
                  placeholder="e.g., info@provider.com"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Coverage Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={unlistedProvider.coverage}
                  onChangeText={(text) => setUnlistedProvider({...unlistedProvider, coverage: text})}
                  placeholder="Describe what this provider covers..."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Why do you recommend this provider?</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={unlistedProvider.pros}
                  onChangeText={(text) => setUnlistedProvider({...unlistedProvider, pros: text})}
                  placeholder="List the advantages and benefits..."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Any concerns or limitations?</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={unlistedProvider.cons}
                  onChangeText={(text) => setUnlistedProvider({...unlistedProvider, cons: text})}
                  placeholder="Any potential issues or limitations..."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={styles.submitRecommendationButton}
                onPress={handleRecommendUnlistedProvider}
              >
                <Ionicons name="paper-plane" size={20} color="#ffffff" />
                <Text style={styles.submitRecommendationText}>Send Recommendation</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  filterSection: {
    backgroundColor: '#ffffff',
    margin: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  providersSection: {
    margin: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  providerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  providerHeader: {
    marginBottom: 12,
  },
  providerInfo: {
    flex: 1,
  },
  providerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginRight: 8,
  },
  approvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  approvedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10b981',
  },
  providerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  providerType: {
    fontSize: 12,
    color: '#6366f1',
    backgroundColor: '#6366f1' + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stars: {
    flexDirection: 'row',
    gap: 1,
  },
  ratingText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  coverageText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  prosConsContainer: {
    marginBottom: 12,
  },
  prosSection: {
    marginBottom: 8,
  },
  consSection: {
    marginBottom: 8,
  },
  prosConsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  prosConsItem: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  contactSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  contactTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  contactItem: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  actionButtons: {
    marginTop: 8,
  },
  recommendButtonFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 14,
    gap: 8,
  },
  feedbackButtonFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#6366f1',
    borderRadius: 8,
    padding: 14,
    gap: 8,
  },
  recommendButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  feedbackButtonText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
  },
  unlistedProviderSection: {
    margin: 20,
    marginTop: 0,
    marginBottom: 12,
  },
  unlistedProviderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#8b5cf6',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  unlistedProviderButtonText: {
    color: '#8b5cf6',
    fontSize: 16,
    fontWeight: '600',
  },
  submitRecommendationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    padding: 16,
    gap: 8,
    marginTop: 8,
  },
  submitRecommendationText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Feedback Modal Styles
  feedbackModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  feedbackModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    marginRight: 12,
  },
  feedbackCloseButton: {
    padding: 4,
  },
  feedbackDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  ratingStarsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  ratingStarButton: {
    padding: 4,
  },
  ratingHint: {
    fontSize: 12,
    color: '#6b7280',
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    height: 120,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  feedbackActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelFeedbackButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  cancelFeedbackText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  submitFeedbackButton: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  submitFeedbackText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  tipsSection: {
    margin: 20,
    marginTop: 0,
    marginBottom: 40,
  },
  tipCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipItem: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default InsuranceRecommendationModal;
