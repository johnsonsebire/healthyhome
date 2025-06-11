import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const BudgetProgressBar = ({ current, target, label, color = '#2196F3' }) => {
  // Calculate progress percentage (capped at 100%)
  const progressPercentage = Math.min(100, (current / target) * 100);
  
  // Format currency for display
  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency,
      minimumFractionDigits: 2 
    }).format(amount);
  };
  
  // Status message based on progress
  const getStatusMessage = () => {
    if (progressPercentage >= 100) {
      return 'Completed!';
    } else if (progressPercentage >= 75) {
      return 'Almost there!';
    } else if (progressPercentage >= 50) {
      return 'Halfway there!';
    } else if (progressPercentage >= 25) {
      return 'Making progress!';
    } else {
      return 'Just started!';
    }
  };
  
  return (
    <View style={styles.container}>
      {/* Label and amount display */}
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.percentageText}>{progressPercentage.toFixed(0)}%</Text>
      </View>
      
      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View 
          style={[
            styles.progressBar, 
            { width: `${progressPercentage}%`, backgroundColor: color }
          ]}
        />
      </View>
      
      {/* Amount information */}
      <View style={styles.amountContainer}>
        <Text style={styles.currentAmount}>
          {formatCurrency(current)}
        </Text>
        <Text style={styles.targetAmount}>
          of {formatCurrency(target)}
        </Text>
      </View>
      
      {/* Status message */}
      <Text style={[styles.statusMessage, { color }]}>
        {getStatusMessage()}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  percentageText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  targetAmount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  statusMessage: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
});

export default BudgetProgressBar;
