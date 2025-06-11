import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Dimensions,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const itemWidth = (width - 48) / 2; // 2 columns with padding

const MenuScreen = ({ navigation }) => {
  const shortcuts = [
    {
      id: 'medical-records',
      title: 'Medical Records',
      description: 'Health records',
      icon: 'medical-services',
      color: '#4CAF50',
      onPress: () => navigation.navigate('Records')
    },
    {
      id: 'family-members',
      title: 'Family Members',
      description: 'Member profiles',
      icon: 'people',
      color: '#2196F3',
      onPress: () => navigation.navigate('FamilyMember')
    },
    {
      id: 'family-tree',
      title: 'Family Tree',
      description: 'Relationships',
      icon: 'account-tree',
      color: '#FF9800',
      onPress: () => navigation.navigate('FamilyTree')
    },
    {
      id: 'insurance',
      title: 'Insurance',
      description: 'Policies',
      icon: 'security',
      color: '#9C27B0',
      onPress: () => navigation.navigate('Insurance')
    },
    {
      id: 'finance',
      title: 'Finance',
      description: 'Money management',
      icon: 'account-balance-wallet',
      color: '#607D8B',
      onPress: () => navigation.navigate('Finance')
    },
    {
      id: 'schedule',
      title: 'Schedule',
      description: 'Appointments',
      icon: 'schedule',
      color: '#3F51B5',
      onPress: () => navigation.navigate('Schedule')
    },
    {
      id: 'pharmacies',
      title: 'Pharmacies',
      description: 'Coming Soon',
      icon: 'local-pharmacy',
      color: '#E91E63',
      isComingSoon: true,
      onPress: () => Alert.alert('Coming Soon', 'This feature will be available in a future update.')
    },
    {
      id: 'hospitals',
      title: 'Hospitals',
      description: 'Coming Soon',
      icon: 'local-hospital',
      color: '#F44336',
      isComingSoon: true,
      onPress: () => Alert.alert('Coming Soon', 'This feature will be available in a future update.')
    },
    {
      id: 'reminders',
      title: 'Reminders',
      description: 'Coming Soon',
      icon: 'notifications',
      color: '#FF5722',
      isComingSoon: true,
      onPress: () => Alert.alert('Coming Soon', 'This feature will be available in a future update.')
    }
  ];

  const helpSupportItems = [
    {
      id: 'help-faq',
      title: 'Help & FAQ',
      icon: 'help',
      color: '#607D8B',
      onPress: () => navigation.navigate('HelpFaq')
    },
    {
      id: 'contact-support',
      title: 'Contact Support',
      icon: 'support',
      color: '#2196F3',
      onPress: () => Alert.alert('Contact Support', 'Email us at support@familymedicalapp.com')
    },
    {
      id: 'rate-app',
      title: 'Rate App',
      icon: 'star',
      color: '#FF9800',
      onPress: () => Alert.alert('Rate App', 'Thank you! Please rate us on the app store.')
    },
    {
      id: 'terms',
      title: 'Terms of Service',
      icon: 'description',
      color: '#9C27B0',
      onPress: () => navigation.navigate('TermsOfService')
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      icon: 'privacy-tip',
      color: '#4CAF50',
      onPress: () => navigation.navigate('PrivacyPolicy')
    }
  ];

  const renderShortcut = (shortcut) => (
    <TouchableOpacity
      key={shortcut.id}
      style={[styles.gridItem, shortcut.isComingSoon && styles.comingSoonItem]}
      onPress={shortcut.onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: shortcut.color }]}>
        <MaterialIcons name={shortcut.icon} size={28} color="#fff" />
        {shortcut.isComingSoon && (
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Soon</Text>
          </View>
        )}
      </View>
      <Text style={styles.gridItemTitle} numberOfLines={2}>{shortcut.title}</Text>
      <Text style={styles.gridItemDescription} numberOfLines={1}>{shortcut.description}</Text>
    </TouchableOpacity>
  );

  const renderHelpSupportItem = (item, index, array) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.helpSupportItem,
        index === array.length - 1 && styles.lastHelpSupportItem
      ]}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.helpIcon, { backgroundColor: item.color }]}>
        <MaterialIcons name={item.icon} size={20} color="#fff" />
      </View>
      <Text style={styles.helpSupportTitle}>{item.title}</Text>
      <MaterialIcons name="chevron-right" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Menu</Text>
          <Text style={styles.headerSubtitle}>Quick access to all features</Text>
        </View>

        {/* Shortcuts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shortcuts</Text>
          <View style={styles.gridContainer}>
            {shortcuts.map(renderShortcut)}
          </View>
        </View>

        {/* Help & Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help & Support</Text>
          <View style={styles.helpSupportContainer}>
            {helpSupportItems.map((item, index, array) => renderHelpSupportItem(item, index, array))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 32,
    paddingTop: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
    marginLeft: 4,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  gridItem: {
    width: itemWidth,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 16,
  },
  comingSoonItem: {
    opacity: 0.8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  comingSoonBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF5722',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  comingSoonText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  gridItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 4,
    minHeight: 32,
  },
  gridItemDescription: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  helpSupportContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  helpSupportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  helpIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  helpSupportTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  lastHelpSupportItem: {
    borderBottomWidth: 0,
  },
});

export default MenuScreen;
