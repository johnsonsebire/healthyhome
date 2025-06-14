import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import currencyService from '../../services/currencyService';

const FinancialReportChart = ({ data, type = 'income-expense', currency = 'GHS' }) => {
  // Extremely defensive implementation that prioritizes not crashing
  
  // Ensure data exists
  if (!data) {
    return (
      <View style={styles.container}>
        <Text style={styles.chartTitle}>Financial Data</Text>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }
  
  // Safe currency formatting
  const formatCurrency = (amount) => {
    try {
      if (amount === undefined || amount === null || isNaN(parseFloat(amount))) {
        return currencyService.formatCurrency(0, currency);
      }
      return currencyService.formatCurrency(amount, currency);
    } catch (error) {
      console.error('Error formatting currency:', error);
      return '0.00';
    }
  };

  // Format category for display
  const formatCategory = (category) => {
    if (!category) return '';
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Simple income/expense summary that avoids complex operations
  const renderSummary = () => {
    try {
      // Use default values for everything
      const totalIncome = data.totalIncome || 0;
      const totalExpense = data.totalExpense || 0;
      const netIncome = data.netIncome || (totalIncome - totalExpense);
      
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
    } catch (error) {
      console.error('Error rendering summary:', error);
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error displaying summary</Text>
        </View>
      );
    }
  };
  
  // Simplified category display
  const renderTopCategories = () => {
    try {
      const { incomeByCategory = {}, expenseByCategory = {} } = data;
      
      // Helper to render a single category
      const renderCategory = (name, amount, isIncome) => {
        return (
          <View key={name} style={styles.categoryItem}>
            <Text style={styles.categoryName}>{formatCategory(name) || 'Other'}</Text>
            <Text
              style={[
                styles.categoryAmount,
                { color: isIncome ? '#4CAF50' : '#F44336' }
              ]}
            >
              {formatCurrency(amount)}
            </Text>
          </View>
        );
      };
      
      // Safe way to get top categories
      const getTopCategories = (categories, isIncome, limit = 3) => {
        try {
          if (!categories || typeof categories !== 'object') {
            return [];
          }
          
          // Convert to array of [name, amount] pairs
          const pairs = Object.entries(categories);
          if (!pairs || !Array.isArray(pairs)) {
            return [];
          }
          
          // Sort by amount (descending) and take top ones
          return pairs
            .filter(pair => pair && Array.isArray(pair) && pair.length === 2)
            .sort((a, b) => {
              const amountA = parseFloat(a[1]) || 0;
              const amountB = parseFloat(b[1]) || 0;
              return amountB - amountA;
            })
            .slice(0, limit);
        } catch (error) {
          console.error('Error getting top categories:', error);
          return [];
        }
      };
      
      // Get top categories
      const topIncomeCategories = getTopCategories(incomeByCategory, true);
      const topExpenseCategories = getTopCategories(expenseByCategory, false);
      
      return (
        <View style={styles.categoriesContainer}>
          <View style={styles.categoryColumn}>
            <Text style={styles.categoryColumnTitle}>Top Income</Text>
            {topIncomeCategories.length > 0 ? (
              topIncomeCategories.map(([name, amount]) => 
                renderCategory(name, amount, true)
              )
            ) : (
              <Text style={styles.noDataText}>No income data</Text>
            )}
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.categoryColumn}>
            <Text style={styles.categoryColumnTitle}>Top Expenses</Text>
            {topExpenseCategories.length > 0 ? (
              topExpenseCategories.map(([name, amount]) => 
                renderCategory(name, amount, false)
              )
            ) : (
              <Text style={styles.noDataText}>No expense data</Text>
            )}
          </View>
        </View>
      );
    } catch (error) {
      console.error('Error rendering categories:', error);
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error displaying categories</Text>
        </View>
      );
    }
  };
  
  // Simple component with minimal complexity
  return (
    <View style={styles.container}>
      <Text style={styles.chartTitle}>
        Financial Summary
      </Text>
      
      {renderSummary()}
      
      <View style={styles.separator} />
      
      {renderTopCategories()}
      
      <Text style={styles.chartNote}>
        {`Data from ${data.startDate || 'N/A'} to ${data.endDate || 'N/A'}`}
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
    paddingHorizontal: 4,
  },
  categoryName: {
    fontSize: 12,
    flex: 1,
  },
  categoryAmount: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  noDataText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#999',
    textAlign: 'center',
    padding: 8,
  },
  errorContainer: {
    padding: 12,
    backgroundColor: '#ffeeee',
    borderRadius: 4,
    marginVertical: 8,
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
    fontSize: 12,
  },
  chartNote: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
});

export default FinancialReportChart;
