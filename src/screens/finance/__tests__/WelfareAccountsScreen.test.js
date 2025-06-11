import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import WelfareAccountsScreen from '../WelfareAccountsScreen';
import { useFinance, FINANCE_SCOPE } from '../../../contexts/FinanceContext';
import { useFamilySharing } from '../../../contexts/FamilySharingContext';
import { renderWithProviders } from '../../../utils/testUtils';

// Mock the hooks
jest.mock('../../../contexts/FinanceContext', () => ({
  useFinance: jest.fn(),
  FINANCE_SCOPE: {
    PERSONAL: 'personal',
    NUCLEAR: 'nuclear',
    EXTENDED: 'extended'
  }
}));

jest.mock('../../../contexts/FamilySharingContext', () => ({
  useFamilySharing: jest.fn()
}));

describe('WelfareAccountsScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  };
  
  const mockWelfareAccounts = [
    {
      id: 'welfare1',
      name: 'Family Emergency Fund',
      balance: 5000,
      goal: 10000,
      description: 'For family emergencies',
      contributionFrequency: 'monthly',
      contributionAmount: 200,
      familyId: 'extended-family-1',
      members: ['user1', 'user2'],
      createdAt: new Date('2023-01-01'),
      lastContribution: new Date('2023-06-01'),
    },
    {
      id: 'welfare2',
      name: 'Education Fund',
      balance: 8000,
      goal: 20000,
      description: 'For educational purposes',
      contributionFrequency: 'quarterly',
      contributionAmount: 500,
      familyId: 'extended-family-1',
      members: ['user1', 'user2', 'user3'],
      createdAt: new Date('2023-02-01'),
      lastContribution: new Date('2023-05-01'),
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    useFinance.mockReturnValue({
      welfareAccounts: mockWelfareAccounts,
      isLoading: false,
      error: null,
      currentScope: FINANCE_SCOPE.EXTENDED,
      changeScope: jest.fn()
    });
    
    useFamilySharing.mockReturnValue({
      extendedFamilyMembers: [
        { id: 'user1', name: 'John Doe' },
        { id: 'user2', name: 'Jane Doe' },
        { id: 'user3', name: 'Mary Smith' },
      ]
    });
  });

  it('renders welfare accounts correctly', async () => {
    const { getByText, getAllByText } = renderWithProviders(
      <WelfareAccountsScreen navigation={mockNavigation} />
    );

    // Check if screen title is displayed
    expect(getByText('Welfare Accounts')).toBeTruthy();
    
    // Check if welfare accounts are displayed
    expect(getByText('Family Emergency Fund')).toBeTruthy();
    expect(getByText('Education Fund')).toBeTruthy();
    
    // Check if balances are displayed
    expect(getByText('$5,000')).toBeTruthy();
    expect(getByText('$8,000')).toBeTruthy();
    
    // Check if progress towards goals is displayed
    expect(getByText('$5,000 of $10,000')).toBeTruthy();
    expect(getByText('$8,000 of $20,000')).toBeTruthy();
    
    // Check if number of members is displayed
    expect(getByText('2 members')).toBeTruthy();
    expect(getByText('3 members')).toBeTruthy();
  });

  it('displays loading indicator when loading', () => {
    useFinance.mockReturnValue({
      welfareAccounts: [],
      isLoading: true,
      error: null,
      currentScope: FINANCE_SCOPE.EXTENDED,
      changeScope: jest.fn()
    });
    
    const { getByTestId } = renderWithProviders(
      <WelfareAccountsScreen navigation={mockNavigation} />
    );
    
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('displays error message when there is an error', () => {
    useFinance.mockReturnValue({
      welfareAccounts: [],
      isLoading: false,
      error: 'Failed to load welfare accounts',
      currentScope: FINANCE_SCOPE.EXTENDED,
      changeScope: jest.fn()
    });
    
    const { getByText } = renderWithProviders(
      <WelfareAccountsScreen navigation={mockNavigation} />
    );
    
    expect(getByText('Failed to load welfare accounts')).toBeTruthy();
  });

  it('navigates to welfare account details when an account is pressed', () => {
    const { getByText } = renderWithProviders(
      <WelfareAccountsScreen navigation={mockNavigation} />
    );
    
    fireEvent.press(getByText('Family Emergency Fund'));
    
    expect(mockNavigation.navigate).toHaveBeenCalledWith('WelfareAccountDetails', {
      accountId: 'welfare1'
    });
  });

  it('navigates to add welfare account screen when add button is pressed', () => {
    const { getByTestId } = renderWithProviders(
      <WelfareAccountsScreen navigation={mockNavigation} />
    );
    
    fireEvent.press(getByTestId('add-welfare-button'));
    
    expect(mockNavigation.navigate).toHaveBeenCalledWith('AddWelfareAccount');
  });

  it('sets the correct scope when component mounts', () => {
    const mockChangeScope = jest.fn();
    
    useFinance.mockReturnValue({
      welfareAccounts: mockWelfareAccounts,
      isLoading: false,
      error: null,
      currentScope: FINANCE_SCOPE.PERSONAL, // Start with personal scope
      changeScope: mockChangeScope
    });
    
    renderWithProviders(
      <WelfareAccountsScreen navigation={mockNavigation} />
    );
    
    expect(mockChangeScope).toHaveBeenCalledWith(FINANCE_SCOPE.EXTENDED);
  });

  it('displays empty state when there are no welfare accounts', () => {
    useFinance.mockReturnValue({
      welfareAccounts: [],
      isLoading: false,
      error: null,
      currentScope: FINANCE_SCOPE.EXTENDED,
      changeScope: jest.fn()
    });
    
    const { getByText } = renderWithProviders(
      <WelfareAccountsScreen navigation={mockNavigation} />
    );
    
    expect(getByText('No welfare accounts found')).toBeTruthy();
    expect(getByText('Create your first welfare account to get started')).toBeTruthy();
  });
});
