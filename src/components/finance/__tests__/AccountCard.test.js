import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AccountCard from '../AccountCard';

describe('AccountCard', () => {
  const mockAccount = {
    id: 'account-1',
    name: 'Savings Account',
    balance: 5000,
    type: 'savings',
    currency: 'USD',
    lastTransaction: new Date('2023-05-15'),
  };
  
  const mockOnPress = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders account details correctly', () => {
    const { getByText } = render(
      <AccountCard account={mockAccount} onPress={mockOnPress} />
    );
    
    // Check if account name is displayed
    expect(getByText('Savings Account')).toBeTruthy();
    
    // Check if balance is displayed with correct formatting
    expect(getByText('$5,000.00')).toBeTruthy();
    
    // Check if account type is displayed
    expect(getByText('Savings')).toBeTruthy();
    
    // Check if last transaction date is displayed
    expect(getByText('Last transaction: May 15, 2023')).toBeTruthy();
  });
  
  it('calls onPress when card is pressed', () => {
    const { getByTestId } = render(
      <AccountCard account={mockAccount} onPress={mockOnPress} />
    );
    
    // Simulate pressing the card
    fireEvent.press(getByTestId('account-card'));
    
    // Check if onPress callback was called with correct account
    expect(mockOnPress).toHaveBeenCalledWith(mockAccount);
  });
  
  it('displays negative balance in red', () => {
    const negativeAccount = {
      ...mockAccount,
      balance: -1000,
    };
    
    const { getByText } = render(
      <AccountCard account={negativeAccount} onPress={mockOnPress} />
    );
    
    // Get the balance text and check its style
    const balanceText = getByText('-$1,000.00');
    expect(balanceText.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: 'red' })
      ])
    );
  });
  
  it('displays different icon based on account type', () => {
    const checkingAccount = {
      ...mockAccount,
      type: 'checking',
    };
    
    const { getByTestId, rerender } = render(
      <AccountCard account={checkingAccount} onPress={mockOnPress} />
    );
    
    // Check if checking account has the correct icon
    expect(getByTestId('account-icon').props.name).toBe('account-balance');
    
    // Rerender with credit account
    const creditAccount = {
      ...mockAccount,
      type: 'credit',
    };
    
    rerender(
      <AccountCard account={creditAccount} onPress={mockOnPress} />
    );
    
    // Check if credit account has the correct icon
    expect(getByTestId('account-icon').props.name).toBe('credit-card');
    
    // Rerender with investment account
    const investmentAccount = {
      ...mockAccount,
      type: 'investment',
    };
    
    rerender(
      <AccountCard account={investmentAccount} onPress={mockOnPress} />
    );
    
    // Check if investment account has the correct icon
    expect(getByTestId('account-icon').props.name).toBe('trending-up');
  });
  
  it('displays no last transaction message when date is missing', () => {
    const accountWithoutTransaction = {
      ...mockAccount,
      lastTransaction: null,
    };
    
    const { getByText } = render(
      <AccountCard account={accountWithoutTransaction} onPress={mockOnPress} />
    );
    
    // Check if no transaction message is displayed
    expect(getByText('No transactions yet')).toBeTruthy();
  });
});
