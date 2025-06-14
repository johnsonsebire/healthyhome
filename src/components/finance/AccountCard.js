import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card as PaperCard } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import currencyService from '../../services/currencyService';

const AccountCard = ({ account, onPress }) => {
  // Ensure account is not undefined before using it
  if (!account) {
    console.warn('AccountCard received undefined account prop');
    return null; // Don't render anything if account is undefined
  }
  
  // Define a color based on account type or use the one provided
  const getAccountColor = () => {
    try {
      if (account.color) return account.color;
      
      switch (account.type) {
        case 'savings':
          return '#4CAF50';
        case 'checking':
          return '#2196F3';
        case 'credit':
          return '#F44336';
        case 'investment':
          return '#9C27B0';
        default:
          return '#607D8B';
      }
    } catch (error) {
      console.warn('Error getting account color:', error);
      return '#607D8B'; // Default color as fallback
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    try {
      return currencyService.formatCurrency(amount, account.currency || 'GHS');
    } catch (error) {
      console.warn('Error formatting currency:', error);
      return '0.00'; // Default value as fallback
    }
  };

  // Get icon based on account type
  const getAccountIcon = () => {
    try {
      if (account.icon) return account.icon;
      
      switch (account.type) {
        case 'savings':
          return 'savings';
        case 'checking':
          return 'account-balance';
        case 'credit':
          return 'credit-card';
        case 'investment':
          return 'trending-up';
        default:
          return 'wallet';
      }
    } catch (error) {
      console.warn('Error getting account icon:', error);
      return 'wallet'; // Default icon as fallback
    }
  };

  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <PaperCard style={[styles.card, { borderLeftColor: getAccountColor() }]}>
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <MaterialIcons name={getAccountIcon()} size={32} color={getAccountColor()} />
          </View>
          <View style={styles.accountInfo}>
            <Text style={styles.accountName}>{account.name || 'Unnamed Account'}</Text>
            <Text style={styles.accountType}>{account.type || 'Unknown Type'}</Text>
          </View>
          <View style={styles.balanceContainer}>
            <Text style={[styles.accountBalance, { color: getAccountColor() }]}>
              {formatCurrency(account.balance || 0)}
            </Text>
          </View>
        </View>
      </PaperCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
  card: {
    borderLeftWidth: 4,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 16,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
  },
  accountType: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  balanceContainer: {
    alignItems: 'flex-end',
  },
  accountBalance: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AccountCard;
