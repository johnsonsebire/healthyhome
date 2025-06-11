import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Divider } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';

const TransactionList = ({ transactions, onTransactionPress, formatCurrency = (val) => `$${val.toFixed(2)}` }) => {
  // Get transaction icon based on category
  const getTransactionIcon = (transaction) => {
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
    
    return iconMap[transaction.category] || (transaction.type === 'income' ? 'add-circle' : 'remove-circle');
  };
  
  // Get color based on transaction type
  const getTransactionColor = (transaction) => {
    return transaction.type === 'income' ? '#4CAF50' : '#F44336';
  };
  
  // Format transaction date
  const formatTransactionDate = (date) => {
    if (!date) return '';
    
    const transactionDate = date.toDate ? date.toDate() : new Date(date);
    return transactionDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  // Render a transaction item
  const renderTransactionItem = ({ item }) => (
    <TouchableOpacity
      style={styles.transactionItem}
      onPress={() => onTransactionPress && onTransactionPress(item)}
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
          {item.description || item.category || (item.type === 'income' ? 'Income' : 'Expense')}
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
          {item.type === 'income' ? '+' : '-'} {formatCurrency(item.amount)}
        </Text>
      </View>
    </TouchableOpacity>
  );
  
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
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={renderSeparator}
      ListEmptyComponent={renderEmptyState}
      contentContainerStyle={transactions.length === 0 ? { flex: 1 } : styles.listContent}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 16,
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
