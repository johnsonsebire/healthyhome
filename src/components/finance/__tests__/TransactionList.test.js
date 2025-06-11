import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TransactionList from '../TransactionList';

describe('TransactionList', () => {
  const mockTransactions = [
    {
      id: 'tx-1',
      type: 'income',
      amount: 2000,
      description: 'Salary',
      category: 'salary',
      date: new Date('2023-06-01'),
      accountId: 'account-1',
      accountName: 'Checking Account',
    },
    {
      id: 'tx-2',
      type: 'expense',
      amount: 500,
      description: 'Groceries',
      category: 'food',
      date: new Date('2023-06-05'),
      accountId: 'account-1',
      accountName: 'Checking Account',
    },
    {
      id: 'tx-3',
      type: 'transfer',
      amount: 1000,
      description: 'Savings transfer',
      category: 'transfer',
      date: new Date('2023-06-10'),
      accountId: 'account-1',
      accountName: 'Checking Account',
      toAccountId: 'account-2',
      toAccountName: 'Savings Account',
    },
  ];
  
  const mockOnTransactionPress = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders transactions correctly', () => {
    const { getByText, getAllByTestId } = render(
      <TransactionList 
        transactions={mockTransactions} 
        onTransactionPress={mockOnTransactionPress} 
      />
    );
    
    // Check if all transactions are rendered
    expect(getAllByTestId('transaction-item')).toHaveLength(3);
    
    // Check if transaction details are displayed
    expect(getByText('Salary')).toBeTruthy();
    expect(getByText('Groceries')).toBeTruthy();
    expect(getByText('Savings transfer')).toBeTruthy();
    
    // Check if amounts are displayed with correct formatting
    expect(getByText('+$2,000.00')).toBeTruthy();
    expect(getByText('-$500.00')).toBeTruthy();
    expect(getByText('$1,000.00')).toBeTruthy();
    
    // Check if dates are displayed
    expect(getByText('Jun 1, 2023')).toBeTruthy();
    expect(getByText('Jun 5, 2023')).toBeTruthy();
    expect(getByText('Jun 10, 2023')).toBeTruthy();
  });
  
  it('calls onTransactionPress when transaction is pressed', () => {
    const { getAllByTestId } = render(
      <TransactionList 
        transactions={mockTransactions} 
        onTransactionPress={mockOnTransactionPress} 
      />
    );
    
    // Simulate pressing a transaction
    fireEvent.press(getAllByTestId('transaction-item')[1]);
    
    // Check if onTransactionPress was called with correct transaction
    expect(mockOnTransactionPress).toHaveBeenCalledWith(mockTransactions[1]);
  });
  
  it('displays empty message when there are no transactions', () => {
    const { getByText } = render(
      <TransactionList 
        transactions={[]} 
        onTransactionPress={mockOnTransactionPress} 
      />
    );
    
    // Check if empty message is displayed
    expect(getByText('No transactions yet')).toBeTruthy();
  });
  
  it('displays different icons based on transaction type', () => {
    const { getAllByTestId } = render(
      <TransactionList 
        transactions={mockTransactions} 
        onTransactionPress={mockOnTransactionPress} 
      />
    );
    
    const icons = getAllByTestId('transaction-icon');
    
    // Check if income transaction has arrow-downward icon
    expect(icons[0].props.name).toBe('arrow-downward');
    
    // Check if expense transaction has arrow-upward icon
    expect(icons[1].props.name).toBe('arrow-upward');
    
    // Check if transfer transaction has swap-horiz icon
    expect(icons[2].props.name).toBe('swap-horiz');
  });
  
  it('renders with custom empty message', () => {
    const customEmptyMessage = 'Your transaction history is empty';
    
    const { getByText } = render(
      <TransactionList 
        transactions={[]} 
        onTransactionPress={mockOnTransactionPress}
        emptyMessage={customEmptyMessage}
      />
    );
    
    // Check if custom empty message is displayed
    expect(getByText(customEmptyMessage)).toBeTruthy();
  });
  
  it('limits transactions when maxItems is provided', () => {
    const { getAllByTestId } = render(
      <TransactionList 
        transactions={mockTransactions} 
        onTransactionPress={mockOnTransactionPress}
        maxItems={2}
      />
    );
    
    // Check if only 2 transactions are rendered
    expect(getAllByTestId('transaction-item')).toHaveLength(2);
  });
});
