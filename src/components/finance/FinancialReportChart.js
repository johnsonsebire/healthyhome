import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const FinancialReportChart = ({ data, type = 'income-expense' }) => {
  // For now, this is a placeholder component that displays the financial data in text format
  // In a real implementation, you would use a charting library like react-native-chart-kit
  
  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency,
      minimumFractionDigits: 2 
    }).format(amount);
  };
  
  const renderIncomeExpenseSummary = () => {
    const { totalIncome, totalExpense, netIncome } = data;
    
    return (
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <View style={[styles.iconContainer, { backgroundColor: '#4CAF50' }]}>
            <MaterialIcons name="trending-up" size={20} color="white" />
          </View>
          <View style={styles.summaryText}>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalIncome)}</Text>
          </View>
        </View>
        
        <View style={styles.summaryItem}>
          <View style={[styles.iconContainer, { backgroundColor: '#F44336' }]}>
            <MaterialIcons name="trending-down" size={20} color="white" />
          </View>
          <View style={styles.summaryText}>
            <Text style={styles.summaryLabel}>Expense</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalExpense)}</Text>
          </View>
        </View>
        
        <View style={styles.summaryItem}>
          <View style={[styles.iconContainer, { backgroundColor: netIncome >= 0 ? '#2196F3' : '#FFC107' }]}>
            <MaterialIcons name="account-balance" size={20} color="white" />
          </View>
          <View style={styles.summaryText}>
            <Text style={styles.summaryLabel}>Net</Text>
            <Text 
              style={[
                styles.summaryValue, 
                { color: netIncome >= 0 ? '#4CAF50' : '#F44336' }
              ]}
            >
              {formatCurrency(netIncome)}
            </Text>
          </View>
        </View>
      </View>
    );
  };
  
  const renderCategorySummary = () => {
    const { incomeByCategory, expenseByCategory } = data;
    
    // Function to render categories for a specific type
    const renderCategories = (categories, isIncome) => {
      const sortedCategories = Object.entries(categories)
        .sort((a, b) => b[1] - a[1]) // Sort by amount (descending)
        .slice(0, 5); // Take top 5
      
      if (sortedCategories.length === 0) {
        return (
          <View style={styles.emptyCategoryContainer}>
            <Text style={styles.emptyCategoryText}>
              No {isIncome ? 'income' : 'expense'} data
            </Text>
          </View>
        );
      }
      
      return sortedCategories.map(([category, amount], index) => (
        <View key={`${isIncome ? 'income' : 'expense'}-${category}`} style={styles.categoryItem}>
          <Text style={styles.categoryName}>{category}</Text>
          <Text
            style={[
              styles.categoryAmount,
              { color: isIncome ? '#4CAF50' : '#F44336' }
            ]}
          >
            {formatCurrency(amount)}
          </Text>
        </View>
      ));
    };
    
    return (
      <View style={styles.categoriesContainer}>
        <View style={styles.categoryColumn}>
          <Text style={styles.categoryColumnTitle}>Top Income</Text>
          {renderCategories(incomeByCategory, true)}
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.categoryColumn}>
          <Text style={styles.categoryColumnTitle}>Top Expenses</Text>
          {renderCategories(expenseByCategory, false)}
        </View>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.chartTitle}>
        Financial Summary
      </Text>
      
      {renderIncomeExpenseSummary()}
      
      <View style={styles.separator} />
      
      {renderCategorySummary()}
      
      <Text style={styles.chartNote}>
        {`Data from ${data.startDate} to ${data.endDate}`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryText: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 16,
  },
  categoriesContainer: {
    flexDirection: 'row',
  },
  categoryColumn: {
    flex: 1,
  },
  divider: {
    width: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 8,
  },
  categoryColumnTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    flex: 1,
  },
  categoryAmount: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyCategoryContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  emptyCategoryText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#999',
  },
  chartNote: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
});

export default FinancialReportChart;
