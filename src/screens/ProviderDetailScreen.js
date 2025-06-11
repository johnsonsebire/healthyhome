import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ProviderDetailScreen = ({ route, navigation }) => {
  const { provider } = route.params;

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={16} color="#f59e0b" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={16} color="#f59e0b" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={16} color="#d1d5db" />
      );
    }

    return stars;
  };

  const handleContactPress = (type, value) => {
    switch (type) {
      case 'phone':
        Linking.openURL(`tel:${value}`).catch(err => {
          Alert.alert('Error', 'Could not open phone dialer');
        });
        break;
      case 'email':
        Linking.openURL(`mailto:${value}`).catch(err => {
          Alert.alert('Error', 'Could not open email client');
        });
        break;
      case 'website':
        Linking.openURL(`https://${value}`).catch(err => {
          Alert.alert('Error', 'Could not open web browser');
        });
        break;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <View style={styles.providerIconContainer}>
            <Ionicons name="shield-checkmark" size={36} color="#ffffff" />
          </View>
          
          <Text style={styles.providerName}>{provider.name}</Text>
          
          <View style={styles.providerMetaRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{provider.type}</Text>
            </View>
            
            {provider.isApproved && (
              <View style={styles.approvedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                <Text style={styles.approvedText}>Approved Provider</Text>
              </View>
            )}
          </View>
          
          <View style={styles.ratingContainer}>
            <View style={styles.stars}>
              {renderStars(provider.rating)}
            </View>
            <Text style={styles.ratingText}>{provider.rating} / 5.0</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coverage Overview</Text>
          <Text style={styles.coverageText}>{provider.coverage}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advantages</Text>
          {provider.pros.map((pro, index) => (
            <View key={index} style={styles.bulletItem}>
              <Ionicons name="checkmark-circle" size={18} color="#10b981" style={styles.bulletIcon} />
              <Text style={styles.bulletText}>{pro}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Limitations</Text>
          {provider.cons.map((con, index) => (
            <View key={index} style={styles.bulletItem}>
              <Ionicons name="alert-circle" size={18} color="#ef4444" style={styles.bulletIcon} />
              <Text style={styles.bulletText}>{con}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => handleContactPress('phone', provider.contactInfo.phone)}
          >
            <View style={styles.contactIconContainer}>
              <Ionicons name="call" size={18} color="#8b5cf6" />
            </View>
            <Text style={styles.contactText}>{provider.contactInfo.phone}</Text>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => handleContactPress('email', provider.contactInfo.email)}
          >
            <View style={styles.contactIconContainer}>
              <Ionicons name="mail" size={18} color="#8b5cf6" />
            </View>
            <Text style={styles.contactText}>{provider.contactInfo.email}</Text>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => handleContactPress('website', provider.contactInfo.website)}
          >
            <View style={styles.contactIconContainer}>
              <Ionicons name="globe" size={18} color="#8b5cf6" />
            </View>
            <Text style={styles.contactText}>{provider.contactInfo.website}</Text>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('AddRecord', { 
              type: 'insurance',
              preselectedProvider: provider.id
            })}
          >
            <Ionicons name="add-circle" size={18} color="#ffffff" />
            <Text style={styles.actionButtonText}>Add Insurance Card</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#6366f1" />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#8b5cf6',
    padding: 24,
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  providerIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  providerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  providerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  typeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginRight: 10,
  },
  typeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  approvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  approvedText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    padding: 16,
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  coverageText: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bulletIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  bulletText: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
    flex: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  contactIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactText: {
    fontSize: 16,
    color: '#4b5563',
    flex: 1,
  },
  actionSection: {
    padding: 16,
    marginTop: 24,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '80%',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  backButtonText: {
    marginLeft: 4,
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '500',
  },
});

export default ProviderDetailScreen;
