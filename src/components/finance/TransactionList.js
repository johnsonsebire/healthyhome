import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Divider } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import currencyService from '../../services/currencyService';

const TransactionList = ({ 
  transactions, 
  onTransactionPress, 
  onTransactionLongPress,
  formatCurrency,
  displayCurrency = 'GHS',
  userCurrencySettings,
  refreshControl,
  ListHeaderComponent
}) => {
  // Default currency formatting if not provided
  const defaultFormatCurrency = (amount, currency = 'GHS') => {
    return currencyService.formatCurrency(amount, currency);
  };
  
  const currencyFormatter = formatCurrency || defaultFormatCurrency;
  // Get transaction icon based on category
  const getTransactionIcon = (transaction) => {
    if (!transaction) return 'receipt';
    
    const category = transaction.category || '';
    const type = transaction.type || 'expense';
    
    const iconMap = {
      // Income categories
      'salary': 'account-balance-wallet',
      'investment': 'trending-up',
      'gift': 'card-giftcard',
      'other_income': 'attach-money',
      
      // Expense categories
      'food': 'restaurant',
      'shopping': 'shopping-cart',
      'transportation': 'directions-car',
      'housing': 'home',
      'utilities': 'power',
      'healthcare': 'healing',
      'education': 'school',
      'entertainment': 'movie',
      'debt': 'credit-card',
      'savings': 'savings',
      'other_expense': 'receipt'
    };
    
    return iconMap[category] || (type === 'income' ? 'add-circle' : 'remove-circle');
  };
  
  // Get color based on transaction type
  const getTransactionColor = (transaction) => {
    if (!transaction) return '#F44336';
    return (transaction.type || '').toLowerCase() === 'income' ? '#4CAF50' : '#F44336';
  };
  
  // Format transaction date
  const formatTransactionDate = (date) => {
    if (!date) return '';
    
    try {
      const transactionDate = date.toDate ? date.toDate() : new Date(date);
      return transactionDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'Invalid date';
    }
  };
  
  // Render a transaction item
  const renderTransactionItem = ({ item }) => {
    if (!item) {
      console.warn('Received null or undefined transaction item');
      return null;
    }
    
    try {
      // Log transaction data for debugging
      console.log(`Rendering transaction: ${item.id}, Type: ${item.type}, Amount: ${item.amount}, Date: ${item.date}`);
      
      // Safely handle null or undefined values
      const transactionType = item.type || 'expense';
      const transactionCategory = item.category || 'other_expense';
      
      // Ensure amount is a valid number with enhanced error handling
      let transactionAmount = 0;
      try {
        if (typeof item.amount === 'number') {
          transactionAmount = item.amount;
        } else if (typeof item.amount === 'string') {
          transactionAmount = parseFloat(item.amount);
        } else if (item.amount) {
          transactionAmount = parseFloat(item.amount);
        }
        
        if (isNaN(transactionAmount)) {
          console.warn(`Invalid transaction amount for ${item.id}: ${item.amount}, using 0 instead`);
          transactionAmount = 0;
        }
        
        // Round to 2 decimal places to avoid floating point issues
        transactionAmount = Math.round(transactionAmount * 100) / 100;
      } catch (error) {
        console.error(`Error parsing transaction amount for ${item.id}:`, error);
        transactionAmount = 0;
      }
      
      // Default to displayCurrency if not specified in the transaction
      const transactionCurrency = item.currency || displayCurrency;
      
      // Calculate display amount considering currency conversion
      let displayAmount = transactionAmount;
      if (userCurrencySettings?.autoConvert && transactionCurrency !== displayCurrency) {
        try {
          displayAmount = currencyService.convertTransactionAmount(item, displayCurrency, userCurrencySettings);
          console.log(`Converted amount from ${transactionAmount} ${transactionCurrency} to ${displayAmount} ${displayCurrency}`);
        } catch (error) {
          console.error(`Error converting currency for transaction ${item.id}:`, error);
          displayAmount = transactionAmount; // Fallback to original amount on conversion error
        }
      }
      
      const displayCurrencyCode = userCurrencySettings?.autoConvert && transactionCurrency !== displayCurrency
        ? displayCurrency
        : transactionCurrency;
      
      // Ensure description is not empty
      const description = item.description || 
        (transactionCategory !== 'other_expense' && transactionCategory !== 'other_income' 
          ? transactionCategory.replace('_', ' ') 
          : (transactionType === 'income' ? 'Income' : 'Expense'));

      return (
        <TouchableOpacity
          style={styles.transactionItem}
          onPress={() => onTransactionPress && onTransactionPress(item)}
          onLongPress={() => onTransactionLongPress && onTransactionLongPress(item)}
        >
          <View style={styles.iconContainer}>
            <MaterialIcons 
              name={getTransactionIcon(item)} 
              size={24} 
              color={getTransactionColor(item)} 
            />
          </View>
          <View style={styles.transactionDetails}>
            <Text style={styles.transactionDescription}>
              {description}
            </Text>
            <Text style={styles.transactionDate}>
              {formatTransactionDate(item.date)}
            </Text>
          </View>
          <View style={styles.amountContainer}>
            <Text 
              style={[
                styles.transactionAmount, 
                { color: getTransactionColor(item) }
              ]}
            >
              {transactionType === 'income' ? '+' : '-'} {currencyFormatter(Math.abs(displayAmount), displayCurrencyCode)}
            </Text>
          </View>
        </TouchableOpacity>
      );
    } catch (error) {
      console.error('Error rendering transaction item:', error, item);
      return null;
    }
  };
  
  // Render separator between items
  const renderSeparator = () => <Divider style={styles.divider} />;
  
  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="receipt-long" size={64} color="#ccc" />
      <Text style={styles.emptyStateText}>No transactions yet</Text>
    </View>
  );
  
  return (
    <FlatList
      data={transactions}
      renderItem={renderTransactionItem}
      keyExtractor={(item, index) => {
        if (!item) return `empty-${index}-${Math.random().toString()}`;
        // Use a consistent key to prevent duplicates in the UI
        if (item.id) return `transaction-${item.id}`;
        if (item.transactionId) return `transaction-${item.transactionId}`;
        // Include the index as part of the key to ensure uniqueness
        return `transaction-${index}-${item.date?.toString() || ''}-${item.amount || ''}-${item.description || ''}`;
      }}
      ItemSeparatorComponent={renderSeparator}
      ListEmptyComponent={renderEmptyState}
      contentContainerStyle={[
        styles.listContent,
        transactions.length === 0 && styles.emptyContainer
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      ListHeaderComponent={ListHeaderComponent}
      scrollEnabled={false} // Disable scrolling to prevent nesting issues
      nestedScrollEnabled={false}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 16,
  },
  emptyContainer: {
    flex: 1,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    marginLeft: 68,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
});

export default TransactionList;
