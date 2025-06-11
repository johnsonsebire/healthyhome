import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const MenuScreen = ({ navigation }) => {
  const shortcuts = [
    {
      id: 'medical-records',
      title: 'Medical Records',
      description: 'View and manage health records',
      icon: 'medical-services',
      color: '#4CAF50',
      onPress: () => navigation.navigate('Records')
    },
    {
      id: 'family-members',
      title: 'Family Members',
      description: 'Manage family member profiles',
      icon: 'people',
      color: '#2196F3',
      onPress: () => navigation.navigate('FamilyMember')
    },
    {
      id: 'family-tree',
      title: 'Family Tree',
      description: 'View family relationships',
      icon: 'account-tree',
      color: '#FF9800',
      onPress: () => navigation.navigate('FamilyTree')
    },
    {
      id: 'insurance',
      title: 'Insurance',
      description: 'Manage insurance policies',
      icon: 'security',
      color: '#9C27B0',
      onPress: () => navigation.navigate('Insurance')
    },
    {
      id: 'finance',
      title: 'Finance',
      description: 'Personal and family finances',
      icon: 'account-balance-wallet',
      color: '#607D8B',
      onPress: () => navigation.navigate('Finance')
    }
  ];

  const renderShortcut = (shortcut) => (
    <TouchableOpacity
      key={shortcut.id}
      style={styles.shortcutCard}
      onPress={shortcut.onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: shortcut.color }]}>
        <MaterialIcons name={shortcut.icon} size={32} color="#fff" />
      </View>
      <View style={styles.shortcutContent}>
        <Text style={styles.shortcutTitle}>{shortcut.title}</Text>
        <Text style={styles.shortcutDescription}>{shortcut.description}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Menu</Text>
          <Text style={styles.headerSubtitle}>Quick access to all app modules</Text>
        </View>

        {/* Shortcuts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shortcuts</Text>
          <View style={styles.shortcutsContainer}>
            {shortcuts.map(renderShortcut)}
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 32,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  shortcutsContainer: {
    gap: 12,
  },
  shortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  shortcutContent: {
    flex: 1,
  },
  shortcutTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  shortcutDescription: {
    fontSize: 14,
    color: '#666',
  },
});

export default MenuScreen;
