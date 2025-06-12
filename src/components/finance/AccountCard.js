import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card as PaperCard } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import currencyService from '../../services/currencyService';

const AccountCard = ({ account, onPress }) => {
  // Define a color based on account type or use the one provided
  const getAccountColor = () => {
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
  };

  // Format currency
  const formatCurrency = (amount) => {
    return currencyService.formatCurrency(amount, account.currency || 'GHS');
  };

  // Get icon based on account type
  const getAccountIcon = () => {
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
        return 'account-balance-wallet';
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
            <Text style={styles.accountName}>{account.name}</Text>
            <Text style={styles.accountType}>{account.type}</Text>
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
