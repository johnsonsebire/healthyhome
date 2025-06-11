import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import WelfareAccountDetailsScreen from '../WelfareAccountDetailsScreen';
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

describe('WelfareAccountDetailsScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    setOptions: jest.fn(),
    goBack: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  };
  
  const mockRoute = {
    params: {
      accountId: 'welfare1'
    }
  };
  
  const mockWelfareAccount = {
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
    contributions: [
      {
        id: 'contrib1',
        amount: 1000,
        contributorId: 'user1',
        contributorName: 'John Doe',
        date: new Date('2023-01-15'),
        notes: 'Initial contribution'
      },
      {
        id: 'contrib2',
        amount: 2000,
        contributorId: 'user2',
        contributorName: 'Jane Doe',
        date: new Date('2023-03-20'),
        notes: 'Quarterly contribution'
      },
      {
        id: 'contrib3',
        amount: 2000,
        contributorId: 'user1',
        contributorName: 'John Doe',
        date: new Date('2023-06-01'),
        notes: 'Mid-year contribution'
      }
    ]
  };
  
  const mockGetWelfareAccount = jest.fn(() => mockWelfareAccount);
  const mockUpdateWelfareAccount = jest.fn();
  const mockDeleteWelfareAccount = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    useFinance.mockReturnValue({
      getWelfareAccount: mockGetWelfareAccount,
      updateWelfareAccount: mockUpdateWelfareAccount,
      deleteWelfareAccount: mockDeleteWelfareAccount,
      isLoading: false,
      error: null,
      currentScope: FINANCE_SCOPE.EXTENDED
    });
    
    useFamilySharing.mockReturnValue({
      extendedFamilyMembers: [
        { id: 'user1', name: 'John Doe' },
        { id: 'user2', name: 'Jane Doe' },
        { id: 'user3', name: 'Mary Smith' },
      ],
      currentUserProfile: {
        id: 'user1',
        name: 'John Doe'
      }
    });
  });

  it('renders welfare account details correctly', async () => {
    const { getByText, queryByText } = renderWithProviders(
      <WelfareAccountDetailsScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Check account name and details are displayed
    expect(getByText('Family Emergency Fund')).toBeTruthy();
    expect(getByText('For family emergencies')).toBeTruthy();
    
    // Check balance and goal are displayed
    expect(getByText('$5,000')).toBeTruthy();
    expect(getByText('Goal: $10,000')).toBeTruthy();
    
    // Check contribution details are displayed
    expect(getByText('Monthly contribution: $200')).toBeTruthy();
    
    // Check progress percentage
    expect(getByText('50% funded')).toBeTruthy();
    
    // Check members are displayed
    expect(getByText('2 members')).toBeTruthy();
    
    // Check contributions are displayed
    expect(getByText('Recent Contributions')).toBeTruthy();
    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('$1,000')).toBeTruthy();
    expect(getByText('Jane Doe')).toBeTruthy();
    expect(getByText('$2,000')).toBeTruthy();
  });

  it('displays loading indicator when loading', () => {
    useFinance.mockReturnValue({
      getWelfareAccount: mockGetWelfareAccount,
      updateWelfareAccount: mockUpdateWelfareAccount,
      deleteWelfareAccount: mockDeleteWelfareAccount,
      isLoading: true,
      error: null,
      currentScope: FINANCE_SCOPE.EXTENDED
    });
    
    const { getByTestId } = renderWithProviders(
      <WelfareAccountDetailsScreen navigation={mockNavigation} route={mockRoute} />
    );
    
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('displays error message when there is an error', () => {
    useFinance.mockReturnValue({
      getWelfareAccount: mockGetWelfareAccount,
      updateWelfareAccount: mockUpdateWelfareAccount,
      deleteWelfareAccount: mockDeleteWelfareAccount,
      isLoading: false,
      error: 'Failed to load welfare account details',
      currentScope: FINANCE_SCOPE.EXTENDED
    });
    
    const { getByText } = renderWithProviders(
      <WelfareAccountDetailsScreen navigation={mockNavigation} route={mockRoute} />
    );
    
    expect(getByText('Failed to load welfare account details')).toBeTruthy();
  });

  it('navigates to contribute screen when contribute button is pressed', () => {
    const { getByText } = renderWithProviders(
      <WelfareAccountDetailsScreen navigation={mockNavigation} route={mockRoute} />
    );
    
    fireEvent.press(getByText('Contribute'));
    
    expect(mockNavigation.navigate).toHaveBeenCalledWith('ContributeToWelfare', {
      accountId: 'welfare1'
    });
  });

  it('navigates to contribution history screen when view all button is pressed', () => {
    const { getByText } = renderWithProviders(
      <WelfareAccountDetailsScreen navigation={mockNavigation} route={mockRoute} />
    );
    
    fireEvent.press(getByText('View All'));
    
    expect(mockNavigation.navigate).toHaveBeenCalledWith('WelfareContributionHistory', {
      accountId: 'welfare1'
    });
  });

  it('navigates to add welfare member screen when add member button is pressed', () => {
    const { getByText } = renderWithProviders(
      <WelfareAccountDetailsScreen navigation={mockNavigation} route={mockRoute} />
    );
    
    fireEvent.press(getByText('Add Member'));
    
    expect(mockNavigation.navigate).toHaveBeenCalledWith('AddWelfareMember', {
      accountId: 'welfare1'
    });
  });

  it('shows confirmation dialog when delete button is pressed', () => {
    global.alert = jest.fn();
    
    const { getByTestId } = renderWithProviders(
      <WelfareAccountDetailsScreen navigation={mockNavigation} route={mockRoute} />
    );
    
    fireEvent.press(getByTestId('delete-button'));
    
    expect(global.alert).toHaveBeenCalled();
  });

  it('deletes welfare account when confirmed', async () => {
    global.alert = jest.fn((title, message, buttons) => {
      // Simulate pressing the "Delete" button
      buttons[1].onPress();
    });
    
    const { getByTestId } = renderWithProviders(
      <WelfareAccountDetailsScreen navigation={mockNavigation} route={mockRoute} />
    );
    
    fireEvent.press(getByTestId('delete-button'));
    
    expect(mockDeleteWelfareAccount).toHaveBeenCalledWith('welfare1');
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });
});
